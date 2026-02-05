import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TIER_LIMITS } from "@/lib/constants";
import type { SubscriptionTier } from "@/lib/constants";

/**
 * GET /api/sentiment/usage - Get sentiment usage history
 * Returns list of sentiment analysis records with review previews
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sentiment: Filter by sentiment type (positive, neutral, negative)
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
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

    // Pagination params
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10)), 100) : 20;
    const skip = (page - 1) * limit;

    // Filter params
    const sentimentFilter = searchParams.get("sentiment");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const whereClause: {
      userId: string;
      sentiment?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      userId: session.user.id,
    };

    if (sentimentFilter && ["positive", "neutral", "negative"].includes(sentimentFilter)) {
      whereClause.sentiment = sentimentFilter;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.sentimentUsage.count({
      where: whereClause,
    });

    // Get sentiment usage history with pagination
    const usageRecords = await prisma.sentimentUsage.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        review: {
          select: {
            id: true,
            platform: true,
            rating: true,
            reviewText: true,
          },
        },
      },
    });

    // Get sentiment distribution stats (unfiltered - always show overall distribution)
    const sentimentCounts = await prisma.review.groupBy({
      by: ["sentiment"],
      where: {
        userId: session.user.id,
        sentiment: { not: null },
      },
      _count: {
        sentiment: true,
      },
    });

    // Calculate distribution percentages
    const totalWithSentiment = sentimentCounts.reduce(
      (sum, item) => sum + item._count.sentiment,
      0
    );

    const distribution = {
      positive: 0,
      neutral: 0,
      negative: 0,
    };

    for (const item of sentimentCounts) {
      if (item.sentiment && item.sentiment in distribution) {
        distribution[item.sentiment as keyof typeof distribution] =
          totalWithSentiment > 0
            ? Math.round((item._count.sentiment / totalWithSentiment) * 100)
            : 0;
      }
    }

    // Get user's sentiment credits info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        tier: true,
        sentimentCredits: true,
        sentimentResetDate: true,
      },
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        // When review is deleted (FK becomes null), fallback to details JSON for audit trail
        usage: usageRecords.map((record) => {
          // Parse details JSON if available
          let details: {
            reviewId?: string;
            platform?: string;
            rating?: number;
            analyzedAt?: string;
          } = {};
          if (record.details) {
            try {
              details = JSON.parse(record.details);
            } catch {
              // Ignore parse errors
            }
          }

          // If review exists, use live data; otherwise fallback to details JSON
          const reviewId = record.reviewId || details.reviewId || null;
          const platform = record.review?.platform || details.platform || null;
          const rating = record.review?.rating ?? details.rating ?? null;

          // Truncate review text for preview
          const preview = record.review?.reviewText
            ? record.review.reviewText.length > 60
              ? record.review.reviewText.substring(0, 60) + "..."
              : record.review.reviewText
            : null;

          return {
            id: record.id,
            sentiment: record.sentiment,
            createdAt: record.createdAt.toISOString(),
            reviewId,
            platform,
            rating,
            preview,
            isDeleted: !record.review && !!reviewId,
          };
        }),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        distribution: {
          positive: distribution.positive,
          neutral: distribution.neutral,
          negative: distribution.negative,
          total: totalWithSentiment,
        },
        quota: user
          ? (() => {
              const tierLimits = TIER_LIMITS[user.tier as SubscriptionTier] || TIER_LIMITS.FREE;
              return {
                used: tierLimits.sentimentQuota - user.sentimentCredits,
                total: tierLimits.sentimentQuota,
                remaining: user.sentimentCredits,
                resetDate: user.sentimentResetDate.toISOString(),
              };
            })()
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching sentiment usage:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch sentiment usage",
        },
      },
      { status: 500 }
    );
  }
}
