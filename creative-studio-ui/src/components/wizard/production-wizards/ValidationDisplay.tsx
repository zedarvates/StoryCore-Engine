import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Validation Display Component
// ============================================================================

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationDisplayProps {
  errors: Record<string, string>;
  className?: string;
  showIcons?: boolean;
  compact?: boolean;
}

export function ValidationDisplay({
  errors,
  className,
  showIcons = true,
  compact = false,
}: ValidationDisplayProps) {
  const errorEntries = Object.entries(errors).filter(([, message]) => message);

  if (errorEntries.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('space-y-2', className)}
      role="alert"
      aria-live="polite"
      aria-label="Validation errors"
    >
      {errorEntries.map(([field, message]) => (
        <div
          key={field}
          className={cn(
            'flex items-start gap-2 p-3 rounded-md border',
            compact ? 'text-sm' : 'text-base',
            'border-red-200 bg-red-50 text-red-800'
          )}
        >
          {showIcons && (
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <div className="flex-1">
            <div className="font-medium capitalize">
              {field.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </div>
            <div className={cn(compact ? 'text-sm' : 'text-base', 'mt-1')}>
              {message}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Field-Level Validation Component
// ============================================================================

interface FieldValidationProps {
  error?: string;
  warning?: string;
  success?: boolean;
  className?: string;
  showIcons?: boolean;
}

export function FieldValidation({
  error,
  warning,
  success = false,
  className,
  showIcons = true,
}: FieldValidationProps) {
  if (!error && !warning && !success) {
    return null;
  }

  const message = error || warning || '';
  const isError = !!error;
  const isWarning = !!warning && !error;

  return (
    <div
      className={cn(
        'flex items-center gap-2 mt-1 text-sm',
        isError && 'text-red-600',
        isWarning && 'text-yellow-600',
        success && 'text-green-600',
        className
      )}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      {showIcons && (
        <>
          {isError && <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
          {isWarning && <AlertTriangle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
          {success && <CheckCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
        </>
      )}
      <span>{message}</span>
    </div>
  );
}

// ============================================================================
// Validation Summary Component
// ============================================================================

interface ValidationSummaryProps {
  errors: ValidationError[];
  warnings: ValidationError[];
  className?: string;
  title?: string;
  showIcons?: boolean;
}

export function ValidationSummary({
  errors,
  warnings,
  className,
  title = 'Please review the following issues:',
  showIcons = true,
}: ValidationSummaryProps) {
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('rounded-lg border p-4', className)}
      role="alert"
      aria-live="polite"
    >
      <h3 className="font-medium text-gray-900 mb-3">{title}</h3>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-medium text-red-800">Errors ({errors.length})</h4>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                {showIcons && (
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <span>
                  <strong className="capitalize">
                    {error.field.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </strong>{' '}
                  {error.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-yellow-800">Warnings ({warnings.length})</h4>
          <ul className="space-y-1">
            {warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-yellow-700">
                {showIcons && (
                  <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                )}
                <span>
                  <strong className="capitalize">
                    {warning.field.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </strong>{' '}
                  {warning.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}