/**
 * Embedding helper for Workers AI model @cf/baai/bge-base-en-v1.5.
 * Specified per SPECS.md §4.1, §5.4, and §6.4.
 */

import { EMBEDDING_MODEL } from "../config";

/**
 * Generates 768-dimensional vector embeddings for a list of input texts.
 *
 * @param ai Cloudflare Workers AI binding instance (`env.AI`).
 * @param texts Array of strings to generate embeddings for.
 * @returns Array of 768-dimensional float arrays corresponding to each input text.
 */
export async function embedTexts(
  ai: Ai,
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const response = (await ai.run(EMBEDDING_MODEL, {
    text: texts,
  })) as { data?: number[][] };

  if (!response?.data || !Array.isArray(response.data)) {
    throw new Error(
      `Embedding model ${EMBEDDING_MODEL} failed to return vector data array.`
    );
  }

  return response.data;
}
