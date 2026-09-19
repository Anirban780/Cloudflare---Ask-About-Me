/**
 * Application constants, limits, and retrieval configuration for Ask-About-Me.
 * Defined per SPECS.md §5.4.
 */

/** Maximum characters allowed per markdown chunk. */
export const CHUNK_MAX_CHARS = 900;

/** Character overlap between consecutive chunks within the same section. */
export const CHUNK_OVERLAP_CHARS = 120;

/** Minimum character length for a chunk; chunks shorter than this are dropped. */
export const CHUNK_MIN_CHARS = 40;

/** Number of chunk texts batched per Workers AI embedding call. */
export const EMBED_BATCH_SIZE = 50;

/** Maximum allowable chunks per document; exceeds fail fast during ingestion. */
export const MAX_CHUNKS_PER_DOC = 100;

/** Number of nearest-neighbor vectors requested from Vectorize during query. */
export const TOP_K = 8;

/** Maximum number of retrieved chunks returned to the model context. */
export const MAX_RESULTS = 5;

/** Maximum number of chunks from any single document in a retrieved result set. */
export const MAX_PER_DOC = 2;

/** Minimum cosine similarity score floor for retrieval results (tuned in S8). */
export const MIN_SCORE = 0.5;

/** Hard ceiling on total character count of retrieved text injected into prompts. */
export const MAX_CONTEXT_CHARS = 6000;

/** Maximum number of previous conversation messages provided to the model. */
export const MAX_HISTORY_MESSAGES = 20;

/** Maximum allowable visitor input message length in characters. */
export const MAX_INPUT_CHARS = 1000;

/** Maximum token generation budget for model answers. */
export const MAX_OUTPUT_TOKENS = 600;

/** Maximum iterative multi-step tool execution loops. */
export const MAX_TOOL_STEPS = 4;

/** Rate limit: maximum accepted user messages per visitor per hour. */
export const RATE_LIMIT_PER_HOUR = 30;

/** Cloudflare Workers AI text embedding model identifier (768 dimensions). */
export const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";
