/**
 * ErrorNotification Component
 * 
 * Displays error notifications with recovery actions.
 */

import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import type { AppError, ErrorRecoveryAction } from '../services/errorHandlingService';

export interface ErrorNotificationProps {
  /**
   * Error to display
   */
  error: AppError;

  /**
   * Recovery actions
   */
  recoveryActions?: ErrorRecoveryAction[];

  /**
   * Callback when notification is dismissed
   */
  onDismiss?: () => void;

  /**
   * Show technical details
   * @default false
   */
  showDetails?: boolean;

  /**
   * Position of notification
   * @default 'top-right'
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center';

  /**
   * Custom className
   */
  className?: string;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  recoveryActions = [],
  onDismiss,
  showDetails = false,
  position = 'top-right',
  className = '',
}) => {
  const getSeverityColor = (severity: AppError['severity']): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 border-red-600';
      case 'error':
        return 'bg-red-400 border-red-500';
      case 'warning':
        return 'bg-yellow-400 border-yellow-500';
      case 'info':
        return 'bg-blue-400 border-blue-500';
      default:
        return 'bg-gray-400 border-gray-500';
    }
  };

  const getSeverityIcon = (severity: AppError['severity']): React.ReactNode => {
    const iconProps = { className: 'w-6 h-6 flex-shrink-0' };
    switch (severity) {
      case 'critical':
      case 'error':
        return <XCircle {...iconProps} aria-label="Error" />;
      case 'warning':
        return <AlertTriangle {...iconProps} aria-label="Warning" />;
      case 'info':
        return <Info {...iconProps} aria-label="Info" />;
      default:
        return <CheckCircle {...iconProps} aria-label="Status" />;
    }
  };

  const getPositionClasses = (): string => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'top-center':
        return 'top-4 left-1/2 -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div
      className={`fixed ${getPositionClasses()} z-50 max-w-md w-full animate-slide-in ${className}`}
      role="alert"
    >
      <div className="bg-white rounded-lg shadow-lg border-l-4 overflow-hidden">
        {/* Header */}
        <div className={`p-4 ${getSeverityColor(error.severity)} bg-opacity-10`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{getSeverityIcon(error.severity)}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 mb-1">
                {error.severity === 'critical' ? 'Critical Error' : 
                 error.severity === 'error' ? 'Error' :
                 error.severity === 'warning' ? 'Warning' : 'Information'}
              </h3>
              <p className="text-sm text-gray-700">{error.userMessage}</p>
              {showDetails && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    Technical Details
                  </summary>
                  <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                    {error.message}
                  </pre>
                </details>
              )}
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                aria-label="Dismiss"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Recovery Actions */}
        {recoveryActions.length > 0 && (
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex flex-wrap gap-2">
              {recoveryActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`px-3 py-1 text-sm rounded ${
                    action.primary
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="px-4 py-2 bg-gray-100 border-t text-xs text-gray-500">
          <div className="flex justify-between">
            <span>ID: {error.id.slice(0, 12)}</span>
            <span>{error.timestamp.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ErrorNotificationContainer Component
 * 
 * Container for displaying multiple error notifications.
 */
export interface ErrorNotificationContainerProps {
  /**
   * Errors to display
   */
  errors: AppError[];

  /**
   * Get recovery actions for an error
   */
  getRecoveryActions?: (error: AppError) => ErrorRecoveryAction[];

  /**
   * Callback when notification is dismissed
   */
  onDismiss?: (errorId: string) => void;

  /**
   * Maximum number of notifications to show
   * @default 3
   */
  maxNotifications?: number;

  /**
   * Show technical details
   * @default false
   */
  showDetails?: boolean;

  /**
   * Position of notifications
   * @default 'top-right'
   */
  position?: ErrorNotificationProps['position'];
}

export const ErrorNotificationContainer: React.FC<ErrorNotificationContainerProps> = ({
  errors,
  getRecoveryActions,
  onDismiss,
  maxNotifications = 3,
  showDetails = false,
  position = 'top-right',
}) => {
  // Show only the most recent errors
  const visibleErrors = errors.slice(0, maxNotifications);

  return (
    <>
      {visibleErrors.map((error, index) => (
        <ErrorNotification
          key={error.id}
          error={error}
          recoveryActions={getRecoveryActions ? getRecoveryActions(error) : []}
          onDismiss={onDismiss ? () => onDismiss(error.id) : undefined}
          showDetails={showDetails}
          position={position}
          className={`mt-${index * 4}`}
        />
      ))}
    </>
  );
};
