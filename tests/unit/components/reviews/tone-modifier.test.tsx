import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ToneModifier } from "@/components/reviews/ToneModifier";

// Iter 6: tone presets now align with BRAND_VOICE_TONES_V2 (spec §8.1).
// onRegenerate signature changed from `(_tone: string) => Promise<void>` to
// `(_payload: { tone, additionalInstructions? }) => Promise<void>`.
describe("ToneModifier", () => {
  const defaultProps = {
    onRegenerate: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
    currentTone: "friendly_professional",
    creditsNeeded: 1,
  };

  it("renders Regenerate trigger button", () => {
    render(<ToneModifier {...defaultProps} />);
    expect(screen.getByRole("button", { name: /regenerate/i })).toBeInTheDocument();
  });

  it("disables trigger when isLoading", () => {
    render(<ToneModifier {...defaultProps} isLoading={true} />);
    expect(screen.getByRole("button", { name: /regenerating/i })).toBeDisabled();
  });

  it("disables trigger when disabled prop is true", () => {
    render(<ToneModifier {...defaultProps} disabled={true} />);
    expect(screen.getByRole("button", { name: /regenerate/i })).toBeDisabled();
  });

  it("opens dialog and shows the four V2 tone presets", async () => {
    render(<ToneModifier {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText("Regenerate response")).toBeInTheDocument();
      expect(screen.getByText("Warm & casual")).toBeInTheDocument();
      expect(screen.getByText("Friendly & professional")).toBeInTheDocument();
      expect(screen.getByText("Polished & formal")).toBeInTheDocument();
      expect(screen.getByText("Empathetic & attentive")).toBeInTheDocument();
    });
  });

  it("does not surface the deprecated 'Apologetic' option (spec §8.1)", async () => {
    render(<ToneModifier {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText("Regenerate response")).toBeInTheDocument();
    });

    expect(screen.queryByText(/apologetic/i)).not.toBeInTheDocument();
  });

  it("renders the tone options as a 2-col grid at sm+ (1 col on mobile)", async () => {
    render(<ToneModifier {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText("Warm & casual")).toBeInTheDocument();
    });

    const radioGroup = screen.getByRole("radiogroup");
    // Layout classes are applied to the RadioGroup wrapper. We assert the
    // CSS classes are present rather than computed styles because jsdom
    // doesn't run a real layout engine — class presence is the meaningful
    // signal here.
    expect(radioGroup.className).toContain("grid");
    expect(radioGroup.className).toContain("grid-cols-1");
    expect(radioGroup.className).toContain("sm:grid-cols-2");
  });

  it("constrains the dialog to 90vh and makes the body scrollable so header/footer stay visible", async () => {
    render(<ToneModifier {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const dialog = screen.getByRole("dialog");
    // The dialog itself is capped at 90vh and laid out as a flex column so
    // the header + footer stay anchored while the body scrolls.
    expect(dialog.className).toContain("max-h-[90vh]");
    expect(dialog.className).toContain("flex");
    expect(dialog.className).toContain("flex-col");

    // The scrollable body region carries flex-1 + overflow-y-auto.
    const scrollable = dialog.querySelector(".overflow-y-auto");
    expect(scrollable).not.toBeNull();
    expect(scrollable!.className).toContain("flex-1");
  });

  it("renders the new Additional instructions textarea with the 500-char cap", async () => {
    render(<ToneModifier {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/additional instructions/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/0 \/ 500 characters/i)).toBeInTheDocument();
  });

  it("shows credit cost in dialog footer", async () => {
    render(<ToneModifier {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText(/this will use 1 credit/i)).toBeInTheDocument();
    });
  });

  it("shows current tone in dialog description", async () => {
    render(<ToneModifier {...defaultProps} currentTone="warm_casual" />);
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText(/current tone:/i)).toBeInTheDocument();
      expect(screen.getByText("warm_casual")).toBeInTheDocument();
    });
  });

  it("calls onRegenerate with the selected V2 tone key in a payload object", async () => {
    render(<ToneModifier {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText("Regenerate response")).toBeInTheDocument();
    });

    // Pick "Warm & casual" via its label.
    fireEvent.click(screen.getByText("Warm & casual"));

    const dialogButtons = screen.getAllByRole("button", { name: /^regenerate$/i });
    const confirmBtn = dialogButtons[dialogButtons.length - 1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(defaultProps.onRegenerate).toHaveBeenCalledWith({
        tone: "warm_casual",
        additionalInstructions: undefined,
      });
    });
  });

  it("forwards additionalInstructions in the payload when the user types into the textarea", async () => {
    const onRegenerate = vi.fn().mockResolvedValue(undefined);
    render(<ToneModifier {...defaultProps} onRegenerate={onRegenerate} />);

    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/additional instructions/i)).toBeInTheDocument();
    });

    // Default selection is `friendly_professional` (matches the form default).
    fireEvent.change(screen.getByLabelText(/additional instructions/i), {
      target: { value: "Mention our loyalty program." },
    });

    const dialogButtons = screen.getAllByRole("button", { name: /^regenerate$/i });
    const confirmBtn = dialogButtons[dialogButtons.length - 1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onRegenerate).toHaveBeenCalledWith({
        tone: "friendly_professional",
        additionalInstructions: "Mention our loyalty program.",
      });
    });
  });

  it("does not include additionalInstructions when the textarea is empty/whitespace", async () => {
    const onRegenerate = vi.fn().mockResolvedValue(undefined);
    render(<ToneModifier {...defaultProps} onRegenerate={onRegenerate} />);

    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/additional instructions/i)).toBeInTheDocument();
    });

    // Leave whitespace-only in the textarea — the trim happens in handleRegenerate.
    fireEvent.change(screen.getByLabelText(/additional instructions/i), {
      target: { value: "   \n\n   " },
    });

    const dialogButtons = screen.getAllByRole("button", { name: /^regenerate$/i });
    const confirmBtn = dialogButtons[dialogButtons.length - 1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onRegenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalInstructions: undefined,
        }),
      );
    });
  });
});
