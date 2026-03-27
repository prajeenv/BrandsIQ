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

const mockGenerateReviewResponse = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ responseText: 'Thank you for your feedback!', model: 'claude-sonnet-4-20250514' }),
);

const mockGetOrCreateBrandVoice = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    tone: 'professional',
    formality: 3,
    keyPhrases: [],
    styleNotes: null,
    sampleResponses: [],
  }),
);

const mockDeductCreditsAtomic = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    success: true,
    user: { id: 'clu1234567890abcdef', credits: 14, tier: 'FREE' },
    creditsDeducted: 1,
  }),
);

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/ai/claude', () => ({
  generateReviewResponse: mockGenerateReviewResponse,
  DEFAULT_MODEL: 'claude-sonnet-4-20250514',
}));
vi.mock('@/lib/db-utils', () => ({
  getOrCreateBrandVoice: mockGetOrCreateBrandVoice,
  deductCreditsAtomic: mockDeductCreditsAtomic,
}));
vi.mock('@/lib/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/constants')>();
  return { ...actual };
});
vi.mock('@/types/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/types/database')>();
  return { ...actual };
});

import { POST } from '@/app/api/reviews/[id]/generate/route';

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

const baseUser = {
  id: 'clu1234567890abcdef',
  email: 'test@example.com',
  name: 'Test User',
  tier: 'FREE',
  credits: 15,
  creditsResetDate: new Date('2026-02-19'),
  sentimentCredits: 35,
  sentimentResetDate: new Date('2026-02-19'),
};

const reviewWithoutResponse = {
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
  response: null,
};

const reviewWithResponse = {
  ...reviewWithoutResponse,
  response: {
    id: 'resp-1',
    reviewId: 'review-1',
    responseText: 'Thank you!',
    isEdited: false,
    creditsUsed: 1,
    toneUsed: 'professional',
    generationModel: 'claude-sonnet-4-20250514',
    isPublished: false,
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
  },
};

const createdResponse = {
  id: 'resp-new',
  reviewId: 'review-1',
  responseText: 'Thank you for your feedback!',
  isEdited: false,
  editedAt: null,
  creditsUsed: 1,
  toneUsed: 'default',
  generationModel: 'claude-sonnet-4-20250514',
  isPublished: false,
  publishedAt: null,
  createdAt: new Date('2026-01-16'),
  updatedAt: new Date('2026-01-16'),
};

// ─── Setup ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(mockSession);

  // Generate route uses callback-style $transaction for creating response
  mockPrisma.$transaction.mockImplementation(async (fn) => {
    if (typeof fn === 'function') return fn(mockPrisma);
    return Promise.all(fn);
  });
});

// ─── POST /api/reviews/[id]/generate ────────────────────────────

describe('POST /api/reviews/[id]/generate', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews/review-1/generate', { method: 'POST', body: {} });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews/review-1/generate', { method: 'POST', body: {} });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });

  it('returns 402 when insufficient credits', async () => {
    const noCreditsUser = { ...baseUser, credits: 0 };
    mockPrisma.user.findUnique.mockResolvedValueOnce(noCreditsUser);
    const req = createRequest('/api/reviews/review-1/generate', { method: 'POST', body: {} });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(402);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INSUFFICIENT_CREDITS');
  });

  it('returns 404 when review not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews/nonexistent/generate', { method: 'POST', body: {} });

    const res = await POST(req, routeParams({ id: 'nonexistent' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('returns 409 when response already exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    const req = createRequest('/api/reviews/review-1/generate', { method: 'POST', body: {} });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.success).toBe(false);
  });

  it('returns 200 on successful generation', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithoutResponse);
    mockPrisma.reviewResponse.create.mockResolvedValueOnce(createdResponse);
    mockPrisma.creditUsage.updateMany.mockResolvedValueOnce({ count: 1 });

    const req = createRequest('/api/reviews/review-1/generate', { method: 'POST', body: { tone: 'professional' } });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.response).toBeDefined();
    expect(json.data.response.responseText).toBe('Thank you for your feedback!');
    expect(json.data.creditsRemaining).toBeDefined();
  });

  it('returns 503 on AI service failure', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithoutResponse);
    mockGenerateReviewResponse.mockRejectedValueOnce(new Error('AI service unavailable'));

    const req = createRequest('/api/reviews/review-1/generate', { method: 'POST', body: {} });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('AI_SERVICE_UNAVAILABLE');
  });

  it('deducts 1 credit atomically on success', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithoutResponse);
    mockPrisma.reviewResponse.create.mockResolvedValueOnce(createdResponse);
    mockPrisma.creditUsage.updateMany.mockResolvedValueOnce({ count: 1 });

    const req = createRequest('/api/reviews/review-1/generate', { method: 'POST', body: {} });

    await POST(req, routeParams({ id: 'review-1' }));

    // deductCreditsAtomic(userId, amount, action, reviewId, responseId, details)
    expect(mockDeductCreditsAtomic).toHaveBeenCalledWith(
      'clu1234567890abcdef',
      1,
      'GENERATE_RESPONSE',
      'review-1',
      undefined,
      expect.objectContaining({
        reviewId: 'review-1',
        platform: 'Google',
        tone: 'default',
      }),
    );
  });

  it('fetches brand voice before generating', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithoutResponse);
    mockPrisma.reviewResponse.create.mockResolvedValueOnce(createdResponse);
    mockPrisma.creditUsage.updateMany.mockResolvedValueOnce({ count: 1 });

    const req = createRequest('/api/reviews/review-1/generate', { method: 'POST', body: {} });

    await POST(req, routeParams({ id: 'review-1' }));

    expect(mockGetOrCreateBrandVoice).toHaveBeenCalledWith('clu1234567890abcdef');
  });

  it('does not deduct credits when AI fails', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithoutResponse);
    mockGenerateReviewResponse.mockRejectedValueOnce(new Error('API error'));

    const req = createRequest('/api/reviews/review-1/generate', { method: 'POST', body: {} });

    await POST(req, routeParams({ id: 'review-1' }));

    // AI fails before credit deduction, so deductCreditsAtomic should not be called
    expect(mockDeductCreditsAtomic).not.toHaveBeenCalled();
    expect(mockPrisma.reviewResponse.create).not.toHaveBeenCalled();
  });
});
