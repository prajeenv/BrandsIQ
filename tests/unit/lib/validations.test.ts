import { describe, it, expect } from 'vitest';
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createReviewSchema,
  updateReviewSchema,
  generateResponseSchema,
  regenerateResponseSchema,
  updateResponseSchema,
  brandVoiceSchema,
  testBrandVoiceSchema,
  updateProfileSchema,
  paginationSchema,
  reviewFiltersSchema,
} from '@/lib/validations';

// ─── Auth Schemas ─────────────────────────────────────────

describe('signUpSchema', () => {
  it('accepts valid input', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
      name: 'Test User',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = signUpSchema.safeParse({
      email: 'notanemail',
      password: 'Password1',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password (< 8 chars)', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'Pass1',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without uppercase', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'password1',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without lowercase', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'PASSWORD1',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without digit', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'Passwordd',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects too-long email (> 255)', () => {
    const result = signUpSchema.safeParse({
      email: 'a'.repeat(250) + '@b.com',
      password: 'Password1',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects too-long name (> 100)', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
      name: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('accepts password at minimum length', () => {
    const result = signUpSchema.safeParse({
      email: 'user@example.com',
      password: 'Abcdef1x',
      name: 'Test',
    });
    expect(result.success).toBe(true);
  });
});

describe('signInSchema', () => {
  it('accepts valid input', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      password: 'anything',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = signInSchema.safeParse({
      email: 'bad',
      password: 'anything',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'bad' });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts valid input', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      password: 'NewPass1x',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing token', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'NewPass1x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty token', () => {
    const result = resetPasswordSchema.safeParse({
      token: '',
      password: 'NewPass1x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak password', () => {
    const result = resetPasswordSchema.safeParse({
      token: 'abc123',
      password: 'weak',
    });
    expect(result.success).toBe(false);
  });
});

// ─── Review Schemas ───────────────────────────────────────

describe('createReviewSchema', () => {
  it('accepts valid review with all fields', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Google',
      reviewText: 'Great service!',
      rating: 5,
      reviewerName: 'John',
      reviewDate: '2026-03-20',
      detectedLanguage: 'English',
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimal review (platform + reviewText)', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Amazon',
      reviewText: 'Good product',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid platform', () => {
    const result = createReviewSchema.safeParse({
      platform: 'InvalidPlatform',
      reviewText: 'Good product',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty reviewText', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Google',
      reviewText: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects too-long reviewText (> 2000)', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Google',
      reviewText: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts rating 1-5', () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      const result = createReviewSchema.safeParse({
        platform: 'Google',
        reviewText: 'Test',
        rating,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects rating 0', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Google',
      reviewText: 'Test',
      rating: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects rating 6', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Google',
      reviewText: 'Test',
      rating: 6,
    });
    expect(result.success).toBe(false);
  });

  it('accepts null rating', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Google',
      reviewText: 'Test',
      rating: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts YYYY-MM-DD date format', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Google',
      reviewText: 'Test',
      reviewDate: '2026-03-20',
    });
    expect(result.success).toBe(true);
  });

  it('accepts ISO datetime format', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Google',
      reviewText: 'Test',
      reviewDate: '2026-03-20T10:30:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts ISO datetime with milliseconds', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Google',
      reviewText: 'Test',
      reviewDate: '2026-03-20T10:30:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid date format', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Google',
      reviewText: 'Test',
      reviewDate: 'March 20, 2026',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null reviewDate', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Google',
      reviewText: 'Test',
      reviewDate: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional reviewerName', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Google',
      reviewText: 'Test',
      reviewerName: 'John Doe',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional detectedLanguage', () => {
    const result = createReviewSchema.safeParse({
      platform: 'Google',
      reviewText: 'Test',
      detectedLanguage: 'Spanish',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid platforms', () => {
    const platforms = ['Google', 'Amazon', 'Yelp', 'TripAdvisor', 'Facebook', 'Trustpilot', 'G2', 'Capterra', 'App Store', 'Play Store', 'Other'];
    for (const platform of platforms) {
      const result = createReviewSchema.safeParse({
        platform,
        reviewText: 'Test review',
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('updateReviewSchema', () => {
  it('accepts partial updates', () => {
    const result = updateReviewSchema.safeParse({
      reviewText: 'Updated text',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all optional)', () => {
    const result = updateReviewSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates fields when provided', () => {
    const result = updateReviewSchema.safeParse({
      reviewText: '', // min 1
    });
    expect(result.success).toBe(false);
  });

  it('validates rating range when provided', () => {
    const result = updateReviewSchema.safeParse({ rating: 6 });
    expect(result.success).toBe(false);
  });
});

// ─── Response Schemas ─────────────────────────────────────

describe('generateResponseSchema', () => {
  it('accepts valid reviewId with default tone', () => {
    const result = generateResponseSchema.safeParse({
      reviewId: 'clu1234567890abcdef',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tone).toBe('professional');
    }
  });

  it('rejects invalid CUID', () => {
    const result = generateResponseSchema.safeParse({
      reviewId: 'not-a-cuid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid tone options', () => {
    for (const tone of ['professional', 'friendly', 'empathetic']) {
      const result = generateResponseSchema.safeParse({
        reviewId: 'clu1234567890abcdef',
        tone,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid tone', () => {
    const result = generateResponseSchema.safeParse({
      reviewId: 'clu1234567890abcdef',
      tone: 'aggressive',
    });
    expect(result.success).toBe(false);
  });
});

describe('regenerateResponseSchema', () => {
  it('requires responseId and tone', () => {
    const result = regenerateResponseSchema.safeParse({
      responseId: 'clu1234567890abcdef',
      tone: 'friendly',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing tone', () => {
    const result = regenerateResponseSchema.safeParse({
      responseId: 'clu1234567890abcdef',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing responseId', () => {
    const result = regenerateResponseSchema.safeParse({
      tone: 'friendly',
    });
    expect(result.success).toBe(false);
  });

  it('validates tone enum', () => {
    const result = regenerateResponseSchema.safeParse({
      responseId: 'clu1234567890abcdef',
      tone: 'bad_tone',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateResponseSchema', () => {
  it('accepts valid response text', () => {
    const result = updateResponseSchema.safeParse({
      responseText: 'Thank you for your feedback!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty text', () => {
    const result = updateResponseSchema.safeParse({
      responseText: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects text > 500 chars', () => {
    const result = updateResponseSchema.safeParse({
      responseText: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('accepts text at 500 chars', () => {
    const result = updateResponseSchema.safeParse({
      responseText: 'a'.repeat(500),
    });
    expect(result.success).toBe(true);
  });
});

// ─── Brand Voice Schemas ──────────────────────────────────

describe('brandVoiceSchema', () => {
  it('accepts valid configuration', () => {
    const result = brandVoiceSchema.safeParse({
      tone: 'professional',
      formality: 3,
      keyPhrases: ['Thank you'],
      styleNotes: 'Be genuine',
      sampleResponses: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid tone', () => {
    const result = brandVoiceSchema.safeParse({
      tone: 'aggressive',
      formality: 3,
    });
    expect(result.success).toBe(false);
  });

  it('validates formality range 1-5', () => {
    expect(brandVoiceSchema.safeParse({ tone: 'friendly', formality: 0 }).success).toBe(false);
    expect(brandVoiceSchema.safeParse({ tone: 'friendly', formality: 6 }).success).toBe(false);
    expect(brandVoiceSchema.safeParse({ tone: 'friendly', formality: 1 }).success).toBe(true);
    expect(brandVoiceSchema.safeParse({ tone: 'friendly', formality: 5 }).success).toBe(true);
  });

  it('accepts empty keyPhrases array', () => {
    const result = brandVoiceSchema.safeParse({
      tone: 'casual',
      formality: 2,
      keyPhrases: [],
    });
    expect(result.success).toBe(true);
  });

  it('defaults keyPhrases to empty array', () => {
    const result = brandVoiceSchema.safeParse({
      tone: 'casual',
      formality: 2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keyPhrases).toEqual([]);
    }
  });

  it('rejects > 20 key phrases', () => {
    const result = brandVoiceSchema.safeParse({
      tone: 'professional',
      formality: 3,
      keyPhrases: Array.from({ length: 21 }, (_, i) => `phrase ${i}`),
    });
    expect(result.success).toBe(false);
  });

  it('rejects key phrase > 100 chars', () => {
    const result = brandVoiceSchema.safeParse({
      tone: 'professional',
      formality: 3,
      keyPhrases: ['a'.repeat(101)],
    });
    expect(result.success).toBe(false);
  });

  it('accepts null styleNotes', () => {
    const result = brandVoiceSchema.safeParse({
      tone: 'professional',
      formality: 3,
      styleNotes: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects styleNotes > 500 chars', () => {
    const result = brandVoiceSchema.safeParse({
      tone: 'professional',
      formality: 3,
      styleNotes: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty sampleResponses', () => {
    const result = brandVoiceSchema.safeParse({
      tone: 'empathetic',
      formality: 4,
      sampleResponses: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects > 5 sample responses', () => {
    const result = brandVoiceSchema.safeParse({
      tone: 'professional',
      formality: 3,
      sampleResponses: Array.from({ length: 6 }, () => 'sample'),
    });
    expect(result.success).toBe(false);
  });

  it('rejects sample response > 500 chars', () => {
    const result = brandVoiceSchema.safeParse({
      tone: 'professional',
      formality: 3,
      sampleResponses: ['a'.repeat(501)],
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid tones', () => {
    for (const tone of ['professional', 'friendly', 'casual', 'empathetic']) {
      const result = brandVoiceSchema.safeParse({ tone, formality: 3 });
      expect(result.success).toBe(true);
    }
  });
});

describe('testBrandVoiceSchema', () => {
  it('accepts valid test input', () => {
    const result = testBrandVoiceSchema.safeParse({
      reviewText: 'Great product!',
      platform: 'Amazon',
      rating: 5,
    });
    expect(result.success).toBe(true);
  });

  it('requires reviewText', () => {
    const result = testBrandVoiceSchema.safeParse({
      platform: 'Google',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty reviewText', () => {
    const result = testBrandVoiceSchema.safeParse({
      reviewText: '',
    });
    expect(result.success).toBe(false);
  });

  it('defaults platform to Google', () => {
    const result = testBrandVoiceSchema.safeParse({
      reviewText: 'Test review',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.platform).toBe('Google');
    }
  });

  it('rejects reviewText > 2000 chars', () => {
    const result = testBrandVoiceSchema.safeParse({
      reviewText: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

// ─── Profile Schema ───────────────────────────────────────

describe('updateProfileSchema', () => {
  it('accepts valid partial update', () => {
    const result = updateProfileSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts businessName', () => {
    const result = updateProfileSchema.safeParse({ businessName: 'My Business' });
    expect(result.success).toBe(true);
  });

  it('accepts null businessName', () => {
    const result = updateProfileSchema.safeParse({ businessName: null });
    expect(result.success).toBe(true);
  });

  it('rejects name > 100 chars', () => {
    const result = updateProfileSchema.safeParse({ name: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});

// ─── Pagination Schema ────────────────────────────────────

describe('paginationSchema', () => {
  it('coerces string to number', () => {
    const result = paginationSchema.safeParse({ page: '3', limit: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(10);
    }
  });

  it('defaults page to 1 and limit to 20', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('clamps minimum page to 1', () => {
    const result = paginationSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it('clamps maximum limit to 100', () => {
    const result = paginationSchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });

  it('accepts valid page and limit', () => {
    const result = paginationSchema.safeParse({ page: 5, limit: 50 });
    expect(result.success).toBe(true);
  });
});

// ─── Review Filters Schema ────────────────────────────────

describe('reviewFiltersSchema', () => {
  it('accepts valid filters', () => {
    const result = reviewFiltersSchema.safeParse({
      platform: 'Google',
      sentiment: 'positive',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = reviewFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates platform enum', () => {
    const result = reviewFiltersSchema.safeParse({ platform: 'Invalid' });
    expect(result.success).toBe(false);
  });

  it('validates sentiment enum', () => {
    const result = reviewFiltersSchema.safeParse({ sentiment: 'happy' });
    expect(result.success).toBe(false);
  });

  it('accepts hasResponse boolean', () => {
    const result = reviewFiltersSchema.safeParse({ hasResponse: true });
    expect(result.success).toBe(true);
  });

  it('accepts search string', () => {
    const result = reviewFiltersSchema.safeParse({ search: 'great service' });
    expect(result.success).toBe(true);
  });

  it('rejects search > 100 chars', () => {
    const result = reviewFiltersSchema.safeParse({ search: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});
