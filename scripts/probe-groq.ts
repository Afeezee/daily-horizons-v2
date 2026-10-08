/**
 * Measures the Groq backend's current behaviour against our two heaviest
 * prompts (moderation + agent write). Writes a summary to stdout — paste
 * into MIGRATION_REPORT.md.
 */
import Groq from "groq-sdk";

const MODEL = process.env.AI_MODEL ?? "qwen/qwen3.8-27b";
const KEY = process.env.GROQ_API_KEY;
if (!KEY) {
  console.error("Set GROQ_API_KEY");
  process.exit(1);
}

const client = new Groq({ apiKey: KEY });

async function one(label: string, system: string, user: string) {
  const t0 = Date.now();
  const r = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 2000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const ms = Date.now() - t0;
  const usage = r.usage;
  const content = r.choices[0]?.message?.content ?? "";
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { parseError: true, raw: content.slice(0, 200) };
  }
  console.log(
    `\n[${label}] ${ms}ms  in=${usage?.prompt_tokens} out=${usage?.completion_tokens}`
  );
  console.log(JSON.stringify(parsed, null, 2).slice(0, 400));
}

async function run() {
  await one(
    "moderation",
    "You are the publishing moderator for a British-English news site. Return JSON only.",
    'Review this submission.\nTitle: <user_input>Lagos floods: five dead as rains return</user_input>\nBody: <user_input>Flooding across Lagos State killed at least five people this week...</user_input>\nReturn JSON: { "verdict": "approved"|"rejected"|"flagged_for_review", "reason": string, "concerns": string[] }'
  );

  await one(
    "agent_write",
    "You are a British-English news writer. Return JSON matching the schema.",
    'Discovery query: Nigeria economy\n<search_results>\n[1] Premium Times — https://example.com\nInflation falls to 29% in October, central bank says...\n</search_results>\nReturn JSON: { "title": string, "subtitle": string, "summary": string, "body": string, "category": string, "tags": string[], "cited_urls": string[] }'
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
