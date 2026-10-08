import { env } from "../env";
import { recordImageUsage } from "../ai/budget";
import { scoreRelevance } from "./keywords";

export type StockHit = {
  provider: "unsplash" | "pexels" | "pixabay";
  id: string;
  url: string;
  download_location?: string;
  alt?: string;
  tags: string[];
  photographer?: string;
  photographer_url?: string;
  credit_url?: string;
  score: number;
};

const RELEVANCE_THRESHOLD = 0.3;

export async function searchStock(opts: {
  keywords: string[];
  limit?: number;
}): Promise<StockHit | null> {
  const query = opts.keywords.join(" ");
  const limit = opts.limit ?? 10;
  if (!query.trim()) return null;

  for (const provider of ["unsplash", "pexels", "pixabay"] as const) {
    const hits = await searchProvider(provider, query, limit).catch(() => []);
    const scored = hits
      .map((h) => ({
        ...h,
        score: scoreRelevance({ keywords: opts.keywords, alt: h.alt, tags: h.tags }),
      }))
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best && best.score >= RELEVANCE_THRESHOLD) {
      await recordImageUsage(provider);
      // Unsplash's API terms require a download-tracking ping when a photo
      // is actually used.
      if (provider === "unsplash" && best.download_location) {
        await fetch(best.download_location, {
          headers: { Authorization: `Client-ID ${env().UNSPLASH_ACCESS_KEY ?? ""}` },
        }).catch(() => {
          /* best-effort */
        });
      }
      return best;
    }
  }
  return null;
}

async function searchProvider(
  provider: StockHit["provider"],
  query: string,
  perPage: number
): Promise<Omit<StockHit, "score">[]> {
  const E = env();
  if (provider === "unsplash") {
    if (!E.UNSPLASH_ACCESS_KEY) return [];
    const r = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${E.UNSPLASH_ACCESS_KEY}` } }
    );
    if (!r.ok) return [];
    const json = await r.json();
    return (json.results ?? []).map((p: any) => ({
      provider: "unsplash" as const,
      id: p.id,
      url: p.urls?.regular ?? p.urls?.full,
      download_location: p.links?.download_location,
      alt: p.alt_description ?? p.description,
      tags: (p.tags ?? []).map((t: any) => t.title).filter(Boolean),
      photographer: p.user?.name,
      photographer_url: p.user?.links?.html,
      credit_url: p.links?.html,
    }));
  }
  if (provider === "pexels") {
    if (!E.PEXELS_API_KEY) return [];
    const r = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
      { headers: { Authorization: E.PEXELS_API_KEY } }
    );
    if (!r.ok) return [];
    const json = await r.json();
    return (json.photos ?? []).map((p: any) => ({
      provider: "pexels" as const,
      id: String(p.id),
      url: p.src?.large ?? p.src?.original,
      alt: p.alt,
      tags: [],
      photographer: p.photographer,
      photographer_url: p.photographer_url,
      credit_url: p.url,
    }));
  }
  if (provider === "pixabay") {
    if (!E.PIXABAY_API_KEY) return [];
    const r = await fetch(
      `https://pixabay.com/api/?key=${E.PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=${perPage}&safesearch=true`
    );
    if (!r.ok) return [];
    const json = await r.json();
    return (json.hits ?? []).map((p: any) => ({
      provider: "pixabay" as const,
      id: String(p.id),
      url: p.largeImageURL ?? p.webformatURL,
      alt: p.tags,
      tags: (p.tags ?? "").split(",").map((t: string) => t.trim()).filter(Boolean),
      photographer: p.user,
      credit_url: p.pageURL,
    }));
  }
  return [];
}
