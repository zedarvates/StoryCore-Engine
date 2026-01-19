import { GeminiProvider } from '../../src/llm/gemini-provider';
import { Message } from '../../src/llm/interfaces';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('GeminiProvider', () => {
  const validApiKey = 'AIza-test123';
  let provider: GeminiProvider;

  beforeEach(() => {
    provider = new GeminiProvider(validApiKey);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create provider with valid API key', () => {
      expect(() => new GeminiProvider('AIz-valid')).not.toThrow();
    });

    it('should throw error with empty API key', () => {
      expect(() => new GeminiProvider('')).toThrow('Gemini API key is required');
    });

    it('should throw error with whitespace-only API key', () => {
      expect(() => new GeminiProvider('   ')).toThrow('Gemini API key is required');
    });
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Hello world' }],
            role: 'model',
          },
          finishReason: 'STOP',
          index: 0,
          safetyRatings: [],
        }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.generateText('Hello');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIza-test123',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: { parts: [{ text: 'Hello' }] },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
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
        text: async () => 'quota_exceeded',
      } as Response);

      await expect(provider.generateText('Hello')).rejects.toThrow('API quota exceeded. Please check your Google AI billing.');
    });

    it('should handle invalid API key error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      } as Response);

      await expect(provider.generateText('Hello')).rejects.toThrow('Invalid API key provided.');
    });

    it('should handle content blocked error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Content blocked by safety filters',
      } as Response);

      await expect(provider.generateText('Hello')).rejects.toThrow('Content blocked by safety filters.');
    });

    it('should handle prompt feedback blocked', async () => {
      const mockResponse = {
        candidates: [],
        promptFeedback: {
          blockReason: 'SAFETY',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await expect(provider.generateText('Hello')).rejects.toThrow('Prompt blocked by safety filters.');
    });

    it('should handle generic API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      } as Response);

      await expect(provider.generateText('Hello')).rejects.toThrow('Gemini API error: 500 Internal Server Error - Server error');
    });
  });

  describe('generateCompletion', () => {
    const messages: Message[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' },
    ];

    it('should generate completion successfully', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'How can I help?' }],
            role: 'model',
          },
          finishReason: 'STOP',
          index: 0,
          safetyRatings: [],
        }],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.generateCompletion(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIza-test123',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: 'Hello' }] },
              { role: 'model', parts: [{ text: 'Hi there!' }] },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000,
            },
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
          candidates: [{
            content: { parts: [{ text: 'OK' }], role: 'model' },
          }],
        }),
      } as Response);

      const result = await provider.isAvailable();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIza-test123',
        expect.objectContaining({
          method: 'POST',
          headers: {
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