/**
 * Loading States and Progress Indicators
 * 
 * Reusable components for showing loading states throughout the application
 * Requirements: 2.8
 */

import { Loader2 } from 'lucide-react';

/**
 * Spinner component for inline loading states
 */
export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />
  );
}

/**
 * Full-page loading overlay
 */
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center gap-4 shadow-lg">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Progress bar component
 */
export function ProgressBar({
  progress,
  label,
  showPercentage = true,
}: {
  progress: number;
  label?: string;
  showPercentage?: boolean;
}) {
  const percentage = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{label}</span>
          {showPercentage && (
            <span className="text-sm text-muted-foreground">{percentage.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for content placeholders
 */
export function Skeleton({ className = '', variant = 'default' }: { className?: string; variant?: 'default' | 'text' | 'circular' }) {
  const variantClasses = {
    default: 'rounded-md',
    text: 'rounded h-4',
    circular: 'rounded-full',
  };

  return (
    <div
      className={`animate-pulse bg-muted ${variantClasses[variant]} ${className}`}
    />
  );
}

/**
 * Skeleton loader for shot cards
 */
export function ShotCardSkeleton() {
  return (
    <div className="bg-card border-2 border-border rounded-lg overflow-hidden">
      {/* Shot Preview Skeleton */}
      <Skeleton className="aspect-video w-full" />

      {/* Shot Info Skeleton */}
      <div className="p-3 space-y-2">
        <Skeleton variant="text" className="w-3/4" />
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton variant="text" className="w-20" />
          <Skeleton variant="text" className="w-12" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for asset cards
 */
export function AssetCardSkeleton() {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md border border-border">
      <Skeleton variant="circular" className="w-12 h-12 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-3/4" />
        <Skeleton variant="text" className="w-1/2" />
      </div>
    </div>
  );
}

/**
 * Loading state for wizard generation
 */
export function WizardGenerationLoading({
  stage,
  progress,
}: {
  stage: string;
  progress: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <Spinner size="lg" className="mb-6" />
      <h3 className="text-lg font-semibold mb-2">Generating Content</h3>
      <p className="text-sm text-muted-foreground mb-6 text-center">{stage}</p>
      <ProgressBar progress={progress} showPercentage={true} />
    </div>
  );
}

/**
 * Loading state for batch operations
 */
export function BatchOperationLoading({
  current,
  total,
  itemName,
}: {
  current: number;
  total: number;
  itemName: string;
}) {
  const progress = (current / total) * 100;

  return (
    <div className="flex flex-col items-center justify-center py-8 px-6">
      <Spinner size="md" className="mb-4" />
      <p className="text-sm font-medium mb-2">
        Processing {itemName} {current} of {total}
      </p>
      <ProgressBar progress={progress} showPercentage={false} />
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <Icon className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
