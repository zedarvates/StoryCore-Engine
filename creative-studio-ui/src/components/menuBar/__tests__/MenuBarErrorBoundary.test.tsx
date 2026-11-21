/**
 * MenuBarErrorBoundary Tests
 * 
 * Tests for the MenuBarErrorBoundary component to ensure proper error handling,
 * user feedback, and logging functionality.
 * 
 * Requirements: 15.2 (Error Handling and User Feedback)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MenuBarErrorBoundary } from '../MenuBarErrorBoundary';
import { notificationService } from '../../../services/menuBar/NotificationService';

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({
  shouldThrow = true,
  errorMessage = 'Test error',
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

describe('MenuBarErrorBoundary', () => {
  // Mock console.error to avoid cluttering test output
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <MenuBarErrorBoundary>
          <div data-testid="child">Child content</div>
        </MenuBarErrorBoundary>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should not show error UI when children render successfully', () => {
      render(
        <MenuBarErrorBoundary>
          <ThrowError shouldThrow={false} />
        </MenuBarErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch errors thrown by children', () => {
      render(
        <MenuBarErrorBoundary>
          <ThrowError />
        </MenuBarErrorBoundary>
      );

      // Should show error UI instead of crashing
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Menu bar error')).toBeInTheDocument();
    });

    it('should display default fallback UI when error occurs', () => {
      render(
        <MenuBarErrorBoundary>
          <ThrowError />
        </MenuBarErrorBoundary>
      );

      // Check for error icon
      const errorIcon = screen.getByRole('alert').querySelector('svg');
      expect(errorIcon).toBeInTheDocument();

      // Check for error message
      expect(screen.getByText('Menu bar error')).toBeInTheDocument();

      // Check for retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should display custom fallback UI when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

      render(
        <MenuBarErrorBoundary fallback={customFallback}>
          <ThrowError />
        </MenuBarErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
    });

    it('should log error to console for debugging', () => {
      const errorMessage = 'Test error message';
      const consoleErrorSpy = vi.spyOn(console, 'error');

      render(
        <MenuBarErrorBoundary>
          <ThrowError errorMessage={errorMessage} />
        </MenuBarErrorBoundary>
      );

      // Verify console.error was called with error details
      expect(consoleErrorSpy).toHaveBeenCalled();
      const calls = consoleErrorSpy.mock.calls;
      
      // Check that error was logged
      const errorCall = calls.find(call => 
        call[0]?.includes('MenuBar Error Boundary caught an error')
      );
      expect(errorCall).toBeDefined();

      // Check that component stack was logged
      const stackCall = calls.find(call => 
        call[0]?.includes('Component stack')
      );
      expect(stackCall).toBeDefined();
    });

    it('should show user-friendly notification when error occurs', () => {
      const showSpy = vi.spyOn(notificationService, 'show');

      render(
        <MenuBarErrorBoundary>
          <ThrowError />
        </MenuBarErrorBoundary>
      );

      // Verify notification was shown
      expect(showSpy).toHaveBeenCalledWith({
        type: 'error',
        message: 'An unexpected error occurred in the menu bar. Please reload the page.',
        duration: null,
        action: {
          label: 'Reload',
          callback: expect.any(Function),
        },
      });
    });

    it('should call custom onError callback when provided', () => {
      const onErrorMock = vi.fn();
      const errorMessage = 'Custom error';

      render(
        <MenuBarErrorBoundary onError={onErrorMock}>
          <ThrowError errorMessage={errorMessage} />
        </MenuBarErrorBoundary>
      );

      // Verify custom error handler was called
      expect(onErrorMock).toHaveBeenCalledTimes(1);
      
      // Check error parameter
      const [error, errorInfo] = onErrorMock.mock.calls[0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe(errorMessage);
      
      // Check errorInfo parameter
      expect(errorInfo).toHaveProperty('componentStack');
    });
  });

  describe('Error Recovery', () => {
    it('should have a retry button in the error UI', () => {
      render(
        <MenuBarErrorBoundary>
          <ThrowError />
        </MenuBarErrorBoundary>
      );

      // Error UI should be visible with retry button
      expect(screen.getByRole('alert')).toBeInTheDocument();
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      
      // Verify button is clickable
      expect(retryButton).not.toBeDisabled();
    });

    it('should provide reload action in notification', () => {
      const showSpy = vi.spyOn(notificationService, 'show');

      render(
        <MenuBarErrorBoundary>
          <ThrowError />
        </MenuBarErrorBoundary>
      );

      // Get the notification callback
      const notificationCall = showSpy.mock.calls[0][0];
      const reloadCallback = notificationCall.action?.callback;

      // Verify reload callback exists and is a function
      expect(reloadCallback).toBeDefined();
      expect(typeof reloadCallback).toBe('function');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on error UI', () => {
      render(
        <MenuBarErrorBoundary>
          <ThrowError />
        </MenuBarErrorBoundary>
      );

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should have accessible retry button', () => {
      render(
        <MenuBarErrorBoundary>
          <ThrowError />
        </MenuBarErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /retry loading menu bar/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveAttribute('aria-label', 'Retry loading menu bar');
    });

    it('should hide error icon from screen readers', () => {
      render(
        <MenuBarErrorBoundary>
          <ThrowError />
        </MenuBarErrorBoundary>
      );

      const errorIcon = screen.getByRole('alert').querySelector('svg');
      expect(errorIcon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Multiple Errors', () => {
    it('should handle multiple errors in sequence', () => {
      const showSpy = vi.spyOn(notificationService, 'show');

      // First error
      const { unmount } = render(
        <MenuBarErrorBoundary>
          <ThrowError errorMessage="First error" />
        </MenuBarErrorBoundary>
      );

      expect(showSpy).toHaveBeenCalledTimes(1);

      // Unmount and create a new error boundary instance
      unmount();

      // Second error in a new error boundary
      render(
        <MenuBarErrorBoundary>
          <ThrowError errorMessage="Second error" />
        </MenuBarErrorBoundary>
      );

      expect(showSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors with no message', () => {
      const ThrowEmptyError: React.FC = () => {
        throw new Error();
      };

      render(
        <MenuBarErrorBoundary>
          <ThrowEmptyError />
        </MenuBarErrorBoundary>
      );

      // Should still show error UI
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle non-Error objects thrown', () => {
      const ThrowString: React.FC = () => {
        throw 'String error';
      };

      render(
        <MenuBarErrorBoundary>
          <ThrowString />
        </MenuBarErrorBoundary>
      );

      // Should still catch and display error UI
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle errors in nested components', () => {
      const NestedComponent: React.FC = () => (
        <div>
          <div>
            <ThrowError />
          </div>
        </div>
      );

      render(
        <MenuBarErrorBoundary>
          <NestedComponent />
        </MenuBarErrorBoundary>
      );

      // Should catch error from nested component
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
