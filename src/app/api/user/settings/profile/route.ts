import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settingsProfileUpdateSchema } from "@/lib/validations";

/**
 * PATCH /api/user/settings/profile
 *
 * Settings-page partial-update route. Distinct from PATCH /api/user/profile
 * (the onboarding submission) because:
 *
 *  - This route accepts a partial body — any subset of editable fields, one
 *    at a time. The onboarding route demands the full required-field set.
 *  - This route never fires a FounderInquiry. Beta intent / challenge text
 *    are signup-only signal; editing them post-signup makes no sense and
 *    would create duplicate inquiries.
 *  - This route updates the user's display name (User.name). The onboarding
 *    route doesn't, because name is set at signup.
 *  - locationName is an optional partial update here. If the user has no
 *    Location row yet (somehow), one is created — same upsert semantics as
 *    onboarding.
 *
 * All updates run in a single transaction so a name/location pair never lands
 * half-applied. Same shape as the onboarding transaction in
 * src/app/api/user/profile/route.ts.
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

  const parsed = settingsProfileUpdateSchema.safeParse(body);
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

  // Separate the user-row update from the location update because they live on
  // different tables. Both happen in one transaction.
  const userUpdate: Record<string, unknown> = {};
  if (data.name !== undefined) userUpdate.name = data.name;
  if (data.organizationName !== undefined) userUpdate.organizationName = data.organizationName;
  if (data.industry !== undefined) userUpdate.industry = data.industry;
  // businessType is the cascade partner. The Zod superRefine has already
  // verified the pair is internally consistent — if industry changed and the
  // form sent both, we trust them. If only industry changed (cascade reset
  // server-side), the form is expected to send businessType = null too;
  // the route doesn't auto-null it because explicit > inferred.
  if (data.businessType !== undefined) userUpdate.businessType = data.businessType;
  if (data.country !== undefined) userUpdate.country = data.country;
  if (data.locationCountEstimate !== undefined)
    userUpdate.locationCountEstimate = data.locationCountEstimate;
  if (data.primaryPlatform !== undefined) userUpdate.primaryPlatform = data.primaryPlatform;

  // Catch the unlikely case where every field in the payload was undefined
  // after the optional-chain — refine guards a non-empty object but doesn't
  // guarantee at least one non-undefined value at runtime when nullables are
  // sent as `undefined`. Cheap defensive check.
  if (Object.keys(userUpdate).length === 0 && data.locationName === undefined) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "No fields to update" },
      },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let updatedUser = null;
      if (Object.keys(userUpdate).length > 0) {
        updatedUser = await tx.user.update({
          where: { id: userId },
          data: userUpdate,
          select: {
            id: true,
            email: true,
            name: true,
            organizationName: true,
            industry: true,
            businessType: true,
            country: true,
            locationCountEstimate: true,
            primaryPlatform: true,
            isBetaUser: true,
            tier: true,
          },
        });
      } else {
        updatedUser = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            organizationName: true,
            industry: true,
            businessType: true,
            country: true,
            locationCountEstimate: true,
            primaryPlatform: true,
            isBetaUser: true,
            tier: true,
          },
        });
      }

      if (!updatedUser) {
        // user.update would have thrown if the row didn't exist; findUnique
        // can return null if the user was deleted concurrently.
        throw new Error("USER_NOT_FOUND");
      }

      let location = null;
      if (data.locationName !== undefined) {
        const existingLocation = await tx.location.findFirst({
          where: { userId },
          orderBy: { createdAt: "asc" },
        });
        if (existingLocation) {
          location = await tx.location.update({
            where: { id: existingLocation.id },
            data: { name: data.locationName },
            select: { id: true, name: true },
          });
        } else {
          location = await tx.location.create({
            data: { userId, name: data.locationName },
            select: { id: true, name: true },
          });
        }
      }

      return { user: updatedUser, location };
    });

    return NextResponse.json({
      success: true,
      data: { profile: result.user, location: result.location },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "USER_NOT_FOUND") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "User not found" },
        },
        { status: 404 },
      );
    }
    console.error("Settings profile update error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to update profile" },
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/user/settings/profile
 *
 * Returns the current profile shape for the settings page to seed its form
 * state. Same fields as PATCH plus the user's first Location row.
 */
export async function GET() {
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      organizationName: true,
      industry: true,
      businessType: true,
      country: true,
      locationCountEstimate: true,
      primaryPlatform: true,
      isBetaUser: true,
      tier: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "NOT_FOUND", message: "User not found" },
      },
      { status: 404 },
    );
  }

  const location = await prisma.location.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  // Also expose whether the user has a credentials-account password set. The
  // settings UI uses this to decide whether to show "Change password" — OAuth-
  // only users have no password and no flow that makes sense for them.
  const userWithPassword = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });
  const hasPassword = Boolean(userWithPassword?.password);

  return NextResponse.json({
    success: true,
    data: { profile: user, location, hasPassword },
  });
}
