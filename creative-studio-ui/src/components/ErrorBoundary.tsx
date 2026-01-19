/**
 * ErrorBoundary Component
 * 
 * React error boundary for catching and handling component errors.
 */

import React, { Component, type ReactNode } from 'react';
import { getErrorHandlingService, type AppError } from '../services/errorHandlingService';

export interface ErrorBoundaryProps {
  /**
   * Child components
   */
  children: ReactNode;

  /**
   * Fallback UI when error occurs
   */
  fallback?: (error: AppError, reset: () => void) => ReactNode;

  /**
   * Callback when error is caught
   */
  onError?: (error: AppError) => void;

  /**
   * Custom error message
   */
  errorMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const errorService = getErrorHandlingService();
    const appError = errorService.createError(error, 'unknown', {
      source: 'ErrorBoundary',
    });

    return {
      hasError: true,
      error: appError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const errorService = getErrorHandlingService();
    const appError = errorService.createError(error, 'unknown', {
      source: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
    });

    if (this.props.onError) {
      this.props.onError(appError);
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Something went wrong
                </h2>
                <p className="text-sm text-gray-500">Error ID: {this.state.error.id}</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                {this.props.errorMessage || this.state.error.userMessage}
              </p>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-2">
                  <summary className="text-sm text-gray-500 cursor-pointer">
                    Technical Details
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={this.reset}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
