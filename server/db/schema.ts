import {
  pgTable,
  pgEnum,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  uuid,
  uniqueIndex,
  index,
  real,
  bigint,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ──────────────────────────────────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────────────────────────────────

export const articleStatusEnum = pgEnum("article_status", [
  "draft",
  "pending_moderation",
  "pending_review",
  "published",
  "rejected",
]);

export const articleCategoryEnum = pgEnum("article_category", [
  "News",
  "Opinion",
  "Culture",
  "Lifestyle",
  "Sport",
  "Education",
  "Technology",
  "Business",
  "Economy",
  "Politics",
  "Crime",
  "Entertainment",
  "Health",
  "World",
]);

export const reactionTypeEnum = pgEnum("reaction_type", [
  "like",
  "insightful",
  "disagree",
  "applaud",
]);

export const digestFrequencyEnum = pgEnum("digest_frequency", [
  "daily",
  "weekdays",
  "three_per_week",
  "weekly",
]);

export const savedFolderEnum = pgEnum("saved_folder", [
  "read_later",
  "research",
  "favourite",
]);

export const roleEnum = pgEnum("user_role", ["user", "admin"]);

export const imageSourceEnum = pgEnum("image_source", [
  "stock:unsplash",
  "stock:pexels",
  "stock:pixabay",
  "ai:pollinations",
  "category_default",
  "user_upload",
  "legacy",
]);

export const moderationVerdictEnum = pgEnum("moderation_verdict", [
  "approved",
  "rejected",
  "flagged_for_review",
  "degraded",
]);

export const agentRunTriggerEnum = pgEnum("agent_run_trigger", [
  "scheduled",
  "admin",
  "service",
]);

export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "running",
  "completed",
  "failed",
  "partial",
]);

// ──────────────────────────────────────────────────────────────────────────
// Users (Clerk-synced)
// ──────────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerk_id: text("clerk_id").unique(),
    email: text("email").notNull().unique(),
    full_name: text("full_name"),
    display_name: text("display_name"),
    bio: text("bio"),
    preferences: jsonb("preferences").$type<{
      theme?: "light" | "dark";
      breaking_news_alerts?: boolean;
    }>().default({}).notNull(),
    role: roleEnum("role").default("user").notNull(),
    daily_post_limit_exempt: boolean("daily_post_limit_exempt").default(false).notNull(),
    is_banned: boolean("is_banned").default(false).notNull(),
    legacy_id: text("legacy_id").unique(),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
    updated_date: timestamp("updated_date", { withTimezone: true }).defaultNow().notNull(),
    created_by: text("created_by"),
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
  })
);

// ──────────────────────────────────────────────────────────────────────────
// Articles
// ──────────────────────────────────────────────────────────────────────────

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    body: text("body").notNull(),
    summary: text("summary"),
    category: articleCategoryEnum("category").notNull(),
    labels: text("labels").array().default(sql`'{}'::text[]`).notNull(),
    tags: text("tags").array().default(sql`'{}'::text[]`).notNull(),
    lead_image_url: text("lead_image_url"),
    image_source: imageSourceEnum("image_source"),
    image_source_ref: text("image_source_ref"),
    author_name: text("author_name"),
    status: articleStatusEnum("status").default("draft").notNull(),
    moderation_notes: text("moderation_notes"),
    ready_to_publish: boolean("ready_to_publish").default(false).notNull(),
    expert_review_required: boolean("expert_review_required").default(false).notNull(),
    is_agent_authored: boolean("is_agent_authored").default(false).notNull(),
    published_date: timestamp("published_date", { withTimezone: true }),
    reading_time: integer("reading_time"),
    views_count: integer("views_count").default(0).notNull(),
    likes_count: integer("likes_count").default(0).notNull(),
    comments_count: integer("comments_count").default(0).notNull(),
    is_featured: boolean("is_featured").default(false).notNull(),
    is_editor_pick: boolean("is_editor_pick").default(false).notNull(),
    meta_title: text("meta_title"),
    meta_description: text("meta_description"),
    legacy_id: text("legacy_id").unique(),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
    updated_date: timestamp("updated_date", { withTimezone: true }).defaultNow().notNull(),
    created_by: text("created_by").notNull(),
  },
  (t) => ({
    categoryIdx: index("articles_category_idx").on(t.category),
    statusPublishedIdx: index("articles_status_published_idx").on(t.status, t.published_date),
    createdByIdx: index("articles_created_by_idx").on(t.created_by),
    agentAuthoredIdx: index("articles_is_agent_authored_idx").on(t.is_agent_authored),
    // GIN full-text search covering title, subtitle, body — section 12.
    fulltextIdx: index("articles_fulltext_idx").using(
      "gin",
      sql`to_tsvector('english', coalesce(${t.title}, '') || ' ' || coalesce(${t.subtitle}, '') || ' ' || coalesce(${t.body}, ''))`
    ),
  })
);

// ──────────────────────────────────────────────────────────────────────────
// Comments
// ──────────────────────────────────────────────────────────────────────────

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    article_id: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    parent_comment_id: uuid("parent_comment_id"),
    content: text("content").notNull(),
    author_name: text("author_name"),
    likes_count: integer("likes_count").default(0).notNull(),
    is_author_reply: boolean("is_author_reply").default(false).notNull(),
    legacy_id: text("legacy_id").unique(),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
    updated_date: timestamp("updated_date", { withTimezone: true }).defaultNow().notNull(),
    created_by: text("created_by").notNull(),
  },
  (t) => ({
    articleCreatedIdx: index("comments_article_created_idx").on(t.article_id, t.created_date),
  })
);

// ──────────────────────────────────────────────────────────────────────────
// Article likes
// ──────────────────────────────────────────────────────────────────────────

export const articleLikes = pgTable(
  "article_likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    article_id: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    reaction_type: reactionTypeEnum("reaction_type").default("like").notNull(),
    legacy_id: text("legacy_id").unique(),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
    updated_date: timestamp("updated_date", { withTimezone: true }).defaultNow().notNull(),
    created_by: text("created_by").notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("article_likes_article_user_uniq").on(t.article_id, t.created_by),
  })
);

// ──────────────────────────────────────────────────────────────────────────
// Saved articles
// ──────────────────────────────────────────────────────────────────────────

export const savedArticles = pgTable(
  "saved_articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    article_id: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    folder: savedFolderEnum("folder").default("read_later").notNull(),
    legacy_id: text("legacy_id").unique(),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
    updated_date: timestamp("updated_date", { withTimezone: true }).defaultNow().notNull(),
    created_by: text("created_by").notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("saved_articles_user_article_uniq").on(t.created_by, t.article_id),
  })
);

// ──────────────────────────────────────────────────────────────────────────
// Digest preferences
// ──────────────────────────────────────────────────────────────────────────

export const digestPreferences = pgTable(
  "digest_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    delivery_time: text("delivery_time").default("08:00").notNull(),
    frequency: digestFrequencyEnum("frequency").default("daily").notNull(),
    num_articles: integer("num_articles").default(5).notNull(),
    preferred_categories: text("preferred_categories").array().default(sql`'{}'::text[]`).notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    legacy_id: text("legacy_id").unique(),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
    updated_date: timestamp("updated_date", { withTimezone: true }).defaultNow().notNull(),
    created_by: text("created_by").notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("digest_preferences_user_uniq").on(t.created_by),
  })
);

// ──────────────────────────────────────────────────────────────────────────
// Publisher profiles
// ──────────────────────────────────────────────────────────────────────────

export const publisherProfiles = pgTable(
  "publisher_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bio: text("bio"),
    avatar_url: text("avatar_url"),
    twitter_handle: text("twitter_handle"),
    accepted_terms: boolean("accepted_terms").default(false).notNull(),
    terms_accepted_date: timestamp("terms_accepted_date", { withTimezone: true }),
    is_approved: boolean("is_approved").default(false).notNull(),
    total_articles: integer("total_articles").default(0).notNull(),
    total_views: integer("total_views").default(0).notNull(),
    total_likes: integer("total_likes").default(0).notNull(),
    legacy_id: text("legacy_id").unique(),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
    updated_date: timestamp("updated_date", { withTimezone: true }).defaultNow().notNull(),
    created_by: text("created_by").notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("publisher_profiles_user_uniq").on(t.created_by),
  })
);

// ──────────────────────────────────────────────────────────────────────────
// Newsletter subscribers
// ──────────────────────────────────────────────────────────────────────────

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    name: text("name"),
    is_active: boolean("is_active").default(true).notNull(),
    unsubscribe_token: text("unsubscribe_token").notNull(),
    brevo_contact_id: text("brevo_contact_id"),
    legacy_id: text("legacy_id").unique(),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
    updated_date: timestamp("updated_date", { withTimezone: true }).defaultNow().notNull(),
    created_by: text("created_by"),
  }
);

// ──────────────────────────────────────────────────────────────────────────
// Infrastructure tables — moderation, budget ledgers, caches, agent, email
// ──────────────────────────────────────────────────────────────────────────

export const moderationEvents = pgTable(
  "moderation_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    article_id: uuid("article_id").references(() => articles.id, { onDelete: "set null" }),
    actor_email: text("actor_email").notNull(),
    verdict: moderationVerdictEnum("verdict").notNull(),
    reason: text("reason"),
    model: text("model"),
    tokens_in: integer("tokens_in"),
    tokens_out: integer("tokens_out"),
    raw_response: jsonb("raw_response"),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    articleIdx: index("moderation_events_article_idx").on(t.article_id),
    createdIdx: index("moderation_events_created_idx").on(t.created_date),
  })
);

export const aiResponseCache = pgTable(
  "ai_response_cache",
  {
    cache_key: text("cache_key").primaryKey(),
    purpose: text("purpose").notNull(),
    model: text("model").notNull(),
    response: jsonb("response").notNull(),
    tokens_in: integer("tokens_in"),
    tokens_out: integer("tokens_out"),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const searchCache = pgTable(
  "search_cache",
  {
    cache_key: text("cache_key").primaryKey(),
    provider: text("provider").notNull(),
    query: text("query").notNull(),
    response: jsonb("response").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
  }
);

// Per-minute and per-day budget buckets. One row per bucket (window_start),
// atomic UPSERT keeps hot-path lookups cheap.
export const llmUsage = pgTable(
  "llm_usage",
  {
    bucket: text("bucket").notNull(), // "minute" | "day"
    window_start: timestamp("window_start", { withTimezone: true }).notNull(),
    requests: integer("requests").default(0).notNull(),
    tokens_in: bigint("tokens_in", { mode: "number" }).default(0).notNull(),
    tokens_out: bigint("tokens_out", { mode: "number" }).default(0).notNull(),
  },
  (t) => ({
    pk: uniqueIndex("llm_usage_pk").on(t.bucket, t.window_start),
  })
);

export const searchUsage = pgTable(
  "search_usage",
  {
    provider: text("provider").notNull(),
    bucket: text("bucket").notNull(),
    window_start: timestamp("window_start", { withTimezone: true }).notNull(),
    requests: integer("requests").default(0).notNull(),
  },
  (t) => ({
    pk: uniqueIndex("search_usage_pk").on(t.provider, t.bucket, t.window_start),
  })
);

export const newsDiscoveryUsage = pgTable(
  "news_discovery_usage",
  {
    bucket: text("bucket").notNull(),
    window_start: timestamp("window_start", { withTimezone: true }).notNull(),
    requests: integer("requests").default(0).notNull(),
  },
  (t) => ({
    pk: uniqueIndex("news_discovery_usage_pk").on(t.bucket, t.window_start),
  })
);

export const imageUsage = pgTable(
  "image_usage",
  {
    provider: text("provider").notNull(),
    bucket: text("bucket").notNull(),
    window_start: timestamp("window_start", { withTimezone: true }).notNull(),
    requests: integer("requests").default(0).notNull(),
  },
  (t) => ({
    pk: uniqueIndex("image_usage_pk").on(t.provider, t.bucket, t.window_start),
  })
);

export const agentUsage = pgTable(
  "agent_usage",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    run_id: uuid("run_id").notNull(),
    triggered_by: agentRunTriggerEnum("triggered_by").notNull(),
    actor_user_id: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    status: agentRunStatusEnum("status").default("running").notNull(),
    queries: text("queries").array().default(sql`'{}'::text[]`).notNull(),
    region: text("region"),
    stories_found: integer("stories_found").default(0).notNull(),
    stories_skipped: integer("stories_skipped").default(0).notNull(),
    articles_drafted: integer("articles_drafted").default(0).notNull(),
    articles_published: integer("articles_published").default(0).notNull(),
    tokens_used: integer("tokens_used").default(0).notNull(),
    search_calls: integer("search_calls").default(0).notNull(),
    error: text("error"),
    started_at: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    finished_at: timestamp("finished_at", { withTimezone: true }),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    runIdx: index("agent_usage_run_idx").on(t.run_id),
    startedIdx: index("agent_usage_started_idx").on(t.started_at),
  })
);

export const agentSeenStories = pgTable(
  "agent_seen_stories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source_url: text("source_url").notNull(),
    url_hash: text("url_hash").notNull().unique(),
    title: text("title"),
    content_hash: text("content_hash"),
    published_article_id: uuid("published_article_id").references(() => articles.id, {
      onDelete: "set null",
    }),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    contentHashIdx: index("agent_seen_stories_content_hash_idx").on(t.content_hash),
  })
);

export const digestSends = pgTable(
  "digest_sends",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipient_email: text("recipient_email").notNull(),
    recipient_user_id: uuid("recipient_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    article_count: integer("article_count").default(0).notNull(),
    article_ids: text("article_ids").array().default(sql`'{}'::text[]`).notNull(),
    status: text("status").notNull(), // "sent" | "failed" | "skipped"
    error: text("error"),
    on_demand: boolean("on_demand").default(false).notNull(),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    createdIdx: index("digest_sends_created_idx").on(t.created_date),
    recipientIdx: index("digest_sends_recipient_idx").on(t.recipient_email),
  })
);

export const newsletterSends = pgTable(
  "newsletter_sends",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subject: text("subject").notNull(),
    body_html: text("body_html").notNull(),
    actor_email: text("actor_email").notNull(),
    recipient_count: integer("recipient_count").default(0).notNull(),
    brevo_campaign_id: text("brevo_campaign_id"),
    status: text("status").notNull(), // "queued" | "sent" | "failed"
    error: text("error"),
    created_date: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const platformSettings = pgTable(
  "platform_settings",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").notNull(),
    updated_by: text("updated_by"),
    updated_date: timestamp("updated_date", { withTimezone: true }).defaultNow().notNull(),
  }
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    window_start: timestamp("window_start", { withTimezone: true }).notNull(),
    hits: integer("hits").default(0).notNull(),
  },
  (t) => ({
    pk: uniqueIndex("rate_limits_pk").on(t.key, t.window_start),
  })
);
