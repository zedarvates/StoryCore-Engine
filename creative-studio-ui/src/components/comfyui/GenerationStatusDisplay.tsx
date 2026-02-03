/**
 * GenerationStatusDisplay Component
 * 
 * Displays current generation status with progress tracking for ComfyUI integration.
 * Shows current step description, progress bar, item counters, and timing information.
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

/**
 * Generation progress information
 */
export interface GenerationProgress {
  /** Current step description */
  currentStep: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current item number */
  currentItem: number;
  /** Total number of items */
  totalItems: number;
  /** Start time timestamp */
  startTime?: number;
  /** Estimated completion timestamp */
  estimatedCompletion?: number;
  /** Current stage */
  stage: 'idle' | 'grid' | 'comfyui' | 'promotion' | 'qa' | 'export' | 'complete' | 'error';
  /** Error message if any */
  error?: string;
}

/**
 * Props for GenerationStatusDisplay component
 */
export interface GenerationStatusDisplayProps {
  /** Current generation progress */
  progress: GenerationProgress;
  /** Optional CSS class name */
  className?: string;
  /** Whether to show in compact mode */
  compact?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Get color class for progress bar based on stage
 */
function getProgressColor(stage: GenerationProgress['stage']): string {
  switch (stage) {
    case 'grid':
      return 'bg-blue-500';
    case 'comfyui':
      return 'bg-purple-500';
    case 'promotion':
      return 'bg-indigo-500';
    case 'qa':
      return 'bg-cyan-500';
    case 'export':
      return 'bg-green-500';
    case 'complete':
      return 'bg-green-600';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

/**
 * Get status icon based on stage
 */
function getStatusIcon(stage: GenerationProgress['stage']) {
  switch (stage) {
    case 'complete':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'idle':
      return null;
    default:
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * GenerationStatusDisplay Component
 * 
 * Displays real-time generation progress with step description, progress bar,
 * item counters, and timing information.
 * 
 * Requirements: 8.1, 8.2, 8.3
 */
export const GenerationStatusDisplay: React.FC<GenerationStatusDisplayProps> = ({
  progress,
  className = '',
  compact = false,
}) => {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [estimatedRemaining, setEstimatedRemaining] = useState<number>(0);

  // ============================================================================
  // Update Timing Information
  // ============================================================================

  useEffect(() => {
    if (!progress.startTime || progress.stage === 'idle') {
      setElapsedTime(0);
      setEstimatedRemaining(0);
      return;
    }

    const updateTiming = () => {
      const now = Date.now();
      const elapsed = now - (progress.startTime || now);
      setElapsedTime(elapsed);

      if (progress.estimatedCompletion) {
        const remaining = Math.max(0, progress.estimatedCompletion - now);
        setEstimatedRemaining(remaining);
      } else {
        setEstimatedRemaining(0);
      }
    };

    // Initial update
    updateTiming();

    // Update every second
    const interval = setInterval(updateTiming, 1000);

    return () => clearInterval(interval);
  }, [progress.startTime, progress.estimatedCompletion, progress.stage]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const isActive = progress.stage !== 'idle' && progress.stage !== 'complete' && progress.stage !== 'error';
  const isComplete = progress.stage === 'complete';
  const hasError = progress.stage === 'error';

  // ============================================================================
  // Compact Mode Render
  // ============================================================================

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {getStatusIcon(progress.stage)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate">{progress.currentStep}</span>
            <span className="text-sm text-muted-foreground ml-2">{Math.round(progress.progress)}%</span>
          </div>
          <Progress value={progress.progress} className="h-1.5" />
        </div>
      </div>
    );
  }

  // ============================================================================
  // Full Mode Render
  // ============================================================================

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {getStatusIcon(progress.stage)}
          Generation Progress
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Step Description */}
        {/* Requirements: 8.1 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Step</span>
            <span className="text-sm text-muted-foreground">
              {progress.currentStep || 'Idle'}
            </span>
          </div>
        </div>

        {/* Progress Bar with Percentage */}
        {/* Requirements: 8.2 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress.progress)}%
            </span>
          </div>
          <Progress 
            value={progress.progress} 
            className="h-2"
            style={{
              // @ts-ignore - CSS custom property
              '--progress-color': getProgressColor(progress.stage),
            }}
          />
        </div>

        {/* Current Item / Total Items Counter */}
        {/* Requirements: 8.2 */}
        {progress.totalItems > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Items</span>
            <span className="text-sm font-mono">
              {progress.currentItem} / {progress.totalItems}
            </span>
          </div>
        )}

        {/* Elapsed Time and Estimated Remaining Time */}
        {/* Requirements: 8.3 */}
        {isActive && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Elapsed</span>
              </div>
              <span className="text-sm font-mono font-semibold">
                {formatDuration(elapsedTime)}
              </span>
            </div>

            <div className="flex flex-col gap-1 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Remaining</span>
              </div>
              <span className="text-sm font-mono font-semibold">
                {estimatedRemaining > 0 ? formatDuration(estimatedRemaining) : '--'}
              </span>
            </div>
          </div>
        )}

        {/* Completion Summary */}
        {isComplete && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                Generation completed in {formatDuration(elapsedTime)}
              </span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {hasError && progress.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-red-900 block mb-1">
                  Generation Failed
                </span>
                <span className="text-sm text-red-700">
                  {progress.error}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GenerationStatusDisplay;
