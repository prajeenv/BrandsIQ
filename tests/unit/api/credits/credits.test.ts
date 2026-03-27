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

import { GET } from '@/app/api/credits/route';

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

describe('GET /api/credits', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(mockSession);
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
      fn(mockPrisma)
    );
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest('/api/credits');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 404 when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = createRequest('/api/credits');
    const res = await GET(req);

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns credit balance with tier limits', async () => {
    const resetDate = new Date('2026-02-15T00:00:00Z');
    const sentimentResetDate = new Date('2026-02-15T00:00:00Z');

    mockPrisma.user.findUnique.mockResolvedValue({
      id: mockSession.user.id,
      tier: 'FREE',
      credits: 12,
      creditsResetDate: resetDate,
      sentimentCredits: 30,
      sentimentResetDate: sentimentResetDate,
    });

    const req = createRequest('/api/credits');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.credits.remaining).toBe(12);
    expect(json.data.credits.total).toBe(15);
    expect(json.data.tier).toBe('FREE');
  });

  it('calculates used credits correctly', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: mockSession.user.id,
      tier: 'FREE',
      credits: 12,
      creditsResetDate: new Date(),
      sentimentCredits: 30,
      sentimentResetDate: new Date(),
    });

    const req = createRequest('/api/credits');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    // FREE tier: total=15, remaining=12, used=3
    expect(json.data.credits.used).toBe(3);
  });

  it('includes sentiment quota info', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: mockSession.user.id,
      tier: 'FREE',
      credits: 12,
      creditsResetDate: new Date(),
      sentimentCredits: 30,
      sentimentResetDate: new Date(),
    });

    const req = createRequest('/api/credits');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.sentiment).toBeDefined();
    expect(json.data.sentiment.remaining).toBe(30);
    expect(json.data.sentiment.total).toBe(35);
    expect(json.data.sentiment.used).toBe(5);
  });
});
