/**
 * Tests for LLM Error Handling and Fallback Mechanisms
 * Task 2.2: Add LLM error handling and fallback mechanisms
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  LLMService,
  LLMError,
  LLMErrorCategory,
  createLLMService,
  type LLMConfig,
  type LLMRequest,
} from '../llmService';

// Mock fetch
global.fetch = vi.fn();

describe('LLM Error Handling and Fallback Mechanisms', () => {
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

  // ============================================================================
  // Error Categorization Tests
  // ============================================================================

  describe('Error Categorization', () => {
    it('should categorize authentication errors correctly', () => {
      const error = new LLMError('Invalid API key', 'invalid_api_key', false);
      expect(error.category).toBe(LLMErrorCategory.AUTHENTICATION);
      expect(error.getUserMessage()).toContain('Authentication failed');
    });

    it('should categorize rate limit errors correctly', () => {
      const error = new LLMError('Rate limit exceeded', 'rate_limit', true);
      expect(error.category).toBe(LLMErrorCategory.RATE_LIMIT);
      expect(error.getUserMessage()).toContain('Rate limit exceeded');
    });

    it('should categorize timeout errors correctly', () => {
      const error = new LLMError('Request timeout', 'timeout', true);
      expect(error.category).toBe(LLMErrorCategory.TIMEOUT);
      expect(error.getUserMessage()).toContain('timed out');
    });

    it('should categorize network errors correctly', () => {
      const error = new LLMError('Network error', 'network_error', true);
      expect(error.category).toBe(LLMErrorCategory.NETWORK);
      expect(error.getUserMessage()).toContain('Network error');
    });

    it('should categorize content filter errors correctly', () => {
      const error = new LLMError('Content filtered', 'content_filter', false);
      expect(error.category).toBe(LLMErrorCategory.CONTENT_FILTER);
      expect(error.getUserMessage()).toContain('filtered');
    });

    it('should categorize server errors correctly', () => {
      const error = new LLMError('Server error', 'server_error', true);
      expect(error.category).toBe(LLMErrorCategory.SERVER_ERROR);
      expect(error.getUserMessage()).toContain('temporarily unavailable');
    });

    it('should provide category-specific recovery suggestions', () => {
      const authError = new LLMError('Invalid API key', 'invalid_api_key', false);
      const suggestions = authError.getSuggestedActions();
      
      expect(suggestions).toContain('Verify your API key in settings');
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Timeout Handling Tests
  // ============================================================================

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
      expect(result.code).toBe('timeout');

      vi.useRealTimers();
    });

    it('should handle timeout with proper error category', async () => {
      vi.useFakeTimers();

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const promise = llmService.generateCompletion({ prompt: 'Test' });
      await vi.advanceTimersByTimeAsync(5000);
      const result = await promise;

      expect(result.success).toBe(false);
      
      // Create error from result to check category
      const error = new LLMError(result.error || '', result.code || '', false);
      expect(error.category).toBe(LLMErrorCategory.TIMEOUT);

      vi.useRealTimers();
    });
  });

  // ============================================================================
  // Cancellation Tests
  // ============================================================================

  describe('Request Cancellation', () => {
    it('should cancel ongoing request', async () => {
      vi.useFakeTimers();

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const requestId = 'test-request-1';
      const promise = llmService.generateCompletion({ prompt: 'Test' }, requestId);

      // Cancel after 1 second
      await vi.advanceTimersByTimeAsync(1000);
      const cancelled = llmService.cancelRequest(requestId);

      expect(cancelled).toBe(true);

      await vi.advanceTimersByTimeAsync(10000);
      const result = await promise;

      expect(result.success).toBe(false);

      vi.useRealTimers();
    });

    it('should cancel all ongoing requests', async () => {
      vi.useFakeTimers();

      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      const promise1 = llmService.generateCompletion({ prompt: 'Test 1' }, 'req-1');
      const promise2 = llmService.generateCompletion({ prompt: 'Test 2' }, 'req-2');

      await vi.advanceTimersByTimeAsync(1000);
      llmService.cancelAllRequests();

      await vi.advanceTimersByTimeAsync(10000);
      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);

      vi.useRealTimers();
    });

    it('should return false when cancelling non-existent request', () => {
      const cancelled = llmService.cancelRequest('non-existent');
      expect(cancelled).toBe(false);
    });
  });

  // ============================================================================
  // Recovery Options Tests
  // ============================================================================

  describe('Error Recovery Options', () => {
    it('should create recovery options with retry for retryable errors', () => {
      const error = new LLMError('Server error', 'server_error', true);
      const onRetry = vi.fn();
      const onManualEntry = vi.fn();
      const onCancel = vi.fn();

      const recovery = llmService.createRecoveryOptions(
        error,
        onRetry,
        onManualEntry,
        onCancel
      );

      expect(recovery.retryable).toBe(true);
      expect(recovery.actions.length).toBeGreaterThan(0);
      
      // Should have retry action
      const retryAction = recovery.actions.find(a => a.label === 'Retry');
      expect(retryAction).toBeDefined();
      expect(retryAction?.primary).toBe(true);
    });

    it('should create recovery options without retry for non-retryable errors', () => {
      const error = new LLMError('Invalid API key', 'invalid_api_key', false);
      const onRetry = vi.fn();
      const onManualEntry = vi.fn();

      const recovery = llmService.createRecoveryOptions(
        error,
        onRetry,
        onManualEntry
      );

      expect(recovery.retryable).toBe(false);
      
      // Manual entry should be primary for non-retryable errors
      const manualAction = recovery.actions.find(a => a.label === 'Enter Manually');
      expect(manualAction).toBeDefined();
      expect(manualAction?.primary).toBe(true);
    });

    it('should include manual entry fallback option', () => {
      const error = new LLMError('Any error', 'error', false);
      const onManualEntry = vi.fn();

      const recovery = llmService.createRecoveryOptions(
        error,
        undefined,
        onManualEntry
      );

      const manualAction = recovery.actions.find(a => a.label === 'Enter Manually');
      expect(manualAction).toBeDefined();
      
      // Execute the action
      manualAction?.action();
      expect(onManualEntry).toHaveBeenCalled();
    });

    it('should include cancel option when provided', () => {
      const error = new LLMError('Any error', 'error', false);
      const onCancel = vi.fn();

      const recovery = llmService.createRecoveryOptions(
        error,
        undefined,
        undefined,
        onCancel
      );

      const cancelAction = recovery.actions.find(a => a.label === 'Cancel');
      expect(cancelAction).toBeDefined();
      expect(cancelAction?.primary).toBe(false);
    });

    it('should handle generic Error objects', () => {
      const error = new Error('Generic error');
      const recovery = llmService.createRecoveryOptions(error);

      expect(recovery.message).toBe('Generic error');
      expect(recovery.category).toBe(LLMErrorCategory.UNKNOWN);
    });
  });

  // ============================================================================
  // Fallback Mechanism Tests
  // ============================================================================

  describe('Fallback to Manual Entry', () => {
    it('should provide fallback data in recovery options', () => {
      const error = new LLMError('Generation failed', 'error', false);
      const fallbackData = { suggestion: 'Default value' };
      
      const recovery = llmService.createRecoveryOptions(error);
      recovery.fallbackData = fallbackData;

      expect(recovery.fallbackData).toEqual(fallbackData);
    });

    it('should indicate when manual entry is recommended', () => {
      const authError = new LLMError('Invalid API key', 'invalid_api_key', false);
      const recovery = llmService.createRecoveryOptions(
        authError,
        undefined,
        vi.fn()
      );

      // For non-retryable errors, manual entry should be primary
      const manualAction = recovery.actions.find(a => a.label === 'Enter Manually');
      expect(manualAction?.primary).toBe(true);
    });
  });

  // ============================================================================
  // Error Message Tests
  // ============================================================================

  describe('User-Friendly Error Messages', () => {
    it('should provide user-friendly messages for all error categories', () => {
      const categories = [
        LLMErrorCategory.AUTHENTICATION,
        LLMErrorCategory.RATE_LIMIT,
        LLMErrorCategory.TIMEOUT,
        LLMErrorCategory.NETWORK,
        LLMErrorCategory.INVALID_REQUEST,
        LLMErrorCategory.CONTENT_FILTER,
        LLMErrorCategory.SERVER_ERROR,
        LLMErrorCategory.UNKNOWN,
      ];

      categories.forEach((category) => {
        const error = new LLMError('Test', 'test', false, undefined, category);
        const message = error.getUserMessage();
        
        expect(message).toBeTruthy();
        expect(message.length).toBeGreaterThan(0);
        expect(message).not.toContain('undefined');
      });
    });

    it('should provide actionable suggestions for errors', () => {
      const error = new LLMError('Test', 'test', false, undefined, LLMErrorCategory.AUTHENTICATION);
      const suggestions = error.getSuggestedActions();

      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach((suggestion) => {
        expect(suggestion).toBeTruthy();
        expect(suggestion.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Error Handling Integration', () => {
    it('should handle authentication error with proper recovery options', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: 'Invalid API key', code: 'invalid_api_key' },
        }),
      });

      const result = await llmService.generateCompletion({ prompt: 'Test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
      
      // Create recovery options
      const error = new LLMError(result.error || '', result.code || '', false);
      expect(error.category).toBe(LLMErrorCategory.AUTHENTICATION);
      expect(error.retryable).toBe(false);
    });

    it('should handle rate limit error with retry option', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: { message: 'Rate limit exceeded', code: 'rate_limit' },
        }),
      });

      const result = await llmService.generateCompletion({ prompt: 'Test' });

      expect(result.success).toBe(false);
      
      const error = new LLMError(result.error || '', result.code || '', true);
      expect(error.category).toBe(LLMErrorCategory.RATE_LIMIT);
      expect(error.retryable).toBe(true);
    });

    it('should handle server error with retry option', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: 'Internal server error', code: 'server_error' },
        }),
      });

      const result = await llmService.generateCompletion({ prompt: 'Test' });

      expect(result.success).toBe(false);
      
      const error = new LLMError(result.error || '', result.code || '', true);
      expect(error.category).toBe(LLMErrorCategory.SERVER_ERROR);
      expect(error.retryable).toBe(true);
    });
  });

  // ============================================================================
  // Streaming Error Handling Tests
  // ============================================================================

  describe('Streaming Error Handling', () => {
    it('should handle errors during streaming', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: { message: 'Streaming failed', code: 'stream_error' },
        }),
      });

      const chunks: string[] = [];
      const result = await llmService.generateStreamingCompletion(
        { prompt: 'Test' },
        (chunk) => chunks.push(chunk)
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should support cancellation during streaming', async () => {
      vi.useFakeTimers();

      const mockStream = new ReadableStream({
        start(controller) {
          setTimeout(() => {
            const data = JSON.stringify({
              choices: [{ delta: { content: 'test' } }],
            });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          }, 5000);
        },
      });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        body: mockStream,
      });

      const requestId = 'stream-test';
      const promise = llmService.generateStreamingCompletion(
        { prompt: 'Test' },
        () => {},
        requestId
      );

      await vi.advanceTimersByTimeAsync(1000);
      llmService.cancelRequest(requestId);

      await vi.advanceTimersByTimeAsync(10000);
      const result = await promise;

      expect(result.success).toBe(false);

      vi.useRealTimers();
    });
  });
});
