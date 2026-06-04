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
  sendFounderInquiryNotification,
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

    it('should render Free Plan content by default (isBetaUser omitted)', async () => {
      await sendWelcomeEmail('user@example.com', 'Alice');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Free Plan');
      expect(callArgs.html).toContain('5 AI-generated responses');
      expect(callArgs.html).toContain('25 sentiment analyses');
      // Make sure beta-specific copy is NOT present in the Free email
      expect(callArgs.html).not.toContain('closed beta');
      expect(callArgs.html).not.toContain('150 AI-generated');
    });

    it('should render beta plan content when isBetaUser=true', async () => {
      // Locks in MVP Phase 1 contract (MVP.md Section 12.3): beta users get
      // 150/750 framing and copy, not Free-plan 5/25 framing.
      await sendWelcomeEmail('user@example.com', 'Alice', true);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.subject).toContain('closed beta');
      expect(callArgs.html).toContain('closed beta');
      expect(callArgs.html).toContain('beta plan');
      expect(callArgs.html).toContain('150 AI-generated responses');
      expect(callArgs.html).toContain('750 sentiment analyses');
      // Make sure Free-tier numbers don't leak through
      expect(callArgs.html).not.toContain('Free Plan');
      expect(callArgs.html).not.toContain('5 AI-generated');
      expect(callArgs.html).not.toContain('25 sentiment');
    });

    it('isBetaUser=false explicitly should behave the same as default', async () => {
      await sendWelcomeEmail('user@example.com', 'Alice', false);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Free Plan');
      expect(callArgs.html).not.toContain('closed beta');
    });
  });

  // MVP Phase 1 iteration 2: founder-inquiry notification email
  // See src/lib/email.ts and MVP.md Section 13.4.
  describe('sendFounderInquiryNotification', () => {
    const baseInquiry = {
      type: 'beta_request' as const,
      source: 'pricing' as const,
      submitterName: 'Anita',
      submitterEmail: 'anita@example.com',
      businessName: 'Cafe Arabica',
      message: 'I run a small cafe and want to try BrandsIQ.',
      inquiryId: 'inq-abc',
    };

    it('sends to the founder public email and uses a labelled subject', async () => {
      await sendFounderInquiryNotification(baseInquiry);

      expect(mockSend).toHaveBeenCalledTimes(1);
      const callArgs = mockSend.mock.calls[0][0];
      // The founder public email is the destination
      expect(callArgs.to).toBe('prajeen@brandsiq.app');
      // Subject includes a human label for the inquiry type
      expect(callArgs.subject).toContain('Beta access request');
    });

    it('sets replyTo to the submitter email so reply-button works', async () => {
      await sendFounderInquiryNotification(baseInquiry);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.replyTo).toBe('anita@example.com');
    });

    it('omits replyTo when the submitter email is missing', async () => {
      await sendFounderInquiryNotification({
        ...baseInquiry,
        submitterEmail: null,
      });
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.replyTo).toBeUndefined();
      // And the closing note flags that there's no submitter email
      expect(callArgs.html).toContain('No submitter email captured');
    });

    it('includes inquiryId, business name, and message in the body', async () => {
      await sendFounderInquiryNotification(baseInquiry);
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('inq-abc');
      expect(callArgs.html).toContain('Cafe Arabica');
      expect(callArgs.html).toContain('I run a small cafe and want to try BrandsIQ.');
    });

    it('HTML-escapes user-supplied message content', async () => {
      await sendFounderInquiryNotification({
        ...baseInquiry,
        message: 'Hi <script>alert("xss")</script> I want access!',
      });
      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).not.toContain('<script>alert');
      expect(callArgs.html).toContain('&lt;script&gt;');
      // Tag close-bracket also escaped
      expect(callArgs.html).toContain('&lt;/script&gt;');
    });

    it('returns success result on Resend success', async () => {
      const result = await sendFounderInquiryNotification(baseInquiry);
      expect(result).toEqual(expect.objectContaining({ success: true }));
    });

    it('returns error when Resend reports an error', async () => {
      mockSend.mockResolvedValueOnce({ data: null, error: { message: 'Rate limited' } });
      const result = await sendFounderInquiryNotification(baseInquiry);
      expect(result).toEqual(expect.objectContaining({ success: false }));
    });

    it('uses the right subject label for each inquiry type', async () => {
      await sendFounderInquiryNotification({ ...baseInquiry, type: 'more_credits' });
      expect(mockSend.mock.calls[0][0].subject).toContain('More-credits request');

      vi.clearAllMocks();
      mockSend.mockResolvedValue({ data: { id: 'x' }, error: null });
      await sendFounderInquiryNotification({ ...baseInquiry, type: 'expired_link_recovery' });
      expect(mockSend.mock.calls[0][0].subject).toContain('Expired-link recovery');

      vi.clearAllMocks();
      mockSend.mockResolvedValue({ data: { id: 'x' }, error: null });
      await sendFounderInquiryNotification({ ...baseInquiry, type: 'general' });
      expect(mockSend.mock.calls[0][0].subject).toContain('General inquiry');
    });
  });
});
