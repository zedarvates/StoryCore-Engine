/**
 * Two-Stage Video Progress Component
 * 
 * Displays two-stage progress tracking for video generation:
 * - Stage 1: Latent generation
 * - Stage 2: Spatial upscaling
 * 
 * Requirements: 3.2
 */

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import type { GenerationProgress } from '@/types/generation';

export interface TwoStageVideoProgressProps {
  /** Current generation progress */
  progress: GenerationProgress;
  /** Whether generation is complete */
  isComplete?: boolean;
}

/**
 * Determine which stage is currently active
 */
function getCurrentStage(progress: GenerationProgress): 'latent' | 'upscaling' | 'complete' {
  if (progress.overallProgress >= 100) return 'complete';
  if (progress.stage.toLowerCase().includes('upscaling')) return 'upscaling';
  return 'latent';
}

/**
 * Calculate stage-specific progress
 */
function getStageProgress(
  currentStage: 'latent' | 'upscaling' | 'complete',
  overallProgress: number
): { latentProgress: number; upscalingProgress: number } {
  // Overall progress is split 50/50 between stages
  if (currentStage === 'complete') {
    return { latentProgress: 100, upscalingProgress: 100 };
  }
  
  if (currentStage === 'latent') {
    // First 50% is latent generation
    const latentProgress = Math.min(overallProgress * 2, 100);
    return { latentProgress, upscalingProgress: 0 };
  }
  
  // Second 50% is upscaling
  const upscalingProgress = Math.min((overallProgress - 50) * 2, 100);
  return { latentProgress: 100, upscalingProgress };
}

/**
 * Two-Stage Video Progress Component
 * 
 * Displays latent generation and spatial upscaling stages with individual progress bars.
 */
export const TwoStageVideoProgress: React.FC<TwoStageVideoProgressProps> = ({
  progress,
  isComplete = false,
}) => {
  const currentStage = getCurrentStage(progress);
  const { latentProgress, upscalingProgress } = getStageProgress(
    currentStage,
    progress.overallProgress
  );
  
  const isLatentActive = currentStage === 'latent';
  const isLatentComplete = latentProgress >= 100;
  const isUpscalingActive = currentStage === 'upscaling';
  const isUpscalingComplete = upscalingProgress >= 100;
  
  return (
    <div className="space-y-4">
      {/* Stage 1: Latent Generation */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {/* Stage Icon */}
          {isLatentComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" aria-label="Complete" />
          ) : isLatentActive ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" aria-label="In progress" />
          ) : (
            <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" aria-label="Pending" />
          )}
          
          {/* Stage Label */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Stage 1: Latent Generation
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(latentProgress)}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <Progress
          value={latentProgress}
          className="h-2"
          aria-label={`Latent generation progress: ${Math.round(latentProgress)}%`}
        />
        
        {/* Stage Description */}
        <p className="text-xs text-muted-foreground pl-6">
          {isLatentComplete
            ? 'Latent representation generated successfully'
            : isLatentActive
            ? 'Generating video latent representation...'
            : 'Waiting to start latent generation'}
        </p>
      </div>
      
      {/* Stage 2: Spatial Upscaling */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {/* Stage Icon */}
          {isUpscalingComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" aria-label="Complete" />
          ) : isUpscalingActive ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" aria-label="In progress" />
          ) : (
            <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" aria-label="Pending" />
          )}
          
          {/* Stage Label */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Stage 2: Spatial Upscaling
              </span>
              <span className="text-xs text-muted-foreground">
                {Math.round(upscalingProgress)}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <Progress
          value={upscalingProgress}
          className="h-2"
          aria-label={`Spatial upscaling progress: ${Math.round(upscalingProgress)}%`}
        />
        
        {/* Stage Description */}
        <p className="text-xs text-muted-foreground pl-6">
          {isUpscalingComplete
            ? 'Video upscaled to final resolution'
            : isUpscalingActive
            ? 'Upscaling video to target dimensions...'
            : 'Waiting for latent generation to complete'}
        </p>
      </div>
      
      {/* Overall Progress Summary */}
      <div className="pt-2 border-t">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Overall Progress</span>
          <span className="text-muted-foreground">
            {Math.round(progress.overallProgress)}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {isComplete
            ? 'Video generation complete'
            : `${currentStage === 'latent' ? 'Stage 1' : 'Stage 2'} of 2 in progress`}
        </p>
      </div>
    </div>
  );
};

export default TwoStageVideoProgress;
