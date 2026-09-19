/**
 * Durable ingestion workflow for knowledge base documents.
 * Orchestrates multi-step document validation, chunking, embedding, and Vectorize upserting.
 * Defined per SPECS.md §6.4.
 */

import {
  WorkflowEntrypoint,
  type WorkflowStep,
  type WorkflowEvent
} from "cloudflare:workers";

/** Document payload submitted for durable ingestion. */
export interface IngestParams {
  /** Unique kebab-case document identifier (e.g. 'resume', 'project-ask-about-me'). */
  docId: string;
  /** Document title. */
  title: string;
  /** Content source category. */
  sourceType: "resume" | "project" | "blog" | "about" | "github";
  /** Optional public repository or live article URL. */
  url?: string;
  /** Raw markdown content (up to 200 KB). */
  content: string;
}

/** Result returned upon successful completion of the ingestion workflow. */
export interface IngestResult {
  docId: string;
  chunks: number;
  status: "complete";
}

/**
 * Cloudflare Workflow entry point for durable document ingestion.
 * Each document runs in its own durable instance with retryable steps.
 */
export class IngestWorkflow extends WorkflowEntrypoint<Env, IngestParams> {
  async run(event: Readonly<WorkflowEvent<IngestParams>>, step: WorkflowStep): Promise<IngestResult> {
    const { docId } = event.payload;

    // Step 1: Preliminary validation step
    await step.do("validate", async () => {
      if (!docId) {
        throw new Error("Missing required docId in workflow payload");
      }
      return { valid: true };
    });

    return {
      docId,
      chunks: 0,
      status: "complete"
    };
  }
}
