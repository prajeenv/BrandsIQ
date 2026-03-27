import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockCreate, MockAPIError } = vi.hoisted(() => {
  const mockCreate = vi.fn();

  class MockAPIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = 'APIError';
    }
  }

  return { mockCreate, MockAPIError };
});

vi.mock('@anthropic-ai/sdk', () => {
  // Source code does `new Anthropic({ apiKey })` and `error instanceof Anthropic.APIError`.
  // We need a real class so `new` works, with a static APIError property.
  class MockAnthropic {
    messages = { create: mockCreate };
    static APIError = MockAPIError;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_opts?: Record<string, unknown>) {}
  }

  return { default: MockAnthropic };
});

import { generateReviewResponse, DEFAULT_MODEL } from '@/lib/ai/claude';

const testBrandVoice = {
  tone: 'professional',
  formality: 3,
  keyPhrases: ['Thank you', 'We appreciate your feedback'],
  styleNotes: 'Be genuine and empathetic',
  sampleResponses: [],
};

const defaultParams = {
  reviewText: 'Great service, will come back!',
  platform: 'google',
  rating: 5,
  detectedLanguage: 'English',
  brandVoice: testBrandVoice,
};

const successResponse = {
  content: [{ type: 'text' as const, text: 'Thank you for your feedback!' }],
  model: 'claude-sonnet-4-20250514',
};

describe('claude.ts', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    process.env = { ...originalEnv };
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    mockCreate.mockResolvedValue(successResponse);
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = originalEnv;
  });

  describe('DEFAULT_MODEL', () => {
    it('should be claude-sonnet-4-20250514', () => {
      expect(DEFAULT_MODEL).toBe('claude-sonnet-4-20250514');
    });
  });

  describe('generateReviewResponse', () => {
    it('should throw if ANTHROPIC_API_KEY is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      await expect(generateReviewResponse(defaultParams)).rejects.toThrow(
        'ANTHROPIC_API_KEY is not configured',
      );
    });

    it('should return responseText and model on success', async () => {
      const result = await generateReviewResponse(defaultParams);

      expect(result.responseText).toBe('Thank you for your feedback!');
      expect(result.model).toBe('claude-sonnet-4-20250514');
    });

    it('should call messages.create with correct model and max_tokens', async () => {
      await generateReviewResponse(defaultParams);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: DEFAULT_MODEL,
          max_tokens: 500,
        }),
      );
    });

    it('should include review text in the user message', async () => {
      await generateReviewResponse(defaultParams);

      const callArgs = mockCreate.mock.calls[0][0];
      const messages = callArgs.messages as Array<{ role: string; content: string }>;
      const userMessage = messages.find((m) => m.role === 'user');
      expect(userMessage?.content).toContain('Great service, will come back!');
    });

    it('should include brand voice tone in the system prompt', async () => {
      await generateReviewResponse(defaultParams);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toContain('professional');
    });

    it('should include key phrases in the system prompt', async () => {
      await generateReviewResponse(defaultParams);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toContain('Thank you');
      expect(callArgs.system).toContain('We appreciate your feedback');
    });

    it('should include the detected language in the prompt', async () => {
      await generateReviewResponse({
        ...defaultParams,
        detectedLanguage: 'Spanish',
      });

      const callArgs = mockCreate.mock.calls[0][0];
      const fullRequest = JSON.stringify(callArgs);
      expect(fullRequest).toContain('Spanish');
    });

    it('should include tone modifier when provided', async () => {
      await generateReviewResponse({
        ...defaultParams,
        toneModifier: 'empathetic' as const,
      });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system.toLowerCase()).toContain('empathetic');
    });

    it('should throw when response contains no text content blocks', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'image', source: {} }],
        model: 'claude-sonnet-4-20250514',
      });

      await expect(generateReviewResponse(defaultParams)).rejects.toThrow(
        'No text response received from Claude',
      );
    });

    it('should retry on 429 rate limit error and succeed', async () => {
      mockCreate
        .mockRejectedValueOnce(new MockAPIError(429, 'Rate limited'))
        .mockResolvedValueOnce(successResponse);

      const promise = generateReviewResponse(defaultParams);
      // Advance past the 1s backoff delay
      await vi.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result.responseText).toBe('Thank you for your feedback!');
    });

    it('should retry on 529 overloaded error and succeed', async () => {
      mockCreate
        .mockRejectedValueOnce(new MockAPIError(529, 'Overloaded'))
        .mockResolvedValueOnce(successResponse);

      const promise = generateReviewResponse(defaultParams);
      await vi.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result.responseText).toBe('Thank you for your feedback!');
    });

    it('should throw immediately on non-retryable API errors', async () => {
      mockCreate.mockRejectedValueOnce(new MockAPIError(400, 'Bad request'));

      await expect(generateReviewResponse(defaultParams)).rejects.toThrow(
        'Bad request',
      );
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });
});
