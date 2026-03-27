/**
 * NextAuth session mock helpers for unit tests
 */

export interface MockSession {
  user: {
    id: string;
    email?: string;
    name?: string;
    tier?: string;
  };
  expires: string;
}

export function createMockSession(overrides?: Partial<MockSession['user']>): MockSession {
  return {
    user: {
      id: 'clu1234567890abcdef',
      email: 'test@example.com',
      name: 'Test User',
      tier: 'FREE',
      ...overrides,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function createNullSession(): null {
  return null;
}
