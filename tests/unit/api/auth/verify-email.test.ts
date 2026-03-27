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

import { GET } from '@/app/api/auth/verify-email/route';

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
  email: 'test@example.com',
  emailVerified: null,
  name: 'Test User',
  tier: 'FREE',
  credits: 15,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GET /api/auth/verify-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTokens.verifyEmailToken.mockResolvedValue({
      success: true,
      email: 'test@example.com',
    });
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({
      ...mockUser,
      emailVerified: new Date(),
    });
  });

  it('returns 400 for missing token', async () => {
    const req = createRequest('/api/auth/verify-email');
    const response = await GET(req);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
  });

  it('returns 400 for invalid token', async () => {
    mockTokens.verifyEmailToken.mockResolvedValue({
      success: false,
      error: 'Invalid or expired token',
    });

    const req = createRequest('/api/auth/verify-email', {
      searchParams: { token: 'invalid-token' },
    });
    const response = await GET(req);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
  });

  it('returns 404 when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const req = createRequest('/api/auth/verify-email', {
      searchParams: { token: 'valid-token' },
    });
    const response = await GET(req);

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.success).toBe(false);
  });

  it('returns 200 with alreadyVerified for already verified user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      ...mockUser,
      emailVerified: new Date('2026-01-01'),
    });

    const req = createRequest('/api/auth/verify-email', {
      searchParams: { token: 'valid-token' },
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.alreadyVerified).toBe(true);
  });

  it('sets emailVerified on success (200)', async () => {
    const req = createRequest('/api/auth/verify-email', {
      searchParams: { token: 'valid-token' },
    });
    const response = await GET(req);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'test@example.com' },
        data: expect.objectContaining({
          emailVerified: expect.any(Date),
        }),
      })
    );
  });

  it('sends welcome email (non-blocking)', async () => {
    const req = createRequest('/api/auth/verify-email', {
      searchParams: { token: 'valid-token' },
    });
    await GET(req);

    expect(mockEmail.sendWelcomeEmail).toHaveBeenCalledWith(
      'test@example.com',
      'Test User'
    );
  });

  it('returns 500 on unexpected error', async () => {
    mockTokens.verifyEmailToken.mockRejectedValue(
      new Error('Database connection failed')
    );

    const req = createRequest('/api/auth/verify-email', {
      searchParams: { token: 'valid-token' },
    });
    const response = await GET(req);

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.success).toBe(false);
  });
});
