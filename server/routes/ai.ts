import { Hono } from "hono";
import { requireUser, type AppContext } from "../auth";
import { Errors } from "../errors";
import { rateLimit } from "../utils/rate-limit";
import {
  augmentDraft,
  assistant,
  factCheckArticle,
  regenerateFromFactCheck,
} from "../ai/prompts";
import { legacyInvoke } from "../ai/invoke-legacy";
import { generateImage } from "../images/generate";

const aiRoute = new Hono<AppContext>();

aiRoute.post("/factcheck", async (c) => {
  const u = requireUser(c);
  await rateLimit({ key: `ai:fc:${u.email}`, limit: 10, windowSec: 3600 });
  const body = (await c.req.json().catch(() => ({}))) as any;
  if (!body?.title || !body?.body) throw Errors.badRequest("title and body required");
  const result = await factCheckArticle({ title: body.title, body: body.body });
  return c.json(result.data);
});

aiRoute.post("/factcheck-correction", async (c) => {
  const u = requireUser(c);
  await rateLimit({ key: `ai:fcc:${u.email}`, limit: 10, windowSec: 3600 });
  const body = (await c.req.json().catch(() => ({}))) as any;
  if (!body?.body || !body?.factCheck) throw Errors.badRequest("body and factCheck required");
  const result = await regenerateFromFactCheck({
    originalBody: body.body,
    factCheck: body.factCheck,
  });
  return c.json(result.data);
});

aiRoute.post("/augment", async (c) => {
  const u = requireUser(c);
  await rateLimit({ key: `ai:aug:${u.email}`, limit: 10, windowSec: 3600 });
  const body = (await c.req.json().catch(() => ({}))) as any;
  if (!body?.title || !body?.body) throw Errors.badRequest("title and body required");
  const result = await augmentDraft({
    title: body.title,
    body: body.body,
    category: body.category ?? "News",
  });
  return c.json(result.data);
});

aiRoute.post("/generate-image", async (c) => {
  const u = requireUser(c);
  await rateLimit({ key: `ai:img:${u.email}`, limit: 10, windowSec: 3600 });
  const body = (await c.req.json().catch(() => ({}))) as any;
  if (!body?.prompt) throw Errors.badRequest("prompt required");
  const result = await generateImage({
    prompt: String(body.prompt),
    category: body.category ?? "News",
  });
  return c.json(result);
});

aiRoute.post("/assistant", async (c) => {
  const u = requireUser(c);
  await rateLimit({ key: `ai:ast:${u.email}`, limit: 30, windowSec: 3600 });
  const body = (await c.req.json().catch(() => ({}))) as any;
  const history = Array.isArray(body?.messages) ? body.messages : [];
  const result = await assistant(history);
  return c.json(result);
});

// Base44-shaped compatibility entry — the frontend's existing fact-check,
// correction and augment call sites use this. Rate-limited per-user.
aiRoute.post("/invoke", async (c) => {
  const u = requireUser(c);
  await rateLimit({ key: `ai:inv:${u.email}`, limit: 20, windowSec: 3600 });
  const body = (await c.req.json().catch(() => ({}))) as any;
  const result = await legacyInvoke(body);
  return c.json(result);
});

export default aiRoute;
