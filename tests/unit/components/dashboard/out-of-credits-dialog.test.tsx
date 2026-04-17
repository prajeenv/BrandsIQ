import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

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
