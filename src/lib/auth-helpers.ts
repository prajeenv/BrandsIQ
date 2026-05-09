/**
 * Authentication helpers — founder-gating for admin routes.
 * See docs/MVP_Phase-1/MVP.md Section 13.1, 13.4 (admin UI).
 *
 * Lo-fi MVP gate: a comma-separated list of emails in the FOUNDER_EMAILS env var.
 * Proper RBAC is post-MVP (when multi-user accounts arrive with the Scale tier).
 */

import type { Session } from "next-auth";

function getFounderEmails(): string[] {
  const raw = process.env.FOUNDER_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * Returns true if the session belongs to a founder (email in FOUNDER_EMAILS).
 * Used by middleware to gate /dashboard/admin/* and /api/admin/*, and by route
 * handlers as defense-in-depth.
 */
export function isFounder(session: Session | null | undefined): boolean {
  const email = session?.user?.email?.toLowerCase();
  if (!email) return false;
  return getFounderEmails().includes(email);
}

/**
 * Returns true if the given email is a founder. Used in middleware where we
 * have a JWT token (with email) but not a full Session object.
 */
export function isFounderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getFounderEmails().includes(email.toLowerCase());
}
