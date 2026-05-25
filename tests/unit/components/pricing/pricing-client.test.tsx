import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// next/link stub — passthrough to <a>
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// next-auth/react — we control `data` and `status` per test via useSession.
const useSessionMock = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
}));

import { PricingClient } from "@/app/pricing/pricing-client";

describe("PricingClient — phase_1 banner state", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("shows the prospect-facing banner with Request beta access CTA for anonymous visitors", () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });

    render(<PricingClient currentPhase="phase_1" />);

    // Prospect banner is visible
    expect(
      screen.getByTestId("pricing-banner-prospect"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/brandsiq is currently in closed beta\./i),
    ).toBeInTheDocument();
    // CTA button present
    expect(
      screen.getByRole("button", { name: /request beta access/i }),
    ).toBeInTheDocument();
    // Beta-thank-you banner is NOT shown
    expect(
      screen.queryByTestId("pricing-banner-beta-user"),
    ).not.toBeInTheDocument();
    // /api/credits is not called for an anon visitor
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("swaps to the thank-you banner with no CTA when the signed-in user is a beta user", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u-beta", email: "beta@x.com", tier: "FREE" } },
      status: "authenticated",
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { isBetaUser: true } }),
    });

    render(<PricingClient currentPhase="phase_1" />);

    // Until the fetch resolves, the prospect banner is shown (better to flash
    // the public copy than the thank-you copy for someone who isn't beta).
    expect(
      screen.getByTestId("pricing-banner-prospect"),
    ).toBeInTheDocument();

    // After the fetch resolves, the banner swaps
    await waitFor(() => {
      expect(
        screen.getByTestId("pricing-banner-beta-user"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/you're in the closed beta\. thank you!/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/preview of the commercial plans we'll launch later/i),
    ).toBeInTheDocument();

    // Critically: no "Request beta access" CTA exists once the swap happens
    expect(
      screen.queryByRole("button", { name: /request beta access/i }),
    ).not.toBeInTheDocument();
    // And the prospect banner is gone
    expect(
      screen.queryByTestId("pricing-banner-prospect"),
    ).not.toBeInTheDocument();
  });

  it("keeps the prospect banner for signed-in non-beta users (Free tier)", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u-free", email: "free@x.com", tier: "FREE" } },
      status: "authenticated",
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { isBetaUser: false } }),
    });

    render(<PricingClient currentPhase="phase_1" />);

    // Wait for the fetch to settle
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/credits");
    });

    // After settlement, prospect banner remains visible (non-beta user gets
    // the same "Request beta access" surface as anon visitors).
    expect(
      screen.getByTestId("pricing-banner-prospect"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("pricing-banner-beta-user"),
    ).not.toBeInTheDocument();
  });

  it("falls back to the prospect banner if /api/credits errors", async () => {
    useSessionMock.mockReturnValue({
      data: { user: { id: "u-x", email: "x@x.com", tier: "FREE" } },
      status: "authenticated",
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "boom" }),
    });

    render(<PricingClient currentPhase="phase_1" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Banner state never flips to beta-thank-you
    expect(
      screen.getByTestId("pricing-banner-prospect"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("pricing-banner-beta-user"),
    ).not.toBeInTheDocument();
  });

  it("does not render a phase_1 banner under phase_2", () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });

    render(<PricingClient currentPhase="phase_2" />);

    expect(
      screen.queryByTestId("pricing-banner-prospect"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("pricing-banner-beta-user"),
    ).not.toBeInTheDocument();
  });
});

describe("PricingClient — inquiry form pre-fill", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("hides submitter inputs when a signed-in non-beta user opens the inquiry dialog", async () => {
    // Free user — they still see the prospect banner so the CTA is present.
    useSessionMock.mockReturnValue({
      data: {
        user: {
          id: "u-free",
          email: "free@x.com",
          name: "Free User",
          tier: "FREE",
        },
      },
      status: "authenticated",
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { isBetaUser: false, organizationName: "Free Co" },
      }),
    });

    render(<PricingClient currentPhase="phase_1" />);

    // Wait until the fetch settled (organizationName is now in state)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/credits");
    });

    // Banner CTA is the prospect "Request beta access" button
    const cta = screen.getByRole("button", { name: /request beta access/i });
    fireEvent.click(cta);

    // Form is now open. Submitter fields are hidden because we have
    // name+email from the session.
    await waitFor(() => {
      expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/^email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/business name/i)).not.toBeInTheDocument();
    // Message field is still rendered
    expect(screen.getByLabelText(/tell us about your business/i)).toBeInTheDocument();
  });

  it("keeps submitter inputs visible for anonymous visitors", () => {
    useSessionMock.mockReturnValue({ data: null, status: "unauthenticated" });

    render(<PricingClient currentPhase="phase_1" />);

    fireEvent.click(
      screen.getByRole("button", { name: /request beta access/i }),
    );

    // Anonymous — submitter fields render so they can give us a way to reply
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
  });
});
