/**
 * Error Handling Utilities Tests
 * 
 * Tests for error categorization, recovery strategies, and user guidance
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  categorizeError,
  retryWithBackoff,
  preserveStateOnError,
  restorePreservedState,
  handleGracefulDegradation,
  suggestParameterAdjustments,
  formatErrorForDisplay,
  ErrorCategory,
  ErrorSeverity,
  RecoveryStrategy,
  type CategorizedError,
} from '../errorHandling';

describe('Error Handling Utilities', () => {
  describe('categorizeError', () => {
    it('should categorize service unavailable errors', () => {
      const error = new Error('ComfyUI service unavailable');
      const categorized = categorizeError(error);
      
      expect(categorized.category).toBe(ErrorCategory.SERVICE_UNAVAILABLE);
      expect(categorized.severity).toBe(ErrorSeverity.HIGH);
      expect(categorized.recoveryStrategy).toBe(RecoveryStrategy.USER_ACTION_REQUIRED);
      expect(categorized.canRetry).toBe(false);
    });

    it('should categorize validation errors', () => {
      const error = new Error('Invalid parameter: width must be between 256 and 2048');
      const categorized = categorizeError(error);
      
      expect(categorized.category).toBe(ErrorCategory.VALIDATION);
      expect(categorized.severity).toBe(ErrorSeverity.LOW);
      expect(categorized.recoveryStrategy).toBe(RecoveryStrategy.ADJUST_PARAMETERS);
    });

    it('should categorize generation errors', () => {
      const error = new Error('Generation failed: workflow error');
      const categorized = categorizeError(error);
      
      expect(categorized.category).toBe(ErrorCategory.GENERATION);
      expect(categorized.severity).toBe(ErrorSeverity.MEDIUM);
      expect(categorized.canRetry).toBe(true);
    });

    it('should categorize timeout errors', () => {
      const error = new Error('Operation timed out after 60 seconds');
      const categorized = categorizeError(error);
      
      expect(categorized.category).toBe(ErrorCategory.TIMEOUT);
      expect(categorized.severity).toBe(ErrorSeverity.MEDIUM);
      expect(categorized.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
      expect(categorized.canRetry).toBe(true);
    });

    it('should categorize file system errors', () => {
      const error = new Error('ENOENT: file not found');
      const categorized = categorizeError(error);
      
      expect(categorized.category).toBe(ErrorCategory.FILE_SYSTEM);
      expect(categorized.severity).toBe(ErrorSeverity.HIGH);
      expect(categorized.recoveryStrategy).toBe(RecoveryStrategy.USER_ACTION_REQUIRED);
    });

    it('should categorize network errors', () => {
      const error = new Error('Network error: ENETUNREACH');
      const categorized = categorizeError(error);
      
      expect(categorized.category).toBe(ErrorCategory.NETWORK);
      expect(categorized.severity).toBe(ErrorSeverity.MEDIUM);
      expect(categorized.recoveryStrategy).toBe(RecoveryStrategy.RETRY_WITH_BACKOFF);
      expect(categorized.canRetry).toBe(true);
    });

    it('should provide user-friendly messages', () => {
      const error = new Error('ComfyUI service unavailable');
      const categorized = categorizeError(error);
      
      expect(categorized.userMessage).toContain('ComfyUI');
      expect(categorized.userMessage).toContain('configuration');
    });

    it('should provide troubleshooting steps', () => {
      const error = new Error('ComfyUI service unavailable');
      const categorized = categorizeError(error);
      
      expect(categorized.troubleshootingSteps).toBeInstanceOf(Array);
      expect(categorized.troubleshootingSteps.length).toBeGreaterThan(0);
      expect(categorized.troubleshootingSteps[0]).toContain('ComfyUI');
    });

    it('should calculate retry delay for retryable errors', () => {
      const error = new Error('Generation failed');
      const categorized = categorizeError(error);
      
      expect(categorized.retryDelay).toBeDefined();
      expect(categorized.retryDelay).toBeGreaterThan(0);
    });
  });

  describe('retryWithBackoff', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockResolvedValueOnce('success');
      
      const promise = retryWithBackoff(operation, 3, 1000);
      
      // Fast-forward through retry delays
      await vi.runAllTimersAsync();
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1 failed'))
        .mockResolvedValueOnce('success');
      const onRetry = vi.fn();
      
      const promise = retryWithBackoff(operation, 3, 1000, onRetry);
      
      await vi.runAllTimersAsync();
      await promise;
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });

    it('should throw after max attempts', async () => {
      const error = new Error('Persistent failure');
      const operation = vi.fn().mockRejectedValue(error);
      
      const promise = retryWithBackoff(operation, 3, 1000);
      
      await vi.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow('Persistent failure');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Attempt 1'))
        .mockRejectedValueOnce(new Error('Attempt 2'))
        .mockResolvedValueOnce('success');
      
      const promise = retryWithBackoff(operation, 3, 1000);
      
      // First retry: 1000ms delay
      await vi.advanceTimersByTimeAsync(1000);
      
      // Second retry: 2000ms delay (exponential)
      await vi.advanceTimersByTimeAsync(2000);
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('preserveStateOnError and restorePreservedState', () => {
    it('should preserve state on error', () => {
      const error: CategorizedError = {
        category: ErrorCategory.GENERATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Generation failed',
        originalError: new Error('Generation failed'),
        userMessage: 'Generation failed',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.RETRY,
        troubleshootingSteps: [],
        canRetry: true,
      };
      
      const userInputs = { prompt: 'test prompt', steps: 20 };
      const generatedAssets = [{ id: '1', type: 'image' }];
      const pipelineState = { stage: 'image' };
      
      const preserved = preserveStateOnError(
        error,
        userInputs,
        generatedAssets,
        pipelineState
      );
      
      expect(preserved.timestamp).toBeDefined();
      expect(preserved.errorCategory).toBe(ErrorCategory.GENERATION);
      expect(preserved.userInputs).toEqual(userInputs);
      expect(preserved.generatedAssets).toEqual(generatedAssets);
      expect(preserved.pipelineState).toEqual(pipelineState);
    });

    it('should restore preserved state', () => {
      const preserved = {
        timestamp: Date.now(),
        errorCategory: ErrorCategory.GENERATION,
        userInputs: { prompt: 'test prompt', steps: 20 },
        generatedAssets: [{ id: '1', type: 'image' }],
        pipelineState: { stage: 'image' },
      };
      
      const restored = restorePreservedState(preserved);
      
      expect(restored.userInputs).toEqual(preserved.userInputs);
      expect(restored.generatedAssets).toEqual(preserved.generatedAssets);
      expect(restored.pipelineState).toEqual(preserved.pipelineState);
    });

    it('should create independent copies', () => {
      const error: CategorizedError = {
        category: ErrorCategory.GENERATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Generation failed',
        originalError: new Error('Generation failed'),
        userMessage: 'Generation failed',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.RETRY,
        troubleshootingSteps: [],
        canRetry: true,
      };
      
      const userInputs = { prompt: 'test prompt' };
      const preserved = preserveStateOnError(error, userInputs);
      
      // Modify original
      userInputs.prompt = 'modified';
      
      // Preserved should be unchanged
      expect(preserved.userInputs.prompt).toBe('test prompt');
    });
  });

  describe('handleGracefulDegradation', () => {
    it('should suggest skipping stage for non-critical errors', () => {
      const error: CategorizedError = {
        category: ErrorCategory.GENERATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Generation failed',
        originalError: new Error('Generation failed'),
        userMessage: 'Generation failed',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.RETRY,
        troubleshootingSteps: [],
        canRetry: true,
      };
      
      const result = handleGracefulDegradation(error, { skipStage: true });
      
      expect(result.success).toBe(true);
      expect(result.shouldRetry).toBe(false);
      expect(result.message).toContain('skipped');
    });

    it('should suggest using default parameters for validation errors', () => {
      const error: CategorizedError = {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: 'Invalid parameter',
        originalError: new Error('Invalid parameter'),
        userMessage: 'Invalid parameter',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.ADJUST_PARAMETERS,
        troubleshootingSteps: [],
        canRetry: false,
      };
      
      const result = handleGracefulDegradation(error, { useDefaultParameters: true });
      
      expect(result.success).toBe(true);
      expect(result.shouldRetry).toBe(true);
      expect(result.message).toContain('default');
    });

    it('should suggest using cached result when available', () => {
      const error: CategorizedError = {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Network error',
        originalError: new Error('Network error'),
        userMessage: 'Network error',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.RETRY_WITH_BACKOFF,
        troubleshootingSteps: [],
        canRetry: true,
      };
      
      const result = handleGracefulDegradation(error, { useCachedResult: true });
      
      expect(result.success).toBe(true);
      expect(result.shouldRetry).toBe(false);
      expect(result.message).toContain('previously generated');
    });

    it('should indicate no recovery for service unavailable', () => {
      const error: CategorizedError = {
        category: ErrorCategory.SERVICE_UNAVAILABLE,
        severity: ErrorSeverity.HIGH,
        message: 'Service unavailable',
        originalError: new Error('Service unavailable'),
        userMessage: 'Service unavailable',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.USER_ACTION_REQUIRED,
        troubleshootingSteps: [],
        canRetry: false,
      };
      
      const result = handleGracefulDegradation(error, { skipStage: true });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('User action required');
    });
  });

  describe('suggestParameterAdjustments', () => {
    it('should suggest reducing steps for generation errors', () => {
      const error: CategorizedError = {
        category: ErrorCategory.GENERATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Generation failed',
        originalError: new Error('Generation failed'),
        userMessage: 'Generation failed',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.RETRY,
        troubleshootingSteps: [],
        canRetry: true,
      };
      
      const currentParams = { steps: 50, width: 1024, height: 1024 };
      const suggestions = suggestParameterAdjustments(error, currentParams);
      
      expect(suggestions).toBeDefined();
      expect(suggestions!.steps).toBeLessThan(currentParams.steps);
    });

    it('should suggest reducing dimensions for large images', () => {
      const error: CategorizedError = {
        category: ErrorCategory.TIMEOUT,
        severity: ErrorSeverity.MEDIUM,
        message: 'Timeout',
        originalError: new Error('Timeout'),
        userMessage: 'Timeout',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.RETRY,
        troubleshootingSteps: [],
        canRetry: true,
      };
      
      const currentParams = { width: 2048, height: 2048, steps: 30 };
      const suggestions = suggestParameterAdjustments(error, currentParams);
      
      expect(suggestions).toBeDefined();
      expect(suggestions!.width).toBe(1024);
      expect(suggestions!.height).toBe(1024);
    });

    it('should suggest reducing CFG scale if too high', () => {
      const error: CategorizedError = {
        category: ErrorCategory.GENERATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Generation failed',
        originalError: new Error('Generation failed'),
        userMessage: 'Generation failed',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.RETRY,
        troubleshootingSteps: [],
        canRetry: true,
      };
      
      const currentParams = { cfgScale: 15, steps: 20 };
      const suggestions = suggestParameterAdjustments(error, currentParams);
      
      expect(suggestions).toBeDefined();
      expect(suggestions!.cfgScale).toBe(7);
    });

    it('should return null for non-generation errors', () => {
      const error: CategorizedError = {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: 'Validation error',
        originalError: new Error('Validation error'),
        userMessage: 'Validation error',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.ADJUST_PARAMETERS,
        troubleshootingSteps: [],
        canRetry: false,
      };
      
      const currentParams = { steps: 50 };
      const suggestions = suggestParameterAdjustments(error, currentParams);
      
      expect(suggestions).toBeNull();
    });

    it('should return null if no adjustments needed', () => {
      const error: CategorizedError = {
        category: ErrorCategory.GENERATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Generation failed',
        originalError: new Error('Generation failed'),
        userMessage: 'Generation failed',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.RETRY,
        troubleshootingSteps: [],
        canRetry: true,
      };
      
      const currentParams = { steps: 10, width: 512, height: 512, cfgScale: 5 };
      const suggestions = suggestParameterAdjustments(error, currentParams);
      
      expect(suggestions).toBeNull();
    });
  });

  describe('formatErrorForDisplay', () => {
    it('should format error with retry action', () => {
      const error: CategorizedError = {
        category: ErrorCategory.GENERATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Generation failed',
        originalError: new Error('Generation failed'),
        userMessage: 'Generation failed. Please try again.',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.RETRY,
        troubleshootingSteps: ['Check parameters', 'Try again'],
        canRetry: true,
      };
      
      const formatted = formatErrorForDisplay(error);
      
      expect(formatted.title).toBe('Generation Error');
      expect(formatted.message).toContain('Generation failed');
      expect(formatted.details).toContain('Check parameters');
      expect(formatted.actions).toContainEqual({ label: 'Retry', action: 'retry' });
      expect(formatted.actions).toContainEqual({ label: 'Cancel', action: 'cancel' });
    });

    it('should format error with adjust parameters action', () => {
      const error: CategorizedError = {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: 'Invalid parameter',
        originalError: new Error('Invalid parameter'),
        userMessage: 'Invalid parameters provided',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.ADJUST_PARAMETERS,
        troubleshootingSteps: ['Review parameters'],
        canRetry: false,
      };
      
      const formatted = formatErrorForDisplay(error);
      
      expect(formatted.title).toBe('Input Error');
      expect(formatted.actions).toContainEqual({ 
        label: 'Adjust Parameters', 
        action: 'adjust_parameters' 
      });
    });

    it('should format error with open settings action', () => {
      const error: CategorizedError = {
        category: ErrorCategory.SERVICE_UNAVAILABLE,
        severity: ErrorSeverity.HIGH,
        message: 'Service unavailable',
        originalError: new Error('Service unavailable'),
        userMessage: 'ComfyUI service is not available',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.USER_ACTION_REQUIRED,
        troubleshootingSteps: ['Check configuration'],
        canRetry: false,
      };
      
      const formatted = formatErrorForDisplay(error);
      
      expect(formatted.title).toBe('Service Error');
      expect(formatted.actions).toContainEqual({ 
        label: 'Open Settings', 
        action: 'open_settings' 
      });
    });

    it('should always include cancel action', () => {
      const error: CategorizedError = {
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.MEDIUM,
        message: 'Unknown error',
        originalError: new Error('Unknown error'),
        userMessage: 'An error occurred',
        technicalDetails: 'Stack trace',
        recoveryStrategy: RecoveryStrategy.NONE,
        troubleshootingSteps: [],
        canRetry: false,
      };
      
      const formatted = formatErrorForDisplay(error);
      
      expect(formatted.actions).toContainEqual({ label: 'Cancel', action: 'cancel' });
    });
  });
});
