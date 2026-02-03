/**
 * Unit tests for ErrorBoundary Component
 * 
 * Requirements: 2.3
 * Phase 2: Advanced Diagnostics
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';
import { globalErrorHandler } from '@/utils/globalErrorHandler';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error from component');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  let originalConsoleError: typeof console.error;
  let mockHandleReactError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error in tests
    originalConsoleError = console.error;
    console.error = vi.fn();

    // Mock globalErrorHandler.handleReactError
    mockHandleReactError = vi.spyOn(globalErrorHandler, 'handleReactError');
  });

  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError;

    // Restore mock
    mockHandleReactError.mockRestore();
  });

  it('should render children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch errors and display fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should display error message
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
  });

  it('should call globalErrorHandler.handleReactError when error is caught', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should have called handleReactError
    expect(mockHandleReactError).toHaveBeenCalledTimes(1);
    expect(mockHandleReactError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test error from component',
      }),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should display custom fallback UI when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should display error details in expandable section', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should have details element
    const details = screen.getByText('Error details');
    expect(details).toBeInTheDocument();

    // Should show error message in details
    expect(screen.getByText('Test error from component')).toBeInTheDocument();
  });

  it('should provide reload button', () => {
    // Mock window.location.reload
    delete (window as any).location;
    window.location = { reload: vi.fn() } as any;

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload Application');
    expect(reloadButton).toBeInTheDocument();
  });

  it('should provide try again button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const tryAgainButton = screen.getByText('Try Again');
    expect(tryAgainButton).toBeInTheDocument();
  });

  it('should not display fallback UI when no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should log error to console', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalled();
  });
});
