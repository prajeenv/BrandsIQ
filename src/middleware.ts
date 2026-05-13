import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isFounderEmail } from "@/lib/auth-helpers";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/reviews",
  "/settings",
  "/onboarding",
];

// API routes that require authentication
const protectedApiRoutes = [
  "/api/reviews",
  "/api/brand-voice",
  "/api/credits",
  "/api/user",
  "/api/dashboard",
];

// Founder-only admin routes (UI + API). Non-founders get a 404 — we don't
// disclose that the route exists. See docs/MVP_Phase-1/MVP.md Section 13.1.
const adminRoutes = ["/dashboard/admin", "/api/admin"];

// Routes that are only meaningful for unauthenticated users — authenticated
// users get bounced to /dashboard. Sign-in and sign-up specifically; we keep
// /auth/forgot-password and /auth/reset-password reachable for signed-in
// users so the "Change password" link on /dashboard/settings/profile works.
// Password-recovery flows operate the same regardless of session state
// (they end with a click on a token link in the user's inbox).
const authRoutes = ["/auth/signin", "/auth/signup"];

function notFoundResponse(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the request is for a protected route
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if the request is for a protected API route
  const isProtectedApiRoute = protectedApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // Check if the request is for an auth route (signin, signup, etc.)
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Get the JWT token (works in Edge runtime)
  // NextAuth v5 uses "authjs" cookie prefix instead of "next-auth"
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const token = await getToken({
    req: request,
    secret,
    cookieName: request.nextUrl.protocol === "https:"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token",
  });

  // Admin routes: 404 for non-founders (whether authenticated or not).
  // Defense-in-depth — each route handler also calls isFounder(session).
  if (isAdminRoute) {
    const email = typeof token?.email === "string" ? token.email : null;
    if (!isFounderEmail(email)) {
      return notFoundResponse();
    }
  }

  // Redirect unauthenticated users from protected routes to signin
  if ((isProtectedRoute || isProtectedApiRoute) && !token) {
    if (isProtectedApiRoute) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        },
        { status: 401 }
      );
    }

    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users from auth routes to dashboard
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Onboarding gate: every authenticated user must complete onboarding
  // (User.organizationName set) before they reach any /dashboard/* route.
  // The flag is on the JWT (token.hasOnboarded) so this check is free —
  // no DB call. Refreshed via session.update() after onboarding submits.
  // We deliberately scope to /dashboard/* and exclude /onboarding itself
  // to avoid a redirect loop.
  if (
    token &&
    pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/dashboard/admin") && // admin gate handles itself above
    token.hasOnboarded === false
  ) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Mirror: once onboarding is complete, the /onboarding page itself
  // shouldn't be reachable. Bounces refresh-and-back-to-onboarding loops
  // and gives a clean post-submit redirect destination.
  if (
    token &&
    pathname.startsWith("/onboarding") &&
    token.hasOnboarded === true
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api/auth (NextAuth routes - handled by NextAuth itself)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api/auth).*)",
  ],
};
