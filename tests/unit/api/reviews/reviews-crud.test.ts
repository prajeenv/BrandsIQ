import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ───────────────────────────────────────────────

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
vi.mock('@/lib/language-detection', () => ({
  detectLanguage: vi.fn().mockReturnValue({ language: 'English', confidence: 'high', code: 'eng', isRTL: false }),
}));
vi.mock('@/lib/ai/deepseek', () => ({
  analyzeSentiment: vi.fn().mockResolvedValue({ sentiment: 'positive', confidence: 0.9 }),
}));

import { GET, POST } from '@/app/api/reviews/route';

// ─── Helpers ─────────────────────────────────────────────────────

function createRequest(
  url: string,
  opts?: { method?: string; body?: unknown; searchParams?: Record<string, string> },
): any {
  const u = new URL(url, 'http://localhost:3000');
  if (opts?.searchParams) {
    for (const [k, v] of Object.entries(opts.searchParams)) u.searchParams.set(k, v);
  }
  return new Request(u.toString(), {
    method: opts?.method || 'GET',
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Shared fixtures ─────────────────────────────────────────────

const baseUser = {
  id: 'clu1234567890abcdef',
  email: 'test@example.com',
  name: 'Test User',
  tier: 'FREE',
  credits: 15,
  sentimentCredits: 35,
  sentimentResetDate: new Date('2026-02-19'),
  creditsResetDate: new Date('2026-02-19'),
};

const baseReview = {
  id: 'review-1',
  userId: 'clu1234567890abcdef',
  platform: 'Google',
  reviewText: 'Great service and friendly staff!',
  rating: 5,
  reviewerName: 'John Doe',
  reviewDate: null,
  detectedLanguage: 'English',
  sentiment: 'positive',
  externalId: null,
  externalUrl: null,
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
};

// ─── Setup ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(mockSession);

  // The POST route uses array-style $transaction for sentiment logging
  mockPrisma.$transaction.mockImplementation(async (fn) => {
    if (typeof fn === 'function') return fn(mockPrisma);
    return Promise.all(fn);
  });
});

// ─── POST /api/reviews ──────────────────────────────────────────

describe('POST /api/reviews', () => {
  const validBody = {
    platform: 'Google',
    reviewText: 'Great service and friendly staff!',
    rating: 5,
    reviewerName: 'John Doe',
  };

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews', { method: 'POST', body: validBody });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for validation error when platform is missing', async () => {
    const req = createRequest('/api/reviews', {
      method: 'POST',
      body: { reviewText: 'Some review text that is long enough' },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 for duplicate review within 5 minutes', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(baseReview);

    const req = createRequest('/api/reviews', { method: 'POST', body: validBody });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('DUPLICATE_REVIEW');
  });

  it('creates review with auto-detected language and returns 201', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(null); // no duplicate
    mockPrisma.review.create.mockResolvedValueOnce(baseReview);
    // $transaction for sentiment logging (array style)
    mockPrisma.sentimentUsage.create.mockResolvedValueOnce({});
    mockPrisma.user.update.mockResolvedValueOnce({});

    const req = createRequest('/api/reviews', { method: 'POST', body: validBody });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.review).toBeDefined();
    expect(json.data.review.detectedLanguage).toBe('English');
    expect(json.data.sentimentAnalyzed).toBe(true);
    expect(mockPrisma.review.create).toHaveBeenCalledTimes(1);
  });

  it('skips sentiment when user has no sentiment credits and still creates review', async () => {
    const userNoSentiment = { ...baseUser, sentimentCredits: 0 };
    mockPrisma.user.findUnique.mockResolvedValueOnce(userNoSentiment);
    mockPrisma.review.findFirst.mockResolvedValueOnce(null);

    const reviewNoSentiment = { ...baseReview, sentiment: null };
    mockPrisma.review.create.mockResolvedValueOnce(reviewNoSentiment);

    const req = createRequest('/api/reviews', { method: 'POST', body: validBody });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.data.review.sentiment).toBeNull();
    expect(json.data.sentimentAnalyzed).toBe(false);
    expect(json.data.sentimentWarning).toBe('Sentiment analysis skipped: no credits remaining');
    // No sentiment logging calls since analysis was skipped
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});

// ─── GET /api/reviews ───────────────────────────────────────────

describe('GET /api/reviews', () => {
  const reviewWithResponse = {
    ...baseReview,
    response: {
      id: 'resp-1',
      responseText: 'Thank you!',
      isEdited: false,
      isPublished: false,
      createdAt: new Date('2026-01-15'),
      updatedAt: new Date('2026-01-15'),
      creditsUsed: 1,
      versions: [],
    },
  };
  const reviewsList = [
    reviewWithResponse,
    { ...baseReview, id: 'review-2', platform: 'Amazon', response: null },
  ];

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews');

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns paginated reviews with 200', async () => {
    mockPrisma.review.count.mockResolvedValueOnce(2);
    mockPrisma.review.findMany.mockResolvedValueOnce(reviewsList);

    const req = createRequest('/api/reviews');

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.reviews).toHaveLength(2);
    expect(json.data.pagination).toBeDefined();
    expect(json.data.pagination.totalCount).toBe(2);
  });

  it('applies platform filter', async () => {
    mockPrisma.review.count.mockResolvedValueOnce(1);
    mockPrisma.review.findMany.mockResolvedValueOnce([reviewsList[1]]);

    const req = createRequest('/api/reviews', { searchParams: { platform: 'Amazon' } });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.reviews).toHaveLength(1);
    // Verify where clause includes platform
    expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ platform: 'Amazon' }),
      }),
    );
  });

  it('applies sentiment filter', async () => {
    mockPrisma.review.count.mockResolvedValueOnce(1);
    mockPrisma.review.findMany.mockResolvedValueOnce([reviewWithResponse]);

    const req = createRequest('/api/reviews', { searchParams: { sentiment: 'positive' } });

    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data.reviews).toHaveLength(1);
    expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sentiment: 'positive' }),
      }),
    );
  });

  it('defaults pagination to page=1 and limit=20', async () => {
    mockPrisma.review.count.mockResolvedValueOnce(0);
    mockPrisma.review.findMany.mockResolvedValueOnce([]);

    const req = createRequest('/api/reviews');

    await GET(req);

    expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
      }),
    );
  });

  it('respects custom page and limit params', async () => {
    mockPrisma.review.count.mockResolvedValueOnce(0);
    mockPrisma.review.findMany.mockResolvedValueOnce([]);

    const req = createRequest('/api/reviews', { searchParams: { page: '3', limit: '10' } });

    await GET(req);

    expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      }),
    );
  });
});
