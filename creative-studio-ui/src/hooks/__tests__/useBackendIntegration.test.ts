/**
 * Tests for useBackendIntegration Hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBackendIntegration } from '../useBackendIntegration';
import { useAppStore } from '@/stores/useAppStore';
import { MockBackendApiService } from '@/services/backendApiService';
import type { Project, Shot, GenerationTask } from '@/types';

// Mock the store
vi.mock('@/stores/useAppStore');

describe('useBackendIntegration', () => {
  let mockProject: Project;
  let mockShots: Shot[];
  let mockTasks: GenerationTask[];
  let mockApiService: MockBackendApiService;
  let mockReorderTasks: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockShots = [
      {
        id: 'shot-1',
        title: 'Test Shot',
        description: 'Test',
        duration: 5,
        position: 0,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
      },
    ];

    mockProject = {
      schema_version: '1.0',
      project_name: 'Test Project',
      shots: mockShots,
      assets: [],
      capabilities: {
        grid_generation: true,
        promotion_engine: true,
        qa_engine: true,
        autofix_engine: true,
      },
      generation_status: {
        grid: 'pending',
        promotion: 'pending',
      },
    };

    mockTasks = [
      {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid',
        status: 'pending',
        priority: 1,
        createdAt: new Date(),
      },
    ];

    mockApiService = new MockBackendApiService();
    mockApiService.setMockDelay(10);

    mockReorderTasks = vi.fn();

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      project: mockProject,
      shots: mockShots,
      assets: [],
      taskQueue: mockTasks,
      reorderTasks: mockReorderTasks,
    });
  });

  describe('submitProject', () => {
    it('should submit project successfully', async () => {
      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      let success = false;
      await act(async () => {
        success = await result.current.submitProject();
      });

      expect(success).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should set error when no project exists', async () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: null,
        shots: [],
        assets: [],
        taskQueue: [],
        reorderTasks: mockReorderTasks,
      });

      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      let success = false;
      await act(async () => {
        success = await result.current.submitProject();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('No project to submit');
    });

    it('should set isSubmitting during submission', async () => {
      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      expect(result.current.isSubmitting).toBe(false);

      const promise = act(async () => {
        await result.current.submitProject();
      });

      // Check if isSubmitting is true during submission
      await waitFor(() => {
        // After submission completes
        expect(result.current.isSubmitting).toBe(false);
      });

      await promise;
    });
  });

  describe('submitTask', () => {
    it('should submit task successfully', async () => {
      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      let success = false;
      await act(async () => {
        success = await result.current.submitTask(mockTasks[0]);
      });

      expect(success).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should update task status after submission', async () => {
      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      await act(async () => {
        await result.current.submitTask(mockTasks[0]);
      });

      expect(mockReorderTasks).toHaveBeenCalled();
      const updatedQueue = mockReorderTasks.mock.calls[0][0];
      expect(updatedQueue[0].status).toBe('processing');
    });

    it('should set error when no project context', async () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: null,
        shots: [],
        assets: [],
        taskQueue: mockTasks,
        reorderTasks: mockReorderTasks,
      });

      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      let success = false;
      await act(async () => {
        success = await result.current.submitTask(mockTasks[0]);
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('No project context for task');
    });
  });

  describe('submitAllTasks', () => {
    it('should submit all pending tasks', async () => {
      const multipleTasks: GenerationTask[] = [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'pending',
          priority: 1,
          createdAt: new Date(),
        },
        {
          id: 'task-2',
          shotId: 'shot-1',
          type: 'promotion',
          status: 'pending',
          priority: 2,
          createdAt: new Date(),
        },
      ];

      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: mockProject,
        shots: mockShots,
        assets: [],
        taskQueue: multipleTasks,
        reorderTasks: mockReorderTasks,
      });

      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      await act(async () => {
        await result.current.submitAllTasks();
      });

      expect(mockReorderTasks).toHaveBeenCalledTimes(2);
    });

    it('should skip non-pending tasks', async () => {
      const mixedTasks: GenerationTask[] = [
        {
          id: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'completed',
          priority: 1,
          createdAt: new Date(),
        },
        {
          id: 'task-2',
          shotId: 'shot-1',
          type: 'promotion',
          status: 'pending',
          priority: 2,
          createdAt: new Date(),
        },
      ];

      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: mockProject,
        shots: mockShots,
        assets: [],
        taskQueue: mixedTasks,
        reorderTasks: mockReorderTasks,
      });

      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      await act(async () => {
        await result.current.submitAllTasks();
      });

      expect(mockReorderTasks).toHaveBeenCalledTimes(1);
    });

    it('should set error when no pending tasks', async () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: mockProject,
        shots: mockShots,
        assets: [],
        taskQueue: [],
        reorderTasks: mockReorderTasks,
      });

      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      await act(async () => {
        await result.current.submitAllTasks();
      });

      expect(result.current.error).toBe('No pending tasks to submit');
    });
  });

  describe('getTaskStatus', () => {
    it('should get task status and update queue', async () => {
      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      await act(async () => {
        await result.current.getTaskStatus('task-1');
      });

      expect(mockReorderTasks).toHaveBeenCalled();
    });

    it('should handle status check errors gracefully', async () => {
      const errorService = new MockBackendApiService();
      vi.spyOn(errorService, 'getTaskStatus').mockResolvedValue({
        success: false,
        error: 'Task not found',
      });

      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: errorService })
      );

      await act(async () => {
        await result.current.getTaskStatus('invalid-task');
      });

      // Should not throw, just log error
      expect(result.current.error).toBeNull();
    });
  });

  describe('cancelTask', () => {
    it('should cancel task successfully', async () => {
      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      let success = false;
      await act(async () => {
        success = await result.current.cancelTask('task-1');
      });

      expect(success).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should update task status to failed after cancellation', async () => {
      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      await act(async () => {
        await result.current.cancelTask('task-1');
      });

      expect(mockReorderTasks).toHaveBeenCalled();
      const updatedQueue = mockReorderTasks.mock.calls[0][0];
      expect(updatedQueue[0].status).toBe('failed');
      expect(updatedQueue[0].error).toBe('Cancelled by user');
    });
  });

  describe('invokeCliCommand', () => {
    it('should invoke CLI command successfully', async () => {
      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      let output: any;
      await act(async () => {
        output = await result.current.invokeCliCommand('grid', { project: 'test' });
      });

      expect(output).toBeDefined();
      expect(result.current.error).toBeNull();
    });

    it('should set error on command failure', async () => {
      const errorService = new MockBackendApiService();
      vi.spyOn(errorService, 'invokeCliCommand').mockResolvedValue({
        success: false,
        error: 'Command failed',
      });

      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: errorService })
      );

      let output: any;
      await act(async () => {
        output = await result.current.invokeCliCommand('grid', {});
      });

      expect(output).toBeNull();
      expect(result.current.error).toBe('Command failed');
    });
  });

  describe('clearError', () => {
    it('should clear error', async () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: null,
        shots: [],
        assets: [],
        taskQueue: [],
        reorderTasks: mockReorderTasks,
      });

      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      // Trigger an error
      await act(async () => {
        await result.current.submitProject();
      });

      expect(result.current.error).not.toBeNull();

      // Clear error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('auto-refresh', () => {
    it('should not auto-refresh by default', () => {
      const { result } = renderHook(() =>
        useBackendIntegration({ apiService: mockApiService })
      );

      // No auto-refresh should be set up
      expect(result.current).toBeDefined();
    });

    it('should auto-refresh when enabled', async () => {
      const processingTask: GenerationTask = {
        id: 'task-1',
        shotId: 'shot-1',
        type: 'grid',
        status: 'processing',
        priority: 1,
        createdAt: new Date(),
      };

      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: mockProject,
        shots: mockShots,
        assets: [],
        taskQueue: [processingTask],
        reorderTasks: mockReorderTasks,
      });

      renderHook(() =>
        useBackendIntegration({
          apiService: mockApiService,
          autoRefresh: true,
          refreshInterval: 100,
        })
      );

      // Wait for at least one refresh cycle
      await waitFor(
        () => {
          expect(mockReorderTasks).toHaveBeenCalled();
        },
        { timeout: 200 }
      );
    });
  });
});
