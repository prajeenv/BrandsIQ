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

const mockBcrypt = vi.hoisted(() => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$12$newhashedpassword'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

const mockEmail = vi.hoisted(() => ({
  sendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
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
vi.mock('bcryptjs', () => mockBcrypt);

import { GET, POST } from '@/app/api/auth/password-reset/confirm/route';

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

const mockUser = {
  id: 'user-123',
  email: 'user@example.com',
  password: '$2a$12$existinghash',
  emailVerified: new Date(),
  name: 'Test User',
};

describe('GET /api/auth/password-reset/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for missing token', async () => {
    const req = createRequest('/api/auth/password-reset/confirm');
    const response = await GET(req);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
  });

  it('returns 200 with valid: true for valid token', async () => {
    mockTokens.isTokenValid.mockResolvedValue(true);

    const req = createRequest('/api/auth/password-reset/confirm', {
      searchParams: { token: 'valid-reset-token' },
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.valid).toBe(true);
  });

  it('returns 200 with valid: false for expired token', async () => {
    mockTokens.isTokenValid.mockResolvedValue(false);

    const req = createRequest('/api/auth/password-reset/confirm', {
      searchParams: { token: 'expired-token' },
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.valid).toBe(false);
  });
});

describe('POST /api/auth/password-reset/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.checkRateLimit.mockResolvedValue({ success: true, headers: {} });
    mockTokens.verifyPasswordResetToken.mockResolvedValue({
      success: true,
      email: 'user@example.com',
    });
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({
      ...mockUser,
      password: '$2a$12$newhashedpassword',
    });
    mockBcrypt.default.hash.mockResolvedValue('$2a$12$newhashedpassword');
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

    const req = createRequest('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: { token: 'valid-token', password: 'NewSecurePass123!' },
    });
    const response = await POST(req);

    expect(response.status).toBe(429);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('returns 400 for validation error (weak password)', async () => {
    const req = createRequest('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: { token: 'valid-token', password: 'weak' },
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid token', async () => {
    mockTokens.verifyPasswordResetToken.mockResolvedValue({
      success: false,
      error: 'Invalid or expired token',
    });

    const req = createRequest('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: { token: 'bad-token', password: 'NewSecurePass123!' },
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
  });

  it('returns 404 for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = createRequest('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: { token: 'valid-token', password: 'NewSecurePass123!' },
    });
    const response = await POST(req);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.success).toBe(false);
  });

  it('returns 200 on success and updates password', async () => {
    const req = createRequest('/api/auth/password-reset/confirm', {
      method: 'POST',
      body: { token: 'valid-token', password: 'NewSecurePass123!' },
    });
    const response = await POST(req);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    // Verify password was hashed
    expect(mockBcrypt.default.hash).toHaveBeenCalledWith(
      'NewSecurePass123!',
      12
    );

    // Verify user was updated with new hashed password
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'user@example.com' },
        data: expect.objectContaining({
          password: '$2a$12$newhashedpassword',
        }),
      })
    );
  });
});
