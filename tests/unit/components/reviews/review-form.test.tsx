import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();
const mockBack = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: mockBack, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard",
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { ReviewForm } from "@/components/reviews/ReviewForm";

describe("ReviewForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("create mode", () => {
    it("renders with 'Add New Review' title in create mode", () => {
      render(<ReviewForm />);

      expect(screen.getByText("Add New Review")).toBeInTheDocument();
    });

    it("renders platform selector", () => {
      render(<ReviewForm />);

      expect(screen.getByText("Platform *")).toBeInTheDocument();
    });

    it("renders review text textarea", () => {
      render(<ReviewForm />);

      expect(screen.getByText("Review Text *")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(
          "Paste or type the customer review here..."
        )
      ).toBeInTheDocument();
    });

    it("renders rating stars (1-5)", () => {
      render(<ReviewForm />);

      expect(screen.getByText("Rating (optional)")).toBeInTheDocument();
      // 5 star buttons rendered
      const starButtons = screen.getAllByRole("button").filter((btn) => {
        // Star buttons are type="button" within the rating section
        return btn.closest(".flex.items-center.gap-1");
      });
      expect(starButtons.length).toBe(5);
    });

    it("renders reviewer name input", () => {
      render(<ReviewForm />);

      expect(screen.getByText("Reviewer Name (optional)")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("e.g., John D.")).toBeInTheDocument();
    });

    it("renders review date input", () => {
      render(<ReviewForm />);

      expect(screen.getByText("Review Date (optional)")).toBeInTheDocument();
    });

    it("renders Add Review submit button", () => {
      render(<ReviewForm />);

      expect(
        screen.getByRole("button", { name: "Add Review" })
      ).toBeInTheDocument();
    });

    it("renders Cancel button", () => {
      render(<ReviewForm />);

      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument();
    });

    it("calls router.back() on Cancel click", () => {
      render(<ReviewForm />);
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockBack).toHaveBeenCalled();
    });

    it("shows character count starting at 0", () => {
      render(<ReviewForm />);

      expect(screen.getByText("0/2000")).toBeInTheDocument();
    });
  });

  describe("edit mode", () => {
    const initialData = {
      id: "rev_1",
      platform: "Google",
      reviewText: "Great product!",
      rating: 4,
      reviewerName: "Jane D.",
      reviewDate: "2026-01-15",
      detectedLanguage: "English",
    };

    it("renders with 'Edit Review' title in edit mode", () => {
      render(<ReviewForm initialData={initialData} mode="edit" />);

      expect(screen.getByText("Edit Review")).toBeInTheDocument();
    });

    it("renders Save Changes button in edit mode", () => {
      render(<ReviewForm initialData={initialData} mode="edit" />);

      expect(
        screen.getByRole("button", { name: "Save Changes" })
      ).toBeInTheDocument();
    });

    it("pre-fills review text from initialData", () => {
      render(<ReviewForm initialData={initialData} mode="edit" />);

      const textarea = screen.getByPlaceholderText(
        "Paste or type the customer review here..."
      );
      expect(textarea).toHaveValue("Great product!");
    });
  });

  describe("language detection", () => {
    it('shows "Detected: English" indicator', async () => {
      render(<ReviewForm />);

      // Type text to trigger detection
      const textarea = screen.getByPlaceholderText(
        "Paste or type the customer review here..."
      );
      fireEvent.change(textarea, {
        target: { value: "This is a fairly long English review text to trigger language detection with high confidence" },
      });

      await waitFor(
        () => {
          expect(screen.getByText(/detected:/i)).toBeInTheDocument();
        },
        { timeout: 1500 }
      );
    });
  });

  describe("form submission", () => {
    it("calls POST /api/reviews on create submit", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            data: { review: { id: "rev_new" } },
          }),
      });

      render(<ReviewForm />);

      // Fill required fields
      const textarea = screen.getByPlaceholderText(
        "Paste or type the customer review here..."
      );
      fireEvent.change(textarea, {
        target: { value: "This is a great product that I absolutely love!" },
      });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: "Add Review" }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/reviews",
          expect.objectContaining({ method: "POST" })
        );
      });
    });

    it("calls PUT /api/reviews/:id on edit submit", async () => {
      const initialData = {
        id: "rev_1",
        platform: "Google",
        reviewText: "Updated review text that is long enough to be valid",
        rating: 4,
        reviewerName: "Jane",
        reviewDate: "2026-01-15",
        detectedLanguage: "English",
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            data: { review: { id: "rev_1" } },
          }),
      });

      render(<ReviewForm initialData={initialData} mode="edit" />);

      fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/reviews/rev_1",
          expect.objectContaining({ method: "PUT" })
        );
      });
    });
  });
});
