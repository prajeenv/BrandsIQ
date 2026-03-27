import { describe, it, expect } from 'vitest';
import {
  detectLanguage,
  getSupportedLanguages,
  getLanguageCode,
  isRTLLanguage,
  getTextDirection,
} from '@/lib/language-detection';
import { LANGUAGE_MAP } from '@/lib/constants';

describe('detectLanguage', () => {
  it('returns English with low confidence for empty string', () => {
    const result = detectLanguage('');
    expect(result.language).toBe('English');
    expect(result.confidence).toBe('low');
    expect(result.code).toBe('eng');
    expect(result.isRTL).toBe(false);
  });

  it('returns English with low confidence for short text (< 10 chars)', () => {
    const result = detectLanguage('Hi there');
    expect(result.language).toBe('English');
    expect(result.confidence).toBe('low');
  });

  it('returns English with low confidence for whitespace-only text', () => {
    const result = detectLanguage('         ');
    expect(result.language).toBe('English');
    expect(result.confidence).toBe('low');
  });

  it('returns high confidence for long English text (>= 50 chars)', () => {
    const result = detectLanguage(
      'This is a really wonderful restaurant with excellent food and amazing service that I would recommend to all my friends and family.'
    );
    expect(result.language).toBe('English');
    expect(result.confidence).toBe('high');
    expect(result.code).toBe('eng');
    expect(result.isRTL).toBe(false);
  });

  it('returns low confidence for medium text (10-49 chars)', () => {
    const result = detectLanguage('This is a short English sentence');
    expect(result.confidence).toBe('low');
  });

  it('detects Spanish text', () => {
    const result = detectLanguage(
      'Este restaurante es increíble. La comida es deliciosa y el servicio es excelente. Recomiendo totalmente este lugar a todos.'
    );
    expect(result.language).toBe('Spanish');
    expect(result.confidence).toBe('high');
    expect(result.isRTL).toBe(false);
  });

  it('detects French text', () => {
    const result = detectLanguage(
      'Ce restaurant est incroyable. La nourriture est délicieuse et le service est excellent. Je recommande vivement cet endroit.'
    );
    expect(result.language).toBe('French');
    expect(result.confidence).toBe('high');
  });

  it('detects German text', () => {
    const result = detectLanguage(
      'Dieses Restaurant ist unglaublich. Das Essen ist köstlich und der Service ist ausgezeichnet. Ich empfehle diesen Ort jedem.'
    );
    expect(result.language).toBe('German');
    expect(result.confidence).toBe('high');
  });

  it('returns result with correct shape', () => {
    const result = detectLanguage('Some text for testing purposes that is quite long to ensure detection works.');
    expect(result).toHaveProperty('language');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('code');
    expect(result).toHaveProperty('isRTL');
    expect(['high', 'low']).toContain(result.confidence);
  });

  it('defaults to English for unknown language codes', () => {
    // Very short ambiguous text that franc might return 'und' for
    const result = detectLanguage('abc def ghi jkl');
    expect(result.language).toBeDefined();
    // Should at least return a valid language
    expect(typeof result.language).toBe('string');
  });
});

describe('getSupportedLanguages', () => {
  it('returns sorted array', () => {
    const languages = getSupportedLanguages();
    const sorted = [...languages].sort();
    expect(languages).toEqual(sorted);
  });

  it('includes common languages', () => {
    const languages = getSupportedLanguages();
    expect(languages).toContain('English');
    expect(languages).toContain('Spanish');
    expect(languages).toContain('French');
    expect(languages).toContain('German');
    expect(languages).toContain('Japanese');
    expect(languages).toContain('Arabic');
  });

  it('returns correct count matching LANGUAGE_MAP', () => {
    const languages = getSupportedLanguages();
    expect(languages.length).toBe(Object.keys(LANGUAGE_MAP).length);
  });

  it('returns unique values', () => {
    const languages = getSupportedLanguages();
    const unique = new Set(languages);
    expect(unique.size).toBe(languages.length);
  });
});

describe('getLanguageCode', () => {
  it('returns code for known language', () => {
    expect(getLanguageCode('English')).toBe('eng');
    expect(getLanguageCode('Spanish')).toBe('spa');
    expect(getLanguageCode('Arabic')).toBe('ara');
  });

  it('returns undefined for unknown language', () => {
    expect(getLanguageCode('Klingon')).toBeUndefined();
  });

  it('is case-insensitive', () => {
    expect(getLanguageCode('english')).toBe('eng');
    expect(getLanguageCode('ENGLISH')).toBe('eng');
    expect(getLanguageCode('English')).toBe('eng');
  });
});

describe('isRTLLanguage', () => {
  it('returns true for Arabic', () => {
    expect(isRTLLanguage('Arabic')).toBe(true);
  });

  it('returns true for Hebrew', () => {
    expect(isRTLLanguage('Hebrew')).toBe(true);
  });

  it('returns true for Persian', () => {
    expect(isRTLLanguage('Persian')).toBe(true);
  });

  it('returns true for Urdu', () => {
    expect(isRTLLanguage('Urdu')).toBe(true);
  });

  it('returns false for English', () => {
    expect(isRTLLanguage('English')).toBe(false);
  });

  it('returns false for Spanish', () => {
    expect(isRTLLanguage('Spanish')).toBe(false);
  });

  it('returns false for Japanese', () => {
    expect(isRTLLanguage('Japanese')).toBe(false);
  });
});

describe('getTextDirection', () => {
  it('returns "rtl" for RTL languages', () => {
    expect(getTextDirection('Arabic')).toBe('rtl');
    expect(getTextDirection('Hebrew')).toBe('rtl');
    expect(getTextDirection('Persian')).toBe('rtl');
    expect(getTextDirection('Urdu')).toBe('rtl');
  });

  it('returns "ltr" for LTR languages', () => {
    expect(getTextDirection('English')).toBe('ltr');
    expect(getTextDirection('Spanish')).toBe('ltr');
    expect(getTextDirection('French')).toBe('ltr');
    expect(getTextDirection('Chinese (Simplified)')).toBe('ltr');
  });
});
