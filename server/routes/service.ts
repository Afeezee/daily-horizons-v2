import { Hono } from "hono";
import type { AppContext } from "../auth";
import { env } from "../env";
import { Errors } from "../errors";
import { submitArticle } from "../moderation/pipeline";

const serviceRoute = new Hono<AppContext>();

/**
 * External-agent-compatible endpoint for anything running outside the repo
 * (section 7.3). Bearer-token authenticated with AGENT_SERVICE_KEY. Rate-
 * limiting / logging is inherited from the regular submission pipeline.
 */
serviceRoute.post("/articles", async (c) => {
  const E = env();
  if (!E.AGENT_SERVICE_KEY) throw Errors.unavailable("service key not configured");
  const auth = c.req.header("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  if (bearer !== E.AGENT_SERVICE_KEY) throw Errors.unauthorized();

  const body = (await c.req.json()) as any;
  const result = await submitArticle(body, {
    authorEmail: E.AGENT_AUTHOR_EMAIL,
    authorDisplayName: E.AGENT_AUTHOR_DISPLAY_NAME,
    isAgentAuthored: true,
    discoveryQuery: body.discoveryQuery,
    forceReview: !!body.forceReview,
  });
  return c.json(result, 201);
});

export default serviceRoute;
