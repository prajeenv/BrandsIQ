import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => {
  const fn = vi.fn;
  function createModelMock() {
    return {
      findUnique: fn(),
      findFirst: fn(),
      findMany: fn(),
      create: fn(),
      update: fn(),
      updateMany: fn(),
      delete: fn(),
      deleteMany: fn(),
      count: fn(),
      upsert: fn(),
      groupBy: fn(),
      aggregate: fn(),
    };
  }
  return {
    user: createModelMock(),
    account: createModelMock(),
    session: createModelMock(),
    verificationToken: createModelMock(),
    brandVoice: createModelMock(),
    review: createModelMock(),
    reviewResponse: createModelMock(),
    responseVersion: createModelMock(),
    creditUsage: createModelMock(),
    sentimentUsage: createModelMock(),
    $transaction: fn(),
    $connect: fn(),
    $disconnect: fn(),
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

import {
  generateToken,
  createVerificationToken,
  createPasswordResetToken,
  verifyEmailToken,
  verifyPasswordResetToken,
  isTokenValid,
} from '@/lib/tokens';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('generateToken', () => {
  it('should return a 64-character hex string', () => {
    const token = generateToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should return unique tokens on each call', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    expect(token1).not.toBe(token2);
  });
});

describe('createVerificationToken', () => {
  it('should delete existing tokens and create a new one with 24hr expiry', async () => {
    const email = 'test@example.com';
    mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.verificationToken.create.mockResolvedValue({
      identifier: email,
      token: 'abc123',
      expires: new Date(),
    });

    const token = await createVerificationToken(email);

    expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: email },
    });
    expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: email,
          token: expect.any(String),
        }),
      })
    );

    // Verify the expiry is approximately 24 hours from now
    const createCall = mockPrisma.verificationToken.create.mock.calls[0][0];
    const expiry = new Date(createCall.data.expires).getTime();
    const expectedExpiry = Date.now() + 24 * 60 * 60 * 1000;
    expect(Math.abs(expiry - expectedExpiry)).toBeLessThan(5000);

    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64);
  });
});

describe('createPasswordResetToken', () => {
  it('should use password-reset: prefixed identifier and 1hr expiry', async () => {
    const email = 'user@example.com';
    mockPrisma.verificationToken.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.verificationToken.create.mockResolvedValue({
      identifier: `password-reset:${email}`,
      token: 'def456',
      expires: new Date(),
    });

    const token = await createPasswordResetToken(email);

    expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: `password-reset:${email}` },
    });
    expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: `password-reset:${email}`,
          token: expect.any(String),
        }),
      })
    );

    // Verify the expiry is approximately 1 hour from now
    const createCall = mockPrisma.verificationToken.create.mock.calls[0][0];
    const expiry = new Date(createCall.data.expires).getTime();
    const expectedExpiry = Date.now() + 1 * 60 * 60 * 1000;
    expect(Math.abs(expiry - expectedExpiry)).toBeLessThan(5000);

    expect(typeof token).toBe('string');
    expect(token).toHaveLength(64);
  });
});

describe('verifyEmailToken', () => {
  it('should return success and email for a valid non-expired token', async () => {
    const email = 'valid@example.com';
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: email,
      token: 'valid-token',
      expires: new Date(Date.now() + 60 * 60 * 1000),
    });
    mockPrisma.verificationToken.delete.mockResolvedValue({});

    const result = await verifyEmailToken('valid-token');

    expect(result.success).toBe(true);
    expect(result.email).toBe(email);
    expect(result.error).toBeUndefined();
    // Should delete the consumed token
    expect(mockPrisma.verificationToken.delete).toHaveBeenCalledWith({
      where: { token: 'valid-token' },
    });
  });

  it('should return error for a non-existent token', async () => {
    mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

    const result = await verifyEmailToken('nonexistent-token');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid verification token');
  });

  it('should reject tokens with password-reset: prefixed identifiers', async () => {
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: 'password-reset:user@example.com',
      token: 'pw-token',
      expires: new Date(Date.now() + 60 * 60 * 1000),
    });

    const result = await verifyEmailToken('pw-token');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid verification token');
  });

  it('should delete and reject expired tokens', async () => {
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: 'expired@example.com',
      token: 'expired-token',
      expires: new Date(Date.now() - 60 * 1000),
    });
    mockPrisma.verificationToken.delete.mockResolvedValue({});

    const result = await verifyEmailToken('expired-token');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Verification token has expired');
    expect(mockPrisma.verificationToken.delete).toHaveBeenCalledWith({
      where: { token: 'expired-token' },
    });
  });
});

describe('verifyPasswordResetToken', () => {
  it('should return success and extracted email for a valid password-reset token', async () => {
    const email = 'reset@example.com';
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: `password-reset:${email}`,
      token: 'reset-token',
      expires: new Date(Date.now() + 30 * 60 * 1000),
    });
    mockPrisma.verificationToken.delete.mockResolvedValue({});

    const result = await verifyPasswordResetToken('reset-token');

    expect(result.success).toBe(true);
    expect(result.email).toBe(email);
    expect(mockPrisma.verificationToken.delete).toHaveBeenCalledWith({
      where: { token: 'reset-token' },
    });
  });

  it('should reject tokens without password-reset: prefix', async () => {
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: 'plain@example.com',
      token: 'plain-token',
      expires: new Date(Date.now() + 60 * 60 * 1000),
    });

    const result = await verifyPasswordResetToken('plain-token');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid reset token');
  });

  it('should return error for an expired password reset token', async () => {
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: 'password-reset:old@example.com',
      token: 'old-token',
      expires: new Date(Date.now() - 60 * 1000),
    });
    mockPrisma.verificationToken.delete.mockResolvedValue({});

    const result = await verifyPasswordResetToken('old-token');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Reset token has expired');
    expect(mockPrisma.verificationToken.delete).toHaveBeenCalled();
  });

  it('should return error for a non-existent token', async () => {
    mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

    const result = await verifyPasswordResetToken('ghost-token');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid reset token');
  });
});

describe('isTokenValid', () => {
  it('should return true for a non-expired token', async () => {
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: 'check@example.com',
      token: 'check-token',
      expires: new Date(Date.now() + 60 * 60 * 1000),
    });

    const result = await isTokenValid('check-token');

    expect(result).toBe(true);
  });

  it('should return false for an expired token', async () => {
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: 'expired@example.com',
      token: 'expired-check',
      expires: new Date(Date.now() - 1000),
    });

    const result = await isTokenValid('expired-check');

    expect(result).toBe(false);
  });

  it('should return false for a non-existent token', async () => {
    mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

    const result = await isTokenValid('ghost-token');

    expect(result).toBe(false);
  });
});
