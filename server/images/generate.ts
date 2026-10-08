import { env } from "../env";
import { recordImageUsage } from "../ai/budget";

// Section 8 — curated per-category fallbacks. Replace with real curated
// assets after a first import run; keep these as stable placeholders.
const CATEGORY_DEFAULTS: Record<string, string> = {
  News: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=1600",
  Opinion: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1600",
  Culture: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1600",
  Lifestyle: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1600",
  Sport: "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?w=1600",
  Education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1600",
  Technology: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600",
  Business: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600",
  Economy: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1600",
  Politics: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1600",
  Crime: "https://images.unsplash.com/photo-1453873531674-2151bcd01707?w=1600",
  Entertainment: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1600",
  Health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1600",
  World: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600",
};

// Patterns that look like real-named-person requests. Stories about specific
// public figures must NOT be run through AI image generation — see section 8.
const NAMED_PERSON_RE = /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.|President|Prime Minister|Senator|Governor|Chief|Alhaji|Chairman)\s+[A-Z][a-z]+/;

export function looksLikeRealPersonFocus(prompt: string): boolean {
  if (NAMED_PERSON_RE.test(prompt)) return true;
  // Two consecutive capitalised words that aren't a common place name.
  const names = prompt.match(/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g) ?? [];
  const PLACES = new Set([
    "New York", "Los Angeles", "San Francisco", "Hong Kong", "South Africa",
    "North Korea", "Addis Ababa", "Lagos State", "Abuja Nigeria",
  ]);
  for (const n of names) if (!PLACES.has(n)) return true;
  return false;
}

export type GeneratedImage = {
  url: string;
  source: "ai:pollinations" | "category_default";
  source_ref?: string;
  prompt?: string;
};

/**
 * Pollinations.ai with the "no fake photos of real named people" guard.
 * When the prompt looks person-focused and we can't be sure, fall back to
 * the category default rather than invent a face.
 */
export async function generateImage(opts: {
  prompt: string;
  category: string;
}): Promise<GeneratedImage> {
  if (looksLikeRealPersonFocus(opts.prompt)) {
    return {
      url: CATEGORY_DEFAULTS[opts.category] ?? CATEGORY_DEFAULTS.News,
      source: "category_default",
      source_ref: opts.category,
    };
  }

  const E = env();
  const styled =
    `${opts.prompt}, editorial scene, atmospheric lighting, photojournalism style, ` +
    `wide shot, no faces of specific real people`;
  const encoded = encodeURIComponent(styled);
  const base = "https://image.pollinations.ai/prompt/";
  const params = new URLSearchParams({ width: "1600", height: "900", nologo: "true" });
  if (E.POLLINATIONS_API_KEY) params.set("token", E.POLLINATIONS_API_KEY);
  const url = `${base}${encoded}?${params.toString()}`;
  await recordImageUsage("pollinations");
  return { url, source: "ai:pollinations", prompt: styled };
}

export { CATEGORY_DEFAULTS };
