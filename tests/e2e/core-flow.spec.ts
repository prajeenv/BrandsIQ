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

    // Step 2: Navigate to Add Review
    await page.goto("/dashboard/reviews/new");
    // Target the page heading specifically (there's also a card title with the same text)
    await expect(
      page.getByRole("heading", { name: "Add New Review" })
    ).toBeVisible({ timeout: 10000 });

    // Step 3: Fill and submit the review form
    const reviewText = `E2E test review ${Date.now()}: Great product, excellent customer service and fast delivery!`;
    await page.locator("#reviewText").fill(reviewText);

    // Click the 5th star for a 5-star rating.
    // The star buttons are inside a flex container after the "Rating (optional)" label.
    const ratingSection = page.locator("text=Rating (optional)").locator("..");
    const stars = ratingSection.locator('button[type="button"]');
    await stars.nth(4).click();

    // Submit the form
    await page.locator('button[type="submit"]').click();

    // Wait for redirect to review detail page
    await page.waitForURL(/\/dashboard\/reviews\/[a-z0-9]+/, {
      timeout: 15000,
    });
    createdReviewUrl = page.url();

    // Step 4: Generate AI Response
    const generateButton = page
      .getByRole("button", { name: /generate response/i })
      .first();
    await expect(generateButton).toBeVisible({ timeout: 10000 });
    await generateButton.click();

    // Wait for the "Generated" badge to appear (30s for real AI, instant for mock)
    await expect(page.getByText("Generated", { exact: true }).first()).toBeVisible({
      timeout: 30000,
    });

    // Step 5: Edit the response
    const editButton = page.getByRole("button", { name: /^edit$/i }).first();
    await editButton.click();

    // ResponseEditor textarea should appear
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.fill(
      "Edited E2E response: Thank you for the wonderful review! We appreciate your support."
    );

    // Save the edit
    await page.getByRole("button", { name: /save changes/i }).click();

    // Wait for "Edited" badge
    await expect(page.getByText("Edited", { exact: true }).first()).toBeVisible({
      timeout: 10000,
    });

    // Step 6: Approve the response
    const approveButton = page.getByRole("button", { name: /^approve$/i });
    await expect(approveButton).toBeVisible({ timeout: 5000 });
    await approveButton.click();

    // Wait for "Approved" badge
    await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible({
      timeout: 10000,
    });
  });

  // Cleanup: delete the test review to avoid accumulating test data
  test("cleanup: delete test review", async ({ page }) => {
    test.skip(!createdReviewUrl, "No review was created to clean up");

    await login(page);
    await page.goto(createdReviewUrl!);

    // Click the delete button (trash icon in the header area)
    const deleteButton = page.getByRole("button", { name: /delete/i }).first();
    await expect(deleteButton).toBeVisible({ timeout: 10000 });
    await deleteButton.click();

    // Confirm deletion in the dialog — the last Delete button is the dialog confirm
    const confirmButton = page.getByRole("button", { name: /^delete$/i }).last();
    await confirmButton.click();

    // Should redirect to reviews list
    await page.waitForURL(/\/dashboard\/reviews/, { timeout: 10000 });
  });
});
