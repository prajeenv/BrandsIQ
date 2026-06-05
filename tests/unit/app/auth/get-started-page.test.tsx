import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// next/link stub — passthrough to <a>.
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// getCurrentPhase is the gateway's phase switch. Control it per test.
const getCurrentPhaseMock = vi.fn();
vi.mock("@/lib/system-phase", () => ({
  getCurrentPhase: () => getCurrentPhaseMock(),
}));

// redirect() throws NEXT_REDIRECT in real Next. Stub it as a sentinel-throwing
// fn so we can assert "redirected to X" by catching the throw.
const redirectMock = vi.fn((path: string) => {
  throw new Error(`__REDIRECT__:${path}`);
});
vi.mock("next/navigation", () => ({
  redirect: (path: string) => redirectMock(path),
}));

// The embedded FounderInquiryForm imports PostHog + uses fetch; stub both so
// the form mounts without side effects (we never submit in these tests).
vi.mock("@/lib/posthog-events", () => ({
  trackFounderInquirySubmitted: vi.fn(),
}));

import GetStartedPage from "@/app/(auth)/auth/get-started/page";

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = vi.fn();
});

describe("GetStartedPage — phase_1 (closed beta)", () => {
  beforeEach(() => {
    getCurrentPhaseMock.mockReturnValue("phase_1");
  });

  it("renders the request-beta form and forwards utm_source to the signup link", () => {
    render(<GetStartedPage searchParams={{ utm_source: "walkin" }} />);

    // beta_request DEFAULT_COPY: the submit button + the message label.
    expect(
      screen.getByRole("button", { name: "Request beta access" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Tell us about your business/i)).toBeInTheDocument();

    // "Continue with regular signup" preserves utm_source.
    const signupLink = screen.getByRole("link", {
      name: /continue with regular signup/i,
    });
    expect(signupLink).toHaveAttribute(
      "href",
      "/auth/signup?utm_source=walkin"
    );

    // Sign-in link.
    expect(
      screen.getByRole("link", { name: /already have an account/i })
    ).toHaveAttribute("href", "/auth/signin");

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("links to bare /auth/signup when no utm_source is present", () => {
    render(<GetStartedPage searchParams={{}} />);

    const signupLink = screen.getByRole("link", {
      name: /continue with regular signup/i,
    });
    expect(signupLink).toHaveAttribute("href", "/auth/signup");
  });

  it("uses the first value when utm_source arrives as a repeated (array) param", () => {
    render(<GetStartedPage searchParams={{ utm_source: ["walkin", "x"] }} />);

    const signupLink = screen.getByRole("link", {
      name: /continue with regular signup/i,
    });
    expect(signupLink).toHaveAttribute(
      "href",
      "/auth/signup?utm_source=walkin"
    );
  });
});

describe("GetStartedPage — phase_2 (commercial launch)", () => {
  beforeEach(() => {
    getCurrentPhaseMock.mockReturnValue("phase_2");
  });

  it("redirects to /auth/signup preserving utm_source", () => {
    expect(() =>
      GetStartedPage({ searchParams: { utm_source: "walkin" } })
    ).toThrow("__REDIRECT__:/auth/signup?utm_source=walkin");
    expect(redirectMock).toHaveBeenCalledWith("/auth/signup?utm_source=walkin");
  });

  it("redirects to bare /auth/signup when no utm_source is present", () => {
    expect(() => GetStartedPage({ searchParams: {} })).toThrow(
      "__REDIRECT__:/auth/signup"
    );
    expect(redirectMock).toHaveBeenCalledWith("/auth/signup");
  });
});
