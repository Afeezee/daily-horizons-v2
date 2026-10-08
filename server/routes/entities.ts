import { and, desc, asc, eq, SQL, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AppContext } from "../auth";
import { db, getPoolDb, schema } from "../db";
import { Errors } from "../errors";
import {
  EntityName,
  EntityTable,
  ServerOwnedFields,
  policyFor,
} from "../policies";

const entitiesRoute = new Hono<AppContext>();

const ENTITY_NAMES: EntityName[] = [
  "Article",
  "Comment",
  "ArticleLike",
  "SavedArticle",
  "DigestPreference",
  "PublisherProfile",
  "NewsletterSubscriber",
  "User",
];

function resolve(entity: string): EntityName {
  if (!ENTITY_NAMES.includes(entity as EntityName)) {
    throw Errors.notFound(`Unknown entity: ${entity}`);
  }
  return entity as EntityName;
}

/**
 * Parse Base44-style query params:
 *   ?sort=-created_date&limit=200&field=value
 * The - prefix on sort means descending.
 */
function parseList(url: URL) {
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
  const sortRaw = url.searchParams.get("sort") ?? "-created_date";
  const direction: "asc" | "desc" = sortRaw.startsWith("-") ? "desc" : "asc";
  const sortCol = sortRaw.replace(/^-/, "");

  const filters: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) {
    if (["sort", "limit", "offset"].includes(k)) continue;
    filters[k] = v;
  }
  return { limit, offset, sortCol, direction, filters };
}

function stripServerFields(entity: EntityName, body: Record<string, any>) {
  const banned = ServerOwnedFields[entity];
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(body)) {
    if (banned.has(k)) continue;
    clean[k] = v;
  }
  return clean;
}

// ──────────────────────────────────────────────────────────────────────────
// LIST
// ──────────────────────────────────────────────────────────────────────────
entitiesRoute.get("/:entity", async (c) => {
  const entity = resolve(c.req.param("entity"));
  const decision = policyFor(entity, "list", c.var.user);
  if (!decision.allow) throw Errors.forbidden(decision.reason);

  const table = EntityTable[entity] as any;
  const url = new URL(c.req.url);
  const { limit, offset, sortCol, direction, filters } = parseList(url);

  const where: SQL[] = [];
  if (decision.scope === "own" && c.var.user) {
    where.push(eq(table.created_by, c.var.user.email));
  }
  for (const [k, v] of Object.entries(filters)) {
    if (table[k] === undefined) continue;
    where.push(eq(table[k], v));
  }

  // Article listings never leak drafts to non-owners — the frontend uses
  // status=published for Home/Category/Search, but defence in depth.
  if (entity === "Article" && !c.var.user) {
    where.push(eq(table.status, "published"));
  }

  const sortColumn = table[sortCol] ?? table.created_date;
  const orderBy = direction === "desc" ? desc(sortColumn) : asc(sortColumn);

  const rows = await db
    .select()
    .from(table)
    .where(where.length ? and(...where) : undefined)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);
  return c.json(rows);
});

// ──────────────────────────────────────────────────────────────────────────
// GET ONE
// ──────────────────────────────────────────────────────────────────────────
entitiesRoute.get("/:entity/:id", async (c) => {
  const entity = resolve(c.req.param("entity"));
  const id = c.req.param("id");
  const table = EntityTable[entity] as any;

  const [row] = await db.select().from(table).where(eq(table.id, id)).limit(1);
  if (!row) throw Errors.notFound();

  const decision = policyFor(entity, "read", c.var.user, row as any);
  if (!decision.allow) throw Errors.forbidden(decision.reason);
  return c.json(row);
});

// ──────────────────────────────────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────────────────────────────────
entitiesRoute.post("/:entity", async (c) => {
  const entity = resolve(c.req.param("entity"));
  const decision = policyFor(entity, "create", c.var.user);
  if (!decision.allow) throw Errors.forbidden(decision.reason);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, any>;
  const clean = stripServerFields(entity, body);

  // Attach ownership for the entities whose create path lives here.
  if (c.var.user) {
    clean.created_by = c.var.user.email;
  }

  // Article create via this generic route is only allowed for drafts.
  // Publication goes through POST /api/submissions/article.
  if (entity === "Article") {
    clean.status = "draft";
    if (c.var.user) clean.author_name = c.var.user.display_name ?? clean.author_name;
  }
  // Comments go through POST /api/articles/:id/comments to keep the counter
  // atomic, but allow the generic path as a fallback.

  if (entity === "NewsletterSubscriber") {
    const email = String(clean.email ?? "").trim().toLowerCase();
    if (!email) throw Errors.badRequest("email required");
    clean.email = email;
    clean.unsubscribe_token = crypto.randomUUID();
  }

  const table = EntityTable[entity] as any;
  try {
    // Comments are the one entity whose generic create path still needs
    // the article's comments_count kept in sync. Do both in one transaction
    // so a frontend that creates a Comment the ordinary way (bypassing the
    // atomic /articles/:id/comments endpoint) still gets a correct count.
    if (entity === "Comment" && clean.article_id) {
      const result = await getPoolDb().transaction(async (tx) => {
        const rows = await tx.insert(schema.comments).values(clean as any).returning();
        const inserted = rows[0];
        await tx
          .update(schema.articles)
          .set({ comments_count: sql`${schema.articles.comments_count} + 1` })
          .where(eq(schema.articles.id, clean.article_id));
        return inserted;
      });
      return c.json(result, 201);
    }
    const rows = await db.insert(table).values(clean).returning();
    return c.json((rows as any[])[0], 201);
  } catch (err: any) {
    if (String(err?.message ?? "").includes("duplicate")) {
      throw Errors.conflict("Already exists");
    }
    throw err;
  }
});

// ──────────────────────────────────────────────────────────────────────────
// UPDATE
// ──────────────────────────────────────────────────────────────────────────
entitiesRoute.patch("/:entity/:id", async (c) => {
  const entity = resolve(c.req.param("entity"));
  const id = c.req.param("id");
  const table = EntityTable[entity] as any;

  const [existing] = await db.select().from(table).where(eq(table.id, id)).limit(1);
  if (!existing) throw Errors.notFound();

  const decision = policyFor(entity, "update", c.var.user, existing as any);
  if (!decision.allow) throw Errors.forbidden(decision.reason);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, any>;
  let clean = stripServerFields(entity, body);

  // The User entity has a split: an admin can touch role / limit_exempt /
  // is_banned; the self update can only touch display_name / bio / preferences.
  if (entity === "User") {
    if (c.var.user?.role === "admin") {
      clean = {
        ...clean,
        role: body.role,
        daily_post_limit_exempt: body.daily_post_limit_exempt,
        is_banned: body.is_banned,
      };
    }
  }

  clean.updated_date = new Date();
  const [row] = await db.update(table).set(clean).where(eq(table.id, id)).returning();
  return c.json(row);
});

// ──────────────────────────────────────────────────────────────────────────
// DELETE
// ──────────────────────────────────────────────────────────────────────────
entitiesRoute.delete("/:entity/:id", async (c) => {
  const entity = resolve(c.req.param("entity"));
  const id = c.req.param("id");
  const table = EntityTable[entity] as any;

  const [existing] = await db.select().from(table).where(eq(table.id, id)).limit(1);
  if (!existing) throw Errors.notFound();

  const decision = policyFor(entity, "delete", c.var.user, existing as any);
  if (!decision.allow) throw Errors.forbidden(decision.reason);

  await db.delete(table).where(eq(table.id, id));
  return c.json({ ok: true });
});

export default entitiesRoute;
