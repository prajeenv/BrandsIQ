import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { testBrandVoiceSchema } from "@/lib/validations";
import { generateReviewResponse } from "@/lib/ai/claude";
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

    // Iter 3: project the V2 brand_voices row to the legacy
    // BrandVoiceConfig shape the current prompt builder consumes.
    // Same bridge as in generate/regenerate; deleted in iter 4 by the
    // prompt rewrite that consumes the V2 fields directly.
    const styleGuidelines = Array.isArray(brandVoice.styleGuidelines)
      ? (brandVoice.styleGuidelines as unknown[]).filter((s): s is string => typeof s === "string")
      : [];
    const sampleResponses = Array.isArray(brandVoice.sampleResponses)
      ? (brandVoice.sampleResponses as unknown[])
          .map((s) =>
            s && typeof s === "object" && "responseText" in s
              ? (s as { responseText: unknown }).responseText
              : undefined,
          )
          .filter((t): t is string => typeof t === "string" && t.length > 0)
      : [];

    // Generate test response using Claude
    const generatedResponse = await generateReviewResponse({
      reviewText,
      platform: platform || "Google",
      rating,
      detectedLanguage: languageResult.language,
      brandVoice: {
        tone: brandVoice.tone,
        keyPhrases: brandVoice.keyPhrases,
        styleNotes: styleGuidelines.length > 0 ? styleGuidelines.join("\n") : null,
        sampleResponses,
      },
      isTestMode: true,
    });

    // Project the V2 row back to the legacy brand-voice shape the test
    // panel UI currently consumes. The panel reads `tone`, `formality`
    // (gone but stubbed at 3 here so the UI doesn't blow up), and
    // `styleNotes` as a plain string — same surface as the brand-voice
    // GET response. Iter 6 deletes this projection along with the form.
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
          tone: brandVoice.tone,
          formality: 3,
          keyPhrases: brandVoice.keyPhrases,
          styleNotes: styleGuidelines.length > 0 ? styleGuidelines.join("\n") : null,
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
