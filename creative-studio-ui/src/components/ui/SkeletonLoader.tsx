/**
 * Skeleton Loader Component
 * Provides visual loading states with animated skeleton placeholders
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: number | string;
  height?: number | string;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Base skeleton component with variant and animation options
 */
export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-md',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={cn(
        'bg-muted',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={{
        width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      }}
      {...props}
    />
  );
}

/**
 * Single line text skeleton
 */
export function SkeletonText({
  className,
  lines = 1,
  width = '100%',
  lastLineWidth,
  ...props
}: {
  className?: string;
  lines?: number;
  width?: number | string;
  lastLineWidth?: number | string;
  [key: string]: unknown;
}) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 && lastLineWidth ? lastLineWidth : width}
          height={16}
        />
      ))}
    </div>
  );
}

/**
 * Avatar/Circular skeleton for profile images
 */
export function SkeletonAvatar({
  className,
  size = 40,
  ...props
}: {
  className?: string;
  size?: number;
  [key: string]: unknown;
}) {
  return (
    <Skeleton
      className={className}
      variant="circular"
      width={size}
      height={size}
      {...props}
    />
  );
}

/**
 * Card skeleton for content cards
 */
export function SkeletonCard({
  className,
  showAvatar = true,
  showTitle = true,
  showDescription = true,
  lines = 3,
  ...props
}: {
  className?: string;
  showAvatar?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  lines?: number;
  [key: string]: unknown;
}) {
  return (
    <div className={cn('space-y-4 p-4 border rounded-lg', className)} {...props}>
      {/* Header with avatar */}
      {showAvatar && (
        <div className="flex items-center gap-3">
          <SkeletonAvatar size={48} />
          <div className="flex-1 space-y-2">
            {showTitle && (
              <Skeleton variant="text" width="60%" height={20} />
            )}
            {showDescription && (
              <Skeleton variant="text" width="40%" height={14} />
            )}
          </div>
        </div>
      )}
      
      {/* Content lines */}
      <SkeletonText lines={lines} />
      
      {/* Footer */}
      <div className="flex gap-2 pt-2">
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
      </div>
    </div>
  );
}

/**
 * Table row skeleton
 */
export function SkeletonTableRow({
  className,
  columns = 4,
  showActions = true,
  ...props
}: {
  className?: string;
  columns?: number;
  showActions?: boolean;
  [key: string]: unknown;
}) {
  return (
    <div className={cn('flex gap-4 py-3 border-b items-center', className)} {...props}>
      {/* Checkbox */}
      <Skeleton variant="rounded" width={20} height={20} />
      
      {/* Data columns */}
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === 0 ? 120 : i === columns - 1 ? 80 : 100}
          height={16}
        />
      ))}
      
      {/* Actions */}
      {showActions && (
        <div className="flex gap-2 ml-auto">
          <Skeleton variant="rounded" width={32} height={32} />
          <Skeleton variant="rounded" width={32} height={32} />
        </div>
      )}
    </div>
  );
}

/**
 * Media item skeleton for galleries
 */
export function SkeletonMediaItem({
  className,
  aspectRatio = '16/9',
  showInfo = true,
  ...props
}: {
  className?: string;
  aspectRatio?: string;
  showInfo?: boolean;
  [key: string]: unknown;
}) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      <div
        className="bg-muted animate-pulse rounded-md overflow-hidden"
        style={{ aspectRatio }}
      />
      {showInfo && (
        <div className="space-y-1">
          <Skeleton variant="text" width="80%" height={16} />
          <Skeleton variant="text" width="50%" height={12} />
        </div>
      )}
    </div>
  );
}

/**
 * Timeline/Shot skeleton
 */
export function SkeletonTimeline({
  className,
  shots = 5,
  showWaveform = true,
  ...props
}: {
  className?: string;
  shots?: number;
  showWaveform?: boolean;
  [key: string]: unknown;
}) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: shots }).map((_, i) => (
        <div key={i} className="flex gap-3 p-2 border rounded">
          {/* Thumbnail */}
          <Skeleton variant="rounded" width={80} height={50} />
          
          {/* Info */}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" height={18} />
            <Skeleton variant="text" width="30%" height={14} />
            
            {/* Waveform */}
            {showWaveform && (
              <div className="flex items-end gap-0.5 h-8">
                {Array.from({ length: 20 }).map((_, j) => (
                  <Skeleton
                    key={j}
                    variant="rounded"
                    width={3}
                    height={Math.random() * 30 + 10}
                    className="flex-shrink-0"
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Duration */}
          <Skeleton variant="text" width={50} height={14} />
        </div>
      ))}
    </div>
  );
}

/**
 * Form skeleton
 */
export function SkeletonForm({
  className,
  fields = 4,
  showSubmit = true,
  ...props
}: {
  className?: string;
  fields?: number;
  showSubmit?: boolean;
  [key: string]: unknown;
}) {
  return (
    <div className={cn('space-y-6', className)} {...props}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" width={120} height={14} />
          <Skeleton variant="rounded" width="100%" height={40} />
        </div>
      ))}
      
      {showSubmit && (
        <Skeleton variant="rounded" width={120} height={40} className="mt-4" />
      )}
    </div>
  );
}

/**
 * Dashboard widget skeleton
 */
export function SkeletonWidget({
  className,
  title = true,
  chart = true,
  stats = 4,
  ...props
}: {
  className?: string;
  title?: boolean;
  chart?: boolean;
  stats?: number;
  [key: string]: unknown;
}) {
  return (
    <div className={cn('space-y-4 p-4 border rounded-lg', className)} {...props}>
      {title && (
        <Skeleton variant="text" width={150} height={20} />
      )}
      
      {chart && (
        <Skeleton variant="rounded" width="100%" height={150} />
      )}
      
      {stats > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: stats }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton variant="text" width={60} height={12} />
              <Skeleton variant="text" width={80} height={24} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Conversation/Chat skeleton
 */
export function SkeletonConversation({
  className,
  messages = 3,
  ...props
}: {
  className?: string;
  messages?: number;
  [key: string]: unknown;
}) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      {Array.from({ length: messages }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex gap-3',
            i % 2 === 1 && 'flex-row-reverse'
          )}
        >
          <SkeletonAvatar size={32} />
          <div className={cn('space-y-2', i % 2 === 1 && 'items-end')}>
            <Skeleton
              variant="rounded"
              width={Math.random() * 100 + 150}
              height={i === 1 ? 60 : 40}
              className={cn(i % 2 === 1 && '!bg-muted-foreground/20')}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Wizard step skeleton
 */
export function SkeletonWizardStep({
  className,
  steps = 3,
  currentStep = 1,
  ...props
}: {
  className?: string;
  steps?: number;
  currentStep?: number;
  [key: string]: unknown;
}) {
  return (
    <div className={cn('space-y-6', className)} {...props}>
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        {Array.from({ length: steps }).map((_, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <Skeleton
                variant="circular"
                width={32}
                height={32}
                animation={i + 1 < currentStep ? 'none' : 'pulse'}
                className={i + 1 < currentStep ? 'bg-green-500' : ''}
              />
              <Skeleton variant="text" width={60} height={12} />
            </div>
            {i < steps - 1 && (
              <Skeleton
                variant="text"
                width={40}
                height={2}
                className="flex-1 mx-2"
              />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Content area */}
      <SkeletonCard />
    </div>
  );
}

export default Skeleton;


