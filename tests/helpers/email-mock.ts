/**
 * Resend email mock for unit tests
 */
import { vi } from 'vitest';

export function createResendMock() {
  return {
    emails: {
      send: vi.fn().mockResolvedValue({
        data: { id: 'email_test_123' },
        error: null,
      }),
    },
  };
}
