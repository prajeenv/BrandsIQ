import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { BrandVoiceIncompleteBanner } from "@/components/dashboard/BrandVoiceIncompleteBanner";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

describe("BrandVoiceIncompleteBanner", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders nothing when warning is null", () => {
    const { container } = render(
      <BrandVoiceIncompleteBanner userId="user_1" warning={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when userId is missing", () => {
    const { container } = render(
      <BrandVoiceIncompleteBanner
        userId={null}
        warning="negativeEmailToggleOnButReplyToEmailMissing"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the warning banner when warning is set and never dismissed", () => {
    render(
      <BrandVoiceIncompleteBanner
        userId="user_1"
        warning="negativeEmailToggleOnButReplyToEmailMissing"
      />,
    );

    expect(
      screen.getByText(/negative-review email invitations are dormant/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open brand voice/i })).toHaveAttribute(
      "href",
      "/dashboard/settings/brand-voice",
    );
  });

  it("hides the banner after the user clicks dismiss", () => {
    render(
      <BrandVoiceIncompleteBanner
        userId="user_1"
        warning="negativeEmailToggleOnButReplyToEmailMissing"
      />,
    );

    expect(
      screen.getByText(/negative-review email invitations are dormant/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    expect(
      screen.queryByText(/negative-review email invitations are dormant/i),
    ).not.toBeInTheDocument();
  });

  it("persists the dismissal in localStorage scoped by user + warning", () => {
    render(
      <BrandVoiceIncompleteBanner
        userId="user_1"
        warning="negativeEmailToggleOnButReplyToEmailMissing"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));

    const stored = window.localStorage.getItem(
      "bv-incomplete-banner-dismissed:negativeEmailToggleOnButReplyToEmailMissing:user_1",
    );
    expect(stored).not.toBeNull();
    expect(Number.parseInt(stored!, 10)).toBeGreaterThan(0);
  });

  it("does not render when the dismissal is fresh (within 7 days)", () => {
    window.localStorage.setItem(
      "bv-incomplete-banner-dismissed:negativeEmailToggleOnButReplyToEmailMissing:user_1",
      String(Date.now()),
    );

    const { container } = render(
      <BrandVoiceIncompleteBanner
        userId="user_1"
        warning="negativeEmailToggleOnButReplyToEmailMissing"
      />,
    );

    expect(container.textContent).toBe("");
  });

  it("renders again when the dismissal is older than 7 days", () => {
    window.localStorage.setItem(
      "bv-incomplete-banner-dismissed:negativeEmailToggleOnButReplyToEmailMissing:user_1",
      String(Date.now() - TTL_MS - 1000),
    );

    render(
      <BrandVoiceIncompleteBanner
        userId="user_1"
        warning="negativeEmailToggleOnButReplyToEmailMissing"
      />,
    );

    expect(
      screen.getByText(/negative-review email invitations are dormant/i),
    ).toBeInTheDocument();
  });

  it("scopes dismissal per user — a different user still sees the banner", () => {
    window.localStorage.setItem(
      "bv-incomplete-banner-dismissed:negativeEmailToggleOnButReplyToEmailMissing:user_1",
      String(Date.now()),
    );

    render(
      <BrandVoiceIncompleteBanner
        userId="user_2"
        warning="negativeEmailToggleOnButReplyToEmailMissing"
      />,
    );

    expect(
      screen.getByText(/negative-review email invitations are dormant/i),
    ).toBeInTheDocument();
  });
});
