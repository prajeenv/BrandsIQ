/**
 * Claude AI service for response generation.
 * Uses Anthropic's Claude API for generating brand-aligned review responses.
 */

import Anthropic from "@anthropic-ai/sdk";

import {
  BRAND_VOICE_TONE_INFO_V2,
  RESPONSE_BODY_CHAR_MAX,
  type BrandVoiceToneV2,
} from "@/lib/constants";
import { normalizeBrandVoice } from "./brand-voice-normalize";
import { INSTRUCTION_REINFORCEMENT, wrapUserContent } from "./sanitize";
import {
  getFramingFragment,
  getStructureTemplate,
  isNegativeReview,
  NAMED_STAFF_FRAGMENT,
  OCCASION_FRAGMENT,
  UNIVERSAL_STRUCTURAL_RULES,
} from "./structure-templates";

// Default model for response generation.
export const DEFAULT_MODEL = "claude-sonnet-4-20250514";

// Headroom over RESPONSE_BODY_CHAR_MAX (≈ "approximately 200 words"). A
// generous max_tokens lets the model finish a paragraph naturally without
// hard-truncating mid-sentence; the body cap is enforced afterwards by
// route truncation (iter 4) and the post-processing assembler (iter 5).
const MAX_TOKENS_BODY = 1000;

/**
 * Brand voice configuration consumed by `generateReviewResponse`.
 *
 * V2 shape (iter 4 — see docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md §4–§7).
 * The legacy fields (`formality`, `styleNotes`, legacy string-array
 * `sampleResponses`) were removed this iteration; the route layer no
 * longer passes them. Anything that may still flow in defensively goes
 * through `normalizeBrandVoice` at the top of `generateReviewResponse`.
 *
 * Every V2 field is OPTIONAL on this interface because `normalizeBrandVoice`
 * supplies defaults; the strict V2 shape (with required defaults applied)
 * is `NormalizedBrandVoice` in `brand-voice-normalize.ts`.
 */
export interface BrandVoiceConfig {
  tone: string;
  keyPhrases: string[];
  // `styleGuidelines` and `sampleResponses` are typed as `unknown` because
  // they flow straight out of Prisma JSONB columns (`Prisma.JsonValue`).
  // `normalizeBrandVoice` inside `generateReviewResponse` does the runtime
  // coercion to the V2 shape (`string[]` and `{ratingContext, responseText}[]`
  // respectively) so the route layer doesn't need to cast.
  styleGuidelines?: unknown;
  sampleResponses?: unknown;
  acknowledgeNamedStaff?: boolean;
  acknowledgeOccasions?: boolean;
  salutationPattern?: string;
  signoffLines?: string;
  negativeReviewEmailEnabled?: boolean;
  negativeReviewFraming?: "management_contact" | "investigation" | "open_channel" | "custom" | string;
  negativeReviewFramingCustom?: string | null;
  replyToEmail?: string | null;
}

/**
 * Tone modifier values accepted by `POST /api/reviews/[id]/regenerate`.
 *
 * Kept as the legacy 3-key set until iter 6 swaps the regenerate dialog
 * to the four V2 presets — touching it now would break the regenerate
 * route's Zod validation and the existing `ToneModifier` UI. Iter 6 will
 * realign this with `BRAND_VOICE_TONES_V2` per the corrected spec §8.1.
 */
export type ToneModifier = "professional" | "friendly" | "empathetic";

export interface GenerateResponseParams {
  reviewText: string;
  platform: string;
  rating?: number | null;
  /**
   * Sentiment of the review, when known (DeepSeek classification). Used by
   * the rating-conditional structure template router so a 4★ review with
   * negative sentiment uses the mixed/negative template, not the positive
   * one. Spec §9.5.
   */
  sentiment?: string | null;
  detectedLanguage?: string;
  brandVoice: BrandVoiceConfig;
  isTestMode?: boolean;
  toneModifier?: ToneModifier;
  /**
   * Optional free-text instructions for a single regeneration. Plumbed in
   * iteration 1 but only wired into the UI in iteration 6 of the brand
   * voice redesign. When provided, the value is wrapped via the sanitize
   * helper and appended to the user prompt as a binding directive for this
   * generation only — it is never persisted.
   */
  customRegenerateInstructions?: string;
}

export interface GeneratedResponse {
  responseText: string;
  model: string;
}

/**
 * Helper to delay execution.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get tone modifier description for prompt.
 */
function getToneModifierDescription(toneModifier: ToneModifier): string {
  const descriptions: Record<ToneModifier, string> = {
    professional: "professional and courteous, maintaining a business-appropriate tone",
    friendly: "warm and personable, like helping a friend",
    empathetic: "understanding and compassionate, showing genuine care for the customer's experience",
  };
  return descriptions[toneModifier];
}

/**
 * Render a V2 tone key as the human-readable display label the model sees in
 * the prompt. Falls back to the raw value when the key is unrecognised — the
 * model can still parse the string, and `normalizeBrandVoice` upstream should
 * have already mapped any legacy values into the V2 set.
 */
function renderToneLabel(tone: string): string {
  return BRAND_VOICE_TONE_INFO_V2[tone as BrandVoiceToneV2]?.label ?? tone;
}

/**
 * Render the ratingContext label that prefaces a sample response. "any" means
 * the sample applies to all reviews; 1–5 means the sample is a typical
 * response to a review of that star rating.
 */
function renderSampleContext(rc: 1 | 2 | 3 | 4 | 5 | "any"): string {
  if (rc === "any") return "for any review";
  return `for a ${rc}-star review`;
}

/**
 * Generate a response to a review using Claude AI.
 */
export async function generateReviewResponse(
  params: GenerateResponseParams
): Promise<GeneratedResponse> {
  const {
    reviewText,
    platform,
    rating,
    sentiment,
    detectedLanguage = "English",
    brandVoice,
    isTestMode = false,
    toneModifier,
    customRegenerateInstructions,
  } = params;

  // E2E mock mode: return canned response without calling Claude API.
  // Set E2E_MOCK_AI=true on the Vercel Preview environment to enable.
  if (process.env.E2E_MOCK_AI === "true") {
    return {
      responseText:
        "Thank you for your feedback! We truly appreciate you taking the time to share your experience with us. Your input helps us continue to improve our service.",
      model: "mock-e2e",
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });

  // Defensive normalisation. The route layer should pass V2-shape brand
  // voices straight from the DB, but `normalizeBrandVoice` accepts any
  // plausible payload (legacy mixed in, partial, even null) and returns the
  // canonical V2 shape with safe defaults so the prompt builder never has
  // to guard against missing fields.
  const normalized = normalizeBrandVoice(brandVoice);

  const systemPrompt = buildSystemPrompt({
    brandVoice: normalized,
    language: detectedLanguage,
    rating: rating ?? null,
    sentiment: sentiment ?? null,
    toneModifier,
  });

  const userPrompt = buildUserPrompt({
    reviewText,
    platform,
    rating,
    detectedLanguage,
    isTestMode,
    customRegenerateInstructions,
  });

  // Retry logic for transient errors (429 rate limit, 529 overloaded).
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: MAX_TOKENS_BODY,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        system: systemPrompt,
      });

      // Extract text from response.
      const textContent = response.content.find((block) => block.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text response received from Claude");
      }

      return {
        responseText: textContent.text.trim(),
        model: response.model,
      };
    } catch (error) {
      lastError = error as Error;
      const isRetryable =
        error instanceof Anthropic.APIError &&
        (error.status === 429 || error.status === 529);

      if (isRetryable && attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s.
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.warn(
          `Claude API error (${error.status}), retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`
        );
        await sleep(delay);
        continue;
      }

      console.error("Claude API error:", error);
      throw error;
    }
  }

  throw lastError;
}

/**
 * Build the system prompt with V2 brand voice configuration.
 *
 * Order matters: every user-supplied section is wrapped via `wrapUserContent`
 * so injected content is treated as data, and `INSTRUCTION_REINFORCEMENT`
 * comes LAST so its rules retain attention precedence over user content.
 */
function buildSystemPrompt(args: {
  brandVoice: ReturnType<typeof normalizeBrandVoice>;
  language: string;
  rating: number | null;
  sentiment: string | null;
  toneModifier?: ToneModifier;
}): string {
  const { brandVoice, language, rating, sentiment, toneModifier } = args;

  let prompt = `You are a customer service representative writing responses to customer reviews.

IMPORTANT INSTRUCTIONS:
1. Write the response in ${language} (the same language as the review).
2. Keep the response body to approximately 200 words (max ${RESPONSE_BODY_CHAR_MAX} characters).
3. Be genuine and human — never sound robotic or template-like.
4. Address specific points mentioned in the review when relevant.
5. Never be defensive or argumentative, even for negative reviews.

BRAND VOICE CONFIGURATION:
- Tone: ${renderToneLabel(brandVoice.tone)}`;

  // Optional one-time tone override (regeneration with a different register).
  if (toneModifier) {
    prompt += `\n- IMPORTANT Tone Override (this generation only): Be ${getToneModifierDescription(toneModifier)}.`;
  }

  // ─── Key phrases (spec §4.3) — kept MUST enforcement ──────────────
  if (brandVoice.keyPhrases.length > 0) {
    const joined = brandVoice.keyPhrases.join(", ");
    prompt += `\n\n${wrapUserContent("Key phrases", joined)}
These are key phrases the brand likes to use. You MUST incorporate at least 1–2 of these naturally where they fit the response.`;
  }

  // ─── Style guidelines (spec §4.2 — the headline JSON-render bug fix) ─
  // Render as a newline-bulleted list, NOT raw JSON. Wrapped via the
  // sanitize helper so injection-y content inside a guideline is treated
  // as data, not instructions.
  if (brandVoice.styleGuidelines.length > 0) {
    const bulleted = brandVoice.styleGuidelines.map((g) => `- ${g}`).join("\n");
    prompt += `\n\n${wrapUserContent("Style guidelines", bulleted)}
Style guidelines (follow these strictly):`;
  }

  // ─── Personalization toggles (spec §6.1, §6.2) ───────────────────
  // Fragments are injected only when the corresponding toggle is on.
  if (brandVoice.acknowledgeNamedStaff) {
    prompt += `\n\nNamed-staff acknowledgment:\n${NAMED_STAFF_FRAGMENT}`;
  }
  if (brandVoice.acknowledgeOccasions) {
    prompt += `\n\nOccasion acknowledgment:\n${OCCASION_FRAGMENT}`;
  }

  // ─── Negative-review email framing (spec §7.4) ───────────────────
  // Only inject when the brand voice has the email-invitation toggle on
  // AND the current review is negative (rating ≤ 2 OR sentiment ===
  // 'negative'). The framing tells the model how to phrase the email
  // invitation; the actual email address is injected by post-processing
  // (iter 5), so the prompt deliberately does NOT include it.
  const negative = isNegativeReview({ rating, sentiment });
  if (brandVoice.negativeReviewEmailEnabled && negative) {
    if (brandVoice.negativeReviewFraming === "custom") {
      // Custom framing: wrap the user-supplied text so any injection
      // attempt inside it is neutralised.
      const customText = brandVoice.negativeReviewFramingCustom ?? "";
      if (customText.trim().length > 0) {
        prompt += `\n\n${wrapUserContent("Custom framing", customText)}
Negative-review framing (apply to this response — the team will follow up via email):`;
      }
    } else {
      const fragment = getFramingFragment(brandVoice.negativeReviewFraming);
      if (fragment) {
        prompt += `\n\nNegative-review framing:\n${fragment}`;
      }
    }
  }

  // ─── Sample responses (spec §5.1) — V2 object shape, labeled by rating ─
  if (brandVoice.sampleResponses.length > 0) {
    prompt += `\n\nSAMPLE RESPONSES FOR REFERENCE (match this voice and structure):`;
    brandVoice.sampleResponses.forEach((sample, index) => {
      const label = `Sample response ${index + 1} (${renderSampleContext(sample.ratingContext)})`;
      prompt += `\n${wrapUserContent(label, sample.responseText)}`;
    });
  }

  // ─── Universal structural rules (spec §9.5) ──────────────────────
  // Apply to every response: paragraph count, AI-giveaway-marker
  // prohibitions, and the precedence rule that Key phrases override the
  // prohibition list.
  prompt += `\n\n${UNIVERSAL_STRUCTURAL_RULES}`;

  // ─── Rating-conditional structure (spec §9.5) ────────────────────
  // The router picks positive / mixed / negative based on rating +
  // sentiment (sentiment overrides rating). Each template tells the
  // model what each paragraph in the response should do.
  prompt += `\n\n${getStructureTemplate({ rating, sentiment })}`;

  prompt += `\n\nRespond ONLY with the response body. Do not include a salutation or a sign-off — those are added separately. No explanations, no meta-commentary.`;

  // ─── Reinforcement (spec §10.3) ──────────────────────────────────
  // Appended AFTER all user-configured sections so the rules survive any
  // attempted override from user-supplied content.
  prompt += `\n\n${INSTRUCTION_REINFORCEMENT}`;

  return prompt;
}

/**
 * Build the user prompt with review details.
 */
function buildUserPrompt(params: {
  reviewText: string;
  platform: string;
  rating?: number | null;
  detectedLanguage: string;
  isTestMode: boolean;
  customRegenerateInstructions?: string;
}): string {
  const { reviewText, platform, rating, detectedLanguage, isTestMode, customRegenerateInstructions } = params;

  let prompt = `Write a response to this ${platform} review`;

  if (rating) {
    prompt += ` (${rating}/5 stars)`;
  }

  // Spec §10.5: review text flows into the user prompt wrapped via the
  // sanitize helper so it is treated as data, not instructions. The wrapper
  // also strips any literal `<<<...>>>` markers that would attempt to spoof
  // the delimiters.
  prompt += ` in ${detectedLanguage}:

${wrapUserContent("Customer review", reviewText)}`;

  if (customRegenerateInstructions && customRegenerateInstructions.trim().length > 0) {
    // Spec §8.2 / §10.5: single-use directive for this regeneration, wrapped
    // to make injection inside it harmless, and followed by an explicit
    // binding sentence so the model treats it as a hard requirement for
    // this turn only.
    prompt += `\n\n${wrapUserContent("Additional instructions for this regeneration", customRegenerateInstructions)}

The Additional instructions block above is binding for this single regeneration only — apply it on top of the brand voice configuration.`;
  }

  if (isTestMode) {
    prompt += `\n\n(This is a test response to preview the brand voice settings)`;
  }

  return prompt;
}
