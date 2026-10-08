import { describe, expect, it } from "vitest";
import { extractKeywords, scoreRelevance } from "../images/keywords";
import { looksLikeRealPersonFocus } from "../images/generate";

describe("image keywords", () => {
  it("pulls place names and relevant tokens", () => {
    const kw = extractKeywords({
      title: "Lagos state assembly votes on new budget",
      category: "Politics",
      tags: ["budget", "assembly"],
    });
    expect(kw.join(" ")).toMatch(/Lagos/);
    expect(kw.length).toBeGreaterThanOrEqual(3);
    expect(kw.length).toBeLessThanOrEqual(6);
  });
  it("scores by overlap", () => {
    const s = scoreRelevance({
      keywords: ["Lagos", "flooding"],
      alt: "Flooding in Lagos after heavy rain",
      tags: ["Lagos"],
    });
    expect(s).toBeGreaterThan(0.4);
  });
});

describe("real-person guard", () => {
  it("flags titled public figures", () => {
    expect(looksLikeRealPersonFocus("President Bola Tinubu addresses the nation")).toBe(true);
  });
  it("accepts generic scene prompts", () => {
    expect(looksLikeRealPersonFocus("Flooding in a Nigerian market, infrastructure concerns")).toBe(false);
  });
});
