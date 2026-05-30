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
- Write the response body as 2–3 short paragraphs separated by a single blank line.
- Each paragraph is 2–3 sentences maximum.
- Keep the total response body between 500 and 750 characters. Communicate in fewer sentences — do not pad.
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
- Do not reference the price the customer paid back to them, even if they mentioned it in the review. The dissatisfaction is what needs acknowledgment, not the amount they spent.

Do not acknowledge missing service-recovery actions:
- Compensation, refunds, discounts, complimentary items, comped meals, free replacements, store credit, anything else the customer says they did NOT receive as a remediation — do NOT acknowledge any of it in the public reply, do NOT apologise for it, do NOT confirm it should have been offered, do NOT promise it for next time.
- These are private negotiations, not apology topics. The moment a public reply names a missing remediation ("we're sorry no compensation was offered"), every reader is anchored on that as a thing the business has now confessed to owing, and the brand has narrowed its legitimate range of responses.
- Address the original failure (the meal, the stay, the service, the product, the appointment) and let any remediation happen off the public reply, through whatever private channel the business uses.
- Examples of what NOT to write: "we're sorry no discount was offered", "you didn't receive the compensation you deserved", "we should have offered a replacement", "we apologise that no refund was provided", "we will make sure you receive proper compensation next time".
- This rule applies even when the reviewer raised the missing remediation as a specific concrete grievance (the same kind of grievance the specificity rule would normally tell you to engage with). The specificity rule is about acknowledging WHAT WENT WRONG with the interaction itself — it does not extend to acknowledging missing recovery actions.

Do not promise the failed thing done correctly:
- This rule applies anywhere in the response — apology paragraph, internal commitment, close, or any other sentence. It is not limited to the closing.
- If the reviewer raised a specific failure (e.g., an undercooked meal, a delayed delivery, a missed booking, a rude interaction, a faulty product), do NOT promise the negation of that failure as part of your reply.
- Examples of what NOT to write: "a properly prepared meal", "an on-time delivery this time", "a booking that's actually honoured", "the warm service you should have received", "the experience that meets your expectations", "the standard our customers expect", "the kind of quality we usually deliver".
- Refer to any future visit, return, or interaction generically. Acceptable substitutes include: "we'd love to welcome you back", "we hope to see you again", "we hope you'll give us another chance", "we'd be glad to host you again", "we hope to have the opportunity to serve you again". These work because they invite the customer back without itemising the corrected version of the failure.
- Why this matters: promising the failure done correctly turns the apology into a sales pitch for the corrected version of the failed thing. It also implies the customer must give the business another try to find out whether the issue was fixed, which reduces the apology to a condition. Generic future-visit language avoids both.

Precedence rule:
- If a phrase listed in the Key phrases section above contains a word or phrase from this prohibition list, the Key phrases entry takes precedence — use it as the user has written it. The prohibitions apply only to words and phrases the model would otherwise introduce on its own.`;

// ─── Rating-conditional templates (spec §9.5) ────────────────────────

const POSITIVE_TEMPLATE = `Structure for this response:
1. Opening paragraph: thank the reviewer and acknowledge specific details they mentioned (occasion, named staff, specific experience).
2. Optional middle paragraph: a moment of appreciation, resonance, or specific commitment (e.g. "we'll pass this on to the team").
3. Closing paragraph: a forward-looking statement inviting them back.`;

// Mixed template — Kiran-case rebalance: explicit equal-weight instruction
// so the positives don't bury the negatives. The mixed reviewer raised both
// good and bad; the response must reflect both proportionally.
const MIXED_TEMPLATE = `Structure for this response:
1. Opening paragraph: thank the reviewer and acknowledge the positives they mentioned, briefly.
2. Middle paragraph: address the specific concerns raised; show ownership; state a commitment to improve. Quote or paraphrase one concrete detail from their criticism rather than summarising the category.
3. Closing paragraph: a brief forward-looking statement.

Balance:
- Give the positive and negative content roughly equal space — do not bury the criticism inside a wall of praise. If the reviewer asked for something specific (e.g., "please improve the dessert"), engage with that ask explicitly.`;

// Negative template — specificity requirement: must reference one concrete
// incident from the review (not abstractions like "concerns about
// cleanliness"). On a multi-issue review with many complaints, pick one
// salient incident and add a general "and several other concerns"
// acknowledgment for the rest. This is the trade-off the response builder
// has to make to stay within the length target.
const NEGATIVE_TEMPLATE = `Structure for this response:
1. Opening paragraph: thank the reviewer briefly for taking time to share; offer a sincere apology; acknowledge the occasion if mentioned.
2. Middle paragraph: reference one specific incident the reviewer mentioned (using their wording or a close paraphrase — NOT an abstract category summary). If the reviewer raised many issues, acknowledge "and several other concerns" alongside the one specific incident. Communicate an internal commitment to address what happened — phrases like "I'll share this with our team", "we'll discuss this with our [relevant department]", or "we'll look into what happened" are all appropriate. The internal commitment must be ONE short clause and must NOT carry a trailing purpose clause (see the Internal commitment cap section below). This commitment is universal — it does NOT depend on whether a contact channel is configured. The reviewer should always leave feeling the brand will act on what they raised.
3. Closing paragraph:
   - If a contact channel is configured in the brand voice (via the framing instruction above): close with an invitation to use that channel (e.g. "please email us at [your email] so we can investigate further").
   - If NO contact channel is configured: close with a hopeful forward-looking statement — express that we hope for the opportunity to serve them better in the future. Do NOT invent a generic "please reach out" or "contact us directly" close — there is no channel to direct them to.

Universal closing rule:
- The reply must NOT end on the apology itself. A negative-review close needs warmth, internal commitment, and forward intent. Apology alone reads transactional.
- Only invite the customer to make contact (email, message, callback, any channel) if a contact channel has been explicitly configured. Do not fabricate channels.

Specificity is required, not optional:
- Engage with one actual incident from the review. Abstractions like "concerns about cleanliness" or "issues with service" are not enough — name something concrete the reviewer wrote.

Internal commitment cap:
- The internal commitment ("I'll share this with our team", "we'll look into what happened", "we'll discuss this with our kitchen team") must be ONE short clause. Stop after the team/department reference.
- Do NOT add a trailing purpose clause stating what we'll do, what we'll ensure, what we'll prevent, what standards we'll maintain, or how we'll fix it.
- Examples of trailing clauses to AVOID (these are what the cap is for):
  - "...to ensure this doesn't happen again"
  - "...to ensure our cooking standards are properly maintained"
  - "...so we can address what happened with the preparation"
  - "...to make sure our team delivers the service our customers expect"
  - "...to prevent this from recurring"
- Acceptable forms: "I'll share this with our kitchen team." (full stop, no trailing clause). "We'll discuss this with our front-of-house team." (full stop, no trailing clause).
- Why this matters: trailing purpose clauses turn the commitment into a public narration of internal process. A manager apologising in person says "I'll share this with the team" and moves on; they don't enumerate what the team will do. This pattern is a corporate-apology register tell, even when the substitute phrase ("I'll share this") was the right replacement.

Register:
- Write as a manager apologising in person, not as a corporate statement. Acknowledge briefly, commit briefly, close hopefully. Do not theatrically self-flagellate.
- DO NOT self-criticise in the reply. Acknowledge that the issue happened, but do NOT state what we should have done differently, do NOT characterise our team or service as having failed, and do NOT volunteer operational fixes. A manager apologising in person says "I'm sorry this happened" — they do not list our shortcomings in public.
- Lean slightly more formal than the brand's usual tone when expressing the apology itself. Apologies land with more weight in measured language — prefer "we are deeply sorry" over "we're deeply sorry" in the apology paragraph, even when the brand's tone usually allows contractions. Outside the apology paragraph, the brand's normal register applies.`;

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
  "If the reviewer mentions a special occasion (birthday, anniversary, milestone) or a meaningful reason for the interaction (first time using the business, a returning customer, a long-anticipated visit, a significant purchase), acknowledge it specifically. Acknowledgement is about recognising what the interaction meant to the customer — it does NOT extend the scope of any apology, commitment, or forward-look to the broader context (the trip, the milestone year, the occasion as a whole). Those stay scoped to the interaction with the business.";

export type NegativeReviewFraming =
  | "management_contact"
  | "investigation"
  | "open_channel"
  | "custom";

/**
 * Spec §7.4 framing strings. The `custom` option is handled separately by
 * the caller (it wraps the user-supplied `negativeReviewFramingCustom` via
 * the sanitize helper).
 *
 * Each framing instructs the model to include the literal placeholder
 * `[your email]` wherever the customer is invited to make contact. Iter
 * 5's post-processing layer substitutes that placeholder with the
 * brand voice's configured `replyToEmail`. The placeholder is the
 * coordination point between this prompt and `post-process.ts:
 * substituteReplyToEmail` — change it in both places together.
 */
const FRAMING_FRAGMENTS: Record<Exclude<NegativeReviewFraming, "custom">, string> = {
  management_contact:
    "Include a clear promise that a member of management will reach out via the contact email. Use the literal placeholder `[your email]` for the email address. Request the customer's booking details so the team can follow up properly.",
  investigation:
    "Invite the customer to email their concerns and booking details, framing it as something the team would like to look into. Use the literal placeholder `[your email]` for the email address.",
  open_channel:
    "Offer the email as a channel for further conversation, without promising specific follow-up actions. Use the literal placeholder `[your email]` for the email address.",
};

/** Get the preset framing fragment. Returns null for the `custom` option. */
export function getFramingFragment(framing: NegativeReviewFraming): string | null {
  if (framing === "custom") return null;
  return FRAMING_FRAGMENTS[framing];
}
