/**
 * Integration test helpers
 * These tests run against a real PostgreSQL database in CI
 */
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });
  }
  return prisma;
}

/**
 * Clean all tables in the test database
 * Must be called in beforeEach to ensure test isolation
 */
export async function cleanDatabase() {
  const db = getTestPrisma();

  // Delete in dependency order (children first)
  await db.responseVersion.deleteMany();
  await db.creditUsage.deleteMany();
  await db.sentimentUsage.deleteMany();
  await db.reviewResponse.deleteMany();
  await db.review.deleteMany();
  await db.brandVoice.deleteMany();
  await db.verificationToken.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.user.deleteMany();
}

/**
 * Create a test user with default values
 */
export async function createTestUser(overrides?: Record<string, unknown>) {
  const db = getTestPrisma();
  return db.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      name: 'Test User',
      password: '$2a$12$LJ3/mF.QJeGtq7aREj7sYeX/0GKGx8MhD.gX/3BZ.vR8oE3t3VkWi', // "Password1"
      emailVerified: new Date(),
      tier: 'FREE',
      credits: 15,
      sentimentCredits: 35,
      creditsResetDate: new Date(),
      sentimentResetDate: new Date(),
      ...overrides,
    },
  });
}

/**
 * Disconnect prisma after all tests
 */
export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
  }
}
