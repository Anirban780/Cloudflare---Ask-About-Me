/**
 * Durable ingestion workflow for knowledge base documents.
 * Orchestrates multi-step validation, markdown chunking, stale cleanup,
 * batch embedding with bge-base-en-v1.5, and atomic Vectorize upserts.
 * Defined per SPECS.md §6.4.
 */

import {
  WorkflowEntrypoint,
  type WorkflowStep,
  type WorkflowEvent,
} from "cloudflare:workers";
import { chunkMarkdown, type Chunk } from "../rag/chunker";
import { embedTexts } from "../rag/embed";
import { EMBED_BATCH_SIZE, MAX_CHUNKS_PER_DOC } from "../config";

/** Document payload submitted for durable ingestion. */
export interface IngestParams {
  /** Unique kebab-case document identifier (e.g. 'resume', 'project-ask-about-me'). */
  docId: string;
  /** Human-readable document title. */
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
  batches: number;
  status: "complete";
}

/**
 * Cloudflare Workflow entry point for durable document ingestion.
 * Each document runs in its own durable instance with retryable steps.
 * Idempotency is guaranteed by deterministic chunk IDs and upsert semantics.
 */
export class IngestWorkflow extends WorkflowEntrypoint<Env, IngestParams> {
  async run(
    event: Readonly<WorkflowEvent<IngestParams>>,
    step: WorkflowStep
  ): Promise<IngestResult> {
    const { docId, title, sourceType, url, content } = event.payload;

    // Step 1: Document validation
    await step.do("validate", async () => {
      if (!docId || !/^[a-z0-9][a-z0-9-]{1,80}$/.test(docId)) {
        throw new Error(
          `Invalid docId "${docId}": must match /^[a-z0-9][a-z0-9-]{1,80}$/`
        );
      }
      if (!title || title.trim().length === 0) {
        throw new Error("Missing required document title");
      }
      if (!content || content.trim().length === 0) {
        throw new Error("Missing required document content");
      }
      if (content.length > 200 * 1024) {
        throw new Error(`Content exceeds 200 KB ceiling (${content.length} bytes)`);
      }
      return { valid: true };
    });

    // Step 2: Chunk markdown
    const chunks = await step.do("chunk", async (): Promise<Chunk[]> => {
      const c = chunkMarkdown({ docId, title, content });
      if (c.length === 0) {
        throw new Error(`Chunking document "${docId}" produced 0 valid chunks.`);
      }
      if (c.length > MAX_CHUNKS_PER_DOC) {
        throw new Error(
          `Document "${docId}" produced ${c.length} chunks, exceeding limit of ${MAX_CHUNKS_PER_DOC}.`
        );
      }
      return c;
    });

    // Step 3: Delete stale chunks from prior versions of this document
    await step.do(
      "delete-stale",
      {
        retries: {
          limit: 3,
          delay: "3 seconds",
          backoff: "exponential",
        },
      },
      async () => {
        const potentialIds: string[] = [];
        for (let i = 0; i < MAX_CHUNKS_PER_DOC; i++) {
          potentialIds.push(`${docId}:${i}`);
        }

        // Delete in batches of 100
        for (let i = 0; i < potentialIds.length; i += 100) {
          const batch = potentialIds.slice(i, i + 100);
          await this.env.VECTORIZE.deleteByIds(batch);
        }

        return { cleaned: true };
      }
    );

    // Step 4: Batch embed and upsert into Vectorize
    // Embed and upsert share a step to keep vector arrays within step persistence limits
    const numBatches = Math.ceil(chunks.length / EMBED_BATCH_SIZE);

    for (let i = 0; i < numBatches; i++) {
      const batch = chunks.slice(i * EMBED_BATCH_SIZE, (i + 1) * EMBED_BATCH_SIZE);

      await step.do(
        `embed-upsert-${i}`,
        {
          retries: {
            limit: 3,
            delay: "5 seconds",
            backoff: "exponential",
          },
          timeout: "2 minutes",
        },
        async () => {
          // 1. Generate embeddings using Workers AI
          const embedTextsInput = batch.map((b) => b.embedText);
          const vectors = await embedTexts(this.env.AI, embedTextsInput);

          if (vectors.length !== batch.length) {
            throw new Error(
              `Embedding count mismatch: expected ${batch.length}, received ${vectors.length}`
            );
          }

          // 2. Upsert vectors with chunk text metadata
          await this.env.VECTORIZE.upsert(
            batch.map((b, j) => ({
              id: b.id,
              values: vectors[j],
              metadata: {
                docId,
                title,
                sourceType,
                section: b.section,
                url: url || "",
                chunkIndex: b.index,
                text: b.text,
              },
            }))
          );

          // Return count only to avoid serializing large vector float arrays in step output
          return { batchIndex: i, count: batch.length };
        }
      );
    }

    // Step 5: Finalize and return execution summary
    return await step.do("finalize", async (): Promise<IngestResult> => {
      return {
        docId,
        chunks: chunks.length,
        batches: numBatches,
        status: "complete",
      };
    });
  }
}
