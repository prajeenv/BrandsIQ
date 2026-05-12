import { test, expect } from '@playwright/test';

/**
 * MVP Phase 1 iteration 2 E2E coverage.
 *
 * Covers the public-facing surfaces that ship in iteration 2:
 *  - /pricing closed-beta banner + "Request beta access" CTA opens the inquiry form
 *  - /dashboard/admin/founder-inquiries is 404 for unauthenticated users (admin gate)
 *  - /api/admin/founder-inquiries returns 404 for unauthenticated users (admin gate)
 *
 * The full claim+onboarding+inquiry flow is covered by integration tests
 * (require localhost PostgreSQL) and the manual smoke test on staging.
 */
test.describe('MVP Phase 1 iteration 2 surfaces', () => {
  test('pricing page shows the closed-beta banner under phase_1', async ({ page }) => {
    await page.goto('/pricing');

    // Banner copy from MVP.md Section 12.5
    await expect(page.locator('text=BrandsIQ is currently in closed beta.')).toBeVisible();
    // The CTA in the banner is "Request beta access →" — case-insensitive
    // because Playwright text matchers are sometimes finicky with arrows.
    await expect(
      page.getByRole('button', { name: /request beta access/i }).first(),
    ).toBeVisible();
  });

  test('pricing tier cards are informational under phase_1 — banner is the sole CTA', async ({
    page,
  }) => {
    await page.goto('/pricing');
    // Under phase_1 the per-tier CTAs (both the iteration-1 "Coming Soon"
    // disabled buttons and the early-iteration-2 per-card "Request beta
    // access" buttons) are gone. The closed-beta banner above the grid is
    // the single entry point. So exactly one "Request beta access" button
    // exists on the page — the one inside the banner.
    const ctas = page.getByRole('button', { name: /request beta access/i });
    await expect(ctas).toHaveCount(1);
    // And no "Coming Soon" buttons leak through.
    await expect(page.getByRole('button', { name: /coming soon/i })).toHaveCount(0);
  });

  test('pricing page does not mark Free as "Current Plan" for signed-out visitors', async ({
    page,
  }) => {
    await page.goto('/pricing');
    // Bug fix: anonymous visitors used to see the Free card flagged as
    // "Current Plan" because the userTier defaulted to "FREE". Signed-out
    // users should see no Current Plan badge anywhere on the page.
    await expect(page.getByText('Current Plan')).toHaveCount(0);
  });

  test('clicking "Request beta access" on /pricing opens the inquiry-form dialog', async ({
    page,
  }) => {
    await page.goto('/pricing');
    await page
      .getByRole('button', { name: /request beta access/i })
      .first()
      .click();

    // The dialog contains the FounderInquiryForm fields. The form input ids
    // are deterministic (set in src/components/shared/FounderInquiryForm.tsx).
    await expect(page.locator('#founder-inquiry-email')).toBeVisible();
    await expect(page.locator('#founder-inquiry-message')).toBeVisible();
  });

  test('admin founder-inquiries page is not reachable for unauthenticated users (404)', async ({
    page,
  }) => {
    const response = await page.goto('/dashboard/admin/founder-inquiries');
    expect(response?.status()).toBe(404);
  });

  test('admin founder-inquiries API is not reachable for unauthenticated users (404)', async ({
    request,
  }) => {
    const response = await request.get('/api/admin/founder-inquiries');
    expect(response.status()).toBe(404);
  });

  test('public POST /api/founder-inquiries accepts a valid submission', async ({ request }) => {
    // The route is rate-limited per-IP; we send a single request from the
    // test runner so we shouldn't hit the limit. If this becomes flaky in
    // CI we can introduce a unique IP header per run.
    const response = await request.post('/api/founder-inquiries', {
      data: {
        type: 'beta_request',
        source: 'pricing',
        submitterName: 'E2E Test',
        submitterEmail: `e2e-pricing-${Date.now()}@example.com`,
        businessName: 'Test Co',
        message: 'E2E test submission from iteration-2-surfaces.spec.ts',
      },
    });
    expect(response.status()).toBe(201);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.inquiryId).toBeTruthy();
  });

  test('public POST /api/founder-inquiries rejects submissions with no submitter email', async ({
    request,
  }) => {
    const response = await request.post('/api/founder-inquiries', {
      data: {
        type: 'general',
        source: 'other',
        message: 'No email — should be rejected.',
      },
    });
    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });
});
