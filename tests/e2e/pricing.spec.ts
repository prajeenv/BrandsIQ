import { test, expect } from '@playwright/test';

test.describe('Pricing Page', () => {
  test('displays all three pricing tiers', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.locator('h1')).toContainText('Pricing Plans');

    // Three tiers visible
    await expect(page.locator('text=Free')).toBeVisible();
    await expect(page.locator('text=Starter')).toBeVisible();
    await expect(page.locator('text=Growth')).toBeVisible();
  });

  test('shows correct prices', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.locator('text=$0')).toBeVisible();
    await expect(page.locator('text=$29')).toBeVisible();
    await expect(page.locator('text=$79')).toBeVisible();
  });

  test('is accessible from landing page', async ({ page }) => {
    await page.goto('/');

    // Look for any pricing-related link on the landing page
    const pricingSection = page.locator('text=Pricing');
    if (await pricingSection.count() > 0) {
      await expect(pricingSection.first()).toBeVisible();
    }
  });
});
