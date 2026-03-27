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
});
