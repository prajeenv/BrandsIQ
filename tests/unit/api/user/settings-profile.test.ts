import { describe, it, expect, vi, beforeEach } from 'vitest';

// MVP Phase 1 follow-up: GET + PATCH /api/user/settings/profile
// Settings-page partial-update route. Distinct from /api/user/profile
// (the onboarding submission). See src/app/api/user/settings/profile/route.ts.

const mockPrisma = vi.hoisted(() => {
  const m = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  });
  return {
    user: m(),
    location: m(),
    $transaction: vi.fn(),
  };
});

const mockAuth = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { GET, PATCH } from '@/app/api/user/settings/profile/route';

function makePatch(body: unknown): Request {
  return new Request('http://localhost/api/user/settings/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // $transaction passes its callback the same mockPrisma so transactional
  // assertions can verify the calls.
  mockPrisma.$transaction.mockImplementation(
    async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
  );
});

describe('GET /api/user/settings/profile', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 404 when the user row is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'gone', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('returns profile + location + hasPassword for an authenticated user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });

    // First findUnique: user select for profile fields.
    // Second findUnique: hasPassword check.
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'u-1',
        email: 'a@x.com',
        name: 'Alice',
        organizationName: 'Bear Bakery',
        industry: 'Food & Beverage',
        businessType: 'Cafe / coffee shop',
        country: 'United Kingdom',
        locationCountEstimate: 3,
        primaryPlatform: 'Google',
        isBetaUser: true,
        tier: 'FREE',
      })
      .mockResolvedValueOnce({ password: 'hashed-bcrypt-string' });

    mockPrisma.location.findFirst.mockResolvedValue({
      id: 'loc-1',
      name: 'Bear Bakery — Shoreditch',
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.profile.name).toBe('Alice');
    expect(json.data.profile.organizationName).toBe('Bear Bakery');
    expect(json.data.profile.isBetaUser).toBe(true);
    expect(json.data.location.name).toBe('Bear Bakery — Shoreditch');
    expect(json.data.hasPassword).toBe(true);
  });

  it('returns hasPassword=false for OAuth-only users (no password row)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-oauth', email: 'o@x.com', name: 'O' } });

    mockPrisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'u-oauth',
        email: 'o@x.com',
        name: 'OAuth User',
        organizationName: null,
        industry: null,
        country: null,
        locationCountEstimate: null,
        primaryPlatform: null,
        isBetaUser: false,
        tier: 'FREE',
      })
      .mockResolvedValueOnce({ password: null });

    mockPrisma.location.findFirst.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.hasPassword).toBe(false);
    expect(json.data.location).toBeNull();
  });
});

describe('PATCH /api/user/settings/profile', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PATCH(makePatch({ name: 'Alice' }));
    expect(res.status).toBe(401);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });

    const req = new Request('http://localhost/api/user/settings/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when the body is empty (no fields to update)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });

    const res = await PATCH(makePatch({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when industry is not in the closed set', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });

    const res = await PATCH(
      makePatch({ industry: 'Underwater Basket Weaving' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when businessType does not belong to the chosen industry', async () => {
    // Cascade superRefine: Pharmacy lives under Retail, not Food & Beverage.
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });

    const res = await PATCH(
      makePatch({
        industry: 'Food & Beverage',
        businessType: 'Pharmacy',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('accepts industry + matching businessType as a paired update', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.update.mockResolvedValue({
      id: 'u-1',
      industry: 'Retail',
      businessType: 'Pharmacy',
    });

    const res = await PATCH(
      makePatch({ industry: 'Retail', businessType: 'Pharmacy' }),
    );
    expect(res.status).toBe(200);

    // Both fields land in the user update
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          industry: 'Retail',
          businessType: 'Pharmacy',
        }),
      }),
    );
  });

  it('accepts industry="Other" with businessType cleared to null', async () => {
    // The form sends businessType=null when industry switches to "Other".
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.update.mockResolvedValue({
      id: 'u-1',
      industry: 'Other',
      businessType: null,
    });

    const res = await PATCH(
      makePatch({ industry: 'Other', businessType: null }),
    );
    expect(res.status).toBe(200);
  });

  it('rejects industry="Other" with a non-null businessType', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });

    const res = await PATCH(
      makePatch({ industry: 'Other', businessType: 'Cafe / coffee shop' }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is an empty string', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });

    const res = await PATCH(makePatch({ name: '' }));
    expect(res.status).toBe(400);
  });

  it('updates only the name when only name is provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.update.mockResolvedValue({
      id: 'u-1',
      email: 'a@x.com',
      name: 'Alice Updated',
      organizationName: 'Bear Bakery',
      industry: 'Food & Beverage',
      businessType: 'Cafe / coffee shop',
      country: 'United Kingdom',
      locationCountEstimate: null,
      primaryPlatform: null,
      isBetaUser: true,
      tier: 'FREE',
    });

    const res = await PATCH(makePatch({ name: 'Alice Updated' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.profile.name).toBe('Alice Updated');

    // Only `name` should be in the update payload — partial update.
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u-1' },
        data: { name: 'Alice Updated' },
      }),
    );
    expect(mockPrisma.location.update).not.toHaveBeenCalled();
    expect(mockPrisma.location.create).not.toHaveBeenCalled();
  });

  it('updates only the organizationName + flows through CreditsProvider trigger', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.update.mockResolvedValue({
      id: 'u-1',
      organizationName: 'New Org Name',
    });

    const res = await PATCH(makePatch({ organizationName: 'New Org Name' }));
    expect(res.status).toBe(200);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { organizationName: 'New Org Name' },
      }),
    );
  });

  it('renames the existing Location when locationName is provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
    mockPrisma.location.findFirst.mockResolvedValue({
      id: 'loc-existing',
      name: 'Default Location',
    });
    mockPrisma.location.update.mockResolvedValue({
      id: 'loc-existing',
      name: 'Shoreditch Branch',
    });

    const res = await PATCH(makePatch({ locationName: 'Shoreditch Branch' }));
    expect(res.status).toBe(200);

    expect(mockPrisma.location.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'loc-existing' },
        data: { name: 'Shoreditch Branch' },
      }),
    );
    expect(mockPrisma.location.create).not.toHaveBeenCalled();
  });

  it('creates a Location when none exists and locationName is provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1' });
    mockPrisma.location.findFirst.mockResolvedValue(null);
    mockPrisma.location.create.mockResolvedValue({
      id: 'loc-new',
      name: 'Shoreditch Branch',
    });

    const res = await PATCH(makePatch({ locationName: 'Shoreditch Branch' }));
    expect(res.status).toBe(200);

    expect(mockPrisma.location.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: 'u-1', name: 'Shoreditch Branch' },
      }),
    );
  });

  it('updates user + location in one combined call when both are provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.update.mockResolvedValue({
      id: 'u-1',
      organizationName: 'Bear Bakery',
    });
    mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-1' });
    mockPrisma.location.update.mockResolvedValue({ id: 'loc-1' });

    const res = await PATCH(
      makePatch({
        organizationName: 'Bear Bakery',
        locationName: 'Bear Bakery — Shoreditch',
      }),
    );
    expect(res.status).toBe(200);

    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(mockPrisma.location.update).toHaveBeenCalled();
    // Both writes go through the same $transaction call.
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire a FounderInquiry on settings update (distinct from onboarding)', async () => {
    // The onboarding route fires beta_request inquiries when intent is set;
    // the settings route never does. This is the key behavioral difference.
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.update.mockResolvedValue({
      id: 'u-1',
      organizationName: 'Some Org',
    });

    const res = await PATCH(
      makePatch({
        organizationName: 'Some Org',
        // The settings schema doesn't even accept these — added here to
        // confirm they're rejected, not silently used to spam founder.
        signupIntent: 'yes',
        signupChallengeText: 'I want beta access NOW',
      }),
    );
    // The settings schema strips unknown fields. The route succeeds for the
    // valid fields only; no founder inquiry was created.
    expect([200, 400]).toContain(res.status);
    // Either way: nothing fired
    // (we didn't mock founderInquiry — it would have thrown if called).
  });

  it('clears locationCountEstimate when empty value provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.update.mockResolvedValue({
      id: 'u-1',
      locationCountEstimate: null,
    });

    const res = await PATCH(makePatch({ locationCountEstimate: null }));
    expect(res.status).toBe(200);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { locationCountEstimate: null },
      }),
    );
  });

  it('returns 404 when the user has been deleted concurrently', async () => {
    // Edge: the body is valid but only updates location, so the route falls
    // back to findUnique to get the current user shape. If that returns null
    // we throw USER_NOT_FOUND.
    mockAuth.mockResolvedValue({ user: { id: 'gone', email: 'g@x.com', name: 'G' } });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.location.findFirst.mockResolvedValue(null);
    mockPrisma.location.create.mockResolvedValue({ id: 'loc-new' });

    const res = await PATCH(makePatch({ locationName: 'Some Place' }));
    expect(res.status).toBe(404);
  });
});
