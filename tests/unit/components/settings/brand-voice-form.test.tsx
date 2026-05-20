import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/settings/brand-voice",
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { BrandVoiceForm } from "@/components/settings/BrandVoiceForm";

// V2 brand voice shape (iter 6). The form now sends/consumes this directly —
// no more legacy bridge.
const mockBrandVoice = {
  id: "bv_1",
  tone: "friendly_professional",
  keyPhrases: ["Thank you", "We appreciate your feedback"],
  styleGuidelines: ["Be genuine and empathetic"],
  sampleResponses: [],
  acknowledgeNamedStaff: true,
  acknowledgeOccasions: true,
  salutationPattern: "Dear {firstName},",
  signoffLines: "Warmest regards,\nThe Team",
  negativeReviewEmailEnabled: false,
  negativeReviewFraming: "investigation",
  negativeReviewFramingCustom: null,
  replyToEmail: null,
};

describe("BrandVoiceForm (V2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("shows loading spinner while fetching brand voice", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<BrandVoiceForm />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("renders all four V2 sections after loading", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Brand voice")).toBeInTheDocument();
    });

    // The four V2 section titles from spec §3.
    expect(screen.getByText("Voice")).toBeInTheDocument();
    expect(screen.getByText("Examples")).toBeInTheDocument();
    expect(screen.getByText("Personalization")).toBeInTheDocument();
    // CardTitle uses an HTML entity for the &amp; — match the visible glyph.
    expect(screen.getByText(/Contact .* sign-off/i)).toBeInTheDocument();
  });

  it("does NOT render a Formality slider (iter 6 dropped the field)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Brand voice")).toBeInTheDocument();
    });

    expect(screen.queryByText(/formality/i)).not.toBeInTheDocument();
  });

  it("renders the four V2 tone preset labels", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Warm & casual")).toBeInTheDocument();
    });

    expect(screen.getByText("Friendly & professional")).toBeInTheDocument();
    expect(screen.getByText("Polished & formal")).toBeInTheDocument();
    expect(screen.getByText("Empathetic & attentive")).toBeInTheDocument();
  });

  it("renders the Personalization toggles", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(
        screen.getByText(/acknowledge staff named in the review/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/acknowledge special occasions/i)).toBeInTheDocument();
  });

  it("renders the Contact & sign-off salutation and sign-off fields", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/salutation/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/^sign-off$/i)).toBeInTheDocument();
  });

  it("renders the negative-review email invitation toggle (off by default)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(
        screen.getByText(/invite customers to contact you via email/i),
      ).toBeInTheDocument();
    });

    // The framing radio + reply-to email block are gated behind the toggle.
    // With the default-off state, they should not appear.
    expect(screen.queryByText(/how should our ai frame the invitation/i)).not.toBeInTheDocument();
  });

  it("reveals the framing radio + reply-to email when the toggle is on", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { brandVoice: { ...mockBrandVoice, negativeReviewEmailEnabled: true } },
        }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText(/how should our ai frame the invitation/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/reply-to email/i)).toBeInTheDocument();
  });

  it("shows auto-save status indicator (Saved by default after load)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("renders Reset to defaults button", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reset to defaults/i })).toBeInTheDocument();
    });
  });

  it("shows error toast on fetch failure", async () => {
    const { toast } = await import("sonner");

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Network error"));

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load brand voice settings");
    });
  });

  it("fetches brand voice from /api/brand-voice on mount", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/brand-voice");
    });
  });

  it("renders the iter-6 page header copy", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(
        screen.getByText(/teach our ai how to write responses that sound like you/i),
      ).toBeInTheDocument();
    });
  });
});
