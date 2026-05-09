import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signUpSchema } from "@/lib/validations";
import { sendVerificationEmail } from "@/lib/email";
import { createVerificationToken } from "@/lib/tokens";
import { loginRateLimit, getClientIP, checkRateLimit } from "@/lib/rate-limit";
import { BETA_PLAN, TIER_LIMITS } from "@/lib/constants";
import { getCurrentPhase } from "@/lib/system-phase";

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = await checkRateLimit(loginRateLimit, `signup:${ip}`);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: rateLimitResult.error },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = signUpSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: validation.error.flatten().fieldErrors,
          },
        },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    const { email, password, name, betaCode } = validation.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      // Don't reveal if email exists for security
      // But we still need to prevent duplicate accounts
      if (existingUser.emailVerified) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "EMAIL_EXISTS",
              message: "An account with this email already exists",
            },
          },
          { status: 409, headers: rateLimitResult.headers }
        );
      }

      // User exists but not verified - allow re-registration
      // Delete the old unverified user
      await prisma.user.delete({
        where: { id: existingUser.id },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Calculate reset date as 30 days from now (anniversary-based billing)
    const resetDate = new Date();
    resetDate.setUTCDate(resetDate.getUTCDate() + 30);
    resetDate.setUTCHours(0, 0, 0, 0);

    // Resolve allocation: beta-invite path vs Free path.
    // Phase flag short-circuits the beta path: in phase_2, invite codes are
    // ignored (links are no longer issued, but defensively reject existing ones).
    const phase = getCurrentPhase();
    let appliedBetaCode: string | null = null;
    let isBetaUser = false;

    if (betaCode && phase === "phase_1") {
      const invite = await prisma.betaInviteLink.findUnique({
        where: { code: betaCode },
        select: { id: true, expiresAt: true, usedAt: true },
      });

      const now = new Date();
      const valid = invite && !invite.usedAt && invite.expiresAt >= now;

      if (!valid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_BETA_CODE",
              message: "This beta invite link has expired or has already been used.",
              details: {
                expired: invite ? invite.expiresAt < now : false,
                used: invite ? invite.usedAt !== null : false,
                exists: !!invite,
              },
            },
          },
          { status: 400, headers: rateLimitResult.headers }
        );
      }

      appliedBetaCode = betaCode;
      isBetaUser = true;
    }

    const allocation = isBetaUser
      ? { credits: BETA_PLAN.credits, sentimentQuota: BETA_PLAN.sentimentQuota }
      : { credits: TIER_LIMITS.FREE.credits, sentimentQuota: TIER_LIMITS.FREE.sentimentQuota };

    // Create user (and mark invite used) atomically. If anything fails after
    // the user row is written, the whole transaction rolls back — preventing
    // a "code marked used but user doesn't exist" mismatch.
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          name,
          password: hashedPassword,
          credits: allocation.credits,
          tier: "FREE",
          isBetaUser,
          sentimentCredits: allocation.sentimentQuota,
          creditsResetDate: resetDate,
          sentimentResetDate: resetDate,
        },
      });

      // Default brand voice
      await tx.brandVoice.create({
        data: {
          userId: created.id,
          tone: "professional",
          formality: 3,
          keyPhrases: ["Thank you", "We appreciate your feedback"],
          styleNotes: "Be genuine and empathetic",
        },
      });

      // Mark the invite as used (atomic with user creation)
      if (appliedBetaCode) {
        await tx.betaInviteLink.update({
          where: { code: appliedBetaCode },
          data: {
            usedAt: new Date(),
            usedByUserId: created.id,
          },
        });
      }

      return created;
    });

    // Create verification token
    const verificationToken = await createVerificationToken(email.toLowerCase());

    // Send verification email
    const emailResult = await sendVerificationEmail(
      email.toLowerCase(),
      verificationToken
    );

    if (!emailResult.success) {
      console.error("Failed to send verification email:", emailResult.error);
      // Don't fail the signup, but log the error
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          message:
            "Account created successfully. Please check your email to verify your account.",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            isBetaUser: user.isBetaUser,
          },
        },
      },
      { status: 201, headers: rateLimitResult.headers }
    );
  } catch (error) {
    console.error("Signup error:", error);
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
