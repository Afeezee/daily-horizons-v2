import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { env } from "../env";
import { Errors } from "../errors";

type Bucket = "minute" | "day";

function windowStart(bucket: Bucket, now = new Date()): Date {
  const ms = bucket === "minute" ? 60_000 : 86_400_000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

/**
 * Pre-flight: deny when the current minute or day bucket is already at or
 * above its ceiling. We do NOT reserve tokens up front — the recorded cost
 * uses actual usage (recorded after the Groq response). The content agent
 * uses `budgetRemaining` to decide if it should even start a run.
 */
export async function budgetGate() {
  const E = env();
  const now = new Date();
  const minuteStart = windowStart("minute", now);
  const dayStart = windowStart("day", now);

  const minute = await bucketRow("minute", minuteStart);
  if (minute.requests >= E.GROQ_RPM_CEILING) throw Errors.rateLimited("Groq RPM reached");
  if (minute.tokens_in + minute.tokens_out >= E.GROQ_TPM_CEILING)
    throw Errors.rateLimited("Groq TPM reached");

  const day = await bucketRow("day", dayStart);
  if (day.tokens_in + day.tokens_out >= E.GROQ_TPD_CEILING)
    throw Errors.rateLimited("Groq TPD reached");
}

export async function budgetRemaining(): Promise<{ dayTokensLeft: number }> {
  const E = env();
  const day = await bucketRow("day", windowStart("day"));
  return { dayTokensLeft: Math.max(E.GROQ_TPD_CEILING - (day.tokens_in + day.tokens_out), 0) };
}

export async function recordUsage(opts: { tokensIn: number; tokensOut: number }) {
  const now = new Date();
  for (const bucket of ["minute", "day"] as const) {
    const start = windowStart(bucket, now);
    await db
      .insert(schema.llmUsage)
      .values({
        bucket,
        window_start: start,
        requests: 1,
        tokens_in: opts.tokensIn,
        tokens_out: opts.tokensOut,
      })
      .onConflictDoUpdate({
        target: [schema.llmUsage.bucket, schema.llmUsage.window_start],
        set: {
          requests: sql`${schema.llmUsage.requests} + 1`,
          tokens_in: sql`${schema.llmUsage.tokens_in} + ${opts.tokensIn}`,
          tokens_out: sql`${schema.llmUsage.tokens_out} + ${opts.tokensOut}`,
        },
      });
  }
}

async function bucketRow(bucket: Bucket, start: Date) {
  const [row] = await db
    .select()
    .from(schema.llmUsage)
    .where(and(eq(schema.llmUsage.bucket, bucket), eq(schema.llmUsage.window_start, start)))
    .limit(1);
  return row ?? { requests: 0, tokens_in: 0, tokens_out: 0 };
}

export async function recordSearchUsage(provider: string) {
  const now = new Date();
  for (const bucket of ["minute", "day"] as const) {
    const start = windowStart(bucket, now);
    await db
      .insert(schema.searchUsage)
      .values({ provider, bucket, window_start: start, requests: 1 })
      .onConflictDoUpdate({
        target: [
          schema.searchUsage.provider,
          schema.searchUsage.bucket,
          schema.searchUsage.window_start,
        ],
        set: { requests: sql`${schema.searchUsage.requests} + 1` },
      });
  }
}

export async function searchDailyCount(provider?: string) {
  const start = windowStart("day");
  const conds = [eq(schema.searchUsage.bucket, "day"), gte(schema.searchUsage.window_start, start)];
  if (provider) conds.push(eq(schema.searchUsage.provider, provider));
  const rows = await db
    .select({ requests: schema.searchUsage.requests })
    .from(schema.searchUsage)
    .where(and(...conds));
  return rows.reduce((a, r) => a + r.requests, 0);
}

export async function recordNewsDiscoveryUsage() {
  const now = new Date();
  for (const bucket of ["minute", "day"] as const) {
    const start = windowStart(bucket, now);
    await db
      .insert(schema.newsDiscoveryUsage)
      .values({ bucket, window_start: start, requests: 1 })
      .onConflictDoUpdate({
        target: [schema.newsDiscoveryUsage.bucket, schema.newsDiscoveryUsage.window_start],
        set: { requests: sql`${schema.newsDiscoveryUsage.requests} + 1` },
      });
  }
}

export async function newsDiscoveryDailyCount() {
  const start = windowStart("day");
  const [row] = await db
    .select({ requests: schema.newsDiscoveryUsage.requests })
    .from(schema.newsDiscoveryUsage)
    .where(
      and(
        eq(schema.newsDiscoveryUsage.bucket, "day"),
        eq(schema.newsDiscoveryUsage.window_start, start)
      )
    );
  return row?.requests ?? 0;
}

export async function recordImageUsage(provider: string) {
  const now = new Date();
  const start = windowStart("day", now);
  await db
    .insert(schema.imageUsage)
    .values({ provider, bucket: "day", window_start: start, requests: 1 })
    .onConflictDoUpdate({
      target: [schema.imageUsage.provider, schema.imageUsage.bucket, schema.imageUsage.window_start],
      set: { requests: sql`${schema.imageUsage.requests} + 1` },
    });
}
