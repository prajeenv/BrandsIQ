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

describe("middleware — auth + redirect rules", () => {
  it("redirects unauthenticated users from /dashboard to signin", async () => {
    getTokenMock.mockResolvedValue(null);

    const res = (await middleware(makeRequest("/dashboard"))) as NextResponse;

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/auth/signin");
  });

  it("returns 401 JSON for unauthenticated protected API requests", async () => {
    getTokenMock.mockResolvedValue(null);

    const res = (await middleware(
      makeRequest("/api/reviews"),
    )) as NextResponse;

    expect(res.status).toBe(401);
  });

  it("redirects authenticated users from /auth/signin to /dashboard", async () => {
    getTokenMock.mockResolvedValue({ email: "user@example.com" });

    const res = (await middleware(makeRequest("/auth/signin"))) as NextResponse;

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://example.com/dashboard");
  });

  it("lets authenticated users reach /dashboard without onboarding-gate logic in middleware", async () => {
    // The onboarding gate moved to the server-component layout
    // (src/app/(dashboard)/dashboard/layout.tsx). Middleware no longer
    // reads or enforces onboarding state — that's intentional, see the
    // PR that reverted the JWT-based gate.
    getTokenMock.mockResolvedValue({ email: "user@example.com" });

    const res = (await middleware(makeRequest("/dashboard"))) as NextResponse;

    expect(res.headers.get("location")).toBeNull();
  });

  it("lets authenticated users reach /onboarding without middleware-level redirect", async () => {
    // The mirror gate (onboarded → /dashboard) also moved to the
    // server-component page (src/app/(dashboard)/onboarding/page.tsx).
    getTokenMock.mockResolvedValue({ email: "user@example.com" });

    const res = (await middleware(makeRequest("/onboarding"))) as NextResponse;

    expect(res.headers.get("location")).toBeNull();
  });

  it("returns 404 for non-founders on /dashboard/admin/*", async () => {
    getTokenMock.mockResolvedValue({ email: "user@example.com" });
    isFounderEmailMock.mockReturnValue(false);

    const res = (await middleware(
      makeRequest("/dashboard/admin/beta-invites"),
    )) as NextResponse;

    expect(res.status).toBe(404);
  });

  it("allows founders to reach /dashboard/admin/*", async () => {
    getTokenMock.mockResolvedValue({ email: "prajeen@example.com" });
    isFounderEmailMock.mockReturnValue(true);

    const res = (await middleware(
      makeRequest("/dashboard/admin/beta-invites"),
    )) as NextResponse;

    expect(res.headers.get("location")).toBeNull();
  });

  it("does not block /pricing for un-onboarded users (middleware no longer checks)", async () => {
    getTokenMock.mockResolvedValue({ email: "user@example.com" });

    const res = (await middleware(makeRequest("/pricing"))) as NextResponse;

    expect(res.headers.get("location")).toBeNull();
  });
});
