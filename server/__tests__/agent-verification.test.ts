import { describe, expect, it } from "vitest";
import { ArticleDraftSchema } from "../agent/write";

describe("agent article draft schema", () => {
  it("rejects empty body", () => {
    const parsed = ArticleDraftSchema.safeParse({
      title: "T",
      summary: "A short summary of ten chars.",
      body: "short",
      category: "News",
      cited_urls: [],
    });
    expect(parsed.success).toBe(false);
  });
  it("accepts a well-formed draft", () => {
    const parsed = ArticleDraftSchema.safeParse({
      title: "A reasonable headline",
      summary: "A paragraph-length summary of this news story.",
      body: "An article body long enough to clear the 300 character minimum. ".repeat(10),
      category: "News",
      tags: ["one"],
      cited_urls: ["https://example.com/story"],
      meta_description: "meta",
    });
    expect(parsed.success).toBe(true);
  });
});

/**
 * The actual source-verification step (dropping URLs not in the supplied
 * search results) is covered by the integration path in server/agent/write.ts:
 * every cited URL is intersected with the search-results set after parsing.
 * This test asserts the schema's contract; mocking the model call is in the
 * follow-up test suite.
 */
