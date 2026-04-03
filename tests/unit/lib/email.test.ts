import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockSend } = vi.hoisted(() => {
  const mockSend = vi.fn();
  return { mockSend };
});

vi.mock('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockSend };
  },
}));

import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '@/lib/email';

describe('email.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    process.env.RESEND_API_KEY = 'test-resend-key';
    mockSend.mockResolvedValue({ data: { id: 'email_123' }, error: null });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct subject', async () => {
      await sendVerificationEmail('user@example.com', 'verify-token-abc');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toBe('user@example.com');
      expect(callArgs.subject).toContain('Verify your email');
    });

    it('should include verification token in the email body URL', async () => {
      await sendVerificationEmail('user@example.com', 'verify-token-abc');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('verify-token-abc');
    });

    it('should include NEXTAUTH_URL in the verification link', async () => {
      await sendVerificationEmail('user@example.com', 'verify-token-abc');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('http://localhost:3000');
    });

    it('should return success when email sends successfully', async () => {
      const result = await sendVerificationEmail('user@example.com', 'token');

      expect(result).toEqual(
        expect.objectContaining({ success: true }),
      );
    });

    it('should return error when email fails to send', async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid API key' },
      });

      const result = await sendVerificationEmail('user@example.com', 'token');

      expect(result).toEqual(
        expect.objectContaining({ success: false }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send reset email with correct subject', async () => {
      await sendPasswordResetEmail('user@example.com', 'reset-token-xyz');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toBe('user@example.com');
      expect(callArgs.subject).toContain('Reset your password');
    });

    it('should include reset token in the email body URL', async () => {
      await sendPasswordResetEmail('user@example.com', 'reset-token-xyz');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('reset-token-xyz');
    });

    it('should return success on successful send', async () => {
      const result = await sendPasswordResetEmail('user@example.com', 'token');

      expect(result).toEqual(
        expect.objectContaining({ success: true }),
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct subject', async () => {
      await sendWelcomeEmail('user@example.com', 'Alice');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toBe('user@example.com');
      expect(callArgs.subject).toContain('Welcome to BrandsIQ');
    });

    it('should personalize with name when provided', async () => {
      await sendWelcomeEmail('user@example.com', 'Alice');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Alice');
    });

    it('should handle missing name gracefully', async () => {
      await sendWelcomeEmail('user@example.com');

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.to).toBe('user@example.com');
    });

    it('should return error when send fails', async () => {
      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Rate limited' },
      });

      const result = await sendWelcomeEmail('user@example.com', 'Bob');

      expect(result).toEqual(
        expect.objectContaining({ success: false }),
      );
    });
  });
});
