import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyEmailToken } from "@/lib/tokens";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_TOKEN",
            message: "Verification token is required",
          },
        },
        { status: 400 }
      );
    }

    // Verify token
    const result = await verifyEmailToken(token);

    if (!result.success || !result.email) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: result.error || "Invalid or expired verification token",
          },
        },
        { status: 400 }
      );
    }

    // Find and update user
    const user = await prisma.user.findUnique({
      where: { email: result.email },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User not found",
          },
        },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        {
          success: true,
          data: {
            message: "Email already verified",
            alreadyVerified: true,
          },
        },
        { status: 200 }
      );
    }

    // Update user as verified
    await prisma.user.update({
      where: { email: result.email },
      data: { emailVerified: new Date() },
    });

    // Send welcome email (non-blocking). Pass isBetaUser so the template
    // renders beta-plan content (150/750) instead of Free-plan (15/35).
    sendWelcomeEmail(result.email, user.name || undefined, user.isBetaUser).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          message: "Email verified successfully. You can now log in.",
          verified: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      },
      { status: 500 }
    );
  }
}
