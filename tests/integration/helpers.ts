/**
 * Integration test helpers
 * These tests run against a real PostgreSQL database in CI
 */
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

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
 * Clean all tables in the test database using TRUNCATE CASCADE
 * Must be called in beforeEach to ensure test isolation
 */
export async function cleanDatabase() {
  const db = getTestPrisma();

  // Use raw SQL TRUNCATE CASCADE for reliable cleanup
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE
      response_versions,
      credit_usage,
      sentiment_usage,
      review_responses,
      reviews,
      brand_voices,
      verification_tokens,
      sessions,
      accounts,
      users
    CASCADE
  `);
}

/**
 * Create a test user with a guaranteed unique email
 */
let userCounter = 0;
export async function createTestUser(overrides?: Record<string, unknown>) {
  const db = getTestPrisma();
  const uniqueId = `${Date.now()}-${++userCounter}-${crypto.randomBytes(4).toString('hex')}`;

  return db.user.create({
    data: {
      email: `test-${uniqueId}@example.com`,
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
