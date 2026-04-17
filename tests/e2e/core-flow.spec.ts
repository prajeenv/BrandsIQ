import { test, expect, type Page } from "@playwright/test";

/**
 * Core user flow E2E test
 *
 * Tests the primary happy path: Login → Add Review → Generate Response → Edit → Approve
 *
 * Prerequisites:
 * - Pre-seeded test user in staging DB (e2e-test@brandsiq.app)
 * - E2E_TEST_PASSWORD set as env var / GitHub secret
 * - E2E_MOCK_AI=true set on the Vercel Preview environment (for mock AI responses)
 */

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "e2e-test@brandsiq.app";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "";

async function login(page: Page) {
  await page.goto("/auth/signin");
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe("Core User Flow", () => {
  // Skip if no test password configured (prevents failures in environments without setup)
  test.skip(!TEST_PASSWORD, "E2E_TEST_PASSWORD not set — skipping core flow tests");

  let createdReviewUrl: string | null = null;

  test("login → add review → generate response → edit → approve", async ({
    page,
  }) => {
    // Step 1: Login
    await login(page);
    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });

    // Step 2: Navigate to Add Review
    await page.goto("/dashboard/reviews/new");
    await expect(page.locator("text=Add New Review")).toBeVisible({
      timeout: 10000,
    });

    // Step 3: Fill and submit the review form
    const reviewText = `E2E test review ${Date.now()}: Great product, excellent customer service and fast delivery!`;
    await page.locator("#reviewText").fill(reviewText);

    // Click the 5th star for a 5-star rating
    const starButtons = page.locator(
      'button[type="button"]'
    );
    // The star buttons are inside a flex container after the "Rating (optional)" label
    // Each star is a button with type="button" containing an SVG
    const ratingSection = page.locator("text=Rating (optional)").locator("..");
    const stars = ratingSection.locator('button[type="button"]');
    await stars.nth(4).click(); // 0-indexed, so nth(4) = 5th star

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to review detail page
    await page.waitForURL(/\/dashboard\/reviews\/[a-z0-9]+/, {
      timeout: 15000,
    });
    createdReviewUrl = page.url();

    // Verify we're on the review detail page with our review text visible
    await expect(page.locator(`text=${reviewText.substring(0, 30)}`).first()).toBeVisible({
      timeout: 10000,
    });

    // Step 4: Generate AI Response
    const generateButton = page.locator(
      'button:has-text("Generate Response")'
    ).first();
    await expect(generateButton).toBeVisible({ timeout: 10000 });
    await generateButton.click();

    // Wait for the "Generated" badge to appear (30s for real AI, instant for mock)
    await expect(page.locator("text=Generated").first()).toBeVisible({
      timeout: 30000,
    });

    // Verify response text is visible in the response panel
    await expect(
      page.locator(".bg-muted\\/50").first()
    ).toBeVisible();

    // Step 5: Edit the response
    const editButton = page.locator('button:has-text("Edit")').first();
    await editButton.click();

    // ResponseEditor textarea should appear
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill(
      "Edited E2E response: Thank you for the wonderful review! We appreciate your support."
    );

    // Save the edit
    await page.locator('button:has-text("Save Changes")').click();

    // Wait for "Edited" badge
    await expect(page.locator("text=Edited").first()).toBeVisible({
      timeout: 10000,
    });

    // Step 6: Approve the response
    const approveButton = page.locator('button:has-text("Approve")');
    await expect(approveButton).toBeVisible({ timeout: 5000 });
    await approveButton.click();

    // Wait for "Approved" badge
    await expect(page.locator("text=Approved").first()).toBeVisible({
      timeout: 10000,
    });
  });

  // Cleanup: delete the test review to avoid accumulating test data
  test("cleanup: delete test review", async ({ page }) => {
    test.skip(!createdReviewUrl, "No review was created to clean up");

    await login(page);
    await page.goto(createdReviewUrl!);

    // Click the delete button (trash icon in the header area)
    const deleteButton = page.locator('button:has-text("Delete")').first();
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Confirm deletion in the dialog
    const confirmButton = page.locator(
      'button:has-text("Delete")'
    ).last(); // The confirm button in the dialog
    await confirmButton.click();

    // Should redirect to reviews list
    await page.waitForURL(/\/dashboard\/reviews/, { timeout: 10000 });
  });
});
