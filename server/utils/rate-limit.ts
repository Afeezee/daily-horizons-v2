import { sql } from "drizzle-orm";
import { db, schema } from "../db";
import { Errors } from "../errors";

/**
 * Postgres-backed fixed-window rate limiter. Not race-free down to the
 * millisecond — it's intended as a politeness check, not DDoS protection.
 */
export async function rateLimit(opts: {
  key: string;
  limit: number;
  windowSec: number;
}): Promise<void> {
  const windowStart = new Date(
    Math.floor(Date.now() / 1000 / opts.windowSec) * opts.windowSec * 1000
  );
  const [row] = await db
    .insert(schema.rateLimits)
    .values({ key: opts.key, window_start: windowStart, hits: 1 })
    .onConflictDoUpdate({
      target: [schema.rateLimits.key, schema.rateLimits.window_start],
      set: { hits: sql`${schema.rateLimits.hits} + 1` },
    })
    .returning({ hits: schema.rateLimits.hits });
  if (!row) return;
  if (row.hits > opts.limit) throw Errors.rateLimited();
}

export function clientKey(c: {
  req: { header: (name: string) => string | undefined };
}): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "anonymous"
  );
}
