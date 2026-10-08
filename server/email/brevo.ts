import { env } from "../env";
import { Errors } from "../errors";

const BREVO_BASE = "https://api.brevo.com/v3";

function headers() {
  const E = env();
  if (!E.BREVO_API_KEY) throw Errors.unavailable("Brevo not configured");
  return {
    "api-key": E.BREVO_API_KEY,
    "Content-Type": "application/json",
    accept: "application/json",
  };
}

export const NEWSLETTER_LIST_ID = Number(process.env.BREVO_NEWSLETTER_LIST_ID ?? "0") || null;

export async function brevoUpsertContact(opts: {
  email: string;
  name?: string | null;
  listIds?: number[];
}) {
  const r = await fetch(`${BREVO_BASE}/contacts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      email: opts.email,
      attributes: opts.name ? { FIRSTNAME: opts.name } : undefined,
      listIds: opts.listIds ?? (NEWSLETTER_LIST_ID ? [NEWSLETTER_LIST_ID] : []),
      updateEnabled: true,
    }),
  });
  if (r.status === 400) {
    // Contact already exists is fine — surface others.
    const body = await r.text();
    if (!/already associated/.test(body)) throw new Error(`brevo upsert ${r.status}: ${body}`);
  } else if (!r.ok) {
    throw new Error(`brevo upsert ${r.status}`);
  }
}

export async function brevoRemoveFromList(opts: { email: string; listId: number }) {
  const r = await fetch(`${BREVO_BASE}/contacts/lists/${opts.listId}/contacts/remove`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ emails: [opts.email] }),
  });
  if (!r.ok && r.status !== 400) throw new Error(`brevo remove ${r.status}`);
}

export async function brevoSendCampaign(opts: {
  subject: string;
  htmlContent: string;
  listIds: number[];
  senderName?: string;
  senderEmail?: string;
}): Promise<{ campaignId: number }> {
  const create = await fetch(`${BREVO_BASE}/emailCampaigns`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: `DH newsletter ${new Date().toISOString()}`,
      subject: opts.subject,
      htmlContent: opts.htmlContent,
      recipients: { listIds: opts.listIds },
      sender: {
        name: opts.senderName ?? "Daily Horizons",
        email: opts.senderEmail ?? "newsletter@dailyhorizons.app",
      },
    }),
  });
  if (!create.ok) throw new Error(`brevo campaign create ${create.status}`);
  const json = (await create.json()) as { id: number };

  const send = await fetch(`${BREVO_BASE}/emailCampaigns/${json.id}/sendNow`, {
    method: "POST",
    headers: headers(),
  });
  if (!send.ok) throw new Error(`brevo send ${send.status}`);
  return { campaignId: json.id };
}
