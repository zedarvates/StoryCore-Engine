import React from 'react';
import { Loader2, Save, RefreshCw, Activity } from 'lucide-react';
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
  message = 'Initializing Matrix...',
  size = 'md',
  className,
  showProgress = false,
  progress,
  variant = 'spinner',
}: LoadingStateProps) {
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  };

  const getIcon = () => {
    const iconClass = cn('animate-spin text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]', iconSizes[size]);

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
        'flex flex-col items-center justify-center p-12 text-center bg-black/20 backdrop-blur-sm rounded-lg border border-primary/10',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 bg-primary/2 rounded-lg pointer-events-none" />

      {/* Icon */}
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse rounded-full" />
        <div className="relative z-10">
          {getIcon()}
        </div>
      </div>

      {/* Message */}
      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2 font-mono">
        {message}
      </div>

      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-3 w-3 text-primary/40 animate-pulse" />
        <span className="text-[8px] uppercase font-bold tracking-widest text-primary/40">Syncing Neural Nodes</span>
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="w-full max-w-sm mt-2">
          <div className="w-full bg-primary/10 rounded-none h-1.5 border border-primary/20 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
              style={{ width: `${progress || 0}%` }}
              aria-valuenow={progress || 0}
              aria-valuemin={0}
              aria-valuemax={100}
              role="progressbar"
              aria-label="Loading progress"
            >
              <div className="h-full w-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] animate-[shimmer_2s_infinite] bg-[length:50%_100%] bg-no-repeat" />
            </div>
          </div>
          {progress !== undefined && (
            <div className="text-[10px] font-black font-mono text-primary/60 mt-3 tracking-widest uppercase">
              Download status: <span className="text-primary">{progress}%</span> complete
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

export function InlineLoading({
  message = 'Processing...',
  size = 'sm',
  className,
}: { message?: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div
      className={cn('flex items-center gap-2 text-primary/60 font-mono text-[10px] uppercase font-bold tracking-widest', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn('animate-spin text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]', iconSizes[size])} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

// ============================================================================
// Button Loading Component
// ============================================================================

export function ButtonLoading({
  isLoading,
  loadingText,
  children,
  className,
}: { isLoading: boolean; loadingText?: string; children: React.ReactNode; className?: string }) {
  return (
    <>
      {isLoading ? (
        <div className={cn('flex items-center gap-2 text-[10px] font-black uppercase tracking-widest', className)}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {loadingText || 'Materializing...'}
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

export function Skeleton({ className, animate = true }: { className?: string; animate?: boolean }) {
  return (
    <div
      className={cn(
        'bg-primary/5 border border-primary/10 rounded-sm relative overflow-hidden',
        animate && 'after:content-[""] after:absolute after:inset-0 after:bg-[linear-gradient(90deg,transparent,rgba(var(--primary-rgb),0.05),transparent)] after:animate-[shimmer_2s_infinite] after:bg-[length:200%_100%]',
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
            'h-3',
            i === lines - 1 && lines > 1 && 'w-3/4' // Last line shorter
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('border-2 border-primary/10 p-6 space-y-4 bg-black/20 backdrop-blur-sm rounded-none clip-path-polygon-[0_0,100%_0,100%_80%,90%_100%,0_100%]', className)}>
      <Skeleton className="h-5 w-2/3 mb-2" />
      <SkeletonText lines={3} />
      <div className="flex gap-3 mt-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
