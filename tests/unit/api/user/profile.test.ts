import { describe, it, expect, vi, beforeEach } from 'vitest';

// MVP Phase 1 iteration 2: PATCH /api/user/profile
// Onboarding wizard submission. See src/app/api/user/profile/route.ts and
// MVP.md Section 9.

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
    founderInquiry: m(),
    $transaction: vi.fn(),
  };
});

const mockAuth = vi.hoisted(() => vi.fn());

const mockEmail = vi.hoisted(() => ({
  sendFounderInquiryNotification: vi.fn().mockResolvedValue({ success: true }),
}));

// waitUntil keeps the Lambda alive in production; in tests we just want the
// wrapped promise to execute synchronously so we can assert on the email mock.
vi.mock('@vercel/functions', () => ({
  waitUntil: (promise: Promise<unknown>) => promise,
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/email', () => mockEmail);

import { PATCH } from '@/app/api/user/profile/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/user/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const validProfile = {
  organizationName: 'The Bear Bakery',
  // Two-level cascade. "Food & Beverage" is the top-level industry,
  // "Cafe / coffee shop" is the second-level businessType under it.
  // The old single-level "Cafe" value is no longer valid.
  industry: 'Food & Beverage',
  businessType: 'Cafe / coffee shop',
  country: 'United Kingdom',
  locationName: 'The Bear Bakery — Shoreditch',
};

beforeEach(() => {
  vi.clearAllMocks();
  // $transaction passes its callback the mockPrisma; same pattern used in
  // tests/unit/api/auth/signup.test.ts so the transactional code runs against
  // the same mocks the test asserts on.
  mockPrisma.$transaction.mockImplementation(
    async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma),
  );
});

describe('PATCH /api/user/profile', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PATCH(makeRequest(validProfile));
    expect(res.status).toBe(401);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid input (missing required field)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });

    const res = await PATCH(
      makeRequest({
        organizationName: 'Cafe',
        industry: 'Food & Beverage',
        businessType: 'Cafe / coffee shop',
        // country missing
        locationName: 'X',
      }),
    );
    expect(res.status).toBe(400);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 400 when industry is not in the closed set', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });

    const res = await PATCH(
      makeRequest({
        ...validProfile,
        industry: 'Underwater Basket Weaving',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when businessType is missing for a non-Other industry', async () => {
    // Cascade superRefine: businessType is required unless industry is "Other".
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });

    const { businessType: _omitted, ...withoutBusinessType } = validProfile;
    void _omitted;
    const res = await PATCH(makeRequest(withoutBusinessType));
    expect(res.status).toBe(400);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('returns 400 when businessType does not belong to the chosen industry', async () => {
    // "Pharmacy" lives under Retail. Sending it with Food & Beverage should
    // be rejected by the superRefine cross-field check.
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });

    const res = await PATCH(
      makeRequest({
        ...validProfile,
        industry: 'Food & Beverage',
        businessType: 'Pharmacy',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('accepts industry="Other" with no businessType', async () => {
    // "Other" industry hides the cascade. businessType must be absent or null.
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-1',
      email: 'a@x.com',
      name: 'A',
      isBetaUser: false,
      organizationName: null,
    });
    mockPrisma.user.update.mockResolvedValue({
      id: 'u-1',
      email: 'a@x.com',
      name: 'A',
      organizationName: 'Wholly Unique Thing',
      industry: 'Other',
      businessType: null,
      country: 'United Kingdom',
      isBetaUser: false,
      tier: 'FREE',
    });
    mockPrisma.location.findFirst.mockResolvedValue(null);
    mockPrisma.location.create.mockResolvedValue({ id: 'loc-1' });

    const res = await PATCH(
      makeRequest({
        organizationName: 'Wholly Unique Thing',
        industry: 'Other',
        // No businessType
        country: 'United Kingdom',
        locationName: 'HQ',
      }),
    );
    expect(res.status).toBe(200);
  });

  it('rejects industry="Other" when businessType is sent', async () => {
    // The cascade is hidden for "Other"; the form should send null. If the
    // client sends a businessType anyway it's an internally inconsistent
    // payload — reject it.
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });

    const res = await PATCH(
      makeRequest({
        ...validProfile,
        industry: 'Other',
        businessType: 'Cafe / coffee shop',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when the user row is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'gone', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await PATCH(makeRequest(validProfile));
    expect(res.status).toBe(404);
  });

  it('updates profile + creates location when no location exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-1',
      email: 'a@x.com',
      name: 'A',
      isBetaUser: false,
      organizationName: null,
    });
    mockPrisma.user.update.mockResolvedValue({
      id: 'u-1',
      email: 'a@x.com',
      name: 'A',
      organizationName: 'The Bear Bakery',
      industry: 'Food & Beverage',
      businessType: 'Cafe / coffee shop',
      country: 'United Kingdom',
      isBetaUser: false,
      tier: 'FREE',
    });
    mockPrisma.location.findFirst.mockResolvedValue(null);
    mockPrisma.location.create.mockResolvedValue({ id: 'loc-1' });

    const res = await PATCH(makeRequest(validProfile));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.profile.organizationName).toBe('The Bear Bakery');
    expect(json.data.betaInquiryCreated).toBe(false);

    expect(mockPrisma.location.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: 'u-1', name: 'The Bear Bakery — Shoreditch' },
      }),
    );
    expect(mockPrisma.founderInquiry.create).not.toHaveBeenCalled();
    expect(mockEmail.sendFounderInquiryNotification).not.toHaveBeenCalled();
  });

  it('renames the existing Default Location instead of creating a new one', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-1',
      email: 'a@x.com',
      name: 'A',
      isBetaUser: false,
      organizationName: null,
    });
    mockPrisma.user.update.mockResolvedValue({ id: 'u-1' });
    mockPrisma.location.findFirst.mockResolvedValue({ id: 'loc-existing', name: 'Default Location' });
    mockPrisma.location.update.mockResolvedValue({ id: 'loc-existing' });

    const res = await PATCH(makeRequest(validProfile));
    expect(res.status).toBe(200);

    expect(mockPrisma.location.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'loc-existing' },
        data: { name: 'The Bear Bakery — Shoreditch' },
      }),
    );
    expect(mockPrisma.location.create).not.toHaveBeenCalled();
  });

  it('creates a beta-request FounderInquiry when non-beta user signals intent=yes', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-2', email: 'b@x.com', name: 'B' } });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-2',
      email: 'b@x.com',
      name: 'B',
      isBetaUser: false,
      organizationName: null,
    });
    mockPrisma.user.update.mockResolvedValue({ id: 'u-2' });
    mockPrisma.location.findFirst.mockResolvedValue(null);
    mockPrisma.location.create.mockResolvedValue({ id: 'loc-2' });
    mockPrisma.founderInquiry.create.mockResolvedValue({ id: 'inq-9' });

    const res = await PATCH(
      makeRequest({
        ...validProfile,
        signupIntent: 'yes',
      }),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.betaInquiryCreated).toBe(true);

    expect(mockPrisma.founderInquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u-2',
          type: 'beta_request',
          source: 'onboarding_intent',
          submitterEmail: 'b@x.com',
          businessName: 'The Bear Bakery',
        }),
      }),
    );
    // Email should fire via waitUntil (mocked to run sync)
    expect(mockEmail.sendFounderInquiryNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'beta_request',
        source: 'onboarding_intent',
        inquiryId: 'inq-9',
      }),
    );
  });

  it('creates a beta-request inquiry when challenge text is provided (no intent radio)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-3', email: 'c@x.com', name: 'C' } });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-3',
      email: 'c@x.com',
      name: 'C',
      isBetaUser: false,
      organizationName: null,
    });
    mockPrisma.user.update.mockResolvedValue({ id: 'u-3' });
    mockPrisma.location.findFirst.mockResolvedValue(null);
    mockPrisma.location.create.mockResolvedValue({ id: 'loc-3' });
    mockPrisma.founderInquiry.create.mockResolvedValue({ id: 'inq-10' });

    const res = await PATCH(
      makeRequest({
        ...validProfile,
        signupChallengeText: 'We have 5 locations with 300+ reviews/month each.',
      }),
    );
    expect(res.status).toBe(200);
    expect(mockPrisma.founderInquiry.create).toHaveBeenCalled();
  });

  it('does NOT create a beta-request inquiry for beta users (already have access)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-beta', email: 'beta@x.com', name: 'Beta' } });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-beta',
      email: 'beta@x.com',
      name: 'Beta',
      isBetaUser: true,
      organizationName: null,
    });
    mockPrisma.user.update.mockResolvedValue({ id: 'u-beta' });
    mockPrisma.location.findFirst.mockResolvedValue(null);
    mockPrisma.location.create.mockResolvedValue({ id: 'loc-beta' });

    const res = await PATCH(
      makeRequest({
        ...validProfile,
        signupIntent: 'yes',
        signupChallengeText: 'I already have access but I am clicking everything',
      }),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.betaInquiryCreated).toBe(false);
    expect(mockPrisma.founderInquiry.create).not.toHaveBeenCalled();
    expect(mockEmail.sendFounderInquiryNotification).not.toHaveBeenCalled();
  });

  it('does NOT create an inquiry when intent is "just_trying" or "unsure" without text', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-4', email: 'd@x.com', name: 'D' } });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-4',
      email: 'd@x.com',
      name: 'D',
      isBetaUser: false,
      organizationName: null,
    });
    mockPrisma.user.update.mockResolvedValue({ id: 'u-4' });
    mockPrisma.location.findFirst.mockResolvedValue(null);
    mockPrisma.location.create.mockResolvedValue({ id: 'loc-4' });

    const res = await PATCH(
      makeRequest({
        ...validProfile,
        signupIntent: 'just_trying',
      }),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.betaInquiryCreated).toBe(false);
    expect(mockPrisma.founderInquiry.create).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with 400', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u-1', email: 'a@x.com', name: 'A' } });

    const req = new Request('http://localhost/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});
