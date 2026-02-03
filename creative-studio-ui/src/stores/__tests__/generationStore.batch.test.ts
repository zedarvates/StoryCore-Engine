/**
 * Generation Store Batch Tests
 * 
 * Tests for batch generation functionality in the generation store.
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGenerationStore } from '../generationStore';
import type { GeneratedAsset } from '../../types/generation';

describe('GenerationStore - Batch Generation', () => {
  beforeEach(() => {
    // Reset store state
    const store = useGenerationStore.getState();
    store.setBatchConfig({
      enabled: false,
      batchSize: 4,
      variationParams: {
        varySeeds: true,
        varyPrompts: false,
        varyParameters: false,
      },
    });
    useGenerationStore.setState({
      activeBatch: null,
      batchHistory: [],
    });
  });

  describe('Batch Configuration', () => {
    it('should update batch configuration', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({ enabled: true, batchSize: 8 });
      
      const config = useGenerationStore.getState().batchConfig;
      expect(config.enabled).toBe(true);
      expect(config.batchSize).toBe(8);
    });

    it('should update variation parameters', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({
        variationParams: {
          varySeeds: true,
          seedRange: [100, 200],
          varyPrompts: true,
          promptVariations: ['prompt1', 'prompt2'],
          varyParameters: false,
        },
      });
      
      const config = useGenerationStore.getState().batchConfig;
      expect(config.variationParams.varySeeds).toBe(true);
      expect(config.variationParams.seedRange).toEqual([100, 200]);
      expect(config.variationParams.varyPrompts).toBe(true);
      expect(config.variationParams.promptVariations).toEqual(['prompt1', 'prompt2']);
    });
  });

  describe('Batch Creation', () => {
    it('should create a batch with correct number of tasks', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({ enabled: true, batchSize: 5 });
      const batchId = store.startBatch('image', { prompt: 'test', width: 512, height: 512 });
      
      const batch = useGenerationStore.getState().activeBatch;
      expect(batch).toBeDefined();
      expect(batch?.id).toBe(batchId);
      expect(batch?.tasks).toHaveLength(5);
      expect(batch?.status).toBe('pending');
    });

    it('should throw error when batch mode is disabled', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({ enabled: false });
      
      expect(() => {
        store.startBatch('image', { prompt: 'test' });
      }).toThrow('Batch generation is not enabled');
    });

    it('should apply seed variations to tasks', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({
        enabled: true,
        batchSize: 3,
        variationParams: {
          varySeeds: true,
          seedRange: [100, 200],
          varyPrompts: false,
          varyParameters: false,
        },
      });
      
      store.startBatch('image', { prompt: 'test', seed: 0 });
      
      const batch = useGenerationStore.getState().activeBatch;
      const seeds = batch?.tasks.map(t => t.params.seed) || [];
      
      // All seeds should be different and within range
      expect(new Set(seeds).size).toBe(3);
      seeds.forEach(seed => {
        expect(seed).toBeGreaterThanOrEqual(100);
        expect(seed).toBeLessThanOrEqual(200);
      });
    });

    it('should apply prompt variations to tasks', () => {
      const store = useGenerationStore.getState();
      
      const variations = ['prompt1', 'prompt2', 'prompt3'];
      store.setBatchConfig({
        enabled: true,
        batchSize: 3,
        variationParams: {
          varySeeds: false,
          varyPrompts: true,
          promptVariations: variations,
          varyParameters: false,
        },
      });
      
      store.startBatch('image', { prompt: 'base' });
      
      const batch = useGenerationStore.getState().activeBatch;
      const prompts = batch?.tasks.map(t => t.params.prompt) || [];
      
      expect(prompts).toEqual(variations);
    });
  });

  describe('Batch Task Management', () => {
    it('should update task status', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({ enabled: true, batchSize: 2 });
      const batchId = store.startBatch('image', { prompt: 'test' });
      
      const batch = useGenerationStore.getState().activeBatch;
      const taskId = batch?.tasks[0].id!;
      
      store.updateBatchTaskStatus(batchId, taskId, 'running');
      
      const updatedBatch = useGenerationStore.getState().activeBatch;
      const task = updatedBatch?.tasks.find(t => t.id === taskId);
      expect(task?.status).toBe('running');
      expect(updatedBatch?.status).toBe('running');
    });

    it('should complete batch task and add to results', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({ enabled: true, batchSize: 2 });
      const batchId = store.startBatch('image', { prompt: 'test' });
      
      const batch = useGenerationStore.getState().activeBatch;
      const taskId = batch?.tasks[0].id!;
      
      const result: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        url: 'test.jpg',
        metadata: {
          generationParams: {},
          fileSize: 1024,
          format: 'jpg',
        },
        relatedAssets: [],
        timestamp: Date.now(),
      };
      
      store.completeBatchTask(batchId, taskId, result);
      
      const updatedBatch = useGenerationStore.getState().activeBatch;
      expect(updatedBatch?.completedCount).toBe(1);
      expect(updatedBatch?.results).toHaveLength(1);
      expect(updatedBatch?.results[0]).toEqual(result);
    });

    it('should fail batch task', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({ enabled: true, batchSize: 2 });
      const batchId = store.startBatch('image', { prompt: 'test' });
      
      const batch = useGenerationStore.getState().activeBatch;
      const taskId = batch?.tasks[0].id!;
      
      store.failBatchTask(batchId, taskId, 'Test error');
      
      const updatedBatch = useGenerationStore.getState().activeBatch;
      expect(updatedBatch?.failedCount).toBe(1);
      const task = updatedBatch?.tasks.find(t => t.id === taskId);
      expect(task?.status).toBe('failed');
      expect(task?.error).toBe('Test error');
    });

    it('should move batch to history when all tasks complete', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({ enabled: true, batchSize: 2 });
      const batchId = store.startBatch('image', { prompt: 'test' });
      
      const batch = useGenerationStore.getState().activeBatch;
      const task1Id = batch?.tasks[0].id!;
      const task2Id = batch?.tasks[1].id!;
      
      const result1: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        url: 'test1.jpg',
        metadata: { generationParams: {}, fileSize: 1024, format: 'jpg' },
        relatedAssets: [],
        timestamp: Date.now(),
      };
      
      const result2: GeneratedAsset = {
        id: 'asset-2',
        type: 'image',
        url: 'test2.jpg',
        metadata: { generationParams: {}, fileSize: 1024, format: 'jpg' },
        relatedAssets: [],
        timestamp: Date.now(),
      };
      
      store.completeBatchTask(batchId, task1Id, result1);
      expect(useGenerationStore.getState().activeBatch).toBeDefined();
      
      store.completeBatchTask(batchId, task2Id, result2);
      
      const state = useGenerationStore.getState();
      expect(state.activeBatch).toBeNull();
      expect(state.batchHistory).toHaveLength(1);
      expect(state.batchHistory[0].status).toBe('completed');
      expect(state.batchHistory[0].completedCount).toBe(2);
    });
  });

  describe('Batch Cancellation', () => {
    it('should cancel active batch', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({ enabled: true, batchSize: 3 });
      const batchId = store.startBatch('image', { prompt: 'test' });
      
      store.cancelBatch(batchId);
      
      const state = useGenerationStore.getState();
      expect(state.activeBatch).toBeNull();
      expect(state.batchHistory).toHaveLength(1);
      expect(state.batchHistory[0].status).toBe('cancelled');
    });
  });

  describe('Asset Selection', () => {
    it('should mark asset as favorite', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({ enabled: true, batchSize: 1 });
      const batchId = store.startBatch('image', { prompt: 'test' });
      
      const assetId = 'asset-1';
      store.markAsFavorite(batchId, assetId);
      
      const batch = useGenerationStore.getState().activeBatch;
      expect(batch?.favorites.has(assetId)).toBe(true);
    });

    it('should mark asset as discarded', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({ enabled: true, batchSize: 1 });
      const batchId = store.startBatch('image', { prompt: 'test' });
      
      const assetId = 'asset-1';
      store.markAsDiscarded(batchId, assetId);
      
      const batch = useGenerationStore.getState().activeBatch;
      expect(batch?.discarded.has(assetId)).toBe(true);
    });

    it('should remove from discarded when marking as favorite', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({ enabled: true, batchSize: 1 });
      const batchId = store.startBatch('image', { prompt: 'test' });
      
      const assetId = 'asset-1';
      store.markAsDiscarded(batchId, assetId);
      store.markAsFavorite(batchId, assetId);
      
      const batch = useGenerationStore.getState().activeBatch;
      expect(batch?.favorites.has(assetId)).toBe(true);
      expect(batch?.discarded.has(assetId)).toBe(false);
    });

    it('should clear all selections', () => {
      const store = useGenerationStore.getState();
      
      store.setBatchConfig({ enabled: true, batchSize: 1 });
      const batchId = store.startBatch('image', { prompt: 'test' });
      
      store.markAsFavorite(batchId, 'asset-1');
      store.markAsDiscarded(batchId, 'asset-2');
      store.clearBatchSelections(batchId);
      
      const batch = useGenerationStore.getState().activeBatch;
      expect(batch?.favorites.size).toBe(0);
      expect(batch?.discarded.size).toBe(0);
    });
  });

  describe('Queue Reordering', () => {
    it('should reorder tasks in queue', () => {
      const store = useGenerationStore.getState();
      
      const task1Id = store.addToQueue({ type: 'image', params: { name: 'task1' }, priority: 1 });
      const task2Id = store.addToQueue({ type: 'image', params: { name: 'task2' }, priority: 1 });
      const task3Id = store.addToQueue({ type: 'image', params: { name: 'task3' }, priority: 1 });
      
      // Move task1 to position 2 (last)
      store.reorderQueue(task1Id, 2);
      
      const queue = useGenerationStore.getState().queue;
      expect(queue.tasks[0].id).toBe(task2Id);
      expect(queue.tasks[1].id).toBe(task3Id);
      expect(queue.tasks[2].id).toBe(task1Id);
    });

    it('should handle invalid reorder indices', () => {
      const store = useGenerationStore.getState();
      
      const taskId = store.addToQueue({ type: 'image', params: {}, priority: 1 });
      const initialQueue = useGenerationStore.getState().queue.tasks;
      
      // Try to reorder to invalid index
      store.reorderQueue(taskId, -1);
      expect(useGenerationStore.getState().queue.tasks).toEqual(initialQueue);
      
      store.reorderQueue(taskId, 999);
      expect(useGenerationStore.getState().queue.tasks).toEqual(initialQueue);
    });
  });
});
