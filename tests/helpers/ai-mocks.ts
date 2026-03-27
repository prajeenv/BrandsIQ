/**
 * AI API mock factories for Claude and DeepSeek
 */

export function mockClaudeResponse(text: string = 'Thank you for your wonderful feedback! We truly appreciate your kind words.') {
  return {
    content: [{ type: 'text' as const, text }],
    model: 'claude-sonnet-4-20250514',
    id: 'msg_test_123',
    role: 'assistant' as const,
    stop_reason: 'end_turn',
    type: 'message' as const,
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

export function mockDeepSeekResponse(sentiment: string = 'positive') {
  return {
    data: {
      choices: [
        {
          message: {
            content: sentiment,
            role: 'assistant',
          },
          index: 0,
          finish_reason: 'stop',
        },
      ],
      model: 'deepseek-chat',
      usage: { prompt_tokens: 50, completion_tokens: 5, total_tokens: 55 },
    },
  };
}
