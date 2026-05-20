import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { brandVoiceSchema } from "@/lib/validations";
import { fromLegacyForm, toLegacyShape } from "./_legacy-bridge";

/**
 * Brand voice redesign iter 3 ⇄ iter 6 bridge.
 *
 * The DB columns are now the V2 shape (iter 3 reset migration). The form
 * still sends and consumes the legacy shape until iter 6 rewrites it. This
 * route translates in both directions via `src/app/api/brand-voice/_legacy-
 * bridge.ts` so the form keeps working without modification on staging.
 *
 * Iter 6 deletes `_legacy-bridge.ts`, swaps validation to `brandVoiceSchema
 * V2`, and returns V2 shape directly.
 */

/**
 * GET /api/brand-voice — return the user's brand voice in the legacy shape
 * the existing form expects. Creates a default row via DB column defaults
 * if none exists.
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

    // Try to find existing brand voice
    let brandVoice = await prisma.brandVoice.findUnique({
      where: { userId: session.user.id },
    });

    // Create default if doesn't exist — all V2 columns have DB-level
    // defaults so we only need `userId` and the explicit tone (the column
    // default is the V2 key string; being explicit makes the intent
    // obvious at the call site).
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
      data: { brandVoice: toLegacyShape(brandVoice) },
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
      { status: 500 }
    );
  }
}

/**
 * PUT /api/brand-voice — accept the legacy form's payload (still validated
 * by the legacy `brandVoiceSchema` until iter 6), translate to the V2
 * column write shape via the bridge, and upsert.
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
        { status: 401 }
      );
    }

    const body = await request.json();

    const validationResult = brandVoiceSchema.safeParse(body);
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
        { status: 400 }
      );
    }

    // Translate the legacy payload to V2 column values. Untouched V2
    // columns (the toggles, sign-off, framing, reply-to-email) keep their
    // existing values on update or take the DB defaults on create.
    const v2 = fromLegacyForm({
      tone: validationResult.data.tone,
      formality: validationResult.data.formality,
      keyPhrases: validationResult.data.keyPhrases,
      styleNotes: validationResult.data.styleNotes ?? null,
      sampleResponses: validationResult.data.sampleResponses,
    });

    const brandVoice = await prisma.brandVoice.upsert({
      where: { userId: session.user.id },
      update: {
        tone: v2.tone,
        keyPhrases: v2.keyPhrases,
        styleGuidelines: v2.styleGuidelines,
        sampleResponses: v2.sampleResponses,
      },
      create: {
        userId: session.user.id,
        tone: v2.tone,
        keyPhrases: v2.keyPhrases,
        styleGuidelines: v2.styleGuidelines,
        sampleResponses: v2.sampleResponses,
      },
    });

    return NextResponse.json({
      success: true,
      data: { brandVoice: toLegacyShape(brandVoice) },
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
      { status: 500 }
    );
  }
}
