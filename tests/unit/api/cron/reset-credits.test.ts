import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockResetMonthlyCredits = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db-utils', () => ({
  resetMonthlyCredits: mockResetMonthlyCredits,
}));

import { GET } from '@/app/api/cron/reset-credits/route';
import { NextRequest } from 'next/server';

function createRequest(
  url: string,
  opts?: { method?: string; body?: unknown; headers?: Record<string, string> }
): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000').toString(), {
    method: opts?.method || 'GET',
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.headers || {}),
    },
  });
}

describe('GET /api/cron/reset-credits', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockResetMonthlyCredits.mockResolvedValue({
      success: true,
      usersReset: 2,
      errors: [],
      details: [
        { userId: 'u1', tier: 'FREE', creditsReset: 15, sentimentReset: 35 },
        { userId: 'u2', tier: 'STARTER', creditsReset: 30, sentimentReset: 150 },
      ],
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns 401 for missing auth header', async () => {
    process.env.CRON_SECRET = 'test-secret';

    const req = createRequest('/api/cron/reset-credits');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 401 for invalid auth header', async () => {
    process.env.CRON_SECRET = 'test-secret';

    const req = createRequest('/api/cron/reset-credits', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    const res = await GET(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('calls resetMonthlyCredits and returns 200 on success', async () => {
    process.env.CRON_SECRET = 'test-secret';

    const req = createRequest('/api/cron/reset-credits', {
      headers: { Authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockResetMonthlyCredits).toHaveBeenCalledTimes(1);
  });

  it('returns summary with users reset count', async () => {
    process.env.CRON_SECRET = 'test-secret';

    const req = createRequest('/api/cron/reset-credits', {
      headers: { Authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.usersReset).toBe(2);
    expect(json.data.errors).toEqual([]);
    expect(json.data.details).toHaveLength(2);
    expect(json.data.details[0]).toEqual(
      expect.objectContaining({ userId: 'u1', tier: 'FREE', creditsReset: 15 })
    );
  });

  it('allows access when no CRON_SECRET in env (development mode)', async () => {
    delete process.env.CRON_SECRET;
    process.env.NODE_ENV = 'development';

    const req = createRequest('/api/cron/reset-credits');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockResetMonthlyCredits).toHaveBeenCalledTimes(1);
  });
});
