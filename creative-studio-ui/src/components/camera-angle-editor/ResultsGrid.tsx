/**
 * ResultsGrid Component
 * 
 * Displays generated camera angle images in a grid layout.
 * Shows angle labels, download buttons, and handles loading/error states.
 * 
 * Usage:
 * ```tsx
 * <ResultsGrid
 *   results={generationResults}
 *   onDownload={(result) => handleDownload(result)}
 *   onDownloadAll={() => handleDownloadAll()}
 *   isLoading={isGenerating}
 *   progress={75}
 *   error={null}
 * />
 * ```
 */

import React from 'react';
import { Download, Loader2, AlertCircle, ImageOff, RefreshCw, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { CameraAngleResult, CameraAnglePresetMetadata } from '@/types/cameraAngle';

// ============================================================================
// Types
// ============================================================================

export interface ResultsGridProps {
  /** Generated results to display */
  results: CameraAngleResult[];
  /** Available presets for label lookup */
  presets?: CameraAnglePresetMetadata[];
  /** Callback when downloading a single result */
  onDownload?: (result: CameraAngleResult) => void;
  /** Callback when downloading all results */
  onDownloadAll?: () => void;
  /** Whether generation is in progress */
  isLoading?: boolean;
  /** Current progress percentage (0-100) */
  progress?: number;
  /** Current step description */
  currentStep?: string | null;
  /** Error message if generation failed */
  error?: string | null;
  /** Callback to retry generation */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Number of columns in the grid */
  columns?: 2 | 3 | 4;
}

// ============================================================================
// Component
// ============================================================================

export const ResultsGrid: React.FC<ResultsGridProps> = ({
  results,
  presets = [],
  onDownload,
  onDownloadAll,
  isLoading = false,
  progress = 0,
  currentStep = null,
  error = null,
  onRetry,
  className,
  columns = 3,
}) => {
  /**
   * Get preset display name by ID
   */
  const getPresetLabel = (angleId: string): string => {
    const preset = presets.find((p) => p.id === angleId);
    return preset?.displayName || angleId;
  };

  /**
   * Get grid columns class
   */
  const getGridClass = () => {
    switch (columns) {
      case 2:
        return 'grid-cols-2';
      case 4:
        return 'grid-cols-4';
      case 3:
      default:
        return 'grid-cols-3';
    }
  };

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Generating Camera Angles...
          </p>
          {currentStep && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {currentStep}
            </p>
          )}
          <div className="mt-4 w-64">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              {progress}% complete
            </p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Generation Failed
          </p>
          <p className="text-sm text-red-500 mt-1 max-w-md">
            {error}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  /**
   * Render empty state
   */
  if (results.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <ImageOff className="w-12 h-12 text-gray-400 mb-4" />
        <div className="text-center">
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
            No Results Yet
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Select camera angles and click Generate to create variations
          </p>
        </div>
      </div>
    );
  }

  /**
   * Render results grid
   */
  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with download all button */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Generated Images ({results.length})
        </p>
        {onDownloadAll && results.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadAll}
            className="text-xs"
          >
            <Package className="w-4 h-4 mr-2" />
            Download All
          </Button>
        )}
      </div>

      {/* Results grid */}
      <div
        className={cn('grid gap-4', getGridClass())}
        role="list"
        aria-label="Generated camera angle images"
      >
        {results.map((result) => (
          <div
            key={result.id}
            className="group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            role="listitem"
          >
            {/* Image container */}
            <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-900">
              <img
                src={result.generatedImageBase64.startsWith('data:')
                  ? result.generatedImageBase64
                  : `data:image/png;base64,${result.generatedImageBase64}`}
                alt={`Camera angle: ${getPresetLabel(result.angleId)}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Hover overlay with download button */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {onDownload && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onDownload(result)}
                    className="bg-white/90 hover:bg-white text-gray-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>

            {/* Label footer */}
            <div className="p-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                {getPresetLabel(result.angleId)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {result.generationTimeSeconds.toFixed(1)}s
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Exports
// ============================================================================

export default ResultsGrid;
