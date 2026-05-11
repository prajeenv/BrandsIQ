import { describe, it, expect, vi, beforeEach } from 'vitest';

// MVP Phase 1 iteration 2: admin founder-inquiries routes.
// GET /api/admin/founder-inquiries — list with pagination + filters
// PATCH /api/admin/founder-inquiries/[id] — toggle resolved + set notes

const mockPrisma = vi.hoisted(() => ({
  founderInquiry: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  // Mimic prisma.$transaction so we can pass an array of promises and have
  // them resolved together (Promise.all under the hood) — used by GET.
  $transaction: vi.fn(),
}));

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

describe('GET /api/admin/founder-inquiries', () => {
  it('returns 404 for unauthenticated callers', async () => {
    mockAuth.mockResolvedValue(null);
    const { GET } = await import('@/app/api/admin/founder-inquiries/route');

    const res = await GET(new Request('http://localhost/api/admin/founder-inquiries'));
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-founders', async () => {
    mockAuth.mockResolvedValue(nonFounderSession);
    const { GET } = await import('@/app/api/admin/founder-inquiries/route');

    const res = await GET(new Request('http://localhost/api/admin/founder-inquiries'));
    expect(res.status).toBe(404);
  });

  it('returns paginated inquiries with default filters', async () => {
    mockAuth.mockResolvedValue(founderSession);
    mockPrisma.founderInquiry.findMany.mockResolvedValue([
      {
        id: 'inq-1',
        type: 'beta_request',
        source: 'pricing',
        submitterName: 'A',
        submitterEmail: 'a@example.com',
        businessName: null,
        message: 'I want beta access.',
        createdAt: new Date('2026-05-11T10:00:00Z'),
        resolvedAt: null,
        founderNotes: null,
        user: null,
      },
    ]);
    mockPrisma.founderInquiry.count.mockResolvedValue(1);

    const { GET } = await import('@/app/api/admin/founder-inquiries/route');
    const res = await GET(new Request('http://localhost/api/admin/founder-inquiries'));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.inquiries).toHaveLength(1);
    expect(json.data.inquiries[0].id).toBe('inq-1');
    expect(json.data.pagination.page).toBe(1);
    expect(json.data.pagination.totalCount).toBe(1);
  });

  it('applies type filter when supplied', async () => {
    mockAuth.mockResolvedValue(founderSession);
    mockPrisma.founderInquiry.findMany.mockResolvedValue([]);
    mockPrisma.founderInquiry.count.mockResolvedValue(0);

    const { GET } = await import('@/app/api/admin/founder-inquiries/route');
    await GET(new Request('http://localhost/api/admin/founder-inquiries?type=more_credits'));

    expect(mockPrisma.founderInquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'more_credits' }),
      }),
    );
  });

  it('applies resolved=true filter', async () => {
    mockAuth.mockResolvedValue(founderSession);
    mockPrisma.founderInquiry.findMany.mockResolvedValue([]);
    mockPrisma.founderInquiry.count.mockResolvedValue(0);

    const { GET } = await import('@/app/api/admin/founder-inquiries/route');
    await GET(new Request('http://localhost/api/admin/founder-inquiries?resolved=true'));

    expect(mockPrisma.founderInquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ resolvedAt: { not: null } }),
      }),
    );
  });

  it('applies resolved=false filter', async () => {
    mockAuth.mockResolvedValue(founderSession);
    mockPrisma.founderInquiry.findMany.mockResolvedValue([]);
    mockPrisma.founderInquiry.count.mockResolvedValue(0);

    const { GET } = await import('@/app/api/admin/founder-inquiries/route');
    await GET(new Request('http://localhost/api/admin/founder-inquiries?resolved=false'));

    expect(mockPrisma.founderInquiry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ resolvedAt: null }),
      }),
    );
  });

  it('rejects invalid pagination params with 400', async () => {
    mockAuth.mockResolvedValue(founderSession);

    const { GET } = await import('@/app/api/admin/founder-inquiries/route');
    const res = await GET(
      new Request('http://localhost/api/admin/founder-inquiries?limit=99999'),
    );

    expect(res.status).toBe(400);
    expect(mockPrisma.founderInquiry.findMany).not.toHaveBeenCalled();
  });

  it('ignores unknown type filter values rather than 400-ing', async () => {
    // The route validates against FOUNDER_INQUIRY_TYPES and skips the filter
    // if the param doesn't match — empty type filter, not validation error.
    mockAuth.mockResolvedValue(founderSession);
    mockPrisma.founderInquiry.findMany.mockResolvedValue([]);
    mockPrisma.founderInquiry.count.mockResolvedValue(0);

    const { GET } = await import('@/app/api/admin/founder-inquiries/route');
    const res = await GET(
      new Request('http://localhost/api/admin/founder-inquiries?type=nonsense'),
    );

    expect(res.status).toBe(200);
    const whereArg = mockPrisma.founderInquiry.findMany.mock.calls[0][0].where;
    expect(whereArg.type).toBeUndefined();
  });
});

describe('PATCH /api/admin/founder-inquiries/[id]', () => {
  function makeParams(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  it('returns 404 for non-founders', async () => {
    mockAuth.mockResolvedValue(nonFounderSession);
    const { PATCH } = await import('@/app/api/admin/founder-inquiries/[id]/route');

    const req = new Request('http://localhost/api/admin/founder-inquiries/inq-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: true }),
    });
    const res = await PATCH(req, makeParams('inq-1'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when the inquiry does not exist', async () => {
    mockAuth.mockResolvedValue(founderSession);
    mockPrisma.founderInquiry.findUnique.mockResolvedValue(null);

    const { PATCH } = await import('@/app/api/admin/founder-inquiries/[id]/route');
    const req = new Request('http://localhost/api/admin/founder-inquiries/missing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: true }),
    });
    const res = await PATCH(req, makeParams('missing'));
    expect(res.status).toBe(404);
    expect(mockPrisma.founderInquiry.update).not.toHaveBeenCalled();
  });

  it('marks an inquiry resolved with notes', async () => {
    mockAuth.mockResolvedValue(founderSession);
    mockPrisma.founderInquiry.findUnique.mockResolvedValue({ id: 'inq-1' });
    mockPrisma.founderInquiry.update.mockResolvedValue({
      id: 'inq-1',
      type: 'beta_request',
      resolvedAt: new Date(),
      founderNotes: 'Granted access',
    });

    const { PATCH } = await import('@/app/api/admin/founder-inquiries/[id]/route');
    const req = new Request('http://localhost/api/admin/founder-inquiries/inq-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: true, founderNotes: 'Granted access' }),
    });
    const res = await PATCH(req, makeParams('inq-1'));

    expect(res.status).toBe(200);
    expect(mockPrisma.founderInquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inq-1' },
        data: expect.objectContaining({
          resolvedAt: expect.any(Date),
          founderNotes: 'Granted access',
        }),
      }),
    );
  });

  it('re-opens a resolved inquiry when resolved=false', async () => {
    mockAuth.mockResolvedValue(founderSession);
    mockPrisma.founderInquiry.findUnique.mockResolvedValue({ id: 'inq-1' });
    mockPrisma.founderInquiry.update.mockResolvedValue({ id: 'inq-1' });

    const { PATCH } = await import('@/app/api/admin/founder-inquiries/[id]/route');
    const req = new Request('http://localhost/api/admin/founder-inquiries/inq-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: false }),
    });
    const res = await PATCH(req, makeParams('inq-1'));

    expect(res.status).toBe(200);
    expect(mockPrisma.founderInquiry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resolvedAt: null,
        }),
      }),
    );
  });

  it('sets only notes when resolved field is absent', async () => {
    mockAuth.mockResolvedValue(founderSession);
    mockPrisma.founderInquiry.findUnique.mockResolvedValue({ id: 'inq-1' });
    mockPrisma.founderInquiry.update.mockResolvedValue({ id: 'inq-1' });

    const { PATCH } = await import('@/app/api/admin/founder-inquiries/[id]/route');
    const req = new Request('http://localhost/api/admin/founder-inquiries/inq-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founderNotes: 'Just a note, leave resolved status alone' }),
    });
    const res = await PATCH(req, makeParams('inq-1'));

    expect(res.status).toBe(200);
    const data = mockPrisma.founderInquiry.update.mock.calls[0][0].data;
    expect(data.founderNotes).toBe('Just a note, leave resolved status alone');
    // resolvedAt should NOT be in the update payload — we only touch what's
    // explicitly in the body
    expect('resolvedAt' in data).toBe(false);
  });

  it('allows clearing notes by passing null', async () => {
    mockAuth.mockResolvedValue(founderSession);
    mockPrisma.founderInquiry.findUnique.mockResolvedValue({ id: 'inq-1' });
    mockPrisma.founderInquiry.update.mockResolvedValue({ id: 'inq-1' });

    const { PATCH } = await import('@/app/api/admin/founder-inquiries/[id]/route');
    const req = new Request('http://localhost/api/admin/founder-inquiries/inq-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founderNotes: null }),
    });
    const res = await PATCH(req, makeParams('inq-1'));

    expect(res.status).toBe(200);
    expect(mockPrisma.founderInquiry.update.mock.calls[0][0].data.founderNotes).toBeNull();
  });
});
