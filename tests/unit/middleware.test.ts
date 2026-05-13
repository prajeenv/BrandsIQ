import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// Mock getToken so we control what the middleware sees. The middleware reads
// the JWT cookie via next-auth/jwt; we replace that with a vi.fn() so each
// test can inject the token shape it wants.
const getTokenMock = vi.fn();
vi.mock("next-auth/jwt", () => ({
  getToken: (...args: unknown[]) => getTokenMock(...args),
}));

// Mock the founder-email helper to keep the admin-gate branch deterministic.
const isFounderEmailMock = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  isFounderEmail: (...args: unknown[]) => isFounderEmailMock(...args),
}));

import middleware from "@/middleware";

// Minimal NextRequest factory. The middleware reads .nextUrl.pathname,
// .nextUrl.protocol, and uses .url for redirect URLs.
function makeRequest(pathname: string): import("next/server").NextRequest {
  const url = new URL(`https://example.com${pathname}`);
  return {
    nextUrl: url,
    url: url.toString(),
    headers: new Headers(),
  } as unknown as import("next/server").NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  isFounderEmailMock.mockReturnValue(false);
});

describe("middleware — onboarding gate", () => {
  it("redirects authenticated un-onboarded users from /dashboard to /onboarding", async () => {
    getTokenMock.mockResolvedValue({
      email: "user@example.com",
      hasOnboarded: false,
    });

    const res = (await middleware(makeRequest("/dashboard"))) as NextResponse;

    expect(res.status).toBe(307); // Temporary redirect
    expect(res.headers.get("location")).toBe("https://example.com/onboarding");
  });

  it("redirects un-onboarded users from /dashboard/reviews to /onboarding", async () => {
    getTokenMock.mockResolvedValue({
      email: "user@example.com",
      hasOnboarded: false,
    });

    const res = (await middleware(
      makeRequest("/dashboard/reviews"),
    )) as NextResponse;

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/onboarding");
  });

  it("lets onboarded users reach /dashboard normally", async () => {
    getTokenMock.mockResolvedValue({
      email: "user@example.com",
      hasOnboarded: true,
    });

    const res = (await middleware(makeRequest("/dashboard"))) as NextResponse;

    // No redirect — NextResponse.next() produces a normal 200-ish response
    // with no Location header.
    expect(res.headers.get("location")).toBeNull();
  });

  it("lets un-onboarded users reach /onboarding itself", async () => {
    getTokenMock.mockResolvedValue({
      email: "user@example.com",
      hasOnboarded: false,
    });

    const res = (await middleware(makeRequest("/onboarding"))) as NextResponse;

    // No redirect — they're allowed in
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects onboarded users away from /onboarding to /dashboard", async () => {
    // Prevents refresh-into-onboarding loops once a user has completed it.
    getTokenMock.mockResolvedValue({
      email: "user@example.com",
      hasOnboarded: true,
    });

    const res = (await middleware(makeRequest("/onboarding"))) as NextResponse;

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/dashboard");
  });

  it("allows founders to reach /dashboard/admin/* even when un-onboarded", async () => {
    // The admin gate handles its own access control (404 for non-founders).
    // We deliberately don't block founders from admin pages just because
    // they haven't onboarded — admin tooling pre-dates onboarding for the
    // founder account.
    getTokenMock.mockResolvedValue({
      email: "prajeen@example.com",
      hasOnboarded: false,
    });
    isFounderEmailMock.mockReturnValue(true);

    const res = (await middleware(
      makeRequest("/dashboard/admin/beta-invites"),
    )) as NextResponse;

    // Not redirected to /onboarding (and not 404'd, since they're a founder).
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated users to signin (existing behavior preserved)", async () => {
    getTokenMock.mockResolvedValue(null);

    const res = (await middleware(makeRequest("/dashboard"))) as NextResponse;

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/signin");
  });

  it("does not run the onboarding gate for non-dashboard routes", async () => {
    // /pricing isn't gated even though the user is un-onboarded.
    getTokenMock.mockResolvedValue({
      email: "user@example.com",
      hasOnboarded: false,
    });

    // /pricing isn't in protectedRoutes, so middleware falls through to
    // NextResponse.next() with no redirect.
    const res = (await middleware(makeRequest("/pricing"))) as NextResponse;
    expect(res.headers.get("location")).toBeNull();
  });
});
