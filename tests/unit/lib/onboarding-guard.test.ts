import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth() and prisma so the helper runs in isolation.
const authMock = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}));

const findUniqueMock = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
  },
}));

// next/navigation's redirect() throws a synthetic NEXT_REDIRECT error in
// real Next.js. We stub it as a sentinel-throwing function so we can
// detect "redirect was called" by catching the throw and inspecting it.
const redirectMock = vi.fn((path: string) => {
  throw new Error(`__REDIRECT__:${path}`);
});
vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

import {
  getOnboardingStatus,
  requireOnboarded,
  requireNotOnboarded,
} from "@/lib/onboarding-guard";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOnboardingStatus", () => {
  it("returns authenticated=false when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const status = await getOnboardingStatus();

    expect(status).toEqual({
      authenticated: false,
      userId: null,
      hasOnboarded: false,
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns hasOnboarded=true when User.organizationName is set", async () => {
    authMock.mockResolvedValue({ user: { id: "u-1" } });
    findUniqueMock.mockResolvedValue({ organizationName: "Bear Bakery" });

    const status = await getOnboardingStatus();

    expect(status).toEqual({
      authenticated: true,
      userId: "u-1",
      hasOnboarded: true,
    });
  });

  it("returns hasOnboarded=false when User.organizationName is null", async () => {
    authMock.mockResolvedValue({ user: { id: "u-1" } });
    findUniqueMock.mockResolvedValue({ organizationName: null });

    const status = await getOnboardingStatus();

    expect(status).toEqual({
      authenticated: true,
      userId: "u-1",
      hasOnboarded: false,
    });
  });

  it("returns hasOnboarded=false when the user row is missing", async () => {
    // Edge: session exists but the user row was deleted concurrently.
    authMock.mockResolvedValue({ user: { id: "ghost" } });
    findUniqueMock.mockResolvedValue(null);

    const status = await getOnboardingStatus();

    expect(status.hasOnboarded).toBe(false);
  });
});

describe("requireOnboarded", () => {
  it("redirects to /onboarding when authenticated user has not onboarded", async () => {
    authMock.mockResolvedValue({ user: { id: "u-1" } });
    findUniqueMock.mockResolvedValue({ organizationName: null });

    await expect(requireOnboarded()).rejects.toThrow("__REDIRECT__:/onboarding");
    expect(redirectMock).toHaveBeenCalledWith("/onboarding");
  });

  it("passes through when user has onboarded", async () => {
    authMock.mockResolvedValue({ user: { id: "u-1" } });
    findUniqueMock.mockResolvedValue({ organizationName: "Bear Bakery" });

    await expect(requireOnboarded()).resolves.toBeUndefined();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does not redirect unauthenticated requests (middleware's job)", async () => {
    authMock.mockResolvedValue(null);

    await expect(requireOnboarded()).resolves.toBeUndefined();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("requireNotOnboarded", () => {
  it("redirects to /dashboard when authenticated user has already onboarded", async () => {
    authMock.mockResolvedValue({ user: { id: "u-1" } });
    findUniqueMock.mockResolvedValue({ organizationName: "Bear Bakery" });

    await expect(requireNotOnboarded()).rejects.toThrow("__REDIRECT__:/dashboard");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard");
  });

  it("passes through when user has not onboarded", async () => {
    authMock.mockResolvedValue({ user: { id: "u-1" } });
    findUniqueMock.mockResolvedValue({ organizationName: null });

    await expect(requireNotOnboarded()).resolves.toBeUndefined();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does not redirect unauthenticated requests", async () => {
    authMock.mockResolvedValue(null);

    await expect(requireNotOnboarded()).resolves.toBeUndefined();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
