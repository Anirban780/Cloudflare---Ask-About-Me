/**
 * Agent tools definition for Ask-About-Me.
 * Provides searchKnowledgeBase for semantic RAG lookups and
 * rememberVisitorContext for personalization and visitor state persistence.
 * Defined per SPECS.md §8.3 and §15 (F-04, F-06).
 */

import { tool } from "ai";
import { z } from "zod";
import { retrieve, type RetrievalResult } from "../rag/retrieve";
import type { VisitorState } from "./system-prompt";

/** Context required by agent tools to interact with environment bindings, SQLite, and DO state. */
export interface AgentToolContext {
  env: Env;
  sql: <T = Record<string, string | number | boolean | null>>(
    strings: TemplateStringsArray,
    ...values: (string | number | boolean | null)[]
  ) => T[];
  getState?: () => VisitorState | undefined;
  setState?: (state: VisitorState) => void;
}

/**
 * Builds the AI SDK tools registry bound to the PortfolioAgent context.
 *
 * @param ctx Context containing worker environment bindings, SQLite interface, and state helpers.
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

    rememberVisitorContext: tool({
      description: `Remember details the visitor has shared about their identity, company, hiring role, or technical interests. Call this once when the visitor introduces themselves, states their company, what role they are hiring for, or specific engineering interests. Never ask for sensitive personal data.`,
      inputSchema: z.object({
        name: z
          .string()
          .max(60)
          .optional()
          .describe("Visitor's name or title if shared"),
        company: z
          .string()
          .max(60)
          .optional()
          .describe("Visitor's company or organization"),
        roleHiringFor: z
          .string()
          .max(60)
          .optional()
          .describe("Specific job position or role the visitor is looking to fill"),
        interests: z
          .array(z.string().max(60))
          .max(5)
          .optional()
          .describe("Technical skills, projects, or topics the visitor is interested in (up to 5 items)"),
      }),
      execute: async ({ name, company, roleHiringFor, interests }) => {
        if (!ctx.getState || !ctx.setState) {
          return { saved: false, error: "State management not available" };
        }

        const currentState = ctx.getState() || {
          visitor: { interests: [] },
          stats: {
            messagesSent: 0,
            firstSeenAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
          },
        };

        const currentVisitor = currentState.visitor || { interests: [] };

        // Helper to sanitize and trim string inputs to prevent prompt injection or formatting anomalies
        const sanitize = (val?: string) => {
          if (!val) return undefined;
          const cleaned = val.replace(/[\r\n\t]+/g, " ").trim();
          return cleaned.slice(0, 60) || undefined;
        };

        const mergedName = sanitize(name) || currentVisitor.name;
        const mergedCompany = sanitize(company) || currentVisitor.company;
        const mergedRole = sanitize(roleHiringFor) || currentVisitor.roleHiringFor;

        // Combine and deduplicate interests (max 5)
        const existingInterests = currentVisitor.interests || [];
        const newInterests = (interests || [])
          .map((i) => sanitize(i))
          .filter((i): i is string => !!i);

        const combinedInterests = Array.from(
          new Set([...existingInterests, ...newInterests])
        ).slice(0, 5);

        const updatedVisitor = {
          name: mergedName,
          company: mergedCompany,
          roleHiringFor: mergedRole,
          interests: combinedInterests,
        };

        ctx.setState({
          ...currentState,
          visitor: updatedVisitor,
        });

        return { saved: true, visitor: updatedVisitor };
      },
    }),
  };
}
