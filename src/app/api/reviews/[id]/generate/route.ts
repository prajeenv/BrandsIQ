import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateReviewResponse, DEFAULT_MODEL, ToneModifier } from "@/lib/ai/claude";
import { assembleResponse } from "@/lib/ai/post-process";
import { deductCreditsAtomic, getOrCreateBrandVoice } from "@/lib/db-utils";
import { CREDIT_COSTS } from "@/lib/constants";
import { logIfInjectionAttempt } from "@/lib/security-log";
import { CreditActionValues } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/reviews/[id]/generate - Generate AI response for a review
 *
 * - Checks user has credits (>= 1.0)
 * - Fetches review and brand voice
 * - Calls Claude API to generate response
 * - Deducts 1.0 credit (atomic transaction)
 * - Saves response to ReviewResponse table
 * - Creates initial ResponseVersion entry
 * - Logs credit usage (CreditUsage table)
 * - Returns response with creditsRemaining
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

    // Parse request body for optional tone
    let tone: ToneModifier | undefined;
    try {
      const body = await request.json();
      if (body.tone && ["professional", "friendly", "empathetic"].includes(body.tone)) {
        tone = body.tone as ToneModifier;
      }
    } catch {
      // Body is optional, continue without tone
    }

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

    // Check credits
    if (user.credits < CREDIT_COSTS.GENERATE_RESPONSE) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INSUFFICIENT_CREDITS",
            message: `You have ${user.credits} credits remaining`,
            details: {
              creditsNeeded: CREDIT_COSTS.GENERATE_RESPONSE,
              creditsAvailable: user.credits,
              resetDate: user.creditsResetDate.toISOString(),
              upgradeUrl: "/pricing",
            },
          },
        },
        { status: 402 }
      );
    }

    // Get review
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

    // Check if response already exists
    if (review.response) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RESPONSE_EXISTS",
            message: "A response already exists for this review. Use regenerate endpoint instead.",
          },
        },
        { status: 409 }
      );
    }

    // Non-blocking audit log for prompt-injection patterns in the review text.
    // Spec §10.6 — generation still proceeds either way.
    await logIfInjectionAttempt({
      text: review.reviewText,
      userId: session.user.id,
      fieldName: "review_text",
    });

    // Get or create brand voice
    const brandVoice = await getOrCreateBrandVoice(session.user.id);

    // Generate response using Claude API. Iter 4: pass the V2 brand voice
    // row directly. `generateReviewResponse` runs it through
    // `normalizeBrandVoice` defensively, then `buildSystemPrompt` consumes
    // the V2 fields (styleGuidelines as bullets, sample-responses as
    // labeled few-shot examples, Personalization toggles + negative-review
    // framing as conditional fragments). The iter-3 inline V2→legacy
    // projection is gone — that's spec §9.3 / DECISION 55.
    // E2E mock opt-in: Playwright tests send `x-e2e-mock: 1` so the
    // canned mock response fires only for tests, never for manual users
    // hitting the same Preview deployment. The env-var alone is not
    // enough — see DECISIONS.md #61.
    const e2eMockOptIn = request.headers.get("x-e2e-mock") === "1";

    let generatedResponse;
    try {
      generatedResponse = await generateReviewResponse({
        reviewText: review.reviewText,
        platform: review.platform,
        rating: review.rating,
        sentiment: review.sentiment,
        detectedLanguage: review.detectedLanguage,
        brandVoice,
        toneModifier: tone,
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

    // Iter 5: deterministically assemble the final response. `assembleResponse`
    // prepends the configured salutation (with {firstName} substitution from
    // review.reviewerName and canonicalisation when no name is available),
    // appends the sign-off block (literal \n converted to real newlines),
    // and for negative reviews with the email-invitation toggle on
    // substitutes the [your email] placeholder in the model body with the
    // brand's configured reply-to email. The model body is internally
    // truncated to RESPONSE_BODY_CHAR_MAX (sentence-boundary aware);
    // salutation and sign-off are appended afterwards and never truncated.
    // Spec §7, §9.4, §13.1, §13.2.
    const responseText = assembleResponse({
      modelBody: generatedResponse.responseText,
      brandVoice,
      review: {
        rating: review.rating,
        sentiment: review.sentiment,
        reviewerName: review.reviewerName,
      },
    });

    // Deduct credits atomically
    const creditResult = await deductCreditsAtomic(
      session.user.id,
      CREDIT_COSTS.GENERATE_RESPONSE,
      CreditActionValues.GENERATE_RESPONSE,
      reviewId,
      undefined,
      {
        // Audit trail: reviewId stored here survives FK becoming null on delete
        reviewId,
        platform: review.platform,
        rating: review.rating,
        tone: tone || "default",
        generatedAt: new Date().toISOString(),
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

    // Create response in a transaction
    // Note: No version entry created here - version history only stores PREVIOUS versions
    // when the user edits or regenerates. The current response doesn't need a version entry.
    const result = await prisma.$transaction(async (tx) => {
      // Create ReviewResponse
      const reviewResponse = await tx.reviewResponse.create({
        data: {
          reviewId,
          responseText,
          creditsUsed: CREDIT_COSTS.GENERATE_RESPONSE,
          toneUsed: tone || "default",
          generationModel: generatedResponse.model || DEFAULT_MODEL,
        },
      });

      // Update credit usage with response ID
      await tx.creditUsage.updateMany({
        where: {
          userId: session.user.id,
          reviewId,
          reviewResponseId: null,
          action: CreditActionValues.GENERATE_RESPONSE,
        },
        data: {
          reviewResponseId: reviewResponse.id,
        },
      });

      return reviewResponse;
    });

    return NextResponse.json({
      success: true,
      data: {
        response: {
          id: result.id,
          reviewId: result.reviewId,
          responseText: result.responseText,
          creditsUsed: result.creditsUsed,
          toneUsed: result.toneUsed,
          generationModel: result.generationModel,
          isEdited: result.isEdited,
          isPublished: result.isPublished,
          // 5/26 — initial generation has no per-regeneration instruction,
          // but the field is included for response-shape consistency with
          // the regenerate/edit routes. Always null here.
          additionalInstructions: result.additionalInstructions,
          createdAt: result.createdAt.toISOString(),
        },
        creditsRemaining: creditResult.user?.credits ?? user.credits - CREDIT_COSTS.GENERATE_RESPONSE,
      },
    });
  } catch (error) {
    console.error("Error generating response:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate response",
        },
      },
      { status: 500 }
    );
  }
}
