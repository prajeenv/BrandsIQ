import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

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

// Routes that are only for unauthenticated users
const authRoutes = [
  "/auth/signin",
  "/auth/signup",
  "/auth/forgot-password",
  "/auth/reset-password",
];

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

  // Check if the request is for an auth route (signin, signup, etc.)
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Get the JWT token (works in Edge runtime)
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  });

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
