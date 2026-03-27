import { test, expect } from '@playwright/test';

test.describe('Authentication Pages', () => {
  test.describe('Sign In Page', () => {
    test('renders sign in form', async ({ page }) => {
      await page.goto('/auth/signin');

      await expect(page.locator('text=Welcome back')).toBeVisible();

      // Email and password inputs exist
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();

      // Submit button
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('shows validation error for empty form submission', async ({ page }) => {
      await page.goto('/auth/signin');

      await page.click('button[type="submit"]');

      // Should stay on sign in page (no redirect)
      await expect(page).toHaveURL(/\/auth\/signin/);
    });

    test('has link to sign up page', async ({ page }) => {
      await page.goto('/auth/signin');

      const signUpLink = page.locator('a[href="/auth/signup"]');
      await expect(signUpLink).toBeVisible();
    });

    test('has link to forgot password', async ({ page }) => {
      await page.goto('/auth/signin');

      const forgotLink = page.locator('a[href="/auth/forgot-password"]');
      await expect(forgotLink).toBeVisible();
    });
  });

  test.describe('Sign Up Page', () => {
    test('renders sign up form', async ({ page }) => {
      await page.goto('/auth/signup');

      await expect(page.locator('text=Create an account')).toBeVisible();

      // Name, email, password inputs exist
      await expect(page.locator('input[name="name"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('has link to sign in page', async ({ page }) => {
      await page.goto('/auth/signup');

      const signInLink = page.locator('a[href="/auth/signin"]');
      await expect(signInLink).toBeVisible();
    });
  });

  test.describe('Forgot Password Page', () => {
    test('renders forgot password form', async ({ page }) => {
      await page.goto('/auth/forgot-password');

      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('redirects unauthenticated user from dashboard to sign in', async ({ page }) => {
      await page.goto('/dashboard');

      // Should redirect to sign in
      await page.waitForURL(/\/auth\/signin|\/api\/auth/, { timeout: 10000 });
    });

    test('redirects unauthenticated user from reviews to sign in', async ({ page }) => {
      await page.goto('/dashboard/reviews');

      await page.waitForURL(/\/auth\/signin|\/api\/auth/, { timeout: 10000 });
    });
  });
});
