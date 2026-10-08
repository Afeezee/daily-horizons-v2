import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AppContext } from "../auth";
import { db, schema } from "../db";
import { env } from "../env";
import { Errors } from "../errors";
import { runAgent } from "../agent/run";
import { sendScheduledDigests } from "../email/digest";
import { submitArticle } from "../moderation/pipeline";

const cronRoute = new Hono<AppContext>();

cronRoute.use("*", async (c, next) => {
  const E = env();
  const auth = c.req.header("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  // Vercel Cron sends `x-vercel-cron: 1` plus the project-scoped secret in
  // the Authorization header. We accept either our configured CRON_SECRET
  // or the Vercel cron header when CRON_SECRET isn't set.
  if (E.CRON_SECRET && bearer !== E.CRON_SECRET) throw Errors.unauthorized();
  if (!E.CRON_SECRET && !c.req.header("x-vercel-cron")) throw Errors.unauthorized();
  await next();
});

cronRoute.post("/daily-digest", async (c) => {
  const result = await sendScheduledDigests();
  return c.json(result);
});

cronRoute.post("/content-agent", async (c) => {
  const result = await runAgent({ triggeredBy: "scheduled" });
  return c.json(result);
});

cronRoute.post("/moderation-retry", async (c) => {
  // Retry any article left as pending_moderation with expert_review_required
  // when the previous attempt degraded. Rebuild via submitArticle so the
  // whole gate re-runs, keeping behaviour consistent.
  const rows = await db
    .select()
    .from(schema.articles)
    .where(
      and(
        eq(schema.articles.status, "pending_moderation"),
        eq(schema.articles.expert_review_required, true)
      )
    )
    .limit(10);
  const results: { id: string; status: string; error?: string }[] = [];
  for (const row of rows) {
    try {
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, row.created_by))
        .limit(1);
      if (!user) continue;
      const result = await submitArticle(
        {
          id: row.id,
          title: row.title,
          subtitle: row.subtitle,
          body: row.body,
          summary: row.summary,
          category: row.category,
          tags: row.tags,
          labels: row.labels,
          lead_image_url: row.lead_image_url,
          meta_title: row.meta_title,
          meta_description: row.meta_description,
          reading_time: row.reading_time ?? undefined,
        },
        {
          id: user.id,
          clerk_id: user.clerk_id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
          daily_post_limit_exempt: true,
          is_banned: user.is_banned,
        }
      );
      results.push({ id: row.id, status: result.verdict });
    } catch (err: any) {
      results.push({ id: row.id, status: "failed", error: String(err?.message ?? err) });
    }
  }
  return c.json({ retried: results });
});

export default cronRoute;
