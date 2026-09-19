/**
 * Unit tests for the pure retrieval algorithm.
 * Validates query bounds, score thresholding, document deduplication (MAX_PER_DOC),
 * result limit (MAX_RESULTS), context character budget, and error handling.
 * Defined per SPECS.md §7 and §12.
 */

import { describe, it, expect, vi } from "vitest";
import { retrieve } from "../src/rag/retrieve";
import { MIN_SCORE, MAX_RESULTS, MAX_PER_DOC } from "../src/config";

describe("Retrieval Algorithm (SPECS §7)", () => {
  // Helper to create mock environment
  function createMockEnv(matches: Array<{ id: string; score: number; metadata: Record<string, unknown> }>) {
    const mockAi = {
      run: vi.fn().mockResolvedValue({
        data: [new Array(768).fill(0.1)],
      }),
    } as unknown as Ai;

    const mockVectorize = {
      query: vi.fn().mockResolvedValue({
        matches,
        count: matches.length,
      }),
    } as unknown as VectorizeIndex;

    return { AI: mockAi, VECTORIZE: mockVectorize };
  }

  it("rejects queries shorter than 3 characters with helpful note", async () => {
    const env = createMockEnv([]);
    const res1 = await retrieve(env, { query: "hi" });
    expect(res1.results).toEqual([]);
    expect(res1.note).toContain("at least 3 characters");

    const res2 = await retrieve(env, { query: "  a  " });
    expect(res2.results).toEqual([]);
    expect(res2.note).toContain("at least 3 characters");
  });

  it("rejects queries longer than 300 characters", async () => {
    const env = createMockEnv([]);
    const longQuery = "a".repeat(301);
    const res = await retrieve(env, { query: longQuery });
    expect(res.results).toEqual([]);
    expect(res.note).toContain("exceeds maximum length");
  });

  it("filters out any matches below MIN_SCORE floor (0.5)", async () => {
    const env = createMockEnv([
      {
        id: "chunk-1",
        score: 0.85,
        metadata: { docId: "doc-1", title: "Doc 1", section: "S1", text: "Text 1" },
      },
      {
        id: "chunk-2",
        score: MIN_SCORE - 0.01, // Below threshold
        metadata: { docId: "doc-2", title: "Doc 2", section: "S2", text: "Text 2" },
      },
      {
        id: "chunk-3",
        score: 0.51,
        metadata: { docId: "doc-3", title: "Doc 3", section: "S3", text: "Text 3" },
      },
    ]);

    const res = await retrieve(env, { query: "test query" });
    expect(res.results).toHaveLength(2);
    expect(res.results.map((r) => r.docId)).toEqual(["doc-1", "doc-3"]);
    expect(res.results[0].n).toBe(1);
    expect(res.results[1].n).toBe(2);
  });

  it("enforces MAX_PER_DOC (2) deduplication per document", async () => {
    const env = createMockEnv([
      {
        id: "chunk-1",
        score: 0.95,
        metadata: { docId: "resume", title: "Resume", section: "Intro", text: "Resume part 1" },
      },
      {
        id: "chunk-2",
        score: 0.90,
        metadata: { docId: "resume", title: "Resume", section: "Skills", text: "Resume part 2" },
      },
      {
        id: "chunk-3",
        score: 0.85,
        metadata: { docId: "resume", title: "Resume", section: "Experience", text: "Resume part 3 (should drop)" },
      },
      {
        id: "chunk-4",
        score: 0.80,
        metadata: { docId: "project-1", title: "Project", section: "Overview", text: "Project part 1" },
      },
    ]);

    const res = await retrieve(env, { query: "anirban experience" });
    expect(res.results).toHaveLength(3);
    const resumeCount = res.results.filter((r) => r.docId === "resume").length;
    expect(resumeCount).toBe(MAX_PER_DOC);
    expect(res.results[2].docId).toBe("project-1");
  });

  it("caps total results at MAX_RESULTS (5)", async () => {
    const matches = [];
    for (let i = 1; i <= 8; i++) {
      matches.push({
        id: `chunk-${i}`,
        score: 0.9 - i * 0.02,
        metadata: { docId: `doc-${i}`, title: `Doc ${i}`, section: "Sec", text: `Text ${i}` },
      });
    }

    const env = createMockEnv(matches);
    const res = await retrieve(env, { query: "cloud architecture" });
    expect(res.results).toHaveLength(MAX_RESULTS);
    expect(res.results[0].n).toBe(1);
    expect(res.results[4].n).toBe(5);
  });

  it("trims context from lowest-ranked result upward when MAX_CONTEXT_CHARS is exceeded", async () => {
    // MAX_CONTEXT_CHARS is 6000 chars. Create 3 matches of 2500 chars each (total 7500 > 6000)
    const matches = [
      {
        id: "chunk-1",
        score: 0.9,
        metadata: { docId: "doc-1", title: "Doc 1", section: "Sec", text: "A".repeat(2500) },
      },
      {
        id: "chunk-2",
        score: 0.8,
        metadata: { docId: "doc-2", title: "Doc 2", section: "Sec", text: "B".repeat(2500) },
      },
      {
        id: "chunk-3",
        score: 0.7,
        metadata: { docId: "doc-3", title: "Doc 3", section: "Sec", text: "C".repeat(2500) },
      },
    ];

    const env = createMockEnv(matches);
    const res = await retrieve(env, { query: "deep architecture" });
    // Total chars: 2500 * 2 = 5000 <= 6000. chunk-3 should be trimmed.
    expect(res.results).toHaveLength(2);
    expect(res.results.map((r) => r.docId)).toEqual(["doc-1", "doc-2"]);
  });

  it("gracefully catches Vectorize errors and returns a friendly note", async () => {
    const mockAi = {
      run: vi.fn().mockResolvedValue({ data: [new Array(768).fill(0.1)] }),
    } as unknown as Ai;

    const mockVectorize = {
      query: vi.fn().mockRejectedValue(new Error("Vectorize network timeout")),
    } as unknown as VectorizeIndex;

    const res = await retrieve({ AI: mockAi, VECTORIZE: mockVectorize }, { query: "fail safe test" });
    expect(res.results).toEqual([]);
    expect(res.note).toBe("Knowledge search is temporarily unavailable.");
  });
});
