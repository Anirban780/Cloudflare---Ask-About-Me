/**
 * Unit tests for citation extraction and mapping.
 * Verifies parsing behavior for [1], [1][2], [1,2], missing numbers, and stray brackets.
 * Defined per SPECS.md §12.1 and §15 (F-15).
 */

import { describe, it, expect } from "vitest";
import {
  extractCitationIndices,
  matchCitations,
} from "../src/rag/citations";
import type { RetrievalItem } from "../src/rag/retrieve";

describe("Citations Parser (SPECS §12.1)", () => {
  it("extracts a single citation index [1]", () => {
    const text = "Anirban designed a distributed streaming platform [1].";
    const indices = extractCitationIndices(text);
    expect(indices).toEqual([1]);
  });

  it("extracts adjacent bracket citations [1][2]", () => {
    const text = "Anirban has expertise in TypeScript and Cloudflare Workers [1][2].";
    const indices = extractCitationIndices(text);
    expect(indices).toEqual([1, 2]);
  });

  it("extracts comma-separated citations [1, 2] and [1,2,3]", () => {
    const text1 = "Key architectural patterns include edge state and durability [1, 2].";
    expect(extractCitationIndices(text1)).toEqual([1, 2]);

    const text2 = "Supported frameworks include React, Hono, and Vite [1,2,3].";
    expect(extractCitationIndices(text2)).toEqual([1, 2, 3]);
  });

  it("handles spaced comma-separated citations [ 1 ,  3 ]", () => {
    const text = "Infrastructure automation uses Terraform and GitHub Actions [ 1 ,  3 ].";
    expect(extractCitationIndices(text)).toEqual([1, 3]);
  });

  it("deduplicates repeated citation indices while preserving first occurrence order", () => {
    const text =
      "Anirban led the DevOps initiative [2]. He also deployed edge microservices [1] and scaled the cluster [2].";
    expect(extractCitationIndices(text)).toEqual([2, 1]);
  });

  it("safely ignores non-citation stray brackets and markdown links", () => {
    const text =
      "Check the [GitHub repo](https://github.com/Anirban780) for details. Empty brackets [] or [text] or [0] or [-2] should not be parsed.";
    expect(extractCitationIndices(text)).toEqual([]);
  });

  it("returns empty array for empty, whitespace, or invalid text inputs", () => {
    expect(extractCitationIndices("")).toEqual([]);
    expect(extractCitationIndices("   ")).toEqual([]);
    // @ts-expect-error testing invalid input types
    expect(extractCitationIndices(null)).toEqual([]);
    // @ts-expect-error testing invalid input types
    expect(extractCitationIndices(undefined)).toEqual([]);
  });

  describe("matchCitations", () => {
    const mockResults: RetrievalItem[] = [
      {
        n: 1,
        docId: "resume",
        title: "Anirban Sarkar Resume",
        section: "Core Technical Skills",
        sourceType: "resume",
        url: "https://github.com/Anirban780",
        score: 0.89,
        text: "Languages: TypeScript, JavaScript, Python, Go, SQL.",
      },
      {
        n: 2,
        docId: "project-ask-about-me",
        title: "Ask-About-Me Architecture",
        section: "Durable Execution",
        sourceType: "project",
        score: 0.84,
        text: "Utilizes Cloudflare Agents SDK and Durable Objects for state.",
      },
    ];

    it("correctly associates matched citations with verified knowledge items", () => {
      const text = "Anirban works with TypeScript [1] and built Ask-About-Me [2].";
      const matched = matchCitations(text, mockResults);

      expect(matched).toHaveLength(2);
      expect(matched[0]).toEqual({
        n: 1,
        matched: true,
        result: mockResults[0],
      });
      expect(matched[1]).toEqual({
        n: 2,
        matched: true,
        result: mockResults[1],
      });
    });

    it("marks out-of-bounds or missing citations as unmatched without fabricating data", () => {
      // Model hallucinated citation [5] when only [1] and [2] exist
      const text = "Anirban has expertise in robotics [5] and TypeScript [1].";
      const matched = matchCitations(text, mockResults);

      expect(matched).toHaveLength(2);
      expect(matched[0]).toEqual({
        n: 5,
        matched: false,
        result: undefined,
      });
      expect(matched[1]).toEqual({
        n: 1,
        matched: true,
        result: mockResults[0],
      });
    });

    it("handles cases where results list is undefined or empty", () => {
      const text = "Some answer with citation [1].";
      const matched = matchCitations(text, undefined);

      expect(matched).toHaveLength(1);
      expect(matched[0]).toEqual({
        n: 1,
        matched: false,
        result: undefined,
      });
    });
  });
});
