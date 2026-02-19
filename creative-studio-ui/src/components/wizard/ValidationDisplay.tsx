import { AlertTriangle, ShieldAlert, Zap } from 'lucide-react';
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
 */
export function InlineFieldError({
  error,
  fieldName,
  className,
}: InlineFieldErrorProps) {
  if (!error) return null;

  return (
    <div
      className={cn('flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400 mt-2 font-mono bg-red-500/5 border border-red-500/20 p-2 rounded-sm', className)}
      role="alert"
      aria-live="polite"
      id={`${fieldName}-error`}
    >
      <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
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
 */
export function FieldRequirement({
  required,
  optional = false,
  className,
}: FieldRequirementProps) {
  if (!required && !optional) return null;

  return (
    <span className={cn('text-[10px] uppercase font-black tracking-widest font-mono', className)}>
      {required && (
        <span className="text-red-500" aria-label="required parameter">
          [CRITICAL]
        </span>
      )}
      {optional && !required && (
        <span className="text-primary/40" aria-label="optional parameter">
          [OPTIONAL]
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
 */
export function ValidationErrorSummary({
  errors,
  title = 'System Integrity Conflict Detect',
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
        message={`${totalErrors} validation conflicts found. Please resolve all parameters.`}
        type="error"
      />
      <div
        className={cn(
          'rounded border-2 border-red-500/30 bg-red-500/5 p-6 mb-8 backdrop-blur-xl shadow-[0_0_20px_rgba(239,68,68,0.1)] relative overflow-hidden',
          className
        )}
        role="alert"
        aria-labelledby="error-summary-title"
      >
        <div className="absolute top-0 right-0 p-2 opacity-20">
          <Zap className="h-12 w-12 text-red-500" />
        </div>

        <div className="flex items-start gap-4 relative z-10">
          <div className="p-2 bg-red-500/20 rounded border border-red-500/30">
            <ShieldAlert className="h-5 w-5 text-red-500" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 id="error-summary-title" className="text-xs font-black text-red-400 uppercase tracking-[0.3em] font-mono mb-4">
              {title}
            </h3>
            <ul className="space-y-3">
              {errorEntries.map(([fieldName, fieldErrors]) =>
                fieldErrors.map((error, index) => (
                  <li key={`${fieldName}-${index}`} className="flex items-start gap-2">
                    <span className="text-red-500 mt-1 font-mono">▶</span>
                    <button
                      type="button"
                      onClick={() => handleFieldClick(fieldName)}
                      className="text-left group focus:outline-none"
                    >
                      <span className="text-[11px] font-black font-mono text-red-300/60 uppercase group-hover:text-red-400 transition-colors mr-2">
                        [{formatFieldName(fieldName)}]
                      </span>
                      <span className="text-[11px] font-mono text-red-100/80 uppercase tracking-tight group-hover:text-white transition-colors">
                        {error}
                      </span>
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

export function FieldValidationStatus({
  isValid,
  isValidating,
  error,
  className,
}: FieldValidationStatusProps) {
  if (isValidating) {
    return (
      <div className={cn('flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/40 font-mono', className)} role="status" aria-live="polite">
        <div className="animate-spin h-3 w-3 border-2 border-primary/20 border-t-primary rounded-full" aria-hidden="true" />
        <span>Analyzing...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400 font-mono', className)} role="alert" aria-live="polite">
        <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Integrity Breach</span>
      </div>
    );
  }

  if (isValid) {
    return (
      <div className={cn('flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary font-mono', className)} role="status" aria-live="polite">
        <div className="h-3.5 w-3.5 flex items-center justify-center bg-primary/20 rounded-full">
          <div className="h-1.5 w-1.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" />
        </div>
        <span>Verified</span>
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

export function WarningMessage({
  message,
  title = 'Signal Interference',
  className,
}: WarningMessageProps) {
  return (
    <div
      className={cn(
        'rounded border-2 border-amber-500/20 bg-amber-500/5 p-4 backdrop-blur-md',
        className
      )}
      role="alert"
      aria-labelledby="warning-title"
    >
      <div className="flex items-start gap-4">
        <div className="p-1.5 bg-amber-500/20 rounded border border-amber-500/30">
          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 id="warning-title" className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] font-mono mb-1">
            {title}
          </h3>
          <p className="text-[11px] font-mono text-amber-100/60 uppercase tracking-tight">
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

function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .toUpperCase()
    .trim();
}
