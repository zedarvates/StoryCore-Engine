/**
 * ErrorDisplay Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDisplay } from '../ErrorDisplay';
import { ErrorCategory, ErrorSeverity, RecoveryStrategy, type CategorizedError } from '../../../utils/errorHandling';

describe('ErrorDisplay', () => {
  const mockError: CategorizedError = {
    category: ErrorCategory.GENERATION,
    severity: ErrorSeverity.MEDIUM,
    message: 'Generation failed',
    originalError: new Error('Generation failed'),
    userMessage: 'Generation failed. Please try again.',
    technicalDetails: 'Stack trace here',
    recoveryStrategy: RecoveryStrategy.RETRY,
    troubleshootingSteps: [
      'Check your parameters',
      'Try again in a few moments',
    ],
    canRetry: true,
    retryDelay: 3000,
  };

  it('should render nothing when error is null', () => {
    const { container } = render(
      <ErrorDisplay error={null} onDismiss={vi.fn()} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should render error message', () => {
    render(<ErrorDisplay error={mockError} onDismiss={vi.fn()} />);
    
    expect(screen.getByText('Generation failed. Please try again.')).toBeInTheDocument();
  });

  it('should render troubleshooting steps', () => {
    render(<ErrorDisplay error={mockError} onDismiss={vi.fn()} />);
    
    expect(screen.getByText('Check your parameters')).toBeInTheDocument();
    expect(screen.getByText('Try again in a few moments')).toBeInTheDocument();
  });

  it('should call onRetry when retry button clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorDisplay error={mockError} onRetry={onRetry} onDismiss={vi.fn()} />);
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);
    
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn();
    render(<ErrorDisplay error={mockError} onDismiss={onDismiss} />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);
    
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should call onAdjustParameters when adjust parameters button clicked', () => {
    const validationError: CategorizedError = {
      ...mockError,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      recoveryStrategy: RecoveryStrategy.ADJUST_PARAMETERS,
      canRetry: false,
    };
    
    const onAdjustParameters = vi.fn();
    render(
      <ErrorDisplay
        error={validationError}
        onAdjustParameters={onAdjustParameters}
        onDismiss={vi.fn()}
      />
    );
    
    const adjustButton = screen.getByRole('button', { name: /adjust parameters/i });
    fireEvent.click(adjustButton);
    
    expect(onAdjustParameters).toHaveBeenCalledTimes(1);
  });

  it('should call onOpenSettings when open settings button clicked', () => {
    const serviceError: CategorizedError = {
      ...mockError,
      category: ErrorCategory.SERVICE_UNAVAILABLE,
      severity: ErrorSeverity.HIGH,
      recoveryStrategy: RecoveryStrategy.USER_ACTION_REQUIRED,
      canRetry: false,
    };
    
    const onOpenSettings = vi.fn();
    render(
      <ErrorDisplay
        error={serviceError}
        onOpenSettings={onOpenSettings}
        onDismiss={vi.fn()}
      />
    );
    
    const settingsButton = screen.getByRole('button', { name: /open settings/i });
    fireEvent.click(settingsButton);
    
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('should apply correct severity color for low severity', () => {
    const lowSeverityError: CategorizedError = {
      ...mockError,
      severity: ErrorSeverity.LOW,
    };
    
    const { container } = render(
      <ErrorDisplay error={lowSeverityError} onDismiss={vi.fn()} />
    );
    
    const alertDiv = container.querySelector('[role="alert"]');
    expect(alertDiv).toHaveClass('bg-yellow-50');
  });

  it('should apply correct severity color for high severity', () => {
    const highSeverityError: CategorizedError = {
      ...mockError,
      severity: ErrorSeverity.HIGH,
    };
    
    const { container } = render(
      <ErrorDisplay error={highSeverityError} onDismiss={vi.fn()} />
    );
    
    const alertDiv = container.querySelector('[role="alert"]');
    expect(alertDiv).toHaveClass('bg-red-50');
  });

  it('should render technical details in collapsible section', () => {
    render(<ErrorDisplay error={mockError} onDismiss={vi.fn()} />);
    
    const detailsElement = screen.getByText('Technical details');
    expect(detailsElement).toBeInTheDocument();
    
    // Technical details should be in a pre tag
    const preElement = screen.getByText('Stack trace here');
    expect(preElement.tagName).toBe('PRE');
  });

  it('should have proper ARIA attributes', () => {
    const { container } = render(
      <ErrorDisplay error={mockError} onDismiss={vi.fn()} />
    );
    
    const alertDiv = container.querySelector('[role="alert"]');
    expect(alertDiv).toHaveAttribute('aria-live', 'assertive');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ErrorDisplay
        error={mockError}
        onDismiss={vi.fn()}
        className="custom-class"
      />
    );
    
    const alertDiv = container.querySelector('[role="alert"]');
    expect(alertDiv).toHaveClass('custom-class');
  });
});
