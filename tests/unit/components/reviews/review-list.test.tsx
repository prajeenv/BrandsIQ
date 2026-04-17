import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPush = vi.fn();

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/reviews",
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { ReviewList } from "@/components/reviews/ReviewList";

const mockReviews = [
  {
    id: "rev_1",
    platform: "Google",
    reviewText: "Great product!",
    rating: 5,
    reviewerName: "John",
    reviewDate: new Date().toISOString(),
    detectedLanguage: "English",
    sentiment: "positive",
    createdAt: new Date().toISOString(),
    response: null,
  },
  {
    id: "rev_2",
    platform: "Amazon",
    reviewText: "Terrible experience.",
    rating: 1,
    reviewerName: "Jane",
    reviewDate: new Date().toISOString(),
    detectedLanguage: "English",
    sentiment: "negative",
    createdAt: new Date().toISOString(),
    response: null,
  },
];

describe("ReviewList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("shows loading skeletons while fetching", () => {
    // Never resolve the fetch — keeps component in loading state
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    render(<ReviewList />);

    // Skeleton elements should be visible
    const skeletons = document.querySelectorAll("[class*='animate-pulse'], [data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders reviews after successful fetch", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            reviews: mockReviews,
            pagination: {
              page: 1,
              limit: 10,
              totalCount: 2,
              totalPages: 1,
              hasMore: false,
            },
          },
        }),
    });

    render(<ReviewList />);

    await waitFor(() => {
      expect(screen.getByText("Great product!")).toBeInTheDocument();
      expect(screen.getByText("Terrible experience.")).toBeInTheDocument();
    });
  });

  it("shows empty message when no reviews exist", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            reviews: [],
            pagination: {
              page: 1,
              limit: 10,
              totalCount: 0,
              totalPages: 0,
              hasMore: false,
            },
          },
        }),
    });

    render(<ReviewList />);

    await waitFor(() => {
      expect(
        screen.getByText(/no reviews yet/i)
      ).toBeInTheDocument();
    });
  });

  it("renders platform and sentiment filter dropdowns", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            reviews: mockReviews,
            pagination: { page: 1, limit: 10, totalCount: 2, totalPages: 1, hasMore: false },
          },
        }),
    });

    render(<ReviewList />);

    expect(screen.getByText("Filters:")).toBeInTheDocument();
  });

  it("renders pagination when totalPages > 1", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            reviews: mockReviews,
            pagination: {
              page: 1,
              limit: 10,
              totalCount: 25,
              totalPages: 3,
              hasMore: true,
            },
          },
        }),
    });

    render(<ReviewList />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
    });
  });

  it("does not render pagination when only 1 page", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            reviews: mockReviews,
            pagination: {
              page: 1,
              limit: 10,
              totalCount: 2,
              totalPages: 1,
              hasMore: false,
            },
          },
        }),
    });

    render(<ReviewList />);

    await waitFor(() => {
      expect(screen.getByText("Great product!")).toBeInTheDocument();
    });

    expect(screen.queryByText(/page \d+ of \d+/i)).not.toBeInTheDocument();
  });

  it("fetches reviews with correct query params", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            reviews: [],
            pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 0, hasMore: false },
          },
        }),
    });

    render(<ReviewList />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/reviews?")
      );
    });

    // Verify the fetch URL contains expected params
    const fetchUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(fetchUrl).toContain("page=1");
    expect(fetchUrl).toContain("limit=10");
  });

  it("shows error message on fetch failure", async () => {
    const { toast } = await import("sonner");

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(<ReviewList />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to load reviews");
    });
  });
});
