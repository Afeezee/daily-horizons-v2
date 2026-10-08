import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { env } from "../env";
import { Errors } from "../errors";
import { moderateArticle } from "../ai/prompts";
import { pickImage } from "../images/pipeline";
import type { SessionUser } from "../auth";

export type SubmissionInput = {
  id?: string | null;
  title: string;
  subtitle?: string | null;
  body: string;
  summary?: string | null;
  category: string;
  tags?: string[];
  labels?: string[];
  lead_image_url?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  reading_time?: number;
};

export type SubmissionResult = {
  article: typeof schema.articles.$inferSelect;
  verdict: "approved" | "rejected" | "flagged_for_review" | "degraded";
  moderation_notes: string;
};

export type AgentOverrides = {
  authorEmail: string;
  authorDisplayName: string;
  isAgentAuthored: true;
  discoveryQuery?: string;
  forceReview?: boolean;
};

export async function submitArticle(
  input: SubmissionInput,
  actor: SessionUser | AgentOverrides
): Promise<SubmissionResult> {
  const isAgent = "isAgentAuthored" in actor;
  const authorEmail = isAgent ? actor.authorEmail : actor.email;
  const authorDisplayName = isAgent ? actor.authorDisplayName : (actor.display_name ?? "");

  // Section 4 F7 — server-side daily post limit, 5 per day for non-exempt
  // human users. Agents get their own ceilings (section 7.3) upstream.
  if (!isAgent && !actor.daily_post_limit_exempt) {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.articles)
      .where(
        and(eq(schema.articles.created_by, authorEmail), gte(schema.articles.created_date, since))
      );
    if (count >= 5) throw Errors.rateLimited("daily publishing limit reached (5/day)");
  }

  if (!input.title?.trim() || !input.body?.trim() || !input.category?.trim()) {
    throw Errors.badRequest("title, body, category required");
  }

  // Moderation (section 7.1). Degrades gracefully: on an AI failure, mark
  // for expert review and let the moderation-retry cron pick it up.
  let verdict: SubmissionResult["verdict"] = "flagged_for_review";
  let moderationNotes = "";
  let modelUsed: string | null = null;
  let tokensIn = 0;
  let tokensOut = 0;
  let expertReview = false;
  try {
    const mod = await moderateArticle({
      title: input.title,
      subtitle: input.subtitle,
      body: input.body,
      category: input.category,
    });
    const concerns = mod.data.concerns ?? [];
    verdict = mod.data.verdict;
    moderationNotes =
      (mod.data.reason ?? "") +
      (concerns.length ? ` — concerns: ${concerns.join("; ")}` : "");
    modelUsed = mod.model;
    tokensIn = mod.tokensIn;
    tokensOut = mod.tokensOut;
  } catch (err: any) {
    verdict = "degraded";
    moderationNotes = `AI unavailable: ${err?.message ?? "unknown"}`;
    expertReview = true;
  }

  // Pick an image if the submission didn't supply one, or if we're (re-)
  // imaging an agent-written article.
  let leadImageUrl = input.lead_image_url ?? null;
  let imageSource: typeof schema.articles.$inferSelect["image_source"] = null;
  let imageSourceRef: string | null = null;
  if (!leadImageUrl) {
    const pick = await pickImage({
      title: input.title,
      category: input.category,
      tags: input.tags,
      labels: input.labels,
      discoveryQuery: isAgent ? actor.discoveryQuery : undefined,
    }).catch(() => null);
    if (pick) {
      leadImageUrl = pick.url;
      imageSource = pick.source;
      imageSourceRef = pick.source_ref ?? null;
    }
  }

  const requireApproval = env().REQUIRE_ADMIN_APPROVAL || (isAgent && actor.forceReview);

  let status: typeof schema.articles.$inferSelect["status"];
  if (verdict === "rejected") status = "rejected";
  else if (verdict === "degraded") status = "pending_moderation";
  else if (verdict === "flagged_for_review" || requireApproval) status = "pending_review";
  else status = "published";

  const now = new Date();
  const values = {
    title: input.title.trim(),
    subtitle: input.subtitle ?? null,
    body: input.body,
    summary: input.summary ?? null,
    category: input.category as any,
    tags: input.tags ?? [],
    labels: input.labels ?? [],
    lead_image_url: leadImageUrl,
    image_source: imageSource,
    image_source_ref: imageSourceRef,
    author_name: authorDisplayName,
    status,
    moderation_notes: moderationNotes,
    ready_to_publish: status === "published",
    expert_review_required: expertReview,
    is_agent_authored: isAgent,
    published_date: status === "published" ? now : null,
    reading_time: input.reading_time ?? estimateReadingTime(input.body),
    meta_title: input.meta_title ?? null,
    meta_description: input.meta_description ?? null,
    created_by: authorEmail,
    updated_date: now,
  };

  let article: typeof schema.articles.$inferSelect;
  if (input.id) {
    const [row] = await db
      .update(schema.articles)
      .set(values)
      .where(eq(schema.articles.id, input.id))
      .returning();
    if (!row) throw Errors.notFound("draft not found");
    article = row;
  } else {
    const [row] = await db.insert(schema.articles).values(values).returning();
    article = row;
  }

  await db.insert(schema.moderationEvents).values({
    article_id: article.id,
    actor_email: authorEmail,
    verdict,
    reason: moderationNotes || null,
    model: modelUsed,
    tokens_in: tokensIn,
    tokens_out: tokensOut,
  });

  return { article, verdict, moderation_notes: moderationNotes };
}

function estimateReadingTime(body: string): number {
  const words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
