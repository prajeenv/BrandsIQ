import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveAllocation } from "@/lib/constants";
import type { SubscriptionTier } from "@/lib/constants";

/**
 * GET /api/credits
 * Returns the current user's credit balance and sentiment quota
 */
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
        // Surfaced so the FounderInquiryForm can pre-fill businessName for
        // signed-in users (set during /onboarding; null until then).
        organizationName: true,
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

    // Allocation honors isBetaUser (beta plan is 150/750 regardless of tier).
    // See src/lib/constants.ts:getEffectiveAllocation.
    const allocation = getEffectiveAllocation({
      tier: user.tier as SubscriptionTier,
      isBetaUser: user.isBetaUser,
    });

    // Calculate credits used (total - remaining), clamped to 0
    const creditsUsed = Math.max(0, allocation.credits - user.credits);
    const sentimentUsed = Math.max(0, allocation.sentimentQuota - user.sentimentCredits);

    return NextResponse.json({
      success: true,
      data: {
        credits: {
          remaining: user.credits,
          total: allocation.credits,
          used: creditsUsed,
          resetDate: user.creditsResetDate.toISOString(),
        },
        sentiment: {
          remaining: user.sentimentCredits,
          total: allocation.sentimentQuota,
          used: sentimentUsed,
          resetDate: user.sentimentResetDate.toISOString(),
        },
        tier: user.tier,
        isBetaUser: user.isBetaUser,
        organizationName: user.organizationName,
      },
    });
  } catch (error) {
    console.error("Credits fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch credits" },
      },
      { status: 500 }
    );
  }
}
