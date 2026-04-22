import { defineConfig } from '@playwright/test';

/**
 * Playwright E2E test configuration for BrandsIQ
 *
 * Tests run against the staging URL after deployment.
 * Set STAGING_URL env var to override the default.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: process.env.STAGING_URL || 'https://brandsiq-git-main-prajeens-projects-eb24da7b.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Bypass Vercel Deployment Protection for automated testing
    ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET && {
      extraHTTPHeaders: {
        'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
      },
    }),
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
