import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveAllocation } from "@/lib/constants";
import type { SubscriptionTier } from "@/lib/constants";

export async function GET() {
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

    // Fetch user with reviews and responses
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        tier: true,
        isBetaUser: true,
        credits: true,
        creditsResetDate: true,
        sentimentCredits: true,
        sentimentResetDate: true,
        // Surfaced so FounderInquiryForm can pre-fill businessName for
        // signed-in users — see CreditsProvider + iteration 2 follow-up.
        organizationName: true,
        // Pulled to derive `brandVoiceWarnings` (incomplete-config feedback
        // surfaced on the dashboard). Only the two fields we actually
        // check are selected so we don't grow the payload.
        brandVoice: {
          select: {
            negativeReviewEmailEnabled: true,
            replyToEmail: true,
          },
        },
        reviews: {
          select: {
            id: true,
            platform: true,
            reviewText: true,
            rating: true,
            sentiment: true,
            reviewDate: true,
            createdAt: true,
            response: {
              select: {
                id: true,
                isEdited: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        _count: {
          select: {
            reviews: true,
          },
        },
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

    // Get total responses count
    const totalResponses = await prisma.reviewResponse.count({
      where: {
        review: {
          userId: session.user.id,
        },
      },
    });

    // Calculate edit rate (percentage of responses that were edited)
    const editedResponses = await prisma.reviewResponse.count({
      where: {
        review: {
          userId: session.user.id,
        },
        isEdited: true,
      },
    });

    const avgEditRate =
      totalResponses > 0
        ? Math.round((editedResponses / totalResponses) * 100)
        : 0;

    // Get sentiment distribution
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

    const totalWithSentiment = sentimentCounts.reduce(
      (sum, item) => sum + item._count.sentiment,
      0
    );

    const sentimentDistribution = {
      positive: 0,
      neutral: 0,
      negative: 0,
      total: totalWithSentiment,
    };

    for (const item of sentimentCounts) {
      if (item.sentiment && item.sentiment in sentimentDistribution) {
        sentimentDistribution[item.sentiment as "positive" | "neutral" | "negative"] =
          totalWithSentiment > 0
            ? Math.round((item._count.sentiment / totalWithSentiment) * 100)
            : 0;
      }
    }

    // Allocation honors isBetaUser (beta plan is 150/750 regardless of tier).
    // See src/lib/constants.ts:getEffectiveAllocation.
    const allocation = getEffectiveAllocation({
      tier: user.tier as SubscriptionTier,
      isBetaUser: user.isBetaUser,
    });

    // Calculate credits used (total - remaining)
    const creditsUsed = allocation.credits - user.credits;

    // Format recent reviews
    const recentReviews = user.reviews.map((review) => ({
      id: review.id,
      platform: review.platform,
      reviewText: review.reviewText,
      rating: review.rating,
      sentiment: review.sentiment,
      reviewDate: review.reviewDate?.toISOString() || null,
      createdAt: review.createdAt.toISOString(),
      hasResponse: !!review.response,
    }));

    return NextResponse.json({
      success: true,
      data: {
        credits: {
          remaining: user.credits,
          total: allocation.credits,
          used: creditsUsed > 0 ? creditsUsed : 0,
          resetDate: user.creditsResetDate.toISOString(),
        },
        sentiment: {
          remaining: user.sentimentCredits,
          total: allocation.sentimentQuota,
          used: Math.max(0, allocation.sentimentQuota - user.sentimentCredits),
          resetDate: user.sentimentResetDate.toISOString(),
        },
        tier: user.tier,
        // isBetaUser is surfaced so client components (LowCreditWarning,
        // OutOfCreditsDialog, etc.) can render phase-aware CTAs without an
        // extra round-trip. See MVP.md Section 12.4.
        isBetaUser: user.isBetaUser,
        // organizationName pre-fills FounderInquiryForm.businessName for
        // signed-in users so they don't re-type info already captured at
        // /onboarding. null until onboarding is completed.
        organizationName: user.organizationName,
        // Brand-voice incomplete-config flags. Surfaced on the dashboard
        // so the user notices dormant features even when they don't
        // revisit /dashboard/settings/brand-voice. Add new flags here
        // as the brand voice grows other "must complete to take effect"
        // fields.
        brandVoiceWarnings: {
          negativeEmailToggleOnButReplyToEmailMissing:
            !!user.brandVoice?.negativeReviewEmailEnabled &&
            (user.brandVoice?.replyToEmail == null ||
              user.brandVoice.replyToEmail.trim().length === 0),
        },
        stats: {
          totalReviews: user._count.reviews,
          totalResponses,
          avgEditRate,
        },
        sentimentDistribution,
        recentReviews,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch dashboard stats" },
      },
      { status: 500 }
    );
  }
}
