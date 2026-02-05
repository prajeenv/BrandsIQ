import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/credits/usage
 * Returns paginated credit usage history for the current user
 *
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - action: Filter by action type (GENERATE_RESPONSE, REGENERATE, REFUND)
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

    const searchParams = request.nextUrl.searchParams;

    // Parse pagination parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    // Parse filter parameters
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const action = searchParams.get("action");

    // Build where clause
    const where: {
      userId: string;
      createdAt?: { gte?: Date; lte?: Date };
      action?: string;
    } = {
      userId: session.user.id,
    };

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Action filter
    if (action && ["GENERATE_RESPONSE", "REGENERATE", "REFUND"].includes(action)) {
      where.action = action;
    }

    // Get total count for pagination
    const totalCount = await prisma.creditUsage.count({ where });

    // Fetch credit usage records with review context
    const usageRecords = await prisma.creditUsage.findMany({
      where,
      select: {
        id: true,
        creditsUsed: true,
        action: true,
        details: true,
        createdAt: true,
        review: {
          select: {
            id: true,
            platform: true,
            reviewText: true,
            reviewerName: true,
            rating: true,
          },
        },
        reviewResponse: {
          select: {
            id: true,
            toneUsed: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    // Format the records for response
    // When review is deleted (FK becomes null), fallback to details JSON for audit trail
    const formattedRecords = usageRecords.map((record) => {
      const details = record.details ? parseDetails(record.details) : null;

      // If review exists, use live data; otherwise fallback to details JSON
      const reviewId = record.review?.id || (details?.reviewId as string | null) || null;
      const platform = record.review?.platform || (details?.platform as string | null) || null;
      const rating = record.review?.rating ?? (details?.rating as number | null) ?? null;
      // For tone, prioritize details JSON (captures tone at time of action)
      // reviewResponse.toneUsed shows CURRENT tone which changes on regeneration
      const toneUsed = (details?.tone as string | null)
        || (details?.newTone as string | null)
        || record.reviewResponse?.toneUsed
        || null;

      return {
        id: record.id,
        date: record.createdAt.toISOString(),
        action: record.action,
        actionLabel: formatActionLabel(record.action),
        creditsUsed: record.creditsUsed,
        reviewPreview: record.review?.reviewText
          ? truncateText(record.review.reviewText, 50)
          : null,
        reviewId,
        platform,
        rating,
        reviewerName: record.review?.reviewerName || null,
        toneUsed,
        isDeleted: !record.review && !!reviewId,
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        records: formattedRecords,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      },
    });
  } catch (error) {
    console.error("Credit usage fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch credit usage" },
      },
      { status: 500 }
    );
  }
}

/**
 * Format action type into human-readable label
 */
function formatActionLabel(action: string): string {
  switch (action) {
    case "GENERATE_RESPONSE":
      return "Generate";
    case "REGENERATE":
      return "Regenerate";
    case "REFUND":
      return "Refund";
    default:
      return action;
  }
}

/**
 * Truncate text to specified length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Safely parse JSON details field
 */
function parseDetails(details: string): Record<string, unknown> | null {
  try {
    return JSON.parse(details);
  } catch {
    return null;
  }
}
