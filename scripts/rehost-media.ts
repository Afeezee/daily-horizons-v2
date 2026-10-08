/**
 * Walk every article's lead_image_url and, if it's still hosted on a legacy
 * domain, download the file and re-upload it to Vercel Blob. Mirrors the
 * Convs / Herbyte rehost scripts.
 *
 *   LEGACY_MEDIA_HOST=base44.com npx tsx scripts/rehost-media.ts
 */
import { eq, like } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db, schema } from "../server/db";

const LEGACY = process.env.LEGACY_MEDIA_HOST;
if (!LEGACY) {
  console.error("Set LEGACY_MEDIA_HOST (e.g. base44.com)");
  process.exit(1);
}
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
if (!BLOB_TOKEN) {
  console.error("Set BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

async function run() {
  const rows = await db
    .select()
    .from(schema.articles)
    .where(like(schema.articles.lead_image_url, `%${LEGACY}%`))
    .limit(500);

  console.log(`[rehost] ${rows.length} candidates`);
  for (const row of rows) {
    const url = row.lead_image_url;
    if (!url) continue;
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const blob = await r.blob();
      const ext = (url.split(".").pop() ?? "jpg").split("?")[0].slice(0, 5);
      const key = `legacy/${row.id}.${ext}`;
      const uploaded = await put(key, blob, {
        access: "public",
        token: BLOB_TOKEN!,
        contentType: r.headers.get("content-type") ?? "image/jpeg",
      });
      await db
        .update(schema.articles)
        .set({ lead_image_url: uploaded.url, updated_date: new Date() })
        .where(eq(schema.articles.id, row.id));
      console.log(`[rehost] ${row.id} → ${uploaded.url}`);
    } catch (err: any) {
      console.warn(`[rehost] ${row.id} failed: ${err?.message}`);
    }
  }
  console.log("[rehost] done");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
