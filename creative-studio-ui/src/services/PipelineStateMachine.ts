/**
 * Pipeline State Machine Service
 * 
 * Manages automatic stage progression, step skipping, and restart functionality
 * for the generation pipeline workflow.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import type {
  GenerationPipelineState,
  GeneratedAsset,
  GeneratedPrompt,
} from '../types/generation';

export type PipelineStage = 'prompt' | 'image' | 'video' | 'audio' | 'complete';
export type StageStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

/**
 * Pipeline stage configuration
 */
interface StageConfig {
  name: PipelineStage;
  required: boolean;
  canSkip: boolean;
  nextStage: PipelineStage | null;
  previousStage: PipelineStage | null;
}

/**
 * Pipeline state machine configuration
 */
const PIPELINE_STAGES: Record<PipelineStage, StageConfig> = {
  prompt: {
    name: 'prompt',
    required: true,
    canSkip: false,
    nextStage: 'image',
    previousStage: null,
  },
  image: {
    name: 'image',
    required: true,
    canSkip: false,
    nextStage: 'video',
    previousStage: 'prompt',
  },
  video: {
    name: 'video',
    required: false,
    canSkip: true,
    nextStage: 'audio',
    previousStage: 'image',
  },
  audio: {
    name: 'audio',
    required: false,
    canSkip: true,
    nextStage: 'complete',
    previousStage: 'video',
  },
  complete: {
    name: 'complete',
    required: false,
    canSkip: false,
    nextStage: null,
    previousStage: 'audio',
  },
};

/**
 * Pipeline State Machine Service
 */
export class PipelineStateMachine {
  /**
   * Get the next stage in the pipeline
   */
  static getNextStage(currentStage: PipelineStage): PipelineStage | null {
    return PIPELINE_STAGES[currentStage].nextStage;
  }

  /**
   * Get the previous stage in the pipeline
   */
  static getPreviousStage(currentStage: PipelineStage): PipelineStage | null {
    return PIPELINE_STAGES[currentStage].previousStage;
  }

  /**
   * Check if a stage can be skipped
   */
  static canSkipStage(stage: PipelineStage): boolean {
    return PIPELINE_STAGES[stage].canSkip;
  }

  /**
   * Check if a stage is required
   */
  static isStageRequired(stage: PipelineStage): boolean {
    return PIPELINE_STAGES[stage].required;
  }

  /**
   * Get all stages in order
   */
  static getAllStages(): PipelineStage[] {
    return ['prompt', 'image', 'video', 'audio', 'complete'];
  }

  /**
   * Get completed stages from pipeline state
   */
  static getCompletedStages(pipeline: GenerationPipelineState): PipelineStage[] {
    const completed: PipelineStage[] = [];
    
    if (pipeline.stages.prompt.status === 'completed') completed.push('prompt');
    if (pipeline.stages.image.status === 'completed') completed.push('image');
    if (pipeline.stages.video.status === 'completed') completed.push('video');
    if (pipeline.stages.audio.status === 'completed') completed.push('audio');
    
    return completed;
  }

  /**
   * Get skipped stages from pipeline state
   */
  static getSkippedStages(pipeline: GenerationPipelineState): PipelineStage[] {
    const skipped: PipelineStage[] = [];
    
    if (pipeline.stages.prompt.status === 'skipped') skipped.push('prompt');
    if (pipeline.stages.image.status === 'skipped') skipped.push('image');
    if (pipeline.stages.video.status === 'skipped') skipped.push('video');
    if (pipeline.stages.audio.status === 'skipped') skipped.push('audio');
    
    return skipped;
  }

  /**
   * Get failed stages from pipeline state
   */
  static getFailedStages(pipeline: GenerationPipelineState): PipelineStage[] {
    const failed: PipelineStage[] = [];
    
    if (pipeline.stages.prompt.status === 'failed') failed.push('prompt');
    if (pipeline.stages.image.status === 'failed') failed.push('image');
    if (pipeline.stages.video.status === 'failed') failed.push('video');
    if (pipeline.stages.audio.status === 'failed') failed.push('audio');
    
    return failed;
  }

  /**
   * Check if pipeline is complete
   */
  static isPipelineComplete(pipeline: GenerationPipelineState): boolean {
    return pipeline.currentStage === 'complete';
  }

  /**
   * Check if a stage can be restarted
   */
  static canRestartFromStage(
    pipeline: GenerationPipelineState,
    stage: PipelineStage
  ): boolean {
    // Can't restart from complete
    if (stage === 'complete') return false;

    // Can restart from any stage that has been attempted
    const stageState = pipeline.stages[stage as keyof typeof pipeline.stages];
    return stageState.status !== 'pending';
  }

  /**
   * Get the stage to restart from
   * Returns the stage and whether it should clear subsequent stages
   */
  static getRestartStage(
    pipeline: GenerationPipelineState,
    targetStage: PipelineStage
  ): { stage: PipelineStage; clearSubsequent: boolean } {
    if (!this.canRestartFromStage(pipeline, targetStage)) {
      throw new Error(`Cannot restart from stage: ${targetStage}`);
    }

    return {
      stage: targetStage,
      clearSubsequent: true, // Always clear subsequent stages when restarting
    };
  }

  /**
   * Validate stage transition
   */
  static canTransitionTo(
    pipeline: GenerationPipelineState,
    targetStage: PipelineStage
  ): { valid: boolean; reason?: string } {
    // Can always transition to complete
    if (targetStage === 'complete') {
      return { valid: true };
    }

    // Check if previous required stages are completed or skipped
    const allStages = this.getAllStages();
    const targetIndex = allStages.indexOf(targetStage);

    for (let i = 0; i < targetIndex; i++) {
      const stage = allStages[i] as PipelineStage;
      if (stage === 'complete') continue;

      const stageState = pipeline.stages[stage as keyof typeof pipeline.stages];
      const config = PIPELINE_STAGES[stage];

      // Required stages must be completed
      if (config.required && stageState.status !== 'completed') {
        return {
          valid: false,
          reason: `Required stage "${stage}" must be completed first`,
        };
      }

      // Non-required stages must be completed or skipped
      if (!config.required && stageState.status !== 'completed' && stageState.status !== 'skipped') {
        return {
          valid: false,
          reason: `Stage "${stage}" must be completed or skipped first`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get available actions for current stage
   */
  static getAvailableActions(
    pipeline: GenerationPipelineState
  ): {
    canProgress: boolean;
    canSkip: boolean;
    canRestart: boolean;
    restartableStages: PipelineStage[];
  } {
    const currentStage = pipeline.currentStage;
    
    if (currentStage === 'complete') {
      return {
        canProgress: false,
        canSkip: false,
        canRestart: true,
        restartableStages: this.getCompletedStages(pipeline),
      };
    }

    const stageState = pipeline.stages[currentStage as keyof typeof pipeline.stages];
    const config = PIPELINE_STAGES[currentStage];

    return {
      canProgress: stageState.status === 'completed',
      canSkip: config.canSkip && stageState.status !== 'completed',
      canRestart: this.getCompletedStages(pipeline).length > 0,
      restartableStages: this.getCompletedStages(pipeline),
    };
  }

  /**
   * Calculate pipeline progress percentage
   */
  static calculateProgress(pipeline: GenerationPipelineState): number {
    const stages = ['prompt', 'image', 'video', 'audio'] as const;
    let completed = 0;
    let total = 0;

    stages.forEach(stage => {
      const stageState = pipeline.stages[stage];
      const config = PIPELINE_STAGES[stage];

      // Count required stages and completed optional stages
      if (config.required || stageState.status === 'completed') {
        total++;
        if (stageState.status === 'completed') {
          completed++;
        }
      }
    });

    return total > 0 ? (completed / total) * 100 : 0;
  }

  /**
   * Get stage display name
   */
  static getStageDisplayName(stage: PipelineStage): string {
    const names: Record<PipelineStage, string> = {
      prompt: 'Prompt Generation',
      image: 'Image Generation',
      video: 'Video Generation',
      audio: 'Audio Generation',
      complete: 'Complete',
    };
    return names[stage];
  }

  /**
   * Get stage description
   */
  static getStageDescription(stage: PipelineStage): string {
    const descriptions: Record<PipelineStage, string> = {
      prompt: 'Generate optimized prompts for AI generation',
      image: 'Create images from prompts using Flux Turbo',
      video: 'Generate videos from images using LTX2 i2v',
      audio: 'Create audio and voiceovers for content',
      complete: 'Pipeline complete - all assets generated',
    };
    return descriptions[stage];
  }

  /**
   * Get all assets from completed stages
   */
  static getAllAssets(pipeline: GenerationPipelineState): {
    prompt?: GeneratedPrompt;
    image?: GeneratedAsset;
    video?: GeneratedAsset;
    audio?: GeneratedAsset;
  } {
    return {
      prompt: pipeline.stages.prompt.status === 'completed' 
        ? pipeline.stages.prompt.result 
        : undefined,
      image: pipeline.stages.image.status === 'completed'
        ? pipeline.stages.image.result
        : undefined,
      video: pipeline.stages.video.status === 'completed'
        ? pipeline.stages.video.result
        : undefined,
      audio: pipeline.stages.audio.status === 'completed'
        ? pipeline.stages.audio.result
        : undefined,
    };
  }
}

export default PipelineStateMachine;
