/**
 * Unit tests for guardrails: rate limiting (decideRate) and message input caps (checkInputLength).
 * Defined per SPECS.md §11, §12.1, and §15 (F-09).
 */

import { describe, it, expect } from "vitest";
import { decideRate, checkInputLength } from "../src/agent/guards";
import { RATE_LIMIT_PER_HOUR, MAX_INPUT_CHARS } from "../src/config";

describe("Guardrails Unit Tests (SPECS §11 & §12.1)", () => {
  const ONE_HOUR_MS = 3600000;

  describe("Rate Limiter (decideRate)", () => {
    it("allows messages when event history is empty (0 events)", () => {
      const now = 10000000;
      const decision = decideRate([], now, RATE_LIMIT_PER_HOUR);

      expect(decision.allowed).toBe(true);
      expect(decision.count).toBe(0);
      expect(decision.retryAfterSeconds).toBeUndefined();
    });

    it("allows messages at the limit - 1 boundary", () => {
      const now = 10000000;
      // 29 events in the past 30 minutes
      const events = Array.from({ length: RATE_LIMIT_PER_HOUR - 1 }, (_, i) => now - (i + 1) * 60000);

      const decision = decideRate(events, now, RATE_LIMIT_PER_HOUR);
      expect(decision.allowed).toBe(true);
      expect(decision.count).toBe(RATE_LIMIT_PER_HOUR - 1);
    });

    it("refuses messages exactly at the limit boundary with retry estimate", () => {
      const now = 10000000;
      // Exactly 30 events in the past 30 minutes, oldest event 30 minutes ago (1800s)
      const oldestTs = now - 30 * 60000;
      const events = [oldestTs];
      for (let i = 1; i < RATE_LIMIT_PER_HOUR; i++) {
        events.push(now - i * 30000);
      }

      const decision = decideRate(events, now, RATE_LIMIT_PER_HOUR);
      expect(decision.allowed).toBe(false);
      expect(decision.count).toBe(RATE_LIMIT_PER_HOUR);
      // Window expires at oldestTs + 3600000 = now + 1800000 ms -> 1800 seconds
      expect(decision.retryAfterSeconds).toBe(1800);
    });

    it("refuses messages when events exceed the limit", () => {
      const now = 10000000;
      const events = Array.from({ length: RATE_LIMIT_PER_HOUR + 5 }, (_, i) => now - (i + 1) * 10000);

      const decision = decideRate(events, now, RATE_LIMIT_PER_HOUR);
      expect(decision.allowed).toBe(false);
      expect(decision.count).toBe(RATE_LIMIT_PER_HOUR + 5);
      expect(decision.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("allows messages after sliding window drops events older than 1 hour", () => {
      const now = 10000000;
      // 30 events that occurred 65 minutes ago (older than 1 hour = 60 minutes)
      const expiredEvents = Array.from(
        { length: RATE_LIMIT_PER_HOUR },
        (_, i) => now - ONE_HOUR_MS - (i + 1) * 60000
      );

      const decision = decideRate(expiredEvents, now, RATE_LIMIT_PER_HOUR);
      expect(decision.allowed).toBe(true);
      expect(decision.count).toBe(0);
    });

    it("accurately handles mixed old and active events", () => {
      const now = 10000000;
      // 20 expired events + 10 active events = 10 active events (< 30)
      const expired = Array.from({ length: 20 }, (_, i) => now - ONE_HOUR_MS - (i + 1) * 10000);
      const active = Array.from({ length: 10 }, (_, i) => now - (i + 1) * 60000);

      const decision = decideRate([...expired, ...active], now, RATE_LIMIT_PER_HOUR);
      expect(decision.allowed).toBe(true);
      expect(decision.count).toBe(10);
    });
  });

  describe("Input Length Check (checkInputLength)", () => {
    it("accepts inputs below MAX_INPUT_CHARS", () => {
      const text = "What distributed systems projects has Anirban worked on?";
      const result = checkInputLength(text);
      expect(result.ok).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("accepts inputs at exactly the MAX_INPUT_CHARS boundary", () => {
      const text = "a".repeat(MAX_INPUT_CHARS);
      const result = checkInputLength(text);
      expect(result.ok).toBe(true);
    });

    it("rejects inputs exceeding the MAX_INPUT_CHARS boundary (e.g. 1001 chars)", () => {
      const text = "a".repeat(MAX_INPUT_CHARS + 1);
      const result = checkInputLength(text);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("1001 characters");
      expect(result.reason).toContain("limit of 1000");
    });

    it("rejects 1500-character input bait (SPECS §12.3 test 8)", () => {
      const baitText = "x".repeat(1500);
      const result = checkInputLength(baitText);
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("1500 characters");
      expect(result.reason).toContain("exceeds the limit");
    });
  });
});
