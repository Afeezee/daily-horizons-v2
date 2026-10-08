import { put } from "@vercel/blob";
import { Hono } from "hono";
import { requireUser, type AppContext } from "../auth";
import { env } from "../env";
import { Errors } from "../errors";

const uploadRoute = new Hono<AppContext>();

/**
 * Replaces Base44 UploadFile. Accepts multipart/form-data with a `file`
 * field. Rejects anything that isn't an image or PDF — the two kinds the
 * frontend actually uploads (lead images, publisher avatars).
 */
uploadRoute.post("/", async (c) => {
  const user = requireUser(c);
  const E = env();
  if (!E.BLOB_READ_WRITE_TOKEN) throw Errors.unavailable("Vercel Blob not configured");

  const form = await c.req.parseBody();
  const file = form["file"];
  if (!(file instanceof File)) throw Errors.badRequest("file required");

  const type = file.type || "";
  if (!type.startsWith("image/") && type !== "application/pdf") {
    throw Errors.badRequest("only images and PDFs are accepted");
  }
  if (file.size > 10 * 1024 * 1024) throw Errors.badRequest("file too large (10MB max)");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `uploads/${user.id}/${crypto.randomUUID()}-${safeName}`;
  const blob = await put(key, file, {
    access: "public",
    token: E.BLOB_READ_WRITE_TOKEN,
    contentType: type,
  });
  return c.json({ file_url: blob.url, pathname: blob.pathname });
});

export default uploadRoute;
