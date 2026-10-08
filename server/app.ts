import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { attachUser, type AppContext } from "./auth";
import { ApiError } from "./errors";
import { assertSameOrigin } from "./utils/origin";
import entitiesRoute from "./routes/entities";
import authRoute, { clerkWebhook } from "./routes/auth";
import countersRoute from "./routes/counters";
import aiRoute from "./routes/ai";
import uploadRoute from "./routes/upload";
import submissionsRoute from "./routes/submissions";
import serviceRoute from "./routes/service";
import digestRoute from "./routes/digest";
import newsletterRoute, { newsletterAdminRoute } from "./routes/newsletter";
import cronRoute from "./routes/cron";
import adminRoute from "./routes/admin";

export const app = new Hono<AppContext>().basePath("/api");

app.use("*", cors());
app.use("*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  await next();
});
app.use("*", async (c, next) => {
  assertSameOrigin(c);
  await next();
});
app.use("*", attachUser);

app.route("/auth", authRoute);
app.route("/webhooks/clerk", clerkWebhook);
app.route("/entities", entitiesRoute);
app.route("/articles", countersRoute);
app.route("/ai", aiRoute);
app.route("/upload", uploadRoute);
app.route("/submissions", submissionsRoute);
app.route("/service", serviceRoute);
app.route("/digest", digestRoute);
app.route("/newsletter", newsletterRoute);
app.route("/admin/newsletter", newsletterAdminRoute);
app.route("/cron", cronRoute);
app.route("/admin", adminRoute);

app.get("/health", (c) => c.json({ ok: true }));

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(err.toJSON(), err.status);
  }
  if (err instanceof HTTPException) {
    return c.json({ error: "http_error", message: err.message }, err.status);
  }
  // eslint-disable-next-line no-console
  console.error("[api] unhandled", err);
  return c.json({ error: "internal_error", message: "Server error" }, 500);
});

export default app;
