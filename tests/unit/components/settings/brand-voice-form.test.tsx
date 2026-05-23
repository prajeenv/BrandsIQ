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
    // SectionHeader renders the &-glyph directly (not the HTML entity).
    expect(screen.getByText(/Contact .* sign-off/i)).toBeInTheDocument();
  });

  // Iter-7 hierarchy pass: numbered + descriptor section headers.
  it("renders numbered section headers (1, 2, 3, 4) for visual hierarchy", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Brand voice")).toBeInTheDocument();
    });

    // Each section is prefixed with a large numeral. The numerals are
    // aria-hidden (they're decoration; the title carries the meaning)
    // so we query the DOM directly rather than via getByText.
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("renders the section descriptor inline on the same line as the title", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Brand voice")).toBeInTheDocument();
    });

    // The descriptor lives inside the same h2 as the title, prefixed
    // with an em-dash. Querying by the descriptor text confirms the
    // inline-descriptor rendering pattern is in place for all four
    // sections.
    expect(screen.getByText(/— how we sound/)).toBeInTheDocument();
    expect(screen.getByText(/— what good looks like for us/)).toBeInTheDocument();
    expect(screen.getByText(/— what we acknowledge/)).toBeInTheDocument();
    expect(screen.getByText(/— how we close/)).toBeInTheDocument();
  });

  it("renders the page header as a plain heading (not a Card)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Brand voice")).toBeInTheDocument();
    });

    // Iter-7 hierarchy pass: the page title now lives in an h1 directly
    // on the page surface, not inside a Card. This separates the page-
    // level header from the section-level cards visually.
    const heading = screen.getByRole("heading", { level: 1, name: /brand voice/i });
    expect(heading).toBeInTheDocument();
  });

  // Iter-7 hierarchy pass: Contact & sign-off section grouped into 2 sub-blocks.
  it("renders the Contact & sign-off sub-block eyebrow labels", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Brand voice")).toBeInTheDocument();
    });

    // The section is grouped into two sub-blocks for scannability:
    // "Greeting & closing" (salutation + sign-off) and "Negative-review
    // email" (the toggle + framing + reply-to). The eyebrow labels render
    // as small uppercase text; querying by text is robust against future
    // CSS tweaks.
    expect(screen.getByText("Greeting & closing")).toBeInTheDocument();
    expect(screen.getByText("Negative-review email")).toBeInTheDocument();
  });

  // Inner-contrast pass continued — sections 1 + 2 get the same eyebrow
  // sub-block treatment that section 4 got earlier.
  it("renders the section-1 sub-block eyebrow labels (Tone / Style / Key)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Brand voice")).toBeInTheDocument();
    });

    // Three sub-blocks inside section 1 — each carries an uppercase
    // eyebrow label. The previous flat layout used inline <Label>s with
    // the same text but no eyebrow styling; we assert presence of the
    // text and let the visual treatment ride on the CSS.
    expect(screen.getByText("Tone")).toBeInTheDocument();
    expect(screen.getByText("Style guidelines")).toBeInTheDocument();
    expect(screen.getByText("Key phrases")).toBeInTheDocument();
  });

  it("renders the section-2 sub-block eyebrow label (Sample responses)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Brand voice")).toBeInTheDocument();
    });

    expect(screen.getByText("Sample responses")).toBeInTheDocument();
  });

  // Iter-7 hierarchy pass: APPEND chips now render a leading `+` glyph so
  // users can tell at a glance the chip extends a list rather than
  // replaces a field value.
  it("renders the leading `+` glyph on the starter-idea APPEND chips", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Brand voice")).toBeInTheDocument();
    });

    // The style-guideline + key-phrase starter chips each ship with their
    // own `+` glyph (aria-hidden, inside the button). We can't query by
    // role because `+` is just decoration — but the visible text is in
    // the DOM, so we count it. With 5 style-guideline starters + 5 key-
    // phrase starters there should be 10 `+` glyphs total.
    const plusGlyphs = document.querySelectorAll('[aria-hidden="true"]');
    const plusCount = Array.from(plusGlyphs).filter(
      (el) => el.textContent === "+",
    ).length;
    expect(plusCount).toBeGreaterThanOrEqual(10);
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

  // Incomplete-config feedback: toggle on + email missing surfaces (a) the
  // "Incomplete" pill next to the Negative-review email sub-block and
  // (b) the inline soft-warning at the email field. The earlier
  // section-level banner at the top of Contact & sign-off was removed in
  // the trim pass — three warnings on the same page were too many.
  it("does NOT show a section-level incomplete banner anywhere (trimmed)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            brandVoice: {
              ...mockBrandVoice,
              negativeReviewEmailEnabled: true,
              replyToEmail: null,
            },
          },
        }),
    });

    render(<BrandVoiceForm />);

    // The pill still appears, so we wait for that to confirm the
    // incomplete state is detected before asserting the banner is
    // absent.
    await waitFor(() => {
      expect(screen.getByText(/^incomplete$/i)).toBeInTheDocument();
    });

    expect(
      screen.queryByText(/negative-review email is incomplete/i),
    ).not.toBeInTheDocument();
  });

  it("shows the 'Incomplete' pill next to the Negative-review email sub-block when email is missing", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            brandVoice: {
              ...mockBrandVoice,
              negativeReviewEmailEnabled: true,
              replyToEmail: null,
            },
          },
        }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText(/^incomplete$/i)).toBeInTheDocument();
    });
  });

  it("hides the incomplete signals when toggle is on and a valid email is configured", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            brandVoice: {
              ...mockBrandVoice,
              negativeReviewEmailEnabled: true,
              replyToEmail: "hello@brand.example",
            },
          },
        }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText(/how should our ai frame the invitation/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/^incomplete$/i)).not.toBeInTheDocument();
  });

  // Anchor target for the dashboard banner deep-link. Click "Open brand
  // voice" on the dashboard incomplete-config banner and the user lands
  // on the sub-block directly — `#negative-review-email` is the id we
  // attach to sub-block 2 in `ContactSignoffSection`.
  it("attaches id='negative-review-email' to the Negative-review email sub-block", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { brandVoice: mockBrandVoice } }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Negative-review email")).toBeInTheDocument();
    });

    expect(document.getElementById("negative-review-email")).not.toBeNull();
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
