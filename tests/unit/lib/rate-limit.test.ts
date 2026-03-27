import { describe, it, expect, beforeEach } from 'vitest';
import {
  loginRateLimit,
  apiRateLimit,
  aiRateLimit,
  getClientIP,
  checkRateLimit,
} from '@/lib/rate-limit';

describe('getClientIP', () => {
  it('should extract the first IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.50, 70.41.3.18, 150.172.238.178' },
    });

    const ip = getClientIP(request);

    expect(ip).toBe('203.0.113.50');
  });

  it('should use x-real-ip when x-forwarded-for is absent', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-real-ip': '198.51.100.14' },
    });

    const ip = getClientIP(request);

    expect(ip).toBe('198.51.100.14');
  });

  it('should return 127.0.0.1 when no IP headers are present', () => {
    const request = new Request('http://localhost');

    const ip = getClientIP(request);

    expect(ip).toBe('127.0.0.1');
  });

  it('should handle single IP in x-forwarded-for without commas', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });

    const ip = getClientIP(request);

    expect(ip).toBe('10.0.0.1');
  });

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
      },
    });

    const ip = getClientIP(request);

    expect(ip).toBe('1.1.1.1');
  });
});

describe('checkRateLimit', () => {
  it('should return success for a request within limits', async () => {
    const result = await checkRateLimit(apiRateLimit, 'check-success-test');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.headers).toBeDefined();
  });

  it('should include rate limit headers on success', async () => {
    const result = await checkRateLimit(apiRateLimit, 'check-headers-test');

    expect(result.headers['X-RateLimit-Limit']).toBeDefined();
    expect(result.headers['X-RateLimit-Remaining']).toBeDefined();
    expect(result.headers['X-RateLimit-Reset']).toBeDefined();
  });

  it('should not include Retry-After header on success', async () => {
    const result = await checkRateLimit(apiRateLimit, 'check-no-retry-test');

    expect(result.headers['Retry-After']).toBeUndefined();
  });
});

describe('loginRateLimit', () => {
  it('should allow requests within the limit of 5', async () => {
    const identifier = `login-allow-${Date.now()}`;

    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(loginRateLimit, identifier);
      expect(result.success).toBe(true);
    }
  });

  it('should reject the 6th request after 5 are consumed', async () => {
    const identifier = `login-exhaust-${Date.now()}`;

    // Exhaust all 5 allowed requests
    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit(loginRateLimit, identifier);
      expect(result.success).toBe(true);
    }

    // The 6th request should fail
    const result = await checkRateLimit(loginRateLimit, identifier);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(result.headers['Retry-After']).toBeDefined();
  });

  it('should track different identifiers independently', async () => {
    const identifierA = `login-a-${Date.now()}`;
    const identifierB = `login-b-${Date.now()}`;

    // Exhaust identifier A
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(loginRateLimit, identifierA);
    }

    // Identifier B should still work
    const result = await checkRateLimit(loginRateLimit, identifierB);
    expect(result.success).toBe(true);
  });

  it('should show decreasing remaining count', async () => {
    const identifier = `login-remaining-${Date.now()}`;

    const first = await checkRateLimit(loginRateLimit, identifier);
    const firstRemaining = parseInt(first.headers['X-RateLimit-Remaining'], 10);

    const second = await checkRateLimit(loginRateLimit, identifier);
    const secondRemaining = parseInt(second.headers['X-RateLimit-Remaining'], 10);

    expect(secondRemaining).toBeLessThan(firstRemaining);
  });
});

describe('apiRateLimit', () => {
  it('should allow up to 60 requests', async () => {
    const identifier = `api-allow-${Date.now()}`;

    // First request should succeed
    const result = await checkRateLimit(apiRateLimit, identifier);
    expect(result.success).toBe(true);

    // Should report a limit of 60
    const limit = parseInt(result.headers['X-RateLimit-Limit'], 10);
    expect(limit).toBe(60);
  });
});

describe('aiRateLimit', () => {
  it('should allow up to 10 requests', async () => {
    const identifier = `ai-allow-${Date.now()}`;

    const result = await checkRateLimit(aiRateLimit, identifier);
    expect(result.success).toBe(true);

    const limit = parseInt(result.headers['X-RateLimit-Limit'], 10);
    expect(limit).toBe(10);
  });

  it('should reject the 11th request after 10 are consumed', async () => {
    const identifier = `ai-exhaust-${Date.now()}`;

    // Exhaust all 10 allowed requests
    for (let i = 0; i < 10; i++) {
      const result = await checkRateLimit(aiRateLimit, identifier);
      expect(result.success).toBe(true);
    }

    // The 11th request should fail
    const result = await checkRateLimit(aiRateLimit, identifier);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
