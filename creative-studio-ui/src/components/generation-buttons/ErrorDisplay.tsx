/**
 * ErrorDisplay Component
 * 
 * Displays categorized errors with user-friendly messages,
 * troubleshooting steps, and recovery actions.
 * 
 * Requirements: 8.5
 */

import React from 'react';
import { AlertCircle, RefreshCw, Settings, X } from 'lucide-react';
import { formatErrorForDisplay, type CategorizedError } from '../../utils/errorHandling';

export interface ErrorDisplayProps {
  error: CategorizedError | null;
  onRetry?: () => void;
  onAdjustParameters?: () => void;
  onOpenSettings?: () => void;
  onDismiss: () => void;
  className?: string;
}

/**
 * ErrorDisplay component for showing categorized errors
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onAdjustParameters,
  onOpenSettings,
  onDismiss,
  className = '',
}) => {
  if (!error) {
    return null;
  }

  const formatted = formatErrorForDisplay(error);

  const handleAction = (action: string) => {
    switch (action) {
      case 'retry':
        onRetry?.();
        break;
      case 'adjust_parameters':
        onAdjustParameters?.();
        break;
      case 'open_settings':
        onOpenSettings?.();
        break;
      case 'cancel':
        onDismiss();
        break;
    }
  };

  const getSeverityColor = () => {
    switch (error.severity) {
      case 'low':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'medium':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'high':
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <div
      className={`rounded-lg border-2 p-4 ${getSeverityColor()} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <h3 className="font-semibold text-lg">{formatted.title}</h3>
        </div>
        <button
          onClick={onDismiss}
          className="text-current opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss error"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error Message */}
      <p className="mb-3 text-sm">{formatted.message}</p>

      {/* Troubleshooting Steps */}
      {formatted.details && (
        <div className="mb-4">
          <p className="font-medium text-sm mb-2">Troubleshooting steps:</p>
          <ul className="text-sm space-y-1 pl-5 list-disc">
            {error.troubleshootingSteps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {formatted.actions.map((action) => {
          const isCancel = action.action === 'cancel';
          const isPrimary = action.action === 'retry';

          return (
            <button
              key={action.action}
              onClick={() => handleAction(action.action)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                flex items-center gap-2
                ${
                  isPrimary
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : isCancel
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }
              `}
              aria-label={action.label}
            >
              {action.action === 'retry' && <RefreshCw className="w-4 h-4" />}
              {action.action === 'open_settings' && <Settings className="w-4 h-4" />}
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Technical Details (Collapsible) */}
      {error.technicalDetails && (
        <details className="mt-4">
          <summary className="text-sm font-medium cursor-pointer hover:underline">
            Technical details
          </summary>
          <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-x-auto">
            {error.technicalDetails}
          </pre>
        </details>
      )}
    </div>
  );
};

export default ErrorDisplay;
