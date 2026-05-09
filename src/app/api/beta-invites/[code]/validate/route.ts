import { NextResponse } from "next/server";
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

  const invite = await prisma.betaInviteLink.findUnique({
    where: { code },
    select: { expiresAt: true, usedAt: true },
  });

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
