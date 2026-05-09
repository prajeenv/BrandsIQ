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
    betaInviteLink: m(),
    $transaction: vi.fn(),
  };
});

const mockBcrypt = vi.hoisted(() => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$12$hashed'),
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

import { POST } from '@/app/api/auth/signup/route';

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

const validSignupBody = {
  email: 'newuser@example.com',
  password: 'SecurePass123!',
  name: 'Test User',
};

const mockCreatedUser = {
  id: 'user-123',
  email: 'newuser@example.com',
  name: 'Test User',
  tier: 'FREE',
  credits: 15,
  sentimentCredits: 35,
  emailVerified: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRateLimit.checkRateLimit.mockResolvedValue({ success: true, headers: {} });
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(mockCreatedUser);
    mockPrisma.brandVoice.create.mockResolvedValue({});
    mockBcrypt.default.hash.mockResolvedValue('$2a$12$hashed');
    mockTokens.createVerificationToken.mockResolvedValue('test-token-123');
    mockEmail.sendVerificationEmail.mockResolvedValue({ success: true });
    // The signup route now wraps user creation + brand voice + (optional)
    // beta invite update in a transaction. Mock $transaction to invoke its
    // callback with the same mockPrisma so the asserted .create calls run.
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => cb(mockPrisma)
    );
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

    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: validSignupBody,
    });
    const response = await POST(req);

    expect(response.status).toBe(429);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('returns 400 for invalid input (missing email)', async () => {
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: { password: 'SecurePass123!', name: 'Test' },
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for weak password', async () => {
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: { email: 'test@example.com', password: 'short', name: 'Test' },
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 for existing verified user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      email: 'newuser@example.com',
      emailVerified: new Date(),
    });

    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: validSignupBody,
    });
    const response = await POST(req);

    expect(response.status).toBe(409);
    const json = await response.json();
    expect(json.success).toBe(false);
  });

  it('creates user with correct defaults on success (201)', async () => {
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: validSignupBody,
    });
    const response = await POST(req);

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.success).toBe(true);

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'newuser@example.com',
          name: 'Test User',
          password: '$2a$12$hashed',
          tier: 'FREE',
          credits: 15,
        }),
      })
    );
  });

  it('creates default brand voice on success', async () => {
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: validSignupBody,
    });
    await POST(req);

    expect(mockPrisma.brandVoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-123',
          tone: 'professional',
          formality: 3,
        }),
      })
    );
  });

  it('sends verification email on success', async () => {
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: validSignupBody,
    });
    await POST(req);

    expect(mockTokens.createVerificationToken).toHaveBeenCalledWith(
      'newuser@example.com'
    );
    expect(mockEmail.sendVerificationEmail).toHaveBeenCalledWith(
      'newuser@example.com',
      'test-token-123'
    );
  });

  it('does not fail if email sending fails (still 201)', async () => {
    mockEmail.sendVerificationEmail.mockResolvedValue({
      success: false,
      error: 'Email service down',
    });

    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: validSignupBody,
    });
    const response = await POST(req);

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.success).toBe(true);
  });

  it('hashes password with bcrypt', async () => {
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: validSignupBody,
    });
    await POST(req);

    expect(mockBcrypt.default.hash).toHaveBeenCalledWith(
      'SecurePass123!',
      12
    );
  });

  it('returns 400 for invalid email format', async () => {
    const req = createRequest('/api/auth/signup', {
      method: 'POST',
      body: { email: 'not-an-email', password: 'SecurePass123!', name: 'Test' },
    });
    const response = await POST(req);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  // ============================================
  // MVP Phase 1: signup with beta invite code
  // ============================================

  describe('with betaCode', () => {
    beforeEach(() => {
      // Default to phase_1 so the beta path is active
      process.env.CURRENT_PHASE = 'phase_1';
    });

    it('creates a beta user when the code is valid', async () => {
      mockPrisma.betaInviteLink.findUnique.mockResolvedValue({
        id: 'inv-1',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usedAt: null,
      });
      mockPrisma.betaInviteLink.update.mockResolvedValue({});
      mockPrisma.user.create.mockResolvedValue({
        ...mockCreatedUser,
        isBetaUser: true,
        credits: 150,
        sentimentCredits: 750,
      });

      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { ...validSignupBody, betaCode: 'GOOD-CODE' },
      });
      const response = await POST(req);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.data.user.isBetaUser).toBe(true);

      // user.create called with beta allocation
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isBetaUser: true,
            credits: 150,
            sentimentCredits: 750,
          }),
        }),
      );

      // betaInviteLink.update marks usedAt + usedByUserId
      expect(mockPrisma.betaInviteLink.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: 'GOOD-CODE' },
          data: expect.objectContaining({
            usedByUserId: 'user-123',
            usedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('rejects an expired code with INVALID_BETA_CODE', async () => {
      mockPrisma.betaInviteLink.findUnique.mockResolvedValue({
        id: 'inv-2',
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
      });

      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { ...validSignupBody, betaCode: 'OLD-CODE' },
      });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe('INVALID_BETA_CODE');
      expect(json.error.details.expired).toBe(true);
      // No user created when the code is rejected
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects an already-used code with INVALID_BETA_CODE', async () => {
      mockPrisma.betaInviteLink.findUnique.mockResolvedValue({
        id: 'inv-3',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usedAt: new Date(),
      });

      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { ...validSignupBody, betaCode: 'USED-CODE' },
      });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe('INVALID_BETA_CODE');
      expect(json.error.details.used).toBe(true);
    });

    it('rejects an unknown code with INVALID_BETA_CODE (no PII leak)', async () => {
      mockPrisma.betaInviteLink.findUnique.mockResolvedValue(null);

      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { ...validSignupBody, betaCode: 'NOT-REAL' },
      });
      const response = await POST(req);

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error.code).toBe('INVALID_BETA_CODE');
      expect(json.error.details.exists).toBe(false);
    });

    it('ignores the beta code in phase_2 (commercial launch)', async () => {
      process.env.CURRENT_PHASE = 'phase_2';

      const req = createRequest('/api/auth/signup', {
        method: 'POST',
        body: { ...validSignupBody, betaCode: 'GOOD-CODE' },
      });
      const response = await POST(req);

      expect(response.status).toBe(201);
      // betaInviteLink lookup is skipped entirely
      expect(mockPrisma.betaInviteLink.findUnique).not.toHaveBeenCalled();
      // User created as Free, not beta
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isBetaUser: false,
            credits: 15,
          }),
        }),
      );
    });
  });
});
