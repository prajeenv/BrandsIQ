/**
 * Claude AI service for response generation
 * Uses Anthropic's Claude API for generating brand-aligned review responses
 */

import Anthropic from "@anthropic-ai/sdk";

import { INSTRUCTION_REINFORCEMENT, wrapUserContent } from "./sanitize";

// Default model for response generation
export const DEFAULT_MODEL = "claude-sonnet-4-20250514";

/**
 * Brand voice configuration consumed by `generateReviewResponse`.
 *
 * Shape note (brand voice redesign):
 *   - All legacy fields (`formality`, `styleNotes`, `sampleResponses:
 *     string[]`) became OPTIONAL in iter 3 once the clean-reset migration
 *     dropped the underlying columns. The prompt builder ignores any that
 *     are missing. Iter 4 will remove them entirely from this interface
 *     and rewrite `buildSystemPrompt` to consume the V2 fields below.
 *   - V2 fields stay optional this iteration; `normalizeBrandVoice` will
 *     supply defaults. They're consumed by the rewritten prompt in iter 4.
 *
 * See `src/lib/ai/brand-voice-normalize.ts` for the canonical V2 shape
 * (`NormalizedBrandVoice`).
 */
export interface BrandVoiceConfig {
  tone: string;
  keyPhrases: string[];

  // ─── Legacy fields (iter 3: optional, deprecated; iter 4: removed) ─
  formality?: number;
  styleNotes?: string | null;
  sampleResponses?: string[];

  // ─── V2 fields (iter 2: optional, dormant; iter 4: consumed by buildSystemPrompt) ───
  styleGuidelines?: string[];
  /**
   * V2 sample responses: each entry is a typed object with a rating context
   * (1–5 or "any") and the response text. Iter 4 will render these as labeled
   * few-shot examples; iter 2 only locks the type.
   */
  sampleResponsesV2?: Array<{
    ratingContext: 1 | 2 | 3 | 4 | 5 | "any";
    responseText: string;
  }>;
  acknowledgeNamedStaff?: boolean;
  acknowledgeOccasions?: boolean;
  salutationPattern?: string;
  signoffLines?: string;
  negativeReviewEmailEnabled?: boolean;
  negativeReviewFraming?: "management_contact" | "investigation" | "open_channel" | "custom";
  negativeReviewFramingCustom?: string | null;
  replyToEmail?: string | null;
}

export type ToneModifier = "professional" | "friendly" | "empathetic";

export interface GenerateResponseParams {
  reviewText: string;
  platform: string;
  rating?: number | null;
  detectedLanguage?: string;
  brandVoice: BrandVoiceConfig;
  isTestMode?: boolean;
  toneModifier?: ToneModifier;
  /**
   * Optional free-text instructions for a single regeneration. Plumbed in
   * iteration 1 but only wired into the UI in iteration 6 of the brand voice
   * redesign. When provided, the value is wrapped via the sanitize helper and
   * appended to the user prompt as a binding directive for this generation
   * only — it is never persisted.
   */
  customRegenerateInstructions?: string;
}

export interface GeneratedResponse {
  responseText: string;
  model: string;
}

/**
 * Get formality description based on level (1-5)
 */
function getFormalityDescription(level: number): string {
  const descriptions: Record<number, string> = {
    1: "very casual and conversational, like talking to a friend",
    2: "casual but still polite and friendly",
    3: "balanced mix of professional and approachable",
    4: "formal and professional with proper business language",
    5: "very formal, polished, and highly professional",
  };
  return descriptions[level] || descriptions[3];
}

/**
 * Helper to delay execution
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get tone modifier description for prompt
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
 * Generate a response to a review using Claude AI
 */
export async function generateReviewResponse(
  params: GenerateResponseParams
): Promise<GeneratedResponse> {
  const {
    reviewText,
    platform,
    rating,
    detectedLanguage = "English",
    brandVoice,
    isTestMode = false,
    toneModifier,
    customRegenerateInstructions,
  } = params;

  // E2E mock mode: return canned response without calling Claude API
  // Set E2E_MOCK_AI=true on the Vercel Preview environment to enable
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

  // Build the system prompt with brand voice configuration
  const systemPrompt = buildSystemPrompt(brandVoice, detectedLanguage, toneModifier);

  // Build the user prompt with review details
  const userPrompt = buildUserPrompt({
    reviewText,
    platform,
    rating,
    detectedLanguage,
    isTestMode,
    customRegenerateInstructions,
  });

  // Retry logic for transient errors (429 rate limit, 529 overloaded)
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        system: systemPrompt,
      });

      // Extract text from response
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
        // Exponential backoff: 1s, 2s, 4s
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
 * Build the system prompt with brand voice configuration
 */
function buildSystemPrompt(
  brandVoice: BrandVoiceConfig,
  language: string,
  toneModifier?: ToneModifier
): string {
  // Iter 3: `formality`, `styleNotes`, and `sampleResponses` (the legacy
  // string-array form) are now optional on BrandVoiceConfig because the
  // underlying columns were dropped by the clean-reset migration. The
  // route callers no longer populate them. We guard each below so the
  // current prompt keeps working unchanged for clean inputs. Iter 4 will
  // delete this whole block and rebuild buildSystemPrompt against the V2
  // shape (styleGuidelines / sampleResponsesV2 / the Personalization +
  // Contact/sign-off fields).
  const { tone, keyPhrases } = brandVoice;
  const formality = brandVoice.formality;
  const styleNotes = brandVoice.styleNotes;
  const sampleResponses = brandVoice.sampleResponses;

  let prompt = `You are a customer service representative writing responses to customer reviews.

IMPORTANT INSTRUCTIONS:
1. Write the response in ${language} (the same language as the review)
2. Keep the response under 500 characters
3. Be genuine and human - avoid sounding robotic or template-like
4. Address specific points mentioned in the review when relevant
5. Never be defensive or argumentative, even for negative reviews

BRAND VOICE CONFIGURATION:
- Tone: ${tone}`;

  if (typeof formality === "number") {
    prompt += `\n- Formality Level: ${getFormalityDescription(formality)}`;
  }

  // Add tone modifier if specified (for regeneration with different tone)
  if (toneModifier) {
    prompt += `\n- IMPORTANT Tone Override: Be ${getToneModifierDescription(toneModifier)}`;
  }

  if (keyPhrases.length > 0) {
    prompt += `\n- REQUIRED Key Phrases (you MUST incorporate at least 1-2 of these naturally): ${keyPhrases.join(", ")}`;
  }

  if (styleNotes) {
    prompt += `\n- Style Guidelines: ${styleNotes}`;
  }

  if (sampleResponses && sampleResponses.length > 0) {
    prompt += `\n\nSAMPLE RESPONSES FOR REFERENCE (match this style):`;
    sampleResponses.forEach((sample, index) => {
      prompt += `\n${index + 1}. "${sample}"`;
    });
  }

  prompt += `\n\nRespond ONLY with the response text. Do not include any explanations, notes, or meta-commentary.`;

  // Spec §10.3 — appended AFTER all user-configured sections so the model treats
  // these as the binding rules even if user-supplied content attempts to override.
  prompt += `\n\n${INSTRUCTION_REINFORCEMENT}`;

  return prompt;
}

/**
 * Build the user prompt with review details
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

  // Spec §10.5: review text flows into the user prompt wrapped via the sanitize
  // helper so it is treated as data, not instructions. The wrapper also strips
  // any literal `<<<...>>>` markers that would attempt to spoof the delimiters.
  prompt += ` in ${detectedLanguage}:

${wrapUserContent("Customer review", reviewText)}`;

  if (customRegenerateInstructions && customRegenerateInstructions.trim().length > 0) {
    // Spec §8.2 / §10.5: single-use directive for this regeneration, wrapped to
    // make injection inside it harmless, and followed by an explicit binding
    // sentence so the model treats it as a hard requirement for this turn only.
    prompt += `\n\n${wrapUserContent("Additional instructions for this regeneration", customRegenerateInstructions)}

The Additional instructions block above is binding for this single regeneration only — apply it on top of the brand voice configuration.`;
  }

  if (isTestMode) {
    prompt += `\n\n(This is a test response to preview the brand voice settings)`;
  }

  return prompt;
}
