import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReviewResponse, DEFAULT_MODEL } from "@/lib/ai/claude";
import { assembleResponse } from "@/lib/ai/post-process";
import { deductCreditsAtomic, getOrCreateBrandVoice } from "@/lib/db-utils";
import { CREDIT_COSTS } from "@/lib/constants";
import { logIfInjectionAttempt } from "@/lib/security-log";
import { CreditActionValues } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 5/25 simplification: the per-regeneration tone override was removed
// from the dialog. The brand voice tone applies as configured; users
// who want a one-off register change use the Additional Instructions
// free-text field. `additionalInstructions` stays as the only per-
// regeneration knob — capped at 500 chars, not persisted, wrapped via
// the sanitize helper in claude.ts before injection into the user
// prompt.
const regenerateSchema = z.object({
  additionalInstructions: z.string().max(500).optional(),
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
            message: "Invalid regenerate request body.",
            details: validationResult.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { additionalInstructions } = validationResult.data;

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

    // Non-blocking audit log for prompt-injection patterns in the review text.
    // Spec §10.6 — regeneration still proceeds either way.
    await logIfInjectionAttempt({
      // reviewText is nullable for star-only reviews; the detector needs a
      // string. An empty string yields no matches, which is correct.
      text: review.reviewText ?? "",
      userId: session.user.id,
      fieldName: "review_text",
    });

    // Get brand voice
    const brandVoice = await getOrCreateBrandVoice(session.user.id);

    // Generate new response — brand voice tone applies as configured.
    // E2E mock opt-in (header gate — see DECISIONS.md #61).
    const e2eMockOptIn = request.headers.get("x-e2e-mock") === "1";

    // Iter 4: pass the V2 brand voice row directly. Sentiment is forwarded
    // so the rating-conditional structure router can pick the right
    // template (sentiment overrides rating — see spec §9.5).
    //
    // 5/25 simplification: `toneModifier` is no longer forwarded. The
    // brand voice tone is applied via the brandVoice arg; per-regen
    // overrides go through `customRegenerateInstructions` (free text).
    let generatedResponse;
    try {
      generatedResponse = await generateReviewResponse({
        reviewText: review.reviewText,
        platform: review.platform,
        rating: review.rating,
        sentiment: review.sentiment,
        detectedLanguage: review.detectedLanguage,
        brandVoice,
        // Iter 6: forward the per-regeneration free-text directive to the
        // iter-1 sanitize-wrapped slot in claude.ts. Single-use, not
        // persisted; ZOD-capped at 500 chars upstream.
        customRegenerateInstructions: additionalInstructions,
        e2eMockOptIn,
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

    // Iter 5: assemble the final response (salutation + body + sign-off
    // + conditional email substitution). Body is internally truncated to
    // RESPONSE_BODY_CHAR_MAX; salutation and sign-off are appended after
    // and never truncated. See post-process.ts and spec §7 / §9.4 /
    // §13.1 / §13.2.
    const responseText = assembleResponse({
      modelBody: generatedResponse.responseText,
      brandVoice,
      review: {
        rating: review.rating,
        sentiment: review.sentiment,
        reviewerName: review.reviewerName,
      },
      // 5/30 — language-aware salutation/sign-off. See generate route +
      // DECISIONS.md #107.
      effectiveLanguage: generatedResponse.effectiveLanguage,
    });

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
        newTone: brandVoice.tone,
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
      // This allows the user to restore to the previous version.
      //
      // The archived row preserves whatever produced the PREVIOUS state:
      // text, tone, credits, edited-flag, AND the additionalInstructions
      // that produced that previous state. This is how the version-
      // history UI can later show "what did the user type to produce this
      // older response?" alongside each row.
      await tx.responseVersion.create({
        data: {
          reviewResponseId: review.response!.id,
          responseText: review.response!.responseText, // Save OLD text before overwriting
          toneUsed: review.response!.toneUsed,
          creditsUsed: review.response!.creditsUsed, // Credits used for the old generation
          isEdited: review.response!.isEdited, // Preserve edited status for history
          additionalInstructions: review.response!.additionalInstructions, // Snapshot the instruction that produced the OLD state
          // Preserve the timestamp of the response state we're about
          // to overwrite. We use `updatedAt`, not `createdAt`, because
          // the live row's `createdAt` is fixed to the time of initial
          // generation and never moves — `updatedAt` bumps on every
          // regen/edit (Prisma `@updatedAt`), so it's the correct
          // "when did this state originate" timestamp for any non-
          // first archive. The version-history UI reads this value
          // and displays it as the per-version "X minutes ago" label.
          originalCreatedAt: review.response!.updatedAt,
        },
      });

      // Then update ReviewResponse with new text. The NEW state's
      // `additionalInstructions` is whatever the user just typed (or
      // null if the textarea was empty/whitespace).
      const trimmedInstructions = additionalInstructions?.trim();
      const updated = await tx.reviewResponse.update({
        where: { id: review.response!.id },
        data: {
          responseText,
          toneUsed: brandVoice.tone,
          generationModel: generatedResponse.model || DEFAULT_MODEL,
          creditsUsed: CREDIT_COSTS.REGENERATE_RESPONSE,
          isEdited: false, // Reset edited flag on regeneration
          editedAt: null,
          additionalInstructions:
            trimmedInstructions && trimmedInstructions.length > 0
              ? trimmedInstructions
              : null,
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
          // 5/26 — surface the persisted instruction so the client can
          // refresh the live-response reveal without a follow-up GET.
          additionalInstructions: updatedResponse.additionalInstructions,
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
