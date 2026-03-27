import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSession = vi.hoisted(() => ({
  user: { id: 'clu1234567890abcdef', email: 'test@example.com', name: 'Test User', tier: 'FREE' },
}));

const mockPrisma = vi.hoisted(() => {
  const m = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
    groupBy: vi.fn(),
  });
  return {
    user: m(),
    review: m(),
    reviewResponse: m(),
    responseVersion: m(),
    brandVoice: m(),
    creditUsage: m(),
    sentimentUsage: m(),
    $transaction: vi.fn(),
  };
});

const mockAuth = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { GET } from '@/app/api/dashboard/stats/route';

function createRequest(
  url: string,
  opts?: { method?: string; body?: unknown; searchParams?: Record<string, string> }
): any {
  const u = new URL(url, 'http://localhost:3000');
  if (opts?.searchParams)
    for (const [k, v] of Object.entries(opts.searchParams)) u.searchParams.set(k, v);
  return new Request(u.toString(), {
    method: opts?.method || 'GET',
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GET /api/dashboard/stats', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(mockSession);
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
      fn(mockPrisma)
    );
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 404 when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns credit and sentiment balances', async () => {
    const resetDate = new Date('2026-02-15T00:00:00Z');

    mockPrisma.user.findUnique.mockResolvedValue({
      id: mockSession.user.id,
      name: 'Test User',
      tier: 'FREE',
      credits: 12,
      creditsResetDate: resetDate,
      sentimentCredits: 30,
      sentimentResetDate: resetDate,
      reviews: [],
      _count: { reviews: 0 },
    });
    mockPrisma.reviewResponse.count.mockResolvedValue(0); // both total and edited counts
    mockPrisma.review.groupBy.mockResolvedValue([]);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.credits.remaining).toBe(12);
    expect(json.data.credits.total).toBe(15);
    expect(json.data.sentiment.remaining).toBe(30);
    expect(json.data.tier).toBe('FREE');
  });

  it('returns sentiment distribution percentages', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: mockSession.user.id,
      name: 'Test User',
      tier: 'FREE',
      credits: 15,
      creditsResetDate: new Date(),
      sentimentCredits: 35,
      sentimentResetDate: new Date(),
      reviews: [],
      _count: { reviews: 10 },
    });
    mockPrisma.reviewResponse.count.mockResolvedValue(5);
    mockPrisma.review.groupBy.mockResolvedValue([
      { sentiment: 'positive', _count: { sentiment: 6 } },
      { sentiment: 'neutral', _count: { sentiment: 3 } },
      { sentiment: 'negative', _count: { sentiment: 1 } },
    ]);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.sentimentDistribution).toBeDefined();
    expect(json.data.sentimentDistribution.positive).toBe(60);
    expect(json.data.sentimentDistribution.neutral).toBe(30);
    expect(json.data.sentimentDistribution.negative).toBe(10);
  });

  it('returns recent reviews', async () => {
    const recentReviews = [
      {
        id: 'rev1',
        platform: 'google',
        reviewText: 'Great service!',
        rating: 5,
        sentiment: 'positive',
        reviewDate: null,
        createdAt: new Date('2026-01-20T10:00:00Z'),
        response: { id: 'resp1', isEdited: false },
      },
      {
        id: 'rev2',
        platform: 'yelp',
        reviewText: 'Average experience',
        rating: 3,
        sentiment: 'neutral',
        reviewDate: null,
        createdAt: new Date('2026-01-19T14:00:00Z'),
        response: null,
      },
    ];

    mockPrisma.user.findUnique.mockResolvedValue({
      id: mockSession.user.id,
      name: 'Test User',
      tier: 'FREE',
      credits: 15,
      creditsResetDate: new Date(),
      sentimentCredits: 35,
      sentimentResetDate: new Date(),
      reviews: recentReviews,
      _count: { reviews: 2 },
    });
    mockPrisma.reviewResponse.count.mockResolvedValue(1);
    mockPrisma.review.groupBy.mockResolvedValue([]);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.recentReviews).toHaveLength(2);
    expect(json.data.recentReviews[0].platform).toBe('google');
    expect(json.data.recentReviews[0].hasResponse).toBe(true);
    expect(json.data.recentReviews[1].hasResponse).toBe(false);
  });
});
