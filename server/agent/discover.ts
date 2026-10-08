import { createHash } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "../db";
import { newsSearch, type NewsItem } from "../search";
import { agentNewsQueries, env } from "../env";

export type DiscoveredStory = NewsItem & {
  url_hash: string;
  query: string;
};

export type DiscoveryOptions = {
  queries?: string[];
  region?: "global" | "nigeria" | "africa" | "all";
  perQueryLimit?: number;
};

/**
 * Walk the configured query list (per region), pull Serper /news results,
 * drop any URL we already pulled (agent_seen_stories), drop any URL whose
 * title is a fuzzy match on a recent article (keeps the agent and a human
 * publisher from both covering the same story).
 */
export async function discoverStories(opts: DiscoveryOptions = {}): Promise<DiscoveredStory[]> {
  const E = env();
  const queries = opts.queries?.length ? opts.queries : agentNewsQueries();
  const perQ = opts.perQueryLimit ?? 10;

  const regions: ("global" | "nigeria" | "africa")[] =
    opts.region === "all" || !opts.region
      ? ["global", "nigeria", "africa"]
      : [opts.region];

  const stories: DiscoveredStory[] = [];
  for (const q of queries) {
    for (const region of regions) {
      try {
        const items = await newsSearch({ query: q, region, limit: perQ });
        for (const item of items) {
          stories.push({ ...item, url_hash: hashUrl(item.url), query: q });
        }
      } catch (err: any) {
        // Rate-limited or unavailable — bail from this region, keep others.
        if (/ceiling|unavailable|quota/i.test(err?.message ?? "")) break;
      }
    }
  }

  if (!stories.length) return [];

  // Drop stories we've already seen.
  const hashes = stories.map((s) => s.url_hash);
  const seen = await db
    .select({ url_hash: schema.agentSeenStories.url_hash })
    .from(schema.agentSeenStories)
    .where(inArray(schema.agentSeenStories.url_hash, hashes));
  const seenSet = new Set(seen.map((s) => s.url_hash));

  // Fuzzy-dedup against the agent's own E.AGENT_MAX_ARTICLES_PER_RUN * 20
  // most recent articles, to avoid covering the same story twice in a week.
  const recentArticles = await db
    .select({ title: schema.articles.title })
    .from(schema.articles)
    .orderBy(schema.articles.created_date)
    .limit(E.AGENT_MAX_ARTICLES_PER_RUN * 20);
  const recentNorms = new Set(recentArticles.map((a) => normaliseTitle(a.title)));

  return stories.filter((s) => {
    if (seenSet.has(s.url_hash)) return false;
    if (recentNorms.has(normaliseTitle(s.title))) return false;
    return true;
  });
}

export async function markSeen(story: DiscoveredStory, articleId?: string) {
  await db
    .insert(schema.agentSeenStories)
    .values({
      source_url: story.url,
      url_hash: story.url_hash,
      title: story.title,
      content_hash: hashUrl(story.title + "|" + story.snippet),
      published_article_id: articleId ?? null,
    })
    .onConflictDoNothing({ target: schema.agentSeenStories.url_hash });
}

function hashUrl(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function normaliseTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
