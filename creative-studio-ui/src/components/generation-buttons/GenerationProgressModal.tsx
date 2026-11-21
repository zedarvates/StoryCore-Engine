/**
 * Generation Progress Modal Component
 * 
 * Displays real-time progress for generation tasks in the generation-buttons-ui feature.
 * Shows stage-by-stage progress (prompt → image → video → audio), estimated time remaining,
 * and provides cancel/retry functionality.
 * 
 * Requirements: 7.1, 7.3, 7.4, 7.5
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Loader2, XCircle, Sparkles, Image, Video, Music } from 'lucide-react';
import type { GenerationProgress } from '@/types/generation';
import { TwoStageVideoProgress } from './TwoStageVideoProgress';
import {
  useFocusTrap,
  useProgressAnnouncer,
  useErrorAnnouncer,
  getProgressAriaLabel,
  getTimeRemainingAriaLabel,
} from '@/hooks/useAccessibility';
import { debounce } from '@/utils/assetOptimization';

// ============================================================================
// Types
// ============================================================================

/**
 * Generation type for the modal
 */
export type GenerationType = 'prompt' | 'image' | 'video' | 'audio';

/**
 * Props for GenerationProgressModal component
 */
export interface GenerationProgressModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Type of generation being performed */
  generationType: GenerationType;
  /** Current generation progress */
  progress: GenerationProgress;
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
  /** Callback when close button is clicked (after completion or error) */
  onClose?: () => void;
  /** Callback when retry button is clicked (after error) */
  onRetry?: () => void;
}

/**
 * Stage information for display
 */
interface StageInfo {
  key: GenerationType;
  name: string;
  icon: React.ReactNode;
  description: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Pipeline stages configuration
 * Requirements: 7.1
 */
const PIPELINE_STAGES: StageInfo[] = [
  {
    key: 'prompt',
    name: 'Prompt Generation',
    icon: <Sparkles className="h-4 w-4" />,
    description: 'Generating optimized prompt',
  },
  {
    key: 'image',
    name: 'Image Generation',
    icon: <Image className="h-4 w-4" />,
    description: 'Creating image with Flux Turbo',
  },
  {
    key: 'video',
    name: 'Video Generation',
    icon: <Video className="h-4 w-4" />,
    description: 'Generating video with LTX2 i2v',
  },
  {
    key: 'audio',
    name: 'Audio Generation',
    icon: <Music className="h-4 w-4" />,
    description: 'Creating audio with TTS',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format duration in milliseconds to human-readable string
 * Requirements: 7.3
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Get stage status based on current generation type and progress
 * Requirements: 7.1
 */
function getStageStatus(
  stageKey: GenerationType,
  currentType: GenerationType,
  isComplete: boolean,
  hasError: boolean
): 'pending' | 'in-progress' | 'complete' | 'error' {
  const stageOrder: GenerationType[] = ['prompt', 'image', 'video', 'audio'];
  const stageIndex = stageOrder.indexOf(stageKey);
  const currentIndex = stageOrder.indexOf(currentType);

  if (hasError) {
    if (stageIndex < currentIndex) return 'complete';
    if (stageIndex === currentIndex) return 'error';
    return 'pending';
  }

  if (isComplete) {
    return 'complete';
  }

  if (stageIndex < currentIndex) return 'complete';
  if (stageIndex === currentIndex) return 'in-progress';
  return 'pending';
}

/**
 * Get progress color based on status
 */
function getProgressColor(status: 'pending' | 'in-progress' | 'complete' | 'error'): string {
  switch (status) {
    case 'complete':
      return 'hsl(142, 76%, 36%)'; // green
    case 'in-progress':
      return 'hsl(221, 83%, 53%)'; // blue
    case 'error':
      return 'hsl(0, 84%, 60%)'; // red
    default:
      return 'hsl(240, 5%, 64%)'; // gray
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * GenerationProgressModal Component
 * 
 * Displays generation progress with real-time updates, stage indicators,
 * timing information, and error handling capabilities.
 * 
 * Requirements: 7.1, 7.3, 7.4, 7.5
 */
export function GenerationProgressModal({
  isOpen,
  generationType,
  progress,
  onCancel,
  onClose,
  onRetry,
}: GenerationProgressModalProps) {
  const [startTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [debouncedProgress, setDebouncedProgress] = useState<GenerationProgress>(progress);
  
  // Accessibility hooks
  const focusTrapRef = useFocusTrap(isOpen);
  
  // Debounce progress updates to reduce re-renders
  // Requirements: Performance
  const updateProgress = useCallback(
    debounce((newProgress: GenerationProgress) => {
      setDebouncedProgress(newProgress);
    }, 200), // Update at most every 200ms
    []
  );
  
  // Update debounced progress when progress changes
  useEffect(() => {
    updateProgress(progress);
  }, [progress, updateProgress]);
  
  // Determine generation state
  const isComplete = debouncedProgress.overallProgress >= 100 && debouncedProgress.message.toLowerCase().includes('complete');
  const hasError = debouncedProgress.message.toLowerCase().includes('error') || debouncedProgress.message.toLowerCase().includes('fail');
  const isGenerating = !isComplete && !hasError;
  
  // Announce progress updates
  useProgressAnnouncer(
    debouncedProgress.overallProgress,
    `${generationType} generation`,
    isGenerating
  );
  
  // Announce errors
  useErrorAnnouncer(hasError ? debouncedProgress.message : null);

  /**
   * Update elapsed time every second
   * Requirements: 7.3
   */
  useEffect(() => {
    if (!isOpen) {
      setElapsedTime(0);
      return;
    }

    const updateElapsed = () => {
      setElapsedTime(Date.now() - startTime);
    };

    // Initial update
    updateElapsed();

    // Update every second
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isOpen, startTime]);

  /**
   * Get dialog title based on status
   */
  const getDialogTitle = (): string => {
    if (hasError) return 'Generation Failed';
    if (isComplete) return 'Generation Complete';
    
    const stage = PIPELINE_STAGES.find(s => s.key === generationType);
    return stage ? stage.name : 'Generating...';
  };

  /**
   * Get dialog description based on status
   */
  const getDialogDescription = (): string => {
    if (hasError) {
      return 'An error occurred during generation. You can retry or cancel.';
    }
    if (isComplete) {
      return 'Your content has been generated successfully!';
    }
    return debouncedProgress.message || 'Processing your request...';
  };

  /**
   * Build stage information array with status
   * Requirements: 7.1
   */
  const stages = PIPELINE_STAGES.map(stage => ({
    ...stage,
    status: getStageStatus(stage.key, generationType, isComplete, hasError),
  }));

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Only allow closing if not generating or if onClose is provided
        if (!open && (!isGenerating || onClose)) {
          onClose?.();
        }
      }}
    >
      <DialogContent
        ref={focusTrapRef}
        className="sm:max-w-[600px]"
        onInteractOutside={(e) => {
          // Prevent closing while generating
          if (isGenerating) {
            e.preventDefault();
          }
        }}
        aria-describedby="generation-progress-description"
        aria-live="polite"
        aria-atomic="false"
        role="dialog"
        aria-modal="true"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasError && <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />}
            {isComplete && <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />}
            {isGenerating && <Loader2 className="h-5 w-5 animate-spin text-blue-500" aria-hidden="true" />}
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription id="generation-progress-description">
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Two-Stage Video Progress (for video generation only) */}
          {/* Requirements: 3.2 */}
          {generationType === 'video' && isGenerating && (
            <TwoStageVideoProgress 
              progress={progress}
              isComplete={isComplete}
            />
          )}
          
          {/* Overall Progress Bar (for non-video or completed video) */}
          {/* Requirements: 7.1, 7.3 */}
          {(generationType !== 'video' || !isGenerating) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-muted-foreground">
                  {Math.round(debouncedProgress.overallProgress)}%
                </span>
              </div>
              <Progress
                value={debouncedProgress.overallProgress}
                className="h-2"
                aria-label={getProgressAriaLabel(debouncedProgress.overallProgress)}
                aria-valuenow={Math.round(debouncedProgress.overallProgress)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          )}

          {/* Stage Progress (if different from overall) - for non-video only */}
          {/* Requirements: 7.1 */}
          {generationType !== 'video' && debouncedProgress.stageProgress !== debouncedProgress.overallProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Stage Progress</span>
                <span className="text-muted-foreground">
                  {Math.round(debouncedProgress.stageProgress)}%
                </span>
              </div>
              <Progress
                value={debouncedProgress.stageProgress}
                className="h-2"
                aria-label={getProgressAriaLabel(debouncedProgress.stageProgress, debouncedProgress.stage)}
                aria-valuenow={Math.round(debouncedProgress.stageProgress)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          )}

          {/* Pipeline Stage Indicators */}
          {/* Requirements: 7.1 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Pipeline Stages</h4>
            <div className="space-y-2">
              {stages.map((stage) => (
                <div
                  key={stage.key}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  style={{
                    borderColor: stage.status === 'in-progress' ? getProgressColor(stage.status) : undefined,
                    backgroundColor: stage.status === 'in-progress' ? `${getProgressColor(stage.status)}10` : undefined,
                  }}
                >
                  {/* Stage Icon/Status */}
                  <div className="flex-shrink-0">
                    {stage.status === 'complete' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" aria-label="Complete" />
                    )}
                    {stage.status === 'in-progress' && (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" aria-label="In progress" />
                    )}
                    {stage.status === 'error' && (
                      <XCircle className="h-5 w-5 text-red-500" aria-label="Error" />
                    )}
                    {stage.status === 'pending' && (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" aria-label="Pending" />
                    )}
                  </div>

                  {/* Stage Name and Icon */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{stage.icon}</span>
                      <span className="text-sm font-medium">{stage.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stage.description}
                    </p>
                  </div>

                  {/* Stage Status Text */}
                  <div className="text-xs text-muted-foreground">
                    {stage.status === 'complete' && 'Complete'}
                    {stage.status === 'in-progress' && 'In Progress'}
                    {stage.status === 'error' && 'Failed'}
                    {stage.status === 'pending' && 'Pending'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timing Information */}
          {/* Requirements: 7.3, 7.4 */}
          <div className="grid grid-cols-2 gap-4" role="region" aria-label="Generation timing information">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground mb-1">Elapsed Time</div>
              <div 
                className="text-lg font-semibold" 
                aria-live="polite"
                aria-label={`Elapsed time: ${formatDuration(elapsedTime)}`}
              >
                {formatDuration(elapsedTime)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground mb-1">
                {isComplete ? 'Total Time' : 'Est. Remaining'}
              </div>
              <div 
                className="text-lg font-semibold" 
                aria-live="polite"
                aria-label={
                  isComplete
                    ? `Total time: ${formatDuration(elapsedTime)}`
                    : debouncedProgress.estimatedTimeRemaining > 0
                    ? getTimeRemainingAriaLabel(debouncedProgress.estimatedTimeRemaining)
                    : 'Estimated time remaining: calculating'
                }
              >
                {isComplete
                  ? formatDuration(elapsedTime)
                  : debouncedProgress.estimatedTimeRemaining > 0
                  ? formatDuration(debouncedProgress.estimatedTimeRemaining)
                  : '--'}
              </div>
            </div>
          </div>

          {/* Current Stage Message (for non-video only) */}
          {/* Requirements: 7.1 */}
          {generationType !== 'video' && isGenerating && debouncedProgress.stage && (
            <div className="rounded-lg bg-muted p-3">
              <div className="text-xs text-muted-foreground mb-1">Current Stage</div>
              <div className="text-sm font-medium">{debouncedProgress.stage}</div>
            </div>
          )}

          {/* Error Display */}
          {/* Requirements: 7.5 */}
          {hasError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">
                    Error Details
                  </h4>
                  <p className="text-sm text-red-700">{debouncedProgress.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {isComplete && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4" role="status">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-green-900 mb-1">
                    Generation Successful
                  </h4>
                  <p className="text-sm text-green-700">
                    Your content has been generated and is ready to use.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {/* Cancel Button (only during generation if cancellable) */}
          {/* Requirements: 7.5 */}
          {isGenerating && debouncedProgress.cancellable && onCancel && (
            <Button 
              variant="outline" 
              onClick={onCancel}
              aria-label="Cancel generation"
            >
              Cancel
            </Button>
          )}

          {/* Retry Button (only on error) */}
          {/* Requirements: 7.5 */}
          {hasError && onRetry && (
            <Button 
              variant="default" 
              onClick={onRetry}
              aria-label="Retry generation"
            >
              Retry
            </Button>
          )}

          {/* Close Button (on error or completion) */}
          {(hasError || isComplete) && onClose && (
            <Button
              variant={hasError ? 'outline' : 'default'}
              onClick={onClose}
              aria-label={hasError ? 'Close modal' : 'View results'}
            >
              {hasError ? 'Close' : 'View Results'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GenerationProgressModal;
