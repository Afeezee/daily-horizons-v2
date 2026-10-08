import { Hono } from "hono";
import { requireUser, type AppContext } from "../auth";
import { submitArticle } from "../moderation/pipeline";

const submissionsRoute = new Hono<AppContext>();

submissionsRoute.post("/article", async (c) => {
  const user = requireUser(c);
  const body = (await c.req.json()) as any;
  const result = await submitArticle(body, user);
  return c.json(result, 201);
});

export default submissionsRoute;
