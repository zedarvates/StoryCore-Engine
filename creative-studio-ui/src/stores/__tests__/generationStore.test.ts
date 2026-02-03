/**
 * Unit Tests for GenerationStore
 * 
 * Task 1: Set up state management and core types
 * 
 * These tests verify:
 * - Pipeline state initialization and transitions
 * - Queue management operations
 * - History tracking
 * - Asset graph management
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGenerationStore } from '../generationStore';
import { generationHistoryService } from '../../services/GenerationHistoryService';
import type { GeneratedAsset, GeneratedPrompt } from '../../types/generation';

// Helper to get fresh store state
const getStore = () => useGenerationStore.getState();

describe('GenerationStore - Unit Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = getStore();
    store.resetPipeline();
    store.clearQueue();
    
    // Clear history service
    generationHistoryService.clearHistory();
  });

  describe('Pipeline Management', () => {
    it('should initialize a new pipeline', () => {
      const pipelineId = getStore().startPipeline();
      const store = getStore();

      expect(pipelineId).toBeDefined();
      expect(store.currentPipeline).not.toBeNull();
      expect(store.currentPipeline?.id).toBe(pipelineId);
      expect(store.currentPipeline?.currentStage).toBe('prompt');
      expect(store.currentPipeline?.stages.prompt.status).toBe('pending');
    });

    it('should complete a stage and advance to next stage', () => {
      getStore().startPipeline();

      const prompt: GeneratedPrompt = {
        text: 'A beautiful sunset over mountains',
        categories: { genre: 'landscape', mood: 'peaceful' },
        timestamp: Date.now(),
        editable: true,
      };

      getStore().completeStage('prompt', prompt);
      const store = getStore();

      expect(store.currentPipeline?.stages.prompt.status).toBe('completed');
      expect(store.currentPipeline?.stages.prompt.result).toEqual(prompt);
      expect(store.currentPipeline?.currentStage).toBe('image');
    });

    it('should fail a stage with error message', () => {
      getStore().startPipeline();

      const errorMessage = 'Service unavailable';
      getStore().failStage('prompt', errorMessage);
      const store = getStore();

      expect(store.currentPipeline?.stages.prompt.status).toBe('failed');
      expect(store.currentPipeline?.stages.prompt.error).toBe(errorMessage);
    });

    it('should skip a stage and advance to next stage', () => {
      getStore().startPipeline();
      
      // Complete prompt stage first
      const prompt: GeneratedPrompt = {
        text: 'Test prompt',
        categories: {},
        timestamp: Date.now(),
        editable: true,
      };
      getStore().completeStage('prompt', prompt);

      // Skip image stage
      getStore().skipStage('image');
      const store = getStore();

      expect(store.currentPipeline?.stages.image.status).toBe('skipped');
      expect(store.currentPipeline?.currentStage).toBe('video');
    });

    it('should update stage progress', () => {
      getStore().startPipeline();

      const progress = {
        stage: 'generating',
        stageProgress: 50,
        overallProgress: 25,
        estimatedTimeRemaining: 30,
        message: 'Generating image...',
        cancellable: true,
      };

      getStore().updateStageProgress('prompt', progress);
      const store = getStore();

      expect(store.currentPipeline?.stages.prompt.status).toBe('in_progress');
      expect(store.currentPipeline?.stages.prompt.progress).toEqual(progress);
    });

    it('should reset pipeline', () => {
      getStore().startPipeline();
      getStore().resetPipeline();
      const store = getStore();

      expect(store.currentPipeline).toBeNull();
    });

    it('should complete all stages in sequence', () => {
      getStore().startPipeline();

      // Complete prompt
      const prompt: GeneratedPrompt = {
        text: 'Test prompt',
        categories: {},
        timestamp: Date.now(),
        editable: true,
      };
      getStore().completeStage('prompt', prompt);
      expect(getStore().currentPipeline?.currentStage).toBe('image');

      // Complete image
      const image: GeneratedAsset = {
        id: 'img-1',
        type: 'image',
        url: '/path/to/image.png',
        metadata: {
          generationParams: {},
          fileSize: 1024,
          format: 'png',
        },
        relatedAssets: [],
        timestamp: Date.now(),
      };
      getStore().completeStage('image', image);
      expect(getStore().currentPipeline?.currentStage).toBe('video');

      // Complete video
      const video: GeneratedAsset = {
        id: 'vid-1',
        type: 'video',
        url: '/path/to/video.mp4',
        metadata: {
          generationParams: {},
          fileSize: 2048,
          format: 'mp4',
        },
        relatedAssets: ['img-1'],
        timestamp: Date.now(),
      };
      getStore().completeStage('video', video);
      expect(getStore().currentPipeline?.currentStage).toBe('audio');

      // Complete audio
      const audio: GeneratedAsset = {
        id: 'aud-1',
        type: 'audio',
        url: '/path/to/audio.mp3',
        metadata: {
          generationParams: {},
          fileSize: 512,
          format: 'mp3',
        },
        relatedAssets: ['vid-1'],
        timestamp: Date.now(),
      };
      getStore().completeStage('audio', audio);
      expect(getStore().currentPipeline?.currentStage).toBe('complete');
    });
  });

  describe('Queue Management', () => {
    it('should add task to queue', () => {
      const taskId = getStore().addToQueue({
        type: 'image',
        params: { prompt: 'test' },
        priority: 1,
      });
      const store = getStore();

      expect(taskId).toBeDefined();
      expect(store.queue.tasks).toHaveLength(1);
      expect(store.queue.tasks[0].id).toBe(taskId);
      expect(store.queue.tasks[0].status).toBe('queued');
    });

    it('should remove task from queue', () => {
      const taskId = getStore().addToQueue({
        type: 'image',
        params: { prompt: 'test' },
        priority: 1,
      });

      getStore().removeFromQueue(taskId);
      const store = getStore();

      expect(store.queue.tasks).toHaveLength(0);
    });

    it('should update task status', () => {
      const taskId = getStore().addToQueue({
        type: 'image',
        params: { prompt: 'test' },
        priority: 1,
      });

      getStore().updateTaskStatus(taskId, 'running');
      const store = getStore();

      expect(store.queue.tasks[0].status).toBe('running');
      expect(store.queue.activeTask).toBe(taskId);
    });

    it('should update task progress', () => {
      const taskId = getStore().addToQueue({
        type: 'image',
        params: { prompt: 'test' },
        priority: 1,
      });

      const progress = {
        stage: 'processing',
        stageProgress: 75,
        overallProgress: 75,
        estimatedTimeRemaining: 10,
        message: 'Almost done...',
        cancellable: true,
      };

      getStore().updateTaskProgress(taskId, progress);
      const store = getStore();

      expect(store.queue.tasks[0].progress).toEqual(progress);
    });

    it('should complete task with result', () => {
      const taskId = getStore().addToQueue({
        type: 'image',
        params: { prompt: 'test' },
        priority: 1,
      });

      const result: GeneratedAsset = {
        id: 'img-1',
        type: 'image',
        url: '/path/to/image.png',
        metadata: {
          generationParams: {},
          fileSize: 1024,
          format: 'png',
        },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      getStore().completeTask(taskId, result);
      const store = getStore();

      expect(store.queue.tasks[0].status).toBe('completed');
      expect(store.queue.tasks[0].result).toEqual(result);
      expect(store.queue.activeTask).toBeNull();
    });

    it('should fail task with error', () => {
      const taskId = getStore().addToQueue({
        type: 'image',
        params: { prompt: 'test' },
        priority: 1,
      });

      const error = 'Generation failed';
      getStore().failTask(taskId, error);
      const store = getStore();

      expect(store.queue.tasks[0].status).toBe('failed');
      expect(store.queue.tasks[0].error).toBe(error);
      expect(store.queue.activeTask).toBeNull();
    });

    it('should cancel task', () => {
      const taskId = getStore().addToQueue({
        type: 'image',
        params: { prompt: 'test' },
        priority: 1,
      });

      getStore().cancelTask(taskId);
      const store = getStore();

      expect(store.queue.tasks[0].status).toBe('cancelled');
      expect(store.queue.activeTask).toBeNull();
    });

    it('should clear entire queue', () => {
      getStore().addToQueue({ type: 'image', params: {}, priority: 1 });
      getStore().addToQueue({ type: 'video', params: {}, priority: 2 });
      getStore().addToQueue({ type: 'audio', params: {}, priority: 3 });

      expect(getStore().queue.tasks).toHaveLength(3);

      getStore().clearQueue();
      const store = getStore();

      expect(store.queue.tasks).toHaveLength(0);
      expect(store.queue.activeTask).toBeNull();
    });
  });

  describe('History Management (delegated to GenerationHistoryService)', () => {
    it('should log generation to history service when completing stage', () => {
      getStore().startPipeline();

      const image: GeneratedAsset = {
        id: 'img-1',
        type: 'image',
        url: '/path/to/image.png',
        metadata: {
          generationParams: { prompt: 'test' },
          fileSize: 1024,
          format: 'png',
        },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      // Complete image stage (should log to history service)
      getStore().completeStage('image', image);

      // Verify history was logged via service
      const history = generationHistoryService.getAllEntries();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('image');
      expect(history[0].result.id).toBe('img-1');
    });

    it('should use history service for querying by type', () => {
      getStore().startPipeline();

      const image: GeneratedAsset = {
        id: 'img-1',
        type: 'image',
        url: '/path/to/image.png',
        metadata: { generationParams: {}, fileSize: 1024, format: 'png' },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      const video: GeneratedAsset = {
        id: 'vid-1',
        type: 'video',
        url: '/path/to/video.mp4',
        metadata: { generationParams: {}, fileSize: 2048, format: 'mp4' },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      getStore().completeStage('image', image);
      getStore().completeStage('video', video);

      const imageHistory = generationHistoryService.getEntriesByType('image');
      expect(imageHistory).toHaveLength(1);
      expect(imageHistory[0].type).toBe('image');
    });

    it('should use history service for querying by pipeline', () => {
      const pipelineId1 = getStore().startPipeline();

      const image1: GeneratedAsset = {
        id: 'img-1',
        type: 'image',
        url: '/path/to/image.png',
        metadata: { generationParams: {}, fileSize: 1024, format: 'png' },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      getStore().completeStage('image', image1);

      // Start new pipeline
      getStore().resetPipeline();
      const pipelineId2 = getStore().startPipeline();

      const image2: GeneratedAsset = {
        id: 'img-2',
        type: 'image',
        url: '/path/to/image2.png',
        metadata: { generationParams: {}, fileSize: 1024, format: 'png' },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      getStore().completeStage('image', image2);

      const pipeline1History = generationHistoryService.getEntriesByPipelineId(pipelineId1);
      expect(pipeline1History).toHaveLength(1);
      expect(pipeline1History[0].pipelineId).toBe(pipelineId1);
    });

    it('should track versions for regenerations via history service', () => {
      getStore().startPipeline();

      const image: GeneratedAsset = {
        id: 'img-1',
        type: 'image',
        url: '/path/to/image.png',
        metadata: { generationParams: { seed: 1 }, fileSize: 1024, format: 'png' },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      // First generation
      getStore().completeStage('image', image);

      // Regenerate with different params
      getStore().resetPipeline();
      getStore().startPipeline();
      
      const image2: GeneratedAsset = {
        ...image,
        metadata: { generationParams: { seed: 2 }, fileSize: 1024, format: 'png' },
      };
      
      getStore().completeStage('image', image2);

      // Check versions via history service
      const versions = generationHistoryService.getAssetVersions('img-1');
      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(1);
      expect(versions[1].version).toBe(2);
    });
  });

  describe('Asset Graph Management', () => {
    it('should add asset to graph', () => {
      const asset: GeneratedAsset = {
        id: 'img-1',
        type: 'image',
        url: '/path/to/image.png',
        metadata: { generationParams: {}, fileSize: 1024, format: 'png' },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      getStore().addAssetToGraph(asset);
      const store = getStore();

      expect(store.assetGraph.nodes.get('img-1')).toEqual(asset);
    });

    it('should link assets', () => {
      const image: GeneratedAsset = {
        id: 'img-1',
        type: 'image',
        url: '/path/to/image.png',
        metadata: { generationParams: {}, fileSize: 1024, format: 'png' },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      const video: GeneratedAsset = {
        id: 'vid-1',
        type: 'video',
        url: '/path/to/video.mp4',
        metadata: { generationParams: {}, fileSize: 2048, format: 'mp4' },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      getStore().addAssetToGraph(image);
      getStore().addAssetToGraph(video);
      getStore().linkAssets('img-1', 'vid-1');

      const store = getStore();
      const edges = store.assetGraph.edges.get('img-1');
      expect(edges).toContain('vid-1');
    });

    it('should get related assets', () => {
      const image: GeneratedAsset = {
        id: 'img-1',
        type: 'image',
        url: '/path/to/image.png',
        metadata: { generationParams: {}, fileSize: 1024, format: 'png' },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      const video: GeneratedAsset = {
        id: 'vid-1',
        type: 'video',
        url: '/path/to/video.mp4',
        metadata: { generationParams: {}, fileSize: 2048, format: 'mp4' },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      getStore().addAssetToGraph(image);
      getStore().addAssetToGraph(video);
      getStore().linkAssets('img-1', 'vid-1');

      const related = getStore().getRelatedAssets('img-1');
      expect(related).toHaveLength(1);
      expect(related[0].id).toBe('vid-1');
    });

    it('should remove asset from graph', () => {
      const asset: GeneratedAsset = {
        id: 'img-1',
        type: 'image',
        url: '/path/to/image.png',
        metadata: { generationParams: {}, fileSize: 1024, format: 'png' },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      getStore().addAssetToGraph(asset);
      expect(getStore().assetGraph.nodes.get('img-1')).toBeDefined();

      getStore().removeAssetFromGraph('img-1');
      const store = getStore();
      expect(store.assetGraph.nodes.get('img-1')).toBeUndefined();
    });

    it('should remove asset from edges when removed from graph', () => {
      const image: GeneratedAsset = {
        id: 'img-1',
        type: 'image',
        url: '/path/to/image.png',
        metadata: { generationParams: {}, fileSize: 1024, format: 'png' },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      const video: GeneratedAsset = {
        id: 'vid-1',
        type: 'video',
        url: '/path/to/video.mp4',
        metadata: { generationParams: {}, fileSize: 2048, format: 'mp4' },
        relatedAssets: [],
        timestamp: Date.now(),
      };

      getStore().addAssetToGraph(image);
      getStore().addAssetToGraph(video);
      getStore().linkAssets('img-1', 'vid-1');

      getStore().removeAssetFromGraph('vid-1');

      const store = getStore();
      const edges = store.assetGraph.edges.get('img-1');
      expect(edges).not.toContain('vid-1');
    });
  });
});
