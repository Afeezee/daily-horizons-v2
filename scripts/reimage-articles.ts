/**
 * Walk every article and replace its lead image using the new pipeline.
 * Flags:
 *   --dry-run       print what would change, don't write
 *   --only-generic  skip articles whose current image doesn't look like a
 *                   Base44 placeholder (saves most work on re-runs)
 *   --limit N       cap how many to process this run
 */
import { eq, isNull, or, like, sql } from "drizzle-orm";
import { db, schema } from "../server/db";
import { pickImage } from "../server/images/pipeline";

const DRY = process.argv.includes("--dry-run");
const ONLY_GENERIC = process.argv.includes("--only-generic");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 100;

const PLACEHOLDER_RE = /^(?:https?:\/\/)?(?:[^\/]*\.)?(?:base44\.com|base44app\.com)\//i;

async function run() {
  const where = ONLY_GENERIC
    ? or(
        isNull(schema.articles.lead_image_url),
        like(schema.articles.lead_image_url, "%base44%")
      )
    : undefined;

  const rows = await db
    .select()
    .from(schema.articles)
    .where(where)
    .limit(LIMIT);

  console.log(`[reimage] processing ${rows.length} articles (dry=${DRY}, onlyGeneric=${ONLY_GENERIC})`);
  let changed = 0;
  for (const row of rows) {
    const pick = await pickImage({
      title: row.title,
      category: row.category,
      tags: row.tags ?? [],
      labels: row.labels ?? [],
    }).catch((err) => {
      console.warn(`[reimage] skip ${row.id} — ${err?.message}`);
      return null;
    });
    if (!pick) continue;
    console.log(`[reimage] ${row.id} ${row.title.slice(0, 60)} → ${pick.source}`);
    if (DRY) continue;
    await db
      .update(schema.articles)
      .set({
        lead_image_url: pick.url,
        image_source: pick.source,
        image_source_ref: pick.source_ref ?? null,
        updated_date: new Date(),
      })
      .where(eq(schema.articles.id, row.id));
    changed++;
  }
  console.log(`[reimage] done — ${changed} updated`);
}

// `sql` referenced to keep tree-shaking happy on the import above.
void sql;
void PLACEHOLDER_RE;

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
