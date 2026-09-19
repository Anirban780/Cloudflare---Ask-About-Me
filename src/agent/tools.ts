/**
 * Agent tools definition for Ask-About-Me.
 * Provides the searchKnowledgeBase tool for semantic RAG lookups with SQLite retrieval logging.
 * Defined per SPECS.md §8.3 and §15 (F-04).
 */

import { tool } from "ai";
import { z } from "zod";
import { retrieve, type RetrievalResult } from "../rag/retrieve";

/** Context required by agent tools to interact with environment bindings and SQLite. */
export interface AgentToolContext {
  env: Env;
  sql: <T = Record<string, string | number | boolean | null>>(
    strings: TemplateStringsArray,
    ...values: (string | number | boolean | null)[]
  ) => T[];
}

/**
 * Builds the AI SDK tools registry bound to the PortfolioAgent context.
 *
 * @param ctx Context containing worker environment bindings and SQLite interface.
 * @returns Tools record for use in streamText().
 */
export function buildTools(ctx: AgentToolContext) {
  const ownerFirst = ctx.env.OWNER_FIRST || "Anirban";

  return {
    searchKnowledgeBase: tool({
      description: `Search ${ownerFirst}'s verified resume, projects, technical writing, and background. Call this tool for ANY factual question about ${ownerFirst}'s experience, skills, projects, architecture, education, or availability. Pass a concise, self-contained search query, not the visitor's raw conversational greeting.`,
      inputSchema: z.object({
        query: z
          .string()
          .min(3)
          .max(300)
          .describe(`Specific search query to look up in ${ownerFirst}'s verified documents`),
        sourceType: z
          .enum(["resume", "project", "blog", "about", "github"])
          .optional()
          .describe("Optional category filter to constrain the search scope"),
      }),
      execute: async ({ query, sourceType }): Promise<RetrievalResult> => {
        const retrieval = await retrieve(ctx.env, { query, sourceType });

        // Log retrieval metrics to Durable Object SQLite per SPECS.md §5.2 and §7.8
        try {
          const docIds = Array.from(
            new Set(retrieval.results.map((r) => r.docId))
          ).join(",");
          const topScore =
            retrieval.results.length > 0 ? retrieval.results[0].score : null;

          ctx.sql`
            INSERT INTO retrieval_log (query, result_count, top_score, doc_ids)
            VALUES (${query}, ${retrieval.results.length}, ${topScore}, ${docIds});
          `;
        } catch (logErr) {
          console.warn("Failed to write to retrieval_log in SQLite:", logErr);
        }

        return retrieval;
      },
    }),
  };
}
