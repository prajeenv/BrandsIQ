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
    // CI always sets STAGING_URL from the repo variable; the literal below is a
    // local-DX fallback only. If the staging alias changes, update both this
    // string and the STAGING_URL repo variable.
    baseURL: process.env.STAGING_URL || 'https://brandsiq-git-main-prajeens-projects-eb24da7b.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: {
      // x-e2e-mock opts this Playwright session into the canned AI mock
      // response so tests don't burn Claude credits. The route handlers
      // forward this to generateReviewResponse, which fires the mock ONLY
      // when this header AND the E2E_MOCK_AI env var are both set. See
      // DECISIONS.md #61 — without this gate, manual users on the same
      // Preview deployment as the tests would also short-circuit Claude.
      'x-e2e-mock': '1',
      // Bypass Vercel Deployment Protection for automated testing.
      ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET && {
        'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
      }),
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
