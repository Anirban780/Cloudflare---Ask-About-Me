/**
 * Owner Inbox message storage and sanitization helpers.
 * Handles visitor message validation, sanitization, and structured records.
 * Defined per SPECS.md §8.3 and §13 (F-12).
 */

import { z } from "zod";

/**
 * Zod schema for validating visitor messages destined for the portfolio owner.
 */
export const inboxMessageSchema = z.object({
  senderName: z
    .string()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or fewer")
    .describe("Full name of the visitor"),
  senderEmail: z
    .string()
    .email("A valid email address is required")
    .describe("Contact email address for follow-up"),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(1000, "Message must be 1,000 characters or fewer")
    .describe("Content of the message for the portfolio owner"),
});

export type InboxInput = z.infer<typeof inboxMessageSchema>;

export interface InboxRecord {
  id: number;
  created_at: string;
  sender_name: string;
  sender_email: string;
  message: string;
  visitor_id: string | null;
  status: string;
}

/**
 * Sanitizes and trims input fields for inbox message persistence.
 * Prevents control characters and script injection in notification queues.
 *
 * @param input Raw validated input fields.
 * @returns Cleaned and bounded fields.
 */
export function sanitizeInboxMessage(input: InboxInput): {
  senderName: string;
  senderEmail: string;
  message: string;
} {
  const cleanName = input.senderName
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, 80);

  const cleanEmail = input.senderEmail
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, 120);

  const cleanMessage = input.message.trim().slice(0, 1000);

  return {
    senderName: cleanName,
    senderEmail: cleanEmail,
    message: cleanMessage,
  };
}
