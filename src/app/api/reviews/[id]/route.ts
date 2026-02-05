import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectLanguage } from "@/lib/language-detection";
import { updateReviewSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/reviews/[id] - Get single review with response and versions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    const review = await prisma.review.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        response: {
          include: {
            versions: {
              orderBy: { createdAt: "desc" },
              take: 10, // Limit to last 10 versions
            },
          },
        },
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

    return NextResponse.json({
      success: true,
      data: {
        review: {
          id: review.id,
          platform: review.platform,
          reviewText: review.reviewText,
          rating: review.rating,
          reviewerName: review.reviewerName,
          reviewDate: review.reviewDate?.toISOString() || null,
          detectedLanguage: review.detectedLanguage,
          sentiment: review.sentiment,
          externalId: review.externalId,
          externalUrl: review.externalUrl,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
          response: review.response
            ? {
                id: review.response.id,
                responseText: review.response.responseText,
                isEdited: review.response.isEdited,
                editedAt: review.response.editedAt?.toISOString() || null,
                creditsUsed: review.response.creditsUsed,
                toneUsed: review.response.toneUsed,
                generationModel: review.response.generationModel,
                isPublished: review.response.isPublished,
                publishedAt: review.response.publishedAt?.toISOString() || null,
                createdAt: review.response.createdAt.toISOString(),
                updatedAt: review.response.updatedAt.toISOString(),
                totalCreditsUsed:
                  review.response.creditsUsed +
                  review.response.versions.reduce((sum, v) => sum + v.creditsUsed, 0),
                versions: review.response.versions.map((v) => ({
                  id: v.id,
                  responseText: v.responseText,
                  toneUsed: v.toneUsed,
                  creditsUsed: v.creditsUsed,
                  isEdited: v.isEdited,
                  createdAt: v.createdAt.toISOString(),
                  originalCreatedAt: v.originalCreatedAt?.toISOString() ?? v.createdAt.toISOString(),
                })),
              }
            : null,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching review:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch review",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reviews/[id] - Update review
 * Re-runs language detection if text changed
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

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validationResult = updateReviewSchema.safeParse(body);
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

    // Check if review exists and belongs to user
    const existingReview = await prisma.review.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!existingReview) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Review not found" },
        },
        { status: 404 }
      );
    }

    const { platform, reviewText, rating, reviewerName, reviewDate, detectedLanguage: userOverrideLanguage } = validationResult.data;

    // Build update data
    const updateData: {
      platform?: string;
      reviewText?: string;
      rating?: number | null;
      reviewerName?: string | null;
      reviewDate?: Date | null;
      detectedLanguage?: string;
    } = {};

    if (platform !== undefined) updateData.platform = platform;
    if (reviewText !== undefined) {
      updateData.reviewText = reviewText;
      // Re-run language detection if text changed
      if (userOverrideLanguage) {
        updateData.detectedLanguage = userOverrideLanguage;
      } else {
        const languageResult = detectLanguage(reviewText);
        updateData.detectedLanguage = languageResult.language;
      }
    }
    if (rating !== undefined) updateData.rating = rating;
    if (reviewerName !== undefined) updateData.reviewerName = reviewerName;
    if (reviewDate !== undefined) {
      updateData.reviewDate = reviewDate ? new Date(reviewDate) : null;
    }

    // Update review
    const updatedReview = await prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        response: {
          select: {
            id: true,
            responseText: true,
            isEdited: true,
            isPublished: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        review: {
          id: updatedReview.id,
          platform: updatedReview.platform,
          reviewText: updatedReview.reviewText,
          rating: updatedReview.rating,
          reviewerName: updatedReview.reviewerName,
          reviewDate: updatedReview.reviewDate?.toISOString() || null,
          detectedLanguage: updatedReview.detectedLanguage,
          sentiment: updatedReview.sentiment,
          createdAt: updatedReview.createdAt.toISOString(),
          updatedAt: updatedReview.updatedAt.toISOString(),
          response: updatedReview.response
            ? {
                id: updatedReview.response.id,
                responseText: updatedReview.response.responseText,
                isEdited: updatedReview.response.isEdited,
                isPublished: updatedReview.response.isPublished,
                createdAt: updatedReview.response.createdAt.toISOString(),
              }
            : null,
        },
      },
    });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update review",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reviews/[id] - Delete review
 * Cascades to response and versions, keeps audit trails with SET NULL
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Check if review exists and belongs to user
    const existingReview = await prisma.review.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        response: true,
      },
    });

    if (!existingReview) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Review not found" },
        },
        { status: 404 }
      );
    }

    // Delete review (cascades to response and versions via Prisma schema)
    // CreditUsage and SentimentUsage will have their reviewId set to null (SET NULL)
    await prisma.review.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: "Review deleted successfully",
        deletedReviewId: id,
      },
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete review",
        },
      },
      { status: 500 }
    );
  }
}
