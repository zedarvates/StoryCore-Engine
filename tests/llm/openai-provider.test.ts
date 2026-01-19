import { OpenAIProvider } from '../../src/llm/openai-provider';
import { Message } from '../../src/llm/interfaces';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('OpenAIProvider', () => {
  const validApiKey = 'sk-test123';
  let provider: OpenAIProvider;

  beforeEach(() => {
    provider = new OpenAIProvider(validApiKey);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with valid API key', () => {
      expect(() => new OpenAIProvider('sk-valid')).not.toThrow();
    });

    it('should throw error with empty API key', () => {
      expect(() => new OpenAIProvider('')).toThrow('OpenAI API key is required');
    });

    it('should throw error with whitespace-only API key', () => {
      expect(() => new OpenAIProvider('   ')).toThrow('OpenAI API key is required');
    });
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      const mockResponse = {
        id: 'cmpl-123',
        object: 'text_completion',
        created: 1677652288,
        model: 'text-davinci-003',
        choices: [{
          text: 'Hello world',
          index: 0,
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 2,
          completion_tokens: 2,
          total_tokens: 4,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.generateText('Hello');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            prompt: 'Hello',
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

      await expect(provider.generateText('Hello')).rejects.toThrow('API quota exceeded. Please check your OpenAI billing.');
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

      await expect(provider.generateText('Hello')).rejects.toThrow('OpenAI API error: 500 Internal Server Error - Server error');
    });
  });

  describe('generateCompletion', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
    ];

    it('should generate completion successfully', async () => {
      const mockResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-3.5-turbo',
        choices: [{
          message: {
            role: 'assistant',
            content: 'Hi there!',
          },
          index: 0,
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 9,
          completion_tokens: 12,
          total_tokens: 21,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.generateCompletion(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${validApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        })
      );
      expect(result).toBe('Hi there!');
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
        json: async () => ({ object: 'list', data: [] }),
      } as Response);

      const result = await provider.isAvailable();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          method: 'GET',
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