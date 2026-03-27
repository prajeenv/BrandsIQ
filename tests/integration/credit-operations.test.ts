/**
 * Integration tests for credit operations
 * Runs against real PostgreSQL in CI
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestPrisma, cleanDatabase, createTestUser, disconnectPrisma } from './helpers';

const canRunIntegration = !!process.env.DATABASE_URL?.includes('localhost');

describe.skipIf(!canRunIntegration)('Credit Operations (Integration)', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  it('deducts credits atomically in a transaction', async () => {
    const db = getTestPrisma();
    const user = await createTestUser({ credits: 15 });

    await db.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: user.id } });
      expect(u!.credits).toBe(15);

      await tx.user.update({
        where: { id: user.id },
        data: { credits: { decrement: 1 } },
      });

      await tx.creditUsage.create({
        data: {
          userId: user.id,
          creditsUsed: 1,
          action: 'GENERATE_RESPONSE',
        },
      });
    });

    const updated = await db.user.findUnique({ where: { id: user.id } });
    expect(updated!.credits).toBe(14);

    const usage = await db.creditUsage.findMany({ where: { userId: user.id } });
    expect(usage).toHaveLength(1);
    expect(usage[0].action).toBe('GENERATE_RESPONSE');
  });

  it('prevents negative credit balance', async () => {
    const db = getTestPrisma();
    const user = await createTestUser({ credits: 0 });

    const deductResult = await db.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: user.id } });
      if (!u || u.credits < 1) {
        return { success: false, error: 'INSUFFICIENT_CREDITS' };
      }
      return { success: true };
    });

    expect(deductResult.success).toBe(false);
    expect(deductResult.error).toBe('INSUFFICIENT_CREDITS');

    // Verify credits unchanged
    const unchanged = await db.user.findUnique({ where: { id: user.id } });
    expect(unchanged!.credits).toBe(0);
  });

  it('creates review with cascading relationships', async () => {
    const db = getTestPrisma();
    const user = await createTestUser();

    const review = await db.review.create({
      data: {
        userId: user.id,
        platform: 'Google',
        reviewText: 'Great service!',
        rating: 5,
        detectedLanguage: 'English',
        sentiment: 'positive',
      },
    });

    const response = await db.reviewResponse.create({
      data: {
        reviewId: review.id,
        responseText: 'Thank you!',
        toneUsed: 'professional',
        creditsUsed: 1,
      },
    });

    // Verify cascade: deleting review should delete response
    await db.review.delete({ where: { id: review.id } });
    const orphanedResponse = await db.reviewResponse.findUnique({
      where: { id: response.id },
    });
    expect(orphanedResponse).toBeNull();
  });

  it('resets credits for users past reset date', async () => {
    const db = getTestPrisma();
    const pastDate = new Date('2020-01-01');
    const user = await createTestUser({
      credits: 3,
      sentimentCredits: 5,
      creditsResetDate: pastDate,
      sentimentResetDate: pastDate,
    });

    // Find users needing reset
    const usersToReset = await db.user.findMany({
      where: { creditsResetDate: { lt: new Date() } },
    });
    expect(usersToReset).toHaveLength(1);

    // Reset credits
    const nextReset = new Date(pastDate);
    nextReset.setUTCDate(nextReset.getUTCDate() + 30);

    await db.user.update({
      where: { id: user.id },
      data: {
        credits: 15,
        sentimentCredits: 35,
        creditsResetDate: nextReset,
        sentimentResetDate: nextReset,
      },
    });

    const reset = await db.user.findUnique({ where: { id: user.id } });
    expect(reset!.credits).toBe(15);
    expect(reset!.sentimentCredits).toBe(35);
  });

  it('preserves audit trail when review is deleted (SetNull)', async () => {
    const db = getTestPrisma();
    const user = await createTestUser();

    const review = await db.review.create({
      data: {
        userId: user.id,
        platform: 'Google',
        reviewText: 'Test review',
        detectedLanguage: 'English',
      },
    });

    // Create credit usage linked to review
    const usage = await db.creditUsage.create({
      data: {
        userId: user.id,
        reviewId: review.id,
        creditsUsed: 1,
        action: 'GENERATE_RESPONSE',
        details: JSON.stringify({ reviewId: review.id, platform: 'Google' }),
      },
    });

    // Delete the review
    await db.review.delete({ where: { id: review.id } });

    // Verify audit trail preserved with null reviewId
    const preserved = await db.creditUsage.findUnique({ where: { id: usage.id } });
    expect(preserved).not.toBeNull();
    expect(preserved!.reviewId).toBeNull();
    expect(preserved!.details).toContain('Google');
  });

  it('deducts sentiment credits and creates audit log', async () => {
    const db = getTestPrisma();
    const user = await createTestUser({ sentimentCredits: 35 });

    const review = await db.review.create({
      data: {
        userId: user.id,
        platform: 'Amazon',
        reviewText: 'Good product',
        detectedLanguage: 'English',
      },
    });

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { sentimentCredits: { decrement: 1 } },
      });
      await tx.sentimentUsage.create({
        data: {
          userId: user.id,
          reviewId: review.id,
          sentiment: 'positive',
        },
      });
    });

    const updated = await db.user.findUnique({ where: { id: user.id } });
    expect(updated!.sentimentCredits).toBe(34);

    const sentimentUsage = await db.sentimentUsage.findMany({ where: { userId: user.id } });
    expect(sentimentUsage).toHaveLength(1);
    expect(sentimentUsage[0].sentiment).toBe('positive');
  });
});
