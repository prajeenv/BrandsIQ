import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TIER_LIMITS } from "@/lib/constants";

/**
 * POST /api/dev/reset-credits - Reset credits for testing (DEV ONLY)
 *
 * Body: { email: string, credits?: number }
 *
 * WARNING: This endpoint should be removed or protected in production!
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { success: false, error: "Not available in production" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { email, credits = TIER_LIMITS.FREE.credits } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { email },
      data: { credits },
      select: {
        id: true,
        email: true,
        credits: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: `Credits reset to ${credits}`,
        user,
      },
    });
  } catch (error) {
    console.error("Error resetting credits:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset credits" },
      { status: 500 }
    );
  }
}
