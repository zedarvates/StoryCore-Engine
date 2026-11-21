import { AlertTriangle, ShieldAlert } from 'lucide-react';
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
        'bg-red-500/5 border-2 border-red-500/30 rounded-lg p-4 backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.1)]',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
          <ShieldAlert className="h-5 w-5 text-red-500" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 font-mono">
            {errorCount === 1
              ? 'Integrity Violation Detected'
              : `Critical Conflicts Detected [${errorCount}]`}
          </h3>
          <ul className="space-y-2">
            {Object.entries(errors).map(([field, fieldErrors]) => (
              <li key={field} className="flex items-start gap-2 text-[11px] text-red-400/80 font-mono">
                <span className="text-red-500 mt-1">▶</span>
                {fieldErrors[0]}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
