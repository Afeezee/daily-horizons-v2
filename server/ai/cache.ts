import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";

export function hashKey(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function readAiCache(key: string) {
  const [row] = await db
    .select()
    .from(schema.aiResponseCache)
    .where(eq(schema.aiResponseCache.cache_key, key))
    .limit(1);
  if (!row) return null;
  if (row.expires_at && row.expires_at.getTime() < Date.now()) return null;
  return row;
}

export async function writeAiCache(opts: {
  key: string;
  purpose: string;
  model: string;
  response: unknown;
  tokensIn: number;
  tokensOut: number;
  ttlSec?: number;
}) {
  const expires = opts.ttlSec ? new Date(Date.now() + opts.ttlSec * 1000) : null;
  await db
    .insert(schema.aiResponseCache)
    .values({
      cache_key: opts.key,
      purpose: opts.purpose,
      model: opts.model,
      response: opts.response as any,
      tokens_in: opts.tokensIn,
      tokens_out: opts.tokensOut,
      expires_at: expires,
    })
    .onConflictDoUpdate({
      target: schema.aiResponseCache.cache_key,
      set: {
        response: opts.response as any,
        tokens_in: opts.tokensIn,
        tokens_out: opts.tokensOut,
        expires_at: expires,
      },
    });
}

export async function readSearchCache(key: string) {
  const [row] = await db
    .select()
    .from(schema.searchCache)
    .where(eq(schema.searchCache.cache_key, key))
    .limit(1);
  if (!row) return null;
  if (row.expires_at && row.expires_at.getTime() < Date.now()) return null;
  return row;
}

export async function writeSearchCache(opts: {
  key: string;
  provider: string;
  query: string;
  response: unknown;
  ttlSec?: number;
}) {
  const expires = opts.ttlSec ? new Date(Date.now() + opts.ttlSec * 1000) : null;
  await db
    .insert(schema.searchCache)
    .values({
      cache_key: opts.key,
      provider: opts.provider,
      query: opts.query,
      response: opts.response as any,
      expires_at: expires,
    })
    .onConflictDoUpdate({
      target: schema.searchCache.cache_key,
      set: { response: opts.response as any, expires_at: expires },
    });
}
