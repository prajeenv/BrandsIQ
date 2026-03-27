import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('axios', () => ({
  default: { post: vi.fn() },
}));

import axios from 'axios';
import { analyzeSentiment } from '@/lib/ai/deepseek';

const mockedAxios = vi.mocked(axios);

describe('analyzeSentiment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.DEEPSEEK_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── Fallback (keyword-based) tests ───

  describe('fallback analysis (no API key)', () => {
    it('should detect positive sentiment from positive keywords', async () => {
      const result = await analyzeSentiment('This product is amazing and excellent!');
      expect(result.sentiment).toBe('positive');
      expect(result.confidence).toBe(0.6);
    });

    it('should detect negative sentiment from negative keywords', async () => {
      const result = await analyzeSentiment('Terrible experience, worst product ever, awful service');
      expect(result.sentiment).toBe('negative');
      expect(result.confidence).toBe(0.6);
    });

    it('should detect neutral sentiment when no strong keywords present', async () => {
      const result = await analyzeSentiment('The product arrived on time. It works as described.');
      expect(result.sentiment).toBe('neutral');
      expect(result.confidence).toBe(0.6);
    });

    it('should detect neutral when positive and negative keyword counts are equal', async () => {
      const result = await analyzeSentiment('The product is great but the service was terrible');
      expect(result.sentiment).toBe('neutral');
      expect(result.confidence).toBe(0.6);
    });

    it('should handle empty text gracefully', async () => {
      const result = await analyzeSentiment('');
      expect(result.sentiment).toBe('neutral');
      expect(result.confidence).toBe(0.6);
    });

    it('should be case-insensitive for keyword matching', async () => {
      const result = await analyzeSentiment('AMAZING product, EXCELLENT quality, LOVE it!');
      expect(result.sentiment).toBe('positive');
    });

    it('should detect multi-word keywords like "highly recommend"', async () => {
      const result = await analyzeSentiment('I would highly recommend this to anyone');
      expect(result.sentiment).toBe('positive');
    });

    it('should detect multi-word negative keywords like "never again"', async () => {
      const result = await analyzeSentiment('Never again will I buy from this company');
      expect(result.sentiment).toBe('negative');
    });
  });

  // ─── API-based tests ───

  describe('API analysis (with API key)', () => {
    beforeEach(() => {
      process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
    });

    it('should call DeepSeek API and return positive sentiment', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: 'positive' } }],
        },
      });

      const result = await analyzeSentiment('Great product, love it!');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.deepseek.com/v1/chat/completions',
        expect.objectContaining({
          model: 'deepseek-chat',
          temperature: 0.1,
          max_tokens: 10,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-deepseek-key',
          }),
        }),
      );
      expect(result.sentiment).toBe('positive');
      expect(result.confidence).toBe(0.9);
    });

    it('should return negative sentiment from API response', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: 'Negative' } }],
        },
      });

      const result = await analyzeSentiment('Terrible experience');
      expect(result.sentiment).toBe('negative');
      expect(result.confidence).toBe(0.9);
    });

    it('should return neutral when API response does not contain positive or negative', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: 'mixed feelings' } }],
        },
      });

      const result = await analyzeSentiment('It was okay, nothing special');
      expect(result.sentiment).toBe('neutral');
      expect(result.confidence).toBe(0.9);
    });

    it('should trim and lowercase API response before classification', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: '  POSITIVE  \n' } }],
        },
      });

      const result = await analyzeSentiment('Wonderful service!');
      expect(result.sentiment).toBe('positive');
    });

    it('should fall back to keyword analysis on API error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('API timeout'));

      const result = await analyzeSentiment('This product is amazing and excellent!');
      expect(result.sentiment).toBe('positive');
      expect(result.confidence).toBe(0.6);
    });

    it('should fall back to keyword analysis on network error', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

      const result = await analyzeSentiment('Terrible, awful, horrible experience');
      expect(result.sentiment).toBe('negative');
      expect(result.confidence).toBe(0.6);
    });

    it('should include review text in the API request message', async () => {
      const reviewText = 'Specific review text for testing';
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: 'neutral' } }],
        },
      });

      await analyzeSentiment(reviewText);

      const requestBody = mockedAxios.post.mock.calls[0][1] as {
        messages: Array<{ content: string; role?: string }>;
      };
      const userMessage = requestBody.messages.find(
        (m) => m.role === 'user',
      );
      expect(userMessage?.content).toContain(reviewText);
    });
  });
});
