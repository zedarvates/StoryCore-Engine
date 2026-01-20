/**
 * Generation Error Handling Tests
 * 
 * Tests for error handling utilities, retry logic, and partial result management.
 * 
 * Requirements: 3.7, 9.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GenerationErrorHandler,
  DEFAULT_RETRY_STRATEGY,
  createGenerationError,
  withRetry,
  isTemporaryError,
  isPermanentError,
  getUserFriendlyErrorMessage,
} from '../utils/generationErrorHandling';

// ============================================================================
// Tests
// ============================================================================

describe('GenerationErrorHandler', () => {
  let errorHandler: GenerationErrorHandler;

  beforeEach(() => {
    errorHandler = new GenerationErrorHandler();
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle retryable errors correctly', () => {
      // Requirements: 3.7
      const error = new Error('Network timeout occurred');
      const context = {
        stage: 'grid',
        attemptNumber: 1,
      };

      const result = errorHandler.handleError(error, context);

      expect(result.action).toBe('retry');
      expect(result.canRetry).toBe(true);
      expect(result.suggestedDelay).toBeGreaterThan(0);
    });

    it('should handle non-retryable errors correctly', () => {
      // Requirements: 3.7
      const error = new Error('Invalid authentication credentials');
      const context = {
        stage: 'grid',
        attemptNumber: 1,
      };

      const result = errorHandler.handleError(error, context);

      expect(result.action).toBe('abort');
      expect(result.canRetry).toBe(false);
    });

    it('should abort after max retry attempts', () => {
      // Requirements: 3.7
      const error = new Error('Network timeout occurred');
      const context = {
        stage: 'grid',
        attemptNumber: 3,
      };

      const result = errorHandler.handleError(error, context);

      expect(result.action).toBe('abort');
      expect(result.canRetry).toBe(false);
    });

    it('should record error history', () => {
      // Requirements: 3.7
      const error1 = new Error('First error');
      const error2 = new Error('Second error');

      errorHandler.handleError(error1, { stage: 'grid', attemptNumber: 1 });
      errorHandler.handleError(error2, { stage: 'comfyui', attemptNumber: 1 });

      const history = errorHandler.getErrorHistory();

      expect(history).toHaveLength(2);
      expect(history[0].stage).toBe('grid');
      expect(history[1].stage).toBe('comfyui');
    });

    it('should clear error history', () => {
      // Requirements: 3.7
      const error = new Error('Test error');
      errorHandler.handleError(error, { stage: 'grid', attemptNumber: 1 });

      expect(errorHandler.getErrorHistory()).toHaveLength(1);

      errorHandler.clearErrorHistory();

      expect(errorHandler.getErrorHistory()).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Retry Delay Calculation Tests
  // ==========================================================================

  describe('Retry Delay Calculation', () => {
    it('should calculate exponential backoff correctly', () => {
      // Requirements: 3.7
      const error = new Error('Network timeout');

      const result1 = errorHandler.handleError(error, {
        stage: 'grid',
        attemptNumber: 1,
      });
      const result2 = errorHandler.handleError(error, {
        stage: 'grid',
        attemptNumber: 2,
      });

      // Verify exponential increase (only for attempts that can retry)
      expect(result1.suggestedDelay).toBe(DEFAULT_RETRY_STRATEGY.initialDelayMs);
      expect(result2.suggestedDelay).toBe(
        DEFAULT_RETRY_STRATEGY.initialDelayMs * DEFAULT_RETRY_STRATEGY.backoffMultiplier
      );
      
      // Attempt 3 reaches max attempts, so no suggested delay
      const result3 = errorHandler.handleError(error, {
        stage: 'grid',
        attemptNumber: 3,
      });
      expect(result3.canRetry).toBe(false);
      expect(result3.suggestedDelay).toBeUndefined();
    });

    it('should cap delay at maximum', () => {
      // Requirements: 3.7
      const customStrategy = {
        ...DEFAULT_RETRY_STRATEGY,
        maxDelayMs: 5000,
        maxAttempts: 10, // Increase max attempts so we can test capping
      };

      const handler = new GenerationErrorHandler(customStrategy);
      const error = new Error('Network timeout');

      const result = handler.handleError(error, {
        stage: 'grid',
        attemptNumber: 5, // High attempt number but still within max
      });

      expect(result.canRetry).toBe(true);
      expect(result.suggestedDelay).toBeLessThanOrEqual(5000);
    });
  });

  // ==========================================================================
  // Partial Results Tests
  // ==========================================================================

  describe('Partial Results Management', () => {
    it('should save partial results to localStorage', () => {
      // Requirements: 9.5
      const projectId = 'test-project-1';
      const completedStages = ['grid', 'comfyui'];
      const generatedShots = [
        {
          shotId: 'shot-1',
          imageUrl: '/test/shot1.png',
          qaScore: 95,
          processingTime: 1000,
        },
      ];
      const masterCoherenceSheetUrl = '/test/grid.png';

      errorHandler.savePartialResults(
        projectId,
        completedStages,
        generatedShots,
        masterCoherenceSheetUrl
      );

      // Verify saved to localStorage
      const stored = localStorage.getItem(`generation_partial_${projectId}`);
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.projectId).toBe(projectId);
      expect(parsed.completedStages).toEqual(completedStages);
      expect(parsed.generatedShots).toEqual(generatedShots);
      expect(parsed.masterCoherenceSheetUrl).toBe(masterCoherenceSheetUrl);
    });

    it('should load partial results from localStorage', () => {
      // Requirements: 9.5
      const projectId = 'test-project-1';
      const completedStages = ['grid'];
      const generatedShots: any[] = [];
      const masterCoherenceSheetUrl = '/test/grid.png';

      // Save first
      errorHandler.savePartialResults(
        projectId,
        completedStages,
        generatedShots,
        masterCoherenceSheetUrl
      );

      // Load
      const loaded = errorHandler.loadPartialResults(projectId);

      expect(loaded).toBeTruthy();
      expect(loaded?.projectId).toBe(projectId);
      expect(loaded?.completedStages).toEqual(completedStages);
      expect(loaded?.masterCoherenceSheetUrl).toBe(masterCoherenceSheetUrl);
    });

    it('should clear partial results', () => {
      // Requirements: 9.5
      const projectId = 'test-project-1';

      // Save first
      errorHandler.savePartialResults(projectId, ['grid'], [], '/test/grid.png');

      // Verify saved
      expect(errorHandler.loadPartialResults(projectId)).toBeTruthy();

      // Clear
      errorHandler.clearPartialResults(projectId);

      // Verify cleared
      expect(errorHandler.loadPartialResults(projectId)).toBeNull();
    });

    it('should return null for non-existent partial results', () => {
      // Requirements: 9.5
      const loaded = errorHandler.loadPartialResults('non-existent-project');
      expect(loaded).toBeNull();
    });
  });

  // ==========================================================================
  // Error Severity Tests
  // ==========================================================================

  describe('Error Severity', () => {
    it('should classify timeout errors as medium severity', () => {
      const error = new Error('Request timeout');
      const severity = errorHandler.getErrorSeverity(error);
      expect(severity).toBe('medium');
    });

    it('should classify authentication errors as critical severity', () => {
      const error = new Error('Authentication failed');
      const severity = errorHandler.getErrorSeverity(error);
      expect(severity).toBe('critical');
    });

    it('should classify validation errors as high severity', () => {
      const error = new Error('Validation error: invalid input');
      const severity = errorHandler.getErrorSeverity(error);
      expect(severity).toBe('high');
    });

    it('should default to medium severity for unknown errors', () => {
      const error = new Error('Some unknown error');
      const severity = errorHandler.getErrorSeverity(error);
      expect(severity).toBe('medium');
    });
  });

  // ==========================================================================
  // Error Formatting Tests
  // ==========================================================================

  describe('Error Formatting', () => {
    it('should format errors with severity emoji', () => {
      const error = new Error('Network timeout');
      const formatted = errorHandler.formatErrorForDisplay(error);
      expect(formatted).toContain('⚠️');
      expect(formatted).toContain('Network timeout');
    });

    it('should format critical errors with alert emoji', () => {
      const error = new Error('Authentication failed');
      const formatted = errorHandler.formatErrorForDisplay(error);
      expect(formatted).toContain('🚨');
    });
  });

  // ==========================================================================
  // Reset Tests
  // ==========================================================================

  describe('Reset', () => {
    it('should reset handler state', () => {
      // Add some state
      const error = new Error('Test error');
      errorHandler.handleError(error, { stage: 'grid', attemptNumber: 1 });
      errorHandler.savePartialResults('test-project', ['grid'], []);

      // Reset
      errorHandler.reset();

      // Verify state cleared
      expect(errorHandler.getErrorHistory()).toHaveLength(0);
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe('Error Handling Utilities', () => {
  describe('createGenerationError', () => {
    it('should create generation error with correct properties', () => {
      // Requirements: 3.7
      const error = createGenerationError('grid', 'Grid generation failed', 'shot-1', true);

      expect(error.stage).toBe('grid');
      expect(error.message).toBe('Grid generation failed');
      expect(error.shotId).toBe('shot-1');
      expect(error.retryable).toBe(true);
    });
  });

  describe('withRetry', () => {
    it('should retry failed operations', async () => {
      // Requirements: 3.7
      let attemptCount = 0;

      const operation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Network timeout');
        }
        return Promise.resolve('success');
      });

      const result = await withRetry(operation, {
        ...DEFAULT_RETRY_STRATEGY,
        initialDelayMs: 10,
      });

      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    it('should throw after max retries', async () => {
      // Requirements: 3.7
      const operation = vi.fn().mockRejectedValue(new Error('Network timeout'));

      await expect(
        withRetry(operation, {
          ...DEFAULT_RETRY_STRATEGY,
          maxAttempts: 2,
          initialDelayMs: 10,
        })
      ).rejects.toThrow('Network timeout');

      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      // Requirements: 3.7
      const operation = vi.fn().mockRejectedValue(new Error('Invalid input'));

      await expect(
        withRetry(operation, DEFAULT_RETRY_STRATEGY)
      ).rejects.toThrow('Invalid input');

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      // Requirements: 3.7
      let attemptCount = 0;
      const onRetry = vi.fn();

      const operation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new Error('Network timeout');
        }
        return Promise.resolve('success');
      });

      await withRetry(
        operation,
        {
          ...DEFAULT_RETRY_STRATEGY,
          initialDelayMs: 10,
        },
        onRetry
      );

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('isTemporaryError', () => {
    it('should identify temporary errors', () => {
      expect(isTemporaryError(new Error('Network timeout'))).toBe(true);
      expect(isTemporaryError(new Error('Connection failed'))).toBe(true);
      expect(isTemporaryError(new Error('Service unavailable'))).toBe(true);
      expect(isTemporaryError(new Error('Rate limit exceeded'))).toBe(true);
    });

    it('should not identify permanent errors as temporary', () => {
      expect(isTemporaryError(new Error('Invalid input'))).toBe(false);
      expect(isTemporaryError(new Error('Not found'))).toBe(false);
      expect(isTemporaryError(new Error('Unauthorized'))).toBe(false);
    });
  });

  describe('isPermanentError', () => {
    it('should identify permanent errors', () => {
      expect(isPermanentError(new Error('Not found'))).toBe(true);
      expect(isPermanentError(new Error('Invalid input'))).toBe(true);
      expect(isPermanentError(new Error('Unauthorized'))).toBe(true);
      expect(isPermanentError(new Error('Authentication failed'))).toBe(true);
    });

    it('should not identify temporary errors as permanent', () => {
      expect(isPermanentError(new Error('Network timeout'))).toBe(false);
      expect(isPermanentError(new Error('Connection failed'))).toBe(false);
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should convert technical errors to user-friendly messages', () => {
      // Requirements: 3.7
      expect(getUserFriendlyErrorMessage(new Error('network error'))).toContain(
        'Unable to connect'
      );
      expect(getUserFriendlyErrorMessage(new Error('timeout'))).toContain('took too long');
      expect(getUserFriendlyErrorMessage(new Error('not found'))).toContain('not found');
      expect(getUserFriendlyErrorMessage(new Error('unauthorized'))).toContain(
        'not authorized'
      );
      expect(getUserFriendlyErrorMessage(new Error('rate limit'))).toContain('Too many');
    });

    it('should return original message for unmapped errors', () => {
      const error = new Error('Some custom error');
      expect(getUserFriendlyErrorMessage(error)).toBe('Some custom error');
    });
  });
});
