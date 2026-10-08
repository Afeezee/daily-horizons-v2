import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { requireUser, type AppContext } from "../auth";
import { getPoolDb, schema } from "../db";
import { Errors } from "../errors";
import { clientKey, rateLimit } from "../utils/rate-limit";

const countersRoute = new Hono<AppContext>();

// ──────────────────────────────────────────────────────────────────────────
// POST /api/articles/:id/view
// ──────────────────────────────────────────────────────────────────────────
countersRoute.post("/:id/view", async (c) => {
  const id = c.req.param("id");
  const ip = clientKey(c);
  // One view per IP+article per hour. Not perfect, but enough to stop a
  // single open tab from inflating the counter.
  await rateLimit({ key: `view:${id}:${ip}`, limit: 1, windowSec: 3600 });

  const [row] = await getPoolDb()
    .update(schema.articles)
    .set({ views_count: sql`${schema.articles.views_count} + 1` })
    .where(eq(schema.articles.id, id))
    .returning({ views_count: schema.articles.views_count });
  if (!row) throw Errors.notFound();
  return c.json({ views_count: row.views_count });
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/articles/:id/like
// ──────────────────────────────────────────────────────────────────────────
countersRoute.post("/:id/like", async (c) => {
  const user = requireUser(c);
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { reaction_type?: string };
  const reaction =
    (["like", "insightful", "disagree", "applaud"].includes(body.reaction_type ?? "")
      ? body.reaction_type
      : "like") as "like" | "insightful" | "disagree" | "applaud";

  const pool = getPoolDb();
  const result = await pool.transaction(async (tx) => {
    const inserted = await tx
      .insert(schema.articleLikes)
      .values({ article_id: id, created_by: user.email, reaction_type: reaction })
      .onConflictDoNothing({
        target: [schema.articleLikes.article_id, schema.articleLikes.created_by],
      })
      .returning();
    if (inserted.length === 0) {
      // Already liked — return the current count without double-incrementing.
      const [article] = await tx
        .select({ likes_count: schema.articles.likes_count })
        .from(schema.articles)
        .where(eq(schema.articles.id, id))
        .limit(1);
      return { already: true, likes_count: article?.likes_count ?? 0 };
    }
    const [article] = await tx
      .update(schema.articles)
      .set({ likes_count: sql`${schema.articles.likes_count} + 1` })
      .where(eq(schema.articles.id, id))
      .returning({ likes_count: schema.articles.likes_count });
    if (!article) throw Errors.notFound();
    return { already: false, likes_count: article.likes_count };
  });
  return c.json(result);
});

// ──────────────────────────────────────────────────────────────────────────
// DELETE /api/articles/:id/like
// ──────────────────────────────────────────────────────────────────────────
countersRoute.delete("/:id/like", async (c) => {
  const user = requireUser(c);
  const id = c.req.param("id");

  const pool = getPoolDb();
  const result = await pool.transaction(async (tx) => {
    const deleted = await tx
      .delete(schema.articleLikes)
      .where(
        and(
          eq(schema.articleLikes.article_id, id),
          eq(schema.articleLikes.created_by, user.email)
        )
      )
      .returning();
    if (deleted.length === 0) {
      const [article] = await tx
        .select({ likes_count: schema.articles.likes_count })
        .from(schema.articles)
        .where(eq(schema.articles.id, id))
        .limit(1);
      return { already: true, likes_count: article?.likes_count ?? 0 };
    }
    const [article] = await tx
      .update(schema.articles)
      .set({ likes_count: sql`GREATEST(${schema.articles.likes_count} - 1, 0)` })
      .where(eq(schema.articles.id, id))
      .returning({ likes_count: schema.articles.likes_count });
    return { already: false, likes_count: article?.likes_count ?? 0 };
  });
  return c.json(result);
});

// ──────────────────────────────────────────────────────────────────────────
// POST /api/articles/:id/comments
// ──────────────────────────────────────────────────────────────────────────
countersRoute.post("/:id/comments", async (c) => {
  const user = requireUser(c);
  const id = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as {
    content?: string;
    parent_comment_id?: string | null;
  };
  const content = String(body.content ?? "").trim();
  if (!content) throw Errors.badRequest("content required");
  if (content.length > 4000) throw Errors.badRequest("content too long");

  const pool = getPoolDb();
  const result = await pool.transaction(async (tx) => {
    const [comment] = await tx
      .insert(schema.comments)
      .values({
        article_id: id,
        content,
        parent_comment_id: body.parent_comment_id || null,
        created_by: user.email,
        author_name: user.display_name,
      })
      .returning();
    await tx
      .update(schema.articles)
      .set({ comments_count: sql`${schema.articles.comments_count} + 1` })
      .where(eq(schema.articles.id, id));
    return comment;
  });
  return c.json(result, 201);
});

export default countersRoute;
