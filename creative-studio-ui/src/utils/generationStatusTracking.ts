/**
 * Generation Status Tracking Utilities
 * 
 * Provides utilities for tracking generation progress, calculating completion estimates,
 * and managing generation status state.
 * 
 * Requirements: 3.6, 8.1, 8.2, 8.3, 8.4
 */

import type { GenerationStatus } from '../types/projectDashboard';

// ============================================================================
// Types
// ============================================================================

/**
 * Stage timing information
 */
export interface StageTiming {
  stage: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

/**
 * Progress calculation result
 */
export interface ProgressCalculation {
  overallProgress: number; // 0-100
  currentStageProgress: number; // 0-100
  elapsedTime: number; // milliseconds
  estimatedTimeRemaining: number; // milliseconds
  estimatedCompletion: number; // timestamp
}

/**
 * Stage weight configuration for progress calculation
 */
export interface StageWeights {
  grid: number;
  comfyui: number;
  promotion: number;
  qa: number;
  export: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default stage weights (must sum to 100)
 * Requirements: 8.1, 8.2
 */
export const DEFAULT_STAGE_WEIGHTS: StageWeights = {
  grid: 20,      // 20% - Master Coherence Sheet generation
  comfyui: 40,   // 40% - ComfyUI image generation (most time-consuming)
  promotion: 15, // 15% - Promotion engine processing
  qa: 15,        // 15% - QA analysis and autofix
  export: 10,    // 10% - Export package creation
};

/**
 * Stage order for progress calculation
 */
const STAGE_ORDER: Array<keyof StageWeights> = [
  'grid',
  'comfyui',
  'promotion',
  'qa',
  'export',
];

// ============================================================================
// Status Tracking Class
// ============================================================================

/**
 * Generation status tracker
 * Requirements: 3.6, 8.1, 8.2, 8.3, 8.4
 */
export class GenerationStatusTracker {
  private stageTimings: StageTiming[] = [];
  private stageWeights: StageWeights;
  private startTime: number = 0;
  private totalShots: number = 0;

  constructor(stageWeights: StageWeights = DEFAULT_STAGE_WEIGHTS) {
    this.stageWeights = stageWeights;
  }

  /**
   * Initialize tracking for a new generation
   * Requirements: 8.1
   */
  initialize(totalShots: number): void {
    this.stageTimings = [];
    this.startTime = Date.now();
    this.totalShots = totalShots;
  }

  /**
   * Record stage start
   * Requirements: 8.1, 8.2
   */
  startStage(stage: keyof StageWeights): void {
    this.stageTimings.push({
      stage,
      startTime: Date.now(),
    });
  }

  /**
   * Record stage completion
   * Requirements: 8.1, 8.2
   */
  completeStage(stage: keyof StageWeights): void {
    const timing = this.stageTimings.find(
      t => t.stage === stage && !t.endTime
    );

    if (timing) {
      timing.endTime = Date.now();
      timing.duration = timing.endTime - timing.startTime;
    }
  }

  /**
   * Calculate current progress
   * Requirements: 8.2, 8.3
   */
  calculateProgress(
    currentStage: keyof StageWeights,
    currentShot: number
  ): ProgressCalculation {
    const elapsedTime = Date.now() - this.startTime;

    // Calculate overall progress based on completed stages
    let overallProgress = 0;

    for (const stage of STAGE_ORDER) {
      const timing = this.stageTimings.find(t => t.stage === stage);

      if (timing?.endTime) {
        // Stage completed
        overallProgress += this.stageWeights[stage];
      } else if (stage === currentStage) {
        // Current stage - calculate partial progress
        const stageProgress = this.calculateStageProgress(
          currentStage,
          currentShot
        );
        overallProgress += this.stageWeights[stage] * (stageProgress / 100);
        break;
      } else {
        // Future stage - not started
        break;
      }
    }

    // Calculate current stage progress
    const currentStageProgress = this.calculateStageProgress(
      currentStage,
      currentShot
    );

    // Estimate time remaining
    const estimatedTimeRemaining = this.estimateTimeRemaining(
      overallProgress,
      elapsedTime
    );

    const estimatedCompletion = Date.now() + estimatedTimeRemaining;

    return {
      overallProgress: Math.min(100, Math.max(0, overallProgress)),
      currentStageProgress,
      elapsedTime,
      estimatedTimeRemaining,
      estimatedCompletion,
    };
  }

  /**
   * Calculate progress within a specific stage
   * Requirements: 8.2
   */
  private calculateStageProgress(
    stage: keyof StageWeights,
    currentShot: number
  ): number {
    // For shot-based stages (comfyui, promotion), calculate based on shot progress
    if (stage === 'comfyui' || stage === 'promotion') {
      if (this.totalShots === 0) return 0;
      return Math.min(100, (currentShot / this.totalShots) * 100);
    }

    // For non-shot-based stages, assume 50% progress if in progress
    const timing = this.stageTimings.find(t => t.stage === stage);
    if (timing && !timing.endTime) {
      return 50; // Assume halfway through
    }

    return 0;
  }

  /**
   * Estimate time remaining based on current progress
   * Requirements: 8.3, 8.4
   */
  private estimateTimeRemaining(
    currentProgress: number,
    elapsedTime: number
  ): number {
    if (currentProgress === 0) {
      // No progress yet, use default estimate
      return this.getDefaultEstimate();
    }

    // Linear extrapolation based on current progress
    const estimatedTotal = (elapsedTime / currentProgress) * 100;
    const remaining = estimatedTotal - elapsedTime;

    return Math.max(0, remaining);
  }

  /**
   * Get default time estimate when no progress data available
   * Requirements: 8.4
   */
  private getDefaultEstimate(): number {
    // Default estimate: 5 minutes for complete pipeline
    // Adjust based on number of shots (30 seconds per shot)
    const baseTime = 5 * 60 * 1000; // 5 minutes
    const perShotTime = 30 * 1000; // 30 seconds per shot
    return baseTime + (this.totalShots * perShotTime);
  }

  /**
   * Get elapsed time for current generation
   * Requirements: 8.3
   */
  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get formatted elapsed time string
   * Requirements: 8.3
   */
  getFormattedElapsedTime(): string {
    return formatDuration(this.getElapsedTime());
  }

  /**
   * Get formatted estimated time remaining string
   * Requirements: 8.4
   */
  getFormattedTimeRemaining(currentProgress: number): string {
    const elapsedTime = this.getElapsedTime();
    const remaining = this.estimateTimeRemaining(currentProgress, elapsedTime);
    return formatDuration(remaining);
  }

  /**
   * Get stage timings for analysis
   */
  getStageTimings(): StageTiming[] {
    return [...this.stageTimings];
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.stageTimings = [];
    this.startTime = 0;
    this.totalShots = 0;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format duration in milliseconds to human-readable string
 * Requirements: 8.3, 8.4
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '0s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${seconds}s`;
}

/**
 * Format timestamp to time string
 * Requirements: 8.4
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

/**
 * Calculate progress percentage for a stage
 * Requirements: 8.2
 */
export function calculateStageProgressPercentage(
  currentShot: number,
  totalShots: number
): number {
  if (totalShots === 0) return 0;
  return Math.min(100, Math.max(0, (currentShot / totalShots) * 100));
}

/**
 * Get stage display name
 * Requirements: 8.1
 */
export function getStageDisplayName(stage: string): string {
  const displayNames: Record<string, string> = {
    idle: 'Idle',
    grid: 'Generating Master Coherence Sheet',
    comfyui: 'Generating Images with ComfyUI',
    promotion: 'Processing through Promotion Engine',
    qa: 'Running QA Analysis',
    export: 'Exporting Results',
    complete: 'Complete',
    error: 'Error',
  };

  return displayNames[stage] || stage;
}

/**
 * Get stage icon/emoji
 * Requirements: 8.1
 */
export function getStageIcon(stage: string): string {
  const icons: Record<string, string> = {
    idle: '⏸️',
    grid: '🎨',
    comfyui: '🖼️',
    promotion: '⚡',
    qa: '🔍',
    export: '📦',
    complete: '✅',
    error: '❌',
  };

  return icons[stage] || '⏳';
}

/**
 * Create initial generation status
 * Requirements: 3.6, 8.1
 */
export function createInitialStatus(totalShots: number): GenerationStatus {
  return {
    stage: 'idle',
    progress: 0,
    currentShot: 0,
    totalShots,
    startTime: Date.now(),
  };
}

/**
 * Update generation status with progress calculation
 * Requirements: 8.2, 8.3, 8.4
 */
export function updateStatusWithProgress(
  status: GenerationStatus,
  tracker: GenerationStatusTracker
): GenerationStatus {
  if (status.stage === 'idle' || status.stage === 'complete' || status.stage === 'error') {
    return status;
  }

  const currentShot = status.currentShot || 0;
  const progress = tracker.calculateProgress(
    status.stage as keyof StageWeights,
    currentShot
  );

  return {
    ...status,
    progress: progress.overallProgress,
    estimatedCompletion: progress.estimatedCompletion,
  };
}

/**
 * Check if generation is in progress
 */
export function isGenerationInProgress(status: GenerationStatus): boolean {
  return (
    status.stage !== 'idle' &&
    status.stage !== 'complete' &&
    status.stage !== 'error'
  );
}

/**
 * Check if generation is complete
 */
export function isGenerationComplete(status: GenerationStatus): boolean {
  return status.stage === 'complete';
}

/**
 * Check if generation has error
 */
export function hasGenerationError(status: GenerationStatus): boolean {
  return status.stage === 'error';
}

/**
 * Get progress color based on stage
 * Requirements: 8.1
 */
export function getProgressColor(stage: string): string {
  const colors: Record<string, string> = {
    idle: '#6B7280',
    grid: '#3B82F6',
    comfyui: '#8B5CF6',
    promotion: '#10B981',
    qa: '#F59E0B',
    export: '#06B6D4',
    complete: '#22C55E',
    error: '#EF4444',
  };

  return colors[stage] || '#6B7280';
}

/**
 * Default status tracker instance
 */
export const defaultStatusTracker = new GenerationStatusTracker();

