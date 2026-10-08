# Daily Horizons

Public British-English news platform. Vite + React SPA, backed by a serverless API on Vercel Functions, Neon Postgres (Drizzle ORM), Clerk auth, Groq (Qwen) for AI, Serper/Tavily for web search, Resend for the daily digest and Brevo for the newsletter.

## Local development

```bash
cp .env.example .env.local
# fill in: DATABASE_URL / DATABASE_URL_UNPOOLED (Neon), VITE_CLERK_PUBLISHABLE_KEY
# + CLERK_SECRET_KEY, GROQ_API_KEY, SERPER_API_KEY (or TAVILY), image provider
# keys, BLOB_READ_WRITE_TOKEN, RESEND_API_KEY, BREVO_API_KEY, CRON_SECRET,
# ADMIN_EMAILS (comma-separated).

npm install
npm run db:generate       # produce drizzle/*.sql from server/db/schema.ts
npm run db:migrate        # apply to Neon

# Vercel's local emulator runs both the SPA and api/[...path].ts:
npx vercel dev            # app on http://localhost:3000
```

`npm run dev` serves only the frontend; the Vite proxy forwards `/api` to
`http://127.0.0.1:3001` if you want to run the API separately with
`vercel dev --listen 3001` or `vite-node` on the Hono app.

## Scripts

- `npm run build` — production SPA
- `npm run lint`
- `npm run test` — Vitest (no network calls; mocks for Groq/Clerk/etc.)
- `npm run probe:groq` — measure the moderation + agent-write prompts
- `npm run import:legacy` — bulk-import `migration-data/*.json`
- `npm run reimage` — rebuild lead images via the pipeline
- `npm run rehost` — move legacy-hosted media to Vercel Blob

See [`MIGRATION_REPORT.md`](./MIGRATION_REPORT.md) for the Base44 → Vercel
migration record: parity, defect status, agent decisions, cutover checklist.
