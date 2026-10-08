import { and, desc, eq, inArray, gte } from "drizzle-orm";
import { Resend } from "resend";
import { db, schema } from "../db";
import { env } from "../env";
import { Errors } from "../errors";

let _resend: Resend | null = null;
function resend(): Resend {
  if (!_resend) {
    const key = env().RESEND_API_KEY;
    if (!key) throw Errors.unavailable("Resend not configured");
    _resend = new Resend(key);
  }
  return _resend;
}

/**
 * Build the balanced-by-category selection the frontend DailyDigest.jsx
 * computes today, server-side so both paths agree. Picks up to numArticles
 * published in the last 24 hours, biased toward preferred categories.
 */
async function pickDigestArticles(pref: typeof schema.digestPreferences.$inferSelect) {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const published = await db
    .select()
    .from(schema.articles)
    .where(
      and(eq(schema.articles.status, "published"), gte(schema.articles.published_date, since))
    )
    .orderBy(desc(schema.articles.published_date))
    .limit(100);

  const preferred = pref.preferred_categories ?? [];
  const inPref = preferred.length
    ? published.filter((a) => preferred.includes(a.category))
    : published;
  const remainder = published.filter((a) => !inPref.includes(a));
  const combined = [...inPref, ...remainder];

  // Balance across categories — round-robin by category to avoid 5 Politics
  // and nothing else.
  const byCat: Record<string, typeof published> = {};
  for (const a of combined) {
    (byCat[a.category] ??= []).push(a);
  }
  const result: typeof published = [];
  const cats = Object.keys(byCat);
  let i = 0;
  while (result.length < pref.num_articles && cats.some((c) => byCat[c].length)) {
    const cat = cats[i % cats.length];
    const next = byCat[cat].shift();
    if (next) result.push(next);
    i++;
    if (i > cats.length * 20) break;
  }
  return result.slice(0, pref.num_articles);
}

function renderDigestEmail(opts: {
  name: string;
  articles: typeof schema.articles.$inferSelect[];
}): { subject: string; html: string } {
  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });
  const items = opts.articles
    .map(
      (a) => `
    <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #eee">
      ${a.lead_image_url ? `<img src="${a.lead_image_url}" style="width:100%;max-width:560px;border-radius:6px;margin-bottom:10px" alt="">` : ""}
      <div style="color:#888;font-size:12px;text-transform:uppercase">${escape(a.category)}</div>
      <h2 style="margin:4px 0 8px;font-size:20px;line-height:1.3">
        <a href="https://dailyhorizons.app/article?id=${a.id}" style="color:#111;text-decoration:none">${escape(a.title)}</a>
      </h2>
      ${a.summary ? `<p style="margin:0;color:#444">${escape(a.summary)}</p>` : ""}
    </div>`
    )
    .join("");

  const html = `<!doctype html>
<html><body style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="font-size:28px;margin:0 0 4px">Daily Horizons</h1>
  <div style="color:#666;margin-bottom:24px">${date} — your digest, ${escape(opts.name || "there")}</div>
  ${items}
  <div style="color:#999;font-size:12px;margin-top:24px">
    You're receiving this because you opted into the daily digest.
    <a href="https://dailyhorizons.app/myaccount">Change your preferences</a>.
  </div>
</body></html>`;
  return { subject: `Daily Horizons — ${date}`, html };
}

function escape(s: string | null | undefined): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

export async function sendDigestForUser(opts: {
  user: typeof schema.users.$inferSelect;
  pref: typeof schema.digestPreferences.$inferSelect;
  onDemand?: boolean;
}) {
  const articles = await pickDigestArticles(opts.pref);
  if (!articles.length) {
    await db.insert(schema.digestSends).values({
      recipient_email: opts.user.email,
      recipient_user_id: opts.user.id,
      article_count: 0,
      article_ids: [],
      status: "skipped",
      on_demand: !!opts.onDemand,
    });
    return { skipped: true, article_count: 0 };
  }

  const { subject, html } = renderDigestEmail({
    name: opts.user.display_name ?? "",
    articles,
  });

  try {
    await resend().emails.send({
      from: "Daily Horizons <digest@dailyhorizons.app>",
      to: opts.user.email,
      subject,
      html,
    });
    await db.insert(schema.digestSends).values({
      recipient_email: opts.user.email,
      recipient_user_id: opts.user.id,
      article_count: articles.length,
      article_ids: articles.map((a) => a.id),
      status: "sent",
      on_demand: !!opts.onDemand,
    });
    return { sent: true, article_count: articles.length };
  } catch (err: any) {
    await db.insert(schema.digestSends).values({
      recipient_email: opts.user.email,
      recipient_user_id: opts.user.id,
      article_count: articles.length,
      article_ids: articles.map((a) => a.id),
      status: "failed",
      error: String(err?.message ?? err),
      on_demand: !!opts.onDemand,
    });
    throw err;
  }
}

/**
 * Scheduled hourly send. Picks every DigestPreference whose frequency +
 * delivery_time maps to the current hour.
 */
export async function sendScheduledDigests(now = new Date()) {
  const hour = now.getUTCHours();
  const dow = now.getUTCDay(); // 0=Sun

  const prefs = await db
    .select()
    .from(schema.digestPreferences)
    .where(eq(schema.digestPreferences.is_active, true));

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const pref of prefs) {
    if (!matchesWindow(pref, hour, dow)) continue;

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, pref.created_by))
      .limit(1);
    if (!user) continue;

    try {
      const res = await sendDigestForUser({ user, pref });
      if (res.skipped) skipped++;
      else sent++;
    } catch (err: any) {
      errors.push(`${user.email}: ${err?.message ?? err}`);
    }
  }
  return { sent, skipped, errors };
}

function matchesWindow(
  pref: typeof schema.digestPreferences.$inferSelect,
  hour: number,
  dow: number
): boolean {
  const prefHour = Number((pref.delivery_time ?? "08:00").split(":")[0]);
  if (prefHour !== hour) return false;
  switch (pref.frequency) {
    case "daily": return true;
    case "weekdays": return dow >= 1 && dow <= 5;
    case "three_per_week": return [1, 3, 5].includes(dow);
    case "weekly": return dow === 1;
  }
  return false;
}
