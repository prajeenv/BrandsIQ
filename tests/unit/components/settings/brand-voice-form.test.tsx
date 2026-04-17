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

const mockBrandVoice = {
  id: "bv_1",
  tone: "professional",
  formality: 3,
  keyPhrases: ["Thank you", "We appreciate your feedback"],
  styleNotes: '["Be genuine and empathetic"]',
  sampleResponses: [],
};

describe("BrandVoiceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("shows loading spinner while fetching brand voice", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<BrandVoiceForm />);

    // Loading spinner should be visible (the animate-spin class is on the spinner)
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("renders form sections after loading", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { brandVoice: mockBrandVoice },
        }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Brand Voice Configuration")).toBeInTheDocument();
    });

    expect(screen.getByText("Response Tone")).toBeInTheDocument();
    expect(screen.getByText("Formality Level")).toBeInTheDocument();
    expect(screen.getByText("Key Phrases")).toBeInTheDocument();
    expect(screen.getByText("Style Guidelines")).toBeInTheDocument();
    expect(screen.getByText("Sample Responses")).toBeInTheDocument();
  });

  it("shows auto-save status indicator", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { brandVoice: mockBrandVoice },
        }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("renders Reset to Defaults button", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { brandVoice: mockBrandVoice },
        }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /reset to defaults/i })
      ).toBeInTheDocument();
    });
  });

  it("shows auto-save enabled indicator", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { brandVoice: mockBrandVoice },
        }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(screen.getByText("Auto-save enabled")).toBeInTheDocument();
    });
  });

  it("shows error toast on fetch failure", async () => {
    const { toast } = await import("sonner");

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to load brand voice settings"
      );
    });
  });

  it("fetches brand voice from /api/brand-voice on mount", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { brandVoice: mockBrandVoice },
        }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/brand-voice");
    });
  });

  it("renders description text about auto-saving", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { brandVoice: mockBrandVoice },
        }),
    });

    render(<BrandVoiceForm />);

    await waitFor(() => {
      expect(
        screen.getByText(/changes are saved automatically/i)
      ).toBeInTheDocument();
    });
  });
});
