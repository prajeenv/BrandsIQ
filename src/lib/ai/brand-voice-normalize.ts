/**
 * Brand voice normalization adapter (iter 2).
 *
 * Read-time adapter that converts a brand-voice record — in either the legacy
 * shape (`styleNotes`, `sampleResponses: string[]`, old tone keys, `formality`)
 * or the V2 shape (`styleGuidelines`, object-array sample responses, V2 tone
 * keys, no formality) — into the canonical V2 shape that the iter-4 prompt
 * builder will consume.
 *
 * Wired into `generateReviewResponse` in iteration 4. Unit-tested now so the
 * contract is locked before the schema reset (iter 3) flips the underlying
 * column shapes.
 *
 * Pure: no prisma, no Anthropic SDK, no I/O. Safe to call on any plain
 * object including untrusted JSON parsed from a DB JSONB column.
 *
 * Spec: docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md §4.1 (tone mapping), §4.2
 * (styleNotes → styleGuidelines), §5.1 (sample responses object shape).
 */

import {
  BRAND_VOICE_TONES_V2,
  DEFAULT_BRAND_VOICE_TONE_V2,
  DEFAULT_NEGATIVE_REVIEW_FRAMING,
  LEGACY_TONE_TO_V2,
  type BrandVoiceToneV2,
  type NegativeReviewFraming,
  NEGATIVE_REVIEW_FRAMINGS,
  SUPPORTED_RESPONSE_LANGUAGES,
} from "@/lib/constants";

/** Sample-response item, normalized shape. */
export interface NormalizedSampleResponse {
  ratingContext: 1 | 2 | 3 | 4 | 5 | "any";
  responseText: string;
}

/**
 * Canonical V2 shape produced by `normalizeBrandVoice`. All fields are
 * non-optional with sane defaults; downstream code can rely on this.
 */
export interface NormalizedBrandVoice {
  tone: BrandVoiceToneV2;
  styleGuidelines: string[];
  keyPhrases: string[];
  sampleResponses: NormalizedSampleResponse[];
  acknowledgeNamedStaff: boolean;
  acknowledgeOccasions: boolean;
  salutationPattern: string;
  signoffLines: string;
  negativeReviewEmailEnabled: boolean;
  negativeReviewFraming: NegativeReviewFraming;
  negativeReviewFramingCustom: string | null;
  replyToEmail: string | null;
  /**
   * Optional response-language override. Null = follow the review's
   * detected language (default). Non-null must be one of the display
   * names in SUPPORTED_RESPONSE_LANGUAGES. Unknown values coerce to null.
   */
  responseLanguage: string | null;
  /**
   * Language the user typed their `salutationPattern` and `signoffLines`
   * in. Detected via franc in the form (debounced over the concatenated
   * salutation + sign-off string), overridable via an inline "Change"
   * link. Stored verbatim from `SUPPORTED_RESPONSE_LANGUAGES`. Null when
   * franc returned "und" and the user didn't manually confirm — the
   * post-processor uses the system default for the response language
   * in that case and the user's typed text is unused. Unknown values
   * coerce to null.
   */
  salutationSignoffLanguage: string | null;
}

const DEFAULTS: NormalizedBrandVoice = {
  tone: DEFAULT_BRAND_VOICE_TONE_V2,
  styleGuidelines: [],
  keyPhrases: [],
  sampleResponses: [],
  acknowledgeNamedStaff: true,
  acknowledgeOccasions: true,
  salutationPattern: "Dear {firstName},",
  signoffLines: "Warmest regards,\nThe Team",
  negativeReviewEmailEnabled: false,
  negativeReviewFraming: DEFAULT_NEGATIVE_REVIEW_FRAMING,
  negativeReviewFramingCustom: null,
  replyToEmail: null,
  responseLanguage: null,
  salutationSignoffLanguage: null,
};

const V2_TONE_SET = new Set<string>(BRAND_VOICE_TONES_V2);
const FRAMING_SET = new Set<string>(NEGATIVE_REVIEW_FRAMINGS);
const SUPPORTED_RESPONSE_LANGUAGES_SET = new Set<string>(SUPPORTED_RESPONSE_LANGUAGES);

/**
 * Map any tone string we might see in stored data to a V2 key.
 *
 * - V2 key passed through                  → unchanged
 * - Legacy key in LEGACY_TONE_TO_V2        → mapped
 * - "default" (used on first-generation ReviewResponse.toneUsed) → default V2
 * - Anything else                          → default V2 (defensive)
 */
function normalizeTone(raw: unknown): BrandVoiceToneV2 {
  if (typeof raw !== "string") return DEFAULTS.tone;
  if (V2_TONE_SET.has(raw)) return raw as BrandVoiceToneV2;
  const mapped = LEGACY_TONE_TO_V2[raw];
  return mapped ?? DEFAULTS.tone;
}

/**
 * Parse legacy `styleNotes` into a `string[]`.
 *
 * Legacy storage was `JSON.stringify(string[])` in a text column (the iter-1
 * BRAND_VOICE_REDESIGN.md headline bug). On read we try `JSON.parse` first;
 * fall back to newline-split for any rows that pre-date the JSON serialization
 * (the form once stored newline-separated strings). Anything that fails to
 * yield a string array becomes `[]`.
 */
function normalizeStyleGuidelinesFromLegacy(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    // Already a JSONB array from the V2 column.
    return raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim());
  }
  if (typeof raw !== "string") return [];
  // Try JSON-array form first.
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim());
    }
  } catch {
    // Not JSON — fall through to the newline split.
  }
  // Pre-JSON legacy form: newline-separated lines.
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Normalize sample responses to the V2 object shape.
 *
 * - `string[]` (legacy)                         → `[{ratingContext:'any', responseText:s}, ...]`
 * - Array of `{ratingContext, responseText}`    → passed through, ratingContext coerced
 * - Anything else                               → `[]`
 */
function normalizeSampleResponses(raw: unknown): NormalizedSampleResponse[] {
  if (!Array.isArray(raw)) return [];
  const out: NormalizedSampleResponse[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed.length > 0) {
        out.push({ ratingContext: "any", responseText: trimmed });
      }
      continue;
    }
    if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      const text = typeof rec.responseText === "string" ? rec.responseText.trim() : "";
      if (text.length === 0) continue;
      const rating = rec.ratingContext;
      let ratingContext: NormalizedSampleResponse["ratingContext"] = "any";
      if (rating === "any") {
        ratingContext = "any";
      } else if (typeof rating === "number" && Number.isInteger(rating) && rating >= 1 && rating <= 5) {
        ratingContext = rating as 1 | 2 | 3 | 4 | 5;
      }
      out.push({ ratingContext, responseText: text });
    }
  }
  return out;
}

function normalizeKeyPhrases(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim());
}

function asBoolean(raw: unknown, fallback: boolean): boolean {
  return typeof raw === "boolean" ? raw : fallback;
}

function asString(raw: unknown, fallback: string): string {
  return typeof raw === "string" && raw.length > 0 ? raw : fallback;
}

function asNullableString(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeFraming(raw: unknown): NegativeReviewFraming {
  if (typeof raw === "string" && FRAMING_SET.has(raw)) return raw as NegativeReviewFraming;
  return DEFAULTS.negativeReviewFraming;
}

/**
 * Normalize a `SUPPORTED_RESPONSE_LANGUAGES`-valued display name field.
 * Unknown / non-string values (and any string not in the supported set)
 * coerce to null so downstream code can rely on "non-null implies the
 * field is valid". Shared between `responseLanguage` and
 * `salutationSignoffLanguage` — both store the same kind of value.
 */
function normalizeSupportedLanguage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return SUPPORTED_RESPONSE_LANGUAGES_SET.has(trimmed) ? trimmed : null;
}

/**
 * Normalize any plausible brand-voice payload (legacy DB row, V2 DB row,
 * partial object, untrusted JSON) into the canonical {@link NormalizedBrandVoice}
 * shape. Missing fields fall back to spec defaults. Unknown fields are ignored.
 *
 * Safe to call on `null` / `undefined` — returns a full defaults object.
 */
export function normalizeBrandVoice(raw: unknown): NormalizedBrandVoice {
  if (raw == null || typeof raw !== "object") {
    return { ...DEFAULTS };
  }
  const r = raw as Record<string, unknown>;

  // Style guidelines: prefer V2 column when present, fall back to legacy.
  const styleSource = "styleGuidelines" in r ? r.styleGuidelines : r.styleNotes;
  const styleGuidelines = normalizeStyleGuidelinesFromLegacy(styleSource);

  return {
    tone: normalizeTone(r.tone),
    styleGuidelines,
    keyPhrases: normalizeKeyPhrases(r.keyPhrases),
    sampleResponses: normalizeSampleResponses(r.sampleResponses),
    acknowledgeNamedStaff: asBoolean(r.acknowledgeNamedStaff, DEFAULTS.acknowledgeNamedStaff),
    acknowledgeOccasions: asBoolean(r.acknowledgeOccasions, DEFAULTS.acknowledgeOccasions),
    salutationPattern: asString(r.salutationPattern, DEFAULTS.salutationPattern),
    signoffLines: asString(r.signoffLines, DEFAULTS.signoffLines),
    negativeReviewEmailEnabled: asBoolean(r.negativeReviewEmailEnabled, DEFAULTS.negativeReviewEmailEnabled),
    negativeReviewFraming: normalizeFraming(r.negativeReviewFraming),
    negativeReviewFramingCustom: asNullableString(r.negativeReviewFramingCustom),
    replyToEmail: asNullableString(r.replyToEmail),
    responseLanguage: normalizeSupportedLanguage(r.responseLanguage),
    salutationSignoffLanguage: normalizeSupportedLanguage(r.salutationSignoffLanguage),
  };
}
