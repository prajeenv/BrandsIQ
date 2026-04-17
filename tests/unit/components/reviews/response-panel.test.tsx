import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules before importing component
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
  usePathname: () => "/dashboard",
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockRefreshCredits = vi.fn();
vi.mock("@/components/providers/CreditsProvider", () => ({
  useCredits: () => ({
    credits: 10,
    creditsTotal: 15,
    creditsResetDate: "2026-02-15T00:00:00Z",
    refreshCredits: mockRefreshCredits,
  }),
}));

import { ResponsePanel } from "@/components/reviews/ResponsePanel";

const mockResponse = {
  id: "resp_1",
  responseText: "Thank you for your wonderful review!",
  isEdited: false,
  editedAt: null,
  creditsUsed: 1,
  toneUsed: "professional",
  generationModel: "claude-sonnet-4-20250514",
  isPublished: false,
  publishedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  totalCreditsUsed: 2,
  versions: [],
};

const mockEditedResponse = {
  ...mockResponse,
  isEdited: true,
  editedAt: new Date().toISOString(),
  creditsUsed: 0,
};

const mockPublishedResponse = {
  ...mockResponse,
  isPublished: true,
  publishedAt: new Date().toISOString(),
};

describe("ResponsePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe("empty state (no response)", () => {
    it('renders "No response generated yet" when response is null', () => {
      render(<ResponsePanel reviewId="rev_1" response={null} />);

      expect(screen.getByText("No response generated yet.")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /generate response/i })
      ).toBeInTheDocument();
    });

    it("shows credit cost text for generation", () => {
      render(<ResponsePanel reviewId="rev_1" response={null} />);

      expect(screen.getByText(/uses 1 credit/i)).toBeInTheDocument();
    });

    it("calls generate endpoint on button click", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              response: {
                id: "resp_new",
                responseText: "Generated response text",
                toneUsed: "professional",
                creditsUsed: 1,
                generationModel: "claude-sonnet-4-20250514",
                createdAt: new Date().toISOString(),
              },
            },
          }),
      });

      render(<ResponsePanel reviewId="rev_1" response={null} />);
      fireEvent.click(
        screen.getByRole("button", { name: /generate response/i })
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/reviews/rev_1/generate", expect.objectContaining({ method: "POST" }));
      });
    });

    it("shows OutOfCreditsDialog on INSUFFICIENT_CREDITS error", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            error: { code: "INSUFFICIENT_CREDITS", message: "No credits" },
          }),
      });

      render(<ResponsePanel reviewId="rev_1" response={null} />);
      fireEvent.click(screen.getByRole("button", { name: /generate response/i }));

      await waitFor(() => {
        expect(screen.getByText(/you're out of response credits/i)).toBeInTheDocument();
      });
    });
  });

  describe("with existing response", () => {
    it("renders response text", () => {
      render(<ResponsePanel reviewId="rev_1" response={mockResponse} />);

      expect(
        screen.getByText("Thank you for your wonderful review!")
      ).toBeInTheDocument();
    });

    it('shows "Generated" badge for non-edited response', () => {
      render(<ResponsePanel reviewId="rev_1" response={mockResponse} />);

      expect(screen.getByText("Generated")).toBeInTheDocument();
      expect(screen.getByText("professional tone")).toBeInTheDocument();
    });

    it('shows "Edited" badge for edited response', () => {
      render(<ResponsePanel reviewId="rev_1" response={mockEditedResponse} />);

      expect(screen.getByText("Edited")).toBeInTheDocument();
      expect(screen.queryByText("Generated")).not.toBeInTheDocument();
    });

    it('shows "Approved" badge for published response', () => {
      render(<ResponsePanel reviewId="rev_1" response={mockPublishedResponse} />);

      expect(screen.getByText("Approved")).toBeInTheDocument();
    });

    it("shows total credits used badge", () => {
      render(<ResponsePanel reviewId="rev_1" response={mockResponse} />);

      expect(screen.getByText("2 credits used")).toBeInTheDocument();
    });

    it("renders Copy, Edit, Regenerate, and Approve buttons", () => {
      render(<ResponsePanel reviewId="rev_1" response={mockResponse} />);

      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^edit$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /regenerate/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    });

    it("hides Approve button when response is already published", () => {
      render(<ResponsePanel reviewId="rev_1" response={mockPublishedResponse} />);

      expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    });

    it("calls publish endpoint when Approve is clicked", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              response: { publishedAt: new Date().toISOString() },
            },
          }),
      });

      render(<ResponsePanel reviewId="rev_1" response={mockResponse} />);
      fireEvent.click(screen.getByRole("button", { name: /approve/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/reviews/rev_1/publish", expect.objectContaining({ method: "POST" }));
      });
    });
  });

  describe("version history", () => {
    it("does not render version history when versions is empty", () => {
      render(<ResponsePanel reviewId="rev_1" response={mockResponse} />);

      expect(screen.queryByText(/version history/i)).not.toBeInTheDocument();
    });

    it("renders version history section when versions exist", () => {
      const responseWithVersions = {
        ...mockResponse,
        versions: [
          {
            id: "ver_1",
            responseText: "Old response",
            toneUsed: "friendly",
            creditsUsed: 1,
            isEdited: false,
            createdAt: new Date().toISOString(),
            originalCreatedAt: new Date().toISOString(),
          },
        ],
      };

      render(<ResponsePanel reviewId="rev_1" response={responseWithVersions} />);

      expect(screen.getByText(/version history/i)).toBeInTheDocument();
    });
  });
});
