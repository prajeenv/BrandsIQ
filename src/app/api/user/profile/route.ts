import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { onboardingSubmitSchema } from "@/lib/validations";
import { sendFounderInquiryNotification } from "@/lib/email";

/**
 * PATCH /api/user/profile
 *
 * MVP Phase 1 onboarding submission. See MVP.md Section 9.
 *
 * Required body fields: organizationName, industry, country, locationName
 * Optional fields: locationCountEstimate, primaryPlatform, signupIntent,
 *                  signupChallengeText
 *
 * Side effects (all in one transaction):
 *  1. User row updated with profile fields
 *  2. Location row created with the given name (or the existing "Default
 *     Location" from iteration 1's backfill is renamed)
 *  3. If the user is NOT on the beta plan AND signupIntent is "yes" or there
 *     is non-empty signupChallengeText, a FounderInquiry of type=beta_request
 *     is created with source=onboarding_intent. Founder is notified via email
 *     (non-blocking, post-response, wrapped in waitUntil to survive Lambda
 *     freeze — same pattern as the welcome email in verify-email/route.ts).
 *
 * Returns the updated user profile shape so the client can verify and route
 * the user onward to the dashboard.
 */
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
      },
      { status: 400 },
    );
  }

  const parsed = onboardingSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.issues[0]?.message ?? "Invalid input",
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const userId = session.user.id;

  // Resolve whether to fire a FounderInquiry. Only fires for non-beta users
  // who indicated intent. Done before the transaction so the boolean and the
  // inquiry payload are fixed at decision time.
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      isBetaUser: true,
      organizationName: true,
    },
  });
  if (!existing) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "User not found" },
      },
      { status: 404 },
    );
  }

  const trimmedChallenge = data.signupChallengeText?.trim() ?? "";
  const shouldFireBetaInquiry =
    !existing.isBetaUser &&
    (data.signupIntent === "yes" || trimmedChallenge.length > 0);

  // Build the inquiry message from intent + challenge text. Either field can
  // be empty individually, but at least one is non-empty if shouldFire is true.
  const inquiryMessage = [
    data.signupIntent ? `Signup intent: ${data.signupIntent}` : null,
    trimmedChallenge ? `Challenge:\n${trimmedChallenge}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  // Atomically: update user profile + upsert their Default Location + create
  // FounderInquiry if needed. Same pattern as iteration 1's signup transaction.
  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        organizationName: data.organizationName,
        industry: data.industry,
        country: data.country,
        locationCountEstimate: data.locationCountEstimate ?? null,
        primaryPlatform: data.primaryPlatform ?? null,
        signupIntent: data.signupIntent ?? null,
        signupChallengeText: trimmedChallenge || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        organizationName: true,
        industry: true,
        country: true,
        locationCountEstimate: true,
        primaryPlatform: true,
        signupIntent: true,
        signupChallengeText: true,
        isBetaUser: true,
        tier: true,
      },
    });

    // Find the user's first (only) location. Iteration 1's backfill should
    // have created a "Default Location" for every existing user; new signups
    // get one here on first onboarding submission.
    const existingLocation = await tx.location.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    if (existingLocation) {
      await tx.location.update({
        where: { id: existingLocation.id },
        data: { name: data.locationName },
      });
    } else {
      await tx.location.create({
        data: { userId, name: data.locationName },
      });
    }

    // Optional FounderInquiry creation. Always inside the transaction so a
    // failure here rolls back the whole onboarding submission — the user
    // shouldn't get to the dashboard with a half-applied profile.
    let inquiryId: string | null = null;
    if (shouldFireBetaInquiry) {
      const inquiry = await tx.founderInquiry.create({
        data: {
          userId,
          type: "beta_request",
          source: "onboarding_intent",
          submitterName: existing.name,
          submitterEmail: existing.email,
          businessName: data.organizationName,
          message: inquiryMessage,
        },
      });
      inquiryId = inquiry.id;
    }

    return { updatedUser, inquiryId };
  });

  // Notify the founder via Resend if an inquiry was created. Wrapped in
  // waitUntil so Vercel keeps the Lambda alive long enough for Resend's
  // fetch() to complete after we've returned the HTTP response. Same pattern
  // as src/app/api/auth/verify-email/route.ts for the welcome email.
  if (result.inquiryId) {
    waitUntil(
      sendFounderInquiryNotification({
        type: "beta_request",
        source: "onboarding_intent",
        submitterName: existing.name,
        submitterEmail: existing.email,
        businessName: data.organizationName,
        message: inquiryMessage,
        inquiryId: result.inquiryId,
      }).catch((err) => {
        console.error("Failed to send onboarding-intent inquiry notification:", err);
      }),
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      profile: result.updatedUser,
      betaInquiryCreated: result.inquiryId !== null,
    },
  });
}
