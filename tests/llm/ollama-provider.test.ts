import { OllamaProvider } from '../../src/llm/ollama-provider';
import { Message } from '../../src/llm/interfaces';

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider('http://localhost:11434');
    jest.clearAllMocks();
  });

  describe('generateText', () => {
    it('should generate text successfully', async () => {
      const mockResponse = {
        response: 'Hello world',
        done: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.generateText('Hello');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            model: 'llama2',
            prompt: 'Hello',
            stream: false,
            options: undefined,
          }),
        })
      );
      expect(result).toBe('Hello world');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(provider.generateText('Hello')).rejects.toThrow('Ollama API error: 500 Internal Server Error');
    });
  });

  describe('generateCompletion', () => {
    it('should generate completion successfully', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello' },
      ];

      const mockResponse = {
        message: {
          role: 'assistant',
          content: 'Hi there!',
        },
        done: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.generateCompletion(messages);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            model: 'llama2',
            messages,
            stream: false,
            options: undefined,
          }),
        })
      );
      expect(result).toBe('Hi there!');
    });
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await provider.isAvailable();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/tags', expect.any(Object));
    });

    it('should return false when Ollama is not available', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await provider.isAvailable();
      expect(result).toBe(false);
    });
  });
});