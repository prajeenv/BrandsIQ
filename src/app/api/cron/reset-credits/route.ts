import { NextRequest, NextResponse } from "next/server";
import { resetMonthlyCredits } from "@/lib/db-utils";

/**
 * GET /api/cron/reset-credits
 *
 * Resets credits for all users whose reset date has passed.
 * Intended to be called by a cron job (daily recommended).
 *
 * For Vercel: Configure in vercel.json with schedule
 * For local testing: Call manually with Authorization header
 *
 * Security: Requires CRON_SECRET in Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("Authorization");
    const expectedToken = process.env.CRON_SECRET;

    // In development, allow if no CRON_SECRET is set (for easy testing)
    const isDev = process.env.NODE_ENV === "development";
    const hasValidAuth = authHeader === `Bearer ${expectedToken}`;
    const allowDevAccess = isDev && !expectedToken;

    if (!hasValidAuth && !allowDevAccess) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Run the credit reset
    const result = await resetMonthlyCredits();

    // Log summary
    if (result.usersReset > 0) {
      console.log(
        `[CRON] Credit reset completed: ${result.usersReset} users reset`
      );
    }

    if (result.errors.length > 0) {
      console.error("[CRON] Credit reset errors:", result.errors);
    }

    return NextResponse.json({
      success: result.success,
      data: {
        usersReset: result.usersReset,
        errors: result.errors,
        details: result.details,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[CRON] Fatal error in credit reset:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute credit reset",
      },
      { status: 500 }
    );
  }
}
