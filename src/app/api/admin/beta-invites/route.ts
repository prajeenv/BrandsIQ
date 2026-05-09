import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { isFounder } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { BETA_INVITE_EXPIRY_DAYS } from "@/lib/constants";

// Lo-fi 404 for non-founders — we don't acknowledge the route exists.
function notFound() {
  return NextResponse.json(
    { success: false, error: { code: "NOT_FOUND", message: "Not found" } },
    { status: 404 }
  );
}

// 16-char URL-safe random code (96 bits of entropy via 12 random bytes → base64url).
function generateInviteCode(): string {
  return randomBytes(12)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
    .slice(0, 16);
}

/**
 * POST /api/admin/beta-invites
 * Founder-only. Generates a new beta invite link.
 * Body: { notes?: string }
 * Returns: { code, expiresAt, url }
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!isFounder(session)) {
    return notFound();
  }

  let notes: string | null = null;
  try {
    const body = (await request.json().catch(() => ({}))) as { notes?: unknown };
    if (typeof body.notes === "string" && body.notes.trim().length > 0) {
      notes = body.notes.trim().slice(0, 500);
    }
  } catch {
    // empty body is fine
  }

  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + BETA_INVITE_EXPIRY_DAYS);

  const invite = await prisma.betaInviteLink.create({
    data: {
      code: generateInviteCode(),
      notes,
      expiresAt,
    },
  });

  // Build the public signup URL. Prefer NEXTAUTH_URL (canonical app URL); fall
  // back to request origin so dev environments without env config still work.
  const origin = process.env.NEXTAUTH_URL ?? new URL(request.url).origin;
  const url = `${origin.replace(/\/$/, "")}/auth/signup?b=${invite.code}`;

  return NextResponse.json(
    {
      success: true,
      data: {
        invite: {
          id: invite.id,
          code: invite.code,
          notes: invite.notes,
          createdAt: invite.createdAt,
          expiresAt: invite.expiresAt,
          url,
        },
      },
    },
    { status: 201 }
  );
}

/**
 * GET /api/admin/beta-invites
 * Founder-only. Lists all invite links with derived status.
 */
export async function GET() {
  const session = await auth();
  if (!isFounder(session)) {
    return notFound();
  }

  const invites = await prisma.betaInviteLink.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      usedBy: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  const now = new Date();
  const data = invites.map((invite) => ({
    id: invite.id,
    code: invite.code,
    notes: invite.notes,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    usedAt: invite.usedAt,
    usedBy: invite.usedBy,
    status: invite.usedAt
      ? ("used" as const)
      : invite.expiresAt < now
        ? ("expired" as const)
        : ("active" as const),
  }));

  return NextResponse.json({ success: true, data: { invites: data } });
}
