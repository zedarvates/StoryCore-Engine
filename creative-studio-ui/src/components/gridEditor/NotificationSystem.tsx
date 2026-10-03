/**
 * Grid Editor Notification System
 * 
 * Comprehensive notification system for the Grid Editor with:
 * - Success notifications for completed operations
 * - Error notifications with recovery options
 * - Warning notifications for validation issues
 * - Toast/snackbar UI component
 * 
 * Requirements: All error handling requirements
 */

import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/use-toast';

// ============================================================================
// Types
// ============================================================================

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface RecoveryOption {
  label: string;
  action: () => void;
  isPrimary?: boolean;
}

export interface NotificationOptions {
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  recoveryOptions?: RecoveryOption[];
  technicalDetails?: string;
  dismissible?: boolean;
}

export interface Notification extends NotificationOptions {
  id: string;
  timestamp: number;
}

// ============================================================================
// Notification Store
// ============================================================================

class NotificationStore {
  private notifications: Notification[] = [];
  private listeners = new Set<(notifications: Notification[]) => void>();

  /**
   * Add a notification
   */
  add(options: NotificationOptions): string {
    const notification: Notification = {
      ...options,
      id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      dismissible: options.dismissible !== false,
    };

    this.notifications.push(notification);
    this.notify();

    // Auto-dismiss if duration is set
    if (options.duration && options.duration > 0) {
      setTimeout(() => {
        this.remove(notification.id);
      }, options.duration);
    }

    return notification.id;
  }

  /**
   * Remove a notification
   */
  remove(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notify();
  }

  /**
   * Clear all notifications
   */
  clear() {
    this.notifications = [];
    this.notify();
  }

  /**
   * Get all notifications
   */
  getAll(): Notification[] {
    return [...this.notifications];
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notify() {
    this.listeners.forEach((listener) => listener(this.getAll()));
  }
}

// Global notification store instance
const notificationStore = new NotificationStore();

// ============================================================================
// Notification API
// ============================================================================

/**
 * Show a success notification
 */
export function showSuccess(title: string, message: string, duration = 3000): string {
  return notificationStore.add({
    type: 'success',
    title,
    message,
    duration,
  });
}

/**
 * Show an error notification with optional recovery options
 */
export function showError(
  title: string,
  message: string,
  options?: {
    recoveryOptions?: RecoveryOption[];
    technicalDetails?: string;
    duration?: number;
  }
): string {
  return notificationStore.add({
    type: 'error',
    title,
    message,
    duration: options?.duration || 0, // Errors don't auto-dismiss by default
    recoveryOptions: options?.recoveryOptions,
    technicalDetails: options?.technicalDetails,
  });
}

/**
 * Show a warning notification
 */
export function showWarning(title: string, message: string, duration = 5000): string {
  return notificationStore.add({
    type: 'warning',
    title,
    message,
    duration,
  });
}

/**
 * Show an info notification
 */
export function showInfo(title: string, message: string, duration = 4000): string {
  return notificationStore.add({
    type: 'info',
    title,
    message,
    duration,
  });
}

/**
 * Dismiss a notification
 */
export function dismissNotification(id: string) {
  notificationStore.remove(id);
}

/**
 * Clear all notifications
 */
export function clearAllNotifications() {
  notificationStore.clear();
}

// ============================================================================
// Notification Component
// ============================================================================

/**
 * Individual notification toast component
 */
const NotificationToast: React.FC<{
  notification: Notification;
  onDismiss: (id: string) => void;
}> = ({ notification, onDismiss }) => {
  const { type, title, message, recoveryOptions, technicalDetails, dismissible } = notification;

  const [showDetails, setShowDetails] = useState(false);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '';
    }
  };

  const getColorClass = () => {
    switch (type) {
      case 'success':
        return 'notification-success';
      case 'error':
        return 'notification-error';
      case 'warning':
        return 'notification-warning';
      case 'info':
        return 'notification-info';
      default:
        return '';
    }
  };

  return (
    <div className={`notification-toast ${getColorClass()}`}>
      <div className="notification-header">
        <div className="notification-icon">{getIcon()}</div>
        <div className="notification-content">
          <div className="notification-title">{title}</div>
          <div className="notification-message">{message}</div>
        </div>
        {dismissible && (
          <button
            className="notification-close"
            onClick={() => onDismiss(notification.id)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        )}
      </div>

      {recoveryOptions && recoveryOptions.length > 0 && (
        <div className="notification-actions">
          {recoveryOptions.map((option, index) => (
            <button
              key={index}
              className={`notification-action ${option.isPrimary ? 'primary' : 'secondary'}`}
              onClick={() => {
                option.action();
                onDismiss(notification.id);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {technicalDetails && (
        <div className="notification-details">
          <button
            className="notification-details-toggle"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '▼' : '▶'} Technical Details
          </button>
          {showDetails && (
            <pre className="notification-details-content">{technicalDetails}</pre>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Notification container component
 */
export const NotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Subscribe to notification changes
    const unsubscribe = notificationStore.subscribe(setNotifications);
    
    // Initialize with current notifications
    setNotifications(notificationStore.getAll());

    return unsubscribe;
  }, []);

  const handleDismiss = (id: string) => {
    notificationStore.remove(id);
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={handleDismiss}
        />
      ))}

      <style>{`
        .notification-container {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 400px;
          pointer-events: none;
        }

        .notification-toast {
          pointer-events: auto;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 1rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
                      0 2px 4px -1px rgba(0, 0, 0, 0.06);
          animation: slideIn 0.3s ease-out;
          min-width: 300px;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .notification-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .notification-icon {
          flex-shrink: 0;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: bold;
          border-radius: 50%;
        }

        .notification-success .notification-icon {
          background: var(--success-bg, #dcfce7);
          color: var(--success, #22c55e);
        }

        .notification-error .notification-icon {
          background: var(--destructive-bg, #fee2e2);
          color: var(--destructive, #ef4444);
        }

        .notification-warning .notification-icon {
          background: var(--warning-bg, #fef3c7);
          color: var(--warning, #f59e0b);
        }

        .notification-info .notification-icon {
          background: var(--info-bg, #dbeafe);
          color: var(--info, #3b82f6);
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-title {
          font-weight: 600;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
          color: var(--foreground);
        }

        .notification-message {
          font-size: 0.875rem;
          color: var(--muted-foreground);
          line-height: 1.4;
        }

        .notification-close {
          flex-shrink: 0;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 1.5rem;
          line-height: 1;
          color: var(--muted-foreground);
          transition: color 0.2s;
        }

        .notification-close:hover {
          color: var(--foreground);
        }

        .notification-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border);
        }

        .notification-action {
          flex: 1;
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid var(--border);
        }

        .notification-action.primary {
          background: var(--primary);
          color: var(--primary-foreground);
          border-color: var(--primary);
        }

        .notification-action.primary:hover {
          opacity: 0.9;
        }

        .notification-action.secondary {
          background: transparent;
          color: var(--foreground);
        }

        .notification-action.secondary:hover {
          background: var(--muted);
        }

        .notification-details {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--border);
        }

        .notification-details-toggle {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 0.75rem;
          color: var(--muted-foreground);
          padding: 0;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .notification-details-toggle:hover {
          color: var(--foreground);
        }

        .notification-details-content {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: var(--muted);
          border-radius: 0.25rem;
          font-size: 0.75rem;
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }

        @media (max-width: 640px) {
          .notification-container {
            left: 1rem;
            right: 1rem;
            max-width: none;
          }

          .notification-toast {
            min-width: 0;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// Hook for using notifications
// ============================================================================

/**
 * Hook for using the notification system
 */
export function useNotifications() {
  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismiss: dismissNotification,
    clearAll: clearAllNotifications,
  };
}

// ============================================================================
// Predefined Notification Templates
// ============================================================================

/**
 * Show notification for successful operation
 */
export function notifyOperationSuccess(operation: string) {
  return showSuccess('Success', `${operation} completed successfully`);
}

/**
 * Show notification for failed operation
 */
export function notifyOperationError(
  operation: string,
  error: Error,
  recoveryOptions?: RecoveryOption[]
) {
  return showError(
    'Operation Failed',
    `Failed to ${operation.toLowerCase()}`,
    {
      recoveryOptions,
      technicalDetails: error.stack,
    }
  );
}

/**
 * Show notification for validation warning
 */
export function notifyValidationWarning(field: string, issue: string) {
  return showWarning('Validation Warning', `${field}: ${issue}`);
}

/**
 * Show notification for import error
 */
export function notifyImportError(error: Error) {
  return showError(
    'Import Failed',
    'Failed to import grid configuration',
    {
      technicalDetails: error.message,
      recoveryOptions: [
        {
          label: 'Try Again',
          action: () => {
            // Trigger file picker again
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.click();
          },
          isPrimary: true,
        },
      ],
    }
  );
}

/**
 * Show notification for export success
 */
export function notifyExportSuccess(filename: string) {
  return showSuccess('Export Complete', `Configuration saved as ${filename}`);
}

/**
 * Show notification for generation in progress
 */
export function notifyGenerationInProgress(panelCount: number) {
  return showInfo(
    'Generating Images',
    `Generating ${panelCount} panel${panelCount > 1 ? 's' : ''}...`,
    0 // Don't auto-dismiss
  );
}

/**
 * Show notification for generation complete
 */
export function notifyGenerationComplete(successCount: number, failCount: number) {
  if (failCount === 0) {
    return showSuccess(
      'Generation Complete',
      `Successfully generated ${successCount} panel${successCount > 1 ? 's' : ''}`
    );
  } else {
    return showWarning(
      'Generation Partially Complete',
      `Generated ${successCount} panel${successCount > 1 ? 's' : ''}, ${failCount} failed`
    );
  }
}

export default NotificationContainer;
