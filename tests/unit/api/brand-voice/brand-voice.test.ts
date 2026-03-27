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

  it('returns existing brand voice', async () => {
    mockPrisma.brandVoice.findUnique.mockResolvedValue(defaultBrandVoice);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.brandVoice.tone).toBe('professional');
    expect(json.data.brandVoice.formality).toBe(3);
  });

  it('creates default brand voice if none exists', async () => {
    mockPrisma.brandVoice.findUnique.mockResolvedValue(null);
    mockPrisma.brandVoice.create.mockResolvedValue(defaultBrandVoice);

    const res = await GET();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockPrisma.brandVoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockSession.user.id,
          tone: 'professional',
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

  it('upserts brand voice successfully', async () => {
    const updatedBrandVoice = {
      ...defaultBrandVoice,
      tone: 'friendly',
      formality: 4,
    };
    mockPrisma.brandVoice.upsert.mockResolvedValue(updatedBrandVoice);

    const req = createRequest('/api/brand-voice', {
      method: 'PUT',
      body: { tone: 'friendly', formality: 4 },
    });
    const res = await PUT(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockPrisma.brandVoice.upsert).toHaveBeenCalled();
  });

  it('returns updated brand voice data', async () => {
    const updatedBrandVoice = {
      ...defaultBrandVoice,
      tone: 'casual',
      keyPhrases: ['Thanks!', 'Cheers'],
    };
    mockPrisma.brandVoice.upsert.mockResolvedValue(updatedBrandVoice);

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
  });
});
