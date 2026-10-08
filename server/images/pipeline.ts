import { CATEGORY_DEFAULTS, generateImage } from "./generate";
import { extractKeywords } from "./keywords";
import { searchStock, type StockHit } from "./stock";

export type ImagePick = {
  url: string;
  source:
    | "stock:unsplash"
    | "stock:pexels"
    | "stock:pixabay"
    | "ai:pollinations"
    | "category_default";
  source_ref?: string | null;
  photographer?: string;
  credit_url?: string;
};

/**
 * The layered pipeline from section 8: keyword extract → stock search →
 * AI generation fallback → category default (never a generated likeness of
 * a real named person).
 */
export async function pickImage(input: {
  title: string;
  category?: string | null;
  tags?: string[];
  labels?: string[];
  discoveryQuery?: string;
}): Promise<ImagePick> {
  const category = input.category ?? "News";
  const keywords = extractKeywords({ ...input });

  const hit = await searchStock({ keywords });
  if (hit) return stockToPick(hit);

  const gen = await generateImage({
    prompt: `${input.title}. ${keywords.join(", ")}`,
    category,
  });
  if (gen.source === "ai:pollinations") {
    return {
      url: gen.url,
      source: "ai:pollinations",
      source_ref: gen.prompt ?? null,
    };
  }
  return {
    url: CATEGORY_DEFAULTS[category] ?? CATEGORY_DEFAULTS.News,
    source: "category_default",
    source_ref: category,
  };
}

function stockToPick(hit: StockHit): ImagePick {
  return {
    url: hit.url,
    source: `stock:${hit.provider}` as ImagePick["source"],
    source_ref: hit.credit_url ?? hit.id,
    photographer: hit.photographer,
    credit_url: hit.credit_url,
  };
}
