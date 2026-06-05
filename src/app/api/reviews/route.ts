import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectLanguage } from "@/lib/language-detection";
import { analyzeSentiment } from "@/lib/ai/deepseek";
import { createReviewSchema, paginationSchema } from "@/lib/validations";
import { PLATFORMS } from "@/lib/constants";

/**
 * POST /api/reviews - Create a new review
 * Auto-detects language, runs sentiment analysis, logs usage
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
    const validationResult = createReviewSchema.safeParse(body);
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

    const { platform, reviewText, rating, reviewerName, reviewDate, detectedLanguage: userOverrideLanguage } = validationResult.data;

    // Normalize empty/whitespace-only text to null. A star-only review (rating
    // present, no comment) persists reviewText: null, not "". This keeps the
    // column clean, makes the duplicate-check and sentiment/language guards
    // below well-defined, and is load-bearing for not sending blank text to
    // DeepSeek.
    const normalizedText =
      reviewText && reviewText.trim().length > 0 ? reviewText : null;

    // Get user for credits check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        sentimentCredits: true,
        sentimentResetDate: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" },
        },
        { status: 404 }
      );
    }

    // Check for duplicate review within 5 minutes — only when there is text.
    // The dedupe guard exists to catch an accidental double-submit of the same
    // comment. Star-only reviews (normalizedText === null) have no comment to
    // duplicate, and a user legitimately bulk-adding several "5 stars, no
    // comment" reviews in one sitting must not be blocked, so we skip the
    // check entirely for them. (Querying with reviewText: null would also
    // wrongly match every prior null-text review.)
    if (normalizedText !== null) {
      const recentDuplicate = await prisma.review.findFirst({
        where: {
          userId: session.user.id,
          reviewText: normalizedText,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Within 5 minutes
          },
        },
      });

      if (recentDuplicate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_REVIEW",
              message: "This review was already added recently",
            },
          },
          { status: 409 }
        );
      }
    }

    // Auto-detect language (use user override if provided). Only run detection
    // when there is text — a star-only review has nothing to detect, so it
    // defaults to English (the same default detectLanguage itself returns for
    // empty input, surfaced here explicitly).
    const languageResult = normalizedText
      ? detectLanguage(normalizedText)
      : { language: "English", confidence: "low" as const, code: "eng", isRTL: false };
    const finalLanguage = userOverrideLanguage || languageResult.language;

    // Run sentiment analysis only when there is text AND credits remain.
    // Star-only reviews never spend a sentiment credit (there is nothing to
    // analyze) and persist sentiment: null.
    let sentiment: string | null = null;
    let sentimentAnalyzed = false;

    if (user.sentimentCredits > 0 && normalizedText) {
      const sentimentResult = await analyzeSentiment(normalizedText);
      sentiment = sentimentResult.sentiment;
      sentimentAnalyzed = true;
    }

    // Resolve the user's Location and create the review atomically.
    //
    // MVP enforces exactly one Location per user (MVP.md Section 7), so we
    // attach the review to the user's single Location — same "first/only
    // location" pattern used in the onboarding + settings-profile routes.
    //
    // Defensive create: every user that reaches "add review" has been
    // through the onboarding gate (PR #103), which creates a Location. But
    // if a Location is somehow missing we create a "Default Location"
    // inline rather than inserting a review with a null locationId. This
    // keeps the data clean (prerequisite for the iteration-3 NOT NULL
    // contract migration) and self-heals the row. Wrapped in a transaction
    // so a review can never be created without its Location, even under a
    // concurrent request.
    const review = await prisma.$transaction(async (tx) => {
      let location = await tx.location.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      if (!location) {
        location = await tx.location.create({
          data: { userId: session.user.id, name: "Default Location" },
          select: { id: true },
        });
      }

      return tx.review.create({
        data: {
          userId: session.user.id,
          locationId: location.id,
          platform,
          reviewText: normalizedText,
          rating,
          reviewerName,
          reviewDate: reviewDate ? new Date(reviewDate) : null,
          detectedLanguage: finalLanguage,
          sentiment,
        },
      });
    });

    // Log sentiment usage and deduct credits if analyzed
    if (sentimentAnalyzed && sentiment) {
      await prisma.$transaction([
        prisma.sentimentUsage.create({
          data: {
            userId: session.user.id,
            reviewId: review.id,
            sentiment,
            // Audit trail: reviewId stored here survives FK becoming null on delete
            details: JSON.stringify({
              reviewId: review.id,
              platform,
              rating,
              analyzedAt: new Date().toISOString(),
            }),
          },
        }),
        prisma.user.update({
          where: { id: session.user.id },
          data: { sentimentCredits: { decrement: 1 } },
        }),
      ]);
    }

    return NextResponse.json(
      {
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
            createdAt: review.createdAt.toISOString(),
          },
          languageDetection: {
            language: languageResult.language,
            confidence: languageResult.confidence,
            isRTL: languageResult.isRTL,
            wasOverridden: !!userOverrideLanguage,
          },
          sentimentAnalyzed,
          // Warn only when sentiment was skipped because credits ran out (the
          // actionable case). A star-only review skips sentiment because there
          // is no text to analyze — that is expected, not a credit problem, so
          // no warning (and no spurious "sentiment skipped" banner).
          ...(!sentimentAnalyzed && normalizedText && user.sentimentCredits === 0
            ? { sentimentWarning: "Sentiment analysis skipped: no credits remaining" }
            : {}),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create review",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reviews - List reviews with pagination and filters
 * Query params: page, limit, platform, sentiment
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);

    // Parse pagination
    const paginationResult = paginationSchema.safeParse({
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    });

    const { page, limit } = paginationResult.success
      ? paginationResult.data
      : { page: 1, limit: 20 };

    // Parse filters
    const platformParam = searchParams.get("platform");
    const sentimentParam = searchParams.get("sentiment");

    // Build filter conditions
    const where: {
      userId: string;
      platform?: string;
      sentiment?: string;
    } = {
      userId: session.user.id,
    };

    if (platformParam && PLATFORMS.includes(platformParam as typeof PLATFORMS[number])) {
      where.platform = platformParam;
    }

    if (sentimentParam && ["positive", "neutral", "negative"].includes(sentimentParam)) {
      where.sentiment = sentimentParam;
    }

    // Get total count
    const totalCount = await prisma.review.count({ where });

    // Get reviews with pagination
    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        response: {
          select: {
            id: true,
            responseText: true,
            isEdited: true,
            isPublished: true,
            createdAt: true,
            updatedAt: true,
            creditsUsed: true,
            versions: {
              select: {
                creditsUsed: true,
              },
            },
          },
        },
      },
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviews.map((review) => ({
          id: review.id,
          platform: review.platform,
          reviewText: review.reviewText,
          rating: review.rating,
          reviewerName: review.reviewerName,
          reviewDate: review.reviewDate?.toISOString() || null,
          detectedLanguage: review.detectedLanguage,
          sentiment: review.sentiment,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
          response: review.response
            ? {
                id: review.response.id,
                responseText: review.response.responseText,
                isEdited: review.response.isEdited,
                isPublished: review.response.isPublished,
                createdAt: review.response.createdAt.toISOString(),
                updatedAt: review.response.updatedAt.toISOString(),
                totalCreditsUsed:
                  review.response.creditsUsed +
                  review.response.versions.reduce((sum, v) => sum + v.creditsUsed, 0),
              }
            : null,
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasMore: page < totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch reviews",
        },
      },
      { status: 500 }
    );
  }
}
