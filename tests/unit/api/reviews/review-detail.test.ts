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
  detectLanguage: vi.fn().mockReturnValue({ language: 'Spanish', confidence: 'high', code: 'spa', isRTL: false }),
}));

import { GET, PUT, DELETE } from '@/app/api/reviews/[id]/route';

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

function routeParams(params: Record<string, string>): any {
  return { params: Promise.resolve(params) };
}

// ─── Fixtures ────────────────────────────────────────────────────

const reviewWithResponse = {
  id: 'review-1',
  userId: 'clu1234567890abcdef',
  platform: 'Google',
  reviewText: 'Great service!',
  rating: 5,
  reviewerName: 'John',
  reviewDate: null,
  detectedLanguage: 'English',
  sentiment: 'positive',
  externalId: null,
  externalUrl: null,
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  response: {
    id: 'resp-1',
    reviewId: 'review-1',
    responseText: 'Thank you for your kind words!',
    isEdited: false,
    editedAt: null,
    creditsUsed: 1,
    toneUsed: 'professional',
    generationModel: 'claude-sonnet-4-20250514',
    isPublished: false,
    publishedAt: null,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    versions: [],
  },
};

const reviewWithoutResponse = {
  ...reviewWithResponse,
  response: null,
};

// ─── Setup ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(mockSession);

  mockPrisma.$transaction.mockImplementation(async (fn) => {
    if (typeof fn === 'function') return fn(mockPrisma);
    return Promise.all(fn);
  });
});

// ─── GET /api/reviews/[id] ──────────────────────────────────────

describe('GET /api/reviews/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews/review-1');

    const res = await GET(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 for non-existent review', async () => {
    mockPrisma.review.findFirst.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews/nonexistent');

    const res = await GET(req, routeParams({ id: 'nonexistent' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('returns review with response and versions (200)', async () => {
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    const req = createRequest('/api/reviews/review-1');

    const res = await GET(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.review.id).toBe('review-1');
    expect(json.data.review.response).toBeDefined();
    expect(json.data.review.response.responseText).toBe('Thank you for your kind words!');
    expect(json.data.review.response.versions).toEqual([]);
  });
});

// ─── PUT /api/reviews/[id] ──────────────────────────────────────

describe('PUT /api/reviews/[id]', () => {
  const updateBody = {
    reviewText: 'Servicio excelente y personal amable!',
    platform: 'Google',
    rating: 4,
  };

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews/review-1', { method: 'PUT', body: updateBody });

    const res = await PUT(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for validation error with invalid platform', async () => {
    const req = createRequest('/api/reviews/review-1', {
      method: 'PUT',
      body: { platform: 'invalid-platform' },
    });

    const res = await PUT(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 for non-existent review', async () => {
    mockPrisma.review.findFirst.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews/nonexistent', { method: 'PUT', body: updateBody });

    const res = await PUT(req, routeParams({ id: 'nonexistent' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('re-runs language detection on text change and returns 200', async () => {
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithoutResponse);
    const updatedReview = {
      ...reviewWithoutResponse,
      reviewText: updateBody.reviewText,
      detectedLanguage: 'Spanish',
      rating: 4,
      response: null,
    };
    mockPrisma.review.update.mockResolvedValueOnce(updatedReview);

    const req = createRequest('/api/reviews/review-1', { method: 'PUT', body: updateBody });

    const res = await PUT(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockPrisma.review.update).toHaveBeenCalledTimes(1);
    // Verify update data includes detected language
    expect(mockPrisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          detectedLanguage: 'Spanish',
        }),
      }),
    );
  });
});

// ─── DELETE /api/reviews/[id] ───────────────────────────────────

describe('DELETE /api/reviews/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews/review-1', { method: 'DELETE' });

    const res = await DELETE(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 for non-existent review', async () => {
    mockPrisma.review.findFirst.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews/review-1', { method: 'DELETE' });

    const res = await DELETE(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('deletes review and returns success (200)', async () => {
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithoutResponse);
    mockPrisma.review.delete.mockResolvedValueOnce(reviewWithoutResponse);

    const req = createRequest('/api/reviews/review-1', { method: 'DELETE' });

    const res = await DELETE(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.deletedReviewId).toBe('review-1');
    expect(mockPrisma.review.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'review-1' },
      }),
    );
  });
});
