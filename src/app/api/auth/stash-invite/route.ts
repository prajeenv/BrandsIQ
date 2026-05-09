import { NextResponse } from "next/server";

const COOKIE_NAME = "bx_invite_code";
const MAX_AGE_SECONDS = 600; // 10 minutes — long enough for OAuth round-trip, short enough to limit abuse.

/**
 * POST /api/auth/stash-invite
 * Stashes an invite code in a short-lived HttpOnly cookie so it survives the
 * OAuth round-trip to Google (which drops URL params). Read by NextAuth's
 * events.signIn when isNewUser === true. See MVP.md Section 13.2.
 *
 * Body: { code: string }
 * Returns: { success: true }
 *
 * Always 200 if the input parses — we don't validate the code here (the signup
 * route validates atomically). If the user pastes garbage, the cookie just
 * won't match anything later, and they'll be created as a Free user.
 */
export async function POST(request: Request) {
  let code: string | null = null;
  try {
    const body = (await request.json()) as { code?: unknown };
    if (typeof body.code === "string" && body.code.length > 0 && body.code.length <= 64) {
      code = body.code;
    }
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Invalid request body" },
      },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "code is required" },
      },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });

  return response;
}

/**
 * DELETE /api/auth/stash-invite
 * Clears the cookie. Called after successful credentials signup (where the
 * code was sent in the form body, not via cookie). Defensive cleanup so a
 * stale cookie doesn't affect a later OAuth signup on the same device.
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
