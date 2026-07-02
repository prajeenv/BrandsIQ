import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGenerateReviewResponse = vi.hoisted(() => vi.fn());
const mockNormalizeBrandVoice = vi.hoisted(() => vi.fn());
const mockDetectLanguage = vi.hoisted(() => vi.fn());
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockGetClientIP = vi.hoisted(() => vi.fn());

vi.mock('@/lib/ai/claude', () => ({
  generateReviewResponse: mockGenerateReviewResponse,
}));
vi.mock('@/lib/ai/brand-voice-normalize', () => ({
  normalizeBrandVoice: mockNormalizeBrandVoice,
}));
vi.mock('@/lib/language-detection', () => ({
  detectLanguage: mockDetectLanguage,
}));
vi.mock('@/lib/rate-limit', () => ({
  aiRateLimit: {},
  getClientIP: mockGetClientIP,
  checkRateLimit: mockCheckRateLimit,
}));
// Prisma must NOT be touched by this route. Mock it so any accidental import
// is a no-op, and assert below that no method is called.
const mockPrisma = vi.hoisted(() => ({
  user: { update: vi.fn(), findUnique: vi.fn() },
  review: { create: vi.fn(), findUnique: vi.fn() },
  brandVoice: { findUnique: vi.fn(), create: vi.fn() },
  creditUsage: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { POST } from '@/app/api/integrations/generate-response/route';
import { NextRequest } from 'next/server';

function createRequest(opts?: {
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
}): NextRequest {
  return new NextRequest(
    new URL('/api/integrations/generate-response', 'http://localhost:3000').toString(),
    {
      method: 'POST',
      body:
        opts?.rawBody !== undefined
          ? opts.rawBody
          : opts?.body !== undefined
            ? JSON.stringify(opts.body)
            : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...(opts?.headers || {}),
      },
    }
  );
}

const VALID_KEY = 'test-integration-key';

// A default normalized brand voice (the route calls normalizeBrandVoice(null)).
const defaultNormalized = {
  tone: 'friendly_professional',
  styleGuidelines: [],
  keyPhrases: ['Thank you', 'We appreciate your feedback'],
  sampleResponses: [],
  acknowledgeNamedStaff: true,
  acknowledgeOccasions: true,
  salutationPattern: 'Dear {firstName},',
  signoffLines: 'Warmest regards,\nThe Team',
  negativeReviewEmailEnabled: false,
  negativeReviewFraming: 'investigation',
  negativeReviewFramingCustom: null,
  replyToEmail: null,
  responseLanguage: null,
  salutationSignoffLanguage: null,
};

describe('POST /api/integrations/generate-response', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTEGRATIONS_API_KEY = VALID_KEY;

    mockGetClientIP.mockReturnValue('1.2.3.4');
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      headers: { 'X-RateLimit-Remaining': '9' },
    });
    mockNormalizeBrandVoice.mockReturnValue(defaultNormalized);
    mockDetectLanguage.mockReturnValue({
      language: 'German',
      confidence: 'high',
      code: 'deu',
      isRTL: false,
    });
    mockGenerateReviewResponse.mockResolvedValue({
      responseText: 'Vielen Dank für Ihre wunderbare Bewertung!',
      model: 'claude-sonnet-5',
      effectiveLanguage: 'German',
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns 503 when INTEGRATIONS_API_KEY is not configured', async () => {
    delete process.env.INTEGRATIONS_API_KEY;

    const req = createRequest({
      body: { reviewText: 'Tolles Essen!' },
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await POST(req);

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('API_NOT_CONFIGURED');
    expect(mockGenerateReviewResponse).not.toHaveBeenCalled();
  });

  it('returns 401 for a missing Authorization header', async () => {
    const req = createRequest({ body: { reviewText: 'Tolles Essen!' } });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
    expect(mockGenerateReviewResponse).not.toHaveBeenCalled();
  });

  it('returns 401 for an invalid Bearer key', async () => {
    const req = createRequest({
      body: { reviewText: 'Tolles Essen!' },
      headers: { Authorization: 'Bearer wrong-key' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(mockGenerateReviewResponse).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    mockCheckRateLimit.mockResolvedValue({
      success: false,
      headers: { 'Retry-After': '30' },
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
    });

    const req = createRequest({
      body: { reviewText: 'Tolles Essen!' },
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(mockGenerateReviewResponse).not.toHaveBeenCalled();
  });

  it('returns 400 for an unparseable body', async () => {
    const req = createRequest({
      rawBody: 'not json{',
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for missing reviewText', async () => {
    const req = createRequest({
      body: { platform: 'Google' },
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(mockGenerateReviewResponse).not.toHaveBeenCalled();
  });

  it('returns 200 with responseText, model, and detected language on success', async () => {
    const req = createRequest({
      body: { reviewText: 'Tolles Essen, sehr freundlicher Service!', rating: 5 },
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.responseText).toBe('Vielen Dank für Ihre wunderbare Bewertung!');
    expect(json.data.model).toBe('claude-sonnet-5');
    expect(json.data.language).toBe('German');
  });

  it('generates with isTestMode, the detected language, and NO responseLanguage override', async () => {
    const req = createRequest({
      body: { reviewText: 'Tolles Essen, sehr freundlicher Service!', rating: 5 },
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    await POST(req);

    expect(mockNormalizeBrandVoice).toHaveBeenCalledWith(null);
    expect(mockGenerateReviewResponse).toHaveBeenCalledTimes(1);
    const params = mockGenerateReviewResponse.mock.calls[0][0];
    expect(params.isTestMode).toBe(true);
    expect(params.detectedLanguage).toBe('German');
    expect(params.reviewText).toBe('Tolles Essen, sehr freundlicher Service!');
    expect(params.rating).toBe(5);
    // The reply must follow the detected language — no override is set.
    expect(params.brandVoice.responseLanguage).toBeNull();
  });

  it('returns the model body only (no salutation/sign-off appended)', async () => {
    const req = createRequest({
      body: { reviewText: 'Tolles Essen!', rating: 5 },
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await POST(req);
    const json = await res.json();

    // assembleResponse is intentionally skipped — the body is returned verbatim.
    expect(json.data.responseText).toBe('Vielen Dank für Ihre wunderbare Bewertung!');
    expect(json.data.responseText).not.toContain('Warmest regards');
    expect(json.data.responseText).not.toMatch(/^Dear|^Hello/);
  });

  it('returns 503 when the AI service is not configured', async () => {
    mockGenerateReviewResponse.mockRejectedValue(
      new Error('ANTHROPIC_API_KEY is not configured')
    );

    const req = createRequest({
      body: { reviewText: 'Tolles Essen!' },
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await POST(req);

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error.code).toBe('API_NOT_CONFIGURED');
  });

  it('returns 500 on an unexpected generation error', async () => {
    mockGenerateReviewResponse.mockRejectedValue(new Error('boom'));

    const req = createRequest({
      body: { reviewText: 'Tolles Essen!' },
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe('INTERNAL_ERROR');
  });

  it('touches no database (no user/review/credit writes)', async () => {
    const req = createRequest({
      body: { reviewText: 'Tolles Essen!', rating: 5 },
      headers: { Authorization: `Bearer ${VALID_KEY}` },
    });
    await POST(req);

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.review.create).not.toHaveBeenCalled();
    expect(mockPrisma.brandVoice.create).not.toHaveBeenCalled();
    expect(mockPrisma.creditUsage.create).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
