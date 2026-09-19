/**
 * Pure retrieval algorithm for Ask-About-Me knowledge base.
 * Coordinates query embedding, Vectorize semantic lookup, score thresholding,
 * document-level deduplication, context length budget enforcement, and 1-based numbering.
 * Defined per SPECS.md §7 and §15 (F-04, F-13).
 */

import {
  TOP_K,
  MIN_SCORE,
  MAX_PER_DOC,
  MAX_RESULTS,
  MAX_CONTEXT_CHARS,
} from "../config";
import { embedTexts } from "./embed";

/** Options passed to the retrieval function. */
export interface RetrieveOptions {
  /** Search query string (validated to 3-300 characters). */
  query: string;
  /** Optional content category filter (e.g. 'resume', 'project', 'blog'). */
  sourceType?: "resume" | "project" | "blog" | "about" | "github" | string;
}

/** Individual verified chunk retrieved from the knowledge base. */
export interface RetrievalItem {
  /** 1-based index corresponding to inline citation references [n]. */
  n: number;
  /** Unique document identifier (e.g. 'resume', 'project-ask-about-me'). */
  docId: string;
  /** Human-readable document title. */
  title: string;
  /** Section heading path (e.g. 'Experience > Senior Software Engineer'). */
  section: string;
  /** Source category identifier. */
  sourceType: string;
  /** Optional external link or repository URL. */
  url?: string;
  /** Cosine similarity relevance score (0.0 to 1.0). */
  score: number;
  /** Full textual content of the chunk. */
  text: string;
}

/** Complete retrieval response returned to the agent tool or eval harness. */
export interface RetrievalResult {
  /** Ordered list of verified relevant knowledge chunks (1..n). */
  results: RetrievalItem[];
  /** Optional informational note when results are empty or unavailable. */
  note?: string;
}

/**
 * Executes semantic search over the Vectorize index with rigorous post-processing.
 *
 * Algorithm per SPECS.md §7:
 * 1. Validate: query 3–300 chars.
 * 2. Embed query using Workers AI (@cf/baai/bge-base-en-v1.5).
 * 3. Query Vectorize with topK and optional sourceType filter.
 * 4. Drop matches with score < MIN_SCORE (0.5).
 * 5. Enforce MAX_PER_DOC (2), keeping highest scoring first; truncate to MAX_RESULTS (5).
 * 6. Enforce MAX_CONTEXT_CHARS by trimming lowest-ranked results upward.
 * 7. Assign 1-based index `n` and return.
 *
 * @param env Cloudflare Worker environment containing AI and VECTORIZE bindings.
 * @param options Query text and optional category filter.
 * @returns Structured retrieval result with verified chunks and optional status note.
 */
export async function retrieve(
  env: Pick<Env, "AI" | "VECTORIZE">,
  options: RetrieveOptions
): Promise<RetrievalResult> {
  const cleanQuery = options.query?.trim();

  // 1. Validate query length
  if (!cleanQuery || cleanQuery.length < 3) {
    return {
      results: [],
      note: "Search query must be at least 3 characters.",
    };
  }

  if (cleanQuery.length > 300) {
    return {
      results: [],
      note: "Search query exceeds maximum length of 300 characters.",
    };
  }

  if (!env.AI || !env.VECTORIZE) {
    return {
      results: [],
      note: "Knowledge search is temporarily unavailable (missing bindings).",
    };
  }

  try {
    // 2. Embed the query using Workers AI model
    const vectors = await embedTexts(env.AI, [cleanQuery]);
    if (!vectors || vectors.length === 0 || !vectors[0]) {
      return {
        results: [],
        note: "Failed to generate search vector for query.",
      };
    }
    const queryVector = vectors[0];

    // 3. Query Vectorize index with metadata
    const queryOpts: VectorizeQueryOptions = {
      topK: TOP_K,
      returnMetadata: "all",
    };

    if (options.sourceType) {
      queryOpts.filter = { sourceType: options.sourceType };
    }

    const matchesResponse = await env.VECTORIZE.query(queryVector, queryOpts);
    const rawMatches = matchesResponse?.matches || [];

    // 4. Drop matches below MIN_SCORE floor
    const qualified = rawMatches.filter(
      (m) => typeof m.score === "number" && m.score >= MIN_SCORE
    );

    // Sort descending by score to ensure top-ranked chunks come first
    qualified.sort((a, b) => b.score - a.score);

    // 5. Enforce MAX_PER_DOC (keep highest first) and cap at MAX_RESULTS
    const docCounts = new Map<string, number>();
    const docFiltered: typeof qualified = [];

    for (const match of qualified) {
      const docId = (match.metadata?.docId as string) || "unknown";
      const count = docCounts.get(docId) || 0;

      if (count < MAX_PER_DOC) {
        docCounts.set(docId, count + 1);
        docFiltered.push(match);
      }

      if (docFiltered.length >= MAX_RESULTS) {
        break;
      }
    }

    // 6. Enforce MAX_CONTEXT_CHARS by trimming lowest-ranked results upward
    let totalChars = docFiltered.reduce(
      (sum, m) => sum + ((m.metadata?.text as string) || "").length,
      0
    );

    while (docFiltered.length > 1 && totalChars > MAX_CONTEXT_CHARS) {
      const removed = docFiltered.pop();
      totalChars -= ((removed?.metadata?.text as string) || "").length;
    }

    // 7. Number results 1..n and format output
    const results: RetrievalItem[] = docFiltered.map((m, idx) => ({
      n: idx + 1,
      docId: (m.metadata?.docId as string) || "unknown",
      title: (m.metadata?.title as string) || "Untitled",
      section: (m.metadata?.section as string) || "Overview",
      sourceType: (m.metadata?.sourceType as string) || "about",
      url: (m.metadata?.url as string) || undefined,
      score: Math.round(m.score * 1000) / 1000,
      text: (m.metadata?.text as string) || "",
    }));

    return {
      results,
      note:
        results.length === 0
          ? "No relevant verified information found."
          : undefined,
    };
  } catch (error) {
    console.error("Retrieval execution failed:", error);
    return {
      results: [],
      note: "Knowledge search is temporarily unavailable.",
    };
  }
}
