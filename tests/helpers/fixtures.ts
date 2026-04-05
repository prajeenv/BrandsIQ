/**
 * Shared test fixtures for BrandsIQ tests
 */

export const TEST_USER = {
  id: 'clu1234567890abcdef',
  email: 'test@example.com',
  emailVerified: new Date('2026-03-01T00:00:00Z'),
  name: 'Test User',
  image: null,
  password: '$2a$12$LJ3/mF.QJeGtq7aREj7sYeX/0GKGx8MhD.gX/3BZ.vR8oE3t3VkWi',
  tier: 'FREE' as const,
  credits: 15,
  creditsResetDate: new Date('2026-03-27T00:00:00Z'),
  sentimentCredits: 35,
  sentimentResetDate: new Date('2026-03-27T00:00:00Z'),
  createdAt: new Date('2026-03-01T00:00:00Z'),
  updatedAt: new Date('2026-03-01T00:00:00Z'),
};

export const TEST_USER_NO_CREDITS = {
  ...TEST_USER,
  id: 'clu_nocredits_12345',
  credits: 0,
  sentimentCredits: 0,
};

export const TEST_USER_STARTER = {
  ...TEST_USER,
  id: 'clu_starter_1234567',
  tier: 'STARTER' as const,
  credits: 30,
  sentimentCredits: 150,
};

export const TEST_REVIEW = {
  id: 'clr1234567890abcdef',
  userId: TEST_USER.id,
  platform: 'Google',
  reviewText: 'Great service and friendly staff! Highly recommend this place to everyone.',
  rating: 5,
  reviewerName: 'John Doe',
  reviewDate: new Date('2026-03-20T00:00:00Z'),
  detectedLanguage: 'English',
  sentiment: 'positive',
  externalId: null,
  externalUrl: null,
  createdAt: new Date('2026-03-21T00:00:00Z'),
  updatedAt: new Date('2026-03-21T00:00:00Z'),
};

export const TEST_NEGATIVE_REVIEW = {
  ...TEST_REVIEW,
  id: 'clr_negative_1234567',
  reviewText: 'Terrible experience. The food was awful and the service was horrible. Never coming back.',
  rating: 1,
  sentiment: 'negative',
};

export const TEST_BRAND_VOICE = {
  id: 'clb1234567890abcdef',
  userId: TEST_USER.id,
  tone: 'professional',
  formality: 3,
  keyPhrases: ['Thank you', 'We appreciate your feedback'],
  styleNotes: 'Be genuine and empathetic',
  sampleResponses: [],
  createdAt: new Date('2026-03-01T00:00:00Z'),
  updatedAt: new Date('2026-03-01T00:00:00Z'),
};

export const TEST_RESPONSE = {
  id: 'clresp1234567abcdef',
  reviewId: TEST_REVIEW.id,
  responseText: 'Thank you for your kind words! We are glad you enjoyed our service.',
  isEdited: false,
  editedAt: null,
  creditsUsed: 1,
  toneUsed: 'professional',
  generationModel: 'claude-sonnet-4-20250514',
  isPublished: false,
  publishedAt: null,
  createdAt: new Date('2026-03-21T00:00:00Z'),
  updatedAt: new Date('2026-03-21T00:00:00Z'),
};

export const TEST_CREDIT_USAGE = {
  id: 'clcu1234567890abcdef',
  userId: TEST_USER.id,
  reviewId: TEST_REVIEW.id,
  reviewResponseId: TEST_RESPONSE.id,
  creditsUsed: 1,
  action: 'GENERATE_RESPONSE',
  details: JSON.stringify({
    reviewId: TEST_REVIEW.id,
    platform: 'Google',
    rating: 5,
    tone: 'professional',
    generatedAt: new Date('2026-03-21T00:00:00Z'),
  }),
  createdAt: new Date('2026-03-21T00:00:00Z'),
};

export const TEST_SENTIMENT_USAGE = {
  id: 'clsu1234567890abcdef',
  userId: TEST_USER.id,
  reviewId: TEST_REVIEW.id,
  sentiment: 'positive',
  details: JSON.stringify({
    reviewId: TEST_REVIEW.id,
    platform: 'Google',
    rating: 5,
    analyzedAt: new Date('2026-03-21T00:00:00Z'),
  }),
  createdAt: new Date('2026-03-21T00:00:00Z'),
};
