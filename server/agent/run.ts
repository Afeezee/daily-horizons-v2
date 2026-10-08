import { and, gte, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { env } from "../env";
import { Errors } from "../errors";
import { submitArticle } from "../moderation/pipeline";
import { budgetRemaining } from "../ai/budget";
import { discoverStories, markSeen } from "./discover";
import { writeArticleFromStory } from "./write";

export type AgentRunParams = {
  triggeredBy: "scheduled" | "admin" | "service";
  actorUserId?: string | null;
  queries?: string[];
  region?: "global" | "nigeria" | "africa" | "all";
  category?: string;
  count?: number;
  forceReview?: boolean;
};

export type AgentRunResult = {
  runId: string;
  stories_found: number;
  articles_published: number;
  articles_drafted: number;
  skipped: number;
  errors: { url: string; error: string }[];
  budget_hit: boolean;
};

/**
 * Shared execution path for both the cron trigger and the admin
 * "Generate now" panel (section 7.5). Caps against AGENT_RUNS_PER_DAY
 * and AGENT_MAX_ARTICLES_PER_RUN; records a full run row in agent_usage.
 */
export async function runAgent(params: AgentRunParams): Promise<AgentRunResult> {
  const E = env();

  // Daily run ceiling — admin or scheduled, same bucket.
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.agentUsage)
    .where(gte(schema.agentUsage.started_at, since));
  if (count >= E.AGENT_RUNS_PER_DAY) {
    throw Errors.rateLimited("agent daily run ceiling reached");
  }

  const budget = await budgetRemaining();
  if (budget.dayTokensLeft < 2000) {
    throw Errors.rateLimited("Groq daily budget exhausted, deferring agent run");
  }

  const [run] = await db
    .insert(schema.agentUsage)
    .values({
      run_id: crypto.randomUUID(),
      triggered_by: params.triggeredBy,
      actor_user_id: params.actorUserId ?? null,
      queries: params.queries ?? [],
      region: params.region ?? "all",
      status: "running",
    })
    .returning();

  const result: AgentRunResult = {
    runId: run.run_id,
    stories_found: 0,
    articles_published: 0,
    articles_drafted: 0,
    skipped: 0,
    errors: [],
    budget_hit: false,
  };

  try {
    const stories = await discoverStories({
      queries: params.queries,
      region: params.region ?? "all",
    });
    result.stories_found = stories.length;

    const cap = Math.min(params.count ?? E.AGENT_MAX_ARTICLES_PER_RUN, E.AGENT_MAX_ARTICLES_PER_RUN);

    let totalTokens = 0;
    let publishedCount = 0;
    for (const story of stories) {
      if (publishedCount >= cap) break;
      if (params.category && story.query.toLowerCase() !== params.category.toLowerCase()) {
        // Treat category param as a soft filter — only publish stories whose
        // discovery query matched the category hint. Skip the rest for now.
        result.skipped++;
        continue;
      }

      try {
        const { draft, tokensIn, tokensOut } = await writeArticleFromStory(story);
        totalTokens += tokensIn + tokensOut;
        const submission = await submitArticle(
          {
            title: draft.title,
            subtitle: draft.subtitle || null,
            summary: draft.summary,
            body: draft.body + "\n\n" + sourceList(draft.cited_urls),
            category: params.category ?? draft.category,
            tags: draft.tags,
            labels: [story.query],
            meta_description: draft.meta_description,
          },
          {
            authorEmail: E.AGENT_AUTHOR_EMAIL,
            authorDisplayName: E.AGENT_AUTHOR_DISPLAY_NAME,
            isAgentAuthored: true,
            discoveryQuery: story.query,
            forceReview: !!params.forceReview,
          }
        );
        await markSeen(story, submission.article.id);
        result.articles_drafted++;
        if (submission.article.status === "published") {
          publishedCount++;
          result.articles_published++;
        }
      } catch (err: any) {
        result.errors.push({ url: story.url, error: String(err?.message ?? err) });
        if (/ceiling|budget/i.test(err?.message ?? "")) {
          result.budget_hit = true;
          break;
        }
      }
    }

    await db
      .update(schema.agentUsage)
      .set({
        status: result.budget_hit
          ? "partial"
          : result.errors.length && !result.articles_drafted
          ? "failed"
          : "completed",
        stories_found: result.stories_found,
        stories_skipped: result.skipped,
        articles_drafted: result.articles_drafted,
        articles_published: result.articles_published,
        tokens_used: totalTokens,
        error: result.errors.length ? JSON.stringify(result.errors).slice(0, 2000) : null,
        finished_at: new Date(),
      })
      .where(sql`${schema.agentUsage.id} = ${run.id}`);
  } catch (err: any) {
    await db
      .update(schema.agentUsage)
      .set({
        status: "failed",
        error: String(err?.message ?? err),
        finished_at: new Date(),
      })
      .where(sql`${schema.agentUsage.id} = ${run.id}`);
    throw err;
  }

  return result;
}

function sourceList(urls: string[]): string {
  if (!urls.length) return "";
  const items = urls.map((u) => `- [${new URL(u).hostname}](${u})`).join("\n");
  return `\n\n**Sources:**\n${items}`;
}
