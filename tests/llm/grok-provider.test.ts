import { GrokProvider } from '../../src/llm/grok-provider';
import { Message } from '../../src/llm/interfaces';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('GrokProvider', () => {
  const validApiKey = 'xai-test123';
  let provider: GrokProvider;

  beforeEach(() => {
    provider = new GrokProvider(validApiKey);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with valid API key', () => {
      expect(() => new GrokProvider('xai-valid')).not.toThrow();
    });

    it('should throw error with empty API key', () => {
      expect(() => new GrokProvider('')).toThrow('xAI API key is required');
    });

    it('should throw error with whitespace-only API key', () => {
      expect(() => new GrokProvider('   ')).toThrow('xAI API key is required');
    });
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'grok-2-1212',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello world',
            refusal: null,
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 2,
          completion_tokens: 2,
          total_tokens: 4,
          prompt_tokens_details: {
            text_tokens: 2,
            audio_tokens: 0,
            image_tokens: 0,
            cached_tokens: 0,
          },
          completion_tokens_details: {
            reasoning_tokens: 0,
            audio_tokens: 0,
            accepted_prediction_tokens: 0,
            rejected_prediction_tokens: 0,
          },
          num_sources_used: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.generateText('Hello');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.x.ai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hello' }],
            model: 'grok-2-1212',
            temperature: 0.7,
            max_tokens: 1000,
          }),
        })
      );
      expect(result).toBe('Hello world');
    });

    it('should handle rate limit error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      } as Response);

      await expect(provider.generateText('Hello')).rejects.toThrow('Rate limit exceeded. Please try again later.');
    });

    it('should handle quota exceeded error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'insufficient_quota',
      } as Response);

      await expect(provider.generateText('Hello')).rejects.toThrow('API quota exceeded. Please check your xAI billing.');
    });

    it('should handle invalid API key error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      } as Response);

      await expect(provider.generateText('Hello')).rejects.toThrow('Invalid API key provided.');
    });

    it('should handle generic API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      } as Response);

      await expect(provider.generateText('Hello')).rejects.toThrow('xAI API error: 500 Internal Server Error - Server error');
    });
  });

  describe('generateCompletion', () => {
    const messages: Message[] = [
      { role: 'system', content: 'You are helpful' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];

    it('should generate completion successfully', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'grok-2-1212',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: 'How can I help?',
            refusal: null,
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 15,
          completion_tokens: 4,
          total_tokens: 19,
          prompt_tokens_details: {
            text_tokens: 15,
            audio_tokens: 0,
            image_tokens: 0,
            cached_tokens: 0,
          },
          completion_tokens_details: {
            reasoning_tokens: 0,
            audio_tokens: 0,
            accepted_prediction_tokens: 0,
            rejected_prediction_tokens: 0,
          },
          num_sources_used: 0,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.generateCompletion(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.x.ai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: 'You are helpful' },
              { role: 'user', content: 'Hello' },
              { role: 'assistant', content: 'Hi there!' },
            ],
            model: 'grok-2-1212',
            temperature: 0.7,
            max_tokens: 1000,
          }),
        })
      );
      expect(result).toBe('How can I help?');
    });

    it('should handle rate limit error in completion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      } as Response);

      await expect(provider.generateCompletion(messages)).rejects.toThrow('Rate limit exceeded. Please try again later.');
    });
  });

  describe('isAvailable', () => {
    it('should return true when API is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'chatcmpl-123',
          choices: [{
            message: {
              content: 'OK',
            },
          }],
        }),
      } as Response);

      const result = await provider.isAvailable();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.x.ai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validApiKey}`,
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('should return false when API key is invalid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });

    it('should return false when connection fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });
  });
});