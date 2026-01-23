/**
 * Notification System
 * 
 * Provides user feedback for operations throughout the application
 * Requirements: 2.9, 2.10, 12.5
 */

import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface NotificationOptions {
  title: string;
  description?: string;
  type?: NotificationType;
  duration?: number;
}

/**
 * Hook for showing notifications
 */
export function useNotifications() {
  const { toast } = useToast();

  const showNotification = ({
    title,
    description,
    type = 'info',
    duration,
  }: NotificationOptions) => {
    const variant = type === 'error' ? 'destructive' : 'default';

    toast({
      title,
      description,
      variant,
      duration,
    });
  };

  const showSuccess = (title: string, description?: string) => {
    showNotification({ title, description, type: 'success' });
  };

  const showError = (title: string, description?: string) => {
    showNotification({ title, description, type: 'error' });
  };

  const showWarning = (title: string, description?: string) => {
    showNotification({ title, description, type: 'warning' });
  };

  const showInfo = (title: string, description?: string) => {
    showNotification({ title, description, type: 'info' });
  };

  const showLoading = (title: string, description?: string) => {
    showNotification({ title, description, type: 'loading', duration: Infinity });
  };

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
  };
}

/**
 * Notification icon component
 */
export function NotificationIcon({ type }: { type: NotificationType }) {
  const iconClasses = 'w-5 h-5';

  switch (type) {
    case 'success':
      return <CheckCircle2 className={`${iconClasses} text-green-500`} />;
    case 'error':
      return <XCircle className={`${iconClasses} text-red-500`} />;
    case 'warning':
      return <AlertCircle className={`${iconClasses} text-yellow-500`} />;
    case 'loading':
      return <Loader2 className={`${iconClasses} text-primary animate-spin`} />;
    case 'info':
    default:
      return <Info className={`${iconClasses} text-blue-500`} />;
  }
}

/**
 * Inline notification banner
 */
export function NotificationBanner({
  type,
  title,
  description,
  action,
  onDismiss,
}: {
  type: NotificationType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}) {
  const bgColors = {
    success: 'bg-green-500/10 border-green-500/20',
    error: 'bg-red-500/10 border-red-500/20',
    warning: 'bg-yellow-500/10 border-yellow-500/20',
    info: 'bg-blue-500/10 border-blue-500/20',
    loading: 'bg-primary/10 border-primary/20',
  };

  const textColors = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400',
    loading: 'text-primary',
  };

  return (
    <div className={`p-4 rounded-lg border ${bgColors[type]} flex items-start gap-3`}>
      <NotificationIcon type={type} />
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-semibold ${textColors[type]}`}>{title}</h4>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className={`text-sm font-medium mt-2 hover:underline ${textColors[type]}`}
          >
            {action.label}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Dismiss notification"
        >
          <XCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Pre-configured notification messages for common operations
 */
export const NotificationMessages = {
  // Wizard operations
  wizardLaunched: (wizardName: string) => ({
    title: 'Wizard Launched',
    description: `Starting ${wizardName}`,
    type: 'info' as NotificationType,
  }),

  wizardCompleted: (wizardName: string) => ({
    title: 'Wizard Completed',
    description: `${wizardName} finished successfully`,
    type: 'success' as NotificationType,
  }),

  wizardFailed: (wizardName: string, error: string) => ({
    title: 'Wizard Failed',
    description: `${wizardName} failed: ${error}`,
    type: 'error' as NotificationType,
  }),

  // Asset operations
  assetsImporting: (count: number) => ({
    title: 'Importing Assets',
    description: `Importing ${count} asset${count !== 1 ? 's' : ''}...`,
    type: 'loading' as NotificationType,
  }),

  assetsImported: (successCount: number, failCount: number) => ({
    title: 'Import Complete',
    description: `${successCount} asset${successCount !== 1 ? 's' : ''} imported successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
    type: failCount > 0 ? ('warning' as NotificationType) : ('success' as NotificationType),
  }),

  assetImportFailed: (error: string) => ({
    title: 'Import Failed',
    description: error,
    type: 'error' as NotificationType,
  }),

  // Shot operations
  shotCreated: (shotTitle: string) => ({
    title: 'Shot Created',
    description: `Created shot: ${shotTitle}`,
    type: 'success' as NotificationType,
  }),

  shotUpdated: (shotTitle: string) => ({
    title: 'Shot Updated',
    description: `Updated shot: ${shotTitle}`,
    type: 'success' as NotificationType,
  }),

  shotDeleted: (shotTitle: string) => ({
    title: 'Shot Deleted',
    description: `Deleted shot: ${shotTitle}`,
    type: 'success' as NotificationType,
  }),

  shotOperationFailed: (operation: string, error: string) => ({
    title: `Failed to ${operation} Shot`,
    description: error,
    type: 'error' as NotificationType,
  }),

  // Project operations
  projectLoaded: (projectName: string) => ({
    title: 'Project Loaded',
    description: `Loaded project: ${projectName}`,
    type: 'success' as NotificationType,
  }),

  projectSaved: () => ({
    title: 'Project Saved',
    description: 'All changes have been saved',
    type: 'success' as NotificationType,
  }),

  projectOperationFailed: (operation: string, error: string) => ({
    title: `Failed to ${operation} Project`,
    description: error,
    type: 'error' as NotificationType,
  }),

  // Connection operations
  serviceConnected: (serviceName: string) => ({
    title: 'Service Connected',
    description: `${serviceName} is now available`,
    type: 'success' as NotificationType,
  }),

  serviceDisconnected: (serviceName: string) => ({
    title: 'Service Unavailable',
    description: `Cannot connect to ${serviceName}. Some features may be disabled.`,
    type: 'warning' as NotificationType,
  }),

  // Generic operations
  operationInProgress: (operation: string) => ({
    title: operation,
    description: 'Please wait...',
    type: 'loading' as NotificationType,
  }),

  operationCompleted: (operation: string) => ({
    title: 'Completed',
    description: `${operation} completed successfully`,
    type: 'success' as NotificationType,
  }),

  operationFailed: (operation: string, error: string) => ({
    title: 'Operation Failed',
    description: `${operation} failed: ${error}`,
    type: 'error' as NotificationType,
  }),
};
