import { createClerkClient, verifyToken, type ClerkClient } from "@clerk/backend";
import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { db, schema } from "./db";
import { adminEmails, env } from "./env";
import { Errors } from "./errors";

export type SessionUser = {
  id: string;
  clerk_id: string | null;
  email: string;
  display_name: string | null;
  role: "user" | "admin";
  daily_post_limit_exempt: boolean;
  is_banned: boolean;
};

export type AppContext = {
  Variables: {
    user: SessionUser | null;
    requestId: string;
    isService: boolean;
  };
};

let _clerk: ClerkClient | null = null;
export function clerk(): ClerkClient {
  if (!_clerk) {
    const secret = env().CLERK_SECRET_KEY;
    if (!secret) throw Errors.internal("Clerk not configured");
    _clerk = createClerkClient({ secretKey: secret });
  }
  return _clerk;
}

/**
 * Non-blocking auth: resolves the current user when a Bearer token is present
 * and valid, otherwise leaves c.var.user null. Public-read endpoints rely on
 * this; private endpoints wrap it with requireUser / requireAdmin.
 */
export async function attachUser(c: Context<AppContext>, next: Next) {
  const auth = c.req.header("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  c.set("user", null);
  c.set("isService", false);

  if (!bearer) return next();

  // Agent service bearer (not a Clerk session) — matched first so it never
  // falls through to Clerk's verify, which would fail noisily.
  const serviceKey = env().AGENT_SERVICE_KEY;
  if (serviceKey && bearer === serviceKey) {
    c.set("isService", true);
    const agentEmail = env().AGENT_AUTHOR_EMAIL.toLowerCase();
    const [row] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, agentEmail))
      .limit(1);
    if (row) {
      c.set("user", mapUser(row));
    }
    return next();
  }

  const secret = env().CLERK_SECRET_KEY;
  if (!secret) return next();

  try {
    const payload = await verifyToken(bearer, { secretKey: secret });
    const clerkId = payload.sub;
    if (!clerkId) return next();
    const user = await ensureUser(clerkId);
    c.set("user", user);
  } catch {
    // Invalid / expired token — treat as anonymous. The frontend will refresh
    // on its next call.
  }
  return next();
}

export function requireUser(c: Context<AppContext>) {
  const u = c.var.user;
  if (!u) throw Errors.unauthorized();
  if (u.is_banned) throw Errors.forbidden("Account suspended");
  return u;
}

export function requireAdmin(c: Context<AppContext>) {
  const u = requireUser(c);
  if (u.role !== "admin") throw Errors.forbidden("Admin only");
  return u;
}

export function isAdmin(u: SessionUser | null): boolean {
  return !!u && u.role === "admin";
}

/**
 * Look up (or create) the local user row for a Clerk id. Admin bootstrap:
 * any email in ADMIN_EMAILS gets `role = "admin"` on first sync.
 */
export async function ensureUser(clerkId: string): Promise<SessionUser> {
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.clerk_id, clerkId))
    .limit(1);
  if (existing) return mapUser(existing);

  const c = clerk();
  const remote = await c.users.getUser(clerkId);
  const primaryEmail =
    remote.emailAddresses.find((e) => e.id === remote.primaryEmailAddressId)?.emailAddress ??
    remote.emailAddresses[0]?.emailAddress;
  if (!primaryEmail) throw Errors.badRequest("No email on Clerk account");

  const email = primaryEmail.toLowerCase();
  const admins = new Set(adminEmails());
  const role: "user" | "admin" = admins.has(email) ? "admin" : "user";
  const fullName = [remote.firstName, remote.lastName].filter(Boolean).join(" ") || null;

  // UPSERT by email to support claim-by-email (someone subscribed to the
  // newsletter already has a stub users row keyed off their email).
  const [row] = await db
    .insert(schema.users)
    .values({
      clerk_id: clerkId,
      email,
      full_name: fullName,
      display_name: fullName,
      role,
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        clerk_id: clerkId,
        full_name: fullName,
        display_name: fullName,
        role,
        updated_date: new Date(),
      },
    })
    .returning();
  return mapUser(row);
}

function mapUser(row: typeof schema.users.$inferSelect): SessionUser {
  return {
    id: row.id,
    clerk_id: row.clerk_id,
    email: row.email,
    display_name: row.display_name,
    role: row.role,
    daily_post_limit_exempt: row.daily_post_limit_exempt,
    is_banned: row.is_banned,
  };
}
