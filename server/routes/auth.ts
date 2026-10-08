import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { Webhook } from "svix";
import { ensureUser, requireUser, type AppContext } from "../auth";
import { db, schema } from "../db";
import { env } from "../env";
import { Errors } from "../errors";

const authRoute = new Hono<AppContext>();

authRoute.get("/me", async (c) => {
  const u = c.var.user;
  if (!u) return c.json(null);
  const [row] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, u.id))
    .limit(1);
  if (!row) return c.json(null);
  return c.json(row);
});

authRoute.patch("/me", async (c) => {
  const u = requireUser(c);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, any>;
  const patch: Record<string, any> = { updated_date: new Date() };
  if (typeof body.display_name === "string") patch.display_name = body.display_name;
  if (typeof body.bio === "string") patch.bio = body.bio;
  if (body.preferences && typeof body.preferences === "object") {
    patch.preferences = body.preferences;
  }
  const [row] = await db
    .update(schema.users)
    .set(patch)
    .where(eq(schema.users.id, u.id))
    .returning();
  return c.json(row);
});

/**
 * Clerk webhook — fires on user.created / user.updated / user.deleted. Keeps
 * the local users row in step with Clerk's authoritative copy.
 */
export const clerkWebhook = new Hono<AppContext>();
clerkWebhook.post("/", async (c) => {
  const secret = env().CLERK_WEBHOOK_SECRET;
  if (!secret) throw Errors.internal("Clerk webhook secret not configured");

  const payload = await c.req.text();
  const headers = Object.fromEntries(c.req.raw.headers.entries());

  let evt: any;
  try {
    const wh = new Webhook(secret);
    evt = wh.verify(payload, headers as any);
  } catch {
    throw Errors.unauthorized("Webhook signature invalid");
  }

  switch (evt.type) {
    case "user.created":
    case "user.updated":
      await ensureUser(evt.data.id);
      break;
    case "user.deleted":
      await db
        .delete(schema.users)
        .where(eq(schema.users.clerk_id, evt.data.id));
      break;
  }
  return c.json({ ok: true });
});

export default authRoute;
