/**
 * Integration tests for review lifecycle
 * Runs against real PostgreSQL in CI
 */
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestPrisma, cleanDatabase, createTestUser, disconnectPrisma } from './helpers';

const canRunIntegration = !!process.env.DATABASE_URL?.includes('localhost');

describe.skipIf(!canRunIntegration)('Review Lifecycle (Integration)', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await disconnectPrisma();
  });

  it('creates a review, generates response, edits, and publishes', async () => {
    const db = getTestPrisma();
    const user = await createTestUser({ credits: 15 });

    // Step 1: Create review
    const review = await db.review.create({
      data: {
        userId: user.id,
        platform: 'Google',
        reviewText: 'Excellent service and friendly staff!',
        rating: 5,
        detectedLanguage: 'English',
        sentiment: 'positive',
      },
    });
    expect(review.id).toBeDefined();
    expect(review.platform).toBe('Google');

    // Step 2: Generate response
    const response = await db.reviewResponse.create({
      data: {
        reviewId: review.id,
        responseText: 'Thank you for your kind words!',
        toneUsed: 'professional',
        creditsUsed: 1,
        generationModel: 'claude-sonnet-4-20250514',
      },
    });
    expect(response.isEdited).toBe(false);
    expect(response.isPublished).toBe(false);

    // Step 3: Edit response (save old to version history)
    await db.responseVersion.create({
      data: {
        reviewResponseId: response.id,
        responseText: response.responseText,
        toneUsed: response.toneUsed,
        creditsUsed: response.creditsUsed,
      },
    });
    const edited = await db.reviewResponse.update({
      where: { id: response.id },
      data: {
        responseText: 'Thank you so much for your wonderful review!',
        isEdited: true,
        editedAt: new Date(),
        creditsUsed: 0,
      },
    });
    expect(edited.isEdited).toBe(true);
    expect(edited.creditsUsed).toBe(0);

    // Step 4: Publish
    const published = await db.reviewResponse.update({
      where: { id: response.id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });
    expect(published.isPublished).toBe(true);
    expect(published.publishedAt).not.toBeNull();

    // Verify version history
    const versions = await db.responseVersion.findMany({
      where: { reviewResponseId: response.id },
    });
    expect(versions).toHaveLength(1);
    expect(versions[0].responseText).toBe('Thank you for your kind words!');
    expect(versions[0].creditsUsed).toBe(1);
  });

  it('handles regeneration with version tracking', async () => {
    const db = getTestPrisma();
    const user = await createTestUser({ credits: 15 });

    const review = await db.review.create({
      data: {
        userId: user.id,
        platform: 'Amazon',
        reviewText: 'Great product!',
        rating: 4,
        detectedLanguage: 'English',
        sentiment: 'positive',
      },
    });

    // Initial generation
    const response = await db.reviewResponse.create({
      data: {
        reviewId: review.id,
        responseText: 'Thank you for your feedback!',
        toneUsed: 'professional',
        creditsUsed: 1,
      },
    });

    // Regeneration: save old, update with new
    await db.responseVersion.create({
      data: {
        reviewResponseId: response.id,
        responseText: response.responseText,
        toneUsed: response.toneUsed,
        creditsUsed: response.creditsUsed,
      },
    });

    await db.reviewResponse.update({
      where: { id: response.id },
      data: {
        responseText: 'We really appreciate your wonderful feedback!',
        toneUsed: 'friendly',
        creditsUsed: 1,
        isEdited: false,
      },
    });

    // Verify response updated
    const updated = await db.reviewResponse.findUnique({ where: { id: response.id } });
    expect(updated!.responseText).toContain('appreciate');
    expect(updated!.toneUsed).toBe('friendly');

    // Verify version history has old version
    const versions = await db.responseVersion.findMany({
      where: { reviewResponseId: response.id },
    });
    expect(versions).toHaveLength(1);
    expect(versions[0].toneUsed).toBe('professional');
  });

  it('enforces unique review-response relationship', async () => {
    const db = getTestPrisma();
    const user = await createTestUser();

    const review = await db.review.create({
      data: {
        userId: user.id,
        platform: 'Yelp',
        reviewText: 'Nice place',
        detectedLanguage: 'English',
      },
    });

    await db.reviewResponse.create({
      data: {
        reviewId: review.id,
        responseText: 'Thanks!',
        toneUsed: 'friendly',
        creditsUsed: 1,
      },
    });

    // Second response for same review should fail (unique constraint on reviewId)
    await expect(
      db.reviewResponse.create({
        data: {
          reviewId: review.id,
          responseText: 'Another thanks!',
          toneUsed: 'professional',
          creditsUsed: 1,
        },
      })
    ).rejects.toThrow();
  });

  it('supports brand voice configuration', async () => {
    const db = getTestPrisma();
    const user = await createTestUser();

    // Create brand voice
    const bv = await db.brandVoice.create({
      data: {
        userId: user.id,
        tone: 'friendly',
        formality: 2,
        keyPhrases: ['Thank you', 'We value'],
        styleNotes: 'Keep it casual',
        sampleResponses: ['Thanks for the review!'],
      },
    });

    expect(bv.tone).toBe('friendly');
    expect(bv.keyPhrases).toEqual(['Thank you', 'We value']);

    // Update brand voice
    const updated = await db.brandVoice.update({
      where: { userId: user.id },
      data: {
        tone: 'professional',
        formality: 4,
      },
    });
    expect(updated.tone).toBe('professional');
    expect(updated.formality).toBe(4);
    // Unchanged fields preserved
    expect(updated.keyPhrases).toEqual(['Thank you', 'We value']);
  });

  it('supports review filtering by platform and sentiment', async () => {
    const db = getTestPrisma();
    const user = await createTestUser();

    await db.review.createMany({
      data: [
        { userId: user.id, platform: 'Google', reviewText: 'Great', detectedLanguage: 'English', sentiment: 'positive' },
        { userId: user.id, platform: 'Google', reviewText: 'Bad', detectedLanguage: 'English', sentiment: 'negative' },
        { userId: user.id, platform: 'Amazon', reviewText: 'OK', detectedLanguage: 'English', sentiment: 'neutral' },
      ],
    });

    const googleReviews = await db.review.findMany({
      where: { userId: user.id, platform: 'Google' },
    });
    expect(googleReviews).toHaveLength(2);

    const positiveReviews = await db.review.findMany({
      where: { userId: user.id, sentiment: 'positive' },
    });
    expect(positiveReviews).toHaveLength(1);

    const total = await db.review.count({ where: { userId: user.id } });
    expect(total).toBe(3);
  });
});
