import { useState } from 'react';
import { AlertCircle, RefreshCw, Edit3, X, Info, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ErrorRecoveryOptions } from '@/services/llmService';
import { LLMErrorCategory } from '@/services/llmService';

// ============================================================================
// LLM Error Display Component
// ============================================================================

interface LLMErrorDisplayProps {
  error: ErrorRecoveryOptions;
  onRetry?: () => void | Promise<void>;
  onManualEntry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function LLMErrorDisplay({
  error,
  onRetry,
  onManualEntry,
  onDismiss,
  className,
}: LLMErrorDisplayProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorIcon = () => {
    switch (error.category) {
      case LLMErrorCategory.AUTHENTICATION:
      case LLMErrorCategory.INVALID_REQUEST:
        return <AlertCircle className="h-5 w-5" />;
      case LLMErrorCategory.RATE_LIMIT:
      case LLMErrorCategory.TIMEOUT:
        return <RefreshCw className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getErrorColorClass = () => {
    switch (error.category) {
      case LLMErrorCategory.AUTHENTICATION:
      case LLMErrorCategory.INVALID_REQUEST:
        return 'border-red-500/30 bg-red-500/5 text-red-400';
      case LLMErrorCategory.RATE_LIMIT:
      case LLMErrorCategory.TIMEOUT:
        return 'border-amber-500/30 bg-amber-500/5 text-amber-400';
      case LLMErrorCategory.NETWORK:
      case LLMErrorCategory.SERVER_ERROR:
        return 'border-orange-500/30 bg-orange-500/5 text-orange-400';
      default:
        return 'border-primary/20 bg-primary/5 text-primary';
    }
  };

  return (
    <Card className={cn('backdrop-blur-sm shadow-[0_0_15px_rgba(var(--primary-rgb),0.05)] border-2', getErrorColorClass(), className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="mt-1 p-2 bg-current/10 rounded border border-current/20">{getErrorIcon()}</div>
            <div>
              <CardTitle className="text-sm uppercase tracking-widest font-bold font-mono">Synthesis System Failure</CardTitle>
              <CardDescription className="mt-1 text-xs opacity-80 font-mono">
                {error.userMessage}
              </CardDescription>
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 text-current/60 hover:text-current hover:bg-current/10"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {error.retryable && onRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              size="sm"
              className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-[10px] uppercase font-bold tracking-widest h-8"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-2', isRetrying && 'animate-spin')} />
              {isRetrying ? 'Re-Syncing...' : 'Retry Link'}
            </Button>
          )}

          {onManualEntry && (
            <Button
              onClick={onManualEntry}
              size="sm"
              variant="outline"
              className="border-primary/20 text-primary/70 hover:bg-primary/10 text-[10px] uppercase font-bold tracking-widest h-8"
            >
              <Edit3 className="h-3.5 w-3.5 mr-2" />
              Manual Override
            </Button>
          )}

          {error.actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.action}
              size="sm"
              variant={action.primary ? 'default' : 'outline'}
              className={cn(
                "text-[10px] uppercase font-bold tracking-widest h-8",
                action.primary ? "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" : "border-primary/20 text-primary/70"
              )}
            >
              {action.label}
            </Button>
          ))}
        </div>

        {/* Technical Details (collapsible) */}
        {error.message && (
          <details className="group">
            <summary className="cursor-pointer flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-current/40 hover:text-current/60 transition-colors">
              <Info className="h-3 w-3" />
              Diagnostic Logs
            </summary>
            <div className="mt-2 p-3 bg-black/40 rounded border border-current/10 text-[10px] text-current/70 font-mono leading-relaxed overflow-x-auto">
              {error.message}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Inline LLM Error Component (for form fields)
// ============================================================================

export function InlineLLMError({
  error,
  onRetry,
  onManualEntry,
  className,
}: {
  error: ErrorRecoveryOptions;
  onRetry?: () => void | Promise<void>;
  onManualEntry?: () => void;
  className?: string;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border bg-red-500/5 border-red-500/20 backdrop-blur-sm',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-red-400 font-bold uppercase tracking-wider">{error.userMessage}</p>
        <div className="flex flex-wrap gap-4 mt-2">
          {error.retryable && onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="text-[10px] text-red-400/60 hover:text-red-400 underline uppercase tracking-widest font-bold disabled:opacity-50"
            >
              {isRetrying ? 'Syncing...' : 'Retry Link'}
            </button>
          )}
          {onManualEntry && (
            <button
              onClick={onManualEntry}
              className="text-[10px] text-red-400/60 hover:text-red-400 underline uppercase tracking-widest font-bold"
            >
              Manual Override
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Loading State Component
// ============================================================================

export function LLMLoadingState({
  message = 'Initializing Suggestion Synthesis...',
  onCancel,
  showProgress = false,
  className,
}: {
  message?: string;
  onCancel?: () => void;
  showProgress?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border bg-primary/5 border-primary/20 backdrop-blur-sm shadow-[inset_0_0_10px_rgba(var(--primary-rgb),0.05)]',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          <div className="absolute inset-0 bg-primary/20 blur-md animate-pulse"></div>
        </div>
        <div>
          <p className="text-xs font-bold text-primary uppercase tracking-widest">{message}</p>
          {showProgress && (
            <p className="text-[10px] text-primary-foreground/40 mt-1 uppercase tracking-tighter">Analyzing Reality Parameters...</p>
          )}
        </div>
      </div>
      {onCancel && (
        <Button
          onClick={onCancel}
          size="sm"
          variant="ghost"
          className="text-primary/40 hover:text-primary hover:bg-primary/10 text-[10px] uppercase font-bold tracking-widest"
        >
          Abort
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Manual Entry Mode Banner
// ============================================================================

export function ManualEntryBanner({
  reason = 'Neural link offline',
  onTryAI,
  className,
}: {
  reason?: string;
  onTryAI?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between p-3 rounded-lg border bg-secondary/30 border-primary/10 backdrop-blur-sm',
        className
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <Info className="h-4 w-4 text-primary/60 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[11px] font-bold text-primary/80 uppercase tracking-widest">Manual Entry Mode Active</p>
          <p className="text-[10px] text-primary-foreground/40 mt-1 uppercase font-mono">{reason}</p>
        </div>
      </div>
      {onTryAI && (
        <Button
          onClick={onTryAI}
          size="sm"
          variant="outline"
          className="text-[10px] h-7 border-primary/20 text-primary uppercase font-bold tracking-widest"
        >
          Resume Neural Link
        </Button>
      )}
    </div>
  );
}
