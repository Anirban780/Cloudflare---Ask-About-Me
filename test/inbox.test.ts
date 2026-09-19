/**
 * Unit tests for Owner Inbox message handling (SPECS.md §8.3, §13 F-12).
 * Verifies validation schemas, input bounds, sanitization, and edge cases.
 */

import { describe, it, expect } from "vitest";
import { inboxMessageSchema, sanitizeInboxMessage } from "../src/agent/inbox";

describe("Owner Inbox Messaging (F-12)", () => {
  describe("inboxMessageSchema validation", () => {
    it("accepts a valid message submission", () => {
      const validData = {
        senderName: "Alice Recruiter",
        senderEmail: "alice@acme.corp",
        message: "Hi Anirban, we would love to speak regarding a Senior Cloudflare Engineer role.",
      };

      const result = inboxMessageSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.senderName).toBe("Alice Recruiter");
        expect(result.data.senderEmail).toBe("alice@acme.corp");
      }
    });

    it("rejects invalid email formats", () => {
      const invalidEmailData = {
        senderName: "Bob",
        senderEmail: "not-an-email",
        message: "Hello there!",
      };

      const result = inboxMessageSchema.safeParse(invalidEmailData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("senderEmail");
      }
    });

    it("rejects names longer than 80 characters", () => {
      const oversizedName = {
        senderName: "A".repeat(81),
        senderEmail: "test@example.com",
        message: "Valid message content",
      };

      const result = inboxMessageSchema.safeParse(oversizedName);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("80 characters or fewer");
      }
    });

    it("rejects empty messages", () => {
      const emptyMsg = {
        senderName: "Charlie",
        senderEmail: "charlie@example.com",
        message: "",
      };

      const result = inboxMessageSchema.safeParse(emptyMsg);
      expect(result.success).toBe(false);
    });

    it("rejects messages exceeding 1,000 characters", () => {
      const oversizedMessage = {
        senderName: "David",
        senderEmail: "david@example.com",
        message: "M".repeat(1001),
      };

      const result = inboxMessageSchema.safeParse(oversizedMessage);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("1,000 characters or fewer");
      }
    });
  });

  describe("sanitizeInboxMessage", () => {
    it("strips newline, carriage return, and tab characters from name and email", () => {
      const rawInput = {
        senderName: "Eve\n\tHacker",
        senderEmail: "eve\r\n@acme.corp",
        message: "Hello Anirban,\n\nI have a genuine project question.\nThanks!",
      };

      const sanitized = sanitizeInboxMessage(rawInput);
      expect(sanitized.senderName).toBe("Eve Hacker");
      expect(sanitized.senderEmail).toBe("eve @acme.corp");
      // Newlines in message body are preserved for readability
      expect(sanitized.message).toContain("\n\nI have a genuine project question.");
    });

    it("trims extraneous whitespace from boundaries", () => {
      const rawInput = {
        senderName: "  Frank Miller   ",
        senderEmail: "   frank@example.com   ",
        message: "   Let's connect!   ",
      };

      const sanitized = sanitizeInboxMessage(rawInput);
      expect(sanitized.senderName).toBe("Frank Miller");
      expect(sanitized.senderEmail).toBe("frank@example.com");
      expect(sanitized.message).toBe("Let's connect!");
    });
  });
});
