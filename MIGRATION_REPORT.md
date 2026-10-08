# Daily Horizons — Base44 → Vercel migration report

Written during the migration from Base44 (`@base44/sdk`) to a Vercel + Neon
+ Clerk + Groq stack. The frontend design and routes are unchanged; the
backend is a Hono router hosted at `api/[...path].ts`.

## Parity matrix

| Capability | Base44 | Replacement | Status |
|---|---|---|---|
| Entity storage | `entities.*` SDK | Drizzle + Neon, generic `/api/entities/:entity` router with per-entity policies | Done |
| RLS | Base44 server-eval | `server/policies.ts` with the same read/create/update/delete semantics (section 2) | Done |
| Auth | `base44.auth.*` | Clerk, token verified on every mutating call; public reads work without a token | Done |
| `InvokeLLM` (5 sites) | Base44 → OpenAI | `server/ai/groq.ts` with the Qwen model, per-prompt wrappers (`moderateArticle`, `factCheckArticle`, `regenerateFromFactCheck`, `augmentDraft`, `assistant`) | Done |
| `InvokeLLM` + `add_context_from_internet` | Base44 | Groq call + `webSearch` (Serper, Tavily fallback) — see §6.4 | Done |
| `UploadFile` | Base44 | Vercel Blob (`/api/upload`) | Done |
| `GenerateImage` | Base44 | Pollinations.ai (`/api/ai/generate-image`) with the "no real-person likeness" guard | Done |
| `SendEmail` (digest only) | Base44 | Resend, both the on-demand "send me now" (`/api/digest/send-now`) and the real cron (`/api/cron/daily-digest`) | Done |
| Newsletter sender | **Nothing ever sent** | Brevo (free: 300/day, campaign UI) via `/api/newsletter/subscribe`, token-signed `/api/newsletter/unsubscribe`, `/api/admin/newsletter/send` | Done |
| Scheduled daily digest | **Not automated — UI admitted it** | Vercel Cron hits `/api/cron/daily-digest` hourly; preference window matching ported to the server; every send recorded in `digest_sends` | Done |
| Content-discovery AI agent | External — writes `created_by: "anonymous"` | `server/agent/{discover,write,run}.ts`, cron + `/api/service/articles` + admin "Generate now" (`/api/admin/agent/generate`) sharing one function | Done |
| Image pipeline | Generic / irrelevant stock | `server/images/{keywords,stock,generate,pipeline}.ts`: keyword-extract → Unsplash → Pexels → Pixabay → Pollinations → category default | Done |
| Admin dashboard | **Did not exist** | `src/pages/AdminDashboard.jsx` (analytics / moderation / users / newsletter / agent / settings) + `/api/admin/*` | Done |
| Legacy import | — | `scripts/import-legacy-data.ts` (idempotent, dry-run) | Scaffolded; needs `migration-data/*.json` |
| Re-imaging | — | `scripts/reimage-articles.ts` (`--dry-run`, `--only-generic`, `--limit=N`) | Scaffolded |
| Media rehosting | — | `scripts/rehost-media.ts` | Scaffolded |
| Hosting | Base44 sandbox | Vercel (SPA + `api/[...path].ts`) | Done |

## Defect fixes

| # | Defect | Status | Where |
|---|---|---|---|
| F1 | Client-side publish gate bypassable | **Fixed** — the generic entity route forbids setting `status`; publish only via `POST /api/submissions/article`, which runs AI moderation server-side and transitions `pending_moderation → published/pending_review/rejected` based on verdict + the `REQUIRE_ADMIN_APPROVAL` flag. | `server/moderation/pipeline.ts`, `server/routes/entities.ts` (`ServerOwnedFields`) |
| F2 | No admin surface | **Fixed** — `/admindashboard` page + full `/api/admin/*` surface | `src/pages/AdminDashboard.jsx`, `server/routes/admin.ts` |
| F3 | View/like/comment counters broken (depended on article-owner RLS) | **Fixed** — three atomic SQL endpoints: `POST /articles/:id/view` (rate-limited per IP+article), `POST`/`DELETE /articles/:id/like` (unique on `article_id + created_by`, SQL `+1 / GREATEST(-1,0)`), `POST /articles/:id/comments` (comment + count in one transaction). Independent of article RLS. | `server/routes/counters.ts` |
| F4 | NewsletterSubscriber had no RLS → open list | **Fixed** — explicit policy: create public, read/update/delete admin-only. Unsubscribe uses a signed token, not the generic route. | `server/policies.ts`, `server/routes/newsletter.ts` |
| F5 | Spoofable `author_name` | **Fixed** — the submission pipeline forces `author_name` to the caller's `display_name` (and the agent's configured display name for its own byline). | `server/moderation/pipeline.ts` |
| F6 | Account deletion left Comments orphaned | **Fixed** — `comments.article_id` cascades on article delete; a dedicated "anonymise user" admin action is a follow-up. | `server/db/schema.ts` |
| F7 | Client-side 5/day limit | **Fixed** — re-checked server-side inside the submission pipeline; `daily_post_limit_exempt` bypasses it; the agent is checked separately via its own ceilings. | `server/moderation/pipeline.ts` |
| F8 | Dead dependencies (`three`, `lodash`, `moment`, `react-leaflet`, `@hello-pangea/dnd`) | **Dropped** in `package.json` | `package.json` |

## Judgement calls

- **Auto-publish stays the default (`REQUIRE_ADMIN_APPROVAL=false`).** This is the product's actual designed behaviour; the dashboard's moderation tab (section 10) is the safety net that didn't exist before. The flag flips cleanly without a rebuild via `platform_settings`.
- **Agent writes original articles, not verbatim scrapes.** Serper's `/news` and the web-search results are treated as factual input only; the model synthesises in Daily Horizons' own voice and server-side source verification drops any claimed URL not actually in the supplied `<search_results>` block (same mechanism as the fact-checker). This is defensible without per-outlet licensing deals; raw syndication would be a separate commercial conversation. See `server/agent/write.ts`.
- **Nigeria/Africa coverage** uses dedicated Serper queries with `gl=ng` and location="Nigeria" alongside the global ones. The RSS-fallback pass against major Nigerian outlets is intentionally not wired yet — we need to run the Serper-only path first and see which stories actually land before adding a second discovery pass. The structure is there (`discoverStories` is a pure composition over the search providers); plumb an RSS source into the same shape when needed.
- **Admin "Generate now" and the cron share one function** (`runAgent` in `server/agent/run.ts`) — admin-triggered runs are tagged `triggered_by: "admin"` with the admin's `actor_user_id` and still count against `AGENT_RUNS_PER_DAY` / the Groq and Serper daily ceilings.
- **Image pipeline** uses Unsplash first for its wider catalogue (the brief's primary rationale), then Pexels (higher ceiling), then Pixabay; Unsplash's download-location ping is wired in (required by their API terms). AI generation is gated by `looksLikeRealPersonFocus` to protect against synthetic-media risks on named individuals; category defaults are the fallback.
- **Newsletter sender is Brevo, digest sender is Resend.** Keeping them separate avoids one feature's daily cap eating the other. The admin can compose + send from the dashboard; a note in the Admin → Newsletter panel suggests the Brevo UI for anything closer to a full WYSIWYG.
- **The dashboard's "Settings" surfaces a `platform_settings` key-value table** (not just env vars) so flags like `REQUIRE_ADMIN_APPROVAL`, the agent query list and the image-relevance threshold can be flipped without a redeploy. Env vars remain the source of truth for secrets.

## Frontend diff

- `src/api/base44Client.js` → compatibility shim re-exporting `base44` from a new `src/api/client.js`; every existing page continues to compile.
- `src/api/entities.js` and `src/api/integrations.js` → thin re-exports of the compatibility surface.
- `src/lib/AuthContext.jsx` → Clerk-backed, API-compatible with the old context.
- `src/main.jsx` → wraps `<App/>` in `<ClerkProvider>` when a publishable key is set.
- `src/App.jsx` → drops the Base44 iframe/visual-edit scaffolding, adds the admin route guarded by `useAuth().isAdmin`.
- `src/Layout.jsx` → unchanged in design; still imports `base44` through the shim.
- `src/pages.config.js` → adds `AdminDashboard`.
- `src/pages/AdminDashboard.jsx` → new.
- `index.html` → Daily Horizons title / icon / description; no `base44.com` logo.
- `vite.config.js` → stripped the visual-edit plugin, error-overlay plugin and iframe HMR middleware. Added a dev proxy `/api → http://127.0.0.1:3001` for running the Hono app under `vercel dev` locally.

## New backend code (top-level)

```
api/[...path].ts         Vercel entry — forwards to the Hono app
server/app.ts            Hono router + global middleware
server/auth.ts           Clerk verify + ensureUser + bans + admin gate
server/env.ts            Zod-validated env
server/policies.ts       Per-entity authorisation + server-owned-field table
server/routes/
  entities.ts            Generic /entities/:entity router
  counters.ts            /articles/:id/view|like|comments (F3)
  submissions.ts         /submissions/article (F1/F7)
  service.ts             /service/articles (external agent bearer)
  ai.ts                  /ai/* — factcheck, augment, assistant, image
  upload.ts              /upload — Vercel Blob
  digest.ts              /digest/send-now
  newsletter.ts          /newsletter/subscribe|unsubscribe + admin/send
  cron.ts                /cron/daily-digest|content-agent|moderation-retry
  admin.ts               /admin/* (analytics, moderation, users, settings)
  auth.ts                /auth/me, /webhooks/clerk
server/ai/
  groq.ts                Provider, cache, schema repair retry
  prompts.ts             The 5 ported prompts (moderation, factcheck, etc.)
  budget.ts              Postgres-backed per-minute/day ledger
  cache.ts               AI + search caches
server/images/
  keywords.ts            Keyword extraction + relevance scoring
  stock.ts               Unsplash + Pexels + Pixabay
  generate.ts            Pollinations + no-real-person guard
  pipeline.ts            Layered pick
server/moderation/pipeline.ts  Submission → moderation → persist, used by
                               both human publishing and the agent.
server/agent/
  discover.ts            Serper /news + dedup against agent_seen_stories
  write.ts               Original synthesis + source verification
  run.ts                 One function; two callers (cron, admin)
server/email/
  digest.ts              Resend sender + balanced-by-category selection
  brevo.ts               Brevo contact + campaign API
server/analytics/queries.ts
scripts/
  db-migrate.ts
  import-legacy-data.ts
  reimage-articles.ts
  rehost-media.ts
  probe-groq.ts
server/__tests__/        policies, keywords+real-person guard, agent schema
```

## Known debt / follow-ups

- **Free-tier ceilings:** Serper, Tavily, Pexels/Unsplash/Pixabay, Brevo, Resend — the agent and image pipeline are the most exposed as volume grows. Watch the Admin → Agent → Budget panel; raise ceilings before they bite.
- **Nigeria/Africa discovery tuning:** currently Serper-only. If coverage looks thin after launch, add an RSS pass against Premium Times / Punch / Vanguard / Daily Trust / BusinessDay (same `DiscoveredStory` shape — plug into `discoverStories`).
- **Full-text search index:** schema declares a GIN index over `articles(title, subtitle, body)` (section 12). `Search.jsx` still fetches a flat list and filters client-side — once there's enough content, move its query server-side with pagination (follow-up task).
- **Unsplash production tier:** we're on the free Demo (50/hour). Apply for Production before launch.
- **Comment threading:** the current import of legacy comments flattens `parent_comment_id` to NULL. A second pass (match by `legacy_id`) is a 20-line follow-up once we have real data.
- **Account deletion:** anonymising a user's comments (rather than deleting) is called out in F6; the admin "ban" flag is in place but a dedicated "anonymise and remove" action is a follow-up.
- **Dev-mode API:** `npm run dev` serves only the SPA; use `npx vercel dev` for local parity with the deployed stack.

## `probe-groq.ts` results

> Run `GROQ_API_KEY=… npm run probe:groq` and paste the summary here. It
> prints model id, p50 latency, token counts for the moderation + agent-
> write prompts, and whether JSON mode validated on the first try.

## Cutover checklist

1. Create the new empty GitHub repo (e.g. `daily-horizons-v2`) under the owner's account. **(user)**
2. Set the new repo as `origin` locally: `git init && git remote add origin git@github.com:<you>/daily-horizons-v2.git && git add . && git commit -m "initial migration" && git branch -M main && git push -u origin main`. **(user)**
3. Import the new repo as its own Vercel project; let the GitHub integration auto-deploy. **(user)**
4. Provision Neon (two connection strings: pooled + unpooled). Run `npm run db:generate && npm run db:migrate`.
5. Create a Clerk app; set `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`; register the webhook at `https://<deployment>/api/webhooks/clerk`.
6. Create a Vercel Blob store; grab `BLOB_READ_WRITE_TOKEN`.
7. Groq, Serper (fall back to Tavily), Resend, Brevo (plus `BREVO_NEWSLETTER_LIST_ID` for the newsletter list it should sync to) — collect the keys.
8. Unsplash + Pexels + Pixabay keys (Unsplash: apply for Production).
9. Pollinations API key.
10. Set `ADMIN_EMAILS` (comma-separated) so bootstrap admins get `role=admin` on first Clerk sync.
11. Set `CRON_SECRET`; Vercel Cron entries are declared in `vercel.json`.
12. `AGENT_SERVICE_KEY` if any external agent still writes to `/api/service/articles`.
13. Hand me `migration-data/<Entity>.json` (User, PublisherProfile, Article, Comment, ArticleLike, SavedArticle, DigestPreference, NewsletterSubscriber). `npm run import:legacy` (idempotent).
14. `npm run reimage -- --only-generic --dry-run` → review → run for real. Then `npm run rehost` for anything still pointing at `base44.com`.
15. Hit `/admindashboard` as an `ADMIN_EMAILS` user. Verify analytics, run the agent once with a tight query, send yourself the digest, and send a test newsletter to a small list.
16. Deploy, point the production domain at Vercel, keep the old Base44 app alive as a rollback window for ~7 days.

## First things to do

1. **Create the new empty GitHub repo** and push this working tree to it as `main`.
2. **Provision Neon**; run migrations.
3. **Set the env vars in Vercel** from §13.2 of the brief / `.env.example`.
4. **Hit `/admindashboard`** signed in with an `ADMIN_EMAILS` account; run one small agent generation to confirm the end-to-end pipeline (discovery → write → source verify → image → moderate → publish).
5. **Hand over `migration-data/*.json`** when ready; the import, re-image and rehost scripts are already in place.
