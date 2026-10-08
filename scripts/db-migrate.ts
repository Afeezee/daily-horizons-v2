/**
 * Apply pending Drizzle migrations against DATABASE_URL_UNPOOLED.
 */
import "dotenv/config";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL_UNPOOLED (or DATABASE_URL)");
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
const db = drizzle(pool);

migrate(db, { migrationsFolder: "./drizzle" })
  .then(() => {
    console.log("[db] migrations applied");
    return pool.end();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
