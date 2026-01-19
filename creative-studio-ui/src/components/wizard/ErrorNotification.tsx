/**
 * ErrorNotification Component
 * 
 * Toast-style error notifications for non-blocking errors.
 * 
 * Requirements: 8.1, 8.5
 */

import React, { useEffect, useState } from 'react';
import { X, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import type { AppError } from '../../services/errorHandlingService';

export interface ErrorNotificationProps {
  /**
   * Error to display
   */
  error: AppError;

  /**
   * Auto-dismiss timeout (ms)
   */
  autoDismiss?: number;

  /**
   * Callback when dismissed
   */
  onDismiss?: () => void;

  /**
   * Position
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function ErrorNotification({
  error,
  autoDismiss = 5000,
  onDismiss,
  position = 'top-right',
}: ErrorNotificationProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (autoDismiss > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismiss);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) {
        onDismiss();
      }
    }, 300); // Match animation duration
  };

  if (!isVisible) {
    return <></>;
  }

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
        return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
  };

  // Get border color based on severity
  const getBorderColor = () => {
    switch (error.severity) {
      case 'critical':
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-yellow-500';
      case 'info':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-500';
    }
  };

  // Get position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-right':
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <div
      className={`
        fixed ${getPositionClasses()} z-50 max-w-sm w-full
        transition-all duration-300 ease-in-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div
        className={`
          bg-white rounded-lg shadow-lg border-l-4 ${getBorderColor()}
          overflow-hidden
        `}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 mb-1">
                {error.severity === 'critical' && 'Critical Error'}
                {error.severity === 'error' && 'Error'}
                {error.severity === 'warning' && 'Warning'}
                {error.severity === 'info' && 'Information'}
              </p>
              <p className="text-sm text-gray-600">{error.userMessage}</p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar for auto-dismiss */}
        {autoDismiss > 0 && (
          <div className="h-1 bg-gray-100">
            <div
              className={`h-full ${
                error.severity === 'error' || error.severity === 'critical'
                  ? 'bg-red-500'
                  : error.severity === 'warning'
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{
                animation: `shrink ${autoDismiss}ms linear`,
              }}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * ErrorNotificationContainer Component
 * 
 * Container for managing multiple error notifications.
 */

export interface ErrorNotificationContainerProps {
  /**
   * Errors to display
   */
  errors: AppError[];

  /**
   * Callback when error is dismissed
   */
  onDismiss?: (errorId: string) => void;

  /**
   * Auto-dismiss timeout (ms)
   */
  autoDismiss?: number;

  /**
   * Position
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

  /**
   * Maximum number of notifications to show
   */
  maxNotifications?: number;
}

export function ErrorNotificationContainer({
  errors,
  onDismiss,
  autoDismiss = 5000,
  position = 'top-right',
  maxNotifications = 3,
}: ErrorNotificationContainerProps): JSX.Element {
  // Show only the most recent errors
  const visibleErrors = errors.slice(0, maxNotifications);

  return (
    <>
      {visibleErrors.map((error, index) => (
        <div
          key={error.id}
          style={{
            transform: `translateY(${index * 80}px)`,
          }}
        >
          <ErrorNotification
            error={error}
            autoDismiss={autoDismiss}
            onDismiss={() => onDismiss?.(error.id)}
            position={position}
          />
        </div>
      ))}
    </>
  );
}
