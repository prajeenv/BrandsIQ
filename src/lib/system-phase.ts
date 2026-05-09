/**
 * Phase flag — controls signup behavior and pricing-page rendering.
 * See docs/MVP_Phase-1/MVP.md Section 2 (Phase transition mechanism).
 *
 * Stored as a Vercel env var (CURRENT_PHASE), not a DB row, because the flag
 * flips once-ever from phase_1 to phase_2 at commercial launch. A redeploy is
 * acceptable for that one-time transition; building a cache + invalidation
 * path for a setting that almost never changes would be over-engineering.
 *
 * Default: "phase_1" (closed beta).
 */

export type SystemPhase = "phase_1" | "phase_2";

export function getCurrentPhase(): SystemPhase {
  const raw = process.env.CURRENT_PHASE?.trim().toLowerCase();
  if (raw === "phase_2") return "phase_2";
  return "phase_1";
}

export function isPhase1(): boolean {
  return getCurrentPhase() === "phase_1";
}

export function isPhase2(): boolean {
  return getCurrentPhase() === "phase_2";
}
