import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingAnnouncement } from './LiveRegion';

// ============================================================================
// Loading Spinner Component
// ============================================================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Simple loading spinner component
 * 
 * @param size - Size of the spinner (sm: 16px, md: 24px, lg: 32px)
 * @param className - Optional CSS classes
 */
export function LoadingSpinner({
  size = 'md',
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2 
      className={cn('animate-spin text-primary', sizeClasses[size], className)} 
      aria-hidden="true"
    />
  );
}

// ============================================================================
// Loading Overlay Component
// ============================================================================

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Loading overlay that covers content while loading
 * Prevents interaction with underlying content
 * 
 * @param isLoading - Whether to show the loading overlay
 * @param message - Optional loading message
 * @param children - Content to overlay
 * @param className - Optional CSS classes
 */
export function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  children,
  className,
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      
      {isLoading && (
        <>
          <LoadingAnnouncement isLoading={isLoading} loadingMessage={message} />
          <div 
            className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="flex flex-col items-center gap-3">
              <LoadingSpinner size="lg" />
              <p className="text-sm font-medium text-gray-700">{message}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Button Loading State Component
// ============================================================================

interface ButtonLoadingProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Button content with loading state
 * Shows spinner and optional loading text when loading
 * 
 * @param isLoading - Whether the button is in loading state
 * @param loadingText - Optional text to show when loading
 * @param children - Button content when not loading
 * @param className - Optional CSS classes
 */
export function ButtonLoading({
  isLoading,
  loadingText,
  children,
  className,
}: ButtonLoadingProps) {
  if (isLoading) {
    return (
      <span className={cn('flex items-center gap-2', className)}>
        <LoadingSpinner size="sm" />
        {loadingText || children}
      </span>
    );
  }

  return <>{children}</>;
}

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
  className?: string;
}

/**
 * Progress bar component for showing completion status
 * 
 * @param value - Current progress value (0-100)
 * @param max - Maximum value (default: 100)
 * @param label - Optional label text
 * @param showPercentage - Whether to show percentage text
 * @param size - Size of the progress bar
 * @param variant - Color variant
 * @param className - Optional CSS classes
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  size = 'md',
  variant = 'default',
  className,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2 text-sm">
          {label && <span className="font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-gray-500">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      
      <div 
        className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-in-out',
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Indeterminate Progress Component
// ============================================================================

interface IndeterminateProgressProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Indeterminate progress indicator for unknown duration operations
 * 
 * @param label - Optional label text
 * @param size - Size of the progress bar
 * @param className - Optional CSS classes
 */
export function IndeterminateProgress({
  label,
  size = 'md',
  className,
}: IndeterminateProgressProps) {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="mb-2 text-sm font-medium text-gray-700">
          {label}
        </div>
      )}
      
      <div 
        className={cn('w-full bg-gray-200 rounded-full overflow-hidden', sizeClasses[size])}
        role="progressbar"
        aria-label={label || 'Loading'}
        aria-busy="true"
      >
        <div className="h-full bg-primary animate-indeterminate-progress" />
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton Loader Component
// ============================================================================

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
}

/**
 * Skeleton loader for content placeholders
 * 
 * @param variant - Shape of the skeleton
 * @param width - Width of the skeleton
 * @param height - Height of the skeleton
 * @param className - Optional CSS classes
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  className,
}: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        'bg-gray-200 animate-pulse',
        variantClasses[variant],
        className
      )}
      style={style}
      role="status"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// ============================================================================
// Loading Card Component
// ============================================================================

interface LoadingCardProps {
  lines?: number;
  showAvatar?: boolean;
  className?: string;
}

/**
 * Loading card with skeleton placeholders
 * Useful for loading states in lists or grids
 * 
 * @param lines - Number of text lines to show
 * @param showAvatar - Whether to show an avatar skeleton
 * @param className - Optional CSS classes
 */
export function LoadingCard({
  lines = 3,
  showAvatar = false,
  className,
}: LoadingCardProps) {
  return (
    <div className={cn('p-4 border rounded-lg', className)} role="status" aria-label="Loading card">
      <div className="flex items-start gap-4">
        {showAvatar && (
          <Skeleton variant="circular" width={48} height={48} />
        )}
        <div className="flex-1 space-y-3">
          {Array.from({ length: lines }).map((_, index) => (
            <Skeleton
              key={index}
              width={index === lines - 1 ? '60%' : '100%'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Estimated Time Remaining Component
// ============================================================================

interface EstimatedTimeProps {
  seconds: number;
  className?: string;
}

/**
 * Display estimated time remaining for long operations
 * 
 * @param seconds - Estimated seconds remaining
 * @param className - Optional CSS classes
 */
export function EstimatedTime({
  seconds,
  className,
}: EstimatedTimeProps) {
  const formatTime = (secs: number): string => {
    if (secs < 60) {
      return `${Math.round(secs)} seconds`;
    } else if (secs < 3600) {
      const minutes = Math.floor(secs / 60);
      const remainingSeconds = Math.round(secs % 60);
      return remainingSeconds > 0
        ? `${minutes} min ${remainingSeconds} sec`
        : `${minutes} min`;
    } else {
      const hours = Math.floor(secs / 3600);
      const minutes = Math.floor((secs % 3600) / 60);
      return minutes > 0
        ? `${hours} hr ${minutes} min`
        : `${hours} hr`;
    }
  };

  return (
    <div className={cn('text-sm text-gray-500', className)} role="timer" aria-live="polite">
      Estimated time remaining: <span className="font-medium">{formatTime(seconds)}</span>
    </div>
  );
}
