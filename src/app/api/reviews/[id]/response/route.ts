import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { VALIDATION_LIMITS } from "@/lib/constants";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateResponseSchema = z.object({
  responseText: z
    .string()
    .min(1, "Response text is required")
    .max(VALIDATION_LIMITS.RESPONSE_TEXT_MAX, `Response must be under ${VALIDATION_LIMITS.RESPONSE_TEXT_MAX} characters`),
});

/**
 * PUT /api/reviews/[id]/response - Edit response manually
 *
 * - Save current text to version history (so it can be viewed later)
 * - Update responseText with new text
 * - Set isEdited = true, editedAt = now
 * - No credit deduction (creditsUsed = 0 for edits)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const validationResult = updateResponseSchema.safeParse(body);

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

    const { responseText } = validationResult.data;

    // Get review with response
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

    if (!review.response) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_RESPONSE",
            message: "No response exists for this review",
          },
        },
        { status: 400 }
      );
    }

    // Save current state to version history first, then update
    // No credits charged for manual edits
    const updatedResponse = await prisma.$transaction(async (tx) => {
      // Skip if the text hasn't actually changed
      if (responseText !== review.response!.responseText) {
        // Save the current (pre-edit) text to version history.
        // Preserve the creditsUsed, isEdited, and additionalInstructions
        // of the current response so the archive records "what produced
        // this older state" — same archive contract as the regenerate
        // route uses.
        await tx.responseVersion.create({
          data: {
            reviewResponseId: review.response!.id,
            responseText: review.response!.responseText,
            toneUsed: review.response!.toneUsed,
            creditsUsed: review.response!.creditsUsed,
            isEdited: review.response!.isEdited,
            additionalInstructions: review.response!.additionalInstructions,
            // Preserve the timestamp of the response state we're about
            // to overwrite, so the version-history UI shows when the
            // archived text was actually produced (last generated or
            // edited) instead of "just now" when this archive row was
            // created. We use `updatedAt` here, not `createdAt`,
            // because the live row's `createdAt` is fixed to the time
            // of initial generation and never moves — `updatedAt`
            // bumps on every regen/edit (Prisma `@updatedAt`), so it's
            // the correct "when did this state originate" timestamp
            // for any non-first archive. Matches the regenerate
            // route's archive contract.
            originalCreatedAt: review.response!.updatedAt,
          },
        });
      }

      // Update the response with new text. Manual edits aren't AI-
      // generated, so `additionalInstructions` is cleared on the live
      // row — there's no instruction associated with the edited text.
      const updated = await tx.reviewResponse.update({
        where: { id: review.response!.id },
        data: {
          responseText,
          isEdited: true,
          editedAt: new Date(),
          creditsUsed: 0,
          additionalInstructions: null,
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
          isEdited: updatedResponse.isEdited,
          editedAt: updatedResponse.editedAt?.toISOString() || null,
          toneUsed: updatedResponse.toneUsed,
          isPublished: updatedResponse.isPublished,
          // 5/26 — surface the (now-null) instruction so the client can
          // collapse the live-response reveal after a manual edit.
          additionalInstructions: updatedResponse.additionalInstructions,
          createdAt: updatedResponse.createdAt.toISOString(),
          updatedAt: updatedResponse.updatedAt.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Error updating response:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update response",
        },
      },
      { status: 500 }
    );
  }
}
