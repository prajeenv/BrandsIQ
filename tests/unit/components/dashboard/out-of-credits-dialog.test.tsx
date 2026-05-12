import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { OutOfCreditsDialog } from "@/components/dashboard/OutOfCreditsDialog";

describe("OutOfCreditsDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    creditsRemaining: 0,
    creditsTotal: 15,
    resetDate: "2026-02-15T00:00:00Z",
    actionType: "generate" as const,
  };

  it("renders dialog title", () => {
    render(<OutOfCreditsDialog {...defaultProps} />);

    expect(
      screen.getByText(/you're out of response credits/i)
    ).toBeInTheDocument();
  });

  it('shows "Response generation" text for generate actionType', () => {
    render(<OutOfCreditsDialog {...defaultProps} actionType="generate" />);

    expect(
      screen.getByText(/response generation requires 1 credit/i)
    ).toBeInTheDocument();
  });

  it('shows "Regeneration" text for regenerate actionType', () => {
    render(<OutOfCreditsDialog {...defaultProps} actionType="regenerate" />);

    expect(
      screen.getByText(/regeneration requires 1 credit/i)
    ).toBeInTheDocument();
  });

  it("shows credits remaining info", () => {
    render(<OutOfCreditsDialog {...defaultProps} />);

    expect(screen.getByText("Credits remaining")).toBeInTheDocument();
    expect(screen.getByText("0 of 15")).toBeInTheDocument();
  });

  it("shows reset date", () => {
    render(<OutOfCreditsDialog {...defaultProps} />);

    expect(screen.getByText("Resets on")).toBeInTheDocument();
  });

  it("renders Upgrade Plan link to /pricing", () => {
    render(<OutOfCreditsDialog {...defaultProps} />);

    const link = screen.getByRole("link", { name: /upgrade plan/i });
    expect(link).toHaveAttribute("href", "/pricing");
  });

  it("calls onOpenChange(false) when Close button is clicked", () => {
    render(<OutOfCreditsDialog {...defaultProps} />);

    // Get the explicit "Close" text button (not the dialog X button)
    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    const textCloseBtn = closeButtons.find(
      (btn) => btn.textContent?.trim() === "Close"
    );
    expect(textCloseBtn).toBeDefined();
    fireEvent.click(textCloseBtn!);

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not render when open is false", () => {
    render(<OutOfCreditsDialog {...defaultProps} open={false} />);

    expect(
      screen.queryByText(/you're out of response credits/i)
    ).not.toBeInTheDocument();
  });
});

describe("OutOfCreditsDialog — phase_1 inquiry-form pre-fill", () => {
  // Stub fetch — the embedded FounderInquiryForm will POST to it on submit,
  // but we don't submit in these tests.
  const originalFetch = global.fetch;
  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  const baseProps = {
    open: true,
    onOpenChange: vi.fn(),
    creditsRemaining: 0,
    creditsTotal: 150,
    resetDate: "2026-06-15T00:00:00Z",
    actionType: "generate" as const,
    currentPhase: "phase_1" as const,
    isBetaUser: true,
  };

  it("hides submitter inputs in the embedded form when name+email are pre-filled", () => {
    render(
      <OutOfCreditsDialog
        {...baseProps}
        submitterName="Anita"
        submitterEmail="anita@example.com"
        submitterBusinessName="Cafe Arabica"
      />,
    );

    // Open the inquiry form by clicking the phase-1 CTA. For beta users
    // the button reads "Request more credits".
    fireEvent.click(
      screen.getByRole("button", { name: /request more credits/i }),
    );

    // Submitter inputs are gone — we have what we need from session/onboarding
    expect(screen.queryByLabelText(/^name$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/business name/i)).not.toBeInTheDocument();
    // Message field is still there
    expect(screen.getByLabelText(/^message/i)).toBeInTheDocument();
  });

  it("still shows submitter inputs (pre-filled) when only some fields are provided", () => {
    // E.g. user finished onboarding but somehow has no email on session —
    // we should still let them edit, not silently lose the form fields.
    render(
      <OutOfCreditsDialog
        {...baseProps}
        submitterName="Anita"
        submitterEmail={null}
        submitterBusinessName="Cafe Arabica"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /request more credits/i }),
    );

    // Submitter inputs are visible because email is missing
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
    // And the values we did pre-fill are populated
    expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe(
      "Anita",
    );
    expect(
      (screen.getByLabelText(/business name/i) as HTMLInputElement).value,
    ).toBe("Cafe Arabica");
  });
});
