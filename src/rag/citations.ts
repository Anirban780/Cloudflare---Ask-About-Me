/**
 * Citation extraction and mapping utilities for Ask-About-Me.
 * Parses inline bracket citations like [1], [1][2], [1, 2] from model responses
 * and matches them against verified knowledge base retrieval items.
 * Defined per SPECS.md §10, §12.1, and §15 (F-15).
 */

import type { RetrievalItem } from "./retrieve";

/** Represents an extracted citation reference and its corresponding verified source chunk. */
export interface MatchedCitation {
  /** The 1-based citation index extracted from the text (e.g. 1 for [1]). */
  n: number;
  /** Whether a corresponding verified knowledge chunk was found for this index. */
  matched: boolean;
  /** The verified retrieval source if matched, or undefined if the model cited an absent number. */
  result?: RetrievalItem;
}

/** Regular expression matching valid citation bracket patterns: e.g. [1], [1, 2], [ 1 , 3 ]. */
const CITATION_BRACKET_REGEX = /\[\s*(\d+(?:\s*,\s*\d+)*)\s*\]/g;

/**
 * Extracts all unique 1-based citation numbers from a markdown or plain text string.
 *
 * Handles:
 * - Single bracket: `[1]` -> `[1]`
 * - Multiple adjacent: `[1][2]` -> `[1, 2]`
 * - Comma-separated: `[1, 2]` or `[1,2,3]` -> `[1, 2, 3]`
 * - Whitespace variations: `[ 1 ,  3 ]` -> `[1, 3]`
 * - Deduplication: Duplicate references preserve first appearance order.
 * - Stray brackets: Ignores non-numeric brackets like `[text]`, `[]`, `[0]`, `[-1]`.
 *
 * @param text The model response text to scan.
 * @returns Array of unique positive integers representing citation numbers in order of appearance.
 */
export function extractCitationIndices(text: string): number[] {
  if (!text || typeof text !== "string") {
    return [];
  }

  const seen = new Set<number>();
  const indices: number[] = [];

  let match: RegExpExecArray | null;
  // Reset regex state
  CITATION_BRACKET_REGEX.lastIndex = 0;

  while ((match = CITATION_BRACKET_REGEX.exec(text)) !== null) {
    const rawNumbers = match[1];
    const tokens = rawNumbers.split(",");

    for (const token of tokens) {
      const num = parseInt(token.trim(), 10);
      // Valid citations must be positive 1-based integers within reasonable range
      if (!Number.isNaN(num) && num > 0 && num <= 100) {
        if (!seen.has(num)) {
          seen.add(num);
          indices.push(num);
        }
      }
    }
  }

  return indices;
}

/**
 * Matches extracted citation numbers from model text against verified retrieval results.
 * If the model cites a number that was not returned by the retrieval tool, it is marked
 * as `matched: false` so the UI avoids fabricating a source.
 *
 * @param text Model response text containing bracket citations.
 * @param results Verified chunks returned by the retrieval tool.
 * @returns Array of matched citations with their source metadata.
 */
export function matchCitations(
  text: string,
  results?: RetrievalItem[]
): MatchedCitation[] {
  const indices = extractCitationIndices(text);
  if (indices.length === 0) {
    return [];
  }

  const resultMap = new Map<number, RetrievalItem>();
  if (results && Array.isArray(results)) {
    for (const item of results) {
      if (typeof item.n === "number") {
        resultMap.set(item.n, item);
      }
    }
  }

  return indices.map((n) => {
    const matchedItem = resultMap.get(n);
    if (matchedItem) {
      return {
        n,
        matched: true,
        result: matchedItem,
      };
    }
    return {
      n,
      matched: false,
    };
  });
}
