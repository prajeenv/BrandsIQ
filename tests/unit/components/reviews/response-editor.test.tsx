import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ResponseEditor } from "@/components/reviews/ResponseEditor";
import { VALIDATION_LIMITS } from "@/lib/constants";

// Importing the live constant keeps these tests immune to future cap changes
// (e.g. the iter 2 raise from 500 → 2000) — they assert behaviour, not numbers.
const MAX = VALIDATION_LIMITS.RESPONSE_TEXT_MAX;

describe("ResponseEditor", () => {
  const defaultProps = {
    initialText: "Hello world",
    onSave: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders textarea with initial text", () => {
    render(<ResponseEditor {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Edit your response...");
    expect(textarea).toHaveValue("Hello world");
  });

  it("shows character count using the current max limit", () => {
    render(<ResponseEditor {...defaultProps} />);

    expect(screen.getByText(/11/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${MAX} characters`))).toBeInTheDocument();
  });

  it("disables Save button when text is unchanged", () => {
    render(<ResponseEditor {...defaultProps} />);

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    expect(saveBtn).toBeDisabled();
  });

  it("enables Save button when text changes", () => {
    render(<ResponseEditor {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Edit your response...");
    fireEvent.change(textarea, { target: { value: "Updated text" } });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    expect(saveBtn).not.toBeDisabled();
  });

  it("disables Save button when text exceeds max limit", () => {
    render(<ResponseEditor {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Edit your response...");
    fireEvent.change(textarea, { target: { value: "A".repeat(MAX + 1) } });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    expect(saveBtn).toBeDisabled();
  });

  it("disables Save button when text is empty", () => {
    render(<ResponseEditor {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Edit your response...");
    fireEvent.change(textarea, { target: { value: "   " } });

    const saveBtn = screen.getByRole("button", { name: /save changes/i });
    expect(saveBtn).toBeDisabled();
  });

  it("calls onCancel when Cancel button is clicked", () => {
    render(<ResponseEditor {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it("shows over-limit warning text", () => {
    render(<ResponseEditor {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Edit your response...");
    fireEvent.change(textarea, { target: { value: "A".repeat(MAX + 10) } });

    expect(screen.getByText(/10 over limit/)).toBeInTheDocument();
  });

  it("shows keyboard shortcut hint text", () => {
    render(<ResponseEditor {...defaultProps} />);

    expect(screen.getByText(/ctrl\+enter to save/i)).toBeInTheDocument();
  });
});
