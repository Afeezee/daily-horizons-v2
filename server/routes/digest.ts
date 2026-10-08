import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireUser, type AppContext } from "../auth";
import { db, schema } from "../db";
import { Errors } from "../errors";
import { sendDigestForUser } from "../email/digest";

const digestRoute = new Hono<AppContext>();

/**
 * Send-me-a-copy-now path — hits the same renderer and ledger as the cron.
 */
digestRoute.post("/send-now", async (c) => {
  const u = requireUser(c);
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, u.id)).limit(1);
  const [pref] = await db
    .select()
    .from(schema.digestPreferences)
    .where(eq(schema.digestPreferences.created_by, u.email))
    .limit(1);
  if (!pref) throw Errors.badRequest("no digest preferences set");
  const res = await sendDigestForUser({ user, pref, onDemand: true });
  return c.json(res);
});

export default digestRoute;
