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

import { POST, DELETE } from '@/app/api/reviews/[id]/publish/route';

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

function routeParams(p: Record<string, string>) {
  return { params: Promise.resolve(p) };
}

describe('POST /api/reviews/[id]/publish', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(mockSession);
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
      fn(mockPrisma)
    );
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest('/api/reviews/rev1/publish', { method: 'POST' });
    const res = await POST(req, routeParams({ id: 'rev1' }));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 404 for non-existent review', async () => {
    mockPrisma.review.findFirst.mockResolvedValue(null);

    const req = createRequest('/api/reviews/rev1/publish', { method: 'POST' });
    const res = await POST(req, routeParams({ id: 'rev1' }));

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 when no response exists', async () => {
    mockPrisma.review.findFirst.mockResolvedValue({
      id: 'rev1',
      userId: mockSession.user.id,
      response: null,
    });

    const req = createRequest('/api/reviews/rev1/publish', { method: 'POST' });
    const res = await POST(req, routeParams({ id: 'rev1' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 when already published', async () => {
    mockPrisma.review.findFirst.mockResolvedValue({
      id: 'rev1',
      userId: mockSession.user.id,
      response: { id: 'resp1', isPublished: true },
    });

    const req = createRequest('/api/reviews/rev1/publish', { method: 'POST' });
    const res = await POST(req, routeParams({ id: 'rev1' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 200 and sets isPublished=true on success', async () => {
    const now = new Date();
    const updatedResponse = {
      id: 'resp1',
      reviewId: 'rev1',
      responseText: 'Thank you for your feedback!',
      isPublished: true,
      publishedAt: now,
      isEdited: false,
      toneUsed: 'professional',
      createdAt: now,
      updatedAt: now,
    };

    mockPrisma.review.findFirst.mockResolvedValue({
      id: 'rev1',
      userId: mockSession.user.id,
      response: { id: 'resp1', isPublished: false },
    });
    mockPrisma.reviewResponse.update.mockResolvedValue(updatedResponse);

    const req = createRequest('/api/reviews/rev1/publish', { method: 'POST' });
    const res = await POST(req, routeParams({ id: 'rev1' }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockPrisma.reviewResponse.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'resp1' },
        data: expect.objectContaining({ isPublished: true }),
      })
    );
  });
});

describe('DELETE /api/reviews/[id]/publish', () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue(mockSession);
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
      fn(mockPrisma)
    );
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const req = createRequest('/api/reviews/rev1/publish', { method: 'DELETE' });
    const res = await DELETE(req, routeParams({ id: 'rev1' }));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 404 for non-existent review', async () => {
    mockPrisma.review.findFirst.mockResolvedValue(null);

    const req = createRequest('/api/reviews/rev1/publish', { method: 'DELETE' });
    const res = await DELETE(req, routeParams({ id: 'rev1' }));

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 when no response exists', async () => {
    mockPrisma.review.findFirst.mockResolvedValue({
      id: 'rev1',
      userId: mockSession.user.id,
      response: null,
    });

    const req = createRequest('/api/reviews/rev1/publish', { method: 'DELETE' });
    const res = await DELETE(req, routeParams({ id: 'rev1' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 when not published', async () => {
    mockPrisma.review.findFirst.mockResolvedValue({
      id: 'rev1',
      userId: mockSession.user.id,
      response: { id: 'resp1', isPublished: false },
    });

    const req = createRequest('/api/reviews/rev1/publish', { method: 'DELETE' });
    const res = await DELETE(req, routeParams({ id: 'rev1' }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 200 and sets isPublished=false on success', async () => {
    const now = new Date();
    const updatedResponse = {
      id: 'resp1',
      reviewId: 'rev1',
      responseText: 'Thank you for your feedback!',
      isPublished: false,
      publishedAt: null,
      isEdited: false,
      toneUsed: 'professional',
      createdAt: now,
      updatedAt: now,
    };

    mockPrisma.review.findFirst.mockResolvedValue({
      id: 'rev1',
      userId: mockSession.user.id,
      response: { id: 'resp1', isPublished: true },
    });
    mockPrisma.reviewResponse.update.mockResolvedValue(updatedResponse);

    const req = createRequest('/api/reviews/rev1/publish', { method: 'DELETE' });
    const res = await DELETE(req, routeParams({ id: 'rev1' }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockPrisma.reviewResponse.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'resp1' },
        data: expect.objectContaining({ isPublished: false }),
      })
    );
  });
});
