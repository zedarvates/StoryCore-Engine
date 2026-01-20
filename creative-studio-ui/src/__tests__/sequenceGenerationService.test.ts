/**
 * Sequence Generation Service Tests
 * 
 * Tests for the sequence generation pipeline orchestration logic,
 * including stage execution, error handling, and retry mechanisms.
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.1, 8.2, 8.3, 8.4, 9.5
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { SequenceGenerationService } from '../services/sequenceGenerationService';
import { GenerationErrorHandler } from '../utils/generationErrorHandling';
import type { Project, GenerationStatus } from '../types/projectDashboard';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock BackendApiService
vi.mock('../services/backendApiService', () => ({
  BackendApiService: vi.fn().mockImplementation(() => ({
    invokeCliCommand: vi.fn(),
    submitComfyUIWorkflow: vi.fn(),
    getComfyUIStatus: vi.fn(),
  })),
}));

// ============================================================================
// Test Data
// ============================================================================

const createMockProject = (): Project => ({
  id: 'test-project-1',
  name: 'Test Project',
  schemaVersion: '1.0',
  sequences: [],
  shots: [
    {
       id: 'shot-1',
       sequenceId: 'seq-1',
       startTime: 0,
       duration: 5,
       prompt: 'A beautiful sunrise over mountains',
       promptValidation: {
         isValid: true,
         errors: [],
         warnings: [],
         suggestions: [],
       },
       metadata: {},
     },
     {
       id: 'shot-2',
       sequenceId: 'seq-1',
       startTime: 5,
       duration: 5,
       prompt: 'A hero running through the forest',
       promptValidation: {
         isValid: true,
         errors: [],
         warnings: [],
         suggestions: [],
       },
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
});

// ============================================================================
// Tests
// ============================================================================

describe('SequenceGenerationService', () => {
  let service: SequenceGenerationService;
  let mockBackendApi: any;
  let mockErrorHandler: GenerationErrorHandler;
  let progressCallback: Mock;
  let stageCompleteCallback: Mock;
  let errorCallback: Mock;

  beforeEach(() => {
    // Create mock backend API
    mockBackendApi = {
      invokeCliCommand: vi.fn(),
      submitComfyUIWorkflow: vi.fn(),
      getComfyUIStatus: vi.fn(),
    };

    // Create error handler
    mockErrorHandler = new GenerationErrorHandler();

    // Create service with mocks
    service = new SequenceGenerationService(mockBackendApi, mockErrorHandler);

    // Create callback mocks
    progressCallback = vi.fn();
    stageCompleteCallback = vi.fn();
    errorCallback = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Pipeline Orchestration Tests
  // ==========================================================================

  describe('Pipeline Orchestration', () => {
    it('should execute all pipeline stages in correct order', async () => {
      // Requirements: 3.2, 3.3, 3.4, 3.5
      const project = createMockProject();

      // Mock successful responses for all stages
      mockBackendApi.invokeCliCommand.mockImplementation((command: string) => {
        if (command === 'grid') {
          return Promise.resolve({
            success: true,
            data: {
              gridUrl: '/test/grid.png',
              gridImages: [],
            },
          });
        }
        if (command === 'promote') {
          return Promise.resolve({
            success: true,
            data: {
              promotedUrl: '/test/promoted.png',
            },
          });
        }
        if (command === 'qa') {
          return Promise.resolve({
            success: true,
            data: {
              overallScore: 95,
              shotScores: [],
              autofixApplied: false,
            },
          });
        }
        if (command === 'export') {
          return Promise.resolve({
            success: true,
            data: {
              exportUrl: '/test/export.zip',
            },
          });
        }
        return Promise.resolve({ success: false });
      });

      mockBackendApi.submitComfyUIWorkflow.mockResolvedValue({
        success: true,
        data: { promptId: 'prompt-1' },
      });

      mockBackendApi.getComfyUIStatus.mockResolvedValue({
        success: true,
        data: {
          status: 'completed',
          outputs: [{ url: '/test/output.png' }],
        },
      });

      // Execute generation
      const results = await service.generateSequence(project, {
        onProgress: progressCallback,
        onStageComplete: stageCompleteCallback,
        onError: errorCallback,
      });

      // Verify results
      expect(results).toBeTruthy();
      expect(results?.success).toBe(true);
      expect(results?.masterCoherenceSheetUrl).toBe('/test/grid.png');
      expect(results?.generatedShots).toHaveLength(2);

      // Verify stage completion callbacks were called in order
      expect(stageCompleteCallback).toHaveBeenCalledTimes(5);
      const stages = stageCompleteCallback.mock.calls.map((call: any) => call[0]);
      expect(stages).toEqual(['grid', 'comfyui', 'promotion', 'qa', 'export']);
    });

    it('should track progress through all stages', async () => {
      // Requirements: 3.6, 8.1, 8.2, 8.3, 8.4
      const project = createMockProject();

      // Mock successful responses
      mockBackendApi.invokeCliCommand.mockResolvedValue({
        success: true,
        data: {},
      });

      mockBackendApi.submitComfyUIWorkflow.mockResolvedValue({
        success: true,
        data: { promptId: 'prompt-1' },
      });

      mockBackendApi.getComfyUIStatus.mockResolvedValue({
        success: true,
        data: {
          status: 'completed',
          outputs: [{ url: '/test/output.png' }],
        },
      });

      // Execute generation
      await service.generateSequence(project, {
        onProgress: progressCallback,
      });

      // Verify progress was tracked
      expect(progressCallback).toHaveBeenCalled();

      // Check that progress went from 0 to 100
      const progressValues = progressCallback.mock.calls.map(
        (call: any) => (call[0] as GenerationStatus).progress
      );
      expect(progressValues[0]).toBe(0);
      expect(progressValues[progressValues.length - 1]).toBe(100);

      // Verify all stages were reported
      const stages = progressCallback.mock.calls.map(
        (call: any) => (call[0] as GenerationStatus).stage
      );
      expect(stages).toContain('grid');
      expect(stages).toContain('comfyui');
      expect(stages).toContain('promotion');
      expect(stages).toContain('qa');
      expect(stages).toContain('export');
      expect(stages).toContain('complete');
    });

    it('should validate project has shots before generation', async () => {
      // Requirements: 3.2
      const emptyProject: Project = {
        ...createMockProject(),
        shots: [],
      };

      // Execute generation
      const results = await service.generateSequence(emptyProject, {
        onError: errorCallback,
      });

      // Verify generation failed
      expect(results).toBeNull();
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle grid generation failure', async () => {
      // Requirements: 3.7
      const project = createMockProject();

      // Mock grid failure
      mockBackendApi.invokeCliCommand.mockResolvedValue({
        success: false,
        error: 'Grid generation failed',
      });

      // Execute generation
      const results = await service.generateSequence(project, {
        onError: errorCallback,
        retryAttempts: 1,
      });

      // Verify error handling
      expect(results).toBeNull();
      expect(errorCallback).toHaveBeenCalled();
      expect(errorCallback.mock.calls[0][0].stage).toBe('grid');
    });

    it('should handle ComfyUI failure', async () => {
      // Requirements: 3.7
      const project = createMockProject();

      // Mock successful grid, failed ComfyUI
      mockBackendApi.invokeCliCommand.mockImplementation((command: string) => {
        if (command === 'grid') {
          return Promise.resolve({
            success: true,
            data: { gridUrl: '/test/grid.png' },
          });
        }
        return Promise.resolve({ success: false });
      });

      mockBackendApi.submitComfyUIWorkflow.mockResolvedValue({
        success: false,
        error: 'ComfyUI connection failed',
      });

      // Execute generation
      const results = await service.generateSequence(project, {
        onError: errorCallback,
        retryAttempts: 1,
      });

      // Verify error handling
      expect(results).toBeNull();
      expect(errorCallback).toHaveBeenCalled();
    });

    it('should save partial results on failure', async () => {
      // Requirements: 9.5
      const project = createMockProject();

      // Mock successful grid, failed ComfyUI
      mockBackendApi.invokeCliCommand.mockImplementation((command: string) => {
        if (command === 'grid') {
          return Promise.resolve({
            success: true,
            data: { gridUrl: '/test/grid.png' },
          });
        }
        return Promise.resolve({ success: false });
      });

      mockBackendApi.submitComfyUIWorkflow.mockResolvedValue({
        success: false,
        error: 'ComfyUI failed',
      });

      // Spy on error handler
      const savePartialSpy = vi.spyOn(mockErrorHandler, 'savePartialResults');

      // Execute generation
      await service.generateSequence(project, {
        onError: errorCallback,
        retryAttempts: 1,
      });

      // Verify partial results were saved
      expect(savePartialSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Retry Logic Tests
  // ==========================================================================

  describe('Retry Logic', () => {
    it('should retry failed stages with exponential backoff', async () => {
      // Requirements: 3.7
      const project = createMockProject();

      let attemptCount = 0;

      // Mock failure then success
      mockBackendApi.invokeCliCommand.mockImplementation((command: string) => {
        if (command === 'grid') {
          attemptCount++;
          if (attemptCount < 2) {
            return Promise.resolve({
              success: false,
              error: 'Temporary network error',
            });
          }
          return Promise.resolve({
            success: true,
            data: { gridUrl: '/test/grid.png' },
          });
        }
        return Promise.resolve({ success: true, data: {} });
      });

      mockBackendApi.submitComfyUIWorkflow.mockResolvedValue({
        success: true,
        data: { promptId: 'prompt-1' },
      });

      mockBackendApi.getComfyUIStatus.mockResolvedValue({
        success: true,
        data: {
          status: 'completed',
          outputs: [{ url: '/test/output.png' }],
        },
      });

      // Execute generation with retries
      const results = await service.generateSequence(project, {
        onError: errorCallback,
        retryAttempts: 3,
        retryDelayMs: 100,
      });

      // Verify retry occurred
      expect(attemptCount).toBe(2);
      expect(results).toBeTruthy();
      expect(results?.success).toBe(true);
    });

    it('should fail after max retry attempts', async () => {
      // Requirements: 3.7
      const project = createMockProject();

      // Mock persistent failure
      mockBackendApi.invokeCliCommand.mockResolvedValue({
        success: false,
        error: 'Persistent network error',
      });

      // Execute generation
      const results = await service.generateSequence(project, {
        onError: errorCallback,
        retryAttempts: 2,
        retryDelayMs: 10,
      });

      // Verify failure after retries
      expect(results).toBeNull();
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Cancellation Tests
  // ==========================================================================

  describe('Cancellation', () => {
    it('should cancel ongoing generation', async () => {
      // Requirements: 8.5
      const project = createMockProject();

      // Mock slow grid generation
      mockBackendApi.invokeCliCommand.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ success: true, data: { gridUrl: '/test/grid.png' } });
          }, 1000);
        });
      });

      // Start generation
      const generationPromise = service.generateSequence(project, {
        onProgress: progressCallback,
      });

      // Cancel after a short delay
      setTimeout(() => {
        service.cancel();
      }, 50);

      // Wait for generation to complete
      const results = await generationPromise;

      // Verify cancellation
      expect(results).toBeNull();
    });

    it('should report isGenerating status correctly', () => {
      // Requirements: 8.1
      expect(service.isGenerating()).toBe(false);

      // Start generation (don't await)
      const project = createMockProject();
      mockBackendApi.invokeCliCommand.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({ success: true, data: {} });
          }, 100);
        });
      });

      service.generateSequence(project);

      // Check status during generation
      expect(service.isGenerating()).toBe(true);
    });
  });

  // ==========================================================================
  // Partial Results Recovery Tests
  // ==========================================================================

  describe('Partial Results Recovery', () => {
    it('should load partial results for recovery', () => {
      // Requirements: 9.5
      const projectId = 'test-project-1';

      // Save partial results
      mockErrorHandler.savePartialResults(
        projectId,
        ['grid', 'comfyui'],
        [],
        '/test/grid.png'
      );

      // Load partial results
      const partialResults = service.getPartialResults(projectId);

      // Verify loaded results
      expect(partialResults).toBeTruthy();
      expect(partialResults?.projectId).toBe(projectId);
      expect(partialResults?.completedStages).toContain('grid');
      expect(partialResults?.completedStages).toContain('comfyui');
      expect(partialResults?.masterCoherenceSheetUrl).toBe('/test/grid.png');
    });

    it('should clear partial results after successful completion', async () => {
      // Requirements: 9.5
      const project = createMockProject();

      // Mock successful generation
      mockBackendApi.invokeCliCommand.mockResolvedValue({
        success: true,
        data: {},
      });

      mockBackendApi.submitComfyUIWorkflow.mockResolvedValue({
        success: true,
        data: { promptId: 'prompt-1' },
      });

      mockBackendApi.getComfyUIStatus.mockResolvedValue({
        success: true,
        data: {
          status: 'completed',
          outputs: [{ url: '/test/output.png' }],
        },
      });

      // Spy on clear method
      const clearPartialSpy = vi.spyOn(mockErrorHandler, 'clearPartialResults');

      // Execute generation
      await service.generateSequence(project);

      // Verify partial results were cleared
      expect(clearPartialSpy).toHaveBeenCalledWith(project.id);
    });
  });
});
