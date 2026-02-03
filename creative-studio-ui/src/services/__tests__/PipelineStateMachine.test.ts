/**
 * Tests for Pipeline State Machine Service
 */

import { describe, it, expect } from 'vitest';
import { PipelineStateMachine } from '../PipelineStateMachine';
import type { GenerationPipelineState, GeneratedAsset, GeneratedPrompt } from '../../types/generation';

describe('PipelineStateMachine', () => {
  // Helper to create a test pipeline
  const createTestPipeline = (overrides?: Partial<GenerationPipelineState>): GenerationPipelineState => ({
    id: 'test-pipeline',
    currentStage: 'prompt',
    stages: {
      prompt: { status: 'pending', attempts: 0 },
      image: { status: 'pending', attempts: 0 },
      video: { status: 'pending', attempts: 0 },
      audio: { status: 'pending', attempts: 0 },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  });

  describe('Stage Navigation', () => {
    it('should get next stage correctly', () => {
      expect(PipelineStateMachine.getNextStage('prompt')).toBe('image');
      expect(PipelineStateMachine.getNextStage('image')).toBe('video');
      expect(PipelineStateMachine.getNextStage('video')).toBe('audio');
      expect(PipelineStateMachine.getNextStage('audio')).toBe('complete');
      expect(PipelineStateMachine.getNextStage('complete')).toBe(null);
    });

    it('should get previous stage correctly', () => {
      expect(PipelineStateMachine.getPreviousStage('prompt')).toBe(null);
      expect(PipelineStateMachine.getPreviousStage('image')).toBe('prompt');
      expect(PipelineStateMachine.getPreviousStage('video')).toBe('image');
      expect(PipelineStateMachine.getPreviousStage('audio')).toBe('video');
      expect(PipelineStateMachine.getPreviousStage('complete')).toBe('audio');
    });

    it('should return all stages in order', () => {
      const stages = PipelineStateMachine.getAllStages();
      expect(stages).toEqual(['prompt', 'image', 'video', 'audio', 'complete']);
    });
  });

  describe('Stage Configuration', () => {
    it('should identify required stages', () => {
      expect(PipelineStateMachine.isStageRequired('prompt')).toBe(true);
      expect(PipelineStateMachine.isStageRequired('image')).toBe(true);
      expect(PipelineStateMachine.isStageRequired('video')).toBe(false);
      expect(PipelineStateMachine.isStageRequired('audio')).toBe(false);
    });

    it('should identify skippable stages', () => {
      expect(PipelineStateMachine.canSkipStage('prompt')).toBe(false);
      expect(PipelineStateMachine.canSkipStage('image')).toBe(false);
      expect(PipelineStateMachine.canSkipStage('video')).toBe(true);
      expect(PipelineStateMachine.canSkipStage('audio')).toBe(true);
    });
  });

  describe('Stage Status Tracking', () => {
    it('should get completed stages', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'completed', result: {} as GeneratedAsset, attempts: 1 },
          video: { status: 'pending', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
      });

      const completed = PipelineStateMachine.getCompletedStages(pipeline);
      expect(completed).toEqual(['prompt', 'image']);
    });

    it('should get skipped stages', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'completed', result: {} as GeneratedAsset, attempts: 1 },
          video: { status: 'skipped', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
      });

      const skipped = PipelineStateMachine.getSkippedStages(pipeline);
      expect(skipped).toEqual(['video']);
    });

    it('should get failed stages', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'failed', error: 'Test error', attempts: 1 },
          video: { status: 'pending', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
      });

      const failed = PipelineStateMachine.getFailedStages(pipeline);
      expect(failed).toEqual(['image']);
    });
  });

  describe('Pipeline Completion', () => {
    it('should detect complete pipeline', () => {
      const pipeline = createTestPipeline({ currentStage: 'complete' });
      expect(PipelineStateMachine.isPipelineComplete(pipeline)).toBe(true);
    });

    it('should detect incomplete pipeline', () => {
      const pipeline = createTestPipeline({ currentStage: 'image' });
      expect(PipelineStateMachine.isPipelineComplete(pipeline)).toBe(false);
    });
  });

  describe('Stage Restart', () => {
    it('should allow restart from completed stages', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'completed', result: {} as GeneratedAsset, attempts: 1 },
          video: { status: 'pending', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
      });

      expect(PipelineStateMachine.canRestartFromStage(pipeline, 'prompt')).toBe(true);
      expect(PipelineStateMachine.canRestartFromStage(pipeline, 'image')).toBe(true);
    });

    it('should not allow restart from pending stages', () => {
      const pipeline = createTestPipeline();
      expect(PipelineStateMachine.canRestartFromStage(pipeline, 'video')).toBe(false);
    });

    it('should not allow restart from complete stage', () => {
      const pipeline = createTestPipeline({ currentStage: 'complete' });
      expect(PipelineStateMachine.canRestartFromStage(pipeline, 'complete')).toBe(false);
    });

    it('should get restart stage with clear subsequent flag', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'completed', result: {} as GeneratedAsset, attempts: 1 },
          video: { status: 'pending', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
      });

      const restart = PipelineStateMachine.getRestartStage(pipeline, 'image');
      expect(restart.stage).toBe('image');
      expect(restart.clearSubsequent).toBe(true);
    });
  });

  describe('Stage Transitions', () => {
    it('should allow transition when required stages are completed', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'completed', result: {} as GeneratedAsset, attempts: 1 },
          video: { status: 'pending', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
      });

      const result = PipelineStateMachine.canTransitionTo(pipeline, 'video');
      expect(result.valid).toBe(true);
    });

    it('should block transition when required stages are not completed', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'pending', attempts: 0 },
          video: { status: 'pending', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
      });

      const result = PipelineStateMachine.canTransitionTo(pipeline, 'video');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('image');
    });

    it('should allow transition when optional stages are skipped', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'completed', result: {} as GeneratedAsset, attempts: 1 },
          video: { status: 'skipped', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
      });

      const result = PipelineStateMachine.canTransitionTo(pipeline, 'audio');
      expect(result.valid).toBe(true);
    });

    it('should always allow transition to complete', () => {
      const pipeline = createTestPipeline();
      const result = PipelineStateMachine.canTransitionTo(pipeline, 'complete');
      expect(result.valid).toBe(true);
    });
  });

  describe('Available Actions', () => {
    it('should return correct actions for pending stage', () => {
      const pipeline = createTestPipeline();
      const actions = PipelineStateMachine.getAvailableActions(pipeline);

      expect(actions.canProgress).toBe(false);
      expect(actions.canSkip).toBe(false);
      expect(actions.canRestart).toBe(false);
      expect(actions.restartableStages).toEqual([]);
    });

    it('should return correct actions for completed stage', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'pending', attempts: 0 },
          video: { status: 'pending', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
        currentStage: 'prompt',
      });

      const actions = PipelineStateMachine.getAvailableActions(pipeline);
      expect(actions.canProgress).toBe(true);
      expect(actions.canRestart).toBe(true);
      expect(actions.restartableStages).toEqual(['prompt']);
    });

    it('should return correct actions for skippable stage', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'completed', result: {} as GeneratedAsset, attempts: 1 },
          video: { status: 'pending', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
        currentStage: 'video',
      });

      const actions = PipelineStateMachine.getAvailableActions(pipeline);
      expect(actions.canSkip).toBe(true);
    });

    it('should return correct actions for complete pipeline', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'completed', result: {} as GeneratedAsset, attempts: 1 },
          video: { status: 'completed', result: {} as GeneratedAsset, attempts: 1 },
          audio: { status: 'completed', result: {} as GeneratedAsset, attempts: 1 },
        },
        currentStage: 'complete',
      });

      const actions = PipelineStateMachine.getAvailableActions(pipeline);
      expect(actions.canProgress).toBe(false);
      expect(actions.canSkip).toBe(false);
      expect(actions.canRestart).toBe(true);
      expect(actions.restartableStages).toEqual(['prompt', 'image', 'video', 'audio']);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate 0% for new pipeline', () => {
      const pipeline = createTestPipeline();
      const progress = PipelineStateMachine.calculateProgress(pipeline);
      expect(progress).toBe(0);
    });

    it('should calculate 50% when required stages are half done', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'pending', attempts: 0 },
          video: { status: 'pending', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
      });

      const progress = PipelineStateMachine.calculateProgress(pipeline);
      expect(progress).toBe(50);
    });

    it('should calculate 100% when all required stages are done', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'completed', result: {} as GeneratedAsset, attempts: 1 },
          video: { status: 'pending', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
      });

      const progress = PipelineStateMachine.calculateProgress(pipeline);
      expect(progress).toBe(100);
    });

    it('should include optional stages in progress when completed', () => {
      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: { text: 'test' } as GeneratedPrompt, attempts: 1 },
          image: { status: 'completed', result: {} as GeneratedAsset, attempts: 1 },
          video: { status: 'completed', result: {} as GeneratedAsset, attempts: 1 },
          audio: { status: 'pending', attempts: 0 },
        },
      });

      const progress = PipelineStateMachine.calculateProgress(pipeline);
      // 3 completed out of 3 (prompt, image, video) = 100%
      expect(progress).toBe(100);
    });
  });

  describe('Display Information', () => {
    it('should return stage display names', () => {
      expect(PipelineStateMachine.getStageDisplayName('prompt')).toBe('Prompt Generation');
      expect(PipelineStateMachine.getStageDisplayName('image')).toBe('Image Generation');
      expect(PipelineStateMachine.getStageDisplayName('video')).toBe('Video Generation');
      expect(PipelineStateMachine.getStageDisplayName('audio')).toBe('Audio Generation');
      expect(PipelineStateMachine.getStageDisplayName('complete')).toBe('Complete');
    });

    it('should return stage descriptions', () => {
      const description = PipelineStateMachine.getStageDescription('prompt');
      expect(description).toContain('prompt');
      expect(description.length).toBeGreaterThan(0);
    });
  });

  describe('Asset Retrieval', () => {
    it('should get all completed assets', () => {
      const promptResult: GeneratedPrompt = {
        text: 'test prompt',
        categories: {},
        timestamp: Date.now(),
        editable: true,
      };

      const imageResult: GeneratedAsset = {
        id: 'image-1',
        type: 'image',
        url: '/test.png',
        metadata: {
          generationParams: {},
          fileSize: 1024,
          format: 'png',
        },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      const pipeline = createTestPipeline({
        stages: {
          prompt: { status: 'completed', result: promptResult, attempts: 1 },
          image: { status: 'completed', result: imageResult, attempts: 1 },
          video: { status: 'pending', attempts: 0 },
          audio: { status: 'pending', attempts: 0 },
        },
      });

      const assets = PipelineStateMachine.getAllAssets(pipeline);
      expect(assets.prompt).toEqual(promptResult);
      expect(assets.image).toEqual(imageResult);
      expect(assets.video).toBeUndefined();
      expect(assets.audio).toBeUndefined();
    });

    it('should return empty object for new pipeline', () => {
      const pipeline = createTestPipeline();
      const assets = PipelineStateMachine.getAllAssets(pipeline);
      
      expect(assets.prompt).toBeUndefined();
      expect(assets.image).toBeUndefined();
      expect(assets.video).toBeUndefined();
      expect(assets.audio).toBeUndefined();
    });
  });
});
