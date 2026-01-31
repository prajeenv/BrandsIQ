/**
 * Database utility functions for common operations
 * Includes atomic transactions for credit operations
 */

import { prisma } from "./prisma";
import type { Tier, Prisma } from "@prisma/client";
import { CreditActionValues } from "@/types/database";
import { TIER_LIMITS } from "@/lib/constants";
import type { SubscriptionTier } from "@/lib/constants";

// ============================================
// USER QUERIES
// ============================================

/**
 * Get user with credits and tier information
 */
export async function getUserWithCredits(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      tier: true,
      credits: true,
      creditsResetDate: true,
      sentimentCredits: true,
      sentimentResetDate: true,
    },
  });
}

/**
 * Get user with brand voice
 */
export async function getUserWithBrandVoice(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      brandVoice: true,
    },
  });
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
}

// ============================================
// REVIEW QUERIES
// ============================================

/**
 * Get review with response
 */
export async function getReviewWithResponse(reviewId: string, userId: string) {
  return prisma.review.findFirst({
    where: {
      id: reviewId,
      userId,
    },
    include: {
      response: {
        include: {
          versions: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      },
    },
  });
}

/**
 * Get reviews with pagination
 */
export async function getReviewsPaginated(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    platform?: string;
    sentiment?: string;
    hasResponse?: boolean;
  } = {}
) {
  const { page = 1, limit = 20, platform, sentiment, hasResponse } = options;
  const skip = (page - 1) * limit;

  const where: Prisma.ReviewWhereInput = {
    userId,
    ...(platform && { platform }),
    ...(sentiment && { sentiment }),
    ...(hasResponse !== undefined && {
      response: hasResponse ? { isNot: null } : { is: null },
    }),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
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
    }),
    prisma.review.count({ where }),
  ]);

  return {
    reviews,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: skip + reviews.length < total,
  };
}

// ============================================
// CREDIT OPERATIONS (ATOMIC)
// ============================================

/**
 * Deduct credits atomically with audit trail
 * Returns { success, user, error }
 */
export async function deductCreditsAtomic(
  userId: string,
  amount: number,
  action: string,
  reviewId?: string,
  reviewResponseId?: string,
  details?: Record<string, unknown>
) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Get user with lock (SELECT FOR UPDATE in PostgreSQL)
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          credits: true,
          tier: true,
        },
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      if (user.credits < amount) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      // Deduct credits
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          credits: { decrement: amount },
        },
        select: {
          id: true,
          credits: true,
          tier: true,
        },
      });

      // Create audit log
      await tx.creditUsage.create({
        data: {
          userId,
          creditsUsed: amount,
          action,
          reviewId,
          reviewResponseId,
          details: details ? JSON.stringify(details) : null,
        },
      });

      return {
        success: true,
        user: updatedUser,
        creditsDeducted: amount,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return {
      success: false,
      error: message,
      user: null,
    };
  }
}

/**
 * Refund credits atomically
 */
export async function refundCreditsAtomic(
  userId: string,
  amount: number,
  reason: string,
  reviewId?: string,
  reviewResponseId?: string
) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Refund credits
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          credits: { increment: amount },
        },
        select: {
          id: true,
          credits: true,
          tier: true,
        },
      });

      // Create audit log (negative credits for refund)
      await tx.creditUsage.create({
        data: {
          userId,
          creditsUsed: -amount, // Negative for refund
          action: CreditActionValues.REFUND,
          reviewId,
          reviewResponseId,
          details: JSON.stringify({ reason, refundedAt: new Date() }),
        },
      });

      return {
        success: true,
        user: updatedUser,
        creditsRefunded: amount,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return {
      success: false,
      error: message,
      user: null,
    };
  }
}

// ============================================
// SENTIMENT OPERATIONS
// ============================================

/**
 * Check if user has sentiment credits available
 */
export async function hasSentimentCredits(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      sentimentCredits: true,
    },
  });

  if (!user) return false;
  return user.sentimentCredits > 0;
}

/**
 * Deduct sentiment credits with audit trail
 */
export async function deductSentimentCredits(
  userId: string,
  reviewId: string,
  sentiment: string,
  details?: Record<string, unknown>
) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Check credits
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          sentimentCredits: true,
          tier: true,
        },
      });

      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }

      if (user.sentimentCredits <= 0) {
        throw new Error("INSUFFICIENT_SENTIMENT_CREDITS");
      }

      // Decrement credits
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          sentimentCredits: { decrement: 1 },
        },
        select: {
          sentimentCredits: true,
          tier: true,
        },
      });

      // Create audit log
      await tx.sentimentUsage.create({
        data: {
          userId,
          reviewId,
          sentiment,
          details: details ? JSON.stringify(details) : null,
        },
      });

      return {
        success: true,
        sentimentCredits: updatedUser.sentimentCredits,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    return {
      success: false,
      error: message,
    };
  }
}

// ============================================
// RESET OPERATIONS
// ============================================

/**
 * Helper to get tier limits from the single source of truth (constants.ts)
 */
function getTierLimits(tier: Tier): { credits: number; sentimentQuota: number } {
  return TIER_LIMITS[tier as SubscriptionTier];
}

/**
 * Calculate next reset date (30 days from a given date)
 * Uses anniversary-based billing - each user's cycle is 30 days from their signup/last reset
 */
function getNextResetDate(fromDate: Date = new Date()): Date {
  const nextReset = new Date(fromDate);
  nextReset.setUTCDate(nextReset.getUTCDate() + 30);
  nextReset.setUTCHours(0, 0, 0, 0);
  return nextReset;
}

/**
 * Reset credits for a user based on tier (anniversary-based: 30 days from current reset date)
 */
export async function resetUserCredits(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true, creditsResetDate: true },
  });

  if (!user) return null;

  const limits = getTierLimits(user.tier);
  // Calculate next reset as 30 days from the user's current reset date (anniversary-based)
  const nextResetDate = getNextResetDate(user.creditsResetDate);

  return prisma.user.update({
    where: { id: userId },
    data: {
      credits: limits.credits,
      creditsResetDate: nextResetDate,
      sentimentCredits: limits.sentimentQuota,
      sentimentResetDate: nextResetDate,
    },
  });
}

/**
 * Reset credits for all users whose reset date has passed (anniversary-based)
 * This function is intended to be called by a cron job (daily recommended)
 *
 * Logic:
 * - Find users where creditsResetDate < now
 * - Reset credits to tier default
 * - Reset sentimentCredits to tier default
 * - Update reset dates to 30 days from their current reset date (anniversary-based)
 * - Log operations for audit
 *
 * @returns Summary of reset operations
 */
export async function resetMonthlyCredits(): Promise<{
  success: boolean;
  usersReset: number;
  errors: string[];
  details: Array<{ userId: string; tier: Tier; creditsReset: number; sentimentReset: number }>;
}> {
  const errors: string[] = [];
  const details: Array<{ userId: string; tier: Tier; creditsReset: number; sentimentReset: number }> = [];

  try {
    const now = new Date();

    // Find all users whose reset date has passed
    const usersToReset = await prisma.user.findMany({
      where: {
        creditsResetDate: {
          lt: now,
        },
      },
      select: {
        id: true,
        email: true,
        tier: true,
        credits: true,
        sentimentCredits: true,
        creditsResetDate: true,
      },
    });

    if (usersToReset.length === 0) {
      return {
        success: true,
        usersReset: 0,
        errors: [],
        details: [],
      };
    }

    // Process each user in a transaction
    for (const user of usersToReset) {
      try {
        const limits = getTierLimits(user.tier);
        // Anniversary-based: 30 days from the user's current reset date
        const nextResetDate = getNextResetDate(user.creditsResetDate);

        await prisma.$transaction(async (tx) => {
          // Reset user credits
          await tx.user.update({
            where: { id: user.id },
            data: {
              credits: limits.credits,
              creditsResetDate: nextResetDate,
              sentimentCredits: limits.sentimentQuota,
              sentimentResetDate: nextResetDate,
            },
          });

          // Log the reset operation in CreditUsage for audit trail
          // Using negative credits to indicate "credit addition" from reset
          await tx.creditUsage.create({
            data: {
              userId: user.id,
              creditsUsed: -(limits.credits - user.credits), // Negative = credits added
              action: "MONTHLY_RESET",
              details: JSON.stringify({
                previousCredits: user.credits,
                newCredits: limits.credits,
                previousSentimentCredits: user.sentimentCredits,
                newSentimentCredits: limits.sentimentQuota,
                tier: user.tier,
                resetDate: now.toISOString(),
                nextResetDate: nextResetDate.toISOString(),
              }),
            },
          });
        });

        details.push({
          userId: user.id,
          tier: user.tier,
          creditsReset: limits.credits,
          sentimentReset: limits.sentimentQuota,
        });
      } catch (userError) {
        const errorMessage = userError instanceof Error ? userError.message : "Unknown error";
        errors.push(`Failed to reset user ${user.id}: ${errorMessage}`);
      }
    }

    return {
      success: errors.length === 0,
      usersReset: details.length,
      errors,
      details,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      usersReset: 0,
      errors: [`Fatal error during monthly reset: ${errorMessage}`],
      details: [],
    };
  }
}

/**
 * Check if user's credits need to be reset
 */
export async function shouldResetCredits(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditsResetDate: true },
  });

  if (!user) return false;
  return user.creditsResetDate < new Date();
}

// ============================================
// BRAND VOICE
// ============================================

/**
 * Get or create default brand voice for user
 */
export async function getOrCreateBrandVoice(userId: string) {
  let brandVoice = await prisma.brandVoice.findUnique({
    where: { userId },
  });

  if (!brandVoice) {
    brandVoice = await prisma.brandVoice.create({
      data: {
        userId,
        tone: "professional",
        formality: 3,
        keyPhrases: [],
        sampleResponses: [],
      },
    });
  }

  return brandVoice;
}

// ============================================
// STATISTICS
// ============================================

/**
 * Get user statistics
 */
export async function getUserStats(userId: string) {
  const [
    totalReviews,
    reviewsWithResponse,
    sentimentCounts,
    platformCounts,
  ] = await Promise.all([
    prisma.review.count({ where: { userId } }),
    prisma.review.count({
      where: { userId, response: { isNot: null } },
    }),
    prisma.review.groupBy({
      by: ["sentiment"],
      where: { userId, sentiment: { not: null } },
      _count: true,
    }),
    prisma.review.groupBy({
      by: ["platform"],
      where: { userId },
      _count: true,
    }),
  ]);

  return {
    totalReviews,
    reviewsWithResponse,
    responseRate: totalReviews > 0
      ? Math.round((reviewsWithResponse / totalReviews) * 100)
      : 0,
    sentimentBreakdown: Object.fromEntries(
      sentimentCounts.map((s) => [s.sentiment, s._count])
    ),
    platformBreakdown: Object.fromEntries(
      platformCounts.map((p) => [p.platform, p._count])
    ),
  };
}
