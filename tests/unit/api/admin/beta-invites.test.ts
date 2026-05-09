import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => {
  const m = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  });
  return {
    betaInviteLink: m(),
  };
});

const mockAuth = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

const FOUNDER_EMAIL = 'founder@brandsiq.app';
const NON_FOUNDER_EMAIL = 'random@example.com';

const founderSession = {
  user: { id: 'u-founder', email: FOUNDER_EMAIL, name: 'Founder' },
};
const nonFounderSession = {
  user: { id: 'u-other', email: NON_FOUNDER_EMAIL, name: 'Other' },
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FOUNDER_EMAILS = FOUNDER_EMAIL;
});

describe('POST /api/admin/beta-invites', () => {
  it('returns 404 when caller is unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    const { POST } = await import('@/app/api/admin/beta-invites/route');

    const req = new Request('http://localhost/api/admin/beta-invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when caller is authenticated but not a founder', async () => {
    mockAuth.mockResolvedValue(nonFounderSession);
    const { POST } = await import('@/app/api/admin/beta-invites/route');

    const req = new Request('http://localhost/api/admin/beta-invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('creates an invite with 60-day expiry when caller is a founder', async () => {
    mockAuth.mockResolvedValue(founderSession);
    mockPrisma.betaInviteLink.create.mockImplementation(async ({ data }: { data: { code: string; notes: string | null; expiresAt: Date } }) => ({
      id: 'inv-1',
      code: data.code,
      notes: data.notes,
      createdAt: new Date('2026-05-09T00:00:00Z'),
      expiresAt: data.expiresAt,
    }));
    const { POST } = await import('@/app/api/admin/beta-invites/route');

    const req = new Request('http://localhost/api/admin/beta-invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'Sent to @cafe_arabica' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.invite.code).toMatch(/^[A-Za-z0-9_-]{16}$/);
    expect(json.data.invite.notes).toBe('Sent to @cafe_arabica');
    expect(json.data.invite.url).toContain('/auth/signup?b=');

    // Verify that create was called with the same code embedded in the URL
    const createCall = mockPrisma.betaInviteLink.create.mock.calls[0][0];
    expect(createCall.data.code).toBe(json.data.invite.code);
    // 60-day expiry
    const expiresAt = new Date(createCall.data.expiresAt);
    const diffDays = Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(59);
    expect(diffDays).toBeLessThanOrEqual(61);
  });

  it('handles empty body', async () => {
    mockAuth.mockResolvedValue(founderSession);
    mockPrisma.betaInviteLink.create.mockResolvedValue({
      id: 'inv-2',
      code: 'abc123',
      notes: null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });
    const { POST } = await import('@/app/api/admin/beta-invites/route');

    const req = new Request('http://localhost/api/admin/beta-invites', {
      method: 'POST',
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});

describe('GET /api/admin/beta-invites', () => {
  it('returns 404 for non-founders', async () => {
    mockAuth.mockResolvedValue(nonFounderSession);
    const { GET } = await import('@/app/api/admin/beta-invites/route');

    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('lists invites with derived status (active/used/expired)', async () => {
    mockAuth.mockResolvedValue(founderSession);
    const now = new Date();
    const past = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    mockPrisma.betaInviteLink.findMany.mockResolvedValue([
      // Active
      { id: 'a', code: 'AAAA', notes: null, createdAt: now, expiresAt: future, usedAt: null, usedByUserId: null, usedBy: null },
      // Used
      { id: 'b', code: 'BBBB', notes: null, createdAt: now, expiresAt: future, usedAt: now, usedByUserId: 'u1', usedBy: { id: 'u1', email: 'u1@e.com', name: 'U' } },
      // Expired
      { id: 'c', code: 'CCCC', notes: null, createdAt: now, expiresAt: past, usedAt: null, usedByUserId: null, usedBy: null },
    ]);
    const { GET } = await import('@/app/api/admin/beta-invites/route');

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.invites).toHaveLength(3);
    const byCode = Object.fromEntries(json.data.invites.map((i: { code: string; status: string }) => [i.code, i.status]));
    expect(byCode.AAAA).toBe('active');
    expect(byCode.BBBB).toBe('used');
    expect(byCode.CCCC).toBe('expired');
  });
});
