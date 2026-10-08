import { z } from "zod";

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === "boolean" ? v : /^(1|true|yes)$/i.test(v.trim())));

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  DATABASE_URL_UNPOOLED: z.string().optional(),

  VITE_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_WEBHOOK_SECRET: z.string().optional(),

  GROQ_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default("qwen/qwen3.8-27b"),
  AI_FALLBACK_MODEL: z.string().optional(),
  GROQ_RPM_CEILING: z.coerce.number().int().positive().default(25),
  GROQ_TPM_CEILING: z.coerce.number().int().positive().default(7000),
  GROQ_TPD_CEILING: z.coerce.number().int().positive().default(180000),

  SERPER_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  SEARCH_DAILY_CEILING: z.coerce.number().int().positive().default(40),
  NEWS_DISCOVERY_DAILY_CEILING: z.coerce.number().int().positive().default(150),

  UNSPLASH_ACCESS_KEY: z.string().optional(),
  PEXELS_API_KEY: z.string().optional(),
  PIXABAY_API_KEY: z.string().optional(),
  POLLINATIONS_API_KEY: z.string().optional(),

  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),

  ADMIN_EMAILS: z.string().default(""),
  AGENT_SERVICE_KEY: z.string().optional(),
  AGENT_AUTHOR_EMAIL: z.string().default("agent@dailyhorizons.app"),
  AGENT_AUTHOR_DISPLAY_NAME: z.string().default("Daily Horizons Newsroom AI"),
  AGENT_NEWS_QUERIES: z.string().default(""),
  AGENT_CRON_SCHEDULE: z.string().default("0 */3 * * *"),
  AGENT_MAX_ARTICLES_PER_RUN: z.coerce.number().int().positive().default(5),
  AGENT_RUNS_PER_DAY: z.coerce.number().int().positive().default(8),

  REQUIRE_ADMIN_APPROVAL: booleanish.default(false),
  CRON_SECRET: z.string().optional(),
  LEGACY_MEDIA_HOST: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let _env: Env | null = null;
export function env(): Env {
  if (!_env) {
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.error("[env] invalid environment:", parsed.error.flatten().fieldErrors);
      throw new Error("Invalid environment configuration");
    }
    _env = parsed.data;
  }
  return _env;
}

export function adminEmails(): string[] {
  return env()
    .ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function agentNewsQueries(): string[] {
  return env()
    .AGENT_NEWS_QUERIES.split(",")
    .map((q) => q.trim())
    .filter(Boolean);
}
