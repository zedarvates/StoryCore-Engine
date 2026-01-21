/**
 * Grid Editor Error Boundary
 * 
 * React Error Boundary component that catches and handles errors in the Grid Editor.
 * Features:
 * - Catches component errors and prevents full app crash
 * - Saves emergency backup of grid state
 * - Displays user-friendly error UI with recovery options
 * - Logs detailed error information for debugging
 * 
 * Requirements: All error handling requirements
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useGridStore } from '../../stores/gridEditorStore';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';

// ============================================================================
// Types
// ============================================================================

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  backupSaved: boolean;
}

// ============================================================================
// Error Boundary Component
// ============================================================================

/**
 * Error Boundary for Grid Editor
 * Catches errors in child components and provides recovery UI
 */
export class GridEditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      backupSaved: false,
    };
  }

  /**
   * Update state when error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Handle error and save emergency backup
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('Grid Editor Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);

    // Save emergency backup
    const backupSaved = this.saveEmergencyBackup();

    // Update state with error info
    this.setState({
      errorInfo,
      backupSaved,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service (if configured)
    this.reportErrorToService(error, errorInfo);
  }

  /**
   * Save emergency backup of current grid state
   */
  private saveEmergencyBackup(): boolean {
    try {
      // Get current grid state
      const state = useGridStore.getState();
      const config = state.config;

      // Create backup object with timestamp
      const backup = {
        timestamp: new Date().toISOString(),
        config,
        selectedPanelIds: state.selectedPanelIds,
        activeTool: state.activeTool,
      };

      // Save to localStorage
      const backupKey = `grid-editor-emergency-backup-${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));

      // Also save as latest backup
      localStorage.setItem('grid-editor-emergency-backup-latest', JSON.stringify(backup));

      ;
      return true;
    } catch (e) {
      console.error('Failed to save emergency backup:', e);
      return false;
    }
  }

  /**
   * Report error to monitoring service
   */
  private reportErrorToService(error: Error, errorInfo: ErrorInfo) {
    // TODO: Integrate with error monitoring service (e.g., Sentry, LogRocket)
    // For now, just log to console
    const errorReport = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    ;

    // In production, send to monitoring service:
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorReport),
    // });
  }

  /**
   * Reset error boundary and attempt recovery
   */
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      backupSaved: false,
    });
  };

  /**
   * Reload page to fully reset application
   */
  private handleReload = () => {
    window.location.reload();
  };

  /**
   * Restore from emergency backup
   */
  private handleRestoreBackup = () => {
    try {
      const backupJson = localStorage.getItem('grid-editor-emergency-backup-latest');
      if (!backupJson) {
        alert('No backup found');
        return;
      }

      const backup = JSON.parse(backupJson);
      const state = useGridStore.getState();
      
      // Restore configuration
      state.loadConfiguration(backup.config);

      // Reset error state
      this.handleReset();

      alert('Backup restored successfully');
    } catch (e) {
      console.error('Failed to restore backup:', e);
      alert('Failed to restore backup. Please reload the page.');
    }
  };

  /**
   * Download error report for debugging
   */
  private handleDownloadReport = () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const report = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      errorInfo: {
        componentStack: errorInfo?.componentStack,
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grid-editor-error-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Render error UI
   */
  render() {
    const { hasError, error, backupSaved } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.handleReset);
      }

      // Default error UI
      return (
        <div className="grid-editor-error-boundary">
          <div className="error-container">
            <Alert variant="destructive" className="error-alert">
              <div className="error-header">
                <h2 className="error-title">Grid Editor Error</h2>
                <p className="error-subtitle">
                  Something went wrong in the grid editor
                </p>
              </div>

              <div className="error-details">
                <p className="error-message">
                  <strong>Error:</strong> {error.message}
                </p>

                {backupSaved && (
                  <p className="backup-status success">
                    ✓ Emergency backup saved successfully
                  </p>
                )}

                {!backupSaved && (
                  <p className="backup-status warning">
                    ⚠ Could not save emergency backup
                  </p>
                )}
              </div>

              <div className="error-actions">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  className="action-button"
                >
                  Try Again
                </Button>

                {backupSaved && (
                  <Button
                    onClick={this.handleRestoreBackup}
                    variant="outline"
                    className="action-button"
                  >
                    Restore Backup
                  </Button>
                )}

                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="action-button"
                >
                  Reload Page
                </Button>

                <Button
                  onClick={this.handleDownloadReport}
                  variant="ghost"
                  className="action-button"
                >
                  Download Error Report
                </Button>
              </div>

              <details className="error-stack">
                <summary>Technical Details</summary>
                <pre className="stack-trace">{error.stack}</pre>
              </details>
            </Alert>
          </div>

          <style>{`
            .grid-editor-error-boundary {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 400px;
              padding: 2rem;
              background: var(--background);
            }

            .error-container {
              max-width: 600px;
              width: 100%;
            }

            .error-alert {
              padding: 1.5rem;
            }

            .error-header {
              margin-bottom: 1rem;
            }

            .error-title {
              font-size: 1.5rem;
              font-weight: 600;
              margin: 0 0 0.5rem 0;
              color: var(--destructive);
            }

            .error-subtitle {
              font-size: 0.875rem;
              color: var(--muted-foreground);
              margin: 0;
            }

            .error-details {
              margin: 1rem 0;
              padding: 1rem;
              background: var(--muted);
              border-radius: 0.375rem;
            }

            .error-message {
              margin: 0 0 0.5rem 0;
              font-size: 0.875rem;
              word-break: break-word;
            }

            .backup-status {
              margin: 0.5rem 0 0 0;
              font-size: 0.875rem;
              font-weight: 500;
            }

            .backup-status.success {
              color: var(--success, #22c55e);
            }

            .backup-status.warning {
              color: var(--warning, #f59e0b);
            }

            .error-actions {
              display: flex;
              flex-wrap: wrap;
              gap: 0.5rem;
              margin: 1rem 0;
            }

            .action-button {
              flex: 1;
              min-width: 120px;
            }

            .error-stack {
              margin-top: 1rem;
              padding: 0.5rem;
              background: var(--muted);
              border-radius: 0.375rem;
              cursor: pointer;
            }

            .error-stack summary {
              font-size: 0.875rem;
              font-weight: 500;
              user-select: none;
            }

            .stack-trace {
              margin: 0.5rem 0 0 0;
              padding: 0.5rem;
              background: var(--background);
              border-radius: 0.25rem;
              font-size: 0.75rem;
              overflow-x: auto;
              white-space: pre-wrap;
              word-break: break-all;
            }

            @media (max-width: 640px) {
              .error-actions {
                flex-direction: column;
              }

              .action-button {
                width: 100%;
              }
            }
          `}</style>
        </div>
      );
    }

    return children;
  }
}

// ============================================================================
// Functional Wrapper with Hooks
// ============================================================================

/**
 * Functional wrapper for Error Boundary with hooks support
 */
export const GridEditorErrorBoundaryWrapper: React.FC<{
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}> = ({ children, onError }) => {
  return (
    <GridEditorErrorBoundary onError={onError}>
      {children}
    </GridEditorErrorBoundary>
  );
};

export default GridEditorErrorBoundary;
