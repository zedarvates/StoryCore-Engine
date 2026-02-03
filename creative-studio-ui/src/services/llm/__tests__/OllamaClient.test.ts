/**
 * Tests for OllamaClient
 * 
 * Tests Ollama API communication including:
 * - Model listing
 * - Generation (sync and streaming)
 * - Health checks
 * - Model metadata detection
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OllamaClient } from '../OllamaClient';

describe('OllamaClient', () => {
  let client: OllamaClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new OllamaClient('http://localhost:11434');
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      const mockResponse = {
        models: [
          { name: 'qwen3-vl:8b', size: 8589934592 },
          { name: 'llama3.1:8b', size: 8589934592 },
          { name: 'gemma3:4b', size: 4294967296 },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const models = await client.listModels();

      expect(models).toHaveLength(3);
      expect(models[0].name).toBe('qwen3-vl:8b');
      expect(models[0].category).toBe('vision');
      expect(models[0].available).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/api/tags');
    });

    it('should detect vision models correctly', async () => {
      const mockResponse = {
        models: [
          { name: 'qwen3-vl:8b', size: 8589934592 },
          { name: 'llava:7b', size: 7516192768 },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const models = await client.listModels();

      expect(models[0].category).toBe('vision');
      expect(models[0].capabilities).toContain('vision');
      expect(models[1].category).toBe('vision');
      expect(models[1].capabilities).toContain('vision');
    });

    it('should detect storytelling models correctly', async () => {
      const mockResponse = {
        models: [
          { name: 'llama3.1:8b', size: 8589934592 },
          { name: 'mistral:7b', size: 7516192768 },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const models = await client.listModels();

      expect(models[0].category).toBe('storytelling');
      expect(models[0].recommendedFor).toContain('storytelling');
      expect(models[1].category).toBe('storytelling');
    });

    it('should detect quick models correctly', async () => {
      const mockResponse = {
        models: [
          { name: 'gemma3:4b', size: 4294967296 },
          { name: 'phi:2b', size: 2147483648 },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const models = await client.listModels();

      expect(models[0].category).toBe('quick');
      expect(models[0].recommendedFor).toContain('quick-brainstorm');
      expect(models[1].category).toBe('quick');
    });

    it('should format model sizes correctly', async () => {
      const mockResponse = {
        models: [
          { name: 'model1', size: 8589934592 }, // 8GB
          { name: 'model2', size: 4294967296 }, // 4GB
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const models = await client.listModels();

      expect(models[0].size).toBe('8.0GB');
      expect(models[1].size).toBe('4.0GB');
    });

    it('should handle API errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(client.listModels()).rejects.toThrow('Failed to list models');
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.listModels()).rejects.toThrow('Network error');
    });
  });

  describe('generate', () => {
    it('should generate completion', async () => {
      const mockResponse = {
        response: '<thinking>Analyzing...</thinking><summary>Result</summary>',
        done: true,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.generate('gemma3:4b', 'Test prompt');

      expect(result).toBe('<thinking>Analyzing...</thinking><summary>Result</summary>');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should use default options', async () => {
      const mockResponse = {
        response: 'Generated text',
        done: true,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.generate('gemma3:4b', 'Test prompt');

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.options.temperature).toBe(0.7);
      expect(body.options.num_predict).toBe(2000);
      expect(body.stream).toBe(false);
    });

    it('should use custom options', async () => {
      const mockResponse = {
        response: 'Generated text',
        done: true,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.generate('gemma3:4b', 'Test prompt', {
        temperature: 0.9,
        maxTokens: 1000,
      });

      const callArgs = fetchMock.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);

      expect(body.options.temperature).toBe(0.9);
      expect(body.options.num_predict).toBe(1000);
    });

    it('should handle generation errors', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Model not found',
      });

      await expect(
        client.generate('invalid-model', 'Test prompt')
      ).rejects.toThrow('Generation failed');
    });

    it('should handle network errors during generation', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(
        client.generate('gemma3:4b', 'Test prompt')
      ).rejects.toThrow('Connection refused');
    });
  });

  describe('healthCheck', () => {
    it('should return true when Ollama is accessible', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
      });

      const isHealthy = await client.healthCheck();

      expect(isHealthy).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should return false when Ollama is not accessible', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
      });

      const isHealthy = await client.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should return false on network error', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await client.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('should return false on timeout', async () => {
      // Mock a delayed response that will timeout
      fetchMock.mockImplementationOnce(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        })
      );

      const isHealthy = await client.healthCheck();

      expect(isHealthy).toBe(false);
    }, 10000); // Increase test timeout to 10 seconds
  });

  describe('getModelInfo', () => {
    it('should get model information', async () => {
      const mockInfo = {
        modelfile: 'FROM gemma3:4b',
        parameters: 'temperature 0.7',
        template: 'template',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockInfo,
      });

      const info = await client.getModelInfo('gemma3:4b');

      expect(info).toEqual(mockInfo);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:11434/api/show',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'gemma3:4b' }),
        })
      );
    });

    it('should handle errors when getting model info', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(
        client.getModelInfo('invalid-model')
      ).rejects.toThrow('Failed to get model info');
    });
  });

  describe('Model Category Detection', () => {
    it('should detect technical models', async () => {
      const mockResponse = {
        models: [
          { name: 'codellama:7b', size: 7516192768 },
          { name: 'deepseek-coder:6.7b', size: 7197425664 },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const models = await client.listModels();

      expect(models[0].category).toBe('technical');
      expect(models[0].capabilities).toContain('code');
      expect(models[1].category).toBe('technical');
    });

    it('should detect general models', async () => {
      const mockResponse = {
        models: [
          { name: 'unknown-model:7b', size: 7516192768 },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const models = await client.listModels();

      expect(models[0].category).toBe('general');
    });
  });

  describe('Model Recommendations', () => {
    it('should provide vision model recommendations', async () => {
      const mockResponse = {
        models: [
          { name: 'qwen3-vl:8b', size: 8589934592 },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const models = await client.listModels();

      expect(models[0].recommendedFor).toContain('image-analysis');
      expect(models[0].recommendedFor).toContain('visual-design');
      expect(models[0].recommendedFor).toContain('storyboard-review');
    });

    it('should provide storytelling model recommendations', async () => {
      const mockResponse = {
        models: [
          { name: 'llama3.1:8b', size: 8589934592 },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const models = await client.listModels();

      expect(models[0].recommendedFor).toContain('long-form-writing');
      expect(models[0].recommendedFor).toContain('storytelling');
      expect(models[0].recommendedFor).toContain('world-building');
    });

    it('should provide quick model recommendations', async () => {
      const mockResponse = {
        models: [
          { name: 'gemma3:4b', size: 4294967296 },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const models = await client.listModels();

      expect(models[0].recommendedFor).toContain('quick-brainstorm');
      expect(models[0].recommendedFor).toContain('name-generation');
      expect(models[0].recommendedFor).toContain('simple-tasks');
    });

    it('should provide technical model recommendations', async () => {
      const mockResponse = {
        models: [
          { name: 'codellama:7b', size: 7516192768 },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const models = await client.listModels();

      expect(models[0].recommendedFor).toContain('code-generation');
      expect(models[0].recommendedFor).toContain('technical-writing');
    });
  });

  describe('Custom Base URL', () => {
    it('should use custom base URL', async () => {
      const customClient = new OllamaClient('http://custom-host:8080');
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

      await customClient.listModels();

      expect(fetchMock).toHaveBeenCalledWith('http://custom-host:8080/api/tags');
    });

    it('should use default base URL', async () => {
      const defaultClient = new OllamaClient();
      
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ models: [] }),
      });

      await defaultClient.listModels();

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:11434/api/tags');
    });
  });
});
