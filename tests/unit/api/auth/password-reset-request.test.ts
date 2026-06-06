import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mocks
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
    verificationToken: m(),
    brandVoice: m(),
    $transaction: vi.fn(),
  };
});

const mockEmail = vi.hoisted(() => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
  sendOAuthSignInHintEmail: vi.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
}));

const mockTokens = vi.hoisted(() => ({
  createVerificationToken: vi.fn().mockResolvedValue('test-token-123'),
  createPasswordResetToken: vi.fn().mockResolvedValue('reset-token-123'),
  verifyEmailToken: vi.fn(),
  verifyPasswordResetToken: vi.fn(),
  isTokenValid: vi.fn(),
}));

const mockRateLimit = vi.hoisted(() => ({
  loginRateLimit: {
    limit: vi.fn().mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60000,
    }),
  },
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  checkRateLimit: vi.fn().mockResolvedValue({ success: true, headers: {} }),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/email', () => mockEmail);
vi.mock('@/lib/tokens', () => mockTokens);
vi.mock('@/lib/rate-limit', () => mockRateLimit);
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$12$hashed'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

import { POST } from '@/app/api/auth/password-reset/request/route';

function createRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
    searchParams?: Record<string, string>;
  }
): Request {
  const reqUrl = new URL(url, 'http://localhost:3000');
  if (options?.searchParams) {
    for (const [k, v] of Object.entries(options.searchParams)) {
      reqUrl.searchParams.set(k, v);
    }
  }
  return new Request(reqUrl.toString(), {
    method: options?.method || 'GET',
    body: options?.body ? JSON.stringify(options.body) : undefined,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/auth/password-reset/request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.checkRateLimit.mockResolvedValue({ success: true, headers: {} });
  });

  it('returns 429 when rate limited', async () => {
    mockRateLimit.checkRateLimit.mockResolvedValue({
      success: false,
      headers: { 'Retry-After': '60' },
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
      },
    });

    const req = createRequest('/api/auth/password-reset/request', {
      method: 'POST',
      body: { email: 'test@example.com' },
    });
    const response = await POST(req);

    expect(response.status).toBe(429);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('returns 400 for invalid email', async () => {
    const req = createRequest('/api/auth/password-reset/request', {
      method: 'POST',
      body: { email: 'bad-email' },
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
  });

  it('returns 200 even when user not found (anti-enumeration)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = createRequest('/api/auth/password-reset/request', {
      method: 'POST',
      body: { email: 'nobody@example.com' },
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    // Should NOT create token or send email
    expect(mockTokens.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('sends the Google sign-in hint (not a reset) for an OAuth-only user with a linked Google account', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'oauth-user',
      email: 'oauth@example.com',
      password: null,
      emailVerified: new Date(),
      accounts: [{ provider: 'google' }],
    });

    const req = createRequest('/api/auth/password-reset/request', {
      method: 'POST',
      body: { email: 'oauth@example.com' },
    });
    const response = await POST(req);

    // Response stays the generic 200 (anti-enumeration).
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    // No reset token + no reset email; instead the Google hint email fires.
    expect(mockTokens.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(mockEmail.sendOAuthSignInHintEmail).toHaveBeenCalledWith(
      'oauth@example.com'
    );
  });

  it('stays silent for a password-less account with NO linked Google account', async () => {
    // e.g. an invite-created user who never set a password and never linked
    // Google — we must not tell them to "use Google".
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'no-auth-user',
      email: 'noauth@example.com',
      password: null,
      emailVerified: new Date(),
      accounts: [],
    });

    const req = createRequest('/api/auth/password-reset/request', {
      method: 'POST',
      body: { email: 'noauth@example.com' },
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    // Neither email fires; existing silent behavior preserved.
    expect(mockTokens.createPasswordResetToken).not.toHaveBeenCalled();
    expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(mockEmail.sendOAuthSignInHintEmail).not.toHaveBeenCalled();
  });

  it('creates token and sends the reset email for a password user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'user@example.com',
      password: '$2a$12$hashedpassword',
      emailVerified: new Date(),
      accounts: [],
    });

    const req = createRequest('/api/auth/password-reset/request', {
      method: 'POST',
      body: { email: 'user@example.com' },
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    expect(mockTokens.createPasswordResetToken).toHaveBeenCalledWith(
      'user@example.com'
    );
    expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledWith(
      'user@example.com',
      'reset-token-123'
    );
    // The hint email must not fire for a password user.
    expect(mockEmail.sendOAuthSignInHintEmail).not.toHaveBeenCalled();
  });
});
