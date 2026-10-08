import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "../db";

export async function trafficOverview(days = 30) {
  const since = new Date(Date.now() - days * 86400 * 1000);
  const rows = await db
    .select({
      day: sql<string>`date_trunc('day', ${schema.articles.published_date})::date::text`,
      views: sql<number>`sum(${schema.articles.views_count})::int`,
      likes: sql<number>`sum(${schema.articles.likes_count})::int`,
      comments: sql<number>`sum(${schema.articles.comments_count})::int`,
      articles: sql<number>`count(*)::int`,
    })
    .from(schema.articles)
    .where(
      and(eq(schema.articles.status, "published"), gte(schema.articles.published_date, since))
    )
    .groupBy(sql`date_trunc('day', ${schema.articles.published_date})`)
    .orderBy(sql`date_trunc('day', ${schema.articles.published_date})`);
  return rows;
}

export async function topArticles(limit = 20) {
  const rows = await db
    .select({
      id: schema.articles.id,
      title: schema.articles.title,
      category: schema.articles.category,
      views_count: schema.articles.views_count,
      likes_count: schema.articles.likes_count,
      comments_count: schema.articles.comments_count,
      is_agent_authored: schema.articles.is_agent_authored,
      published_date: schema.articles.published_date,
    })
    .from(schema.articles)
    .where(eq(schema.articles.status, "published"))
    .orderBy(desc(schema.articles.views_count))
    .limit(limit);
  return rows;
}

export async function categoryBreakdown(days = 30) {
  const since = new Date(Date.now() - days * 86400 * 1000);
  const rows = await db
    .select({
      category: schema.articles.category,
      articles: sql<number>`count(*)::int`,
      views: sql<number>`sum(${schema.articles.views_count})::int`,
    })
    .from(schema.articles)
    .where(
      and(eq(schema.articles.status, "published"), gte(schema.articles.published_date, since))
    )
    .groupBy(schema.articles.category);
  return rows;
}

export async function authorshipSplit(days = 30) {
  const since = new Date(Date.now() - days * 86400 * 1000);
  const rows = await db
    .select({
      is_agent_authored: schema.articles.is_agent_authored,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.articles)
    .where(
      and(eq(schema.articles.status, "published"), gte(schema.articles.published_date, since))
    )
    .groupBy(schema.articles.is_agent_authored);
  return rows;
}

export async function digestHistory(limit = 50) {
  return db
    .select()
    .from(schema.digestSends)
    .orderBy(desc(schema.digestSends.created_date))
    .limit(limit);
}

export async function newsletterGrowth(days = 60) {
  const since = new Date(Date.now() - days * 86400 * 1000);
  return db
    .select({
      day: sql<string>`date_trunc('day', ${schema.newsletterSubscribers.created_date})::date::text`,
      added: sql<number>`count(*)::int`,
    })
    .from(schema.newsletterSubscribers)
    .where(gte(schema.newsletterSubscribers.created_date, since))
    .groupBy(sql`date_trunc('day', ${schema.newsletterSubscribers.created_date})`)
    .orderBy(sql`date_trunc('day', ${schema.newsletterSubscribers.created_date})`);
}

export async function agentRunHistory(limit = 50) {
  return db
    .select()
    .from(schema.agentUsage)
    .orderBy(desc(schema.agentUsage.started_at))
    .limit(limit);
}

export async function moderationHistory(limit = 100) {
  return db
    .select()
    .from(schema.moderationEvents)
    .orderBy(desc(schema.moderationEvents.created_date))
    .limit(limit);
}

export async function budgetSnapshot() {
  const today = new Date();
  const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [llm] = await db
    .select({
      requests: schema.llmUsage.requests,
      tokens_in: schema.llmUsage.tokens_in,
      tokens_out: schema.llmUsage.tokens_out,
    })
    .from(schema.llmUsage)
    .where(
      and(eq(schema.llmUsage.bucket, "day"), gte(schema.llmUsage.window_start, dayStart))
    )
    .limit(1);
  const [news] = await db
    .select({ requests: schema.newsDiscoveryUsage.requests })
    .from(schema.newsDiscoveryUsage)
    .where(
      and(
        eq(schema.newsDiscoveryUsage.bucket, "day"),
        gte(schema.newsDiscoveryUsage.window_start, dayStart)
      )
    )
    .limit(1);
  const search = await db
    .select({ provider: schema.searchUsage.provider, requests: schema.searchUsage.requests })
    .from(schema.searchUsage)
    .where(
      and(eq(schema.searchUsage.bucket, "day"), gte(schema.searchUsage.window_start, dayStart))
    );
  return {
    llm: llm ?? { requests: 0, tokens_in: 0, tokens_out: 0 },
    news_discovery: news?.requests ?? 0,
    search_by_provider: search,
  };
}
