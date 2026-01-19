/**
 * Tests for LLM Service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  LLMService,
  LLMError,
  createLLMService,
  getLLMService,
  getAvailableProviders,
  getDefaultSystemPrompts,
  type LLMConfig,
  type LLMRequest,
} from '../llmService';

// Mock fetch
global.fetch = vi.fn();

describe('LLMService', () => {
  let llmService: LLMService;
  let mockConfig: Partial<LLMConfig>;

  beforeEach(() => {
    mockConfig = {
      provider: 'openai',
      apiKey: 'test-api-key',
      model: 'gpt-4',
      timeout: 5000,
      retryAttempts: 2,
      streamingEnabled: true,
    };

    llmService = new LLMService(mockConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OpenAI Provider', () => {
    it('should generate completion successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Generated text' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: LLMRequest = {
        prompt: 'Test prompt',
        systemPrompt: 'You are a helpful assistant',
      };

      const result = await llmService.generateCompletion(request);

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Generated text');
      expect(result.data?.finishReason).toBe('stop');
      expect(result.data?.usage?.totalTokens).toBe(30);
    });

    it('should handle API error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: 'Invalid API key', code: 'invalid_api_key' },
        }),
      });

      const request: LLMRequest = { prompt: 'Test' };
      const result = await llmService.generateCompletion(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('should handle streaming completion', async () => {
      const chunks = ['Hello', ' ', 'world', '!'];
      const mockStream = new ReadableStream({
        start(controller) {
          chunks.forEach((chunk, i) => {
            const data = JSON.stringify({
              choices: [{ delta: { content: chunk }, finish_reason: i === chunks.length - 1 ? 'stop' : null }],
            });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          });
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      });

      const receivedChunks: string[] = [];
      const request: LLMRequest = { prompt: 'Test', stream: true };

      const result = await llmService.generateStreamingCompletion(
        request,
        (chunk) => receivedChunks.push(chunk)
      );

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Hello world!');
      expect(receivedChunks).toEqual(chunks);
    });

    it('should validate connection successfully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      });

      const result = await llmService.validateConnection();

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should handle connection validation failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await llmService.validateConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('Anthropic Provider', () => {
    beforeEach(() => {
      llmService = new LLMService({
        ...mockConfig,
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
      });
    });

    it('should generate completion successfully', async () => {
      const mockResponse = {
        content: [{ text: 'Generated text from Claude' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: LLMRequest = { prompt: 'Test prompt' };
      const result = await llmService.generateCompletion(request);

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Generated text from Claude');
      expect(result.data?.finishReason).toBe('stop');
    });

    it('should handle streaming completion', async () => {
      const chunks = ['Hello', ' from', ' Claude'];
      const mockStream = new ReadableStream({
        start(controller) {
          chunks.forEach((chunk, i) => {
            const data = JSON.stringify({
              type: 'content_block_delta',
              delta: { text: chunk },
            });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          });
          const stopData = JSON.stringify({ type: 'message_stop' });
          controller.enqueue(new TextEncoder().encode(`data: ${stopData}\n\n`));
          controller.close();
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      });

      const receivedChunks: string[] = [];
      const request: LLMRequest = { prompt: 'Test' };

      const result = await llmService.generateStreamingCompletion(
        request,
        (chunk) => receivedChunks.push(chunk)
      );

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Hello from Claude');
      expect(receivedChunks).toEqual(chunks);
    });
  });

  describe('Custom/Local Provider', () => {
    beforeEach(() => {
      llmService = new LLMService({
        ...mockConfig,
        provider: 'local',
        apiEndpoint: 'http://localhost:8000',
        apiKey: '',
      });
    });

    it('should generate completion successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Local model response' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 10,
          total_tokens: 15,
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const request: LLMRequest = { prompt: 'Test' };
      const result = await llmService.generateCompletion(request);

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Local model response');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/v1/chat/completions',
        expect.any(Object)
      );
    });

    it('should not include Authorization header when no API key', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'test' } }] }),
      });

      await llmService.generateCompletion({ prompt: 'Test' });

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on retryable error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: { message: 'Server error', code: 'server_error' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Success' }, finish_reason: 'stop' }],
          }),
        });

      const result = await llmService.generateCompletion({ prompt: 'Test' });

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key', code: 'invalid_api_key' } }),
      });

      const result = await llmService.generateCompletion({ prompt: 'Test' });

      expect(result.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should fail after max retries', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error', code: 'server_error' } }),
      });

      const result = await llmService.generateCompletion({ prompt: 'Test' });

      expect(result.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(2); // retryAttempts = 2
    });

    it('should use exponential backoff', async () => {
      vi.useFakeTimers();

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Server error', code: 'server_error' } }),
      });

      const promise = llmService.generateCompletion({ prompt: 'Test' });

      // First attempt fails immediately
      await vi.advanceTimersByTimeAsync(0);

      // Second attempt after 1s backoff
      await vi.advanceTimersByTimeAsync(1000);

      await promise;

      expect(global.fetch).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout long requests', async () => {
      vi.useFakeTimers();

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const promise = llmService.generateCompletion({ prompt: 'Test' });

      await vi.advanceTimersByTimeAsync(5000);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');

      vi.useRealTimers();
    });
  });

  describe('Configuration Management', () => {
    it('should use custom configuration', () => {
      const customConfig: Partial<LLMConfig> = {
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229',
        parameters: {
          temperature: 0.5,
          maxTokens: 1000,
          topP: 0.9,
          frequencyPenalty: 0.5,
          presencePenalty: 0.5,
        },
      };

      const service = new LLMService(customConfig);
      const config = service.getConfig();

      expect(config.provider).toBe('anthropic');
      expect(config.model).toBe('claude-3-sonnet-20240229');
      expect(config.parameters.temperature).toBe(0.5);
    });

    it('should update configuration', () => {
      llmService.updateConfig({
        model: 'gpt-3.5-turbo',
        parameters: { temperature: 0.9, maxTokens: 500, topP: 1, frequencyPenalty: 0, presencePenalty: 0 },
      });

      const config = llmService.getConfig();

      expect(config.model).toBe('gpt-3.5-turbo');
      expect(config.parameters.temperature).toBe(0.9);
    });

    it('should recreate provider when provider type changes', () => {
      const initialProvider = llmService.getProviderName();
      expect(initialProvider).toBe('OpenAI');

      llmService.updateConfig({ provider: 'anthropic' });

      const newProvider = llmService.getProviderName();
      expect(newProvider).toBe('Anthropic');
    });

    it('should merge with default configuration', () => {
      const service = new LLMService({ provider: 'openai', apiKey: 'test' });
      const config = service.getConfig();

      expect(config.timeout).toBeDefined();
      expect(config.retryAttempts).toBeDefined();
      expect(config.systemPrompts).toBeDefined();
    });
  });

  describe('Streaming Control', () => {
    it('should fall back to non-streaming when disabled', async () => {
      llmService.updateConfig({ streamingEnabled: false });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Non-streaming response' }, finish_reason: 'stop' }],
        }),
      });

      const result = await llmService.generateStreamingCompletion(
        { prompt: 'Test' },
        () => {}
      );

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('Non-streaming response');
    });
  });

  describe('Error Handling', () => {
    it('should create LLMError with correct properties', () => {
      const error = new LLMError('Test error', 'test_code', true, { detail: 'info' });

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('test_code');
      expect(error.retryable).toBe(true);
      expect(error.details).toEqual({ detail: 'info' });
      expect(error.name).toBe('LLMError');
    });

    it('should handle rate limiting errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit exceeded', code: 'rate_limit' } }),
      });

      const result = await llmService.generateCompletion({ prompt: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit');
    });

    it('should handle content filter errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '' }, finish_reason: 'content_filter' }],
        }),
      });

      const result = await llmService.generateCompletion({ prompt: 'Test' });

      expect(result.success).toBe(true);
      expect(result.data?.finishReason).toBe('content_filter');
    });
  });
});

describe('Helper Functions', () => {
  describe('getLLMService', () => {
    it('should return singleton instance', () => {
      const service1 = getLLMService();
      const service2 = getLLMService();

      expect(service1).toBe(service2);
    });
  });

  describe('createLLMService', () => {
    it('should create new instance with custom config', () => {
      const service = createLLMService({ provider: 'anthropic', apiKey: 'test' });

      expect(service).toBeDefined();
      expect(service.getConfig).toBeDefined();
      expect(service.getConfig().provider).toBe('anthropic');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return all available providers', () => {
      const providers = getAvailableProviders();

      expect(providers).toHaveLength(4);
      expect(providers.map(p => p.id)).toEqual(['openai', 'anthropic', 'local', 'custom']);
    });

    it('should include provider details', () => {
      const providers = getAvailableProviders();
      const openai = providers.find(p => p.id === 'openai');

      expect(openai).toBeDefined();
      expect(openai?.name).toBe('OpenAI');
      expect(openai?.models.length).toBeGreaterThan(0);
      expect(openai?.requiresApiKey).toBe(true);
      expect(openai?.supportsStreaming).toBe(true);
    });
  });

  describe('getDefaultSystemPrompts', () => {
    it('should return default system prompts', () => {
      const prompts = getDefaultSystemPrompts();

      expect(prompts.worldGeneration).toBeDefined();
      expect(prompts.characterGeneration).toBeDefined();
      expect(prompts.dialogueGeneration).toBeDefined();
      expect(prompts.worldGeneration).toContain('world-building');
    });
  });
});
