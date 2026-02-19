import React from 'react';
import { AlertCircle, AlertTriangle, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';
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
      className={cn('space-y-3', className)}
      role="alert"
      aria-live="polite"
      aria-label="Validation errors"
    >
      {errorEntries.map(([field, message]) => (
        <div
          key={field}
          className={cn(
            'flex items-start gap-4 p-4 rounded border-2 backdrop-blur-md',
            'border-red-500/30 bg-red-500/5 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
          )}
        >
          {showIcons && (
            <div className="p-1.5 bg-red-500/20 rounded border border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" aria-hidden="true" />
            </div>
          )}
          <div className="flex-1">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 mb-1 font-mono">
              Integrity Breach: {field.replace(/([A-Z])/g, ' $1').toLowerCase()}
            </div>
            <div className={cn(compact ? 'text-[11px]' : 'text-xs', 'font-mono opacity-80 leading-relaxed uppercase tracking-tight')}>
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

  const message = error || warning || (success ? 'Parameter Validated' : '');
  const isError = !!error;
  const isWarning = !!warning && !error;

  return (
    <div
      className={cn(
        'flex items-center gap-2 mt-2 py-1 px-2 rounded-sm text-[10px] font-black uppercase tracking-widest border transition-all duration-300',
        isError && 'text-red-400 border-red-500/20 bg-red-500/5',
        isWarning && 'text-amber-400 border-amber-500/20 bg-amber-500/5',
        success && 'text-primary border-primary/20 bg-primary/5',
        className
      )}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      {showIcons && (
        <>
          {isError && <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />}
          {isWarning && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />}
          {success && <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />}
        </>
      )}
      <span className="font-mono">{message}</span>
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
  title = 'System Integrity Check Failed',
  showIcons = true,
}: ValidationSummaryProps) {
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div
      className={cn('rounded border-2 p-6 backdrop-blur-xl bg-black/40 border-primary/20 shadow-[0_0_30px_rgba(var(--primary-rgb),0.05)]', className)}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 mb-6">
        <Zap className="h-5 w-5 text-primary animate-pulse" />
        <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] font-mono">{title}</h3>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-4">
            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest">Critical Conflicts [{errors.length}]</h4>
            <div className="h-px flex-1 bg-red-500/20" />
          </div>
          <ul className="space-y-3">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start gap-3 text-[11px] text-red-400 font-mono group">
                {showIcons && (
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] group-hover:scale-125 transition-transform" />
                )}
                <span>
                  <strong className="uppercase mr-2 opacity-60">
                    [{error.field}]
                  </strong>{' '}
                  {error.message.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Neural Fluctuations [{warnings.length}]</h4>
            <div className="h-px flex-1 bg-amber-500/20" />
          </div>
          <ul className="space-y-3">
            {warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-3 text-[11px] text-amber-400 font-mono group">
                {showIcons && (
                  <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] group-hover:scale-125 transition-transform" />
                )}
                <span>
                  <strong className="uppercase mr-2 opacity-60">
                    [{warning.field}]
                  </strong>{' '}
                  {warning.message.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
