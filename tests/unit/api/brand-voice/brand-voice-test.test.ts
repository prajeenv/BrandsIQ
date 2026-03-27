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
const mockGenerateReviewResponse = vi.hoisted(() => vi.fn());
const mockDetectLanguage = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/ai/claude', () => ({
  generateReviewResponse: mockGenerateReviewResponse,
  DEFAULT_MODEL: 'claude-sonnet-4-20250514',
}));
vi.mock('@/lib/language-detection', () => ({
  detectLanguage: mockDetectLanguage,
}));

import { POST } from '@/app/api/brand-voice/test/route';

function createRequest(
  url: string,
  opts?: { method?: string; body?: unknown; searchParams?: Record<string, string> }
): Request {
  const u = new URL(url, 'http://localhost:3000');
  if (opts?.searchParams)
    for (const [k, v] of Object.entries(opts.searchParams)) u.searchParams.set(k, v);
  return new Request(u.toString(), {
    method: opts?.method || 'GET',
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

const defaultBrandVoice = {
  id: 'bv1',
  userId: 'clu1234567890abcdef',
  tone: 'professional',
  formality: 3,
  keyPhrases: ['Thank you', 'We appreciate your feedback'],
  styleNotes: 'Be genuine and empathetic',
  sampleResponses: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/brand-voice/test', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(mockSession);
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
      fn(mockPrisma)
    );
    mockGenerateReviewResponse.mockResolvedValue({
      responseText: 'Thank you for your wonderful feedback! We truly appreciate it.',
      model: 'claude-sonnet-4-20250514',
    });
    mockDetectLanguage.mockReturnValue({
      language: 'English',
      confidence: 'high',
      code: 'eng',
      isRTL: false,
    });
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest('/api/brand-voice/test', {
      method: 'POST',
      body: { reviewText: 'Great product!' },
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 for missing reviewText', async () => {
    const req = createRequest('/api/brand-voice/test', {
      method: 'POST',
      body: {},
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 with test response, isTestMode=true, creditsUsed=0', async () => {
    mockPrisma.brandVoice.findUnique.mockResolvedValue(defaultBrandVoice);

    const req = createRequest('/api/brand-voice/test', {
      method: 'POST',
      body: { reviewText: 'Amazing service! Will come back again.' },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.response.isTestMode).toBe(true);
    expect(json.data.response.creditsUsed).toBe(0);
    expect(json.data.response.responseText).toBeDefined();
  });

  it('creates default brand voice if none exists', async () => {
    mockPrisma.brandVoice.findUnique.mockResolvedValue(null);
    mockPrisma.brandVoice.create.mockResolvedValue(defaultBrandVoice);

    const req = createRequest('/api/brand-voice/test', {
      method: 'POST',
      body: { reviewText: 'Great service, loved it!' },
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockPrisma.brandVoice.create).toHaveBeenCalled();
  });

  it('returns 503 when AI API is not configured', async () => {
    mockPrisma.brandVoice.findUnique.mockResolvedValue(defaultBrandVoice);
    mockGenerateReviewResponse.mockRejectedValue(new Error('ANTHROPIC_API_KEY is not configured'));

    const req = createRequest('/api/brand-voice/test', {
      method: 'POST',
      body: { reviewText: 'Great product, highly recommend!' },
    });
    const res = await POST(req);

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('does not deduct credits', async () => {
    mockPrisma.brandVoice.findUnique.mockResolvedValue(defaultBrandVoice);

    const req = createRequest('/api/brand-voice/test', {
      method: 'POST',
      body: { reviewText: 'Wonderful experience at this restaurant!' },
    });
    await POST(req);

    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.creditUsage.create).not.toHaveBeenCalled();
  });
});
