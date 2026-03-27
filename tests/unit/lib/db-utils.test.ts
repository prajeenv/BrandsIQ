import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TEST_USER, TEST_REVIEW, TEST_BRAND_VOICE } from '../../helpers/fixtures';

// Must use vi.hoisted so the mock is available when vi.mock factory runs
const mockPrisma = vi.hoisted(() => {
  const createModelMock = () => ({
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
  });

  return {
    user: createModelMock(),
    review: createModelMock(),
    reviewResponse: createModelMock(),
    responseVersion: createModelMock(),
    brandVoice: createModelMock(),
    creditUsage: createModelMock(),
    sentimentUsage: createModelMock(),
    verificationToken: createModelMock(),
    $transaction: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  };
});

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// Import after mock
import {
  getUserWithCredits,
  getUserWithBrandVoice,
  getUserByEmail,
  getReviewWithResponse,
  getReviewsPaginated,
  deductCreditsAtomic,
  refundCreditsAtomic,
  hasSentimentCredits,
  deductSentimentCredits,
  resetMonthlyCredits,
  shouldResetCredits,
  getOrCreateBrandVoice,
  getUserStats,
} from '@/lib/db-utils';

beforeEach(() => {
  vi.clearAllMocks();
  // Reset $transaction to default callback behavior
  mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
    if (typeof fn === 'function') {
      return (fn as (tx: typeof mockPrisma) => Promise<unknown>)(mockPrisma);
    }
    return Promise.all(fn as Promise<unknown>[]);
  });
});

// ─── User Queries ─────────────────────────────────────────

describe('getUserWithCredits', () => {
  it('returns user with credit fields', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_USER);
    const result = await getUserWithCredits(TEST_USER.id);
    expect(result).toEqual(TEST_USER);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: TEST_USER.id },
      select: expect.objectContaining({
        id: true,
        credits: true,
        tier: true,
        sentimentCredits: true,
      }),
    });
  });

  it('returns null for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await getUserWithCredits('nonexistent');
    expect(result).toBeNull();
  });
});

describe('getUserWithBrandVoice', () => {
  it('returns user with brandVoice included', async () => {
    const userWithBV = { ...TEST_USER, brandVoice: TEST_BRAND_VOICE };
    mockPrisma.user.findUnique.mockResolvedValue(userWithBV);
    const result = await getUserWithBrandVoice(TEST_USER.id);
    expect(result).toEqual(userWithBV);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: TEST_USER.id },
      include: { brandVoice: true },
    });
  });
});

describe('getUserByEmail', () => {
  it('lowercases email in query', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(TEST_USER);
    await getUserByEmail('Test@Example.COM');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
  });

  it('returns null for non-existent email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await getUserByEmail('nobody@example.com');
    expect(result).toBeNull();
  });
});

// ─── Review Queries ───────────────────────────────────────

describe('getReviewWithResponse', () => {
  it('queries by reviewId and userId', async () => {
    const reviewWithResponse = { ...TEST_REVIEW, response: null };
    mockPrisma.review.findFirst.mockResolvedValue(reviewWithResponse);
    const result = await getReviewWithResponse(TEST_REVIEW.id, TEST_USER.id);
    expect(result).toEqual(reviewWithResponse);
    expect(mockPrisma.review.findFirst).toHaveBeenCalledWith({
      where: { id: TEST_REVIEW.id, userId: TEST_USER.id },
      include: expect.objectContaining({
        response: expect.any(Object),
      }),
    });
  });
});

describe('getReviewsPaginated', () => {
  it('returns paginated results with correct metadata', async () => {
    const reviews = [TEST_REVIEW];
    mockPrisma.review.findMany.mockResolvedValue(reviews);
    mockPrisma.review.count.mockResolvedValue(1);

    const result = await getReviewsPaginated(TEST_USER.id, { page: 1, limit: 20 });
    expect(result).toEqual({
      reviews,
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasMore: false,
    });
  });

  it('applies platform filter', async () => {
    mockPrisma.review.findMany.mockResolvedValue([]);
    mockPrisma.review.count.mockResolvedValue(0);

    await getReviewsPaginated(TEST_USER.id, { platform: 'Google' });
    expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ platform: 'Google' }),
      })
    );
  });

  it('applies sentiment filter', async () => {
    mockPrisma.review.findMany.mockResolvedValue([]);
    mockPrisma.review.count.mockResolvedValue(0);

    await getReviewsPaginated(TEST_USER.id, { sentiment: 'positive' });
    expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ sentiment: 'positive' }),
      })
    );
  });

  it('calculates totalPages and hasMore correctly', async () => {
    mockPrisma.review.findMany.mockResolvedValue(Array(20).fill(TEST_REVIEW));
    mockPrisma.review.count.mockResolvedValue(45);

    const result = await getReviewsPaginated(TEST_USER.id, { page: 1, limit: 20 });
    expect(result.totalPages).toBe(3);
    expect(result.hasMore).toBe(true);
  });

  it('defaults to page 1 and limit 20', async () => {
    mockPrisma.review.findMany.mockResolvedValue([]);
    mockPrisma.review.count.mockResolvedValue(0);

    const result = await getReviewsPaginated(TEST_USER.id);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 })
    );
  });
});

// ─── Credit Operations ────────────────────────────────────

describe('deductCreditsAtomic', () => {
  it('deducts credits and creates audit log in transaction', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: TEST_USER.id,
      credits: 15,
      tier: 'FREE',
    });
    mockPrisma.user.update.mockResolvedValue({
      id: TEST_USER.id,
      credits: 14,
      tier: 'FREE',
    });
    mockPrisma.creditUsage.create.mockResolvedValue({});

    const result = await deductCreditsAtomic(
      TEST_USER.id, 1, 'GENERATE_RESPONSE', TEST_REVIEW.id
    );

    expect(result.success).toBe(true);
    expect(result.user).toEqual({ id: TEST_USER.id, credits: 14, tier: 'FREE' });
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { credits: { decrement: 1 } },
      })
    );
    expect(mockPrisma.creditUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: TEST_USER.id,
          creditsUsed: 1,
          action: 'GENERATE_RESPONSE',
        }),
      })
    );
  });

  it('returns INSUFFICIENT_CREDITS when balance too low', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: TEST_USER.id,
      credits: 0,
      tier: 'FREE',
    });

    const result = await deductCreditsAtomic(TEST_USER.id, 1, 'GENERATE_RESPONSE');
    expect(result.success).toBe(false);
    expect(result.error).toBe('INSUFFICIENT_CREDITS');
  });

  it('returns USER_NOT_FOUND for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await deductCreditsAtomic('nonexistent', 1, 'GENERATE_RESPONSE');
    expect(result.success).toBe(false);
    expect(result.error).toBe('USER_NOT_FOUND');
  });

  it('logs details JSON when provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: TEST_USER.id,
      credits: 15,
      tier: 'FREE',
    });
    mockPrisma.user.update.mockResolvedValue({
      id: TEST_USER.id,
      credits: 14,
      tier: 'FREE',
    });
    mockPrisma.creditUsage.create.mockResolvedValue({});

    const details = { platform: 'Google', tone: 'professional' };
    await deductCreditsAtomic(TEST_USER.id, 1, 'GENERATE_RESPONSE', undefined, undefined, details);

    expect(mockPrisma.creditUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          details: JSON.stringify(details),
        }),
      })
    );
  });
});

describe('refundCreditsAtomic', () => {
  it('increments credits and creates negative audit entry', async () => {
    mockPrisma.user.update.mockResolvedValue({
      id: TEST_USER.id,
      credits: 16,
      tier: 'FREE',
    });
    mockPrisma.creditUsage.create.mockResolvedValue({});

    const result = await refundCreditsAtomic(TEST_USER.id, 1, 'Test refund');
    expect(result.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { credits: { increment: 1 } },
      })
    );
    expect(mockPrisma.creditUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          creditsUsed: -1,
          action: 'REFUND',
        }),
      })
    );
  });

  it('handles error gracefully', async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error('DB_ERROR'));

    const result = await refundCreditsAtomic(TEST_USER.id, 1, 'reason');
    expect(result.success).toBe(false);
    expect(result.error).toBe('DB_ERROR');
  });
});

// ─── Sentiment Operations ─────────────────────────────────

describe('hasSentimentCredits', () => {
  it('returns true when credits > 0', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ sentimentCredits: 10 });
    const result = await hasSentimentCredits(TEST_USER.id);
    expect(result).toBe(true);
  });

  it('returns false when credits = 0', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ sentimentCredits: 0 });
    const result = await hasSentimentCredits(TEST_USER.id);
    expect(result).toBe(false);
  });

  it('returns false for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await hasSentimentCredits('nonexistent');
    expect(result).toBe(false);
  });
});

describe('deductSentimentCredits', () => {
  it('deducts 1 sentiment credit', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      sentimentCredits: 35,
      tier: 'FREE',
    });
    mockPrisma.user.update.mockResolvedValue({
      sentimentCredits: 34,
      tier: 'FREE',
    });
    mockPrisma.sentimentUsage.create.mockResolvedValue({});

    const result = await deductSentimentCredits(TEST_USER.id, TEST_REVIEW.id, 'positive');
    expect(result.success).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { sentimentCredits: { decrement: 1 } },
      })
    );
  });

  it('returns INSUFFICIENT_SENTIMENT_CREDITS when at 0', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      sentimentCredits: 0,
      tier: 'FREE',
    });

    const result = await deductSentimentCredits(TEST_USER.id, TEST_REVIEW.id, 'positive');
    expect(result.success).toBe(false);
    expect(result.error).toBe('INSUFFICIENT_SENTIMENT_CREDITS');
  });

  it('creates sentimentUsage audit record', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      sentimentCredits: 10,
      tier: 'FREE',
    });
    mockPrisma.user.update.mockResolvedValue({
      sentimentCredits: 9,
      tier: 'FREE',
    });
    mockPrisma.sentimentUsage.create.mockResolvedValue({});

    await deductSentimentCredits(TEST_USER.id, TEST_REVIEW.id, 'negative', {
      platform: 'Google',
    });

    expect(mockPrisma.sentimentUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: TEST_USER.id,
          reviewId: TEST_REVIEW.id,
          sentiment: 'negative',
        }),
      })
    );
  });
});

// ─── Reset Operations ─────────────────────────────────────

describe('resetMonthlyCredits', () => {
  it('resets credits for users past reset date', async () => {
    const pastDate = new Date('2026-02-01T00:00:00Z');
    const userToReset = {
      id: 'user1',
      email: 'user1@test.com',
      tier: 'FREE' as const,
      credits: 3,
      sentimentCredits: 5,
      creditsResetDate: pastDate,
    };

    mockPrisma.user.findMany.mockResolvedValue([userToReset]);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.creditUsage.create.mockResolvedValue({});

    const result = await resetMonthlyCredits();
    expect(result.success).toBe(true);
    expect(result.usersReset).toBe(1);
    expect(result.details[0]).toEqual(
      expect.objectContaining({
        userId: 'user1',
        tier: 'FREE',
        creditsReset: 15,
        sentimentReset: 35,
      })
    );
  });

  it('returns 0 when no users need reset', async () => {
    mockPrisma.user.findMany.mockResolvedValue([]);

    const result = await resetMonthlyCredits();
    expect(result.success).toBe(true);
    expect(result.usersReset).toBe(0);
    expect(result.details).toEqual([]);
  });

  it('handles per-user errors without failing batch', async () => {
    const users = [
      { id: 'user1', email: 'a@b.com', tier: 'FREE' as const, credits: 0, sentimentCredits: 0, creditsResetDate: new Date('2026-01-01') },
      { id: 'user2', email: 'c@d.com', tier: 'STARTER' as const, credits: 5, sentimentCredits: 10, creditsResetDate: new Date('2026-01-01') },
    ];
    mockPrisma.user.findMany.mockResolvedValue(users);

    // First user transaction fails, second succeeds
    let callCount = 0;
    mockPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      callCount++;
      if (callCount === 1) throw new Error('Transaction failed');
      if (typeof fn === 'function') {
        return (fn as (tx: typeof mockPrisma) => Promise<unknown>)(mockPrisma);
      }
    });
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.creditUsage.create.mockResolvedValue({});

    const result = await resetMonthlyCredits();
    expect(result.usersReset).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('user1');
  });

  it('creates audit entries for each reset', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', email: 'u@t.com', tier: 'FREE', credits: 5, sentimentCredits: 10, creditsResetDate: new Date('2026-01-01') },
    ]);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.creditUsage.create.mockResolvedValue({});

    await resetMonthlyCredits();

    expect(mockPrisma.creditUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'MONTHLY_RESET',
        }),
      })
    );
  });
});

describe('shouldResetCredits', () => {
  it('returns true when reset date is in the past', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      creditsResetDate: new Date('2020-01-01'),
    });
    const result = await shouldResetCredits(TEST_USER.id);
    expect(result).toBe(true);
  });

  it('returns false when reset date is in the future', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      creditsResetDate: new Date('2099-01-01'),
    });
    const result = await shouldResetCredits(TEST_USER.id);
    expect(result).toBe(false);
  });

  it('returns false for non-existent user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await shouldResetCredits('nonexistent');
    expect(result).toBe(false);
  });
});

// ─── Brand Voice ──────────────────────────────────────────

describe('getOrCreateBrandVoice', () => {
  it('returns existing brand voice', async () => {
    mockPrisma.brandVoice.findUnique.mockResolvedValue(TEST_BRAND_VOICE);
    const result = await getOrCreateBrandVoice(TEST_USER.id);
    expect(result).toEqual(TEST_BRAND_VOICE);
    expect(mockPrisma.brandVoice.create).not.toHaveBeenCalled();
  });

  it('creates default brand voice if none exists', async () => {
    mockPrisma.brandVoice.findUnique.mockResolvedValue(null);
    const defaultBV = { ...TEST_BRAND_VOICE, tone: 'professional', formality: 3 };
    mockPrisma.brandVoice.create.mockResolvedValue(defaultBV);

    const result = await getOrCreateBrandVoice(TEST_USER.id);
    expect(result).toEqual(defaultBV);
    expect(mockPrisma.brandVoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: TEST_USER.id,
          tone: 'professional',
          formality: 3,
        }),
      })
    );
  });
});

// ─── Statistics ───────────────────────────────────────────

describe('getUserStats', () => {
  it('returns correct counts and percentages', async () => {
    mockPrisma.review.count
      .mockResolvedValueOnce(10) // totalReviews
      .mockResolvedValueOnce(7); // reviewsWithResponse
    mockPrisma.review.groupBy
      .mockResolvedValueOnce([
        { sentiment: 'positive', _count: 5 },
        { sentiment: 'negative', _count: 3 },
        { sentiment: 'neutral', _count: 2 },
      ])
      .mockResolvedValueOnce([
        { platform: 'Google', _count: 6 },
        { platform: 'Amazon', _count: 4 },
      ]);

    const result = await getUserStats(TEST_USER.id);
    expect(result.totalReviews).toBe(10);
    expect(result.reviewsWithResponse).toBe(7);
    expect(result.responseRate).toBe(70);
    expect(result.sentimentBreakdown).toEqual({
      positive: 5,
      negative: 3,
      neutral: 2,
    });
    expect(result.platformBreakdown).toEqual({
      Google: 6,
      Amazon: 4,
    });
  });

  it('handles user with no reviews', async () => {
    mockPrisma.review.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockPrisma.review.groupBy
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getUserStats(TEST_USER.id);
    expect(result.totalReviews).toBe(0);
    expect(result.responseRate).toBe(0);
    expect(result.sentimentBreakdown).toEqual({});
    expect(result.platformBreakdown).toEqual({});
  });
});
