import type { Context } from "hono";
import { Errors } from "../errors";
import type { AppContext } from "../auth";

/**
 * Reject cross-origin mutations unless the request's Origin header matches
 * the request's own Host (or an explicitly allowed origin). Keeps CSRF off
 * cookie-less, Bearer-token APIs honest.
 */
export function assertSameOrigin(c: Context<AppContext>) {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(c.req.method)) return;

  const origin = c.req.header("origin");
  if (!origin) return; // same-origin, non-browser clients (curl, cron)

  try {
    const o = new URL(origin);
    const host = c.req.header("host") ?? "";
    if (o.host === host) return;

    const allowList = (process.env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowList.includes(o.origin)) return;
  } catch {
    /* fall through */
  }
  throw Errors.forbidden("Cross-origin request not allowed");
}
