/**
 * Generation Progress Modal Component
 * 
 * Displays detailed progress during sequence generation through the StoryCore pipeline.
 * Shows stage-by-stage progress indicators, current shot processing, elapsed time,
 * estimated completion time, and error handling with retry functionality.
 * 
 * Requirements: 3.6, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { useEffect, useState, useRef } from 'react';
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
import { AlertCircle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useFocusManagement } from '../hooks/useFocusManagement';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { GenerationStatus } from '../types/projectDashboard';
import {
  getStageIcon,
  formatDuration,
  formatTimestamp,
  getProgressColor,
} from '../utils/generationStatusTracking';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for GenerationProgressModal component
 */
export interface GenerationProgressModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Current generation status */
  status: GenerationStatus;
  /** Callback when cancel button is clicked */
  onCancel?: () => void;
  /** Callback when close button is clicked (after completion or error) */
  onClose: () => void;
  /** Callback when retry button is clicked (after error) */
  onRetry?: () => void;
}

/**
 * Stage information for display
 */
interface StageInfo {
  key: string;
  name: string;
  icon: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Pipeline stages in order
 * Requirements: 8.1
 */
const PIPELINE_STAGES: Array<{ key: string; name: string }> = [
  { key: 'grid', name: 'Master Coherence Sheet' },
  { key: 'comfyui', name: 'ComfyUI Generation' },
  { key: 'promotion', name: 'Promotion Engine' },
  { key: 'qa', name: 'QA Analysis' },
  { key: 'export', name: 'Export Package' },
];

// ============================================================================
// Component
// ============================================================================

/**
 * GenerationProgressModal Component
 * 
 * Displays generation progress with stage indicators, timing information,
 * and error handling capabilities.
 * 
 * Requirements: 3.6, 8.1, 8.2, 8.3, 8.4, 8.5
 */
export function GenerationProgressModal({
  isOpen,
  status,
  onCancel,
  onClose,
  onRetry,
}: GenerationProgressModalProps) {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const modalRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management for modal
  useFocusManagement(modalRef, {
    enabled: isOpen,
    trapFocus: true,
  });

  // Keyboard shortcuts for modal
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'Escape',
        action: () => {
          // Only allow escape to close if not generating
          if (!isGenerating) {
            onClose();
          }
        },
        description: 'Close modal',
      },
    ],
    enabled: isOpen,
  });

  // Update elapsed time every second
  // Requirements: 8.3
  useEffect(() => {
    if (!isOpen || !status.startTime) {
      setElapsedTime(0);
      return;
    }

    const updateElapsed = () => {
      const elapsed = Date.now() - (status.startTime || Date.now());
      setElapsedTime(elapsed);
    };

    // Initial update
    updateElapsed();

    // Update every second
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [isOpen, status.startTime]);

  /**
   * Get stage status based on current generation stage
   * Requirements: 8.1, 8.2
   */
  const getStageStatus = (stageKey: string): 'pending' | 'in-progress' | 'complete' | 'error' => {
    if (status.stage === 'error') {
      // If there's an error, mark all stages as error or complete based on progress
      const stageIndex = PIPELINE_STAGES.findIndex(s => s.key === stageKey);
      const currentIndex = PIPELINE_STAGES.findIndex(s => s.key === status.stage);
      if (stageIndex < currentIndex) return 'complete';
      if (stageIndex === currentIndex) return 'error';
      return 'pending';
    }

    if (status.stage === 'complete') {
      return 'complete';
    }

    const stageIndex = PIPELINE_STAGES.findIndex(s => s.key === stageKey);
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.key === status.stage);

    if (stageIndex < currentIndex) return 'complete';
    if (stageIndex === currentIndex) return 'in-progress';
    return 'pending';
  };

  /**
   * Build stage information array
   * Requirements: 8.1
   */
  const stages: StageInfo[] = PIPELINE_STAGES.map(stage => ({
    key: stage.key,
    name: stage.name,
    icon: getStageIcon(stage.key),
    status: getStageStatus(stage.key),
  }));

  /**
   * Calculate estimated time remaining
   * Requirements: 8.4
   */
  const estimatedTimeRemaining = status.estimatedCompletion
    ? Math.max(0, status.estimatedCompletion - Date.now())
    : 0;

  /**
   * Determine if generation is in progress
   */
  const isGenerating =
    status.stage !== 'idle' &&
    status.stage !== 'complete' &&
    status.stage !== 'error';

  /**
   * Determine if generation has error
   */
  const hasError = status.stage === 'error';

  /**
   * Determine if generation is complete
   */
  const isComplete = status.stage === 'complete';

  /**
   * Get dialog title based on status
   */
  const getDialogTitle = (): string => {
    if (hasError) return 'Generation Failed';
    if (isComplete) return 'Generation Complete';
    return 'Generating Sequence';
  };

  /**
   * Get dialog description based on status
   */
  const getDialogDescription = (): string => {
    if (hasError) {
      return 'An error occurred during sequence generation. You can retry or cancel.';
    }
    if (isComplete) {
      return 'Your sequence has been generated successfully!';
    }
    return 'Processing your sequence through the StoryCore pipeline...';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        ref={modalRef}
        className="sm:max-w-[600px]"
        onInteractOutside={(e) => {
          // Prevent closing while generating
          if (isGenerating) {
            e.preventDefault();
          }
        }}
        aria-describedby="generation-progress-description"
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
          {/* Overall Progress Bar */}
          {/* Requirements: 8.2 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground">
                {Math.round(status.progress)}%
              </span>
            </div>
            <Progress
              value={status.progress}
              className="h-2"
              style={{
                // @ts-ignore - CSS custom property
                '--progress-color': getProgressColor(status.stage),
              }}
            />
          </div>

          {/* Stage Indicators */}
          {/* Requirements: 8.1 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Pipeline Stages</h4>
            <div className="space-y-2">
              {stages.map((stage) => (
                <div
                  key={stage.key}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors"
                  style={{
                    borderColor:
                      stage.status === 'in-progress'
                        ? getProgressColor(stage.key)
                        : undefined,
                    backgroundColor:
                      stage.status === 'in-progress'
                        ? `${getProgressColor(stage.key)}10`
                        : undefined,
                  }}
                >
                  {/* Stage Icon/Status */}
                  <div className="flex-shrink-0">
                    {stage.status === 'complete' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {stage.status === 'in-progress' && (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    )}
                    {stage.status === 'error' && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    {stage.status === 'pending' && (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>

                  {/* Stage Name */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{stage.icon}</span>
                      <span className="text-sm font-medium">{stage.name}</span>
                    </div>
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

          {/* Shot Progress */}
          {/* Requirements: 8.4 */}
          {status.totalShots && status.totalShots > 0 && (
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Shot Progress</span>
                <span className="text-sm text-muted-foreground">
                  {status.currentShot || 0} / {status.totalShots}
                </span>
              </div>
            </div>
          )}

          {/* Timing Information */}
          {/* Requirements: 8.3, 8.4 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground mb-1">Elapsed Time</div>
              <div className="text-lg font-semibold">
                {formatDuration(elapsedTime)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground mb-1">
                {isComplete ? 'Total Time' : 'Est. Remaining'}
              </div>
              <div className="text-lg font-semibold">
                {isComplete
                  ? formatDuration(elapsedTime)
                  : estimatedTimeRemaining > 0
                  ? formatDuration(estimatedTimeRemaining)
                  : '--'}
              </div>
            </div>
          </div>

          {/* Estimated Completion Time */}
          {/* Requirements: 8.4 */}
          {!isComplete && !hasError && status.estimatedCompletion && (
            <div className="rounded-lg bg-muted p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">
                Estimated Completion
              </div>
              <div className="text-sm font-medium">
                {formatTimestamp(status.estimatedCompletion)}
              </div>
            </div>
          )}

          {/* Error Display */}
          {/* Requirements: 3.7, 8.5 */}
          {hasError && status.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">
                    Error Details
                  </h4>
                  <p className="text-sm text-red-700">{status.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {isComplete && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-green-900 mb-1">
                    Generation Successful
                  </h4>
                  <p className="text-sm text-green-700">
                    Your sequence has been generated and is ready to view.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {/* Cancel Button (only during generation) */}
          {/* Requirements: 8.5 */}
          {isGenerating && onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel Generation
            </Button>
          )}

          {/* Retry Button (only on error) */}
          {/* Requirements: 3.7, 8.5 */}
          {hasError && onRetry && (
            <Button variant="default" onClick={onRetry}>
              Retry Generation
            </Button>
          )}

          {/* Close Button (on error or completion) */}
          {(hasError || isComplete) && (
            <Button
              ref={closeButtonRef}
              variant={hasError ? 'outline' : 'default'}
              onClick={onClose}
              aria-label={hasError ? 'Close modal' : 'View generation results'}
            >
              {hasError ? 'Close' : 'View Results'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Default export
 */
export default GenerationProgressModal;
