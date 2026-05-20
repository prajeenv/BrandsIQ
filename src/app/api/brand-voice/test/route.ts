import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { testBrandVoiceSchema } from "@/lib/validations";
import { generateReviewResponse } from "@/lib/ai/claude";
import { detectLanguage } from "@/lib/language-detection";
import { toLegacyShape } from "../_legacy-bridge";

/**
 * POST /api/brand-voice/test - Test brand voice with a sample review
 * Generates a response using the user's brand voice settings
 * Does NOT deduct credits (test mode)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = testBrandVoiceSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validationResult.error.issues[0]?.message || "Invalid input",
            details: validationResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { reviewText, platform, rating } = validationResult.data;

    // Get user's brand voice (or create default)
    let brandVoice = await prisma.brandVoice.findUnique({
      where: { userId: session.user.id },
    });

    if (!brandVoice) {
      // V2 shape (iter 3 clean-reset). All omitted columns take their
      // DB-level defaults from prisma/schema.prisma.
      brandVoice = await prisma.brandVoice.create({
        data: {
          userId: session.user.id,
          tone: "friendly_professional",
          keyPhrases: ["Thank you", "We appreciate your feedback"],
          styleGuidelines: ["Be genuine and empathetic"],
        },
      });
    }

    // Detect language of the review
    const languageResult = detectLanguage(reviewText);

    // E2E mock opt-in (header gate — see DECISIONS.md #61).
    const e2eMockOptIn = request.headers.get("x-e2e-mock") === "1";

    // Iter 4: pass the V2 brand voice row directly. The iter-3 inline
    // V2→legacy projection is gone — `generateReviewResponse` now
    // `normalizeBrandVoice`s the input and `buildSystemPrompt` consumes
    // the V2 fields natively.
    const generatedResponse = await generateReviewResponse({
      reviewText,
      platform: platform || "Google",
      rating,
      detectedLanguage: languageResult.language,
      brandVoice,
      isTestMode: true,
      e2eMockOptIn,
    });

    // The test panel UI still consumes the legacy brand-voice shape on
    // the response (iter 6 rewrites the panel). Reuse the brand-voice
    // bridge's `toLegacyShape` so the projection has one source of
    // truth, then strip down to the subset the panel actually reads.
    const legacy = toLegacyShape(brandVoice);
    return NextResponse.json({
      success: true,
      data: {
        response: {
          responseText: generatedResponse.responseText,
          model: generatedResponse.model,
          isTestMode: true,
          creditsUsed: 0, // No credits deducted for test mode
        },
        review: {
          reviewText,
          platform: platform || "Google",
          rating,
          detectedLanguage: languageResult.language,
        },
        brandVoice: {
          tone: legacy.tone,
          formality: legacy.formality,
          keyPhrases: legacy.keyPhrases,
          styleNotes: legacy.styleNotes,
        },
      },
    });
  } catch (error) {
    console.error("Error testing brand voice:", error);

    // Check if it's an API key error
    if (error instanceof Error && error.message.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "API_NOT_CONFIGURED",
            message: "AI service is not configured. Please contact support.",
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate test response",
        },
      },
      { status: 500 }
    );
  }
}
