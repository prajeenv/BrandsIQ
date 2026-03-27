/**
 * Prisma client mock factory for unit tests
 */
import { vi } from 'vitest';

function createModelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
    groupBy: vi.fn(),
    aggregate: vi.fn(),
  };
}

export function createPrismaMock() {
  const mock = {
    user: createModelMock(),
    account: createModelMock(),
    session: createModelMock(),
    verificationToken: createModelMock(),
    brandVoice: createModelMock(),
    review: createModelMock(),
    reviewResponse: createModelMock(),
    responseVersion: createModelMock(),
    creditUsage: createModelMock(),
    sentimentUsage: createModelMock(),
    $transaction: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };

  // Default $transaction implementation: execute callback with mock as tx client
  mock.$transaction.mockImplementation(async (fnOrArray: unknown) => {
    if (typeof fnOrArray === 'function') {
      return (fnOrArray as (tx: typeof mock) => Promise<unknown>)(mock);
    }
    // Array form: resolve all promises
    return Promise.all(fnOrArray as Promise<unknown>[]);
  });

  return mock;
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;
