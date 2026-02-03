/**
 * Error Boundary Component
 * 
 * Catches React errors and integrates with the global error handler
 * to automatically open the Feedback Panel with error context.
 * 
 * Requirements: 2.3
 * Phase 2: Advanced Diagnostics
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { globalErrorHandler } from '@/utils/globalErrorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * 
 * Requirements: 2.3
 * 
 * Catches errors in React component tree and reports them to the
 * global error handler, which opens the Feedback Panel automatically.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * Update state when an error is caught
   * 
   * @param error Error object
   * @returns Updated state
   */
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Handle the error by reporting it to the global error handler
   * 
   * Requirements: 2.3
   * 
   * @param error Error object
   * @param errorInfo Error info with component stack
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Report to global error handler
    globalErrorHandler.handleReactError(error, errorInfo);

    // Log to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  /**
   * Reset error state (can be called from parent)
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Show fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="max-w-md p-8 bg-white rounded-lg shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Something went wrong
              </h2>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              An unexpected error occurred in the application. The Feedback Panel
              has been opened automatically to help you report this issue.
            </p>

            {this.state.error && (
              <details className="mb-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                  Error details
                </summary>
                <pre className="mt-2 p-3 text-xs bg-gray-100 rounded overflow-auto max-h-40">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Reload Application
              </button>
              <button
                onClick={this.resetError}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
