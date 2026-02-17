/**
 * Camera Angle Editor Skeleton Components
 * 
 * Loading skeleton components for the camera angle editor feature.
 * Provides visual placeholders while content is loading.
 * 
 * Usage:
 * ```tsx
 * {isLoading ? <ResultsGridSkeleton columns={3} /> : <ResultsGrid {...props} />}
 * ```
 */

import React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface SkeletonProps {
  /** Additional CSS classes */
  className?: string;
  /** Animation variant */
  animate?: 'pulse' | 'wave' | 'none';
}

export interface ResultsGridSkeletonProps extends SkeletonProps {
  /** Number of skeleton cards to show */
  count?: number;
  /** Number of columns in the grid */
  columns?: 2 | 3 | 4;
}

export interface AnglePresetSkeletonProps extends SkeletonProps {
  /** Number of skeleton preset cards to show */
  count?: number;
  /** Number of columns in the grid */
  columns?: 2 | 3 | 4;
}

export interface CameraAngleEditorSkeletonProps extends SkeletonProps {
  /** Show options panel skeleton */
  showOptions?: boolean;
}

// ============================================================================
// Base Skeleton Component
// ============================================================================

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  animate = 'pulse',
}) => {
  const animationClass = animate === 'pulse' 
    ? 'animate-pulse' 
    : animate === 'wave' 
      ? 'animate-shimmer' 
      : '';

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700 rounded-md',
        animationClass,
        className
      )}
      aria-hidden="true"
    />
  );
};

// ============================================================================
// Results Grid Skeleton
// ============================================================================

export const ResultsGridSkeleton: React.FC<ResultsGridSkeletonProps> = ({
  count = 6,
  columns = 3,
  className,
  animate = 'pulse',
}) => {
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns];

  return (
    <div className={cn('space-y-4', className)} role="status" aria-label="Loading results">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" animate={animate} />
        <Skeleton className="h-8 w-28" animate={animate} />
      </div>

      {/* Grid skeleton */}
      <div className={cn('grid gap-4', gridClass)}>
        {Array.from({ length: count }).map((_, index) => (
          <ResultCardSkeleton key={index} animate={animate} />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Result Card Skeleton
// ============================================================================

export const ResultCardSkeleton: React.FC<SkeletonProps> = ({
  className,
  animate = 'pulse',
}) => {
  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden',
        className
      )}
    >
      {/* Image skeleton */}
      <Skeleton className="aspect-square w-full" animate={animate} />

      {/* Footer skeleton */}
      <div className="p-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
        <Skeleton className="h-3 w-20" animate={animate} />
        <Skeleton className="h-3 w-12" animate={animate} />
      </div>
    </div>
  );
};

// ============================================================================
// Angle Preset Selector Skeleton
// ============================================================================

export const AnglePresetSelectorSkeleton: React.FC<AnglePresetSkeletonProps> = ({
  count = 8,
  columns = 4,
  className,
  animate = 'pulse',
}) => {
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns];

  return (
    <div className={cn('space-y-4', className)} role="status" aria-label="Loading presets">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" animate={animate} />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" animate={animate} />
          <Skeleton className="h-8 w-28" animate={animate} />
        </div>
      </div>

      {/* Grid skeleton */}
      <div className={cn('grid gap-3', gridClass)}>
        {Array.from({ length: count }).map((_, index) => (
          <AnglePresetCardSkeleton key={index} animate={animate} />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Angle Preset Card Skeleton
// ============================================================================

export const AnglePresetCardSkeleton: React.FC<SkeletonProps> = ({
  className,
  animate = 'pulse',
}) => {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Icon skeleton */}
      <Skeleton className="w-8 h-8 mb-2 rounded-full" animate={animate} />

      {/* Title skeleton */}
      <Skeleton className="h-4 w-20 mb-1" animate={animate} />

      {/* Description skeleton */}
      <Skeleton className="h-3 w-full" animate={animate} />
    </div>
  );
};

// ============================================================================
// Camera Angle Editor Skeleton
// ============================================================================

export const CameraAngleEditorSkeleton: React.FC<CameraAngleEditorSkeletonProps> = ({
  showOptions = true,
  className,
  animate = 'pulse',
}) => {
  return (
    <div className={cn('flex flex-col h-full', className)} role="status" aria-label="Loading editor">
      {/* Header skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded" animate={animate} />
          <Skeleton className="h-6 w-48" animate={animate} />
        </div>
        <Skeleton className="w-8 h-8 rounded" animate={animate} />
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Source Image Section */}
        <section>
          <Skeleton className="h-5 w-28 mb-3" animate={animate} />
          <div className="flex gap-4">
            <Skeleton className="w-40 h-40 rounded-lg" animate={animate} />
            <div className="flex-1 flex flex-col justify-center gap-2">
              <Skeleton className="h-9 w-full" animate={animate} />
              <Skeleton className="h-9 w-32" animate={animate} />
            </div>
          </div>
        </section>

        {/* Angle Preset Selector Skeleton */}
        <section>
          <AnglePresetSelectorSkeleton count={8} columns={4} animate={animate} />
        </section>

        {/* Options Section */}
        {showOptions && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="w-4 h-4 rounded" animate={animate} />
              <Skeleton className="h-5 w-40" animate={animate} />
            </div>
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {/* Preserve Style */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-36" animate={animate} />
                <Skeleton className="w-10 h-5 rounded-full" animate={animate} />
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" animate={animate} />
                <Skeleton className="h-10 w-full" animate={animate} />
              </div>

              {/* Custom Prompt */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-44" animate={animate} />
                <Skeleton className="h-20 w-full" animate={animate} />
              </div>
            </div>
          </section>
        )}

        {/* Results Grid Skeleton */}
        <section>
          <ResultsGridSkeleton count={6} columns={3} animate={animate} />
        </section>
      </div>

      {/* Footer skeleton */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <Skeleton className="h-9 w-24" animate={animate} />
        <Skeleton className="h-9 w-36" animate={animate} />
      </div>
    </div>
  );
};

// ============================================================================
// Source Image Skeleton
// ============================================================================

export const SourceImageSkeleton: React.FC<SkeletonProps> = ({
  className,
  animate = 'pulse',
}) => {
  return (
    <div className={cn('flex gap-4', className)}>
      {/* Image preview skeleton */}
      <Skeleton className="w-40 h-40 rounded-lg border-2 border-dashed" animate={animate} />

      {/* Upload controls skeleton */}
      <div className="flex-1 flex flex-col justify-center gap-2">
        <Skeleton className="h-9 w-full" animate={animate} />
        <Skeleton className="h-9 w-32" animate={animate} />
      </div>
    </div>
  );
};

// ============================================================================
// Generation Options Skeleton
// ============================================================================

export const GenerationOptionsSkeleton: React.FC<SkeletonProps> = ({
  className,
  animate = 'pulse',
}) => {
  return (
    <div className={cn('space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg', className)}>
      {/* Preserve Style */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-36" animate={animate} />
        <Skeleton className="w-10 h-5 rounded-full" animate={animate} />
      </div>

      {/* Quality */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" animate={animate} />
        <Skeleton className="h-10 w-full" animate={animate} />
      </div>

      {/* Custom Prompt */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-44" animate={animate} />
        <Skeleton className="h-20 w-full" animate={animate} />
      </div>
    </div>
  );
};

// ============================================================================
// Exports
// ============================================================================

export default Skeleton;
