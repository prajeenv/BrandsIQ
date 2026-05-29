import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ToneModifier } from "@/components/reviews/ToneModifier";

// 5/25 simplification — the per-regeneration tone selector was removed.
// `onRegenerate` signature is now just `(_payload: { additionalInstructions?: string }) => Promise<void>`.
// Brand voice tone applies as configured; users override on a per-
// regen basis via the Additional Instructions textarea.
describe("ToneModifier", () => {
  const defaultProps = {
    onRegenerate: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
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

  it("opens dialog with the Additional Instructions textarea + Regenerate footer", async () => {
    render(<ToneModifier {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText("Regenerate response")).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/additional instructions/i)).toBeInTheDocument();
  });

  // 5/25 simplification — the four V2 tone preset cards are gone from the
  // dialog entirely. The brand voice tone applies as configured; users
  // override on a per-regen basis via free-text in the Additional
  // Instructions field.
  it("no longer renders the four V2 tone preset cards", async () => {
    render(<ToneModifier {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText("Regenerate response")).toBeInTheDocument();
    });

    expect(screen.queryByText("Warm & casual")).not.toBeInTheDocument();
    expect(screen.queryByText("Friendly & professional")).not.toBeInTheDocument();
    expect(screen.queryByText("Polished & formal")).not.toBeInTheDocument();
    expect(screen.queryByText("Empathetic & attentive")).not.toBeInTheDocument();
  });

  it("no longer renders a tone radiogroup or any radio inputs", async () => {
    render(<ToneModifier {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText("Regenerate response")).toBeInTheDocument();
    });

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("does not surface the deprecated 'Apologetic' option", async () => {
    render(<ToneModifier {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText("Regenerate response")).toBeInTheDocument();
    });

    expect(screen.queryByText(/apologetic/i)).not.toBeInTheDocument();
  });

  it("renders the Additional instructions textarea with the 500-char cap", async () => {
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

  it("renders the trimmed one-line dialog description", async () => {
    render(<ToneModifier {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText(/apply just for this regeneration\.?/i)).toBeInTheDocument();
    });

    // The pre-iter-6-follow-up wordy description is gone.
    expect(screen.queryByText(/pick a different tone, add specific instructions/i)).not.toBeInTheDocument();
  });

  // 5/26 — UX honesty note. Users intuitively read "regenerate" as
  // "iterate on top of the current response", but every regen runs as a
  // fresh composition against the original review. Earlier additional
  // instructions are not carried forward. Without this note, users who
  // fix one thing in regen N and a different thing in regen N+1 see
  // the first fix silently undone.
  it("renders the independence-clarifying note in the dialog header", async () => {
    render(<ToneModifier {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText("Regenerate response")).toBeInTheDocument();
    });

    // Match across whitespace-normalised text — the copy is wrapped
    // across multiple lines in the JSX for readability.
    expect(
      screen.getByText((_content, element) => {
        const text = element?.textContent?.replace(/\s+/g, " ").trim() ?? "";
        return text ===
          "Each regeneration runs independently on the original review. Earlier instructions from previous regens are not carried forward.";
      }),
    ).toBeInTheDocument();
  });

  it("autofocuses the Additional instructions textarea when the dialog opens", async () => {
    render(<ToneModifier {...defaultProps} />);
    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/additional instructions/i)).toBeInTheDocument();
    });

    // Radix's default focus would land on the first focusable element
    // (Close ×). The dialog overrides onOpenAutoFocus to put focus in
    // the textarea — now the only input on the dialog.
    expect(screen.getByLabelText(/additional instructions/i)).toHaveFocus();
  });

  it("calls onRegenerate with an additionalInstructions-only payload (no tone field)", async () => {
    const onRegenerate = vi.fn().mockResolvedValue(undefined);
    render(<ToneModifier {...defaultProps} onRegenerate={onRegenerate} />);

    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByText("Regenerate response")).toBeInTheDocument();
    });

    const dialogButtons = screen.getAllByRole("button", { name: /^regenerate$/i });
    const confirmBtn = dialogButtons[dialogButtons.length - 1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onRegenerate).toHaveBeenCalledWith({
        additionalInstructions: undefined,
      });
    });

    // The payload must NOT contain a tone field — the tone is the brand
    // voice's configured tone, applied server-side, not a per-regen choice.
    const callArgs = onRegenerate.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty("tone");
  });

  it("forwards additionalInstructions in the payload when the user types into the textarea", async () => {
    const onRegenerate = vi.fn().mockResolvedValue(undefined);
    render(<ToneModifier {...defaultProps} onRegenerate={onRegenerate} />);

    fireEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/additional instructions/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/additional instructions/i), {
      target: { value: "Mention our loyalty program." },
    });

    const dialogButtons = screen.getAllByRole("button", { name: /^regenerate$/i });
    const confirmBtn = dialogButtons[dialogButtons.length - 1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onRegenerate).toHaveBeenCalledWith({
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
      expect(onRegenerate).toHaveBeenCalledWith({
        additionalInstructions: undefined,
      });
    });
  });
});
