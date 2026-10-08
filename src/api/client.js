/**
 * Compatibility client. Exposes the same surface the frontend already
 * imports from `@/api/base44Client` (`base44.entities.*`, `base44.auth.*`,
 * `base44.integrations.*`), backed by fetch('/api/…'), with or without a
 * Clerk token.
 *
 * The call-site diff from Base44 is intentionally zero: `src/api/base44Client.js`
 * re-exports this file's `base44` under the old name so existing imports keep
 * working while we migrate pages one at a time.
 */

const API = "/api";

// Clerk's getToken() is installed by main.jsx once ClerkProvider is mounted.
let _getToken = async () => null;
export function installTokenProvider(fn) {
  _getToken = fn;
}

// Login redirect — Clerk's hosted sign-in page.
let _loginRedirect = (returnTo = "/") => {
  window.location.href = `/sign-in?redirect_url=${encodeURIComponent(returnTo)}`;
};
export function installLoginRedirect(fn) {
  _loginRedirect = fn;
}

let _logout = async () => {
  // Clerk's signOut is installed from main.jsx.
};
export function installLogout(fn) {
  _logout = fn;
}

async function authHeaders() {
  const h = { "Content-Type": "application/json" };
  const token = await _getToken().catch(() => null);
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function request(method, path, body) {
  const headers = await authHeaders();
  const init = { method, headers };
  if (body !== undefined && !(body instanceof FormData)) {
    init.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    delete headers["Content-Type"];
    init.body = body;
  }
  const r = await fetch(`${API}${path}`, init);
  if (!r.ok) {
    let err;
    try {
      err = await r.json();
    } catch {
      err = { error: "http_error", message: r.statusText };
    }
    const e = new Error(err.message ?? "Request failed");
    e.code = err.error;
    e.status = r.status;
    throw e;
  }
  if (r.status === 204) return null;
  const ct = r.headers.get("content-type") ?? "";
  return ct.includes("application/json") ? r.json() : r.text();
}

// ──────────────────────────────────────────────────────────────────────────
// Entities — matches Base44's entity SDK shape (.list, .filter, .get, …)
// ──────────────────────────────────────────────────────────────────────────

function makeEntity(name) {
  const base = `/entities/${name}`;
  const toQuery = (filter, sort, limit, offset) => {
    const params = new URLSearchParams();
    if (sort) params.set("sort", sort);
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));
    for (const [k, v] of Object.entries(filter ?? {})) {
      if (v === undefined || v === null) continue;
      params.set(k, String(v));
    }
    const q = params.toString();
    return q ? `?${q}` : "";
  };

  return {
    list: (sort, limit) => request("GET", `${base}${toQuery(null, sort, limit)}`),
    filter: (where, sort, limit) => request("GET", `${base}${toQuery(where, sort, limit)}`),
    get: (id) => request("GET", `${base}/${id}`),
    create: (data) => request("POST", base, data),
    update: (id, data) => request("PATCH", `${base}/${id}`, data),
    delete: (id) => request("DELETE", `${base}/${id}`),
  };
}

const entities = {
  Article: makeEntity("Article"),
  Comment: makeEntity("Comment"),
  ArticleLike: makeEntity("ArticleLike"),
  SavedArticle: makeEntity("SavedArticle"),
  DigestPreference: makeEntity("DigestPreference"),
  PublisherProfile: makeEntity("PublisherProfile"),
  NewsletterSubscriber: makeEntity("NewsletterSubscriber"),
  User: makeEntity("User"),
};

// ──────────────────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────────────────

const auth = {
  me: () => request("GET", "/auth/me"),
  updateMe: (patch) => request("PATCH", "/auth/me", patch),
  redirectToLogin: (returnTo) => _loginRedirect(returnTo ?? window.location.pathname),
  logout: async (returnTo) => {
    await _logout();
    if (returnTo) window.location.href = returnTo;
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Integrations — moved server-side; frontend keeps the same call signatures.
// ──────────────────────────────────────────────────────────────────────────

const Core = {
  // Preserves Base44's InvokeLLM signature. Pre-existing fact-check, fact-
  // check-correction and augment call sites keep working unchanged — the
  // server-side `/api/ai/invoke` adapter honours their own prompts and
  // schemas, with web-grounded search when `add_context_from_internet` is
  // set (section 6.4). Moderation now lives inside POST /submissions/article
  // and the server-side adapter refuses this shape with a clear message.
  InvokeLLM: async (opts) => request("POST", "/ai/invoke", opts),
  UploadFile: async ({ file }) => {
    const fd = new FormData();
    fd.append("file", file);
    return request("POST", "/upload", fd);
  },
  GenerateImage: async (opts) =>
    request("POST", "/ai/generate-image", {
      prompt: opts.prompt,
      category: opts.category ?? "News",
    }),
  SendEmail: async (opts) => {
    // Only the "send me a copy now" digest path remains; everything else is
    // handled server-side via cron and admin paths.
    if (opts.purpose === "digest_now") {
      return request("POST", "/digest/send-now", {});
    }
    throw new Error("SendEmail no longer accepts arbitrary mail from the client");
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Submissions, counters, agent, newsletter, admin — new surfaces
// ──────────────────────────────────────────────────────────────────────────

const articles = {
  submit: (body) => request("POST", "/submissions/article", body),
  view: (id) => request("POST", `/articles/${id}/view`, {}),
  like: (id, reaction_type) => request("POST", `/articles/${id}/like`, { reaction_type }),
  unlike: (id) => request("DELETE", `/articles/${id}/like`),
  comment: (id, content, parent_comment_id) =>
    request("POST", `/articles/${id}/comments`, { content, parent_comment_id }),
};

const newsletter = {
  subscribe: (email, name) => request("POST", "/newsletter/subscribe", { email, name }),
  unsubscribe: (token) => request("POST", `/newsletter/unsubscribe?token=${encodeURIComponent(token)}`, {}),
};

const admin = {
  analytics: {
    overview: () => request("GET", "/admin/analytics/overview"),
    top: () => request("GET", "/admin/analytics/top"),
    categories: () => request("GET", "/admin/analytics/categories"),
    authorship: () => request("GET", "/admin/analytics/authorship"),
    digest: () => request("GET", "/admin/analytics/digest"),
    newsletter: () => request("GET", "/admin/analytics/newsletter"),
    budget: () => request("GET", "/admin/analytics/budget"),
  },
  moderation: {
    events: () => request("GET", "/admin/moderation/events"),
    approve: (id) => request("POST", `/admin/moderation/articles/${id}/approve`, {}),
    unpublish: (id) => request("POST", `/admin/moderation/articles/${id}/unpublish`, {}),
  },
  users: {
    list: (q) => request("GET", `/admin/users?q=${encodeURIComponent(q ?? "")}`),
    update: (id, patch) => request("PATCH", `/admin/users/${id}`, patch),
  },
  newsletter: {
    subscribers: (q) => request("GET", `/admin/newsletter/subscribers?q=${encodeURIComponent(q ?? "")}`),
    send: (payload) => request("POST", "/admin/newsletter/send", payload),
  },
  agent: {
    runs: () => request("GET", "/admin/agent/runs"),
    generate: (payload) => request("POST", "/admin/agent/generate", payload),
  },
  settings: {
    list: () => request("GET", "/admin/settings"),
    set: (key, value) => request("PUT", `/admin/settings/${key}`, { value }),
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Export the "base44" shape (compat) and the new surfaces (preferred)
// ──────────────────────────────────────────────────────────────────────────

export const api = { entities, auth, articles, newsletter, admin, integrations: { Core } };

export const base44 = {
  entities,
  auth,
  integrations: { Core },
  // Pre-existing dead export expected by NavigationTracker — no-op.
  appLogs: { logUserInApp: () => Promise.resolve() },
};
