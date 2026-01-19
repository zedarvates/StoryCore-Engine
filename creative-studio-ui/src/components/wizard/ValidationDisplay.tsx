import { AlertCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertLiveRegion } from './LiveRegion';

// ============================================================================
// Inline Field Error Component
// ============================================================================

interface InlineFieldErrorProps {
  error: string;
  fieldName: string;
  className?: string;
}

/**
 * Inline error message displayed below a form field
 * 
 * @param error - The error message to display
 * @param fieldName - The name of the field (for accessibility)
 * @param className - Optional CSS classes
 */
export function InlineFieldError({
  error,
  fieldName,
  className,
}: InlineFieldErrorProps) {
  if (!error) return null;

  return (
    <div
      className={cn('flex items-start gap-2 text-sm text-red-600 mt-1', className)}
      role="alert"
      aria-live="polite"
      id={`${fieldName}-error`}
    >
      <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </div>
  );
}

// ============================================================================
// Field Requirement Indicator Component
// ============================================================================

interface FieldRequirementProps {
  required: boolean;
  optional?: boolean;
  className?: string;
}

/**
 * Visual indicator for required/optional fields
 * 
 * @param required - Whether the field is required
 * @param optional - Whether to show "optional" label
 * @param className - Optional CSS classes
 */
export function FieldRequirement({
  required,
  optional = false,
  className,
}: FieldRequirementProps) {
  if (!required && !optional) return null;

  return (
    <span className={cn('text-sm', className)}>
      {required && (
        <span className="text-red-500 font-medium" aria-label="required field">
          *
        </span>
      )}
      {optional && !required && (
        <span className="text-gray-500 italic" aria-label="optional field">
          (optional)
        </span>
      )}
    </span>
  );
}

// ============================================================================
// Validation Error Summary Component
// ============================================================================

interface ValidationErrorSummaryProps {
  errors: Record<string, string[]>;
  title?: string;
  onFieldClick?: (fieldName: string) => void;
  className?: string;
}

/**
 * Summary of all validation errors in the current step
 * Displayed at the top of the form
 * 
 * @param errors - Object mapping field names to error messages
 * @param title - Optional custom title
 * @param onFieldClick - Optional callback when clicking on a field error
 * @param className - Optional CSS classes
 */
export function ValidationErrorSummary({
  errors,
  title = 'Please fix the following errors:',
  onFieldClick,
  className,
}: ValidationErrorSummaryProps) {
  const errorEntries = Object.entries(errors);
  
  if (errorEntries.length === 0) {
    return null;
  }

  const totalErrors = errorEntries.reduce((sum, [, fieldErrors]) => sum + fieldErrors.length, 0);

  const handleFieldClick = (fieldName: string) => {
    if (onFieldClick) {
      onFieldClick(fieldName);
    } else {
      // Default behavior: focus the field
      const field = document.getElementById(fieldName);
      if (field) {
        field.focus();
        field.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <>
      <AlertLiveRegion
        message={`${totalErrors} validation ${totalErrors === 1 ? 'error' : 'errors'} found. Please review and correct the highlighted fields.`}
        type="error"
      />
      <div
        className={cn(
          'rounded-lg border-2 border-red-200 bg-red-50 p-4 mb-6',
          className
        )}
        role="alert"
        aria-labelledby="error-summary-title"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <h3 id="error-summary-title" className="text-sm font-semibold text-red-800 mb-2">
              {title}
            </h3>
            <ul className="space-y-2 text-sm text-red-700">
              {errorEntries.map(([fieldName, fieldErrors]) =>
                fieldErrors.map((error, index) => (
                  <li key={`${fieldName}-${index}`} className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <button
                      type="button"
                      onClick={() => handleFieldClick(fieldName)}
                      className="text-left hover:underline focus:outline-none focus:underline"
                    >
                      <span className="font-medium">{formatFieldName(fieldName)}:</span> {error}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Field Validation Status Component
// ============================================================================

interface FieldValidationStatusProps {
  isValid?: boolean;
  isValidating?: boolean;
  error?: string;
  className?: string;
}

/**
 * Visual indicator of field validation status
 * Shows checkmark for valid, spinner for validating, error icon for invalid
 * 
 * @param isValid - Whether the field is valid
 * @param isValidating - Whether validation is in progress
 * @param error - Error message if invalid
 * @param className - Optional CSS classes
 */
export function FieldValidationStatus({
  isValid,
  isValidating,
  error,
  className,
}: FieldValidationStatusProps) {
  if (isValidating) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-gray-500', className)} role="status" aria-live="polite">
        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" aria-hidden="true" />
        <span>Validating...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-red-600', className)} role="alert" aria-live="polite">
        <XCircle className="h-4 w-4" aria-hidden="true" />
        <span>{error}</span>
      </div>
    );
  }

  if (isValid) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-green-600', className)} role="status" aria-live="polite">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <span>Valid</span>
      </div>
    );
  }

  return null;
}

// ============================================================================
// Warning Message Component
// ============================================================================

interface WarningMessageProps {
  message: string;
  title?: string;
  className?: string;
}

/**
 * Warning message component for non-critical issues
 * 
 * @param message - The warning message
 * @param title - Optional title
 * @param className - Optional CSS classes
 */
export function WarningMessage({
  message,
  title = 'Warning',
  className,
}: WarningMessageProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-yellow-200 bg-yellow-50 p-4',
        className
      )}
      role="alert"
      aria-labelledby="warning-title"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h3 id="warning-title" className="text-sm font-semibold text-yellow-800">
            {title}
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format field name for display
 * Converts camelCase or snake_case to Title Case
 */
function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
