/**
 * Claude AI service for response generation
 * Uses Anthropic's Claude API for generating brand-aligned review responses
 */

import Anthropic from "@anthropic-ai/sdk";

// Default model for response generation
export const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export interface BrandVoiceConfig {
  tone: string;
  formality: number;
  keyPhrases: string[];
  styleNotes: string | null;
  sampleResponses: string[];
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
  } = params;

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
  const { tone, formality, keyPhrases, styleNotes, sampleResponses } =
    brandVoice;

  let prompt = `You are a customer service representative writing responses to customer reviews.

IMPORTANT INSTRUCTIONS:
1. Write the response in ${language} (the same language as the review)
2. Keep the response under 500 characters
3. Be genuine and human - avoid sounding robotic or template-like
4. Address specific points mentioned in the review when relevant
5. Never be defensive or argumentative, even for negative reviews

BRAND VOICE CONFIGURATION:
- Tone: ${tone}
- Formality Level: ${getFormalityDescription(formality)}`;

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

  if (sampleResponses.length > 0) {
    prompt += `\n\nSAMPLE RESPONSES FOR REFERENCE (match this style):`;
    sampleResponses.forEach((sample, index) => {
      prompt += `\n${index + 1}. "${sample}"`;
    });
  }

  prompt += `\n\nRespond ONLY with the response text. Do not include any explanations, notes, or meta-commentary.`;

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
}): string {
  const { reviewText, platform, rating, detectedLanguage, isTestMode } = params;

  let prompt = `Write a response to this ${platform} review`;

  if (rating) {
    prompt += ` (${rating}/5 stars)`;
  }

  prompt += ` in ${detectedLanguage}:

"${reviewText}"`;

  if (isTestMode) {
    prompt += `\n\n(This is a test response to preview the brand voice settings)`;
  }

  return prompt;
}
