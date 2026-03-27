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

import { GET } from '@/app/api/credits/usage/route';
import { NextRequest } from 'next/server';

function createNextRequest(
  url: string,
  opts?: { method?: string; body?: unknown; searchParams?: Record<string, string> }
): NextRequest {
  const u = new URL(url, 'http://localhost:3000');
  if (opts?.searchParams)
    for (const [k, v] of Object.entries(opts.searchParams)) u.searchParams.set(k, v);
  return new NextRequest(u.toString(), {
    method: opts?.method || 'GET',
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

const sampleUsageRecords = [
  {
    id: 'cu1',
    creditsUsed: 1,
    action: 'GENERATE_RESPONSE',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    details: JSON.stringify({ reviewId: 'r1', platform: 'google', tone: 'professional' }),
    review: {
      id: 'r1',
      platform: 'google',
      reviewText: 'Great service! Would recommend to everyone.',
      reviewerName: 'John',
      rating: 5,
    },
    reviewResponse: { id: 'resp1', toneUsed: 'professional' },
  },
  {
    id: 'cu2',
    creditsUsed: 1,
    action: 'REGENERATE',
    createdAt: new Date('2026-01-16T14:30:00Z'),
    details: JSON.stringify({ reviewId: 'r2', platform: 'yelp', tone: 'empathetic' }),
    review: {
      id: 'r2',
      platform: 'yelp',
      reviewText: 'Terrible experience, never coming back.',
      reviewerName: 'Jane',
      rating: 1,
    },
    reviewResponse: { id: 'resp2', toneUsed: 'empathetic' },
  },
];

describe('GET /api/credits/usage', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(mockSession);
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
      fn(mockPrisma)
    );
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createNextRequest('/api/credits/usage');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns paginated usage records', async () => {
    mockPrisma.creditUsage.findMany.mockResolvedValue(sampleUsageRecords);
    mockPrisma.creditUsage.count.mockResolvedValue(2);

    const req = createNextRequest('/api/credits/usage');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.records).toHaveLength(2);
    expect(json.data.pagination).toBeDefined();
    expect(json.data.pagination.totalCount).toBe(2);
  });

  it('filters by action type', async () => {
    const generateOnly = [sampleUsageRecords[0]];
    mockPrisma.creditUsage.findMany.mockResolvedValue(generateOnly);
    mockPrisma.creditUsage.count.mockResolvedValue(1);

    const req = createNextRequest('/api/credits/usage', {
      searchParams: { action: 'GENERATE_RESPONSE' },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.records).toHaveLength(1);

    // Verify Prisma was called with action filter
    expect(mockPrisma.creditUsage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: 'GENERATE_RESPONSE',
        }),
      })
    );
  });

  it('filters by date range', async () => {
    mockPrisma.creditUsage.findMany.mockResolvedValue([sampleUsageRecords[0]]);
    mockPrisma.creditUsage.count.mockResolvedValue(1);

    const req = createNextRequest('/api/credits/usage', {
      searchParams: {
        startDate: '2026-01-15T00:00:00Z',
        endDate: '2026-01-15T23:59:59Z',
      },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.records).toHaveLength(1);

    expect(mockPrisma.creditUsage.findMany).toHaveBeenCalledWith(
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

  it('handles deleted reviews with fallback from details JSON', async () => {
    const deletedReviewRecord = {
      id: 'cu3',
      creditsUsed: 1,
      action: 'GENERATE_RESPONSE',
      createdAt: new Date('2026-01-17T09:00:00Z'),
      review: null,
      reviewResponse: null,
      details: JSON.stringify({ reviewId: 'r3', platform: 'google', tone: 'friendly' }),
    };

    mockPrisma.creditUsage.findMany.mockResolvedValue([deletedReviewRecord]);
    mockPrisma.creditUsage.count.mockResolvedValue(1);

    const req = createNextRequest('/api/credits/usage');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.records).toHaveLength(1);
    // The record should still be returned even though review is null
    // and isDeleted should be true since reviewId exists in details but review is null
    const record = json.data.records[0];
    expect(record).toBeDefined();
    expect(record.isDeleted).toBe(true);
    expect(record.platform).toBe('google');
  });

  it('uses default pagination page=1, limit=20', async () => {
    mockPrisma.creditUsage.findMany.mockResolvedValue([]);
    mockPrisma.creditUsage.count.mockResolvedValue(0);

    const req = createNextRequest('/api/credits/usage');
    await GET(req);

    expect(mockPrisma.creditUsage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
      })
    );
  });
});
