/**
 * useErrorHandling Hook
 * 
 * React hook for error handling with retry strategies and user notifications.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ErrorHandlingService,
  getErrorHandlingService,
  type AppError,
  type RetryConfig,
  type ErrorRecoveryAction,
} from '../services/errorHandlingService';

export interface UseErrorHandlingOptions {
  /**
   * Callback when error occurs
   */
  onError?: (error: AppError) => void;

  /**
   * Callback when error is recovered
   */
  onRecover?: () => void;

  /**
   * Auto-dismiss errors after timeout (ms)
   */
  autoDismissTimeout?: number;

  /**
   * Custom retry configuration
   */
  retryConfig?: Partial<RetryConfig>;
}

export interface UseErrorHandlingReturn {
  /**
   * Current error (if any)
   */
  error: AppError | null;

  /**
   * All errors in log
   */
  errors: AppError[];

  /**
   * Execute function with retry logic
   */
  withRetry: <T>(fn: () => Promise<T>, options?: Partial<RetryConfig>) => Promise<T>;

  /**
   * Execute function with timeout
   */
  withTimeout: <T>(fn: () => Promise<T>, timeoutMs: number) => Promise<T>;

  /**
   * Execute function with retry and timeout
   */
  withRetryAndTimeout: <T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    retryOptions?: Partial<RetryConfig>
  ) => Promise<T>;

  /**
   * Handle error manually
   */
  handleError: (error: Error | string, context?: Record<string, any>) => AppError;

  /**
   * Clear current error
   */
  clearError: () => void;

  /**
   * Clear all errors
   */
  clearAllErrors: () => void;

  /**
   * Get recovery actions for current error
   */
  getRecoveryActions: () => ErrorRecoveryAction[];

  /**
   * Retry last failed operation
   */
  retry: () => Promise<void>;

  /**
   * Check if currently retrying
   */
  isRetrying: boolean;
}

export function useErrorHandling(
  options: UseErrorHandlingOptions = {}
): UseErrorHandlingReturn {
  const {
    onError,
    onRecover,
    autoDismissTimeout,
    retryConfig,
  } = options;

  // Service instance
  const serviceRef = useRef<ErrorHandlingService | null>(null);

  // State
  const [error, setError] = useState<AppError | null>(null);
  const [errors, setErrors] = useState<AppError[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);

  // Last failed operation for retry
  const lastOperationRef = useRef<(() => Promise<any>) | null>(null);

  // Auto-dismiss timer
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize service
  useEffect(() => {
    serviceRef.current = getErrorHandlingService();
  }, []);

  /**
   * Update errors from service
   */
  const updateErrors = useCallback(() => {
    if (serviceRef.current) {
      setErrors(serviceRef.current.getErrorLog());
    }
  }, []);

  /**
   * Handle error
   */
  const handleError = useCallback(
    (err: Error | string, context?: Record<string, any>): AppError => {
      if (!serviceRef.current) {
        const fallbackError: AppError = {
          id: 'fallback',
          message: typeof err === 'string' ? err : err.message,
          userMessage: 'An error occurred',
          severity: 'error',
          category: 'unknown',
          timestamp: new Date(),
          context,
          originalError: typeof err === 'string' ? new Error(err) : err,
          recoverable: false,
          retryable: false,
        };
        setError(fallbackError);
        return fallbackError;
      }

      const appError = serviceRef.current.createError(err, 'unknown', context);
      setError(appError);
      updateErrors();

      // Call onError callback
      if (onError) {
        onError(appError);
      }

      // Set auto-dismiss timer
      if (autoDismissTimeout && autoDismissTimeout > 0) {
        if (dismissTimerRef.current) {
          clearTimeout(dismissTimerRef.current);
        }
        dismissTimerRef.current = setTimeout(() => {
          setError(null);
        }, autoDismissTimeout);
      }

      return appError;
    },
    [onError, autoDismissTimeout, updateErrors]
  );

  /**
   * Execute with retry
   */
  const withRetry = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options?: Partial<RetryConfig>
    ): Promise<T> => {
      if (!serviceRef.current) {
        throw new Error('Error handling service not initialized');
      }

      // Store operation for retry
      lastOperationRef.current = fn;

      try {
        const config = { ...retryConfig, ...options };
        return await serviceRef.current.withRetry(fn, config);
      } catch (err) {
        if (err instanceof Error || typeof err === 'string') {
          handleError(err);
        }
        throw err;
      }
    },
    [retryConfig, handleError]
  );

  /**
   * Execute with timeout
   */
  const withTimeout = useCallback(
    async <T,>(fn: () => Promise<T>, timeoutMs: number): Promise<T> => {
      if (!serviceRef.current) {
        throw new Error('Error handling service not initialized');
      }

      try {
        return await serviceRef.current.withTimeout(fn, timeoutMs);
      } catch (err) {
        if (err instanceof Error || typeof err === 'string') {
          handleError(err);
        }
        throw err;
      }
    },
    [handleError]
  );

  /**
   * Execute with retry and timeout
   */
  const withRetryAndTimeout = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      timeoutMs: number,
      retryOptions?: Partial<RetryConfig>
    ): Promise<T> => {
      if (!serviceRef.current) {
        throw new Error('Error handling service not initialized');
      }

      // Store operation for retry
      lastOperationRef.current = fn;

      try {
        const config = { ...retryConfig, ...retryOptions };
        return await serviceRef.current.withRetryAndTimeout(fn, timeoutMs, config);
      } catch (err) {
        if (err instanceof Error || typeof err === 'string') {
          handleError(err);
        }
        throw err;
      }
    },
    [retryConfig, handleError]
  );

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.clearErrorLog();
      updateErrors();
    }
    clearError();
  }, [clearError, updateErrors]);

  /**
   * Get recovery actions
   */
  const getRecoveryActions = useCallback((): ErrorRecoveryAction[] => {
    if (!error || !serviceRef.current) {
      return [];
    }

    const actions = serviceRef.current.getRecoveryActions(error);

    // Bind retry action
    const retryAction = actions.find((a) => a.label === 'Retry');
    if (retryAction) {
      retryAction.action = async () => {
        await retry();
      };
    }

    // Bind dismiss action
    const dismissAction = actions.find((a) => a.label === 'Dismiss');
    if (dismissAction) {
      dismissAction.action = clearError;
    }

    return actions;
  }, [error, clearError]);

  /**
   * Retry last operation
   */
  const retry = useCallback(async (): Promise<void> => {
    if (!lastOperationRef.current) {
      return;
    }

    setIsRetrying(true);
    clearError();

    try {
      await lastOperationRef.current();
      
      // Call onRecover callback
      if (onRecover) {
        onRecover();
      }
    } catch (err) {
      // Error will be handled by withRetry
    } finally {
      setIsRetrying(false);
    }
  }, [clearError, onRecover]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  return {
    error,
    errors,
    withRetry,
    withTimeout,
    withRetryAndTimeout,
    handleError,
    clearError,
    clearAllErrors,
    getRecoveryActions,
    retry,
    isRetrying,
  };
}
