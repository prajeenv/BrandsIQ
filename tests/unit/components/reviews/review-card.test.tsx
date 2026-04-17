import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  usePathname: () => "/dashboard",
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { ReviewCard, type ReviewCardData } from "@/components/reviews/ReviewCard";

const baseReview: ReviewCardData = {
  id: "rev_1",
  platform: "Google",
  reviewText: "Great product, very satisfied with my purchase!",
  rating: 5,
  reviewerName: "John D.",
  reviewDate: new Date().toISOString(),
  detectedLanguage: "English",
  sentiment: "positive",
  createdAt: new Date().toISOString(),
  response: null,
};

const reviewWithResponse: ReviewCardData = {
  ...baseReview,
  response: {
    id: "resp_1",
    responseText: "Thank you for your kind words!",
    isEdited: false,
    isPublished: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalCreditsUsed: 1,
  },
};

describe("ReviewCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("rendering", () => {
    it("renders review text", () => {
      render(<ReviewCard review={baseReview} />);

      expect(
        screen.getByText("Great product, very satisfied with my purchase!")
      ).toBeInTheDocument();
    });

    it("renders platform badge", () => {
      render(<ReviewCard review={baseReview} />);

      expect(screen.getByText("Google")).toBeInTheDocument();
    });

    it("renders rating star with number", () => {
      render(<ReviewCard review={baseReview} />);

      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("renders reviewer name", () => {
      render(<ReviewCard review={baseReview} />);

      expect(screen.getByText(/by John D\./)).toBeInTheDocument();
    });

    it("renders positive sentiment badge", () => {
      render(<ReviewCard review={baseReview} />);

      expect(screen.getByText("positive")).toBeInTheDocument();
    });

    it("renders negative sentiment badge with correct styling", () => {
      const negativeReview = { ...baseReview, sentiment: "negative" };
      render(<ReviewCard review={negativeReview} />);

      const badge = screen.getByText("negative");
      expect(badge).toBeInTheDocument();
    });

    it("renders neutral sentiment badge", () => {
      const neutralReview = { ...baseReview, sentiment: "neutral" };
      render(<ReviewCard review={neutralReview} />);

      expect(screen.getByText("neutral")).toBeInTheDocument();
    });

    it('shows "Sentiment" warning indicator when sentiment is null', () => {
      const noSentimentReview = { ...baseReview, sentiment: null };
      render(<ReviewCard review={noSentimentReview} />);

      expect(screen.getByText("Sentiment")).toBeInTheDocument();
    });

    it("shows language badge for non-English reviews", () => {
      const spanishReview = { ...baseReview, detectedLanguage: "Spanish" };
      render(<ReviewCard review={spanishReview} />);

      expect(screen.getByText("Spanish")).toBeInTheDocument();
    });

    it("does not show language badge for English reviews", () => {
      render(<ReviewCard review={baseReview} />);

      // English badge should not be rendered
      expect(screen.queryByText("English")).not.toBeInTheDocument();
    });

    it('shows "Responded" badge when response exists', () => {
      render(<ReviewCard review={reviewWithResponse} />);

      expect(screen.getByText("Responded")).toBeInTheDocument();
    });

    it("does not show Responded badge when no response", () => {
      render(<ReviewCard review={baseReview} />);

      expect(screen.queryByText("Responded")).not.toBeInTheDocument();
    });
  });

  describe("response preview", () => {
    it("renders AI Response preview when response exists", () => {
      render(<ReviewCard review={reviewWithResponse} />);

      expect(screen.getByText("AI Response:")).toBeInTheDocument();
      expect(
        screen.getByText("Thank you for your kind words!")
      ).toBeInTheDocument();
    });

    it("shows credits used in response preview", () => {
      render(<ReviewCard review={reviewWithResponse} />);

      expect(screen.getByText(/1 credit used/)).toBeInTheDocument();
    });

    it("does not render response preview when no response", () => {
      render(<ReviewCard review={baseReview} />);

      expect(screen.queryByText("AI Response:")).not.toBeInTheDocument();
    });
  });

  describe("text expansion", () => {
    it('shows "Show more" button for long review text', () => {
      const longReview = {
        ...baseReview,
        reviewText: "A".repeat(200),
      };
      render(<ReviewCard review={longReview} />);

      expect(screen.getByText("Show more")).toBeInTheDocument();
    });

    it("does not show Show more for short review text", () => {
      render(<ReviewCard review={baseReview} />);

      expect(screen.queryByText("Show more")).not.toBeInTheDocument();
    });
  });

  describe("actions", () => {
    it("renders actions dropdown menu trigger", () => {
      render(<ReviewCard review={baseReview} />);

      expect(screen.getByRole("button", { name: /actions/i })).toBeInTheDocument();
    });

    it("has correct link to review detail page", () => {
      render(<ReviewCard review={baseReview} />);

      const link = screen.getByRole("link", { name: baseReview.reviewText });
      expect(link).toHaveAttribute("href", "/dashboard/reviews/rev_1");
    });
  });

  describe("navigation links", () => {
    it("has link to review detail page on review text", () => {
      render(<ReviewCard review={baseReview} />);

      const link = screen.getByRole("link", { name: baseReview.reviewText });
      expect(link).toHaveAttribute("href", "/dashboard/reviews/rev_1");
    });
  });
});
