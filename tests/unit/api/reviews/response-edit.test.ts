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
vi.mock('@/lib/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/constants')>();
  return { ...actual };
});

import { PUT } from '@/app/api/reviews/[id]/response/route';

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

const existingResponse = {
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
};

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
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  response: existingResponse,
};

const reviewWithoutResponse = {
  ...reviewWithResponse,
  response: null,
};

// ─── Setup ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(mockSession);

  // The response edit route uses callback-style $transaction
  mockPrisma.$transaction.mockImplementation(async (fn) => {
    if (typeof fn === 'function') return fn(mockPrisma);
    return Promise.all(fn);
  });
});

// ─── PUT /api/reviews/[id]/response ─────────────────────────────

describe('PUT /api/reviews/[id]/response', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews/review-1/response', {
      method: 'PUT',
      body: { responseText: 'Updated response text' },
    });

    const res = await PUT(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for empty responseText', async () => {
    const req = createRequest('/api/reviews/review-1/response', {
      method: 'PUT',
      body: { responseText: '' },
    });

    const res = await PUT(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for responseText exceeding 500 characters', async () => {
    const longText = 'A'.repeat(501);
    const req = createRequest('/api/reviews/review-1/response', {
      method: 'PUT',
      body: { responseText: longText },
    });

    const res = await PUT(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when review not found', async () => {
    mockPrisma.review.findFirst.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews/nonexistent/response', {
      method: 'PUT',
      body: { responseText: 'Updated text' },
    });

    const res = await PUT(req, routeParams({ id: 'nonexistent' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 when no response exists to edit', async () => {
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithoutResponse);
    const req = createRequest('/api/reviews/review-1/response', {
      method: 'PUT',
      body: { responseText: 'Updated text' },
    });

    const res = await PUT(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NO_RESPONSE');
  });

  it('saves current text to version history and returns 200', async () => {
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockPrisma.responseVersion.create.mockResolvedValueOnce({});
    mockPrisma.reviewResponse.update.mockResolvedValueOnce({
      ...existingResponse,
      responseText: 'My edited response text',
      isEdited: true,
      editedAt: new Date(),
      creditsUsed: 0,
    });

    const req = createRequest('/api/reviews/review-1/response', {
      method: 'PUT',
      body: { responseText: 'My edited response text' },
    });

    const res = await PUT(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.response.isEdited).toBe(true);
    // Verify the OLD text was saved to version history
    expect(mockPrisma.responseVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewResponseId: 'resp-1',
          responseText: 'Thank you for your kind words!',
          toneUsed: 'professional',
          creditsUsed: 1,
          isEdited: false,
        }),
      }),
    );
  });

  it('sets isEdited=true and creditsUsed=0 on edit', async () => {
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockPrisma.responseVersion.create.mockResolvedValueOnce({});
    mockPrisma.reviewResponse.update.mockResolvedValueOnce({
      ...existingResponse,
      responseText: 'Edited response',
      isEdited: true,
      editedAt: new Date(),
      creditsUsed: 0,
    });

    const req = createRequest('/api/reviews/review-1/response', {
      method: 'PUT',
      body: { responseText: 'Edited response' },
    });

    await PUT(req, routeParams({ id: 'review-1' }));

    expect(mockPrisma.reviewResponse.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isEdited: true,
          creditsUsed: 0,
        }),
      }),
    );
  });

  it('does not create version history entry if text is unchanged', async () => {
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockPrisma.reviewResponse.update.mockResolvedValueOnce({
      ...existingResponse,
      isEdited: true,
      editedAt: new Date(),
      creditsUsed: 0,
    });

    const req = createRequest('/api/reviews/review-1/response', {
      method: 'PUT',
      body: { responseText: 'Thank you for your kind words!' }, // same text as existing
    });

    const res = await PUT(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockPrisma.responseVersion.create).not.toHaveBeenCalled();
  });
});
