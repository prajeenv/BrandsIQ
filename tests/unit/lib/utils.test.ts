import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDate,
  formatDateTime,
  truncate,
  sleep,
  generateId,
  isValidEmail,
  capitalize,
  formatCredits,
  calculatePercentage,
  getNextResetDate,
} from '@/lib/utils';

describe('cn', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('handles conflicting tailwind classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('handles empty inputs', () => {
    expect(cn()).toBe('');
  });
});

describe('formatDate', () => {
  it('formats Date object to readable string', () => {
    const result = formatDate(new Date('2026-01-15T00:00:00Z'));
    expect(result).toContain('Jan');
    expect(result).toContain('15');
    expect(result).toContain('2026');
  });

  it('formats ISO string to readable string', () => {
    const result = formatDate('2026-06-20T12:00:00Z');
    expect(result).toContain('Jun');
    expect(result).toContain('2026');
  });

  it('returns a string for valid input', () => {
    expect(typeof formatDate(new Date())).toBe('string');
  });
});

describe('formatDateTime', () => {
  it('includes time in output', () => {
    const result = formatDateTime(new Date('2026-01-15T14:30:00Z'));
    expect(result).toContain('Jan');
    expect(result).toContain('2026');
    // Should contain time portion
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('formats Date object correctly', () => {
    const result = formatDateTime(new Date('2026-12-25T08:00:00Z'));
    expect(result).toContain('Dec');
    expect(result).toContain('25');
    expect(result).toContain('2026');
  });
});

describe('truncate', () => {
  it('returns original text when shorter than limit', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('returns original text when equal to limit', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('truncates and adds ellipsis when longer', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...');
  });

  it('trims trailing whitespace before ellipsis', () => {
    expect(truncate('Hello World Extra', 6)).toBe('Hello...');
  });

  it('handles empty string', () => {
    expect(truncate('', 10)).toBe('');
  });
});

describe('sleep', () => {
  it('returns a promise that resolves', async () => {
    const start = Date.now();
    await sleep(10);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(5);
  });
});

describe('generateId', () => {
  it('returns string of specified length', () => {
    expect(generateId(8)).toHaveLength(8);
    expect(generateId(20)).toHaveLength(20);
  });

  it('default length is 12', () => {
    expect(generateId()).toHaveLength(12);
  });

  it('contains only alphanumeric characters', () => {
    const id = generateId(100);
    expect(id).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('returns unique values on each call', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateId()));
    expect(ids.size).toBe(10);
  });
});

describe('isValidEmail', () => {
  it('returns true for valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.org')).toBe(true);
  });

  it('returns false for missing @', () => {
    expect(isValidEmail('testexample.com')).toBe(false);
  });

  it('returns false for missing domain', () => {
    expect(isValidEmail('test@')).toBe(false);
  });

  it('returns false for spaces', () => {
    expect(isValidEmail('test @example.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });
});

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('handles already capitalized', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('only capitalizes first letter', () => {
    expect(capitalize('hELLO')).toBe('HELLO');
  });
});

describe('formatCredits', () => {
  it('formats integer to one decimal', () => {
    expect(formatCredits(5)).toBe('5.0');
  });

  it('formats decimal correctly', () => {
    expect(formatCredits(1.5)).toBe('1.5');
  });

  it('formats zero correctly', () => {
    expect(formatCredits(0)).toBe('0.0');
  });

  it('rounds to one decimal place', () => {
    expect(formatCredits(1.25)).toBe('1.3');
  });
});

describe('calculatePercentage', () => {
  it('calculates correctly', () => {
    expect(calculatePercentage(50, 100)).toBe(50);
  });

  it('returns 0 when total is 0', () => {
    expect(calculatePercentage(5, 0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(calculatePercentage(1, 3)).toBe(33);
  });

  it('handles 100%', () => {
    expect(calculatePercentage(15, 15)).toBe(100);
  });

  it('handles values greater than total', () => {
    expect(calculatePercentage(20, 10)).toBe(200);
  });
});

describe('getNextResetDate', () => {
  it('adds 30 days to given date', () => {
    const result = getNextResetDate('2026-03-01T00:00:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe('2026-03-31T00:00:00.000Z');
  });

  it('returns null for null input', () => {
    expect(getNextResetDate(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(getNextResetDate(undefined)).toBeNull();
  });

  it('handles string date input', () => {
    const result = getNextResetDate('2026-01-15T00:00:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe('2026-02-14T00:00:00.000Z');
  });

  it('handles month boundary correctly', () => {
    const result = getNextResetDate('2026-01-31T00:00:00Z');
    expect(result).toBeInstanceOf(Date);
    // Jan 31 + 30 days = Mar 2
    expect(result!.toISOString()).toBe('2026-03-02T00:00:00.000Z');
  });
});
