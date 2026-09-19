/**
 * Pure Markdown chunker implementing heading-aware section hierarchy,
 * greedy paragraph packing, sentence splitting, and intra-section overlap.
 * Specified per SPECS.md §6.3.
 */

import {
  CHUNK_MAX_CHARS,
  CHUNK_OVERLAP_CHARS,
  CHUNK_MIN_CHARS,
  MAX_CHUNKS_PER_DOC,
} from "../config";

/** Output chunk structure stored in Vectorize and cited in agent responses. */
export interface Chunk {
  /** Deterministic identifier in the format `<docId>:<index>`. */
  id: string;
  /** Zero-based sequential index across the entire document. */
  index: number;
  /** Heading path, e.g. "Experience > Acme Corp" or "Overview". */
  section: string;
  /** Clean chunk content presented to LLM and stored in metadata. */
  text: string;
  /** Heading-prefixed text passed to embedding model for semantic density. */
  embedText: string;
}

/** Input document representation. */
export interface DocumentInput {
  /** Unique, kebab-case document ID (e.g. "resume", "project-ask-about-me"). */
  docId: string;
  /** Human-readable document title. */
  title: string;
  /** Raw markdown content. */
  content: string;
}

/** Optional customization overrides for the chunker. */
export interface ChunkerOptions {
  /** Maximum character length per chunk. */
  maxChars?: number;
  /** Character overlap between consecutive chunks in the same section. */
  overlapChars?: number;
  /** Minimum character threshold; chunks below this are discarded. */
  minChars?: number;
  /** Hard cap on total generated chunks per document. */
  maxChunks?: number;
}

interface RawSection {
  sectionPath: string;
  content: string;
}

/**
 * Normalizes input markdown content by standardizing line endings,
 * collapsing redundant blank lines, and stripping surrounding whitespace.
 */
function normalizeMarkdown(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Parses markdown into discrete sections split by headings (# to ###).
 * Maintains a hierarchical heading path (e.g. "Experience > Acme Corp").
 * Any text appearing before the first heading is labeled "Overview".
 */
function parseSections(normalizedContent: string): RawSection[] {
  const lines = normalizedContent.split("\n");
  const sections: RawSection[] = [];
  const headingStack: { level: number; text: string }[] = [];

  let currentSectionPath = "Overview";
  let currentLines: string[] = [];

  const flushSection = () => {
    const text = currentLines.join("\n").trim();
    if (text.length > 0) {
      sections.push({
        sectionPath: currentSectionPath,
        content: text,
      });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushSection();

      const level = headingMatch[1].length;
      const headingText = headingMatch[2].trim();

      // Pop headings at same or deeper level
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }
      headingStack.push({ level, text: headingText });

      currentSectionPath = headingStack.map((h) => h.text).join(" > ");
    } else {
      currentLines.push(line);
    }
  }

  flushSection();
  return sections;
}

/**
 * Splits a section's text into logical paragraphs on double newlines.
 * Keeps consecutive list items together unless exceeding chunk limits.
 */
function splitIntoParagraphs(sectionText: string): string[] {
  const rawParagraphs = sectionText.split(/\n\n+/);
  const result: string[] = [];

  for (const p of rawParagraphs) {
    const trimmed = p.trim();
    if (trimmed.length > 0) {
      result.push(trimmed);
    }
  }

  return result;
}

/**
 * Splits an oversized string on sentence boundaries (`. `, `! `, `? `).
 * If a single sentence still exceeds maxChars, cleanly splits on word boundaries.
 * Guarantees never cutting in the middle of a word.
 */
function splitOversizedParagraph(paragraph: string, maxChars: number): string[] {
  if (paragraph.length <= maxChars) {
    return [paragraph];
  }

  // Split by sentences using lookbehind-like punctuation boundary
  const rawSentences = paragraph.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [paragraph];
  const units: string[] = [];

  for (const s of rawSentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxChars) {
      units.push(trimmed);
    } else {
      // Split on word boundaries
      const words = trimmed.split(/\s+/);
      let currentWordChunk = "";

      for (const word of words) {
        if (!currentWordChunk) {
          currentWordChunk = word;
        } else if ((currentWordChunk + " " + word).length <= maxChars) {
          currentWordChunk += " " + word;
        } else {
          units.push(currentWordChunk);
          currentWordChunk = word;
        }
      }

      if (currentWordChunk) {
        units.push(currentWordChunk);
      }
    }
  }

  return units;
}

/**
 * Computes an overlap string from the end of the previous chunk text,
 * aligning cleanly to a word boundary.
 */
function extractWordBoundaryOverlap(prevText: string, targetOverlapChars: number): string {
  if (!prevText || targetOverlapChars <= 0) return "";

  if (prevText.length <= targetOverlapChars) {
    return prevText;
  }

  const rawSlice = prevText.slice(-targetOverlapChars);
  // Align to first space after boundary to avoid partial words
  const spaceIdx = rawSlice.indexOf(" ");
  if (spaceIdx !== -1 && spaceIdx < rawSlice.length - 1) {
    return rawSlice.slice(spaceIdx + 1).trim();
  }

  return rawSlice.trim();
}

/**
 * Chunks a markdown document into semantic chunks suitable for embedding and retrieval.
 *
 * Properties guaranteed:
 * 1. Deterministic output for identical inputs.
 * 2. No chunk exceeds maxChars; no chunk is shorter than minChars.
 * 3. Every non-trivial sentence appears in at least one chunk.
 * 4. Hierarchical section heading paths preserved.
 * 5. Overlap never crosses section boundaries.
 * 6. Documents without headings chunk under "Overview".
 * 7. Long paragraphs split without breaking words.
 * 8. Empty or whitespace-only inputs return empty array.
 * 9. Enforces maxChunks cap.
 *
 * @param doc Document input with docId, title, and markdown content.
 * @param opts Optional chunker configuration overrides.
 * @returns Array of structured Chunk objects.
 */
export function chunkMarkdown(
  doc: DocumentInput,
  opts?: ChunkerOptions
): Chunk[] {
  const maxChars = opts?.maxChars ?? CHUNK_MAX_CHARS;
  const overlapChars = opts?.overlapChars ?? CHUNK_OVERLAP_CHARS;
  const minChars = opts?.minChars ?? CHUNK_MIN_CHARS;
  const maxChunks = opts?.maxChunks ?? MAX_CHUNKS_PER_DOC;

  const normalized = normalizeMarkdown(doc.content);
  if (!normalized) {
    return [];
  }

  const sections = parseSections(normalized);
  const rawChunks: { section: string; text: string }[] = [];

  for (const sec of sections) {
    const paragraphs = splitIntoParagraphs(sec.content);
    if (paragraphs.length === 0) continue;

    let currentChunkText = "";
    let lastChunkInThisSection = "";

    const finalizeCurrentChunk = () => {
      const trimmed = currentChunkText.trim();
      if (trimmed.length >= minChars) {
        rawChunks.push({
          section: sec.sectionPath,
          text: trimmed,
        });
        lastChunkInThisSection = trimmed;
      }
      currentChunkText = "";
    };

    for (const paragraph of paragraphs) {
      // Split paragraph if it exceeds maximum character budget
      const parts = splitOversizedParagraph(paragraph, maxChars);

      for (const part of parts) {
        if (!currentChunkText) {
          // If starting a subsequent chunk in the same section, prepend overlap
          if (lastChunkInThisSection && overlapChars > 0) {
            const overlap = extractWordBoundaryOverlap(lastChunkInThisSection, overlapChars);
            if (overlap && (overlap + "\n\n" + part).length <= maxChars) {
              currentChunkText = overlap + "\n\n" + part;
              continue;
            }
          }
          currentChunkText = part;
        } else {
          const candidate = currentChunkText + "\n\n" + part;
          if (candidate.length <= maxChars) {
            currentChunkText = candidate;
          } else {
            finalizeCurrentChunk();

            // Prepare next chunk with overlap if possible
            if (lastChunkInThisSection && overlapChars > 0) {
              const overlap = extractWordBoundaryOverlap(lastChunkInThisSection, overlapChars);
              if (overlap && (overlap + "\n\n" + part).length <= maxChars) {
                currentChunkText = overlap + "\n\n" + part;
                continue;
              }
            }
            currentChunkText = part;
          }
        }
      }
    }

    finalizeCurrentChunk();
  }

  // Safety check: chunk count limit
  if (rawChunks.length > maxChunks) {
    throw new Error(
      `Document "${doc.docId}" exceeded maximum chunk limit of ${maxChunks} chunks (produced ${rawChunks.length}).`
    );
  }

  // Assign deterministic IDs and embedText
  return rawChunks.map((c, index) => ({
    id: `${doc.docId}:${index}`,
    index,
    section: c.section,
    text: c.text,
    embedText: `${doc.title} — ${c.section}\n${c.text}`,
  }));
}
