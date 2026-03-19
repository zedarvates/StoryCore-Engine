/**
 * Global Error Handler
 * 
 * Captures uncaught exceptions and React errors, automatically opening
 * the Feedback Panel with pre-populated error context.
 * 
 * Requirements: 2.3
 * Phase 2: Advanced Diagnostics
 */

import type { FeedbackInitialContext } from '@/components/feedback/types';

// ============================================================================
// Error Codes Documentation
// ============================================================================

/**
 * Error codes for different types of errors
 * These codes help identify the source and severity of errors
 */
export enum ErrorCode {
  // JavaScript Errors (1000-1999)
  JS_RUNTIME_ERROR = 'JS-1001',
  JS_TYPE_ERROR = 'JS-1002',
  JS_REFERENCE_ERROR = 'JS-1003',
  JS_SYNTAX_ERROR = 'JS-1004',
  
  // React Errors (2000-2999)
  REACT_COMPONENT_ERROR = 'REACT-2001',
  REACT_LIFECYCLE_ERROR = 'REACT-2002',
  REACT_HOOK_ERROR = 'REACT-2003',
  
  // Promise/Async Errors (3000-3999)
  PROMISE_UNHANDLED_REJECTION = 'ASYNC-3001',
  PROMISE_TIMEOUT = 'ASYNC-3002',
  
  // Network Errors (4000-4999)
  NETWORK_REQUEST_FAILED = 'NET-4001',
  NETWORK_TIMEOUT = 'NET-4002',
  
  // Unknown Errors (9000-9999)
  UNKNOWN_ERROR = 'UNKNOWN-9001',
}

/**
 * User-friendly error messages in French
 */
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  [ErrorCode.JS_RUNTIME_ERROR]: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
  [ErrorCode.JS_TYPE_ERROR]: 'Erreur de type de données. Veuillez vérifier vos entrées.',
  [ErrorCode.JS_REFERENCE_ERROR]: 'Erreur de référence. Veuillez rafraîchir la page.',
  [ErrorCode.JS_SYNTAX_ERROR]: 'Erreur de syntaxe. Veuillez contacter le support.',
  [ErrorCode.REACT_COMPONENT_ERROR]: 'Un composant a rencontré une erreur. Veuillez rafraîchir la page.',
  [ErrorCode.REACT_LIFECYCLE_ERROR]: 'Erreur lors du chargement d\'un composant.',
  [ErrorCode.REACT_HOOK_ERROR]: 'Erreur dans un hook React. Veuillez rafraîchir la page.',
  [ErrorCode.PROMISE_UNHANDLED_REJECTION]: 'Une opération a échoué. Veuillez réessayer.',
  [ErrorCode.PROMISE_TIMEOUT]: 'L\'opération a pris trop de temps. Veuillez réessayer.',
  [ErrorCode.NETWORK_REQUEST_FAILED]: 'Erreur de connexion. Vérifiez votre connexion internet.',
  [ErrorCode.NETWORK_TIMEOUT]: 'La connexion a expiré. Veuillez réessayer.',
  [ErrorCode.UNKNOWN_ERROR]: 'Une erreur inattendue s\'est produite.',
};

/**
 * Retry configuration for different error types
 */
interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

/**
 * Error context captured from uncaught exceptions
 */
export interface ErrorContext {
  message: string;
  stackTrace: string;
  activeModule: string;
  timestamp: string;
  errorType: 'javascript' | 'react' | 'promise';
  componentStack?: string;
}

/**
 * Callback function type for opening the feedback panel
 */
export type OpenFeedbackPanelCallback = (context: FeedbackInitialContext) => void;

/**
 * Toast notification callback type
 */
export type ShowToastCallback = (message: string, type: 'error' | 'warning' | 'info') => void;

/**
 * Global error handler instance
 */
class GlobalErrorHandler {
  private openFeedbackPanel: OpenFeedbackPanelCallback | null = null;
  private showToast: ShowToastCallback | null = null;
  private isInitialized = false;
  private errorHistory: ErrorContext[] = [];
  private maxHistorySize = 10;
  private retryAttempts: Map<string, number> = new Map();

  /**
   * Initialize the global error handler
   * 
   * Requirements: 2.3
   * 
   * @param openFeedbackPanelCallback Callback to open the feedback panel
   * @param showToastCallback Optional callback to show toast notifications
   */
  initialize(openFeedbackPanelCallback: OpenFeedbackPanelCallback, showToastCallback?: ShowToastCallback): void {
    if (this.isInitialized) {
      console.warn('GlobalErrorHandler already initialized');
      return;
    }

    this.openFeedbackPanel = openFeedbackPanelCallback;
    this.showToast = showToastCallback || null;
    this.registerHandlers();
    this.isInitialized = true;

    console.log('GlobalErrorHandler initialized');
  }

  /**
   * Register error handlers for different error types
   * 
   * Requirements: 2.3
   */
  private registerHandlers(): void {
    // Handle uncaught JavaScript errors
    window.addEventListener('error', this.handleWindowError);

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);

    console.log('Global error handlers registered');
  }

  /**
   * Unregister error handlers (for cleanup)
   */
  cleanup(): void {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    this.isInitialized = false;
    this.openFeedbackPanel = null;

    console.log('GlobalErrorHandler cleaned up');
  }

  /**
   * Handle window error events
   * 
   * Requirements: 2.3
   * 
   * @param event Error event
   */
  private handleWindowError = (event: ErrorEvent): void => {
    console.error('Uncaught error:', event.error);

    const errorContext: ErrorContext = {
      message: event.message || 'Unknown error',
      stackTrace: event.error?.stack || 'No stack trace available',
      activeModule: this.detectActiveModule(),
      timestamp: new Date().toISOString(),
      errorType: 'javascript',
    };

    this.captureError(errorContext);
  };

  /**
   * Handle unhandled promise rejections
   * 
   * Requirements: 2.3
   * 
   * @param event Promise rejection event
   */
  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    // Prevent default browser/Node logging as we're handling it
    event.preventDefault();

    console.error('Unhandled promise rejection:', event.reason);

    const errorContext: ErrorContext = {
      message: event.reason?.message || String(event.reason) || 'Unhandled promise rejection',
      stackTrace: event.reason?.stack || 'No stack trace available',
      activeModule: this.detectActiveModule(),
      timestamp: new Date().toISOString(),
      errorType: 'promise',
    };

    this.captureError(errorContext);
  };

  /**
   * Handle React errors (called from Error Boundary)
   * 
   * Requirements: 2.3
   * 
   * @param error Error object
   * @param errorInfo Error info with component stack
   */
  handleReactError(error: Error, errorInfo: { componentStack: string }): void {
    console.error('React error:', error, errorInfo);

    const errorContext: ErrorContext = {
      message: error.message || 'React component error',
      stackTrace: error.stack || 'No stack trace available',
      activeModule: this.detectActiveModule(),
      timestamp: new Date().toISOString(),
      errorType: 'react',
      componentStack: errorInfo.componentStack,
    };

    this.captureError(errorContext);
  }

  /**
   * Capture error context and open feedback panel
   * 
   * Requirements: 2.3
   * 
   * @param errorContext Error context to capture
   */
  private captureError(errorContext: ErrorContext): void {
    // Add to error history
    this.errorHistory.push(errorContext);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Determine error code
    const errorCode = this.getErrorCode(errorContext);
    
    // Get user-friendly message
    const userMessage = USER_FRIENDLY_MESSAGES[errorCode] || USER_FRIENDLY_MESSAGES[ErrorCode.UNKNOWN_ERROR];

    // Show toast notification if callback is available
    if (this.showToast) {
      try {
        this.showToast(userMessage, 'error');
      } catch (toastError) {
        console.error('Failed to show toast notification:', toastError);
      }
    }

    // Format error message for feedback panel
    const errorMessage = this.formatErrorMessage(errorContext);
    const stackTrace = this.formatStackTrace(errorContext);

    // Open feedback panel with pre-populated context (with null check)
    if (this.openFeedbackPanel) {
      try {
        this.openFeedbackPanel({
          errorMessage,
          stackTrace,
          activeModule: errorContext.activeModule,
        });
      } catch (callbackError) {
        // Fallback if feedback panel callback fails
        console.error('Failed to open feedback panel:', callbackError);
        console.error('Original error:', errorContext);
      }
    } else {
      console.error('Feedback panel callback not set. Error:', errorMessage);
      console.error('Stack trace:', stackTrace);
    }
  }

  /**
   * Get error code based on error context
   * 
   * @param errorContext Error context
   * @returns Error code
   */
  private getErrorCode(errorContext: ErrorContext): ErrorCode {
    const { errorType, message } = errorContext;
    
    if (errorType === 'javascript') {
      if (message.includes('TypeError')) return ErrorCode.JS_TYPE_ERROR;
      if (message.includes('ReferenceError')) return ErrorCode.JS_REFERENCE_ERROR;
      if (message.includes('SyntaxError')) return ErrorCode.JS_SYNTAX_ERROR;
      return ErrorCode.JS_RUNTIME_ERROR;
    }
    
    if (errorType === 'react') {
      if (message.includes('hook')) return ErrorCode.REACT_HOOK_ERROR;
      if (message.includes('lifecycle')) return ErrorCode.REACT_LIFECYCLE_ERROR;
      return ErrorCode.REACT_COMPONENT_ERROR;
    }
    
    if (errorType === 'promise') {
      if (message.includes('timeout')) return ErrorCode.PROMISE_TIMEOUT;
      return ErrorCode.PROMISE_UNHANDLED_REJECTION;
    }
    
    return ErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Execute an operation with retry logic
   * 
   * @param operation The async operation to execute
   * @param operationId Unique identifier for the operation (for tracking retry attempts)
   * @param config Optional retry configuration
   * @returns Promise that resolves with the operation result
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    const { maxAttempts, delayMs, backoffMultiplier } = config;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await operation();
        // Reset retry count on success
        this.retryAttempts.delete(operationId);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Store retry attempt
        this.retryAttempts.set(operationId, attempt);
        
        // If this is the last attempt, throw the error
        if (attempt === maxAttempts) {
          this.retryAttempts.delete(operationId);
          throw lastError;
        }
        
        // Wait before retrying with exponential backoff
        const delay = delayMs * Math.pow(backoffMultiplier, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw lastError || new Error('Retry failed');
  }

  /**
   * Get current retry count for an operation
   * 
   * @param operationId Unique identifier for the operation
   * @returns Current retry attempt count
   */
  getRetryCount(operationId: string): number {
    return this.retryAttempts.get(operationId) || 0;
  }

  /**
   * Reset retry count for an operation
   * 
   * @param operationId Unique identifier for the operation
   */
  resetRetryCount(operationId: string): void {
    this.retryAttempts.delete(operationId);
  }

  /**
   * Format error message for display
   * 
   * @param errorContext Error context
   * @returns Formatted error message
   */
  private formatErrorMessage(errorContext: ErrorContext): string {
    const { errorType, message, timestamp } = errorContext;
    
    let prefix = '';
    switch (errorType) {
      case 'javascript':
        prefix = 'Uncaught JavaScript Error';
        break;
      case 'react':
        prefix = 'React Component Error';
        break;
      case 'promise':
        prefix = 'Unhandled Promise Rejection';
        break;
    }

    return `${prefix} (${new Date(timestamp).toLocaleTimeString()})\n\n${message}`;
  }

  /**
   * Format stack trace for display
   * 
   * @param errorContext Error context
   * @returns Formatted stack trace
   */
  private formatStackTrace(errorContext: ErrorContext): string {
    const { stackTrace, componentStack } = errorContext;
    
    let formatted = `Stack Trace:\n${stackTrace}`;
    
    if (componentStack) {
      formatted += `\n\nComponent Stack:${componentStack}`;
    }
    
    return formatted;
  }

  /**
   * Detect the currently active module based on URL or context
   * 
   * @returns Active module name
   */
  private detectActiveModule(): string {
    // Try to detect from URL path
    const path = window.location?.pathname;
    
    if (!path) {
      return 'creative-studio-ui';
    }
    
    if (path.includes('/editor')) {
      return 'editor';
    } else if (path.includes('/dashboard')) {
      return 'dashboard';
    } else if (path.includes('/wizard')) {
      return 'wizard';
    } else if (path.includes('/settings')) {
      return 'settings';
    }
    
    // Default to 'creative-studio-ui'
    return 'creative-studio-ui';
  }

  /**
   * Get error history
   * 
   * @returns Array of captured error contexts
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
}

// Export singleton instance
export const globalErrorHandler = new GlobalErrorHandler();
