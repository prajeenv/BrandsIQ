import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks
const { mockPrisma, mockSession, mockNullSession } = vi.hoisted(() => {
  const mockPrisma = {
    sentimentUsage: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    review: {
      groupBy: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  };

  const mockSession = {
    user: { id: "user_1", email: "test@example.com", name: "Test", tier: "FREE" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockNullSession = null;

  return { mockPrisma, mockSession, mockNullSession };
});

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET } from "@/app/api/sentiment/usage/route";
import { auth } from "@/lib/auth";
import { parseResponse } from "../../../helpers/api-test-helpers";
import { NextRequest } from "next/server";

function createNextRequest(path: string, params?: Record<string, string>): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url);
}

describe("GET /api/sentiment/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as any);
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(mockNullSession as any);

    const request = createNextRequest("/api/sentiment/usage");
    const response = await GET(request);
    const result = await parseResponse<any>(response);

    expect(result.status).toBe(401);
    expect(result.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns sentiment usage history with pagination", async () => {
    const mockRecords = [
      {
        id: "su_1",
        userId: "user_1",
        reviewId: "rev_1",
        sentiment: "positive",
        details: JSON.stringify({ reviewId: "rev_1", platform: "Google", rating: 5 }),
        createdAt: new Date(),
        review: {
          id: "rev_1",
          platform: "Google",
          rating: 5,
          reviewText: "Great product, very satisfied!",
        },
      },
    ];

    mockPrisma.sentimentUsage.count.mockResolvedValue(1);
    mockPrisma.sentimentUsage.findMany.mockResolvedValue(mockRecords);
    mockPrisma.review.groupBy.mockResolvedValue([
      { sentiment: "positive", _count: { sentiment: 5 } },
      { sentiment: "negative", _count: { sentiment: 2 } },
      { sentiment: "neutral", _count: { sentiment: 3 } },
    ]);
    mockPrisma.user.findUnique.mockResolvedValue({
      tier: "FREE",
      sentimentCredits: 30,
      sentimentResetDate: new Date("2026-03-01"),
    });

    const request = createNextRequest("/api/sentiment/usage");
    const response = await GET(request);
    const result = await parseResponse<any>(response);

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data.usage).toHaveLength(1);
    expect(result.body.data.usage[0].sentiment).toBe("positive");
    expect(result.body.data.usage[0].platform).toBe("Google");
    expect(result.body.data.pagination.page).toBe(1);
    expect(result.body.data.pagination.totalCount).toBe(1);
  });

  it("returns sentiment distribution percentages", async () => {
    mockPrisma.sentimentUsage.count.mockResolvedValue(0);
    mockPrisma.sentimentUsage.findMany.mockResolvedValue([]);
    mockPrisma.review.groupBy.mockResolvedValue([
      { sentiment: "positive", _count: { sentiment: 6 } },
      { sentiment: "negative", _count: { sentiment: 2 } },
      { sentiment: "neutral", _count: { sentiment: 2 } },
    ]);
    mockPrisma.user.findUnique.mockResolvedValue({
      tier: "FREE",
      sentimentCredits: 25,
      sentimentResetDate: new Date("2026-03-01"),
    });

    const request = createNextRequest("/api/sentiment/usage");
    const response = await GET(request);
    const result = await parseResponse<any>(response);

    expect(result.body.data.distribution.positive).toBe(60);
    expect(result.body.data.distribution.negative).toBe(20);
    expect(result.body.data.distribution.neutral).toBe(20);
    expect(result.body.data.distribution.total).toBe(10);
  });

  it("applies sentiment filter", async () => {
    mockPrisma.sentimentUsage.count.mockResolvedValue(0);
    mockPrisma.sentimentUsage.findMany.mockResolvedValue([]);
    mockPrisma.review.groupBy.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue({
      tier: "FREE",
      sentimentCredits: 35,
      sentimentResetDate: new Date("2026-03-01"),
    });

    const request = createNextRequest("/api/sentiment/usage", { sentiment: "positive" });
    const response = await GET(request);
    const result = await parseResponse<any>(response);

    expect(result.status).toBe(200);
    // Verify sentiment filter was passed to count and findMany
    expect(mockPrisma.sentimentUsage.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sentiment: "positive",
        }),
      })
    );
  });

  it("applies date range filters", async () => {
    mockPrisma.sentimentUsage.count.mockResolvedValue(0);
    mockPrisma.sentimentUsage.findMany.mockResolvedValue([]);
    mockPrisma.review.groupBy.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue({
      tier: "FREE",
      sentimentCredits: 35,
      sentimentResetDate: new Date("2026-03-01"),
    });

    const request = createNextRequest("/api/sentiment/usage", {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
    const response = await GET(request);
    const result = await parseResponse<any>(response);

    expect(result.status).toBe(200);
    expect(mockPrisma.sentimentUsage.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });

  it("returns quota information from user tier", async () => {
    mockPrisma.sentimentUsage.count.mockResolvedValue(0);
    mockPrisma.sentimentUsage.findMany.mockResolvedValue([]);
    mockPrisma.review.groupBy.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue({
      tier: "FREE",
      sentimentCredits: 30,
      sentimentResetDate: new Date("2026-03-01"),
    });

    const request = createNextRequest("/api/sentiment/usage");
    const response = await GET(request);
    const result = await parseResponse<any>(response);

    expect(result.body.data.quota.remaining).toBe(30);
    expect(result.body.data.quota.total).toBe(35); // FREE tier total
    expect(result.body.data.quota.used).toBe(5); // 35 - 30
  });

  it("falls back to details JSON when review is deleted", async () => {
    const mockRecords = [
      {
        id: "su_2",
        userId: "user_1",
        reviewId: null, // Review was deleted
        sentiment: "negative",
        details: JSON.stringify({
          reviewId: "rev_deleted",
          platform: "Amazon",
          rating: 2,
        }),
        createdAt: new Date(),
        review: null, // FK is null
      },
    ];

    mockPrisma.sentimentUsage.count.mockResolvedValue(1);
    mockPrisma.sentimentUsage.findMany.mockResolvedValue(mockRecords);
    mockPrisma.review.groupBy.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue({
      tier: "FREE",
      sentimentCredits: 35,
      sentimentResetDate: new Date("2026-03-01"),
    });

    const request = createNextRequest("/api/sentiment/usage");
    const response = await GET(request);
    const result = await parseResponse<any>(response);

    expect(result.body.data.usage[0].reviewId).toBe("rev_deleted");
    expect(result.body.data.usage[0].platform).toBe("Amazon");
    expect(result.body.data.usage[0].rating).toBe(2);
    expect(result.body.data.usage[0].isDeleted).toBe(true);
    expect(result.body.data.usage[0].preview).toBeNull();
  });

  it("respects pagination params", async () => {
    mockPrisma.sentimentUsage.count.mockResolvedValue(50);
    mockPrisma.sentimentUsage.findMany.mockResolvedValue([]);
    mockPrisma.review.groupBy.mockResolvedValue([]);
    mockPrisma.user.findUnique.mockResolvedValue({
      tier: "FREE",
      sentimentCredits: 35,
      sentimentResetDate: new Date("2026-03-01"),
    });

    const request = createNextRequest("/api/sentiment/usage", { page: "2", limit: "10" });
    const response = await GET(request);
    const result = await parseResponse<any>(response);

    expect(result.body.data.pagination.page).toBe(2);
    expect(result.body.data.pagination.limit).toBe(10);
    expect(result.body.data.pagination.totalPages).toBe(5);
    expect(result.body.data.pagination.hasNextPage).toBe(true);
    expect(result.body.data.pagination.hasPrevPage).toBe(true);

    // Verify skip/take used correctly
    expect(mockPrisma.sentimentUsage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    );
  });
});
