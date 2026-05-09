import { describe, it, expect } from 'vitest';
import { POST, DELETE } from '@/app/api/auth/stash-invite/route';

describe('POST /api/auth/stash-invite', () => {
  it('sets the bx_invite_code cookie when code is valid', async () => {
    const req = new Request('http://localhost/api/auth/stash-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'GOOD-CODE' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    // NextResponse.cookies sets the Set-Cookie header.
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('bx_invite_code=GOOD-CODE');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie).toContain('Max-Age=600');
  });

  it('returns 400 when code is missing', async () => {
    const req = new Request('http://localhost/api/auth/stash-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when code exceeds 64 chars', async () => {
    const req = new Request('http://localhost/api/auth/stash-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'a'.repeat(65) }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 on malformed JSON', async () => {
    const req = new Request('http://localhost/api/auth/stash-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/auth/stash-invite', () => {
  it('clears the cookie with Max-Age=0', async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('bx_invite_code=');
    expect(setCookie).toContain('Max-Age=0');
  });
});
