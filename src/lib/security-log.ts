/**
 * Non-blocking security-event logger.
 *
 * Wraps the SecurityLog write so callers don't have to repeat the
 * detection→persist boilerplate or the swallow-all-errors guard. Generation
 * must never fail because audit logging failed.
 *
 * Spec: docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md §10.6.
 */

import { prisma } from "@/lib/prisma";
import { detectInjectionAttempt } from "@/lib/ai/sanitize";

/** Coarse event categories for SecurityLog.eventType. */
export const SecurityEventTypes = {
  INJECTION_ATTEMPT: "injection_attempt",
} as const;

/** First N chars retained in SecurityLog.preview — keeps the GDPR surface small. */
const PREVIEW_MAX_CHARS = 200;

interface LogIfInjectionAttemptArgs {
  text: string;
  userId: string | null;
  fieldName: string;
}

/**
 * Run pattern detection on `text` and, if any patterns match, write a
 * SecurityLog row. Returns the list of matched-pattern source strings (empty
 * array ⇒ no detection). All errors are swallowed and logged to console —
 * callers do not need to wrap this in try/catch.
 */
export async function logIfInjectionAttempt(
  args: LogIfInjectionAttemptArgs
): Promise<string[]> {
  const { text, userId, fieldName } = args;
  const matched = detectInjectionAttempt(text);
  if (matched.length === 0) return [];

  try {
    await prisma.securityLog.create({
      data: {
        userId,
        eventType: SecurityEventTypes.INJECTION_ATTEMPT,
        fieldName,
        matchedPatterns: matched,
        preview: text.slice(0, PREVIEW_MAX_CHARS),
      },
    });
  } catch (error) {
    // Audit logging must never break the user-facing flow. Log and move on.
    console.error("Failed to write SecurityLog:", error);
  }

  return matched;
}
