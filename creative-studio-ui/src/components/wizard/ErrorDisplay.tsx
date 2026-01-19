/**
 * ErrorDisplay Component
 * 
 * User-friendly error display with recovery actions for wizard errors.
 * 
 * Requirements: 8.1, 8.2, 8.5
 */

import React from 'react';
import { AlertCircle, AlertTriangle, Info, RefreshCw, X } from 'lucide-react';
import type { AppError, ErrorRecoveryAction } from '../../services/errorHandlingService';

export interface ErrorDisplayProps {
  /**
   * Error to display
   */
  error: AppError;

  /**
   * Recovery actions
   */
  recoveryActions?: ErrorRecoveryAction[];

  /**
   * Callback when error is dismissed
   */
  onDismiss?: () => void;

  /**
   * Show technical details
   */
  showTechnicalDetails?: boolean;

  /**
   * Compact mode
   */
  compact?: boolean;
}

export function ErrorDisplay({
  error,
  recoveryActions = [],
  onDismiss,
  showTechnicalDetails = false,
  compact = false,
}: ErrorDisplayProps): JSX.Element {
  // Get icon based on severity
  const getIcon = () => {
    switch (error.severity) {
      case 'critical':
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  // Get background color based on severity
  const getBgColor = () => {
    switch (error.severity) {
      case 'critical':
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Get text color based on severity
  const getTextColor = () => {
    switch (error.severity) {
      case 'critical':
      case 'error':
        return 'text-red-900';
      case 'warning':
        return 'text-yellow-900';
      case 'info':
        return 'text-blue-900';
      default:
        return 'text-gray-900';
    }
  };

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg border ${getBgColor()}`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex-shrink-0">{getIcon()}</div>
        <p className={`flex-1 text-sm ${getTextColor()}`}>{error.userMessage}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 hover:bg-white/50 rounded transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border ${getBgColor()} overflow-hidden`}
      role="alert"
      aria-live="polite"
    >
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${getTextColor()} mb-1`}>
            {error.severity === 'critical' && 'Critical Error'}
            {error.severity === 'error' && 'Error'}
            {error.severity === 'warning' && 'Warning'}
            {error.severity === 'info' && 'Information'}
          </h3>
          <p className={`text-sm ${getTextColor()}`}>{error.userMessage}</p>
          
          {/* Error Category Badge */}
          <div className="mt-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/50">
              {error.category}
            </span>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 hover:bg-white/50 rounded transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Technical Details */}
      {showTechnicalDetails && (
        <details className="px-4 pb-4">
          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
            Technical Details
          </summary>
          <div className="mt-2 p-3 bg-white rounded border border-gray-200">
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-gray-700">Error ID:</p>
                <p className="text-xs text-gray-600 font-mono">{error.id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">Message:</p>
                <pre className="text-xs text-gray-600 overflow-auto">{error.message}</pre>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700">Timestamp:</p>
                <p className="text-xs text-gray-600">
                  {error.timestamp.toLocaleString()}
                </p>
              </div>
              {error.context && Object.keys(error.context).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-700">Context:</p>
                  <pre className="text-xs text-gray-600 overflow-auto">
                    {JSON.stringify(error.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </details>
      )}

      {/* Recovery Actions */}
      {recoveryActions.length > 0 && (
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          {recoveryActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`
                inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium
                transition-colors
                ${
                  action.primary
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {action.label === 'Retry' && <RefreshCw className="w-3.5 h-3.5" />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
