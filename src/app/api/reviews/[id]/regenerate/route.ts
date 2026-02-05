import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReviewResponse, DEFAULT_MODEL, ToneModifier } from "@/lib/ai/claude";
import { deductCreditsAtomic, getOrCreateBrandVoice } from "@/lib/db-utils";
import { CREDIT_COSTS, VALIDATION_LIMITS } from "@/lib/constants";
import { CreditActionValues } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const regenerateSchema = z.object({
  tone: z.enum(["professional", "friendly", "empathetic"]),
});

/**
 * POST /api/reviews/[id]/regenerate - Regenerate response with different tone
 *
 * - Check user has credits (>= 1.0)
 * - Fetch existing response
 * - Generate new response with tone modifier
 * - Deduct 1.0 credits
 * - Update ResponseText
 * - Create new ResponseVersion entry
 * - Log credit usage
 * - Return updated response
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { id: reviewId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = regenerateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Tone is required. Must be one of: professional, friendly, empathetic",
            details: validationResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { tone } = validationResult.data;

    // Get user with credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        credits: true,
        tier: true,
        creditsResetDate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "USER_NOT_FOUND", message: "User not found" },
        },
        { status: 404 }
      );
    }

    // Check credits (regeneration costs 1.0)
    if (user.credits < CREDIT_COSTS.REGENERATE_RESPONSE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INSUFFICIENT_CREDITS",
            message: `You have ${user.credits} credits remaining. Regeneration requires ${CREDIT_COSTS.REGENERATE_RESPONSE} credits.`,
            details: {
              creditsNeeded: CREDIT_COSTS.REGENERATE_RESPONSE,
              creditsAvailable: user.credits,
              resetDate: user.creditsResetDate.toISOString(),
              upgradeUrl: "/pricing",
            },
          },
        },
        { status: 402 }
      );
    }

    // Get review with existing response
    const review = await prisma.review.findFirst({
      where: {
        id: reviewId,
        userId: session.user.id,
      },
      include: {
        response: true,
      },
    });

    if (!review) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Review not found" },
        },
        { status: 404 }
      );
    }

    // Check if response exists
    if (!review.response) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_RESPONSE",
            message: "No response exists for this review. Use generate endpoint first.",
          },
        },
        { status: 400 }
      );
    }

    // Get brand voice
    const brandVoice = await getOrCreateBrandVoice(session.user.id);

    // Generate new response with tone modifier
    let generatedResponse;
    try {
      generatedResponse = await generateReviewResponse({
        reviewText: review.reviewText,
        platform: review.platform,
        rating: review.rating,
        detectedLanguage: review.detectedLanguage,
        brandVoice: {
          tone: brandVoice.tone,
          formality: brandVoice.formality,
          keyPhrases: brandVoice.keyPhrases,
          styleNotes: brandVoice.styleNotes,
          sampleResponses: brandVoice.sampleResponses,
        },
        toneModifier: tone as ToneModifier,
      });
    } catch (error) {
      console.error("Claude API error:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "AI_SERVICE_UNAVAILABLE",
            message: "AI service is temporarily unavailable. Please try again in a few moments.",
            retryAfter: 60,
          },
        },
        { status: 503 }
      );
    }

    // Truncate response if too long
    let responseText = generatedResponse.responseText;
    if (responseText.length > VALIDATION_LIMITS.RESPONSE_TEXT_MAX) {
      responseText = responseText.substring(0, VALIDATION_LIMITS.RESPONSE_TEXT_MAX);
      const lastPeriod = responseText.lastIndexOf(".");
      if (lastPeriod > VALIDATION_LIMITS.RESPONSE_TEXT_MAX - 100) {
        responseText = responseText.substring(0, lastPeriod + 1);
      }
    }

    // Deduct credits atomically
    const creditResult = await deductCreditsAtomic(
      session.user.id,
      CREDIT_COSTS.REGENERATE_RESPONSE,
      CreditActionValues.REGENERATE,
      reviewId,
      review.response.id,
      {
        // Audit trail: reviewId stored here survives FK becoming null on delete
        reviewId,
        platform: review.platform,
        rating: review.rating,
        previousTone: review.response.toneUsed,
        newTone: tone,
        regeneratedAt: new Date().toISOString(),
      }
    );

    if (!creditResult.success) {
      const errorCode = "error" in creditResult ? creditResult.error : "UNKNOWN_ERROR";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: errorCode === "INSUFFICIENT_CREDITS" ? "INSUFFICIENT_CREDITS" : "CREDIT_ERROR",
            message: errorCode === "INSUFFICIENT_CREDITS"
              ? "Insufficient credits"
              : "Failed to process credits",
          },
        },
        { status: errorCode === "INSUFFICIENT_CREDITS" ? 402 : 500 }
      );
    }

    // Update response and save old version in a transaction
    const updatedResponse = await prisma.$transaction(async (tx) => {
      // First, save the CURRENT (old) response to version history
      // This allows the user to restore to the previous version
      await tx.responseVersion.create({
        data: {
          reviewResponseId: review.response!.id,
          responseText: review.response!.responseText, // Save OLD text before overwriting
          toneUsed: review.response!.toneUsed,
          creditsUsed: review.response!.creditsUsed, // Credits used for the old generation
          isEdited: review.response!.isEdited, // Preserve edited status for history
          originalCreatedAt: review.response!.createdAt, // Preserve original creation timestamp
        },
      });

      // Then update ReviewResponse with new text
      const updated = await tx.reviewResponse.update({
        where: { id: review.response!.id },
        data: {
          responseText,
          toneUsed: tone,
          generationModel: generatedResponse.model || DEFAULT_MODEL,
          creditsUsed: CREDIT_COSTS.REGENERATE_RESPONSE,
          isEdited: false, // Reset edited flag on regeneration
          editedAt: null,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: {
        response: {
          id: updatedResponse.id,
          reviewId: updatedResponse.reviewId,
          responseText: updatedResponse.responseText,
          creditsUsed: CREDIT_COSTS.REGENERATE_RESPONSE,
          toneUsed: updatedResponse.toneUsed,
          generationModel: updatedResponse.generationModel,
          isEdited: updatedResponse.isEdited,
          isPublished: updatedResponse.isPublished,
          createdAt: updatedResponse.createdAt.toISOString(),
          updatedAt: updatedResponse.updatedAt.toISOString(),
        },
        creditsRemaining: creditResult.user?.credits ?? user.credits - CREDIT_COSTS.REGENERATE_RESPONSE,
      },
    });
  } catch (error) {
    console.error("Error regenerating response:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to regenerate response",
        },
      },
      { status: 500 }
    );
  }
}
