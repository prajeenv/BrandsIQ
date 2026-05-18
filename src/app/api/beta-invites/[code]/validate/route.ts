import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ code: string }> };

/**
 * GET /api/beta-invites/[code]/validate
 * Public — called by the signup form before submission to check if an invite
 * code is valid. Returns { valid, expired, used } with no PII.
 *
 * Returns 200 even for invalid codes; the body's `valid` flag is the signal.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { code } = await params;

  if (!code || typeof code !== "string" || code.length > 64) {
    return NextResponse.json({
      success: true,
      data: { valid: false, expired: false, used: false, exists: false },
    });
  }

  let invite;
  try {
    invite = await prisma.betaInviteLink.findUnique({
      where: { code },
      select: { expiresAt: true, usedAt: true },
    });
  } catch (error) {
    // A DB failure here means we can't tell the signup form whether the
    // invite is good. Capture loudly — a systematic failure would silently
    // block legitimate beta signups. Fail safe toward "doesn't exist": the
    // form routes that to the expired-link recovery page (graceful) rather
    // than crashing the signup flow.
    Sentry.captureException(error, {
      tags: { area: "phase_1_invite_validation" },
    });
    return NextResponse.json({
      success: true,
      data: { valid: false, expired: false, used: false, exists: false },
    });
  }

  if (!invite) {
    return NextResponse.json({
      success: true,
      data: { valid: false, expired: false, used: false, exists: false },
    });
  }

  const now = new Date();
  const expired = invite.expiresAt < now;
  const used = invite.usedAt !== null;
  const valid = !expired && !used;

  return NextResponse.json({
    success: true,
    data: { valid, expired, used, exists: true },
  });
}
