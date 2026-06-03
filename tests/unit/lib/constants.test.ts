import { describe, it, expect } from 'vitest';
import {
  PLATFORMS,
  SENTIMENTS,
  RESPONSE_TONES,
  BRAND_VOICE_TONES,
  BRAND_VOICE_TONE_INFO,
  FORMALITY_LABELS,
  FORMALITY_DESCRIPTIONS,
  TIER_LIMITS,
  CREDIT_COSTS,
  VALIDATION_LIMITS,
  RTL_LANGUAGES,
  LANGUAGE_MAP,
  RATE_LIMITS,
  SESSION_CONFIG,
  EMAIL_CONFIG,
  SUBSCRIPTION_TIERS,
  // Brand voice redesign V2 (iter 2)
  BRAND_VOICE_TONES_V2,
  BRAND_VOICE_TONE_INFO_V2,
  DEFAULT_BRAND_VOICE_TONE_V2,
  LEGACY_TONE_TO_V2,
  NEGATIVE_REVIEW_FRAMINGS,
  DEFAULT_NEGATIVE_REVIEW_FRAMING,
  BRAND_VOICE_LIMITS_V2,
  RESPONSE_BODY_CHAR_MAX,
} from '@/lib/constants';

describe('TIER_LIMITS', () => {
  it('FREE tier has 5 credits and 25 sentiment quota', () => {
    expect(TIER_LIMITS.FREE.credits).toBe(5);
    expect(TIER_LIMITS.FREE.sentimentQuota).toBe(25);
  });

  it('STARTER tier has 30 credits and 150 sentiment quota', () => {
    expect(TIER_LIMITS.STARTER.credits).toBe(30);
    expect(TIER_LIMITS.STARTER.sentimentQuota).toBe(150);
  });

  it('GROWTH tier has 100 credits and 500 sentiment quota', () => {
    expect(TIER_LIMITS.GROWTH.credits).toBe(100);
    expect(TIER_LIMITS.GROWTH.sentimentQuota).toBe(500);
  });

  it('all tiers have required properties', () => {
    for (const tier of SUBSCRIPTION_TIERS) {
      const limits = TIER_LIMITS[tier];
      expect(limits).toHaveProperty('credits');
      expect(limits).toHaveProperty('sentimentQuota');
      expect(limits).toHaveProperty('price');
      expect(limits).toHaveProperty('name');
      expect(typeof limits.credits).toBe('number');
      expect(typeof limits.sentimentQuota).toBe('number');
      expect(typeof limits.price).toBe('number');
      expect(typeof limits.name).toBe('string');
    }
  });

  it('prices are correct', () => {
    expect(TIER_LIMITS.FREE.price).toBe(0);
    expect(TIER_LIMITS.STARTER.price).toBe(29);
    expect(TIER_LIMITS.GROWTH.price).toBe(79);
  });
});

describe('PLATFORMS', () => {
  it('contains expected platforms', () => {
    expect(PLATFORMS).toContain('Google');
    expect(PLATFORMS).toContain('Amazon');
    expect(PLATFORMS).toContain('Yelp');
    expect(PLATFORMS).toContain('TripAdvisor');
    expect(PLATFORMS).toContain('Facebook');
    expect(PLATFORMS).toContain('Trustpilot');
    expect(PLATFORMS).toContain('Other');
  });

  it('has 11 entries', () => {
    expect(PLATFORMS).toHaveLength(11);
  });
});

describe('SENTIMENTS', () => {
  it('contains positive, neutral, negative', () => {
    expect(SENTIMENTS).toEqual(['positive', 'neutral', 'negative']);
  });
});

describe('RESPONSE_TONES', () => {
  it('contains professional, friendly, empathetic', () => {
    expect(RESPONSE_TONES).toEqual(['professional', 'friendly', 'empathetic']);
  });
});

describe('BRAND_VOICE_TONES', () => {
  it('contains professional, friendly, casual, empathetic', () => {
    expect(BRAND_VOICE_TONES).toEqual(['professional', 'friendly', 'casual', 'empathetic']);
  });
});

describe('BRAND_VOICE_TONE_INFO', () => {
  it('has info for each brand voice tone', () => {
    for (const tone of BRAND_VOICE_TONES) {
      const info = BRAND_VOICE_TONE_INFO[tone];
      expect(info).toHaveProperty('label');
      expect(info).toHaveProperty('description');
      expect(info).toHaveProperty('icon');
    }
  });
});

describe('FORMALITY_LABELS', () => {
  it('has 5 labels matching formality levels 1-5', () => {
    expect(FORMALITY_LABELS).toHaveLength(5);
    expect(FORMALITY_LABELS[0]).toBe('Very Casual');
    expect(FORMALITY_LABELS[4]).toBe('Very Formal');
  });
});

describe('FORMALITY_DESCRIPTIONS', () => {
  it('has 5 descriptions matching formality levels', () => {
    expect(FORMALITY_DESCRIPTIONS).toHaveLength(5);
  });
});

describe('CREDIT_COSTS', () => {
  it('GENERATE_RESPONSE costs 1.0', () => {
    expect(CREDIT_COSTS.GENERATE_RESPONSE).toBe(1.0);
  });

  it('REGENERATE_RESPONSE costs 1.0', () => {
    expect(CREDIT_COSTS.REGENERATE_RESPONSE).toBe(1.0);
  });
});

describe('VALIDATION_LIMITS', () => {
  it('REVIEW_TEXT_MAX is 4000', () => {
    // Bumped from 2000 → 4000 after real reviews exceeded the old cap
    // (~2900 chars observed). DB column is @db.Text (unbounded).
    expect(VALIDATION_LIMITS.REVIEW_TEXT_MAX).toBe(4000);
  });

  it('RESPONSE_TEXT_MAX is 2000', () => {
    // Brand voice redesign iter 2: raised from 500 → 2000 so multi-paragraph
    // assembled responses (salutation + body + sign-off + optional email) fit.
    expect(VALIDATION_LIMITS.RESPONSE_TEXT_MAX).toBe(2000);
  });

  it('PASSWORD_MIN is 8', () => {
    expect(VALIDATION_LIMITS.PASSWORD_MIN).toBe(8);
  });

  it('EMAIL_MAX is 255', () => {
    expect(VALIDATION_LIMITS.EMAIL_MAX).toBe(255);
  });

  it('NAME_MAX is 100', () => {
    expect(VALIDATION_LIMITS.NAME_MAX).toBe(100);
  });
});

describe('LANGUAGE_MAP', () => {
  it('maps eng to English', () => {
    expect(LANGUAGE_MAP['eng']).toBe('English');
  });

  it('maps ara to Arabic', () => {
    expect(LANGUAGE_MAP['ara']).toBe('Arabic');
  });

  it('maps spa to Spanish', () => {
    expect(LANGUAGE_MAP['spa']).toBe('Spanish');
  });

  it('has entries for all RTL languages', () => {
    const rtlLanguageNames = Object.values(LANGUAGE_MAP).filter((name) =>
      RTL_LANGUAGES.includes(name as (typeof RTL_LANGUAGES)[number])
    );
    expect(rtlLanguageNames).toHaveLength(RTL_LANGUAGES.length);
  });

  it('has 40+ language entries', () => {
    expect(Object.keys(LANGUAGE_MAP).length).toBeGreaterThanOrEqual(40);
  });
});

describe('RTL_LANGUAGES', () => {
  it('contains Arabic, Hebrew, Persian, Urdu', () => {
    expect(RTL_LANGUAGES).toContain('Arabic');
    expect(RTL_LANGUAGES).toContain('Hebrew');
    expect(RTL_LANGUAGES).toContain('Persian');
    expect(RTL_LANGUAGES).toContain('Urdu');
  });

  it('has exactly 4 entries', () => {
    expect(RTL_LANGUAGES).toHaveLength(4);
  });
});

describe('RATE_LIMITS', () => {
  it('AUTH has 5 requests per 60 seconds', () => {
    expect(RATE_LIMITS.AUTH.REQUESTS).toBe(5);
    expect(RATE_LIMITS.AUTH.WINDOW_SECONDS).toBe(60);
  });

  it('API has 60 requests per 60 seconds', () => {
    expect(RATE_LIMITS.API.REQUESTS).toBe(60);
    expect(RATE_LIMITS.API.WINDOW_SECONDS).toBe(60);
  });

  it('AI has 10 requests per 60 seconds', () => {
    expect(RATE_LIMITS.AI.REQUESTS).toBe(10);
    expect(RATE_LIMITS.AI.WINDOW_SECONDS).toBe(60);
  });
});

describe('SESSION_CONFIG', () => {
  it('MAX_AGE_DAYS is 30', () => {
    expect(SESSION_CONFIG.MAX_AGE_DAYS).toBe(30);
  });

  it('UPDATE_AGE_DAYS is 1', () => {
    expect(SESSION_CONFIG.UPDATE_AGE_DAYS).toBe(1);
  });
});

describe('EMAIL_CONFIG', () => {
  it('VERIFICATION_EXPIRY_HOURS is 24', () => {
    expect(EMAIL_CONFIG.VERIFICATION_EXPIRY_HOURS).toBe(24);
  });

  it('PASSWORD_RESET_EXPIRY_HOURS is 1', () => {
    expect(EMAIL_CONFIG.PASSWORD_RESET_EXPIRY_HOURS).toBe(1);
  });
});

// ─── Brand voice redesign V2 (iter 2) ────────────────────────────────

describe('BRAND_VOICE_TONES_V2', () => {
  it('exposes the four V2 keys in the right order', () => {
    expect(BRAND_VOICE_TONES_V2).toEqual([
      'warm_casual',
      'friendly_professional',
      'polished_formal',
      'empathetic_attentive',
    ]);
  });

  it('default key is "friendly_professional"', () => {
    expect(DEFAULT_BRAND_VOICE_TONE_V2).toBe('friendly_professional');
  });
});

describe('BRAND_VOICE_TONE_INFO_V2', () => {
  it('has a label, description, and icon for every V2 key', () => {
    for (const key of BRAND_VOICE_TONES_V2) {
      const info = BRAND_VOICE_TONE_INFO_V2[key];
      expect(info).toBeDefined();
      expect(typeof info.label).toBe('string');
      expect(info.label.length).toBeGreaterThan(0);
      expect(typeof info.description).toBe('string');
      expect(info.description.length).toBeGreaterThan(0);
      expect(typeof info.icon).toBe('string');
    }
  });

  it('uses the spec §4.1 display labels with ampersand', () => {
    expect(BRAND_VOICE_TONE_INFO_V2.warm_casual.label).toBe('Warm & casual');
    expect(BRAND_VOICE_TONE_INFO_V2.friendly_professional.label).toBe('Friendly & professional');
    expect(BRAND_VOICE_TONE_INFO_V2.polished_formal.label).toBe('Polished & formal');
    expect(BRAND_VOICE_TONE_INFO_V2.empathetic_attentive.label).toBe('Empathetic & attentive');
  });
});

describe('LEGACY_TONE_TO_V2', () => {
  it('maps every legacy lowercase tone key to a V2 key per spec §4.1', () => {
    expect(LEGACY_TONE_TO_V2.friendly).toBe('friendly_professional');
    expect(LEGACY_TONE_TO_V2.professional).toBe('friendly_professional');
    expect(LEGACY_TONE_TO_V2.casual).toBe('warm_casual');
    expect(LEGACY_TONE_TO_V2.formal).toBe('polished_formal');
    expect(LEGACY_TONE_TO_V2.empathetic).toBe('empathetic_attentive');
  });

  it('maps the "default" sentinel (initial-generation ReviewResponse.toneUsed) to the default V2 key', () => {
    expect(LEGACY_TONE_TO_V2.default).toBe(DEFAULT_BRAND_VOICE_TONE_V2);
  });
});

describe('NEGATIVE_REVIEW_FRAMINGS', () => {
  it('exposes the four spec §7.4 framing keys', () => {
    expect(NEGATIVE_REVIEW_FRAMINGS).toEqual([
      'management_contact',
      'investigation',
      'open_channel',
      'custom',
    ]);
  });

  it('default framing is "investigation" (marked Recommended in spec §7.4)', () => {
    expect(DEFAULT_NEGATIVE_REVIEW_FRAMING).toBe('investigation');
  });
});

describe('BRAND_VOICE_LIMITS_V2', () => {
  it('matches the per-field caps in spec §4.2/§4.3/§5.1/§7.x', () => {
    expect(BRAND_VOICE_LIMITS_V2.STYLE_GUIDELINE_ITEM_MAX).toBe(200);
    expect(BRAND_VOICE_LIMITS_V2.STYLE_GUIDELINES_MAX_ITEMS).toBe(10);
    expect(BRAND_VOICE_LIMITS_V2.STYLE_GUIDELINES_TOTAL_MAX).toBe(2000);
    expect(BRAND_VOICE_LIMITS_V2.KEY_PHRASE_MAX).toBe(100);
    expect(BRAND_VOICE_LIMITS_V2.KEY_PHRASES_MAX_ITEMS).toBe(10);
    expect(BRAND_VOICE_LIMITS_V2.SAMPLE_RESPONSE_MAX).toBe(1000);
    expect(BRAND_VOICE_LIMITS_V2.SAMPLE_RESPONSES_MAX_ITEMS).toBe(5);
    expect(BRAND_VOICE_LIMITS_V2.SALUTATION_MAX).toBe(100);
    expect(BRAND_VOICE_LIMITS_V2.SIGNOFF_MAX).toBe(500);
    expect(BRAND_VOICE_LIMITS_V2.FRAMING_CUSTOM_MAX).toBe(500);
    expect(BRAND_VOICE_LIMITS_V2.REPLY_TO_EMAIL_MAX).toBe(254);
    // Response-language override: 50-char cap is comfortable headroom
    // over the longest entry in LANGUAGE_MAP today (21 chars).
    expect(BRAND_VOICE_LIMITS_V2.RESPONSE_LANGUAGE_MAX).toBe(50);
  });
});

describe('SUPPORTED_RESPONSE_LANGUAGES', () => {
  // Imported lazily to keep this describe self-contained; it's derived from
  // LANGUAGE_MAP values so the dropdown and the detector share one source
  // of truth.
  it('mirrors the LANGUAGE_MAP values exactly (single source of truth)', async () => {
    const { SUPPORTED_RESPONSE_LANGUAGES } = await import('@/lib/constants');
    expect(SUPPORTED_RESPONSE_LANGUAGES.length).toBe(Object.values(LANGUAGE_MAP).length);
    for (const name of Object.values(LANGUAGE_MAP)) {
      expect(SUPPORTED_RESPONSE_LANGUAGES).toContain(name);
    }
  });

  it('is sorted alphabetically (for dropdown rendering)', async () => {
    const { SUPPORTED_RESPONSE_LANGUAGES } = await import('@/lib/constants');
    const sorted = [...SUPPORTED_RESPONSE_LANGUAGES].sort();
    expect(SUPPORTED_RESPONSE_LANGUAGES).toEqual(sorted);
  });

  it('contains English, the most common override target', async () => {
    const { SUPPORTED_RESPONSE_LANGUAGES } = await import('@/lib/constants');
    expect(SUPPORTED_RESPONSE_LANGUAGES).toContain('English');
  });
});

describe('RESPONSE_BODY_CHAR_MAX', () => {
  it('is 1200 — roughly the "approximately 200 words" guidance', () => {
    // The model is told to target ~200 words for the body. 1200 chars is the
    // hard char cap on the model-emitted body (post-processing prepends
    // salutation and appends sign-off + optional email, which together
    // bring assembled length within RESPONSE_TEXT_MAX = 2000).
    expect(RESPONSE_BODY_CHAR_MAX).toBe(1200);
  });

  it('is strictly smaller than the assembled cap (so salutation+sign-off fit)', () => {
    expect(RESPONSE_BODY_CHAR_MAX).toBeLessThan(VALIDATION_LIMITS.RESPONSE_TEXT_MAX);
  });
});
