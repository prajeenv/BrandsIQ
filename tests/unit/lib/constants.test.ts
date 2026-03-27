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
} from '@/lib/constants';

describe('TIER_LIMITS', () => {
  it('FREE tier has 15 credits and 35 sentiment quota', () => {
    expect(TIER_LIMITS.FREE.credits).toBe(15);
    expect(TIER_LIMITS.FREE.sentimentQuota).toBe(35);
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
  it('REVIEW_TEXT_MAX is 2000', () => {
    expect(VALIDATION_LIMITS.REVIEW_TEXT_MAX).toBe(2000);
  });

  it('RESPONSE_TEXT_MAX is 500', () => {
    expect(VALIDATION_LIMITS.RESPONSE_TEXT_MAX).toBe(500);
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
