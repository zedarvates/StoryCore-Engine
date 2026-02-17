/**
 * CameraAngleEditorErrorBoundary Component
 * 
 * Error boundary specifically for the Camera Angle Editor feature.
 * Catches rendering errors and provides a user-friendly recovery UI.
 * 
 * Usage:
 * ```tsx
 * <CameraAngleEditorErrorBoundary onRetry={() => resetEditor()}>
 *   <CameraAngleEditor {...props} />
 * </CameraAngleEditorErrorBoundary>
 * ```
 */

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw, RotateCcw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface CameraAngleEditorErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Callback when retry is clicked */
  onRetry?: () => void;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Additional CSS classes */
  className?: string;
  /** Show detailed error info (development mode) */
  showDetails?: boolean;
}

interface CameraAngleEditorErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// ============================================================================
// Component
// ============================================================================

export class CameraAngleEditorErrorBoundary extends Component<
  CameraAngleEditorErrorBoundaryProps,
  CameraAngleEditorErrorBoundaryState
> {
  constructor(props: CameraAngleEditorErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<CameraAngleEditorErrorBoundaryState> {
    return { hasError: true, error };
  }

  /**
   * Handle the error and notify parent
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console for debugging
    console.error('CameraAngleEditor error caught by boundary:', error, errorInfo);

    // Store error info for display
    this.setState({ errorInfo });

    // Notify parent component
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset error state and retry
   */
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  /**
   * Reload the page
   */
  handleReload = (): void => {
    window.location.reload();
  };

  /**
   * Copy error details to clipboard
   */
  handleCopyError = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const errorDetails = `
Camera Angle Editor Error
=========================
Message: ${error.message}
Time: ${new Date().toISOString()}

Stack Trace:
${error.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, className, showDetails = process.env.NODE_ENV === 'development' } = this.props;

    if (hasError) {
      return (
        <div
          className={cn(
            'flex flex-col items-center justify-center p-8 min-h-[400px] bg-gray-50 dark:bg-gray-900 rounded-lg',
            className
          )}
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle
            className="h-16 w-16 text-red-500 mb-4"
            aria-hidden="true"
          />

          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">
            Camera Angle Editor Error
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-4 text-center max-w-md">
            An unexpected error occurred while rendering the camera angle editor.
            Please try again or reload the page if the problem persists.
          </p>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-md max-w-2xl w-full border border-red-200 dark:border-red-800">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {error.message}
              </p>
            </div>
          )}

          {/* Detailed error info (development mode) */}
          {showDetails && error && (
            <details className="mb-4 max-w-2xl w-full">
              <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-2">
                <Bug className="w-4 h-4" />
                View technical details
              </summary>
              <div className="mt-2 space-y-2">
                {error.stack && (
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-40">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Stack Trace:
                    </p>
                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-40">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Component Stack:
                    </p>
                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap justify-center">
            <Button
              onClick={this.handleRetry}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>

            <Button onClick={this.handleReload} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>

            {showDetails && error && (
              <Button
                onClick={this.handleCopyError}
                variant="ghost"
                className="text-gray-500"
              >
                <Bug className="mr-2 h-4 w-4" />
                Copy Error Details
              </Button>
            )}
          </div>

          {/* Help text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
            If this error persists, please contact support with the error details above.
          </p>
        </div>
      );
    }

    return children;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default CameraAngleEditorErrorBoundary;
