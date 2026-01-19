/**
 * WizardErrorBoundary Component
 * 
 * Specialized error boundary for wizard components with data preservation
 * and recovery options.
 * 
 * Requirements: 8.1, 8.2, 8.5
 */

import React, { Component, type ReactNode } from 'react';
import { getErrorHandlingService, type AppError } from '../../services/errorHandlingService';
import { exportWizardState } from '../../utils/wizardStorage';
import { AlertCircle, Download, RefreshCw, X } from 'lucide-react';

export interface WizardErrorBoundaryProps {
  /**
   * Child components
   */
  children: ReactNode;

  /**
   * Wizard type for data export
   */
  wizardType?: 'world' | 'character';

  /**
   * Callback when error is caught
   */
  onError?: (error: AppError) => void;

  /**
   * Callback when user requests reset
   */
  onReset?: () => void;

  /**
   * Custom error message
   */
  errorMessage?: string;
}

interface WizardErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
  errorInfo: React.ErrorInfo | null;
}

export class WizardErrorBoundary extends Component<
  WizardErrorBoundaryProps,
  WizardErrorBoundaryState
> {
  constructor(props: WizardErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<WizardErrorBoundaryState> {
    const errorService = getErrorHandlingService();
    const appError = errorService.createError(error, 'unknown', {
      source: 'WizardErrorBoundary',
    });

    return {
      hasError: true,
      error: appError,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const errorService = getErrorHandlingService();
    const appError = errorService.createError(error, 'unknown', {
      source: 'WizardErrorBoundary',
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      errorInfo,
    });

    // Log error details
    console.error('Wizard Error:', {
      error: appError,
      componentStack: errorInfo.componentStack,
    });

    if (this.props.onError) {
      this.props.onError(appError);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleExportData = (): void => {
    if (!this.props.wizardType) {
      console.warn('Cannot export data: wizardType not specified');
      return;
    }

    const exportedData = exportWizardState(this.props.wizardType);
    
    if (!exportedData) {
      console.warn('No wizard data to export');
      return;
    }

    // Create download link
    const blob = new Blob([exportedData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.props.wizardType}-wizard-backup-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-[400px] flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg border border-red-200">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">
                    Wizard Error
                  </h2>
                  <p className="text-sm text-gray-500">
                    Error ID: {this.state.error.id}
                  </p>
                </div>
                <button
                  onClick={this.handleReset}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded"
                  aria-label="Close error"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Error Message */}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-gray-700 mb-2">
                  {this.props.errorMessage || this.state.error.userMessage}
                </p>
                <p className="text-sm text-gray-600">
                  Your wizard progress has been preserved. You can export your data
                  for recovery or try again.
                </p>
              </div>

              {/* Technical Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Error Message:</p>
                        <pre className="text-xs text-gray-600 overflow-auto">
                          {this.state.error.message}
                        </pre>
                      </div>
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700">Component Stack:</p>
                          <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </details>
              )}
            </div>

            {/* Actions */}
            <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                {this.props.wizardType && (
                  <button
                    onClick={this.handleExportData}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export Data
                  </button>
                )}
              </div>
              <button
                onClick={this.handleReload}
                className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
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
