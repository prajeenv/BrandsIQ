/**
 * Response structure guidance (brand voice redesign iter 4).
 *
 * Spec: docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md §9.5.
 *
 * Two responsibilities:
 *   1. Universal structural rules + AI-giveaway-marker prohibitions that
 *      apply to every response (no setting; sounding-like-AI is never a
 *      brand benefit). Includes the explicit precedence rule that a user-
 *      configured Key phrases entry wins over the prohibition list.
 *   2. Rating-conditional templates that tell the model what each
 *      paragraph in a positive / mixed / negative response should do.
 *
 * Sentiment overrides rating for routing (§9.5):
 *   - rating ≤ 2 OR sentiment === 'negative'                  → negative
 *   - rating === 3 OR (rating ≥ 4 AND sentiment === 'mixed')  → mixed
 *   - otherwise                                                → positive
 *
 * Single exported `isNegativeReview` is reused by post-processing in iter 5
 * (the reply-to-email rule fires only on negative reviews) so the routing
 * predicate has exactly one source of truth.
 *
 * Pure module — no prisma, no Anthropic SDK, no I/O.
 */

export type StructureTemplateKey = "positive" | "mixed" | "negative";

interface ReviewRouting {
  rating: number | null | undefined;
  sentiment: string | null | undefined;
}

/**
 * Resolve the rating-conditional template key for a review.
 *
 * Spec §9.5 routing rules. The "Kiran case" (4★ with negative sentiment)
 * resolves to the negative template because `sentiment === 'negative'` short-
 * circuits the rating check.
 */
export function selectStructureTemplate({ rating, sentiment }: ReviewRouting): StructureTemplateKey {
  const isNegativeSentiment = sentiment === "negative";
  const isMixedSentiment = sentiment === "mixed";

  // Negative if EITHER rating is 1–2 OR sentiment is explicitly negative.
  if ((typeof rating === "number" && rating <= 2) || isNegativeSentiment) {
    return "negative";
  }

  // Mixed if rating is 3, OR rating is 4+ with mixed sentiment.
  if (rating === 3 || (typeof rating === "number" && rating >= 4 && isMixedSentiment)) {
    return "mixed";
  }

  return "positive";
}

/**
 * Predicate used by post-processing (iter 5) to decide whether the reply-
 * to-email rule fires. Kept in this module so the negative-review predicate
 * is defined exactly once across the prompt builder and the post-processor.
 */
export function isNegativeReview(routing: ReviewRouting): boolean {
  return selectStructureTemplate(routing) === "negative";
}

// ─── Universal structural rules (spec §9.5) ──────────────────────────
// Injected into every system prompt. Composed of three parts:
//   - paragraph/format requirements
//   - AI-giveaway-marker prohibitions
//   - precedence rule (Key phrases override the prohibition list)
//
// The reinforcement tail (sanitize.ts:INSTRUCTION_REINFORCEMENT) repeats the
// most-critical lines (paragraph count, em-dash, no salutation/sign-off)
// AFTER all user-supplied sections so they survive any attempted override
// from user-configured text.

export const UNIVERSAL_STRUCTURAL_RULES = `Response structure:
- Write the response body as 2–4 short paragraphs separated by a single blank line.
- Each paragraph is 2–4 sentences maximum.
- Use natural prose only — no headers, no bullet points, no lists, no markdown formatting markers.
- Do NOT include a salutation or sign-off in your generated text. Those are added separately.

Avoid these AI-giveaway markers:
- No em-dashes ("—"). Use commas, periods, or parentheses instead.
- Use straight quotes (' and ") not curly/smart quotes.
- Do not use these overused words and phrases: "delve", "delving", "rest assured", "we strive to", "we endeavor", "tapestry", "robust", "seamless", "seamlessly", "leverage" (as a verb), "navigate the complexities of", "in the realm of".
- Do not open with "I hope this finds you well" or "Thank you for reaching out". Open with something specific to the review.
- Do not end on "We value your feedback" as a sole closer. Be specific about what feedback or what action, or omit.
- Do not echo the reviewer's phrasing back verbatim (e.g. quoting their exact complaint back at them).
- Do not use three-adjective lists for rhythm (e.g. "wonderful, memorable, delightful evening"). Pick one or two adjectives deliberately.

Precedence rule:
- If a phrase listed in the Key phrases section above contains a word or phrase from this prohibition list, the Key phrases entry takes precedence — use it as the user has written it. The prohibitions apply only to words and phrases the model would otherwise introduce on its own.`;

// ─── Rating-conditional templates (spec §9.5) ────────────────────────

const POSITIVE_TEMPLATE = `Structure for this response:
1. Opening paragraph: thank the reviewer and acknowledge specific details they mentioned (occasion, named staff, specific experience).
2. Optional middle paragraph: a moment of appreciation, resonance, or specific commitment (e.g. "we'll pass this on to the team").
3. Closing paragraph: a forward-looking statement inviting them back.`;

const MIXED_TEMPLATE = `Structure for this response:
1. Opening paragraph: thank the reviewer and acknowledge the positives they mentioned.
2. Middle paragraph: address the specific concerns raised; show ownership; state a commitment to improve.
3. Closing paragraph: a brief forward-looking statement.`;

const NEGATIVE_TEMPLATE = `Structure for this response:
1. Opening paragraph: thank the reviewer for taking time to share; offer a sincere apology; acknowledge the occasion if mentioned.
2. Middle paragraph: take ownership of the experience; state the commitment configured in the brand voice (management contact / investigation / open channel — see the framing instruction above).
3. Optional final paragraph: any specific ask required by the configured framing (e.g., requesting booking details).`;

const TEMPLATES: Record<StructureTemplateKey, string> = {
  positive: POSITIVE_TEMPLATE,
  mixed: MIXED_TEMPLATE,
  negative: NEGATIVE_TEMPLATE,
};

/** Return the rating-conditional template block for a review's routing. */
export function getStructureTemplate(routing: ReviewRouting): string {
  return TEMPLATES[selectStructureTemplate(routing)];
}

// ─── Conditional fragments (spec §6.1, §6.2, §7.4) ───────────────────
// These are short instructions injected only when the corresponding brand-
// voice toggle is on (and, for the negative-email framing, only when the
// current review is negative).

export const NAMED_STAFF_FRAGMENT =
  "If the reviewer mentions a staff member by name, thank them specifically and note that you'll share the feedback with that person.";

export const OCCASION_FRAGMENT =
  "If the reviewer mentions a special occasion (birthday, anniversary, first visit, returning visit), acknowledge it specifically in the response.";

export type NegativeReviewFraming =
  | "management_contact"
  | "investigation"
  | "open_channel"
  | "custom";

/**
 * Spec §7.4 framing strings. The `custom` option is handled separately by
 * the caller (it wraps the user-supplied `negativeReviewFramingCustom` via
 * the sanitize helper).
 */
const FRAMING_FRAGMENTS: Record<Exclude<NegativeReviewFraming, "custom">, string> = {
  management_contact:
    "Include a clear promise that a member of management will reach out via the contact email, and request the customer's booking details so the team can follow up properly.",
  investigation:
    "Invite the customer to email their concerns and booking details, framing it as something the team would like to look into.",
  open_channel:
    "Offer the email as a channel for further conversation, without promising specific follow-up actions.",
};

/** Get the preset framing fragment. Returns null for the `custom` option. */
export function getFramingFragment(framing: NegativeReviewFraming): string | null {
  if (framing === "custom") return null;
  return FRAMING_FRAGMENTS[framing];
}
