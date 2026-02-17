/**
 * Retry Logic Module
 * 
 * Provides retry functionality for failed operations with exponential backoff,
 * request parameter preservation, and retry state management.
 * 
 * Requirements: 13.2, 13.4
 */

import { WizardError } from './types';
import { getLogger } from './logger';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

/**
 * Retry state for tracking retry attempts
 */
export interface RetryState<T = any> {
  operationId: string;
  operation: string;
  parameters: T;
  attemptCount: number;
  lastError?: WizardError;
  lastAttemptTime?: Date;
  nextRetryTime?: Date;
  canRetry: boolean;
}

/**
 * Retry result
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: WizardError;
  attemptCount: number;
  totalDuration: number;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Retry manager class
 * Manages retry state and execution for failed operations
 * 
 * Requirements: 13.2, 13.4
 */
export class RetryManager {
  private logger = getLogger();
  private retryStates: Map<string, RetryState> = new Map();
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Execute operation with retry logic
   * 
   * @param operationId - Unique identifier for the operation
   * @param operation - Function to execute
   * @param parameters - Parameters to pass to the operation
   * @param config - Optional retry configuration override
   * @returns Retry result with success status and result/error
   * 
   * Requirements: 13.2, 13.4
   */
  async executeWithRetry<T, P = any>(
    operationId: string,
    operation: (params: P) => Promise<T>,
    parameters: P,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const retryConfig = { ...this.config, ...config };
    const startTime = Date.now();

    this.logger.info('retry', 'Starting operation with retry', {
      operationId,
      maxAttempts: retryConfig.maxAttempts,
    });

    // Initialize or get existing retry state
    let retryState = this.retryStates.get(operationId);
    if (!retryState) {
      retryState = {
        operationId,
        operation: operationId,
        parameters,
        attemptCount: 0,
        canRetry: true,
      };
      this.retryStates.set(operationId, retryState);
    } else {
      // Update parameters for retry
      retryState.parameters = parameters;
    }

    let lastError: WizardError | undefined;
    let delayMs = retryConfig.initialDelayMs;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      retryState.attemptCount = attempt;
      retryState.lastAttemptTime = new Date();

      this.logger.debug('retry', `Attempt ${attempt}/${retryConfig.maxAttempts}`, {
        operationId,
        attempt,
      });

      try {
        const result = await operation(parameters);

        const totalDuration = Date.now() - startTime;

        this.logger.info('retry', 'Operation succeeded', {
          operationId,
          attempt,
          totalDuration,
        });

        // Clear retry state on success
        this.retryStates.delete(operationId);

        return {
          success: true,
          result,
          attemptCount: attempt,
          totalDuration,
        };
      } catch (error) {
        const wizardError = error instanceof WizardError
          ? error
          : new WizardError(
            error instanceof Error ? error.message : 'Unknown error',
            'unknown',
            true,
            true,
            { originalError: error }
          );

        lastError = wizardError;
        retryState.lastError = wizardError;

        this.logger.warn('retry', `Attempt ${attempt} failed`, {
          operationId,
          attempt,
          error: wizardError.message,
          category: wizardError.category,
          retryable: wizardError.retryable,
        });

        // Check if error is retryable
        if (!wizardError.retryable) {
          this.logger.info('retry', 'Error is not retryable, stopping', {
            operationId,
            category: wizardError.category,
          });

          retryState.canRetry = false;
          break;
        }

        // Don't delay after last attempt
        if (attempt < retryConfig.maxAttempts) {
          const nextRetryTime = new Date(Date.now() + delayMs);
          retryState.nextRetryTime = nextRetryTime;

          this.logger.debug('retry', `Waiting ${delayMs}ms before retry`, {
            operationId,
            attempt,
            delayMs,
            nextRetryTime,
          });

          await this.delay(delayMs);

          // Exponential backoff with max delay cap
          delayMs = Math.min(
            delayMs * retryConfig.backoffMultiplier,
            retryConfig.maxDelayMs
          );
        }
      }
    }

    const totalDuration = Date.now() - startTime;

    this.logger.error('retry', 'Operation failed after all retry attempts', lastError!, {
      operationId,
      attempts: retryConfig.maxAttempts,
      totalDuration,
    });

    retryState.canRetry = false;

    return {
      success: false,
      error: lastError,
      attemptCount: retryConfig.maxAttempts,
      totalDuration,
    };
  }

  /**
   * Get retry state for an operation
   * 
   * @param operationId - Operation identifier
   * @returns Retry state or undefined if not found
   */
  getRetryState(operationId: string): RetryState | undefined {
    return this.retryStates.get(operationId);
  }

  /**
   * Check if an operation can be retried
   * 
   * @param operationId - Operation identifier
   * @returns True if operation can be retried
   */
  canRetry(operationId: string): boolean {
    const state = this.retryStates.get(operationId);
    return state?.canRetry ?? false;
  }

  /**
   * Get preserved parameters for retry
   * 
   * @param operationId - Operation identifier
   * @returns Preserved parameters or undefined
   * 
   * Requirements: 13.4
   */
  getPreservedParameters<T = any>(operationId: string): T | undefined {
    const state = this.retryStates.get(operationId);
    return state?.parameters as T | undefined;
  }

  /**
   * Clear retry state for an operation
   * 
   * @param operationId - Operation identifier
   */
  clearRetryState(operationId: string): void {
    this.retryStates.delete(operationId);
    this.logger.debug('retry', 'Retry state cleared', { operationId });
  }

  /**
   * Clear all retry states
   */
  clearAllRetryStates(): void {
    this.retryStates.clear();
    this.logger.debug('retry', 'All retry states cleared');
  }

  /**
   * Get all retry states
   * 
   * @returns Array of all retry states
   */
  getAllRetryStates(): RetryState[] {
    return Array.from(this.retryStates.values());
  }

  /**
   * Update retry configuration
   * 
   * @param config - Partial retry configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('retry', 'Retry configuration updated', this.config as any);
  }

  /**
   * Get current retry configuration
   * 
   * @returns Current retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton retry manager instance
 */
let retryManagerInstance: RetryManager | null = null;

/**
 * Get the singleton retry manager instance
 */
export function getRetryManager(): RetryManager {
  if (!retryManagerInstance) {
    retryManagerInstance = new RetryManager();
  }
  return retryManagerInstance;
}

/**
 * Create a new retry manager instance
 */
export function createRetryManager(config?: Partial<RetryConfig>): RetryManager {
  return new RetryManager(config);
}

/**
 * Set the singleton retry manager instance
 */
export function setRetryManager(manager: RetryManager): void {
  retryManagerInstance = manager;
}

/**
 * Execute operation with retry using singleton manager
 * 
 * @param operationId - Unique identifier for the operation
 * @param operation - Function to execute
 * @param parameters - Parameters to pass to the operation
 * @param config - Optional retry configuration override
 * @returns Retry result
 * 
 * Requirements: 13.2, 13.4
 */
export async function executeWithRetry<T, P = any>(
  operationId: string,
  operation: (params: P) => Promise<T>,
  parameters: P,
  config?: Partial<RetryConfig>
): Promise<RetryResult<T>> {
  const manager = getRetryManager();
  return manager.executeWithRetry(operationId, operation, parameters, config);
}

/**
 * Get preserved parameters for retry using singleton manager
 * 
 * @param operationId - Operation identifier
 * @returns Preserved parameters or undefined
 * 
 * Requirements: 13.4
 */
export function getPreservedParameters<T = any>(operationId: string): T | undefined {
  const manager = getRetryManager();
  return manager.getPreservedParameters<T>(operationId);
}

/**
 * Check if operation can be retried using singleton manager
 * 
 * @param operationId - Operation identifier
 * @returns True if operation can be retried
 */
export function canRetry(operationId: string): boolean {
  const manager = getRetryManager();
  return manager.canRetry(operationId);
}

/**
 * Clear retry state using singleton manager
 * 
 * @param operationId - Operation identifier
 */
export function clearRetryState(operationId: string): void {
  const manager = getRetryManager();
  manager.clearRetryState(operationId);
}
