import { test, expect } from '@playwright/test';

/**
 * E2E coverage for the closed-beta surfaces. These exercise the public
 * routes only — claiming a real invite (which requires DB seeding on
 * staging) is covered by the integration tests + manual smoke test.
 */
test.describe('Beta invite signup surfaces', () => {
  test('signup page with no invite code shows the standard form, no banner', async ({ page }) => {
    await page.goto('/auth/signup');

    await expect(page.locator('text=Create an account')).toBeVisible();
    await expect(page.getByTestId('beta-invite-banner')).toHaveCount(0);
  });

  test('signup with an unknown invite code redirects to /auth/beta-link-expired', async ({ page }) => {
    await page.goto('/auth/signup?b=this-code-does-not-exist-1234');

    // The form's effect calls /api/beta-invites/[code]/validate, sees
    // exists=false, and replaces the URL.
    await page.waitForURL(/\/auth\/beta-link-expired/);

    await expect(page.locator('text=This beta invite link has expired')).toBeVisible();
  });

  test('beta-link-expired page renders the embedded inquiry form and a regular-signup link', async ({ page }) => {
    await page.goto('/auth/beta-link-expired');

    await expect(page.locator('text=This beta invite link has expired')).toBeVisible();
    // Continue link points back to signup
    await expect(page.locator('a[href="/auth/signup"]')).toBeVisible();
    // Iteration 2: the FounderInquiryForm is now embedded. Confirm the form
    // fields are present rather than asserting a mailto link.
    await expect(page.locator('#founder-inquiry-email')).toBeVisible();
    await expect(page.locator('#founder-inquiry-message')).toBeVisible();
  });

  test('admin beta-invites page is not reachable for unauthenticated users (404)', async ({ page }) => {
    const response = await page.goto('/dashboard/admin/beta-invites');
    expect(response?.status()).toBe(404);
  });

  test('admin beta-invites API is not reachable for unauthenticated users (404)', async ({ request }) => {
    const response = await request.get('/api/admin/beta-invites');
    expect(response.status()).toBe(404);
  });
});
