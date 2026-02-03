/**
 * GenerationCancellationDialog Component
 * 
 * Displays a confirmation dialog for cancelling generation with cleanup progress.
 * Shows warning about cancellation consequences and tracks cleanup status.
 * 
 * Requirements: 8.7
 */

import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Loader2, CheckCircle2, XCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

/**
 * Cancellation status
 */
export type CancellationStatus = 
  | 'confirming'      // Waiting for user confirmation
  | 'cancelling'      // Cancellation in progress
  | 'cleaning-up'     // Cleaning up resources
  | 'cancelled'       // Successfully cancelled
  | 'error';          // Error during cancellation

/**
 * Cleanup progress information
 */
export interface CleanupProgress {
  /** Current cleanup step */
  currentStep: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Total cleanup steps */
  totalSteps: number;
  /** Current step number */
  currentStepNumber: number;
}

/**
 * Props for GenerationCancellationDialog component
 */
export interface GenerationCancellationDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Current cancellation status */
  status: CancellationStatus;
  /** Cleanup progress (when status is 'cleaning-up') */
  cleanupProgress?: CleanupProgress;
  /** Error message (when status is 'error') */
  error?: string;
  /** Callback when user confirms cancellation */
  onConfirm: () => void;
  /** Callback when user cancels the cancellation dialog */
  onCancel: () => void;
  /** Callback when cancellation is complete and dialog should close */
  onClose: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get dialog title based on status
 */
function getDialogTitle(status: CancellationStatus): string {
  switch (status) {
    case 'confirming':
      return 'Cancel Generation?';
    case 'cancelling':
      return 'Cancelling Generation';
    case 'cleaning-up':
      return 'Cleaning Up';
    case 'cancelled':
      return 'Generation Cancelled';
    case 'error':
      return 'Cancellation Error';
    default:
      return 'Cancel Generation';
  }
}

/**
 * Get dialog description based on status
 */
function getDialogDescription(status: CancellationStatus): string {
  switch (status) {
    case 'confirming':
      return 'Are you sure you want to cancel the generation? This action cannot be undone.';
    case 'cancelling':
      return 'Stopping generation process...';
    case 'cleaning-up':
      return 'Cleaning up temporary files and resources...';
    case 'cancelled':
      return 'Generation has been cancelled successfully.';
    case 'error':
      return 'An error occurred while cancelling the generation.';
    default:
      return '';
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * GenerationCancellationDialog Component
 * 
 * Provides a confirmation dialog for cancelling generation with progress
 * tracking for cleanup operations.
 * 
 * Requirements: 8.7
 */
export const GenerationCancellationDialog: React.FC<GenerationCancellationDialogProps> = ({
  isOpen,
  status,
  cleanupProgress,
  error,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const [autoCloseTimer, setAutoCloseTimer] = useState<number | null>(null);

  // ============================================================================
  // Auto-close on Success
  // ============================================================================

  useEffect(() => {
    if (status === 'cancelled') {
      // Auto-close after 2 seconds on successful cancellation
      const timer = window.setTimeout(() => {
        onClose();
      }, 2000);
      
      setAutoCloseTimer(timer);

      return () => {
        if (timer) {
          window.clearTimeout(timer);
        }
      };
    }
  }, [status, onClose]);

  // ============================================================================
  // Cleanup on Unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      if (autoCloseTimer) {
        window.clearTimeout(autoCloseTimer);
      }
    };
  }, [autoCloseTimer]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const isConfirming = status === 'confirming';
  const isCancelling = status === 'cancelling';
  const isCleaningUp = status === 'cleaning-up';
  const isCancelled = status === 'cancelled';
  const hasError = status === 'error';
  const isProcessing = isCancelling || isCleaningUp;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <AlertDialog open={isOpen} onOpenChange={(open: boolean) => !open && onCancel()}>
      <AlertDialogContent
        onInteractOutside={(e: Event) => {
          // Prevent closing while processing
          if (isProcessing) {
            e.preventDefault();
          }
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isConfirming && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
            {isProcessing && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
            {isCancelled && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {hasError && <XCircle className="h-5 w-5 text-red-500" />}
            {getDialogTitle(status)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {getDialogDescription(status)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Warning Message (Confirmation State) */}
        {/* Requirements: 8.7 */}
        {isConfirming && (
          <div className="space-y-3 py-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 mb-1">
                    Warning: This will stop all generation
                  </p>
                  <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                    <li>Current generation progress will be lost</li>
                    <li>Partial results will be discarded</li>
                    <li>You will need to restart generation from the beginning</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cleanup Progress Display */}
        {/* Requirements: 8.7 */}
        {isCleaningUp && cleanupProgress && (
          <div className="space-y-3 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Cleanup Progress</span>
                <span className="text-muted-foreground">
                  {cleanupProgress.currentStepNumber} / {cleanupProgress.totalSteps}
                </span>
              </div>
              <Progress value={cleanupProgress.progress} className="h-2" />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-900">
                  {cleanupProgress.currentStep}
                </span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Please wait while we clean up temporary files and resources...
            </div>
          </div>
        )}

        {/* Cancelling Status */}
        {isCancelling && (
          <div className="py-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-sm text-blue-900">
                Stopping generation process...
              </span>
            </div>
          </div>
        )}

        {/* Success Message */}
        {isCancelled && (
          <div className="py-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-900">
                  Generation cancelled successfully
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This dialog will close automatically...
            </p>
          </div>
        )}

        {/* Error Message */}
        {/* Requirements: 8.7 */}
        {hasError && error && (
          <div className="py-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 mb-1">
                    Cancellation Error
                  </p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          {/* Confirmation State Buttons */}
          {isConfirming && (
            <>
              <AlertDialogCancel onClick={onCancel}>
                Continue Generation
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onConfirm}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                Yes, Cancel Generation
              </AlertDialogAction>
            </>
          )}

          {/* Processing State - No buttons */}
          {isProcessing && (
            <div className="text-sm text-muted-foreground">
              Please wait...
            </div>
          )}

          {/* Success State - Close button */}
          {isCancelled && (
            <Button onClick={onClose} variant="default">
              Close
            </Button>
          )}

          {/* Error State - Close button */}
          {hasError && (
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default GenerationCancellationDialog;
