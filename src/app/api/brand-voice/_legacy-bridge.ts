/**
 * Brand voice redesign iter 3 ⇄ iter 6 bridge.
 *
 * Iter 3 reshaped the `brand_voices` table to the V2 columns (tone V2 keys,
 * style_guidelines / sample_responses JSONB, formality dropped, new
 * Personalization + Contact-and-sign-off columns). Iter 6 will rewrite the
 * brand voice form to consume the V2 shape directly.
 *
 * Between those two deploys this bridge lets the unchanged legacy form
 * (which expects `{tone: legacy-key, formality, keyPhrases, styleNotes:
 * JSON-string, sampleResponses: string[]}`) keep working against the V2
 * columns:
 *
 *   - `fromLegacyForm()` accepts the form's PUT payload and converts it
 *     to a V2 column write.
 *   - `toLegacyShape()` reads a V2 row and projects it back to the legacy
 *     response shape the form's `fetchBrandVoice()` expects.
 *
 * Delete this file in iter 6 when:
 *   - The form sends V2 payloads directly.
 *   - The route validates via `brandVoiceSchemaV2` and returns V2 shape.
 *
 * Everything here is pure — no prisma, no I/O — so the bridge is trivially
 * unit-testable.
 */

import {
  BRAND_VOICE_TONES_V2,
  DEFAULT_BRAND_VOICE_TONE_V2,
  LEGACY_TONE_TO_V2,
  type BrandVoiceToneV2,
} from "@/lib/constants";

/** Legacy tone keys accepted by the existing brand voice form. */
export type LegacyTone = "professional" | "friendly" | "casual" | "empathetic";

/**
 * Reverse mapping from V2 → legacy keys for the bridge's GET path.
 * Note this is intentionally lossy:
 *   - "polished_formal" has no legacy equivalent (the legacy enum only had
 *     "professional"/"friendly"/"casual"/"empathetic"); we map it to
 *     "professional" as the nearest match for the legacy form's tone
 *     selector. The user's stored V2 value is unchanged; only the legacy
 *     projection is approximate.
 *   - Both "friendly_professional" sources (legacy "friendly" + legacy
 *     "professional") collapse to "professional" on the way back, which is
 *     fine — the legacy form just needs a key it can render.
 *
 * Iter 6 deletes this entire map.
 */
const V2_TO_LEGACY_TONE: Record<BrandVoiceToneV2, LegacyTone> = {
  warm_casual: "casual",
  friendly_professional: "professional",
  polished_formal: "professional",
  empathetic_attentive: "empathetic",
};

const V2_TONE_SET = new Set<string>(BRAND_VOICE_TONES_V2);

/** Map a legacy form tone string to its V2 key, defending against unknowns. */
export function legacyToneToV2(raw: string): BrandVoiceToneV2 {
  if (V2_TONE_SET.has(raw)) return raw as BrandVoiceToneV2;
  return LEGACY_TONE_TO_V2[raw] ?? DEFAULT_BRAND_VOICE_TONE_V2;
}

/** Map a V2 tone key to a legacy tone string for the form's tone selector. */
export function v2ToneToLegacy(raw: string): LegacyTone {
  if (raw in V2_TO_LEGACY_TONE) return V2_TO_LEGACY_TONE[raw as BrandVoiceToneV2];
  return "professional";
}

/**
 * Parse the legacy form's `styleNotes` string into a `string[]` ready for
 * the V2 `style_guidelines` JSONB column.
 *
 * The form's `styleNotesToString` helper does `JSON.stringify(array)` on
 * save — that's the headline JSON-render bug the redesign fixes. We undo
 * it on the way into the V2 column. Falls back to newline-split for the
 * older pre-JSON form.
 */
export function parseLegacyStyleNotes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim());
    }
  } catch {
    // Not JSON — fall through to newline split.
  }
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Inverse of parseLegacyStyleNotes: serialise a V2 `string[]` back into the
 * legacy form's expected `styleNotes` string (JSON-stringified array). The
 * form will JSON.parse it on receipt — we round-trip the headline bug
 * faithfully so the form doesn't break.
 */
export function serialiseStyleGuidelinesForLegacy(items: string[]): string | null {
  if (!items.length) return null;
  return JSON.stringify(items);
}

/**
 * Legacy form payload accepted by `PUT /api/brand-voice` while the bridge is
 * in place. Matches the existing `brandVoiceSchema`.
 */
export interface LegacyBrandVoicePayload {
  tone: string;
  formality: number;
  keyPhrases?: string[];
  styleNotes?: string | null;
  sampleResponses?: string[];
}

/** Database row shape for the V2 `brand_voices` row (Prisma returns this). */
export interface V2BrandVoiceRow {
  id: string;
  tone: string;
  keyPhrases: string[];
  styleGuidelines: unknown; // JSONB → unknown until normalised
  sampleResponses: unknown; // JSONB → unknown until normalised
  acknowledgeNamedStaff: boolean;
  acknowledgeOccasions: boolean;
  salutationPattern: string;
  signoffLines: string;
  negativeReviewEmailEnabled: boolean;
  negativeReviewFraming: string;
  negativeReviewFramingCustom: string | null;
  replyToEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** V2 columns that PUT writes back to the DB after applying the legacy payload. */
export interface V2WritePayload {
  tone: BrandVoiceToneV2;
  keyPhrases: string[];
  styleGuidelines: string[];
  sampleResponses: Array<{ ratingContext: "any" | 1 | 2 | 3 | 4 | 5; responseText: string }>;
}

/**
 * Convert a legacy form PUT payload into the V2 column values that should
 * be persisted. Only writes the columns the legacy form knows about — the
 * new V2 columns (toggles, sign-off, etc.) keep their DB defaults until
 * iter 6 rewires the form.
 */
export function fromLegacyForm(payload: LegacyBrandVoicePayload): V2WritePayload {
  return {
    tone: legacyToneToV2(payload.tone),
    keyPhrases: payload.keyPhrases ?? [],
    styleGuidelines: parseLegacyStyleNotes(payload.styleNotes),
    sampleResponses: (payload.sampleResponses ?? [])
      .map((text) => (typeof text === "string" ? text.trim() : ""))
      .filter((text) => text.length > 0)
      .map((responseText) => ({ ratingContext: "any" as const, responseText })),
  };
}

/**
 * GET response shape — what the legacy form's `fetchBrandVoice` expects to
 * see. Iter 6 will switch the form to consume the V2 shape directly and
 * this projection goes away.
 */
export interface LegacyBrandVoiceResponse {
  id: string;
  tone: LegacyTone;
  formality: number;
  keyPhrases: string[];
  styleNotes: string | null;
  sampleResponses: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Project a V2 DB row back to the legacy response shape the form expects.
 * Formality is stubbed at 3 (the legacy default) because the column is
 * gone; the form will display "Balanced" and any save will round-trip
 * the stub harmlessly via `fromLegacyForm`.
 */
export function toLegacyShape(row: V2BrandVoiceRow): LegacyBrandVoiceResponse {
  const styleGuidelines = Array.isArray(row.styleGuidelines)
    ? (row.styleGuidelines as unknown[]).filter((s): s is string => typeof s === "string")
    : [];

  const sampleResponses = Array.isArray(row.sampleResponses)
    ? (row.sampleResponses as unknown[])
        .map((s) => (s && typeof s === "object" && "responseText" in s ? (s as { responseText: unknown }).responseText : undefined))
        .filter((t): t is string => typeof t === "string" && t.length > 0)
    : [];

  return {
    id: row.id,
    tone: v2ToneToLegacy(row.tone),
    formality: 3,
    keyPhrases: row.keyPhrases,
    styleNotes: serialiseStyleGuidelinesForLegacy(styleGuidelines),
    sampleResponses,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
