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
    // V2 tone key — 5/25 simplification persists the brand voice tone to
    // the DB on regenerate (the tone selector was dropped from the
    // dialog; the brand voice tone applies as configured).
    tone: 'friendly_professional',
    keyPhrases: [],
    styleGuidelines: [],
    sampleResponses: [],
    acknowledgeNamedStaff: true,
    acknowledgeOccasions: true,
    salutationPattern: 'Dear {firstName},',
    signoffLines: 'Warmest regards,\nThe Team',
    negativeReviewEmailEnabled: false,
    negativeReviewFraming: 'investigation',
    negativeReviewFramingCustom: null,
    replyToEmail: null,
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
  // 5/26 — persisted regenerate-instruction field. The default fixture
  // represents an initial-generation response (no instruction).
  additionalInstructions: null as string | null,
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
      body: {},
    });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  // 5/25 simplification — tone field was removed from the request body.
  // Empty bodies are now valid; the brand voice tone applies as
  // configured.
  it('accepts an empty request body (tone field is no longer required)', async () => {
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
      body: {},
    });

    const res = await POST(req, routeParams({ id: 'review-1' }));
    expect(res.status).toBe(200);
  });

  it('returns 402 when insufficient credits', async () => {
    const noCreditsUser = { ...baseUser, credits: 0 };
    mockPrisma.user.findUnique.mockResolvedValueOnce(noCreditsUser);
    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: {},
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
      body: {},
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
      body: {},
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
      body: {},
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
      body: {},
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
          // 5/26 — the snapshot must carry the additionalInstructions
          // value that was on the PREVIOUS state of the response. Our
          // default fixture has null (initial generation), so the
          // archive also gets null.
          additionalInstructions: null,
        }),
      }),
    );
  });

  // 5/26 — when the previous response was itself a regen (had an
  // instruction), that instruction must be archived to the new version.
  it('archives the previous additionalInstructions value into the new version row', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce({
      ...reviewWithResponse,
      response: {
        ...existingResponse,
        additionalInstructions: 'Be more apologetic about the dessert',
      },
    });
    mockPrisma.responseVersion.create.mockResolvedValueOnce({});
    mockPrisma.reviewResponse.update.mockResolvedValueOnce(existingResponse);

    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: { additionalInstructions: 'Mention the loyalty program' },
    });
    await POST(req, routeParams({ id: 'review-1' }));

    expect(mockPrisma.responseVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          // The archive snapshots the OLD instruction (what produced
          // the response we're replacing).
          additionalInstructions: 'Be more apologetic about the dessert',
        }),
      }),
    );
  });

  // 5/26 — the LIVE row (ReviewResponse) gets the NEW instruction.
  it('persists the new additionalInstructions on the live ReviewResponse row', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockPrisma.responseVersion.create.mockResolvedValueOnce({});
    mockPrisma.reviewResponse.update.mockResolvedValueOnce(existingResponse);

    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: { additionalInstructions: 'Mention the loyalty program' },
    });
    await POST(req, routeParams({ id: 'review-1' }));

    expect(mockPrisma.reviewResponse.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          additionalInstructions: 'Mention the loyalty program',
        }),
      }),
    );
  });

  it('writes null to the live row when no additionalInstructions was provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockPrisma.responseVersion.create.mockResolvedValueOnce({});
    mockPrisma.reviewResponse.update.mockResolvedValueOnce(existingResponse);

    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: {},
    });
    await POST(req, routeParams({ id: 'review-1' }));

    expect(mockPrisma.reviewResponse.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          additionalInstructions: null,
        }),
      }),
    );
  });

  it('normalises whitespace-only additionalInstructions to null on the live row', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockPrisma.responseVersion.create.mockResolvedValueOnce({});
    mockPrisma.reviewResponse.update.mockResolvedValueOnce(existingResponse);

    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: { additionalInstructions: '   \n\n   ' },
    });
    await POST(req, routeParams({ id: 'review-1' }));

    expect(mockPrisma.reviewResponse.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          additionalInstructions: null,
        }),
      }),
    );
  });

  it('deducts 1 credit on regeneration and uses brand voice tone (no per-regen override)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockPrisma.responseVersion.create.mockResolvedValueOnce({});
    mockPrisma.reviewResponse.update.mockResolvedValueOnce({
      ...existingResponse,
      responseText: 'We appreciate your feedback!',
    });

    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: {},
    });

    await POST(req, routeParams({ id: 'review-1' }));

    // deductCreditsAtomic(userId, amount, action, reviewId, responseId, details)
    // The newTone in the audit trail is the brand voice tone — there is
    // no per-regen tone override (5/25 simplification).
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
        newTone: 'friendly_professional',
      }),
    );
  });

  it('persists the brand voice tone as the new toneUsed (not from request body)', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockPrisma.responseVersion.create.mockResolvedValueOnce({});
    mockPrisma.reviewResponse.update.mockResolvedValueOnce({
      ...existingResponse,
      responseText: 'We appreciate your feedback!',
    });

    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: {},
    });

    await POST(req, routeParams({ id: 'review-1' }));

    expect(mockPrisma.reviewResponse.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          // From the mocked brand voice (the only source of tone now).
          toneUsed: 'friendly_professional',
        }),
      }),
    );
  });

  it('returns 503 on AI failure and does not save', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockGenerateReviewResponse.mockRejectedValueOnce(new Error('AI service down'));

    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: {},
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

  // 5/25 simplification — the route no longer forwards `toneModifier` to
  // generateReviewResponse. The brand voice tone applies via the
  // `brandVoice` arg already.
  it('does NOT forward a toneModifier to generateReviewResponse', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
    mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
    mockPrisma.responseVersion.create.mockResolvedValueOnce({});
    mockPrisma.reviewResponse.update.mockResolvedValueOnce(existingResponse);

    const req = createRequest('/api/reviews/review-1/regenerate', {
      method: 'POST',
      body: {},
    });
    await POST(req, routeParams({ id: 'review-1' }));

    const callArgs = mockGenerateReviewResponse.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty('toneModifier');
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
        body: {},
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
        body: {},
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
        body: {},
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

  // ─── additionalInstructions plumbing (iter 6 / 5/25 simplified) ──
  describe('additionalInstructions', () => {
    it('forwards additionalInstructions to generateReviewResponse as customRegenerateInstructions', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(baseUser);
      mockPrisma.review.findFirst.mockResolvedValueOnce(reviewWithResponse);
      mockPrisma.responseVersion.create.mockResolvedValueOnce({});
      mockPrisma.reviewResponse.update.mockResolvedValueOnce(existingResponse);

      const req = createRequest('/api/reviews/review-1/regenerate', {
        method: 'POST',
        body: {
          additionalInstructions: 'Mention our loyalty program once.',
        },
      });
      await POST(req, routeParams({ id: 'review-1' }));

      // 5/25 simplification — no `toneModifier` is forwarded. The brand
      // voice tone applies via the `brandVoice` arg.
      expect(mockGenerateReviewResponse).toHaveBeenCalledWith(
        expect.objectContaining({
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
        body: {},
      });
      await POST(req, routeParams({ id: 'review-1' }));

      expect(mockGenerateReviewResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          customRegenerateInstructions: undefined,
        }),
      );
    });

    it('rejects additionalInstructions over 500 chars', async () => {
      const req = createRequest('/api/reviews/review-1/regenerate', {
        method: 'POST',
        body: {
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
