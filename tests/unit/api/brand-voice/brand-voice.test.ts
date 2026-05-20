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

import { GET, PUT } from '@/app/api/brand-voice/route';

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

// V2-shape brand_voices row (iter 3 clean-reset). The route's GET/PUT
// project this back to the legacy form-friendly shape via `_legacy-bridge`,
// so the assertions below mostly check the projection.
const defaultBrandVoiceV2 = {
  id: 'bv1',
  userId: 'clu1234567890abcdef',
  tone: 'friendly_professional',
  keyPhrases: ['Thank you', 'We appreciate your feedback'],
  styleGuidelines: ['Be genuine and empathetic'],
  sampleResponses: [],
  acknowledgeNamedStaff: true,
  acknowledgeOccasions: true,
  salutationPattern: 'Dear {firstName},',
  signoffLines: 'Warmest regards,\nThe Team',
  negativeReviewEmailEnabled: false,
  negativeReviewFraming: 'investigation',
  negativeReviewFramingCustom: null,
  replyToEmail: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GET /api/brand-voice', () => {
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

  it('returns existing brand voice projected to the legacy form shape', async () => {
    mockPrisma.brandVoice.findUnique.mockResolvedValue(defaultBrandVoiceV2);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    // friendly_professional V2 key projects back to "professional" for the
    // legacy form's tone selector (see V2_TO_LEGACY_TONE in _legacy-bridge.ts).
    expect(json.data.brandVoice.tone).toBe('professional');
    // Formality column is dropped; bridge stubs at 3 so the legacy form
    // displays "Balanced" without blowing up.
    expect(json.data.brandVoice.formality).toBe(3);
    // styleGuidelines (V2 string[]) is re-serialised as a JSON-stringified
    // array on `styleNotes` so the form's `styleNotesToArray` can parse it.
    expect(json.data.brandVoice.styleNotes).toBe(
      JSON.stringify(['Be genuine and empathetic']),
    );
  });

  it('creates default brand voice with V2 shape if none exists', async () => {
    mockPrisma.brandVoice.findUnique.mockResolvedValue(null);
    mockPrisma.brandVoice.create.mockResolvedValue(defaultBrandVoiceV2);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockPrisma.brandVoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockSession.user.id,
          tone: 'friendly_professional',
        }),
      })
    );
  });
});

describe('PUT /api/brand-voice', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(mockSession);
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
      fn(mockPrisma)
    );
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: { tone: 'friendly' },
    });
    const res = await PUT(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 for invalid tone', async () => {
    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: { tone: 'aggressive' },
    });
    const res = await PUT(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for formality out of range', async () => {
    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: { formality: 10 },
    });
    const res = await PUT(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('upserts brand voice and translates legacy payload to V2 column writes', async () => {
    const upsertedRow = {
      ...defaultBrandVoiceV2,
      tone: 'friendly_professional',
    };
    mockPrisma.brandVoice.upsert.mockResolvedValue(upsertedRow);

    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: { tone: 'friendly', formality: 4 },
    });
    const res = await PUT(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    // Legacy "friendly" payload → V2 "friendly_professional" column write.
    expect(mockPrisma.brandVoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ tone: 'friendly_professional' }),
        create: expect.objectContaining({ tone: 'friendly_professional' }),
      }),
    );
  });

  it('round-trips through the bridge: legacy "casual" → V2 "warm_casual" → legacy "casual"', async () => {
    // Form sends legacy "casual"; bridge writes V2 "warm_casual"; the mock
    // returns the V2 row; bridge projects back to "casual" for the form.
    mockPrisma.brandVoice.upsert.mockResolvedValue({
      ...defaultBrandVoiceV2,
      tone: 'warm_casual',
      keyPhrases: ['Thanks!', 'Cheers'],
    });

    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: { tone: 'casual', formality: 2, keyPhrases: ['Thanks!', 'Cheers'] },
    });
    const res = await PUT(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.brandVoice.tone).toBe('casual');
    expect(json.data.brandVoice.keyPhrases).toEqual(['Thanks!', 'Cheers']);
    // The V2 column actually written was "warm_casual".
    expect(mockPrisma.brandVoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ tone: 'warm_casual' }),
      }),
    );
  });

  it('converts legacy styleNotes (JSON-stringified array) to V2 styleGuidelines string[]', async () => {
    mockPrisma.brandVoice.upsert.mockResolvedValue({
      ...defaultBrandVoiceV2,
      styleGuidelines: ['Rule one', 'Rule two'],
    });

    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: {
        tone: 'professional',
        formality: 3,
        styleNotes: JSON.stringify(['Rule one', 'Rule two']),
      },
    });
    const res = await PUT(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.brandVoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          styleGuidelines: ['Rule one', 'Rule two'],
        }),
      }),
    );
  });

  it('wraps legacy sampleResponses string[] as {ratingContext:"any", responseText} objects', async () => {
    mockPrisma.brandVoice.upsert.mockResolvedValue({
      ...defaultBrandVoiceV2,
      sampleResponses: [
        { ratingContext: 'any', responseText: 'Thanks!' },
        { ratingContext: 'any', responseText: 'Cheers' },
      ],
    });

    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: {
        tone: 'professional',
        formality: 3,
        sampleResponses: ['Thanks!', 'Cheers'],
      },
    });
    const res = await PUT(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.brandVoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          sampleResponses: [
            { ratingContext: 'any', responseText: 'Thanks!' },
            { ratingContext: 'any', responseText: 'Cheers' },
          ],
        }),
      }),
    );
  });
});
