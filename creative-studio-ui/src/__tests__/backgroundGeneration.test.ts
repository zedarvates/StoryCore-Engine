/**
 * Background Generation Continuity Tests
 * 
 * Tests for background generation handling including:
 * - State persistence during generation
 * - State restoration when returning to dashboard
 * - Generation continuation across navigation
 * - Status indicator display
 * 
 * Requirements: 10.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GenerationStatePersistenceService,
  generationStatePersistence,
  saveGenerationState,
  loadGenerationState,
  isGenerationActive,
  completeGeneration,
  getAllActiveGenerations,
} from '../services/persistence/generationStatePersistence';
import type { GenerationStatus } from '../types/projectDashboard';

// ============================================================================
// Test Setup
// ============================================================================

describe('Background Generation Continuity', () => {
  let service: GenerationStatePersistenceService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Create fresh service instance
    service = new GenerationStatePersistenceService();
  });

  afterEach(() => {
    // Cleanup timers and storage
    service.cleanup();
    localStorage.clear();
  });

  // ============================================================================
  // State Persistence Tests
  // ============================================================================

  describe('State Persistence', () => {
    it('should save generation state to localStorage', async () => {
      const projectId = 'test-project-1';
      const status: GenerationStatus = {
        stage: 'comfyui',
        progress: 45,
        currentShot: 3,
        totalShots: 10,
        startTime: Date.now(),
      };

      await service.saveGenerationState(projectId, status, true);

      // Verify state was saved
      const storageKey = `storycore_generation_state_${projectId}`;
      const saved = localStorage.getItem(storageKey);
      
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.projectId).toBe(projectId);
      expect(parsed.status.stage).toBe('comfyui');
      expect(parsed.status.progress).toBe(45);
      expect(parsed.isActive).toBe(true);
    });

    it('should load generation state from localStorage', async () => {
      const projectId = 'test-project-2';
      const status: GenerationStatus = {
        stage: 'promotion',
        progress: 75,
        currentShot: 8,
        totalShots: 10,
        startTime: Date.now(),
      };

      // Save state first
      await service.saveGenerationState(projectId, status, true);

      // Load state
      const loaded = await service.loadGenerationState(projectId);

      expect(loaded).toBeTruthy();
      expect(loaded!.projectId).toBe(projectId);
      expect(loaded!.status.stage).toBe('promotion');
      expect(loaded!.status.progress).toBe(75);
      expect(loaded!.isActive).toBe(true);
    });

    it('should return null when loading non-existent state', async () => {
      const loaded = await service.loadGenerationState('non-existent-project');
      expect(loaded).toBeNull();
    });

    it('should handle invalid JSON in storage gracefully', async () => {
      const projectId = 'test-project-3';
      const storageKey = `storycore_generation_state_${projectId}`;
      
      // Save invalid JSON
      localStorage.setItem(storageKey, 'invalid json {');

      const loaded = await service.loadGenerationState(projectId);
      expect(loaded).toBeNull();
    });
  });

  // ============================================================================
  // Active Generation Detection Tests
  // ============================================================================

  describe('Active Generation Detection', () => {
    it('should detect active generation', async () => {
      const projectId = 'test-project-4';
      const status: GenerationStatus = {
        stage: 'grid',
        progress: 20,
        startTime: Date.now(),
      };

      await service.saveGenerationState(projectId, status, true);

      const isActive = await service.isGenerationActive(projectId);
      expect(isActive).toBe(true);
    });

    it('should not detect inactive generation', async () => {
      const projectId = 'test-project-5';
      const status: GenerationStatus = {
        stage: 'complete',
        progress: 100,
        startTime: Date.now(),
      };

      await service.saveGenerationState(projectId, status, false);

      const isActive = await service.isGenerationActive(projectId);
      expect(isActive).toBe(false);
    });

    it('should not detect old generation as active', async () => {
      const projectId = 'test-project-6';
      const status: GenerationStatus = {
        stage: 'comfyui',
        progress: 50,
        startTime: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      };

      // Manually save old state
      const storageKey = `storycore_generation_state_${projectId}`;
      const state = {
        projectId,
        status,
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        isActive: true,
      };
      localStorage.setItem(storageKey, JSON.stringify(state));

      const isActive = await service.isGenerationActive(projectId);
      expect(isActive).toBe(false);
    });
  });

  // ============================================================================
  // Generation Completion Tests
  // ============================================================================

  describe('Generation Completion', () => {
    it('should remove state when generation completes', async () => {
      const projectId = 'test-project-7';
      const status: GenerationStatus = {
        stage: 'export',
        progress: 95,
        startTime: Date.now(),
      };

      // Save state
      await service.saveGenerationState(projectId, status, true);

      // Verify state exists
      let loaded = await service.loadGenerationState(projectId);
      expect(loaded).toBeTruthy();

      // Complete generation
      await service.completeGeneration(projectId);

      // Verify state was removed
      loaded = await service.loadGenerationState(projectId);
      expect(loaded).toBeNull();
    });

    it('should cancel periodic updates when completing generation', async () => {
      const projectId = 'test-project-8';
      let callCount = 0;

      const getStatus = (): GenerationStatus => {
        callCount++;
        return {
          stage: 'comfyui',
          progress: 50,
          startTime: Date.now(),
        };
      };

      // Start periodic updates with short interval
      const testService = new GenerationStatePersistenceService({
        updateInterval: 100, // 100ms for testing
      });

      testService.startPeriodicUpdates(projectId, getStatus);

      // Wait for a few updates
      await new Promise(resolve => setTimeout(resolve, 350));

      // Complete generation
      await testService.completeGeneration(projectId);

      const countBeforeWait = callCount;

      // Wait more time
      await new Promise(resolve => setTimeout(resolve, 300));

      // Call count should not increase after completion
      expect(callCount).toBe(countBeforeWait);

      testService.cleanup();
    });
  });

  // ============================================================================
  // Periodic Updates Tests
  // ============================================================================

  describe('Periodic Updates', () => {
    it('should update state periodically during generation', async () => {
      const projectId = 'test-project-9';
      let progress = 0;

      const getStatus = (): GenerationStatus => {
        progress += 10;
        return {
          stage: 'comfyui',
          progress,
          startTime: Date.now(),
        };
      };

      // Start periodic updates with short interval
      const testService = new GenerationStatePersistenceService({
        updateInterval: 100, // 100ms for testing
      });

      testService.startPeriodicUpdates(projectId, getStatus);

      // Wait for a few updates
      await new Promise(resolve => setTimeout(resolve, 350));

      // Load state and verify it was updated
      const loaded = await testService.loadGenerationState(projectId);
      expect(loaded).toBeTruthy();
      expect(loaded!.status.progress).toBeGreaterThan(0);

      testService.cleanup();
    });

    it('should stop periodic updates when generation completes', async () => {
      const projectId = 'test-project-10';
      let stage: GenerationStatus['stage'] = 'grid';

      const getStatus = (): GenerationStatus => {
        return {
          stage,
          progress: stage === 'complete' ? 100 : 50,
          startTime: Date.now(),
        };
      };

      // Start periodic updates with short interval
      const testService = new GenerationStatePersistenceService({
        updateInterval: 100, // 100ms for testing
      });

      testService.startPeriodicUpdates(projectId, getStatus);

      // Wait for initial update
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify state exists
      let loaded = await testService.loadGenerationState(projectId);
      expect(loaded).toBeTruthy();

      // Change stage to complete
      stage = 'complete';

      // Wait for update to detect completion
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify state was removed
      loaded = await testService.loadGenerationState(projectId);
      expect(loaded).toBeNull();

      testService.cleanup();
    });

    it('should cancel existing timer when starting new periodic updates', async () => {
      const projectId = 'test-project-11';
      let callCount = 0;

      const getStatus = (): GenerationStatus => {
        callCount++;
        return {
          stage: 'comfyui',
          progress: 50,
          startTime: Date.now(),
        };
      };

      // Start periodic updates
      const testService = new GenerationStatePersistenceService({
        updateInterval: 100,
      });

      testService.startPeriodicUpdates(projectId, getStatus);

      // Wait for a few updates
      await new Promise(resolve => setTimeout(resolve, 350));

      const countAfterFirst = callCount;

      // Start new periodic updates (should cancel previous)
      testService.startPeriodicUpdates(projectId, getStatus);

      // Wait for more updates
      await new Promise(resolve => setTimeout(resolve, 350));

      // Verify updates continued (not doubled)
      // Should have at least one more update
      expect(callCount).toBeGreaterThan(countAfterFirst);
      // Should not have doubled (allowing some margin for timing)
      expect(callCount).toBeLessThanOrEqual(countAfterFirst + 5);

      testService.cleanup();
    });
  });

  // ============================================================================
  // Multiple Active Generations Tests
  // ============================================================================

  describe('Multiple Active Generations', () => {
    it('should track multiple active generations', async () => {
      const projects = ['project-1', 'project-2', 'project-3'];

      // Save state for multiple projects
      for (let i = 0; i < projects.length; i++) {
        const status: GenerationStatus = {
          stage: 'comfyui',
          progress: (i + 1) * 20,
          startTime: Date.now(),
        };
        await service.saveGenerationState(projects[i], status, true);
      }

      // Get all active generations
      const active = await service.getAllActiveGenerations();

      expect(active).toHaveLength(3);
      expect(active.map(g => g.projectId).sort()).toEqual(projects.sort());
    });

    it('should filter out old generations from active list', async () => {
      const recentProject = 'recent-project';
      const oldProject = 'old-project';

      // Save recent generation
      await service.saveGenerationState(
        recentProject,
        { stage: 'comfyui', progress: 50, startTime: Date.now() },
        true
      );

      // Manually save old generation
      const storageKey = `storycore_generation_state_${oldProject}`;
      const oldState = {
        projectId: oldProject,
        status: { stage: 'comfyui', progress: 50, startTime: Date.now() - 10 * 60 * 1000 },
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        isActive: true,
      };
      localStorage.setItem(storageKey, JSON.stringify(oldState));

      // Get active generations
      const active = await service.getAllActiveGenerations();

      // Should only include recent project
      expect(active).toHaveLength(1);
      expect(active[0].projectId).toBe(recentProject);

      // Old project should be cleaned up
      const oldLoaded = await service.loadGenerationState(oldProject);
      expect(oldLoaded).toBeNull();
    });

    it('should filter out inactive generations from active list', async () => {
      const activeProject = 'active-project';
      const inactiveProject = 'inactive-project';

      // Save active generation
      await service.saveGenerationState(
        activeProject,
        { stage: 'comfyui', progress: 50, startTime: Date.now() },
        true
      );

      // Save inactive generation
      await service.saveGenerationState(
        inactiveProject,
        { stage: 'complete', progress: 100, startTime: Date.now() },
        false
      );

      // Get active generations
      const active = await service.getAllActiveGenerations();

      // Should only include active project
      expect(active).toHaveLength(1);
      expect(active[0].projectId).toBe(activeProject);
    });
  });

  // ============================================================================
  // Convenience Functions Tests
  // ============================================================================

  describe('Convenience Functions', () => {
    it('should work with convenience functions', async () => {
      const projectId = 'convenience-test';
      const status: GenerationStatus = {
        stage: 'qa',
        progress: 85,
        startTime: Date.now(),
      };

      // Save using convenience function
      await saveGenerationState(projectId, status, true);

      // Load using convenience function
      const loaded = await loadGenerationState(projectId);
      expect(loaded).toBeTruthy();
      expect(loaded!.status.stage).toBe('qa');

      // Check active using convenience function
      const active = await isGenerationActive(projectId);
      expect(active).toBe(true);

      // Complete using convenience function
      await completeGeneration(projectId);

      // Verify removed
      const afterComplete = await loadGenerationState(projectId);
      expect(afterComplete).toBeNull();
    });

    it('should get all active generations using convenience function', async () => {
      // Save multiple generations
      await saveGenerationState('proj-1', { stage: 'grid', progress: 20, startTime: Date.now() }, true);
      await saveGenerationState('proj-2', { stage: 'comfyui', progress: 50, startTime: Date.now() }, true);

      // Get all active
      const active = await getAllActiveGenerations();
      expect(active).toHaveLength(2);
    });
  });

  // ============================================================================
  // Cleanup Tests
  // ============================================================================

  describe('Cleanup', () => {
    it('should cleanup all generation states', async () => {
      // Save multiple generations
      await service.saveGenerationState('proj-1', { stage: 'grid', progress: 20, startTime: Date.now() }, true);
      await service.saveGenerationState('proj-2', { stage: 'comfyui', progress: 50, startTime: Date.now() }, true);
      await service.saveGenerationState('proj-3', { stage: 'qa', progress: 80, startTime: Date.now() }, true);

      // Verify they exist
      let active = await service.getAllActiveGenerations();
      expect(active).toHaveLength(3);

      // Cleanup all
      await service.cleanupAllStates();

      // Verify all removed
      active = await service.getAllActiveGenerations();
      expect(active).toHaveLength(0);
    });

    it('should cancel all timers on cleanup', async () => {
      let callCount = 0;

      const getStatus = (): GenerationStatus => {
        callCount++;
        return { stage: 'comfyui', progress: 50, startTime: Date.now() };
      };

      const testService = new GenerationStatePersistenceService({
        updateInterval: 100,
      });

      // Start multiple periodic updates
      testService.startPeriodicUpdates('proj-1', getStatus);
      testService.startPeriodicUpdates('proj-2', getStatus);

      // Wait for some updates
      await new Promise(resolve => setTimeout(resolve, 250));

      const countBeforeCleanup = callCount;

      // Cleanup
      testService.cleanup();

      // Wait more time
      await new Promise(resolve => setTimeout(resolve, 250));

      // Call count should not increase after cleanup
      expect(callCount).toBe(countBeforeCleanup);
    });
  });
});
