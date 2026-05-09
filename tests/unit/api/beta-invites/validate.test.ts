import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  betaInviteLink: {
    findUnique: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

// Helper to invoke the route handler with the Next.js 15 promise-params shape.
async function callValidate(code: string) {
  const { GET } = await import('@/app/api/beta-invites/[code]/validate/route');
  const req = new Request(`http://localhost/api/beta-invites/${code}/validate`);
  return GET(req, { params: Promise.resolve({ code }) });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/beta-invites/[code]/validate', () => {
  it('returns valid=true for a fresh, unused, unexpired code', async () => {
    mockPrisma.betaInviteLink.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      usedAt: null,
    });

    const res = await callValidate('GOOD-CODE');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual({ valid: true, expired: false, used: false, exists: true });
  });

  it('returns used=true valid=false for a used code', async () => {
    mockPrisma.betaInviteLink.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      usedAt: new Date(),
    });

    const res = await callValidate('USED-CODE');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual({ valid: false, expired: false, used: true, exists: true });
  });

  it('returns expired=true valid=false for an expired code', async () => {
    mockPrisma.betaInviteLink.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });

    const res = await callValidate('OLD-CODE');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual({ valid: false, expired: true, used: false, exists: true });
  });

  it('returns exists=false for an unknown code (no PII leak)', async () => {
    mockPrisma.betaInviteLink.findUnique.mockResolvedValue(null);

    const res = await callValidate('NOT-A-REAL-CODE');
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual({ valid: false, expired: false, used: false, exists: false });
  });

  it('rejects codes longer than 64 chars without hitting the DB', async () => {
    const longCode = 'a'.repeat(65);
    const res = await callValidate(longCode);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.valid).toBe(false);
    expect(json.data.exists).toBe(false);
    expect(mockPrisma.betaInviteLink.findUnique).not.toHaveBeenCalled();
  });
});
