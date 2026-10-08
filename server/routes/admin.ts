import { desc, eq, like, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { requireAdmin, type AppContext } from "../auth";
import { db, schema } from "../db";
import { Errors } from "../errors";
import { runAgent } from "../agent/run";
import {
  agentRunHistory,
  authorshipSplit,
  budgetSnapshot,
  categoryBreakdown,
  digestHistory,
  moderationHistory,
  newsletterGrowth,
  topArticles,
  trafficOverview,
} from "../analytics/queries";

const adminRoute = new Hono<AppContext>();

adminRoute.use("*", async (c, next) => {
  requireAdmin(c);
  await next();
});

// ── Analytics ───────────────────────────────────────────────────────────
adminRoute.get("/analytics/overview", async (c) => c.json(await trafficOverview()));
adminRoute.get("/analytics/top", async (c) => c.json(await topArticles()));
adminRoute.get("/analytics/categories", async (c) => c.json(await categoryBreakdown()));
adminRoute.get("/analytics/authorship", async (c) => c.json(await authorshipSplit()));
adminRoute.get("/analytics/digest", async (c) => c.json(await digestHistory()));
adminRoute.get("/analytics/newsletter", async (c) => c.json(await newsletterGrowth()));
adminRoute.get("/analytics/budget", async (c) => c.json(await budgetSnapshot()));

// ── Moderation ──────────────────────────────────────────────────────────
adminRoute.get("/moderation/events", async (c) => c.json(await moderationHistory()));
adminRoute.post("/moderation/articles/:id/unpublish", async (c) => {
  const id = c.req.param("id");
  const [row] = await db
    .update(schema.articles)
    .set({ status: "rejected", updated_date: new Date() })
    .where(eq(schema.articles.id, id))
    .returning();
  if (!row) throw Errors.notFound();
  await db.insert(schema.moderationEvents).values({
    article_id: id,
    actor_email: c.var.user!.email,
    verdict: "rejected",
    reason: "admin unpublish",
  });
  return c.json(row);
});
adminRoute.post("/moderation/articles/:id/approve", async (c) => {
  const id = c.req.param("id");
  const [row] = await db
    .update(schema.articles)
    .set({ status: "published", published_date: new Date(), updated_date: new Date() })
    .where(eq(schema.articles.id, id))
    .returning();
  if (!row) throw Errors.notFound();
  await db.insert(schema.moderationEvents).values({
    article_id: id,
    actor_email: c.var.user!.email,
    verdict: "approved",
    reason: "admin approve",
  });
  return c.json(row);
});

// ── Users ──────────────────────────────────────────────────────────────
adminRoute.get("/users", async (c) => {
  const url = new URL(c.req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
  const where = q
    ? or(like(schema.users.email, `%${q}%`), like(schema.users.display_name, `%${q}%`))
    : undefined;
  const rows = await db
    .select()
    .from(schema.users)
    .where(where)
    .orderBy(desc(schema.users.created_date))
    .limit(limit);
  return c.json(rows);
});
adminRoute.patch("/users/:id", async (c) => {
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as any;
  const patch: Record<string, any> = { updated_date: new Date() };
  if (body.role === "user" || body.role === "admin") patch.role = body.role;
  if (typeof body.daily_post_limit_exempt === "boolean")
    patch.daily_post_limit_exempt = body.daily_post_limit_exempt;
  if (typeof body.is_banned === "boolean") patch.is_banned = body.is_banned;
  const [row] = await db
    .update(schema.users)
    .set(patch)
    .where(eq(schema.users.id, id))
    .returning();
  if (!row) throw Errors.notFound();
  return c.json(row);
});

// ── Newsletter list management ─────────────────────────────────────────
adminRoute.get("/newsletter/subscribers", async (c) => {
  const url = new URL(c.req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const where = q ? like(schema.newsletterSubscribers.email, `%${q}%`) : undefined;
  const rows = await db
    .select()
    .from(schema.newsletterSubscribers)
    .where(where)
    .orderBy(desc(schema.newsletterSubscribers.created_date))
    .limit(500);
  return c.json(rows);
});

// ── Agent ───────────────────────────────────────────────────────────────
adminRoute.get("/agent/runs", async (c) => c.json(await agentRunHistory()));

adminRoute.post("/agent/generate", async (c) => {
  const admin = c.var.user!;
  const body = (await c.req.json().catch(() => ({}))) as any;

  const queries = Array.isArray(body.queries) ? body.queries.slice(0, 20) : undefined;
  const category = typeof body.category === "string" ? body.category : undefined;
  const region = ["global", "nigeria", "africa", "all"].includes(body.region) ? body.region : "all";
  const count = typeof body.count === "number" ? Math.max(1, Math.min(body.count, 20)) : 1;
  const forceReview = typeof body.require_review === "boolean" ? body.require_review : undefined;

  const result = await runAgent({
    triggeredBy: "admin",
    actorUserId: admin.id,
    queries,
    category,
    region,
    count,
    forceReview,
  });
  return c.json(result);
});

// ── Settings ────────────────────────────────────────────────────────────
adminRoute.get("/settings", async (c) => {
  const rows = await db.select().from(schema.platformSettings);
  return c.json(rows);
});
adminRoute.put("/settings/:key", async (c) => {
  const key = c.req.param("key");
  const body = (await c.req.json().catch(() => ({}))) as any;
  const [row] = await db
    .insert(schema.platformSettings)
    .values({
      key,
      value: body.value,
      updated_by: c.var.user!.email,
      updated_date: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.platformSettings.key,
      set: {
        value: body.value,
        updated_by: c.var.user!.email,
        updated_date: new Date(),
      },
    })
    .returning();
  return c.json(row);
});

export default adminRoute;
