import { describe, it, expect, vi, beforeEach } from 'vitest';

// MVP Phase 1 iteration 2: POST /api/founder-inquiries
// See src/app/api/founder-inquiries/route.ts and MVP.md Section 13.4.

const mockPrisma = vi.hoisted(() => ({
  founderInquiry: {
    create: vi.fn(),
  },
}));

const mockAuth = vi.hoisted(() => vi.fn());

const mockEmail = vi.hoisted(() => ({
  sendFounderInquiryNotification: vi.fn().mockResolvedValue({ success: true }),
}));

const mockRateLimit = vi.hoisted(() => ({
  apiRateLimit: { limit: vi.fn() },
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, headers: {} }),
}));

vi.mock('@/lib/auth', () => ({ auth: mockAuth }));
vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/email', () => mockEmail);
vi.mock('@/lib/rate-limit', () => mockRateLimit);

import { POST } from '@/app/api/founder-inquiries/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/founder-inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRateLimit.checkRateLimit.mockResolvedValue({ success: true, headers: {} });
});

describe('POST /api/founder-inquiries', () => {
  it('creates an inquiry and emails the founder when unauthenticated user supplies their contact', async () => {
    mockAuth.mockResolvedValue(null);
    mockPrisma.founderInquiry.create.mockResolvedValue({ id: 'inq-1' });

    const res = await POST(
      makeRequest({
        type: 'expired_link_recovery',
        source: 'expired_link',
        submitterName: 'Anita',
        submitterEmail: 'anita@example.com',
        businessName: 'Cafe Arabica',
        message: 'My beta invite expired before I could click it.',
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.inquiryId).toBe('inq-1');

    // userId should be null since caller was unauthenticated
    expect(mockPrisma.founderInquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'expired_link_recovery',
          source: 'expired_link',
          userId: null,
          submitterName: 'Anita',
          submitterEmail: 'anita@example.com',
          businessName: 'Cafe Arabica',
          message: 'My beta invite expired before I could click it.',
        }),
      }),
    );

    // Founder notification email should be queued
    expect(mockEmail.sendFounderInquiryNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'expired_link_recovery',
        submitterEmail: 'anita@example.com',
        inquiryId: 'inq-1',
      }),
    );
  });

  it('backfills submitter info from session for authenticated callers', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-77', email: 'session@example.com', name: 'Session User' },
    });
    mockPrisma.founderInquiry.create.mockResolvedValue({ id: 'inq-2' });

    const res = await POST(
      makeRequest({
        type: 'more_credits',
        source: 'zero_balance',
        // No submitter fields — should be filled from session
        message: 'Hit zero credits during a campaign.',
      }),
    );

    expect(res.status).toBe(201);
    expect(mockPrisma.founderInquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-77',
          submitterEmail: 'session@example.com',
          submitterName: 'Session User',
        }),
      }),
    );
  });

  it('rejects with 400 when no submitter email is available (no session, no form field)', async () => {
    mockAuth.mockResolvedValue(null);

    const res = await POST(
      makeRequest({
        type: 'general',
        source: 'other',
        message: 'Hi, just curious about this product.',
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toMatch(/email/i);
    expect(mockPrisma.founderInquiry.create).not.toHaveBeenCalled();
    expect(mockEmail.sendFounderInquiryNotification).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with 400 (not 500)', async () => {
    mockAuth.mockResolvedValue(null);
    const req = new Request('http://localhost/api/founder-inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockPrisma.founderInquiry.create).not.toHaveBeenCalled();
  });

  it('rejects schema-invalid input (missing message)', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      makeRequest({
        type: 'beta_request',
        source: 'pricing',
        submitterEmail: 'noemail@example.com',
        // message intentionally omitted
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid inquiry type', async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      makeRequest({
        type: 'not_a_real_type',
        source: 'other',
        submitterEmail: 'anyone@example.com',
        message: 'Hello',
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('honours rate limiting with 429', async () => {
    mockAuth.mockResolvedValue(null);
    mockRateLimit.checkRateLimit.mockResolvedValue({
      success: false,
      headers: { 'Retry-After': '60' },
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
    });

    const res = await POST(
      makeRequest({
        type: 'beta_request',
        source: 'pricing',
        submitterEmail: 'anita@example.com',
        message: 'Hello',
      }),
    );

    expect(res.status).toBe(429);
    expect(mockPrisma.founderInquiry.create).not.toHaveBeenCalled();
  });

  it('still returns 201 if email notification fails (fire-and-forget; logged but not surfaced)', async () => {
    mockAuth.mockResolvedValue(null);
    mockPrisma.founderInquiry.create.mockResolvedValue({ id: 'inq-3' });
    mockEmail.sendFounderInquiryNotification.mockRejectedValueOnce(new Error('Resend down'));

    const res = await POST(
      makeRequest({
        type: 'beta_request',
        source: 'pricing',
        submitterEmail: 'anita@example.com',
        message: 'Hello',
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.inquiryId).toBe('inq-3');
  });

  it('returns a structured 500 (not an unhandled crash) when the inquiry insert fails', async () => {
    // Sentry-instrumented path (capture is a no-op in test env). The point
    // is the response is a clean INTERNAL_ERROR the form can retry on,
    // rather than an unhandled rejection / generic crash.
    mockAuth.mockResolvedValue(null);
    mockPrisma.founderInquiry.create.mockRejectedValue(
      new Error('unique constraint violated'),
    );

    const res = await POST(
      makeRequest({
        type: 'beta_request',
        source: 'pricing',
        submitterEmail: 'anita@example.com',
        message: 'Please let me in',
      }),
    );

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INTERNAL_ERROR');
    // Email notification must NOT be attempted if the row never saved.
    expect(mockEmail.sendFounderInquiryNotification).not.toHaveBeenCalled();
  });
});
