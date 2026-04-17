import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ToneModifier } from "@/components/reviews/ToneModifier";

describe("ToneModifier", () => {
  const defaultProps = {
    onRegenerate: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
    currentTone: "professional",
    creditsNeeded: 1,
  };

  it("renders Regenerate trigger button", () => {
    render(<ToneModifier {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /regenerate/i })
    ).toBeInTheDocument();
  });

  it("disables trigger when isLoading", () => {
    render(<ToneModifier {...defaultProps} isLoading={true} />);

    expect(
      screen.getByRole("button", { name: /regenerating/i })
    ).toBeDisabled();
  });

  it("disables trigger when disabled prop is true", () => {
    render(<ToneModifier {...defaultProps} disabled={true} />);

    expect(
      screen.getByRole("button", { name: /regenerate/i })
    ).toBeDisabled();
  });

  it("opens dialog on trigger click and shows tone options", async () => {
    render(<ToneModifier {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText("Regenerate Response")).toBeInTheDocument();
      expect(screen.getByText("More Professional")).toBeInTheDocument();
      expect(screen.getByText("More Friendly")).toBeInTheDocument();
      expect(screen.getByText("More Empathetic")).toBeInTheDocument();
    });
  });

  it("shows credit cost in dialog footer", async () => {
    render(<ToneModifier {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText(/this will use 1 credit/i)).toBeInTheDocument();
    });
  });

  it("shows current tone in dialog description", async () => {
    render(<ToneModifier {...defaultProps} currentTone="friendly" />);

    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText(/current tone:/i)).toBeInTheDocument();
      expect(screen.getByText("friendly")).toBeInTheDocument();
    });
  });

  it("calls onRegenerate with selected tone", async () => {
    render(<ToneModifier {...defaultProps} />);

    // Open dialog
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText("Regenerate Response")).toBeInTheDocument();
    });

    // Select "friendly" tone
    fireEvent.click(screen.getByText("More Friendly"));

    // Click Regenerate in dialog
    const dialogButtons = screen.getAllByRole("button", { name: /^regenerate$/i });
    const confirmBtn = dialogButtons[dialogButtons.length - 1]; // Last one is the dialog confirm
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(defaultProps.onRegenerate).toHaveBeenCalledWith("friendly");
    });
  });
});
