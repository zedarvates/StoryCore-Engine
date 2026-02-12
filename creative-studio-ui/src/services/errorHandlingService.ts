/**
 * Error Handling Service
 * 
 * Provides comprehensive error handling with retry strategies,
 * error recovery workflows, and user-friendly error messages.
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ErrorCategory = 'network' | 'validation' | 'backend' | 'timeout' | 'unknown';

export interface AppError {
  id: string;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: Date;
  context?: Record<string, unknown>;
  originalError?: Error;
  recoverable: boolean;
  retryable: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: ErrorCategory[];
}

export interface ErrorRecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['network', 'timeout'],
};

/**
 * Error Handling Service
 */
export class ErrorHandlingService {
  private errorLog: AppError[] = [];
  private maxLogSize: number = 100;
  private retryConfig: RetryConfig;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Create an AppError from a raw error
   */
  createError(
    error: Error | string,
    category: ErrorCategory = 'unknown',
    context?: Record<string, unknown>
  ): AppError {
    const originalError = typeof error === 'string' ? new Error(error) : error;
    const message = originalError.message;

    const appError: AppError = {
      id: this.generateErrorId(),
      message,
      userMessage: this.getUserFriendlyMessage(message, category),
      severity: this.determineSeverity(category),
      category,
      timestamp: new Date(),
      context,
      originalError,
      recoverable: this.isRecoverable(category),
      retryable: this.isRetryable(category),
    };

    this.logError(appError);
    return appError;
  }

  /**
   * Execute a function with retry logic
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryConfig> = {}
  ): Promise<T> {
    const config = { ...this.retryConfig, ...options };
    let lastError: Error | null = null;
    let delay = config.initialDelay;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const appError = this.createError(lastError, this.categorizeError(lastError));

        // Don't retry if not retryable or last attempt
        if (!appError.retryable || attempt === config.maxAttempts) {
          throw appError;
        }

        // Wait before retry with exponential backoff
        await this.sleep(Math.min(delay, config.maxDelay));
        delay *= config.backoffMultiplier;
      }
    }

    throw this.createError(lastError || new Error('Unknown error'), 'unknown');
  }

  /**
   * Execute a function with timeout
   */
  async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage: string = 'Operation timed out'
  ): Promise<T> {
    return Promise.race([
      fn(),
      this.sleep(timeoutMs).then(() => {
        throw this.createError(timeoutMessage, 'timeout');
      }),
    ]);
  }

  /**
   * Execute a function with both retry and timeout
   */
  async withRetryAndTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    retryOptions: Partial<RetryConfig> = {}
  ): Promise<T> {
    return this.withRetry(
      () => this.withTimeout(fn, timeoutMs),
      retryOptions
    );
  }

  /**
   * Get recovery actions for an error
   */
  getRecoveryActions(error: AppError): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    if (error.retryable) {
      actions.push({
        label: 'Retry',
        action: () => {}, // Will be provided by caller
        primary: true,
      });
    }

    switch (error.category) {
      case 'network':
        actions.push({
          label: 'Check Connection',
          action: () => {
            window.open('https://www.google.com', '_blank');
          },
        });
        break;

      case 'validation':
        actions.push({
          label: 'Review Input',
          action: () => {}, // Will be provided by caller
        });
        break;

      case 'backend':
        actions.push({
          label: 'Contact Support',
          action: () => {}, // Will be provided by caller
        });
        break;
    }

    actions.push({
      label: 'Dismiss',
      action: () => {}, // Will be provided by caller
    });

    return actions;
  }

  /**
   * Get error log
   */
  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errorLog.filter((error) => error.severity === severity);
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): AppError[] {
    return this.errorLog.filter((error) => error.category === category);
  }

  /**
   * Private: Log error
   */
  private logError(error: AppError): void {
    this.errorLog.unshift(error);

    // Trim log if too large
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // Log to console based on severity
    switch (error.severity) {
      case 'critical':
      case 'error':
        console.error('[Error]', error.message, error);
        break;
      case 'warning':
        console.warn('[Warning]', error.message, error);
        break;
      case 'info':
        console.info('[Info]', error.message, error);
        break;
    }
  }

  /**
   * Private: Generate unique error ID
   */
  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Private: Get user-friendly error message
   */
  private getUserFriendlyMessage(message: string, category: ErrorCategory): string {
    // Check for specific error patterns
    if (message.includes('fetch') || message.includes('network')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }

    if (message.includes('timeout')) {
      return 'The operation took too long to complete. Please try again.';
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return 'The provided data is invalid. Please check your input and try again.';
    }

    if (message.includes('not found') || message.includes('404')) {
      return 'The requested resource was not found.';
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return 'You are not authorized to perform this action.';
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return 'Access to this resource is forbidden.';
    }

    if (message.includes('server error') || message.includes('500')) {
      return 'A server error occurred. Please try again later.';
    }

    // Category-based fallbacks
    switch (category) {
      case 'network':
        return 'A network error occurred. Please check your connection and try again.';
      case 'validation':
        return 'The provided data is invalid. Please review and correct your input.';
      case 'backend':
        return 'A server error occurred. Please try again later.';
      case 'timeout':
        return 'The operation timed out. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Private: Determine error severity
   */
  private determineSeverity(category: ErrorCategory): ErrorSeverity {
    switch (category) {
      case 'network':
      case 'timeout':
        return 'warning';
      case 'validation':
        return 'info';
      case 'backend':
        return 'error';
      default:
        return 'error';
    }
  }

  /**
   * Private: Check if error is recoverable
   */
  private isRecoverable(category: ErrorCategory): boolean {
    return ['network', 'timeout', 'validation'].includes(category);
  }

  /**
   * Private: Check if error is retryable
   */
  private isRetryable(category: ErrorCategory): boolean {
    return this.retryConfig.retryableErrors.includes(category);
  }

  /**
   * Private: Categorize error from error object
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    if (message.includes('fetch') || message.includes('network')) {
      return 'network';
    }

    if (message.includes('timeout')) {
      return 'timeout';
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }

    if (message.includes('server') || message.includes('backend')) {
      return 'backend';
    }

    return 'unknown';
  }

  /**
   * Private: Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton instance
 */
let errorHandlingServiceInstance: ErrorHandlingService | null = null;

export function getErrorHandlingService(): ErrorHandlingService {
  if (!errorHandlingServiceInstance) {
    errorHandlingServiceInstance = new ErrorHandlingService();
  }
  return errorHandlingServiceInstance;
}

/**
 * Create a new error handling service instance
 */
export function createErrorHandlingService(
  config?: Partial<RetryConfig>
): ErrorHandlingService {
  return new ErrorHandlingService(config);
}

