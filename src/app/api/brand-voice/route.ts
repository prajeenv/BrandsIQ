import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { brandVoiceSchemaV2 } from "@/lib/validations";
import { normalizeBrandVoice } from "@/lib/ai/brand-voice-normalize";

/**
 * Brand voice route — V2 cutover (iter 6).
 *
 * The iter-3 → iter-6 legacy bridge has been removed. The route now:
 *   - GET: returns the brand voice in V2 shape, projected through
 *     `normalizeBrandVoice` so the response is always the canonical
 *     V2 shape (defends against any malformed JSONB column values).
 *   - PUT: validates incoming payloads via `brandVoiceSchemaV2`, writes
 *     V2 columns directly, returns V2 shape.
 *
 * Spec: docs/MVP_Phase-1/BRAND_VOICE_REDESIGN.md §9.2.
 */

/**
 * Build the V2-shape response payload from a DB row. Runs the row
 * through `normalizeBrandVoice` so the JSONB columns are coerced to
 * their typed shape and any unexpected legacy values are mapped to V2
 * defaults.
 */
function projectToV2(row: {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}) {
  const normalized = normalizeBrandVoice(row);
  return {
    id: row.id,
    tone: normalized.tone,
    keyPhrases: normalized.keyPhrases,
    styleGuidelines: normalized.styleGuidelines,
    sampleResponses: normalized.sampleResponses,
    acknowledgeNamedStaff: normalized.acknowledgeNamedStaff,
    acknowledgeOccasions: normalized.acknowledgeOccasions,
    salutationPattern: normalized.salutationPattern,
    signoffLines: normalized.signoffLines,
    negativeReviewEmailEnabled: normalized.negativeReviewEmailEnabled,
    negativeReviewFraming: normalized.negativeReviewFraming,
    negativeReviewFramingCustom: normalized.negativeReviewFramingCustom,
    replyToEmail: normalized.replyToEmail,
    responseLanguage: normalized.responseLanguage,
    // 5/30 — language the user typed their salutation/sign-off in.
    // Drives the resolver in post-process.ts. See DECISIONS.md #107.
    salutationSignoffLanguage: normalized.salutationSignoffLanguage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * GET /api/brand-voice — return the user's brand voice in the V2 shape.
 * Creates a default row via DB column defaults if none exists.
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
        { status: 401 },
      );
    }

    let brandVoice = await prisma.brandVoice.findUnique({
      where: { userId: session.user.id },
    });

    // Create default if doesn't exist — all V2 columns have DB-level
    // defaults so we only need `userId` and the explicit tone.
    if (!brandVoice) {
      brandVoice = await prisma.brandVoice.create({
        data: {
          userId: session.user.id,
          tone: "friendly_professional",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: { brandVoice: projectToV2(brandVoice) },
    });
  } catch (error) {
    console.error("Error fetching brand voice:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch brand voice",
        },
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/brand-voice — accept the V2 payload (validated by
 * `brandVoiceSchemaV2`) and upsert the V2 columns directly. Returns the
 * brand voice in V2 shape.
 */
export async function PUT(request: NextRequest) {
  try {
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

    const body = await request.json();
    const validationResult = brandVoiceSchemaV2.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validationResult.error.issues[0]?.message || "Invalid input",
            details: validationResult.error.issues,
          },
        },
        { status: 400 },
      );
    }

    const v2 = validationResult.data;

    // sampleResponses is a JSONB column; Prisma's type is `Prisma.InputJsonValue`.
    // The V2 schema validates to `Array<{ratingContext, responseText}>` which
    // serialises cleanly into JSONB without further coercion.
    const brandVoice = await prisma.brandVoice.upsert({
      where: { userId: session.user.id },
      update: {
        tone: v2.tone,
        keyPhrases: v2.keyPhrases,
        styleGuidelines: v2.styleGuidelines,
        sampleResponses: v2.sampleResponses,
        acknowledgeNamedStaff: v2.acknowledgeNamedStaff,
        acknowledgeOccasions: v2.acknowledgeOccasions,
        salutationPattern: v2.salutationPattern,
        signoffLines: v2.signoffLines,
        negativeReviewEmailEnabled: v2.negativeReviewEmailEnabled,
        negativeReviewFraming: v2.negativeReviewFraming,
        negativeReviewFramingCustom: v2.negativeReviewFramingCustom ?? null,
        replyToEmail: v2.replyToEmail ?? null,
        responseLanguage: v2.responseLanguage ?? null,
        salutationSignoffLanguage: v2.salutationSignoffLanguage ?? null,
      },
      create: {
        userId: session.user.id,
        tone: v2.tone,
        keyPhrases: v2.keyPhrases,
        styleGuidelines: v2.styleGuidelines,
        sampleResponses: v2.sampleResponses,
        acknowledgeNamedStaff: v2.acknowledgeNamedStaff,
        acknowledgeOccasions: v2.acknowledgeOccasions,
        salutationPattern: v2.salutationPattern,
        signoffLines: v2.signoffLines,
        negativeReviewEmailEnabled: v2.negativeReviewEmailEnabled,
        negativeReviewFraming: v2.negativeReviewFraming,
        negativeReviewFramingCustom: v2.negativeReviewFramingCustom ?? null,
        replyToEmail: v2.replyToEmail ?? null,
        responseLanguage: v2.responseLanguage ?? null,
        salutationSignoffLanguage: v2.salutationSignoffLanguage ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      data: { brandVoice: projectToV2(brandVoice) },
    });
  } catch (error) {
    console.error("Error updating brand voice:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update brand voice",
        },
      },
      { status: 500 },
    );
  }
}
