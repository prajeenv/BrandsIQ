import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, sendOAuthSignInHintEmail } from "@/lib/email";
import { createPasswordResetToken } from "@/lib/tokens";
import { loginRateLimit, getClientIP, checkRateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = await checkRateLimit(
      loginRateLimit,
      `password-reset:${ip}`
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: rateLimitResult.error },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid email address",
          },
        },
        { status: 400, headers: rateLimitResult.headers }
      );
    }

    const { email } = validation.data;

    // Find user. Include accounts so we can tell a genuine Google-linked
    // account (no password, but a linked Google provider) apart from a
    // password-less account with no OAuth link at all.
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { accounts: true },
    });

    // The HTTP response below is ALWAYS the same generic 200, regardless of
    // which branch runs here — this is the anti-enumeration contract. The only
    // differentiation lives in the email that lands in the real owner's inbox,
    // never in the response a form-prober can observe.
    if (user && user.password) {
      // Password account: send the normal reset link.
      const resetToken = await createPasswordResetToken(email.toLowerCase());
      const emailResult = await sendPasswordResetEmail(
        email.toLowerCase(),
        resetToken
      );

      if (!emailResult.success) {
        console.error("Failed to send password reset email:", emailResult.error);
      }
    } else if (
      user &&
      !user.password &&
      user.accounts.some((acc) => acc.provider === "google")
    ) {
      // Google sign-in account with no password: there is nothing to reset, so
      // hint the owner to use Google instead. Gated on an actually-linked
      // Google account so we never tell a password-less, non-Google account
      // (e.g. an invite-created user who never linked anything) to "use Google"
      // — that population keeps the existing silent no-email behavior.
      const emailResult = await sendOAuthSignInHintEmail(email.toLowerCase());

      if (!emailResult.success) {
        console.error(
          "Failed to send OAuth sign-in hint email:",
          emailResult.error
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          message:
            "If an account exists with this email, a password reset link has been sent.",
        },
      },
      { status: 200, headers: rateLimitResult.headers }
    );
  } catch (error) {
    console.error("Password reset request error:", error);
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
