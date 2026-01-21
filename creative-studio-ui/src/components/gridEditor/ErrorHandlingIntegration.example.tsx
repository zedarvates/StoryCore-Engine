/**
 * Error Handling Integration Example
 * 
 * Demonstrates how to integrate the Error Boundary and Notification System
 * into the Grid Editor application.
 * 
 * Requirements: All error handling requirements
 */

import React from 'react';
import { GridEditorErrorBoundary } from './GridEditorErrorBoundary';
import {
  NotificationContainer,
  useNotifications,
  notifyOperationSuccess,
  notifyOperationError,
  notifyValidationWarning,
  notifyImportError,
  notifyExportSuccess,
  notifyGenerationInProgress,
  notifyGenerationComplete,
} from './NotificationSystem';

// ============================================================================
// Example 1: Basic Error Boundary Usage
// ============================================================================

/**
 * Wrap the entire Grid Editor with Error Boundary
 */
export const GridEditorWithErrorBoundary: React.FC = () => {
  return (
    <GridEditorErrorBoundary
      onError={(error, errorInfo) => {
        // Optional: Send error to monitoring service
        ;
      }}
    >
      {/* Your Grid Editor components here */}
      <div>Grid Editor Content</div>
    </GridEditorErrorBoundary>
  );
};

// ============================================================================
// Example 2: Using Notifications in Components
// ============================================================================

/**
 * Example component using the notification system
 */
export const GridEditorWithNotifications: React.FC = () => {
  const notifications = useNotifications();

  const handleSave = async () => {
    try {
      // Simulate save operation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Show success notification
      notifyOperationSuccess('Save configuration');
    } catch (error) {
      // Show error notification with recovery options
      notifyOperationError('save configuration', error as Error, [
        {
          label: 'Retry',
          action: handleSave,
          isPrimary: true,
        },
        {
          label: 'Cancel',
          action: () => {},
        },
      ]);
    }
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const config = JSON.parse(text);
      
      // Validate configuration
      if (!config.version || !config.panels) {
        throw new Error('Invalid configuration format');
      }

      notifyOperationSuccess('Import configuration');
    } catch (error) {
      notifyImportError(error as Error);
    }
  };

  const handleExport = () => {
    try {
      // Simulate export
      const filename = `grid-config-${Date.now()}.json`;
      notifyExportSuccess(filename);
    } catch (error) {
      notifyOperationError('export configuration', error as Error);
    }
  };

  const handleGenerate = async (panelIds: string[]) => {
    // Show progress notification
    const progressId = notifyGenerationInProgress(panelIds.length);

    try {
      // Simulate generation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // Dismiss progress notification
      notifications.dismiss(progressId);
      
      // Show completion notification
      notifyGenerationComplete(panelIds.length, 0);
    } catch (error) {
      // Dismiss progress notification
      notifications.dismiss(progressId);
      
      // Show error notification
      notifyOperationError('generate images', error as Error, [
        {
          label: 'Retry',
          action: () => handleGenerate(panelIds),
          isPrimary: true,
        },
      ]);
    }
  };

  const handleValidation = (value: number) => {
    if (value <= 0) {
      notifyValidationWarning('Scale value', 'Must be greater than 0');
      return false;
    }
    return true;
  };

  return (
    <div>
      <button onClick={handleSave}>Save</button>
      <button onClick={handleExport}>Export</button>
      <button onClick={() => handleGenerate(['panel-1', 'panel-2'])}>
        Generate
      </button>
      
      {/* Notification container must be rendered */}
      <NotificationContainer />
    </div>
  );
};

// ============================================================================
// Example 3: Complete Integration
// ============================================================================

/**
 * Complete Grid Editor with both Error Boundary and Notifications
 */
export const CompleteGridEditor: React.FC = () => {
  return (
    <GridEditorErrorBoundary>
      <div className="grid-editor-app">
        {/* Your Grid Editor components */}
        <GridEditorWithNotifications />
        
        {/* Notification container at app level */}
        <NotificationContainer />
      </div>
    </GridEditorErrorBoundary>
  );
};

// ============================================================================
// Example 4: Error Handling Patterns
// ============================================================================

/**
 * Common error handling patterns
 */
export const ErrorHandlingPatterns: React.FC = () => {
  const notifications = useNotifications();

  // Pattern 1: Try-Catch with Notification
  const patternTryCatch = async () => {
    try {
      // Risky operation
      throw new Error('Something went wrong');
    } catch (error) {
      notifyOperationError('perform operation', error as Error);
    }
  };

  // Pattern 2: Validation with Warning
  const patternValidation = (value: any) => {
    if (!value) {
      notifyValidationWarning('Input field', 'Value is required');
      return false;
    }
    return true;
  };

  // Pattern 3: Async Operation with Progress
  const patternAsyncProgress = async () => {
    const progressId = notifications.showInfo(
      'Processing',
      'Please wait...',
      0 // Don't auto-dismiss
    );

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      notifications.dismiss(progressId);
      notifications.showSuccess('Complete', 'Operation finished');
    } catch (error) {
      notifications.dismiss(progressId);
      notifyOperationError('process data', error as Error);
    }
  };

  // Pattern 4: Batch Operation with Partial Failure
  const patternBatchOperation = async (items: string[]) => {
    const results = await Promise.allSettled(
      items.map(async (item) => {
        // Process each item
        return item;
      })
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.filter((r) => r.status === 'rejected').length;

    if (failCount === 0) {
      notifications.showSuccess('Batch Complete', `Processed ${successCount} items`);
    } else {
      notifications.showWarning(
        'Batch Partially Complete',
        `Processed ${successCount} items, ${failCount} failed`
      );
    }
  };

  // Pattern 5: Network Error with Retry
  const patternNetworkRetry = async (url: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network error');
        return response;
      } catch (error) {
        if (i === retries - 1) {
          notifyOperationError('fetch data', error as Error, [
            {
              label: 'Retry',
              action: () => patternNetworkRetry(url, retries),
              isPrimary: true,
            },
          ]);
        }
      }
    }
  };

  return (
    <div>
      <h3>Error Handling Patterns</h3>
      <button onClick={patternTryCatch}>Try-Catch Pattern</button>
      <button onClick={() => patternValidation(null)}>Validation Pattern</button>
      <button onClick={patternAsyncProgress}>Async Progress Pattern</button>
      <button onClick={() => patternBatchOperation(['a', 'b', 'c'])}>
        Batch Operation Pattern
      </button>
      <button onClick={() => patternNetworkRetry('/api/data')}>
        Network Retry Pattern
      </button>
    </div>
  );
};

// ============================================================================
// Example 5: Custom Error Boundary Fallback
// ============================================================================

/**
 * Custom error UI fallback
 */
const CustomErrorFallback: React.FC<{
  error: Error;
  reset: () => void;
}> = ({ error, reset }) => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>Oops! Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  );
};

/**
 * Grid Editor with custom error fallback
 */
export const GridEditorWithCustomFallback: React.FC = () => {
  return (
    <GridEditorErrorBoundary
      fallback={(error, reset) => <CustomErrorFallback error={error} reset={reset} />}
    >
      <div>Grid Editor Content</div>
    </GridEditorErrorBoundary>
  );
};

// ============================================================================
// Example 6: Error Monitoring Integration
// ============================================================================

/**
 * Error monitoring service integration
 */
const errorMonitoringService = {
  captureError: (error: Error, context?: any) => {
    // Send to Sentry, LogRocket, etc.
    ;
  },
};

/**
 * Grid Editor with error monitoring
 */
export const GridEditorWithMonitoring: React.FC = () => {
  return (
    <GridEditorErrorBoundary
      onError={(error, errorInfo) => {
        errorMonitoringService.captureError(error, {
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        });
      }}
    >
      <div>Grid Editor Content</div>
      <NotificationContainer />
    </GridEditorErrorBoundary>
  );
};

// ============================================================================
// Usage in Main App
// ============================================================================

/**
 * Example of how to integrate into main application
 */
export const App: React.FC = () => {
  return (
    <div className="app">
      {/* Wrap entire app or just Grid Editor section */}
      <CompleteGridEditor />
    </div>
  );
};

export default CompleteGridEditor;
