import { useState } from 'react';
import { AlertCircle, RefreshCw, Edit3, X, Info } from 'lucide-react';
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

  const getErrorColor = () => {
    switch (error.category) {
      case LLMErrorCategory.AUTHENTICATION:
      case LLMErrorCategory.INVALID_REQUEST:
        return 'border-red-200 bg-red-50 text-red-800';
      case LLMErrorCategory.RATE_LIMIT:
      case LLMErrorCategory.TIMEOUT:
        return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case LLMErrorCategory.NETWORK:
      case LLMErrorCategory.SERVER_ERROR:
        return 'border-orange-200 bg-orange-50 text-orange-800';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800';
    }
  };

  return (
    <Card className={cn('border-2', getErrorColor(), className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{getErrorIcon()}</div>
            <div>
              <CardTitle className="text-base">AI Generation Failed</CardTitle>
              <CardDescription className="mt-1 text-sm">
                {error.userMessage}
              </CardDescription>
            </div>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0"
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
              variant="default"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isRetrying && 'animate-spin')} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          )}

          {onManualEntry && (
            <Button
              onClick={onManualEntry}
              size="sm"
              variant={error.retryable ? 'outline' : 'default'}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Enter Manually
            </Button>
          )}

          {error.actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.action}
              size="sm"
              variant={action.primary ? 'default' : 'outline'}
            >
              {action.label}
            </Button>
          ))}
        </div>

        {/* Technical Details (collapsible) */}
        {error.message && (
          <details className="text-xs">
            <summary className="cursor-pointer flex items-center gap-2 text-gray-600 hover:text-gray-800">
              <Info className="h-3 w-3" />
              Technical Details
            </summary>
            <div className="mt-2 p-2 bg-white rounded border text-gray-700 font-mono">
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

interface InlineLLMErrorProps {
  error: ErrorRecoveryOptions;
  onRetry?: () => void | Promise<void>;
  onManualEntry?: () => void;
  className?: string;
}

export function InlineLLMError({
  error,
  onRetry,
  onManualEntry,
  className,
}: InlineLLMErrorProps) {
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
        'flex items-start gap-2 p-3 rounded-lg border bg-red-50 border-red-200',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-800 font-medium">{error.userMessage}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {error.retryable && onRetry && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="text-xs text-red-700 hover:text-red-900 underline disabled:opacity-50"
            >
              {isRetrying ? 'Retrying...' : 'Retry'}
            </button>
          )}
          {onManualEntry && (
            <button
              onClick={onManualEntry}
              className="text-xs text-red-700 hover:text-red-900 underline"
            >
              Enter manually
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

interface LLMLoadingStateProps {
  message?: string;
  onCancel?: () => void;
  showProgress?: boolean;
  className?: string;
}

export function LLMLoadingState({
  message = 'Generating AI suggestions...',
  onCancel,
  showProgress = false,
  className,
}: LLMLoadingStateProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border bg-blue-50 border-blue-200',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
        <div>
          <p className="text-sm font-medium text-blue-900">{message}</p>
          {showProgress && (
            <p className="text-xs text-blue-700 mt-1">This may take a few moments...</p>
          )}
        </div>
      </div>
      {onCancel && (
        <Button
          onClick={onCancel}
          size="sm"
          variant="ghost"
          className="text-blue-700 hover:text-blue-900"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Manual Entry Mode Banner
// ============================================================================

interface ManualEntryBannerProps {
  reason?: string;
  onTryAI?: () => void;
  className?: string;
}

export function ManualEntryBanner({
  reason = 'AI generation is unavailable',
  onTryAI,
  className,
}: ManualEntryBannerProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between p-3 rounded-lg border bg-gray-50 border-gray-200',
        className
      )}
      role="status"
    >
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900">Manual Entry Mode</p>
          <p className="text-xs text-gray-600 mt-1">{reason}</p>
        </div>
      </div>
      {onTryAI && (
        <Button
          onClick={onTryAI}
          size="sm"
          variant="outline"
          className="text-xs"
        >
          Try AI Again
        </Button>
      )}
    </div>
  );
}
