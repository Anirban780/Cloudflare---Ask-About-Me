/**
 * Pure guardrail functions for rate limiting, input length validation,
 * and static UI message streaming responses.
 * Defined per SPECS.md §11, §12.1, and §15 (F-09).
 */

import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { MAX_INPUT_CHARS } from "../config";

/** Result of a rate limit decision. */
export interface RateDecision {
  /** Whether the message is allowed through to the model. */
  allowed: boolean;
  /** Count of active messages within the sliding window. */
  count: number;
  /** Suggested wait time in seconds before the next message will be accepted. */
  retryAfterSeconds?: number;
}

/** Result of an input length validation check. */
export interface LengthCheckResult {
  /** Whether the message length is within limits. */
  ok: boolean;
  /** User-facing explanation if the message was rejected. */
  reason?: string;
}

/**
 * Evaluates whether a request conforms to the sliding window rate limit.
 * Pure function with no database dependencies, enabling isolated unit testing.
 *
 * @param events Array of epoch millisecond timestamps of previously accepted messages.
 * @param now Current epoch millisecond timestamp.
 * @param limit Maximum allowed messages within the window.
 * @param windowMs Duration of sliding window in milliseconds (default: 1 hour = 3,600,000 ms).
 * @returns RateDecision object detailing allowance, active count, and retry interval.
 */
export function decideRate(
  events: number[],
  now: number,
  limit: number,
  windowMs = 3600000
): RateDecision {
  const windowStart = now - windowMs;
  // Retain only events within the current sliding window
  const activeEvents = events.filter((ts) => ts >= windowStart && ts <= now);

  if (activeEvents.length >= limit) {
    const oldestInWindow = Math.min(...activeEvents);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestInWindow + windowMs - now) / 1000)
    );

    return {
      allowed: false,
      count: activeEvents.length,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    count: activeEvents.length,
  };
}

/**
 * Validates that an incoming user message does not exceed the maximum character budget.
 *
 * @param text The input message text to check.
 * @param maxChars Maximum allowable character count (default: MAX_INPUT_CHARS = 1,000).
 * @returns LengthCheckResult indicating validity or a friendly refusal notice.
 */
export function checkInputLength(
  text: string,
  maxChars = MAX_INPUT_CHARS
): LengthCheckResult {
  if (typeof text !== "string") {
    return { ok: true };
  }

  if (text.length > maxChars) {
    return {
      ok: false,
      reason: `Your message is ${text.length} characters long, which exceeds the limit of ${maxChars} characters. Please shorten your message and try again.`,
    };
  }

  return { ok: true };
}

/**
 * Creates an SSE UI message stream response containing static assistant text,
 * allowing instant friendly guard refusals without invoking the LLM.
 *
 * @param text The static notification or refusal message.
 * @returns Streaming HTTP Response compatible with useAgentChat.
 */
export function createStaticUIMessageResponse(text: string): Response {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "text-delta", id: "guard-notice", delta: text });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
