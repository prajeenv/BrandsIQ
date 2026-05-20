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
  vi.fn().mockResolvedValue({ responseText: 'We appreciate your feedback!', model: 'claude-sonnet-4-20250514' }),
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

const mockLogIfInjectionAttempt = vi.hoisted(() => vi.fn().mockResolvedValue([]));

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
vi.mock('@/lib/security-log', () => ({
  logIfInjectionAttempt: mockLogIfInjectionAttempt,
  SecurityEventTypes: { INJECTION_ATTEMPT: 'injection_attempt' },
}));
vi.mock('@/lib/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/constants')>();
  return { ...actual };
});
vi.mock('@/types/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/types/database')>();
  return { ...actual };
});

import { POST } from '@/app/api/reviews/[id]/regenerate/route';

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

  mockPrisma.$transaction.mockImplementation(async (fn) => {
    if (typeof fn === 'function') return fn(mockPrisma);
    return Promise.all(fn);
  });
});

// ─── POST /api/reviews/[id]/regenerate ──────────────────────────

describe('POST /api/reviews/[id]/regenerate', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: { tone: 'friendly_professional' },
    });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for missing tone', async () => {
    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: {},
    });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid tone value', async () => {
    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: { tone: 'aggressive' },
    });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 402 when insufficient credits', async () => {
    const noCreditsUser = { ...baseUser, credits: 0 };
    mockPrisma.user.findUnique.mockResolvedValueOnce(noCreditsUser);
    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: { tone: 'friendly_professional' },
    });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(402);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INSUFFICIENT_CREDITS');
  });

  it('returns 404 when review not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(null);
    const req = createRequest('/api/reviews/nonexistent/regenerate', {
      method: 'POST',
      body: { tone: 'friendly_professional' },
    });

    const res = await POST(req, routeParams({ id: 'nonexistent' }));
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 when no response exists to regenerate', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithoutResponse);
    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: { tone: 'friendly_professional' },
    });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NO_RESPONSE');
  });

  it('returns 200 on successful regeneration', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockPrisma.responseVersion.create.mockResolvedValueOnce({});
    mockPrisma.reviewResponse.update.mockResolvedValueOnce({
      ...existingResponse,
      responseText: 'We appreciate your feedback!',
      toneUsed: 'friendly_professional',
      isEdited: false,
      editedAt: null,
      updatedAt: new Date(),
    });

    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: { tone: 'friendly_professional' },
    });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.response).toBeDefined();
    expect(json.data.creditsRemaining).toBeDefined();
  });

  it('saves old response to version history before regeneration', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockPrisma.responseVersion.create.mockResolvedValueOnce({});
    mockPrisma.reviewResponse.update.mockResolvedValueOnce({
      ...existingResponse,
      responseText: 'We appreciate your feedback!',
      toneUsed: 'friendly_professional',
    });

    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: { tone: 'friendly_professional' },
    });

    await POST(req, routeParams({ id: 'review-1' }));

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

  it('deducts 1 credit on regeneration', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockPrisma.responseVersion.create.mockResolvedValueOnce({});
    mockPrisma.reviewResponse.update.mockResolvedValueOnce({
      ...existingResponse,
      responseText: 'We appreciate your feedback!',
    });

    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: { tone: 'empathetic_attentive' },
    });

    await POST(req, routeParams({ id: 'review-1' }));

    // deductCreditsAtomic(userId, amount, action, reviewId, responseId, details)
    expect(mockDeductCreditsAtomic).toHaveBeenCalledWith(
      'clu1234567890abcdef',
      1,
      'REGENERATE',
      'review-1',
      'resp-1',
      expect.objectContaining({
        reviewId: 'review-1',
        platform: 'Google',
        previousTone: 'professional',
        newTone: 'empathetic_attentive',
      }),
    );
  });

  it('returns 503 on AI failure and does not save', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockGenerateReviewResponse.mockRejectedValueOnce(new Error('AI service down'));

    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: { tone: 'friendly_professional' },
    });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('AI_SERVICE_UNAVAILABLE');
    // Neither credit deduction nor version save should happen
    expect(mockDeductCreditsAtomic).not.toHaveBeenCalled();
    expect(mockPrisma.reviewResponse.update).not.toHaveBeenCalled();
  });

  // ─── Iteration 1: prompt-injection audit logging (spec §10.6) ────
  describe('prompt-injection audit logging', () => {
    it('calls logIfInjectionAttempt with the review text on every successful regeneration', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
      mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
      mockPrisma.reviewResponse.update.mockResolvedValueOnce({
        ...reviewWithResponse.response,
        responseText: 'Updated response',
        toneUsed: 'friendly_professional',
      });
      mockPrisma.responseVersion.create.mockResolvedValueOnce({ id: 'ver-1' });
      mockPrisma.creditUsage.updateMany.mockResolvedValueOnce({ count: 1 });

      const req = createRequest('/api/reviews/review-1/regenerate', {
        method: 'POST',
        body: { tone: 'friendly_professional' },
      });

      await POST(req, routeParams({ id: 'review-1' }));

      expect(mockLogIfInjectionAttempt).toHaveBeenCalledWith({
        text: 'Great service!',
        userId: 'clu1234567890abcdef',
        fieldName: 'review_text',
      });
    });

    it('does not call logIfInjectionAttempt when the review is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
      mockPrisma.review.findFirst.mockResolvedValueOnce(null);

      const req = createRequest('/api/reviews/review-1/regenerate', {
        method: 'POST',
        body: { tone: 'friendly_professional' },
      });

      await POST(req, routeParams({ id: 'review-1' }));

      expect(mockLogIfInjectionAttempt).not.toHaveBeenCalled();
    });
  });

  // ─── Iteration 5: post-processing assembly ─────────────────────────
  describe('post-processing assembly', () => {
    it('persists the assembled response (salutation + body + sign-off)', async () => {
      // reviewer "John" + mock body "We appreciate your feedback!" + default
      // V2 brand voice salutation + sign-off → expected assembled form.
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
      mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
      mockPrisma.reviewResponse.update.mockResolvedValueOnce({
        ...existingResponse,
        responseText: 'Dear John,\n\nWe appreciate your feedback!\n\nWarmest regards,\nThe Team',
      });
      mockPrisma.responseVersion.create.mockResolvedValueOnce({ id: 'ver-1' });
      mockPrisma.creditUsage.updateMany.mockResolvedValueOnce({ count: 1 });

      const req = createRequest('/api/reviews/review-1/regenerate', {
        method: 'POST',
        body: { tone: 'friendly_professional' },
      });
      await POST(req, routeParams({ id: 'review-1' }));

      expect(mockPrisma.reviewResponse.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            responseText: expect.stringMatching(
              /^Dear John,\n\nWe appreciate your feedback!\n\nWarmest regards,\nThe Team$/,
            ),
          }),
        }),
      );
    });
  });

  // ─── Iteration 6: additionalInstructions plumbing ─────────────────
  describe('additionalInstructions (iter 6)', () => {
    it('forwards additionalInstructions to generateReviewResponse as customRegenerateInstructions', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
      mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
      mockPrisma.responseVersion.create.mockResolvedValueOnce({});
      mockPrisma.reviewResponse.update.mockResolvedValueOnce(existingResponse);

      const req = createRequest('/api/reviews/review-1/regenerate', {
        method: 'POST',
        body: {
          tone: 'friendly_professional',
          additionalInstructions: 'Mention our loyalty program once.',
        },
      });
      await POST(req, routeParams({ id: 'review-1' }));

      expect(mockGenerateReviewResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          toneModifier: 'friendly_professional',
          customRegenerateInstructions: 'Mention our loyalty program once.',
        }),
      );
    });

    it('does not pass customRegenerateInstructions when additionalInstructions is absent', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
      mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
      mockPrisma.responseVersion.create.mockResolvedValueOnce({});
      mockPrisma.reviewResponse.update.mockResolvedValueOnce(existingResponse);

      const req = createRequest('/api/reviews/review-1/regenerate', {
        method: 'POST',
        body: { tone: 'friendly_professional' },
      });
      await POST(req, routeParams({ id: 'review-1' }));

      expect(mockGenerateReviewResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          toneModifier: 'friendly_professional',
          customRegenerateInstructions: undefined,
        }),
      );
    });

    it('rejects additionalInstructions over 500 chars', async () => {
      const req = createRequest('/api/reviews/review-1/regenerate', {
        method: 'POST',
        body: {
          tone: 'friendly_professional',
          additionalInstructions: 'a'.repeat(501),
        },
      });
      const res = await POST(req, routeParams({ id: 'review-1' }));

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
