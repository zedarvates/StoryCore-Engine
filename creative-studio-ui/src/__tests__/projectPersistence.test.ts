/**
 * Project Persistence Tests
 * 
 * Unit tests for project persistence utilities including save, load,
 * auto-save, retry logic, and error handling.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ProjectPersistenceService,
  type StorageBackend,
  type SaveResult,
  type LoadResult,
} from '../services/persistence/projectPersistence';
import type { Project } from '../types/projectDashboard';

// ============================================================================
// Mock Storage Backend
// ============================================================================

class MockStorageBackend implements StorageBackend {
  private storage: Map<string, string> = new Map();
  public saveCallCount = 0;
  public loadCallCount = 0;
  public shouldFailSave = false;
  public shouldFailLoad = false;
  public failureCount = 0;
  public maxFailures = 0;

  async save(key: string, data: string): Promise<void> {
    this.saveCallCount++;

    if (this.shouldFailSave && this.failureCount < this.maxFailures) {
      this.failureCount++;
      throw new Error('Mock save failure');
    }

    this.storage.set(key, data);
  }

  async load(key: string): Promise<string | null> {
    this.loadCallCount++;

    if (this.shouldFailLoad) {
      throw new Error('Mock load failure');
    }

    return this.storage.get(key) || null;
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async list(): Promise<string[]> {
    return Array.from(this.storage.keys()).map(key =>
      key.replace('storycore_project_', '')
    );
  }

  reset(): void {
    this.storage.clear();
    this.saveCallCount = 0;
    this.loadCallCount = 0;
    this.shouldFailSave = false;
    this.shouldFailLoad = false;
    this.failureCount = 0;
    this.maxFailures = 0;
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

function createTestProject(id: string = 'test-project'): Project {
  return {
    id,
    name: `Test Project ${id}`,
    schemaVersion: '1.0',
    sequences: [],
    shots: [
      {
        id: 'shot-1',
        sequenceId: 'seq-1',
        startTime: 0,
        duration: 5,
        prompt: 'A beautiful sunset over the ocean',
        metadata: {},
      },
    ],
    audioPhrases: [],
    generationHistory: [],
    capabilities: {
      gridGeneration: true,
      promotionEngine: true,
      qaEngine: true,
      autofixEngine: true,
      voiceGeneration: true,
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('ProjectPersistenceService', () => {
  let mockBackend: MockStorageBackend;
  let service: ProjectPersistenceService;

  beforeEach(() => {
    mockBackend = new MockStorageBackend();
    service = new ProjectPersistenceService(mockBackend, {
      autoSave: false, // Disable auto-save for manual testing
      maxRetries: 3,
      retryDelay: 10, // Short delay for tests
    });
  });

  afterEach(() => {
    service.cleanup();
    mockBackend.reset();
  });

  // ==========================================================================
  // Save Tests
  // ==========================================================================

  describe('saveProject', () => {
    it('should save project successfully', async () => {
      const project = createTestProject();
      const result: SaveResult = await service.saveProject(project);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockBackend.saveCallCount).toBe(1);
    });

    it('should validate project data before saving', async () => {
      const invalidProject = {
        id: 'test',
        // Missing required fields
      } as unknown as Project;

      const result: SaveResult = await service.saveProject(invalidProject);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('validation failed');
      expect(mockBackend.saveCallCount).toBe(0);
    });

    it('should retry on save failure', async () => {
      mockBackend.shouldFailSave = true;
      mockBackend.maxFailures = 2; // Fail first 2 attempts, succeed on 3rd

      const project = createTestProject();
      const result: SaveResult = await service.saveProject(project);

      expect(result.success).toBe(true);
      expect(mockBackend.saveCallCount).toBe(3); // 2 failures + 1 success
    });

    it('should fail after max retries', async () => {
      mockBackend.shouldFailSave = true;
      mockBackend.maxFailures = 10; // Always fail

      const project = createTestProject();
      const result: SaveResult = await service.saveProject(project);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockBackend.saveCallCount).toBe(3); // Max retries
    });

    it('should not save same project concurrently', async () => {
      const project = createTestProject();

      // Start two saves simultaneously
      const promise1 = service.saveProject(project);
      const promise2 = service.saveProject(project);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      // Should only save once due to deduplication
      expect(mockBackend.saveCallCount).toBe(1);
    });
  });

  // ==========================================================================
  // Load Tests
  // ==========================================================================

  describe('loadProject', () => {
    it('should load project successfully', async () => {
      const project = createTestProject();
      await service.saveProject(project);

      const result: LoadResult = await service.loadProject(project.id);

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      expect(result.project?.id).toBe(project.id);
      expect(result.project?.name).toBe(project.name);
    });

    it('should fail when project does not exist', async () => {
      const result: LoadResult = await service.loadProject('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('not found');
    });

    it('should validate loaded project data', async () => {
      // Manually insert invalid data
      await mockBackend.save(
        'storycore_project_invalid',
        JSON.stringify({ invalid: 'data' })
      );

      const result: LoadResult = await service.loadProject('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('validation failed');
    });

    it('should handle corrupted JSON data', async () => {
      // Manually insert corrupted data
      await mockBackend.save('storycore_project_corrupted', 'not valid json {');

      const result: LoadResult = await service.loadProject('corrupted');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('parse');
    });
  });

  // ==========================================================================
  // Auto-Save Tests
  // ==========================================================================

  describe('scheduleAutoSave', () => {
    it('should schedule auto-save with debouncing', async () => {
      const autoSaveService = new ProjectPersistenceService(mockBackend, {
        autoSave: true,
        autoSaveDelay: 50, // 50ms for testing
      });

      const project = createTestProject();

      // Schedule auto-save
      autoSaveService.scheduleAutoSave(project);

      // Should not save immediately
      expect(mockBackend.saveCallCount).toBe(0);

      // Wait for auto-save delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should have saved
      expect(mockBackend.saveCallCount).toBe(1);

      autoSaveService.cleanup();
    });

    it('should debounce multiple auto-save calls', async () => {
      const autoSaveService = new ProjectPersistenceService(mockBackend, {
        autoSave: true,
        autoSaveDelay: 50,
      });

      const project = createTestProject();

      // Schedule multiple auto-saves rapidly
      autoSaveService.scheduleAutoSave(project);
      await new Promise(resolve => setTimeout(resolve, 10));
      autoSaveService.scheduleAutoSave(project);
      await new Promise(resolve => setTimeout(resolve, 10));
      autoSaveService.scheduleAutoSave(project);

      // Wait for auto-save delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should only save once due to debouncing
      expect(mockBackend.saveCallCount).toBe(1);

      autoSaveService.cleanup();
    });

    it('should cancel auto-save when requested', async () => {
      const autoSaveService = new ProjectPersistenceService(mockBackend, {
        autoSave: true,
        autoSaveDelay: 50,
      });

      const project = createTestProject();

      // Schedule auto-save
      autoSaveService.scheduleAutoSave(project);

      // Cancel before it fires
      autoSaveService.cancelAutoSave(project.id);

      // Wait for what would have been the auto-save delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not have saved
      expect(mockBackend.saveCallCount).toBe(0);

      autoSaveService.cleanup();
    });
  });

  // ==========================================================================
  // Utility Tests
  // ==========================================================================

  describe('projectExists', () => {
    it('should return true for existing project', async () => {
      const project = createTestProject();
      await service.saveProject(project);

      const exists = await service.projectExists(project.id);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing project', async () => {
      const exists = await service.projectExists('nonexistent');
      expect(exists).toBe(false);
    });
  });

  describe('deleteProject', () => {
    it('should delete project', async () => {
      const project = createTestProject();
      await service.saveProject(project);

      expect(await service.projectExists(project.id)).toBe(true);

      await service.deleteProject(project.id);

      expect(await service.projectExists(project.id)).toBe(false);
    });
  });

  describe('listProjects', () => {
    it('should list all projects', async () => {
      const project1 = createTestProject('project-1');
      const project2 = createTestProject('project-2');
      const project3 = createTestProject('project-3');

      await service.saveProject(project1);
      await service.saveProject(project2);
      await service.saveProject(project3);

      const projects = await service.listProjects();

      expect(projects).toHaveLength(3);
      expect(projects).toContain('project-1');
      expect(projects).toContain('project-2');
      expect(projects).toContain('project-3');
    });

    it('should return empty array when no projects', async () => {
      const projects = await service.listProjects();
      expect(projects).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Callback Tests
  // ==========================================================================

  describe('callbacks', () => {
    it('should call onSaveSuccess callback', async () => {
      const onSaveSuccess = vi.fn();
      const callbackService = new ProjectPersistenceService(mockBackend, {
        onSaveSuccess,
      });

      const project = createTestProject();
      await callbackService.saveProject(project);

      expect(onSaveSuccess).toHaveBeenCalledWith(project.id);
    });

    it('should call onSaveError callback on failure', async () => {
      mockBackend.shouldFailSave = true;
      mockBackend.maxFailures = 10;

      const onSaveError = vi.fn();
      const callbackService = new ProjectPersistenceService(mockBackend, {
        onSaveError,
        maxRetries: 1,
      });

      const project = createTestProject();
      await callbackService.saveProject(project);

      expect(onSaveError).toHaveBeenCalled();
      expect(onSaveError.mock.calls[0][0]).toBeInstanceOf(Error);
    });

    it('should call onLoadSuccess callback', async () => {
      const project = createTestProject();
      await service.saveProject(project);

      const onLoadSuccess = vi.fn();
      const callbackService = new ProjectPersistenceService(mockBackend, {
        onLoadSuccess,
      });

      await callbackService.loadProject(project.id);

      expect(onLoadSuccess).toHaveBeenCalled();
      expect(onLoadSuccess.mock.calls[0][0].id).toBe(project.id);
    });

    it('should call onLoadError callback on failure', async () => {
      const onLoadError = vi.fn();
      const callbackService = new ProjectPersistenceService(mockBackend, {
        onLoadError,
      });

      await callbackService.loadProject('nonexistent');

      expect(onLoadError).toHaveBeenCalled();
      expect(onLoadError.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });
});
