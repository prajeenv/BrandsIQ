import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { testBrandVoiceSchema } from "@/lib/validations";
import { generateReviewResponse } from "@/lib/ai/claude";
import { assembleResponse } from "@/lib/ai/post-process";
import { normalizeBrandVoice } from "@/lib/ai/brand-voice-normalize";
import { detectLanguage } from "@/lib/language-detection";

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

    // Iter 5: run the same post-processing assembly as the real generate
    // / regenerate routes so the test panel shows the user exactly what
    // they would see on a real review (preview == prod). The test panel
    // does not collect a reviewer name or sentiment, so the salutation
    // falls back to "Hello," via canonicalisation and the email
    // substitution fires only when the panel passes a 1- or 2-star
    // rating AND the brand voice has the toggle on + a reply-to email.
    const responseText = assembleResponse({
      modelBody: generatedResponse.responseText,
      brandVoice,
      review: {
        rating: rating ?? null,
        sentiment: null,
        reviewerName: null,
      },
      // 5/30 — language-aware salutation/sign-off. Same forwarding as the
      // generate + regenerate routes so the test panel matches prod
      // behaviour for non-English brand voices too. See DECISIONS.md #107.
      effectiveLanguage: generatedResponse.effectiveLanguage,
    });

    // Iter 6: legacy bridge deleted. The test panel UI now consumes the
    // V2 shape directly. Strip the V2 projection down to the small subset
    // the panel actually reads (tone label + key phrases + style guidelines).
    const v2 = normalizeBrandVoice(brandVoice);
    return NextResponse.json({
      success: true,
      data: {
        response: {
          responseText,
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
          tone: v2.tone,
          keyPhrases: v2.keyPhrases,
          styleGuidelines: v2.styleGuidelines,
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
