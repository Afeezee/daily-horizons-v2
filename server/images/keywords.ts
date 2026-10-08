const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "for", "to", "in", "on", "at",
  "by", "with", "as", "is", "are", "was", "were", "be", "been", "being",
  "it", "its", "this", "that", "these", "those", "from", "into", "about",
  "after", "before", "during", "over", "under", "between", "across", "news",
  "report", "article", "story", "update", "latest",
]);

const CATEGORY_HINTS: Record<string, string[]> = {
  Politics: ["political"],
  Economy: ["economic", "market"],
  Business: ["business"],
  Sport: ["sports"],
  Technology: ["tech"],
  Health: ["health", "medical"],
  Culture: ["culture", "arts"],
  Lifestyle: ["lifestyle"],
  Entertainment: ["entertainment"],
  Education: ["education", "school"],
  Crime: ["crime", "police"],
  World: ["international"],
};

/**
 * Pull 3–6 concrete nouns from an article's title/category/tags. Prefers
 * capitalised multi-word phrases (likely place names, institutions). The
 * discoveryQuery, when supplied by the agent, biases toward that term.
 */
export function extractKeywords(opts: {
  title: string;
  category?: string | null;
  tags?: string[];
  labels?: string[];
  discoveryQuery?: string;
}): string[] {
  const text = [opts.title, opts.discoveryQuery ?? ""].join(" ");
  const capitalPhrases = Array.from(
    text.matchAll(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\b/g),
    (m) => m[1]
  ).filter((p) => p.length > 2);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));

  const bag: string[] = [];
  for (const p of capitalPhrases) if (!bag.includes(p)) bag.push(p);
  for (const t of opts.tags ?? []) if (t && !bag.includes(t)) bag.push(t);
  for (const l of opts.labels ?? []) if (l && !bag.includes(l)) bag.push(l);
  for (const w of words) if (!bag.map((s) => s.toLowerCase()).includes(w)) bag.push(w);

  if (opts.category && CATEGORY_HINTS[opts.category]) {
    for (const h of CATEGORY_HINTS[opts.category]) if (!bag.includes(h)) bag.push(h);
  }

  return bag.slice(0, 6);
}

/**
 * Score how well a stock-image candidate matches our extracted keywords.
 * Simple keyword-overlap heuristic: count of keywords that appear in the
 * image's tags/alt text, scaled 0..1 against the keyword count.
 */
export function scoreRelevance(opts: {
  keywords: string[];
  alt?: string | null;
  tags?: string[];
}): number {
  const hay = [opts.alt ?? "", ...(opts.tags ?? [])].join(" ").toLowerCase();
  if (!hay) return 0;
  const hits = opts.keywords.filter((k) =>
    hay.includes(k.toLowerCase())
  ).length;
  return hits / Math.max(opts.keywords.length, 1);
}
