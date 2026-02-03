/**
 * MenuBarErrorBoundary Usage Examples
 * 
 * This file demonstrates how to use the MenuBarErrorBoundary component
 * to wrap the MenuBar and handle errors gracefully.
 */

import React from 'react';
import { MenuBar, MenuBarErrorBoundary } from './index';
import type { MenuBarProps } from './MenuBar';

/**
 * Example 1: Basic Usage
 * 
 * Wrap the MenuBar component with MenuBarErrorBoundary to catch any errors
 * that occur during rendering or in event handlers.
 */
export const BasicUsageExample: React.FC<MenuBarProps> = (props) => {
  return (
    <MenuBarErrorBoundary>
      <MenuBar {...props} />
    </MenuBarErrorBoundary>
  );
};

/**
 * Example 2: Custom Fallback UI
 * 
 * Provide a custom fallback UI to display when an error occurs.
 * This is useful if you want to match your application's design system.
 */
export const CustomFallbackExample: React.FC<MenuBarProps> = (props) => {
  const customFallback = (
    <div className="flex items-center justify-center p-4 bg-destructive/10 border border-destructive rounded">
      <p className="text-destructive font-medium">
        The menu bar encountered an error. Please refresh the page.
      </p>
    </div>
  );

  return (
    <MenuBarErrorBoundary fallback={customFallback}>
      <MenuBar {...props} />
    </MenuBarErrorBoundary>
  );
};

/**
 * Example 3: Custom Error Handler
 * 
 * Provide a custom error handler to perform additional actions when an error occurs,
 * such as logging to an external service or updating application state.
 */
export const CustomErrorHandlerExample: React.FC<MenuBarProps> = (props) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log to external error tracking service
    console.error('MenuBar error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // You could also:
    // - Send error to analytics service
    // - Update application state to show a global error banner
    // - Trigger a notification to support team
  };

  return (
    <MenuBarErrorBoundary onError={handleError}>
      <MenuBar {...props} />
    </MenuBarErrorBoundary>
  );
};

/**
 * Example 4: Complete Integration
 * 
 * A complete example showing how to integrate the error boundary
 * in a real application with all features.
 */
export const CompleteIntegrationExample: React.FC<MenuBarProps> = (props) => {
  const customFallback = (
    <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-destructive">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5 text-destructive"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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
          Menu bar error - please reload
        </span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="px-3 py-1 text-sm font-medium bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
      >
        Reload Now
      </button>
    </div>
  );

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log comprehensive error information
    console.error('MenuBar Error Boundary:', {
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      context: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
    });
  };

  return (
    <MenuBarErrorBoundary fallback={customFallback} onError={handleError}>
      <MenuBar {...props} />
    </MenuBarErrorBoundary>
  );
};

/**
 * Example 5: Nested Error Boundaries
 * 
 * You can nest error boundaries to provide different error handling
 * for different parts of your application.
 */
export const NestedErrorBoundariesExample: React.FC<MenuBarProps> = (props) => {
  return (
    <div className="app-container">
      {/* Top-level error boundary for the entire app */}
      <MenuBarErrorBoundary>
        <MenuBar {...props} />
      </MenuBarErrorBoundary>

      {/* Separate error boundaries for other parts of the app */}
      <main className="app-content">
        {/* Your main content here */}
      </main>
    </div>
  );
};

/**
 * Best Practices:
 * 
 * 1. Always wrap MenuBar with MenuBarErrorBoundary in production
 * 2. Provide custom error handlers to log errors to your monitoring service
 * 3. Use custom fallback UI to match your application's design
 * 4. Test error scenarios during development to ensure proper handling
 * 5. Consider user experience - provide clear recovery options
 * 6. Log sufficient context for debugging (timestamp, user agent, etc.)
 * 7. Don't catch errors that should crash the app (e.g., critical initialization failures)
 * 
 * Error Boundary Limitations:
 * 
 * Error boundaries do NOT catch errors in:
 * - Event handlers (use try-catch instead)
 * - Asynchronous code (setTimeout, promises)
 * - Server-side rendering
 * - Errors thrown in the error boundary itself
 * 
 * For these cases, implement additional error handling in your components.
 */
