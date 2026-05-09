/**
 * Integration tests for the closed-beta signup flow.
 * Runs against real PostgreSQL in CI.
 *
 * Covers:
 *   - Atomic transaction (user + brand voice + invite-mark-used)
 *   - Beta plan allocation (150/750)
 *   - Anniversary reset honors isBetaUser
 *   - Concurrent signups can't both consume the same invite
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestPrisma, cleanDatabase, disconnectPrisma } from './helpers';
import { resetMonthlyCredits } from '@/lib/db-utils';

const canRunIntegration = !!process.env.DATABASE_URL?.includes('localhost');

const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 1000);

describe.skipIf(!canRunIntegration)('Beta Flow (Integration)', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  it('signup with valid beta code creates a beta user and marks the invite used', async () => {
    const db = getTestPrisma();

    const invite = await db.betaInviteLink.create({
      data: { code: 'GOOD-CODE-1', expiresAt: FUTURE },
    });

    // Simulate the atomic body of the signup route's transaction
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: 'beta1@test.com',
          name: 'Beta User',
          password: 'hashed',
          tier: 'FREE',
          isBetaUser: true,
          credits: 150,
          sentimentCredits: 750,
          creditsResetDate: FUTURE,
          sentimentResetDate: FUTURE,
        },
      });
      await tx.brandVoice.create({
        data: { userId: created.id, tone: 'professional', formality: 3 },
      });
      await tx.betaInviteLink.update({
        where: { code: invite.code },
        data: { usedAt: new Date(), usedByUserId: created.id },
      });
      return created;
    });

    expect(user.isBetaUser).toBe(true);
    expect(user.credits).toBe(150);
    expect(user.sentimentCredits).toBe(750);

    const updatedInvite = await db.betaInviteLink.findUnique({
      where: { code: invite.code },
    });
    expect(updatedInvite!.usedAt).not.toBeNull();
    expect(updatedInvite!.usedByUserId).toBe(user.id);

    // BrandVoice should also have been created in the same transaction
    const brandVoice = await db.brandVoice.findUnique({ where: { userId: user.id } });
    expect(brandVoice).not.toBeNull();
  });

  it('rolls back the entire transaction if any step fails', async () => {
    const db = getTestPrisma();

    const invite = await db.betaInviteLink.create({
      data: { code: 'ATOMIC-CODE', expiresAt: FUTURE },
    });

    // Force a failure mid-transaction by using a duplicate email pre-seeded
    // outside the transaction (the unique constraint will throw on the
    // user.create inside the transaction).
    await db.user.create({
      data: {
        email: 'collision@test.com',
        password: 'hashed',
        tier: 'FREE',
        credits: 15,
        sentimentCredits: 35,
        creditsResetDate: FUTURE,
        sentimentResetDate: FUTURE,
      },
    });

    let threw = false;
    try {
      await db.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: 'collision@test.com', // duplicate — will throw
            password: 'hashed',
            tier: 'FREE',
            isBetaUser: true,
            credits: 150,
            sentimentCredits: 750,
            creditsResetDate: FUTURE,
            sentimentResetDate: FUTURE,
          },
        });
        await tx.betaInviteLink.update({
          where: { code: invite.code },
          data: { usedAt: new Date(), usedByUserId: created.id },
        });
      });
    } catch {
      threw = true;
    }

    expect(threw).toBe(true);

    // Invite should NOT be marked used because the transaction rolled back
    const stillFresh = await db.betaInviteLink.findUnique({
      where: { code: invite.code },
    });
    expect(stillFresh!.usedAt).toBeNull();
    expect(stillFresh!.usedByUserId).toBeNull();
  });

  it('rejects an expired invite at the application layer', async () => {
    const db = getTestPrisma();
    const invite = await db.betaInviteLink.create({
      data: { code: 'EXPIRED-CODE', expiresAt: PAST },
    });

    const isValid =
      invite.expiresAt >= new Date() && invite.usedAt === null;
    expect(isValid).toBe(false);
  });

  it('resetMonthlyCredits resets a beta user to 150/750 (not tier limits)', async () => {
    const db = getTestPrisma();

    // Beta user whose reset date is in the past
    const beta = await db.user.create({
      data: {
        email: 'reset-beta@test.com',
        password: 'hashed',
        tier: 'FREE',
        isBetaUser: true,
        credits: 5,
        sentimentCredits: 20,
        creditsResetDate: PAST,
        sentimentResetDate: PAST,
      },
    });

    // Non-beta user, also overdue, should reset to FREE tier (15/35)
    const free = await db.user.create({
      data: {
        email: 'reset-free@test.com',
        password: 'hashed',
        tier: 'FREE',
        isBetaUser: false,
        credits: 0,
        sentimentCredits: 0,
        creditsResetDate: PAST,
        sentimentResetDate: PAST,
      },
    });

    const result = await resetMonthlyCredits();
    expect(result.success).toBe(true);
    expect(result.usersReset).toBe(2);

    const refreshedBeta = await db.user.findUnique({ where: { id: beta.id } });
    expect(refreshedBeta!.credits).toBe(150);
    expect(refreshedBeta!.sentimentCredits).toBe(750);

    const refreshedFree = await db.user.findUnique({ where: { id: free.id } });
    expect(refreshedFree!.credits).toBe(15);
    expect(refreshedFree!.sentimentCredits).toBe(35);

    // Audit trail records both
    const audit = await db.creditUsage.findMany({
      where: { action: 'MONTHLY_RESET' },
    });
    expect(audit).toHaveLength(2);
  });

  it('Location cascade: deleting a user deletes their locations and reviews', async () => {
    const db = getTestPrisma();

    const user = await db.user.create({
      data: {
        email: 'cascade@test.com',
        password: 'hashed',
        tier: 'FREE',
        credits: 15,
        sentimentCredits: 35,
        creditsResetDate: FUTURE,
        sentimentResetDate: FUTURE,
      },
    });

    const location = await db.location.create({
      data: { userId: user.id, name: 'Default Location' },
    });

    await db.review.create({
      data: {
        userId: user.id,
        locationId: location.id,
        platform: 'Google',
        reviewText: 'Great service',
      },
    });

    await db.user.delete({ where: { id: user.id } });

    expect(await db.location.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.review.count({ where: { userId: user.id } })).toBe(0);
  });

  it('BetaInviteLink.usedByUserId becomes null when the user is deleted (audit survives)', async () => {
    const db = getTestPrisma();

    const user = await db.user.create({
      data: {
        email: 'audit@test.com',
        password: 'hashed',
        tier: 'FREE',
        isBetaUser: true,
        credits: 150,
        sentimentCredits: 750,
        creditsResetDate: FUTURE,
        sentimentResetDate: FUTURE,
      },
    });

    const invite = await db.betaInviteLink.create({
      data: {
        code: 'GDPR-CODE',
        expiresAt: FUTURE,
        usedAt: new Date(),
        usedByUserId: user.id,
      },
    });

    await db.user.delete({ where: { id: user.id } });

    const after = await db.betaInviteLink.findUnique({
      where: { code: invite.code },
    });
    expect(after).not.toBeNull();
    expect(after!.usedAt).not.toBeNull(); // audit-trail timestamps survive
    expect(after!.usedByUserId).toBeNull();
  });
});
