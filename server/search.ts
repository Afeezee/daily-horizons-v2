import { env } from "./env";
import { Errors } from "./errors";
import {
  newsDiscoveryDailyCount,
  recordNewsDiscoveryUsage,
  recordSearchUsage,
  searchDailyCount,
} from "./ai/budget";
import { hashKey, readSearchCache, writeSearchCache } from "./ai/cache";

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  publishedAt?: string;
};

/**
 * Fact-checker / augment search path. Serper first, Tavily as fallback on
 * quota/402. Caches per query for an hour.
 */
export async function webSearch(query: string, limit = 5): Promise<SearchResult[]> {
  const E = env();
  const used = await searchDailyCount();
  if (used >= E.SEARCH_DAILY_CEILING) throw Errors.rateLimited("search daily ceiling reached");

  const cacheKey = hashKey({ kind: "web", q: query, limit });
  const cached = await readSearchCache(cacheKey);
  if (cached) return (cached.response as SearchResult[]).slice(0, limit);

  if (E.SERPER_API_KEY) {
    try {
      const r = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": E.SERPER_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q: query, num: limit }),
      });
      if (r.status === 402 || r.status === 429) throw new Error("serper quota");
      if (!r.ok) throw new Error(`serper ${r.status}`);
      const json = await r.json();
      await recordSearchUsage("serper");
      const results: SearchResult[] = (json.organic ?? []).slice(0, limit).map((o: any) => ({
        title: o.title,
        url: o.link,
        snippet: o.snippet ?? "",
        source: o.source,
      }));
      await writeSearchCache({
        key: cacheKey,
        provider: "serper",
        query,
        response: results,
        ttlSec: 3600,
      });
      return results;
    } catch {
      // Fall through to Tavily.
    }
  }

  if (E.TAVILY_API_KEY) {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: E.TAVILY_API_KEY,
        query,
        max_results: limit,
      }),
    });
    if (!r.ok) throw Errors.unavailable("search unavailable");
    const json = await r.json();
    await recordSearchUsage("tavily");
    const results: SearchResult[] = (json.results ?? []).slice(0, limit).map((o: any) => ({
      title: o.title,
      url: o.url,
      snippet: o.content ?? "",
    }));
    await writeSearchCache({
      key: cacheKey,
      provider: "tavily",
      query,
      response: results,
      ttlSec: 3600,
    });
    return results;
  }

  throw Errors.unavailable("No search provider configured");
}

export type NewsItem = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: string;
  thumbnail?: string;
};

/**
 * Content-agent discovery path. Uses Serper's /news endpoint and budgets
 * separately from the fact-checker's /search usage. `region` maps to
 * Serper's gl parameter plus a location string where it helps.
 */
export async function newsSearch(opts: {
  query: string;
  region?: "global" | "nigeria" | "africa" | "all";
  limit?: number;
}): Promise<NewsItem[]> {
  const E = env();
  const limit = opts.limit ?? 10;

  const used = await newsDiscoveryDailyCount();
  if (used >= E.NEWS_DISCOVERY_DAILY_CEILING) {
    throw Errors.rateLimited("news discovery daily ceiling reached");
  }
  if (!E.SERPER_API_KEY) throw Errors.unavailable("Serper not configured");

  const gl = opts.region === "nigeria" ? "ng" : opts.region === "africa" ? "za" : undefined;
  const location = opts.region === "nigeria" ? "Nigeria" : undefined;

  const cacheKey = hashKey({ kind: "news", q: opts.query, gl, location, limit });
  const cached = await readSearchCache(cacheKey);
  if (cached) return cached.response as NewsItem[];

  const body: Record<string, any> = { q: opts.query, num: limit };
  if (gl) body.gl = gl;
  if (location) body.location = location;

  const r = await fetch("https://google.serper.dev/news", {
    method: "POST",
    headers: { "X-API-KEY": E.SERPER_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw Errors.unavailable(`Serper /news error ${r.status}`);
  const json = await r.json();
  await recordNewsDiscoveryUsage();

  const items: NewsItem[] = (json.news ?? []).slice(0, limit).map((n: any) => ({
    title: n.title,
    url: n.link,
    snippet: n.snippet ?? "",
    source: n.source,
    publishedAt: n.date,
    thumbnail: n.imageUrl,
  }));
  await writeSearchCache({
    key: cacheKey,
    provider: "serper-news",
    query: opts.query,
    response: items,
    ttlSec: 1800,
  });
  return items;
}
