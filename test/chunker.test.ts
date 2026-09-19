/**
 * Unit tests for Markdown chunker covering all 9 required properties.
 * Specified per SPECS.md §6.3 and §12.1.
 */

import { describe, it, expect } from "vitest";
import { chunkMarkdown } from "../src/rag/chunker";
import {
  CHUNK_MAX_CHARS,
  CHUNK_MIN_CHARS,
  CHUNK_OVERLAP_CHARS,
  MAX_CHUNKS_PER_DOC,
} from "../src/config";

describe("chunkMarkdown", () => {
  // Sample markdown with nested headings and multiple paragraphs
  const sampleMarkdown = `# About Anirban Sarkar

Anirban Sarkar is an engineer specializing in Software, Data, Cloud, and DevOps engineering.
He designs and builds scalable distributed systems, data processing pipelines, and Cloudflare-native applications.

## Technical Experience

### Distributed Systems & Cloud
At previous roles, Anirban built low-latency distributed services on modern edge runtimes.
He leveraged Cloudflare Workers, Durable Objects, Vectorize, and Workflows for autonomous multi-agent pipelines.
These systems processed millions of real-time transactions with sub-second latencies and strict uptime SLAs.

### Data Engineering & Infrastructure
Anirban has extensive experience engineering ETL pipelines and real-time streaming architectures.
He works with Apache Kafka, ClickHouse, PostgreSQL, and modern columnar storage solutions.
Data hygiene, idempotency, and automated test coverage are core tenets of his engineering philosophy.

## Projects

### Ask-About-Me Concierge
A Cloudflare-native portfolio AI agent running on Workers AI, Durable Objects, and Vectorize.
Features vector search, citation grounding, and per-visitor persistent memory.
`;

  // Property 1: Deterministic
  it("Property 1: produces deterministic chunks and IDs for identical input", () => {
    const doc = {
      docId: "resume-anirban",
      title: "Resume",
      content: sampleMarkdown,
    };

    const run1 = chunkMarkdown(doc);
    const run2 = chunkMarkdown(doc);

    expect(run1).toEqual(run2);
    expect(run1.length).toBeGreaterThan(0);
    run1.forEach((chunk, i) => {
      expect(chunk.id).toBe(`resume-anirban:${i}`);
      expect(chunk.index).toBe(i);
    });
  });

  // Property 2: Chunk size bounds (≤ CHUNK_MAX_CHARS, ≥ CHUNK_MIN_CHARS)
  it("Property 2: no chunk exceeds CHUNK_MAX_CHARS and none is shorter than CHUNK_MIN_CHARS", () => {
    const doc = {
      docId: "test-doc",
      title: "Test Bounds",
      content: sampleMarkdown,
    };

    const chunks = chunkMarkdown(doc);
    expect(chunks.length).toBeGreaterThan(0);

    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(CHUNK_MAX_CHARS);
      expect(chunk.text.length).toBeGreaterThanOrEqual(CHUNK_MIN_CHARS);
      expect(chunk.embedText.startsWith(doc.title)).toBe(true);
    }
  });

  // Property 3: Every non-trivial sentence appears in at least one chunk
  it("Property 3: every non-trivial sentence in source appears in at least one chunk", () => {
    const sentences = [
      "Anirban Sarkar is an engineer specializing in Software, Data, Cloud, and DevOps engineering.",
      "These systems processed millions of real-time transactions with sub-second latencies and strict uptime SLAs.",
      "Data hygiene, idempotency, and automated test coverage are core tenets of his engineering philosophy.",
      "A Cloudflare-native portfolio AI agent running on Workers AI, Durable Objects, and Vectorize.",
    ];

    const doc = {
      docId: "sentences-test",
      title: "Sentence Check",
      content: sampleMarkdown,
    };

    const chunks = chunkMarkdown(doc);
    const combinedChunkText = chunks.map((c) => c.text).join("\n---\n");

    for (const sentence of sentences) {
      expect(combinedChunkText).toContain(sentence);
    }
  });

  // Property 4: Section path nesting for #, ##, ###
  it("Property 4: correctly tracks nested heading paths", () => {
    const doc = {
      docId: "nesting-test",
      title: "Heading Nesting",
      content: `# Root Topic

Initial overview content that meets the minimum length requirement for chunking.

## Category A

Category A description paragraph with enough text to be included in chunks.

### Subcategory 1

Subcategory 1 detailed technical documentation paragraph with full sentences.

## Category B

Category B description paragraph resetting category level cleanly.
`,
    };

    const chunks = chunkMarkdown(doc);
    const sectionPaths = chunks.map((c) => c.section);

    expect(sectionPaths).toContain("Root Topic");
    expect(sectionPaths).toContain("Root Topic > Category A");
    expect(sectionPaths).toContain("Root Topic > Category A > Subcategory 1");
    expect(sectionPaths).toContain("Root Topic > Category B");
  });

  // Property 5: Overlap never crosses section boundaries
  it("Property 5: overlap never crosses section boundaries", () => {
    // Generate two sections, each with enough text to trigger multiple chunks in section 1
    const longParagraph = "Anirban designed high-throughput distributed architectures using Cloudflare Workers. ".repeat(15);
    const doc = {
      docId: "overlap-test",
      title: "Section Overlap",
      content: `# Section Alpha

${longParagraph}

# Section Beta

This is the start of Section Beta with completely independent topic content.
`,
    };

    const chunks = chunkMarkdown(doc, { maxChars: 500, overlapChars: 100 });
    const betaChunks = chunks.filter((c) => c.section === "Section Beta");

    expect(betaChunks.length).toBeGreaterThan(0);
    for (const betaChunk of betaChunks) {
      expect(betaChunk.text).not.toContain("high-throughput");
      expect(betaChunk.text).not.toContain("distributed architectures");
    }
  });

  // Property 6: Heading-less documents chunk under "Overview"
  it("Property 6: documents without headings chunk under 'Overview'", () => {
    const doc = {
      docId: "no-heading",
      title: "Plain Doc",
      content: `This is a completely heading-less document that contains several paragraphs of text.
It explains software design patterns, edge computing fundamentals, and autonomous agent coordination.

The second paragraph discusses state persistence using Durable Objects SQLite and vector storage.
Everything in this document should belong to the Overview section.`,
    };

    const chunks = chunkMarkdown(doc);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.section).toBe("Overview");
      expect(chunk.embedText).toContain("Plain Doc — Overview");
    }
  });

  // Property 7: Very long paragraph splits without breaking words
  it("Property 7: a single very long paragraph splits cleanly without breaking words", () => {
    // Generate a long paragraph with distinct words
    const words = ["distributed", "scalability", "concurrency", "optimization", "infrastructure", "observability"];
    let longText = "";
    while (longText.length < 2500) {
      const w = words[Math.floor(Math.random() * words.length)];
      longText += w + " ";
    }

    const doc = {
      docId: "long-para",
      title: "Long Paragraph",
      content: `# Stress Test\n\n${longText.trim()}`,
    };

    const chunks = chunkMarkdown(doc, { maxChars: 400 });
    expect(chunks.length).toBeGreaterThan(1);

    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(400);
      // Ensure words are not sliced: check that each word in chunk is a valid dictionary entry from words list
      const chunkWords = chunk.text.split(/\s+/);
      for (const cw of chunkWords) {
        expect(words).toContain(cw);
      }
    }
  });

  // Property 8: Empty or whitespace-only returns empty array
  it("Property 8: empty or whitespace-only content returns []", () => {
    expect(chunkMarkdown({ docId: "e1", title: "Empty", content: "" })).toEqual([]);
    expect(chunkMarkdown({ docId: "e2", title: "Whitespace", content: "   \n\n\t  \r\n  " })).toEqual([]);
  });

  // Property 9: Exceeding maxChunks throws an error
  it("Property 9: fails fast with a clear error when chunk count exceeds maxChunks", () => {
    const repeated = "This is a paragraph of text designed to produce multiple chunks. ".repeat(20);
    const doc = {
      docId: "overflow-test",
      title: "Overflow",
      content: repeated,
    };

    // Set maxChunks threshold artificially low (e.g. 1) to test safety enforcement
    expect(() =>
      chunkMarkdown(doc, { maxChars: 100, minChars: 20, maxChunks: 2 })
    ).toThrowError(/exceeded maximum chunk limit/);
  });
});
