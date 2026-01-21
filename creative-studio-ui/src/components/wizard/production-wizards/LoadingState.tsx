import React from 'react';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Loading State Component
// ============================================================================

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showProgress?: boolean;
  progress?: number;
  variant?: 'spinner' | 'saving' | 'processing' | 'loading';
}

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  className,
  showProgress = false,
  progress,
  variant = 'spinner',
}: LoadingStateProps) {
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const getIcon = () => {
    const iconClass = cn('animate-spin', iconSizes[size]);

    switch (variant) {
      case 'saving':
        return <Save className={iconClass} aria-hidden="true" />;
      case 'processing':
        return <RefreshCw className={iconClass} aria-hidden="true" />;
      case 'loading':
      default:
        return <Loader2 className={iconClass} aria-hidden="true" />;
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* Icon */}
      <div className="mb-4 text-blue-500">
        {getIcon()}
      </div>

      {/* Message */}
      <div className="text-gray-900 font-medium mb-2">
        {message}
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="w-full max-w-xs mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress || 0}%` }}
              aria-valuenow={progress || 0}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
              aria-label="Loading progress"
            />
          </div>
          {progress !== undefined && (
            <div className="text-sm text-gray-600 mt-2">
              {progress}%
            </div>
          )}
        </div>
      )}

      {/* Screen Reader Text */}
      <span className="sr-only">{message}</span>
    </div>
  );
}

// ============================================================================
// Inline Loading Component
// ============================================================================

interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function InlineLoading({
  message = 'Loading...',
  size = 'sm',
  className,
}: InlineLoadingProps) {
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div
      className={cn('flex items-center gap-2 text-gray-600', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn('animate-spin', iconSizes[size])} aria-hidden="true" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

// ============================================================================
// Button Loading Component
// ============================================================================

interface ButtonLoadingProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
}

export function ButtonLoading({
  isLoading,
  loadingText,
  children,
  className,
}: ButtonLoadingProps) {
  return (
    <>
      {isLoading ? (
        <div className={cn('flex items-center gap-2', className)}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingText || 'Loading...'}
        </div>
      ) : (
        children
      )}
    </>
  );
}

// ============================================================================
// Skeleton Loading Component
// ============================================================================

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-200 rounded',
        animate && 'animate-pulse',
        className
      )}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// Skeleton Components for Common Patterns
// ============================================================================

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 && 'w-3/4' // Last line shorter
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('border rounded-lg p-4 space-y-3', className)}>
      <Skeleton className="h-6 w-3/4" />
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}
