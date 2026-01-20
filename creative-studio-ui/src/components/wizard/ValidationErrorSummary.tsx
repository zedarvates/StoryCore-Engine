import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationErrorSummaryProps {
  errors: Record<string, string[]>;
  className?: string;
}

export function ValidationErrorSummary({
  errors,
  className,
}: ValidationErrorSummaryProps) {
  const errorCount = Object.keys(errors).length;
  
  if (errorCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'bg-red-50 border border-red-200 rounded-lg p-4',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 mb-2">
            {errorCount === 1
              ? 'Please fix the following error:'
              : `Please fix the following ${errorCount} errors:`}
          </h3>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {Object.entries(errors).map(([field, fieldErrors]) => (
              <li key={field}>{fieldErrors[0]}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
