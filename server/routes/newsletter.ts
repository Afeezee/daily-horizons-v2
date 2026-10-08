import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { requireAdmin, type AppContext } from "../auth";
import { db, schema } from "../db";
import { Errors } from "../errors";
import {
  NEWSLETTER_LIST_ID,
  brevoRemoveFromList,
  brevoSendCampaign,
  brevoUpsertContact,
} from "../email/brevo";

const newsletterRoute = new Hono<AppContext>();

// ──────────────────────────────────────────────────────────────────────────
// Public subscribe / unsubscribe
// ──────────────────────────────────────────────────────────────────────────

newsletterRoute.post("/subscribe", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as any;
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !/.+@.+\..+/.test(email)) throw Errors.badRequest("valid email required");
  const name = body.name ? String(body.name) : null;

  const unsubToken = crypto.randomUUID();
  const [row] = await db
    .insert(schema.newsletterSubscribers)
    .values({ email, name, unsubscribe_token: unsubToken, is_active: true })
    .onConflictDoUpdate({
      target: schema.newsletterSubscribers.email,
      set: { is_active: true, updated_date: new Date(), name },
    })
    .returning();

  try {
    await brevoUpsertContact({ email, name });
  } catch (err: any) {
    // We still return success — the row is created locally; a nightly
    // reconcile can push to Brevo if it was down.
    // eslint-disable-next-line no-console
    console.warn("[newsletter] brevo upsert failed", err?.message);
  }

  return c.json({ ok: true, id: row.id });
});

async function unsubscribeByToken(token: string | null | undefined) {
  if (!token) throw Errors.badRequest("token required");
  const [row] = await db
    .update(schema.newsletterSubscribers)
    .set({ is_active: false, updated_date: new Date() })
    .where(eq(schema.newsletterSubscribers.unsubscribe_token, token))
    .returning();
  if (!row) throw Errors.notFound("invalid token");
  if (NEWSLETTER_LIST_ID) {
    try {
      await brevoRemoveFromList({ email: row.email, listId: NEWSLETTER_LIST_ID });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn("[newsletter] brevo remove failed", err?.message);
    }
  }
  return row;
}

newsletterRoute.get("/unsubscribe", async (c) => {
  // One-click link from an email client. Returns an HTML confirmation page so
  // the recipient knows it worked, instead of a bare JSON blob.
  const token = new URL(c.req.url).searchParams.get("token");
  await unsubscribeByToken(token);
  return c.html(
    `<!doctype html><meta charset="utf-8"><title>Unsubscribed</title>` +
      `<body style="font-family:system-ui;max-width:520px;margin:5rem auto;padding:0 1rem">` +
      `<h1>You're unsubscribed</h1>` +
      `<p>You will no longer receive the Daily Horizons newsletter.</p>` +
      `<p><a href="/">Return to Daily Horizons</a></p></body>`
  );
});

newsletterRoute.post("/unsubscribe", async (c) => {
  const token = new URL(c.req.url).searchParams.get("token");
  await unsubscribeByToken(token);
  return c.json({ ok: true });
});

export default newsletterRoute;

// ──────────────────────────────────────────────────────────────────────────
// Admin composer / sender
// ──────────────────────────────────────────────────────────────────────────

export const newsletterAdminRoute = new Hono<AppContext>();

newsletterAdminRoute.post("/send", async (c) => {
  const admin = requireAdmin(c);
  const body = (await c.req.json().catch(() => ({}))) as any;
  const subject = String(body.subject ?? "").trim();
  const html = String(body.html ?? "").trim();
  if (!subject || !html) throw Errors.badRequest("subject and html required");
  if (!NEWSLETTER_LIST_ID) throw Errors.badRequest("BREVO_NEWSLETTER_LIST_ID not configured");

  // Brevo's free tier is 300 emails/day; we count active subscribers so we
  // can record it against the send ledger and surface it in the response.
  const [count] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.newsletterSubscribers)
    .where(eq(schema.newsletterSubscribers.is_active, true));
  const recipientCount = count?.count ?? 0;

  const [sendRow] = await db
    .insert(schema.newsletterSends)
    .values({
      subject,
      body_html: html,
      actor_email: admin.email,
      recipient_count: recipientCount,
      status: "queued",
    })
    .returning();

  try {
    const { campaignId } = await brevoSendCampaign({
      subject,
      htmlContent: html,
      listIds: [NEWSLETTER_LIST_ID],
    });
    await db
      .update(schema.newsletterSends)
      .set({ brevo_campaign_id: String(campaignId), status: "sent" })
      .where(eq(schema.newsletterSends.id, sendRow.id));
    return c.json({ ok: true, campaignId, recipientCount });
  } catch (err: any) {
    await db
      .update(schema.newsletterSends)
      .set({ status: "failed", error: String(err?.message ?? err) })
      .where(eq(schema.newsletterSends.id, sendRow.id));
    throw err;
  }
});
