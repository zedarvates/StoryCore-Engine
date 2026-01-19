import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// Production Wizard Error Boundary Component
// ============================================================================

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  onReturnHome?: () => void;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ProductionWizardErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error for debugging
    console.error('Production Wizard Error:', error);
    console.error('Error Info:', errorInfo);

    // TODO: Send error to logging service
    // logError('ProductionWizard', { error: error.message, stack: error.stack, componentStack: errorInfo.componentStack });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  handleReturnHome = () => {
    if (this.props.onReturnHome) {
      this.props.onReturnHome();
    }
  };

  render() {
    if (this.state.hasError) {
      const {
        fallbackTitle = 'Something went wrong',
        fallbackMessage = 'An unexpected error occurred in the wizard. Please try again or return to the main screen.',
      } = this.props;

      return (
        <div className="flex flex-col items-center justify-center min-h-96 p-8 text-center">
          <div className="mb-6">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" aria-hidden="true" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4" id="error-title">
            {fallbackTitle}
          </h2>

          <p className="text-gray-600 mb-8 max-w-md" id="error-description">
            {fallbackMessage}
          </p>

          {/* Error Details (in development) */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-8 text-left bg-gray-100 p-4 rounded-lg max-w-2xl w-full">
              <summary className="cursor-pointer font-medium text-gray-800 mb-2">
                Error Details (Development Only)
              </summary>
              <pre className="text-sm text-red-700 whitespace-pre-wrap break-words">
                {this.state.error.message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}

          <div className="flex gap-4">
            <Button
              onClick={this.handleRetry}
              className="gap-2"
              aria-describedby="error-description"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try Again
            </Button>

            <Button
              variant="outline"
              onClick={this.handleReturnHome}
              className="gap-2"
              aria-describedby="error-description"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Return Home
            </Button>
          </div>

          {/* Screen Reader Only Error Announcement */}
          <div className="sr-only" role="alert" aria-live="assertive">
            An error has occurred in the wizard. {fallbackMessage}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}