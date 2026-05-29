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

// V2-shape brand_voices row (iter 6: legacy bridge deleted, route returns V2
// shape directly).
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
  responseLanguage: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Minimal valid V2 PUT body. Optional fields fall through to Zod defaults.
const validV2Body = {
  tone: 'friendly_professional',
};

describe('GET /api/brand-voice (V2)', () => {
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

  it('returns existing brand voice in V2 shape', async () => {
    mockPrisma.brandVoice.findUnique.mockResolvedValue(defaultBrandVoiceV2);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // V2 fields appear directly on the response (no legacy projection).
    expect(json.data.brandVoice.tone).toBe('friendly_professional');
    expect(json.data.brandVoice.styleGuidelines).toEqual(['Be genuine and empathetic']);
    expect(json.data.brandVoice.acknowledgeNamedStaff).toBe(true);
    expect(json.data.brandVoice.acknowledgeOccasions).toBe(true);
    expect(json.data.brandVoice.salutationPattern).toBe('Dear {firstName},');
    expect(json.data.brandVoice.signoffLines).toBe('Warmest regards,\nThe Team');
    expect(json.data.brandVoice.negativeReviewEmailEnabled).toBe(false);
    expect(json.data.brandVoice.negativeReviewFraming).toBe('investigation');
    expect(json.data.brandVoice.replyToEmail).toBeNull();
    // Response-language override defaults to null (the brand voice
    // follows the review's detected language unless explicitly pinned).
    expect(json.data.brandVoice.responseLanguage).toBeNull();

    // The legacy `formality` and `styleNotes` projections are gone.
    expect(json.data.brandVoice.formality).toBeUndefined();
    expect(json.data.brandVoice.styleNotes).toBeUndefined();
  });

  it('surfaces a non-null responseLanguage from the DB row', async () => {
    mockPrisma.brandVoice.findUnique.mockResolvedValue({
      ...defaultBrandVoiceV2,
      responseLanguage: 'English',
    });

    const res = await GET();
    const json = await res.json();

    expect(json.data.brandVoice.responseLanguage).toBe('English');
  });

  it('creates default brand voice with V2 tone if none exists', async () => {
    mockPrisma.brandVoice.findUnique.mockResolvedValue(null);
    mockPrisma.brandVoice.create.mockResolvedValue(defaultBrandVoiceV2);

    const res = await GET();

    expect(res.status).toBe(200);
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

describe('PUT /api/brand-voice (V2)', () => {
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
      body: validV2Body,
    });
    const res = await PUT(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 for invalid V2 tone', async () => {
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

  it('returns 400 for a legacy tone key (iter 6 dropped legacy support)', async () => {
    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: { tone: 'professional' },
    });
    const res = await PUT(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('upserts the brand voice directly in V2 shape', async () => {
    mockPrisma.brandVoice.upsert.mockResolvedValue(defaultBrandVoiceV2);

    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: {
        tone: 'warm_casual',
        keyPhrases: ['Thanks!', 'Cheers'],
        styleGuidelines: ['Rule one'],
        sampleResponses: [{ ratingContext: 5, responseText: 'Great visit!' }],
      },
    });
    const res = await PUT(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.brandVoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          tone: 'warm_casual',
          keyPhrases: ['Thanks!', 'Cheers'],
          styleGuidelines: ['Rule one'],
          sampleResponses: [{ ratingContext: 5, responseText: 'Great visit!' }],
        }),
      }),
    );
  });

  it('persists the V2 Contact & sign-off fields', async () => {
    mockPrisma.brandVoice.upsert.mockResolvedValue(defaultBrandVoiceV2);

    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: {
        tone: 'friendly_professional',
        acknowledgeNamedStaff: false,
        acknowledgeOccasions: false,
        salutationPattern: 'Hi {firstName},',
        signoffLines: 'Best,\nManagement',
        negativeReviewEmailEnabled: true,
        negativeReviewFraming: 'management_contact',
        replyToEmail: 'manager@brand.example',
      },
    });
    const res = await PUT(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.brandVoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          acknowledgeNamedStaff: false,
          acknowledgeOccasions: false,
          salutationPattern: 'Hi {firstName},',
          signoffLines: 'Best,\nManagement',
          negativeReviewEmailEnabled: true,
          negativeReviewFraming: 'management_contact',
          replyToEmail: 'manager@brand.example',
        }),
      }),
    );
  });

  it('rejects an invalid framing value', async () => {
    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: { tone: 'friendly_professional', negativeReviewFraming: 'apologetic' },
    });
    const res = await PUT(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns the upserted brand voice in V2 shape on success', async () => {
    mockPrisma.brandVoice.upsert.mockResolvedValue({
      ...defaultBrandVoiceV2,
      tone: 'polished_formal',
    });

    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: { tone: 'polished_formal' },
    });
    const res = await PUT(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.brandVoice.tone).toBe('polished_formal');
    // Confirm no legacy keys leak into the response.
    expect(json.data.brandVoice.formality).toBeUndefined();
    expect(json.data.brandVoice.styleNotes).toBeUndefined();
  });

  // Response-language override (default null = follow review detected
  // language). Routes through the same upsert as every other V2 field.
  it('persists a supported responseLanguage to both create and update branches', async () => {
    mockPrisma.brandVoice.upsert.mockResolvedValue({
      ...defaultBrandVoiceV2,
      responseLanguage: 'English',
    });

    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: { tone: 'friendly_professional', responseLanguage: 'English' },
    });
    const res = await PUT(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.brandVoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ responseLanguage: 'English' }),
        create: expect.objectContaining({ responseLanguage: 'English' }),
      }),
    );

    const json = await res.json();
    expect(json.data.brandVoice.responseLanguage).toBe('English');
  });

  it('persists responseLanguage = null when the field is omitted (default)', async () => {
    mockPrisma.brandVoice.upsert.mockResolvedValue(defaultBrandVoiceV2);

    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: { tone: 'friendly_professional' },
    });
    const res = await PUT(req);

    expect(res.status).toBe(200);
    expect(mockPrisma.brandVoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ responseLanguage: null }),
        create: expect.objectContaining({ responseLanguage: null }),
      }),
    );
  });

  it('rejects an unsupported responseLanguage (Klingon)', async () => {
    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: { tone: 'friendly_professional', responseLanguage: 'Klingon' },
    });
    const res = await PUT(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });
});
