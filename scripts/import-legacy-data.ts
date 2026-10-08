/**
 * Imports exported Base44 data at `migration-data/<Entity>.json` into the
 * Neon database. Idempotent: a row with a matching `legacy_id` is updated
 * rather than reinserted. Order: users → publisher_profiles → articles →
 * comments → article_likes → saved_articles → digest_preferences →
 * newsletter_subscribers.
 *
 * Usage:
 *   npx tsx scripts/import-legacy-data.ts            # import
 *   npx tsx scripts/import-legacy-data.ts --dry-run  # list only
 */
import fs from "node:fs";
import path from "node:path";
import { db, schema } from "../server/db";
import { eq } from "drizzle-orm";

const DATA_DIR = path.resolve(process.cwd(), "migration-data");
const DRY = process.argv.includes("--dry-run");

async function readJson<T>(name: string): Promise<T[]> {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) {
    console.log(`[import] skipping ${name} — ${file} not found`);
    return [];
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

type LegacyUser = { id?: string; email: string; display_name?: string; bio?: string; role?: string; preferences?: any };
type LegacyArticle = Record<string, any>;

async function run() {
  const users = await readJson<LegacyUser>("User");
  console.log(`[import] ${users.length} users`);
  for (const u of users) {
    if (DRY) continue;
    await db
      .insert(schema.users)
      .values({
        email: u.email.toLowerCase(),
        display_name: u.display_name ?? null,
        bio: u.bio ?? null,
        preferences: u.preferences ?? {},
        role: u.role === "admin" ? "admin" : "user",
        legacy_id: u.id,
      })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: {
          display_name: u.display_name ?? null,
          bio: u.bio ?? null,
          legacy_id: u.id,
          updated_date: new Date(),
        },
      });
  }

  const profiles = await readJson<any>("PublisherProfile");
  console.log(`[import] ${profiles.length} publisher profiles`);
  for (const p of profiles) {
    if (DRY) continue;
    await db
      .insert(schema.publisherProfiles)
      .values({ ...p, legacy_id: p.id, created_by: p.created_by.toLowerCase() })
      .onConflictDoNothing();
  }

  const articles = await readJson<LegacyArticle>("Article");
  console.log(`[import] ${articles.length} articles`);
  for (const a of articles) {
    if (DRY) continue;
    await db
      .insert(schema.articles)
      .values({
        title: a.title,
        subtitle: a.subtitle ?? null,
        body: a.body,
        summary: a.summary ?? null,
        category: a.category,
        labels: a.labels ?? [],
        tags: a.tags ?? [],
        lead_image_url: a.lead_image_url ?? null,
        image_source: "legacy",
        image_source_ref: null,
        author_name: a.author_name ?? null,
        status: a.status ?? "published",
        is_agent_authored: a.created_by === "anonymous",
        published_date: a.published_date ? new Date(a.published_date) : null,
        reading_time: a.reading_time ?? null,
        views_count: a.views_count ?? 0,
        likes_count: a.likes_count ?? 0,
        comments_count: a.comments_count ?? 0,
        is_featured: !!a.is_featured,
        is_editor_pick: !!a.is_editor_pick,
        meta_title: a.meta_title ?? null,
        meta_description: a.meta_description ?? null,
        legacy_id: a.id,
        created_by:
          a.created_by === "anonymous"
            ? process.env.AGENT_AUTHOR_EMAIL ?? "agent@dailyhorizons.app"
            : (a.created_by ?? "unknown").toLowerCase(),
      })
      .onConflictDoNothing({ target: schema.articles.legacy_id });
  }

  const comments = await readJson<any>("Comment");
  console.log(`[import] ${comments.length} comments`);
  for (const c of comments) {
    if (DRY) continue;
    const parent = c.article_id;
    const [article] = await db
      .select({ id: schema.articles.id })
      .from(schema.articles)
      .where(eq(schema.articles.legacy_id, parent))
      .limit(1);
    if (!article) continue;
    await db
      .insert(schema.comments)
      .values({
        article_id: article.id,
        parent_comment_id: null, // thread wiring left for a second pass
        content: c.content,
        author_name: c.author_name ?? null,
        likes_count: c.likes_count ?? 0,
        is_author_reply: !!c.is_author_reply,
        legacy_id: c.id,
        created_by: (c.created_by ?? "unknown").toLowerCase(),
      })
      .onConflictDoNothing({ target: schema.comments.legacy_id });
  }

  const likes = await readJson<any>("ArticleLike");
  console.log(`[import] ${likes.length} likes`);
  for (const l of likes) {
    if (DRY) continue;
    const [article] = await db
      .select({ id: schema.articles.id })
      .from(schema.articles)
      .where(eq(schema.articles.legacy_id, l.article_id))
      .limit(1);
    if (!article) continue;
    await db
      .insert(schema.articleLikes)
      .values({
        article_id: article.id,
        reaction_type: l.reaction_type ?? "like",
        legacy_id: l.id,
        created_by: (l.created_by ?? "unknown").toLowerCase(),
      })
      .onConflictDoNothing();
  }

  const saved = await readJson<any>("SavedArticle");
  console.log(`[import] ${saved.length} saved articles`);
  for (const s of saved) {
    if (DRY) continue;
    const [article] = await db
      .select({ id: schema.articles.id })
      .from(schema.articles)
      .where(eq(schema.articles.legacy_id, s.article_id))
      .limit(1);
    if (!article) continue;
    await db
      .insert(schema.savedArticles)
      .values({
        article_id: article.id,
        folder: s.folder ?? "read_later",
        legacy_id: s.id,
        created_by: (s.created_by ?? "unknown").toLowerCase(),
      })
      .onConflictDoNothing();
  }

  const prefs = await readJson<any>("DigestPreference");
  console.log(`[import] ${prefs.length} digest prefs`);
  for (const p of prefs) {
    if (DRY) continue;
    await db
      .insert(schema.digestPreferences)
      .values({ ...p, legacy_id: p.id, created_by: p.created_by.toLowerCase() })
      .onConflictDoNothing();
  }

  const subs = await readJson<any>("NewsletterSubscriber");
  console.log(`[import] ${subs.length} newsletter subscribers`);
  for (const s of subs) {
    if (DRY) continue;
    await db
      .insert(schema.newsletterSubscribers)
      .values({
        email: s.email.toLowerCase(),
        name: s.name ?? null,
        is_active: s.is_active ?? true,
        unsubscribe_token: crypto.randomUUID(),
        legacy_id: s.id,
      })
      .onConflictDoNothing({ target: schema.newsletterSubscribers.email });
  }

  console.log("[import] done");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
