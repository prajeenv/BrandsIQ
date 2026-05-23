/**
 * Post-processing assembler for AI-generated review responses (iter 5).
 *
 * The model in iter 4 is explicitly instructed NOT to generate a salutation
 * or sign-off — those are deterministic and configurable per brand, so we
 * add them outside the model where the wording is exact every time.
 *
 * Responsibilities:
 *   1. Prepend the configured salutation (with `{firstName}` substitution
 *      from `review.reviewerName`, plus canonicalisation when no name is
 *      available so we don't end up with `Dear ,`).
 *   2. Append the configured sign-off block, normalising the literal `\n`
 *      stored form into real newlines.
 *   3. For negative reviews with the email-invitation toggle on, replace
 *      the `[your email]` placeholder the model was instructed to emit
 *      (see `FRAMING_FRAGMENTS` in structure-templates.ts) with the
 *      brand's configured `replyToEmail`.
 *   4. Cap only the model body to `RESPONSE_BODY_CHAR_MAX` — salutation
 *      and sign-off are appended after and are never truncated. Total
 *      assembled length stays well within `RESPONSE_TEXT_MAX` (2000).
 *
 * Output order: `[salutation]\n\n[body]\n\n[sign-off block]`.
 *
 * Spec: docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md §7, §9.4, §13.1, §13.2.
 *
 * Pure: no prisma, no Anthropic SDK, no I/O. Safe to unit-test on plain
 * objects. The route layer is the only caller.
 */

import { RESPONSE_BODY_CHAR_MAX } from "@/lib/constants";
import {
  type NormalizedBrandVoice,
  normalizeBrandVoice,
} from "./brand-voice-normalize";
import { isNegativeReview } from "./structure-templates";

/**
 * Subset of a review the assembler reads. Mirrors the columns Prisma
 * returns on `Review`, so callers can pass the row directly.
 */
export interface ReviewForAssembly {
  rating: number | null;
  sentiment: string | null;
  reviewerName: string | null;
}

/**
 * Input to {@link assembleResponse}. `brandVoice` accepts any shape — the
 * function normalises it via `normalizeBrandVoice` before reading any field,
 * so the route layer can pass the raw Prisma row.
 */
export interface AssembleResponseArgs {
  modelBody: string;
  brandVoice: unknown;
  review: ReviewForAssembly;
}

/** The literal placeholder the model is told to emit; spec §7.4. */
const EMAIL_PLACEHOLDER_PATTERN = /\[your email\]/gi;

/**
 * Salutation canonicalisation table (resolves spec §13.1).
 *
 * When `review.reviewerName` is empty, `{firstName}` is replaced with the
 * empty string, leaving artifacts like `Dear ,` or `Hi ,`. The table below
 * cleans those up into natural phrasing.
 *
 * Order matters — we apply most-specific patterns first (double-space
 * variants before single-space variants) so that `Dear  ,` doesn't collapse
 * to `Dear ,` only to be re-matched by a later rule.
 *
 * Adding a new variant: prefer a regex that's anchored to the start of the
 * salutation (most patterns are at most a salutation prefix + comma) so
 * accidental matches inside the body cannot occur.
 */
const NO_NAME_CANONICALISATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  // `Dear  ,` (double space before comma) → `Hello,`
  [/^Dear\s{2,},/u, "Hello,"],
  // `Hi  ,` / `Hello  ,` (double space) — keep prefix, drop the orphan
  [/^Hi\s{2,},/u, "Hi,"],
  [/^Hello\s{2,},/u, "Hello,"],
  // `Dear ,` (single space before comma) → `Hello,` (Dear without a name is awkward)
  [/^Dear\s,/u, "Hello,"],
  // `Hi ,` / `Hello ,` → drop the orphan space
  [/^Hi\s,/u, "Hi,"],
  [/^Hello\s,/u, "Hello,"],
  // Dangling comma at the very start (very defensive — covers patterns that
  // start with `{firstName},`)
  [/^,+\s*/u, "Hello,"],
];

/**
 * Extract the first name from `review.reviewerName`. Splits on whitespace
 * and returns the first non-empty token; returns `null` if the input is
 * `null`, empty, or all-whitespace.
 *
 * Examples:
 *   "Jane"             → "Jane"
 *   "Jane Smith"       → "Jane"
 *   "  Jane  Smith  "  → "Jane"
 *   ""                 → null
 *   null               → null
 *   "   "              → null
 */
export function extractFirstName(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const firstToken = trimmed.split(/\s+/u)[0];
  return firstToken && firstToken.length > 0 ? firstToken : null;
}

/**
 * Substitute `{firstName}` in the salutation pattern and apply the no-name
 * canonicalisation table when the name is unavailable.
 *
 * Exported for unit testing — the route layer should call
 * {@link assembleResponse}, which wraps this.
 */
export function buildSalutation(
  salutationPattern: string,
  firstName: string | null,
): string {
  if (firstName) {
    return salutationPattern.replace(/\{firstName\}/gu, firstName);
  }

  // Replace the variable with an empty string first; then run the table.
  let s = salutationPattern.replace(/\{firstName\}/gu, "");
  for (const [pattern, replacement] of NO_NAME_CANONICALISATIONS) {
    s = s.replace(pattern, replacement);
  }
  return s.trim();
}

/**
 * Convert the stored sign-off form into real line breaks.
 *
 * The DB column is `@db.Text` so the string may contain either real
 * newlines or literal `\n` escape sequences (e.g. if the form serialises
 * via `JSON.stringify` somewhere upstream). We accept both and normalise
 * to real newlines. Resolves spec §13.2.
 */
function normaliseSignoffLines(raw: string): string {
  // Replace literal backslash-n with a real newline. The regex matches
  // a backslash followed by lowercase n; CR-LF / CR variants are also
  // collapsed to LF for consistency.
  return raw.replace(/\\n/gu, "\n").replace(/\r\n?/gu, "\n").trimEnd();
}

/**
 * Substitute the `[your email]` placeholder (case-insensitive) with the
 * brand's configured reply-to email. Returns the body unchanged if no
 * placeholder is present, or if the email itself is empty.
 *
 * Exported for unit testing.
 */
export function substituteReplyToEmail(body: string, email: string | null): string {
  if (!email || email.trim().length === 0) return body;
  return body.replace(EMAIL_PLACEHOLDER_PATTERN, email);
}

/**
 * Defensive strip: remove any sentence containing the `[your email]`
 * placeholder. Used when assembling a response and the brand voice has
 * no `replyToEmail` configured — the prompt builder already declines to
 * inject the framing in that case (claude.ts), but a sample response or
 * a model hallucination could still leak the placeholder. Better to drop
 * the sentence than ship "[your email]" to the customer.
 *
 * Splits the body into sentences on `.`/`!`/`?` boundaries, drops any
 * containing the placeholder (case-insensitive), and rejoins. Preserves
 * paragraph breaks (`\n\n`) so multi-paragraph responses stay structured.
 *
 * Exported for unit testing.
 */
export function stripPlaceholderSentences(body: string): string {
  // Paragraph-by-paragraph so we don't accidentally fuse paragraphs when
  // a single sentence is dropped mid-paragraph.
  return body
    .split(/\n{2,}/u)
    .map((paragraph) => {
      // Match sentences greedily: any run of non-terminator chars + a
      // single terminator (. ! ?). Tail without a terminator is captured
      // as a trailing sentence too.
      const sentences = paragraph.match(/[^.!?]+[.!?]+|\S[^.!?]*$/gu) ?? [paragraph];
      return sentences
        .filter((s) => !EMAIL_PLACEHOLDER_PATTERN.test(s))
        .join("")
        .trim();
    })
    .filter((p) => p.length > 0)
    .join("\n\n");
}

/**
 * Truncate the model-emitted body to `RESPONSE_BODY_CHAR_MAX`, preferring
 * to end at a sentence boundary when one is available in the last 100
 * characters.
 *
 * Salutation and sign-off are appended afterwards and are never affected.
 */
function truncateBody(body: string): string {
  if (body.length <= RESPONSE_BODY_CHAR_MAX) return body;
  const sliced = body.substring(0, RESPONSE_BODY_CHAR_MAX);
  const lastPeriod = sliced.lastIndexOf(".");
  if (lastPeriod > RESPONSE_BODY_CHAR_MAX - 100) {
    return sliced.substring(0, lastPeriod + 1);
  }
  return sliced;
}

/**
 * Assemble the final response from the model body and the brand voice
 * configuration.
 *
 * Output order:
 *   [salutation]
 *
 *   [body paragraphs (with [your email] substituted on negative reviews)]
 *
 *   [sign-off (with literal \n converted to real newlines)]
 */
export function assembleResponse(args: AssembleResponseArgs): string {
  const { modelBody, brandVoice, review } = args;

  const normalized: NormalizedBrandVoice = normalizeBrandVoice(brandVoice);

  // 1. Salutation
  const firstName = extractFirstName(review.reviewerName);
  const salutation = buildSalutation(normalized.salutationPattern, firstName);

  // 2. Body — first cap to RESPONSE_BODY_CHAR_MAX, then optionally
  //    substitute the [your email] placeholder for negative reviews when
  //    the toggle is on AND a reply-to email is configured.
  //
  //    Defensive strip: if there's no `replyToEmail` (the toggle is on
  //    but the prerequisite is missing, OR the toggle is off but a
  //    sample/hallucination leaked the placeholder anyway), drop any
  //    sentence containing the placeholder. The customer should never
  //    see the bracketed text in a live response.
  let body = truncateBody(modelBody.trim());
  const negative = isNegativeReview({
    rating: review.rating,
    sentiment: review.sentiment,
  });
  const hasReplyToEmail =
    typeof normalized.replyToEmail === "string" && normalized.replyToEmail.trim().length > 0;

  if (negative && normalized.negativeReviewEmailEnabled && hasReplyToEmail) {
    body = substituteReplyToEmail(body, normalized.replyToEmail);
  } else if (!hasReplyToEmail) {
    body = stripPlaceholderSentences(body);
  }

  // 3. Sign-off
  const signoff = normaliseSignoffLines(normalized.signoffLines);

  // 4. Assemble. Salutation → blank line → body → blank line → sign-off.
  //    No trailing newline; the response is stored verbatim and rendered
  //    by the UI's prose renderer which handles its own block spacing.
  return `${salutation}\n\n${body}\n\n${signoff}`;
}
