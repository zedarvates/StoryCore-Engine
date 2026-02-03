/**
 * ComfyUI Integration Components
 * 
 * Components for ComfyUI Desktop integration including generation progress
 * monitoring, status displays, and cancellation controls.
 */

export { GenerationStatusDisplay } from './GenerationStatusDisplay';
export type { 
  GenerationStatusDisplayProps,
  GenerationProgress 
} from './GenerationStatusDisplay';

export { MasterCoherenceSheetProgress } from './MasterCoherenceSheetProgress';
export type {
  MasterCoherenceSheetProgressProps,
  PanelInfo,
  PanelStatus
} from './MasterCoherenceSheetProgress';

export { GenerationCompletionSummary } from './GenerationCompletionSummary';
export type {
  GenerationCompletionSummaryProps,
  GenerationStats
} from './GenerationCompletionSummary';

export { GenerationCancellationDialog } from './GenerationCancellationDialog';
export type {
  GenerationCancellationDialogProps,
  CancellationStatus,
  CleanupProgress
} from './GenerationCancellationDialog';
