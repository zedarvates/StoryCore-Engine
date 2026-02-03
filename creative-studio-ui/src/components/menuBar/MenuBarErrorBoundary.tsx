/**
 * MenuBarErrorBoundary Component
 * 
 * Error boundary component that catches errors in the MenuBar component tree
 * and displays user-friendly error messages while logging errors for debugging.
 * 
 * Requirements: 15.2 (Error Handling and User Feedback)
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { notificationService } from '../../services/menuBar/NotificationService';

interface MenuBarErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Optional fallback UI to display when an error occurs */
  fallback?: ReactNode;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface MenuBarErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error */
  error: Error | null;
  /** Error information from React */
  errorInfo: ErrorInfo | null;
}

/**
 * MenuBarErrorBoundary
 * 
 * Catches errors in the MenuBar component tree and provides graceful error handling.
 * 
 * Features:
 * - Catches component errors and prevents app crash
 * - Displays user-friendly error messages via notification service
 * - Logs errors to console for debugging
 * - Provides optional fallback UI
 * - Allows custom error handling via callback
 * 
 * Usage:
 * ```tsx
 * <MenuBarErrorBoundary>
 *   <MenuBar {...props} />
 * </MenuBarErrorBoundary>
 * ```
 */
export class MenuBarErrorBoundary extends Component<
  MenuBarErrorBoundaryProps,
  MenuBarErrorBoundaryState
> {
  constructor(props: MenuBarErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when an error is caught
   * 
   * This lifecycle method is called after an error has been thrown by a descendant component.
   * It receives the error that was thrown as a parameter and should return a value to update state.
   */
  static getDerivedStateFromError(error: Error): Partial<MenuBarErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details and show user notification
   * 
   * This lifecycle method is called after an error has been thrown by a descendant component.
   * It receives two parameters:
   * - error: The error that was thrown
   * - errorInfo: An object with a componentStack key containing information about which component threw the error
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console for debugging (Requirement 15.6)
    console.error('MenuBar Error Boundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Show user-friendly error notification (Requirement 15.2)
    notificationService.show({
      type: 'error',
      message: 'An unexpected error occurred in the menu bar. Please reload the page.',
      action: {
        label: 'Reload',
        callback: () => {
          window.location.reload();
        },
      },
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset error boundary state
   * 
   * Allows the error boundary to be reset programmatically,
   * useful for retry mechanisms or after user action.
   */
  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Render fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI - minimal menu bar placeholder
      return (
        <div
          className="flex items-center justify-between px-4 py-2 bg-card border-b border-border"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm font-medium text-destructive">
              Menu bar error
            </span>
          </div>
          <button
            onClick={this.resetErrorBoundary}
            className="px-3 py-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            aria-label="Retry loading menu bar"
          >
            Retry
          </button>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default MenuBarErrorBoundary;
