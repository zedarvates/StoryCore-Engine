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
 * Global error handler instance
 */
class GlobalErrorHandler {
  private openFeedbackPanel: OpenFeedbackPanelCallback | null = null;
  private isInitialized = false;
  private errorHistory: ErrorContext[] = [];
  private maxHistorySize = 10;

  /**
   * Initialize the global error handler
   * 
   * Requirements: 2.3
   * 
   * @param openFeedbackPanelCallback Callback to open the feedback panel
   */
  initialize(openFeedbackPanelCallback: OpenFeedbackPanelCallback): void {
    if (this.isInitialized) {
      console.warn('GlobalErrorHandler already initialized');
      return;
    }

    this.openFeedbackPanel = openFeedbackPanelCallback;
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
