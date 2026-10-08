import Groq from "groq-sdk";
import { z } from "zod";
import { env } from "../env";
import { Errors } from "../errors";
import { budgetGate, recordUsage } from "./budget";
import { hashKey, readAiCache, writeAiCache } from "./cache";

let _client: Groq | null = null;
function client(): Groq {
  if (!_client) {
    const key = env().GROQ_API_KEY;
    if (!key) throw Errors.unavailable("Groq API key not configured");
    _client = new Groq({ apiKey: key });
  }
  return _client;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type InvokeOptions<T> = {
  purpose: string;
  messages: ChatMessage[];
  schema?: z.ZodType<T>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  cacheTtlSec?: number;
  cacheKey?: unknown; // extra material to key the cache on
};

export type InvokeResult<T> = {
  data: T;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cached: boolean;
};

/**
 * Wraps the entire Base44 InvokeLLM pattern: budget check, cache lookup,
 * Groq request, Zod validation, one repair retry on parse failure, then
 * usage recording. On a true outage, callers decide the degraded behaviour
 * — the moderation flow sets expert_review_required and leaves the article
 * pending; the chat assistant returns a canned apology.
 */
export async function invoke<T>(opts: InvokeOptions<T>): Promise<InvokeResult<T>> {
  const model = opts.model ?? env().AI_MODEL;
  const key = hashKey({
    model,
    messages: opts.messages,
    schema: opts.schema ? "zod" : null,
    extra: opts.cacheKey ?? null,
  });

  const cached = await readAiCache(key);
  if (cached) {
    const parsed = opts.schema ? opts.schema.safeParse(cached.response) : { success: true, data: cached.response as T };
    if (parsed.success) {
      return {
        data: parsed.data as T,
        model: cached.model,
        tokensIn: cached.tokens_in ?? 0,
        tokensOut: cached.tokens_out ?? 0,
        cached: true,
      };
    }
  }

  await budgetGate();

  const c = client();
  const first = await c.chat.completions.create({
    model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? 2048,
    response_format: opts.schema ? { type: "json_object" } : undefined,
  });
  await recordUsage({
    tokensIn: first.usage?.prompt_tokens ?? 0,
    tokensOut: first.usage?.completion_tokens ?? 0,
  });

  const raw = first.choices[0]?.message?.content ?? "";
  let parsed: any;
  try {
    parsed = opts.schema ? JSON.parse(raw) : raw;
  } catch {
    parsed = { __raw: raw };
  }

  if (opts.schema) {
    const check = opts.schema.safeParse(parsed);
    if (!check.success) {
      // One repair attempt: show the parse error, ask for compliant JSON.
      const repair = await c.chat.completions.create({
        model,
        messages: [
          ...opts.messages,
          { role: "assistant", content: raw },
          {
            role: "user",
            content:
              "Your previous response did not match the required JSON schema. " +
              "Return ONLY valid JSON. Errors: " +
              JSON.stringify(check.error.flatten()),
          },
        ],
        temperature: 0,
        max_tokens: opts.maxTokens ?? 2048,
        response_format: { type: "json_object" },
      });
      await recordUsage({
        tokensIn: repair.usage?.prompt_tokens ?? 0,
        tokensOut: repair.usage?.completion_tokens ?? 0,
      });
      try {
        parsed = JSON.parse(repair.choices[0]?.message?.content ?? "");
      } catch {
        throw Errors.unavailable("AI returned invalid JSON");
      }
      const check2 = opts.schema.safeParse(parsed);
      if (!check2.success) throw Errors.unavailable("AI schema validation failed");
      parsed = check2.data;
    } else {
      parsed = check.data;
    }
  }

  await writeAiCache({
    key,
    purpose: opts.purpose,
    model,
    response: parsed,
    tokensIn: first.usage?.prompt_tokens ?? 0,
    tokensOut: first.usage?.completion_tokens ?? 0,
    ttlSec: opts.cacheTtlSec ?? 3600 * 24,
  });

  return {
    data: parsed as T,
    model,
    tokensIn: first.usage?.prompt_tokens ?? 0,
    tokensOut: first.usage?.completion_tokens ?? 0,
    cached: false,
  };
}

/**
 * Wrap a free-text field in a <user_input> block so the model can't
 * interpret an injection as system instructions.
 */
export function userBlock(s: string): string {
  return `<user_input>\n${s.replace(/<\/?user_input>/gi, "")}\n</user_input>`;
}
