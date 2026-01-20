/**
 * Generation Error Handling Utilities
 * 
 * Provides error handling, retry logic with exponential backoff,
 * and partial result saving for generation pipeline failures.
 * 
 * Requirements: 3.7, 9.5
 */

import type {
  GenerationError,
  GeneratedShot,
} from '../types/projectDashboard';

// ============================================================================
// Types
// ============================================================================

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Retry strategy configuration
 */
export interface RetryStrategy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Error context for detailed error reporting
 */
export interface ErrorContext {
  stage: string;
  shotId?: string;
  timestamp: number;
  attemptNumber: number;
  stackTrace?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Partial results for recovery
 */
export interface PartialResults {
  projectId: string;
  timestamp: number;
  completedStages: string[];
  generatedShots: GeneratedShot[];
  masterCoherenceSheetUrl?: string;
  lastError?: GenerationError;
}

/**
 * Error recovery action
 */
export type RecoveryAction = 'retry' | 'skip' | 'abort' | 'manual';

/**
 * Error handler result
 */
export interface ErrorHandlerResult {
  action: RecoveryAction;
  message: string;
  canRetry: boolean;
  suggestedDelay?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default retry strategy
 * Requirements: 3.7
 */
export const DEFAULT_RETRY_STRATEGY: RetryStrategy = {
  maxAttempts: 3,
  initialDelayMs: 2000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'timeout',
    'network',
    'connection',
    'temporary',
    'rate_limit',
    'service_unavailable',
  ],
};

/**
 * Error severity mapping
 */
const ERROR_SEVERITY_MAP: Record<string, ErrorSeverity> = {
  timeout: 'medium',
  network: 'medium',
  connection: 'medium',
  validation: 'high',
  authentication: 'critical',
  authorization: 'critical',
  not_found: 'high',
  invalid_input: 'high',
  service_unavailable: 'medium',
  rate_limit: 'low',
  unknown: 'medium',
};

// ============================================================================
// Error Handling Class
// ============================================================================

/**
 * Generation error handler with retry logic
 * Requirements: 3.7, 9.5
 */
export class GenerationErrorHandler {
  private retryStrategy: RetryStrategy;
  private errorHistory: ErrorContext[] = [];
  private partialResults: PartialResults | null = null;

  constructor(retryStrategy: RetryStrategy = DEFAULT_RETRY_STRATEGY) {
    this.retryStrategy = retryStrategy;
  }

  /**
   * Handle error and determine recovery action
   * Requirements: 3.7
   */
  handleError(
    error: Error | GenerationError,
    context: Partial<ErrorContext>
  ): ErrorHandlerResult {
    // Record error in history
    const errorContext: ErrorContext = {
      stage: context.stage || 'unknown',
      shotId: context.shotId,
      timestamp: Date.now(),
      attemptNumber: context.attemptNumber || 1,
      stackTrace: error instanceof Error ? error.stack : undefined,
      additionalInfo: context.additionalInfo,
    };

    this.errorHistory.push(errorContext);

    // Determine if error is retryable
    const isRetryable = this.isErrorRetryable(error);
    const canRetry =
      isRetryable && errorContext.attemptNumber < this.retryStrategy.maxAttempts;

    // Calculate retry delay with exponential backoff
    const suggestedDelay = canRetry
      ? this.calculateRetryDelay(errorContext.attemptNumber)
      : undefined;

    // Determine recovery action
    let action: RecoveryAction;
    let message: string;

    if (canRetry) {
      action = 'retry';
      message = `Retrying after ${Math.round(suggestedDelay! / 1000)}s (attempt ${errorContext.attemptNumber + 1}/${this.retryStrategy.maxAttempts})`;
    } else if (isRetryable && errorContext.attemptNumber >= this.retryStrategy.maxAttempts) {
      action = 'abort';
      message = `Maximum retry attempts (${this.retryStrategy.maxAttempts}) reached. Generation aborted.`;
    } else {
      action = 'abort';
      message = this.getErrorMessage(error);
    }

    return {
      action,
      message,
      canRetry,
      suggestedDelay,
    };
  }

  /**
   * Check if error is retryable
   * Requirements: 3.7
   */
  private isErrorRetryable(error: Error | GenerationError): boolean {
    const errorMessage = this.getErrorMessage(error).toLowerCase();

    return this.retryStrategy.retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError)
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   * Requirements: 3.7
   */
  private calculateRetryDelay(attemptNumber: number): number {
    const delay =
      this.retryStrategy.initialDelayMs *
      Math.pow(this.retryStrategy.backoffMultiplier, attemptNumber - 1);

    return Math.min(delay, this.retryStrategy.maxDelayMs);
  }

  /**
   * Get error message from error object
   */
  private getErrorMessage(error: Error | GenerationError): string {
    if ('message' in error) {
      return error.message;
    }
    return 'Unknown error';
  }

  /**
   * Save partial results for recovery
   * Requirements: 9.5
   */
  savePartialResults(
    projectId: string,
    completedStages: string[],
    generatedShots: GeneratedShot[],
    masterCoherenceSheetUrl?: string,
    lastError?: GenerationError
  ): void {
    this.partialResults = {
      projectId,
      timestamp: Date.now(),
      completedStages,
      generatedShots,
      masterCoherenceSheetUrl,
      lastError,
    };

    // Persist to localStorage for recovery
    try {
      localStorage.setItem(
        `generation_partial_${projectId}`,
        JSON.stringify(this.partialResults)
      );
    } catch (err) {
      console.error('Failed to save partial results:', err);
    }
  }

  /**
   * Load partial results for recovery
   * Requirements: 9.5
   */
  loadPartialResults(projectId: string): PartialResults | null {
    try {
      const stored = localStorage.getItem(`generation_partial_${projectId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.error('Failed to load partial results:', err);
    }
    return null;
  }

  /**
   * Clear partial results after successful completion
   */
  clearPartialResults(projectId: string): void {
    this.partialResults = null;
    try {
      localStorage.removeItem(`generation_partial_${projectId}`);
    } catch (err) {
      console.error('Failed to clear partial results:', err);
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(): ErrorContext[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get error severity
   */
  getErrorSeverity(error: Error | GenerationError): ErrorSeverity {
    const errorMessage = this.getErrorMessage(error).toLowerCase();

    for (const [keyword, severity] of Object.entries(ERROR_SEVERITY_MAP)) {
      if (errorMessage.includes(keyword)) {
        return severity;
      }
    }

    return 'medium';
  }

  /**
   * Format error for display
   * Requirements: 3.7
   */
  formatErrorForDisplay(error: Error | GenerationError): string {
    const message = this.getErrorMessage(error);
    const severity = this.getErrorSeverity(error);

    const severityEmoji: Record<ErrorSeverity, string> = {
      low: '⚠️',
      medium: '⚠️',
      high: '❌',
      critical: '🚨',
    };

    return `${severityEmoji[severity]} ${message}`;
  }

  /**
   * Update retry strategy
   */
  updateRetryStrategy(strategy: Partial<RetryStrategy>): void {
    this.retryStrategy = { ...this.retryStrategy, ...strategy };
  }

  /**
   * Reset handler state
   */
  reset(): void {
    this.errorHistory = [];
    this.partialResults = null;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create descriptive error message for generation errors
 * Requirements: 3.7
 */
export function createGenerationError(
  stage: string,
  message: string,
  shotId?: string,
  retryable: boolean = true
): GenerationError {
  return {
    stage: stage as any,
    message,
    shotId,
    retryable,
  };
}

/**
 * Wrap async function with retry logic
 * Requirements: 3.7
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy = DEFAULT_RETRY_STRATEGY,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Check if error is retryable
      const errorMessage = lastError.message.toLowerCase();
      const isRetryable = strategy.retryableErrors.some(retryableError =>
        errorMessage.includes(retryableError)
      );

      if (!isRetryable || attempt >= strategy.maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay =
        strategy.initialDelayMs *
        Math.pow(strategy.backoffMultiplier, attempt - 1);
      const actualDelay = Math.min(delay, strategy.maxDelayMs);

      // Notify about retry
      onRetry?.(attempt, lastError);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, actualDelay));
    }
  }

  throw lastError || new Error('Failed after retries');
}

/**
 * Check if error indicates a temporary failure
 */
export function isTemporaryError(error: Error): boolean {
  const temporaryKeywords = [
    'timeout',
    'network',
    'connection',
    'temporary',
    'unavailable',
    'rate limit',
    'too many requests',
  ];

  const errorMessage = error.message.toLowerCase();
  return temporaryKeywords.some(keyword => errorMessage.includes(keyword));
}

/**
 * Check if error indicates a permanent failure
 */
export function isPermanentError(error: Error): boolean {
  const permanentKeywords = [
    'not found',
    'invalid',
    'unauthorized',
    'forbidden',
    'authentication',
    'authorization',
  ];

  const errorMessage = error.message.toLowerCase();
  return permanentKeywords.some(keyword => errorMessage.includes(keyword));
}

/**
 * Get user-friendly error message
 * Requirements: 3.7
 */
export function getUserFriendlyErrorMessage(error: Error | GenerationError): string {
  const message = 'message' in error ? error.message : String(error);

  // Map technical errors to user-friendly messages
  const errorMappings: Record<string, string> = {
    'network error': 'Unable to connect to the server. Please check your internet connection.',
    'timeout': 'The operation took too long to complete. Please try again.',
    'not found': 'The requested resource was not found.',
    'unauthorized': 'You are not authorized to perform this action.',
    'rate limit': 'Too many requests. Please wait a moment and try again.',
    'service unavailable': 'The service is temporarily unavailable. Please try again later.',
    'invalid input': 'The provided input is invalid. Please check and try again.',
  };

  for (const [keyword, friendlyMessage] of Object.entries(errorMappings)) {
    if (message.toLowerCase().includes(keyword)) {
      return friendlyMessage;
    }
  }

  return message;
}

/**
 * Create error report for debugging
 */
export function createErrorReport(
  error: Error | GenerationError,
  context: Partial<ErrorContext>
): string {
  const timestamp = new Date().toISOString();
  const message = 'message' in error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : 'No stack trace';

  return `
Error Report
============
Timestamp: ${timestamp}
Stage: ${context.stage || 'unknown'}
Shot ID: ${context.shotId || 'N/A'}
Attempt: ${context.attemptNumber || 1}

Message:
${message}

Stack Trace:
${stack}

Additional Info:
${JSON.stringify(context.additionalInfo || {}, null, 2)}
  `.trim();
}

/**
 * Log error to console with formatting
 */
export function logError(
  error: Error | GenerationError,
  context: Partial<ErrorContext>
): void {
  const report = createErrorReport(error, context);
  console.error(report);
}

/**
 * Default error handler instance
 */
export const defaultErrorHandler = new GenerationErrorHandler();

