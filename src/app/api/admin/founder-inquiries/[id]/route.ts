import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isFounder } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { resolveFounderInquirySchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

function notFound() {
  return NextResponse.json(
    { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
    { status: 404 },
  );
}

/**
 * PATCH /api/admin/founder-inquiries/[id]
 *
 * Founder-only. Toggles an inquiry between resolved/unresolved and optionally
 * sets founderNotes. Body schema (all fields optional):
 *
 *   { resolved?: boolean, founderNotes?: string | null }
 *
 * - resolved=true sets resolvedAt to NOW() (no-op if already resolved)
 * - resolved=false clears resolvedAt (re-opens the inquiry)
 * - founderNotes is set/cleared independently of the resolved toggle
 *
 * Non-founders get 404.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!isFounder(session)) {
    return notFound();
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
      },
      { status: 400 },
    );
  }

  // Schema allows founderNotes alone; we layer `resolved` on top here because
  // the toggle is workflow-specific and not part of the inquiry's stored shape.
  const bodyObj = (body && typeof body === "object" ? body : {}) as {
    resolved?: unknown;
    founderNotes?: unknown;
  };
  const notesParsed = resolveFounderInquirySchema.safeParse({
    founderNotes: bodyObj.founderNotes,
  });
  if (!notesParsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: notesParsed.error.issues[0]?.message ?? "Invalid notes",
        },
      },
      { status: 400 },
    );
  }

  // resolved must be true | false | undefined
  let resolvedDelta: { resolvedAt: Date | null } | object = {};
  if (typeof bodyObj.resolved === "boolean") {
    resolvedDelta = {
      resolvedAt: bodyObj.resolved ? new Date() : null,
    };
  }

  // notes delta — only included when the key was explicitly present, to
  // distinguish "I didn't touch notes" from "I cleared notes."
  const notesDelta: { founderNotes?: string | null } = {};
  if ("founderNotes" in bodyObj) {
    notesDelta.founderNotes = notesParsed.data.founderNotes ?? null;
  }

  const existing = await prisma.founderInquiry.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return notFound();
  }

  const updated = await prisma.founderInquiry.update({
    where: { id },
    data: { ...resolvedDelta, ...notesDelta },
    include: {
      user: {
        select: { id: true, email: true, name: true, isBetaUser: true, tier: true },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: { inquiry: updated },
  });
}
