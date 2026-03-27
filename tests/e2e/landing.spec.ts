import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('loads and displays the hero section', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/ReviewFlow/);

    // Hero heading visible
    await expect(page.locator('h1')).toContainText('Respond to Reviews');
    await expect(page.locator('h1')).toContainText('10x Faster');
  });

  test('has navigation links', async ({ page }) => {
    await page.goto('/');

    // Sign In link
    const signInLink = page.locator('a[href="/auth/signin"]');
    await expect(signInLink).toBeVisible();

    // Get Started link (first one in header nav)
    const getStartedLink = page.locator('a[href="/auth/signup"]').first();
    await expect(getStartedLink).toBeVisible();
  });

  test('navigates to sign in page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/auth/signin"]');

    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('navigates to sign up page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/auth/signup"]');

    await expect(page).toHaveURL(/\/auth\/signup/);
    await expect(page.locator('text=Create an account')).toBeVisible();
  });
});
