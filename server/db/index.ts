import { Pool, neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleServerless } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

/**
 * Lazy connection setup. We used to construct the neon() client at module
 * load, but that threw ("Database connection string format for `neon()`
 * should be: postgresql://…") any time this file was imported without
 * DATABASE_URL — notably in Vitest, where the server routes are compiled
 * for policy tests even though no test touches the database.
 */
let _db: NeonHttpDatabase<typeof schema> | null = null;
let _pool: Pool | null = null;

function makeDb(): NeonHttpDatabase<typeof schema> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return drizzleHttp(neon(url), { schema });
}

export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    if (!_db) _db = makeDb();
    return (_db as any)[prop];
  },
});

export function getPool(): Pool {
  if (!_pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _pool = new Pool({ connectionString: url });
  }
  return _pool;
}

export function getPoolDb() {
  return drizzleServerless(getPool(), { schema });
}

export type Db = NeonHttpDatabase<typeof schema>;
export type PoolDb = ReturnType<typeof getPoolDb>;
export { schema };
