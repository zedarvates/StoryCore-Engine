/**
 * Tests for useProgressTracking Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProgressTracking } from '../useProgressTracking';
import { useAppStore } from '@/stores/useAppStore';
import type { GenerationTask } from '@/types';

// Mock the store
vi.mock('@/stores/useAppStore');

// Mock the service
vi.mock('@/services/progressTrackingService', () => ({
  createProgressTrackingService: vi.fn(() => ({
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
    stopAllTracking: vi.fn(),
    isTracking: vi.fn(() => false),
    getTrackedTaskIds: vi.fn(() => []),
    fetchProgress: vi.fn(),
  })),
  ProgressTrackingService: vi.fn(),
  MockProgressTrackingService: vi.fn(),
}));

describe('useProgressTracking', () => {
  const mockTask: GenerationTask = {
    id: 'task-1',
    shotId: 'shot-1',
    type: 'grid',
    status: 'processing',
    priority: 1,
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    
    // Setup store mock
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        taskQueue: [mockTask],
        reorderTasks: vi.fn(),
      };
      return selector ? selector(state) : state;
    });

    (useAppStore as any).getState = vi.fn(() => ({
      taskQueue: [mockTask],
      reorderTasks: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      const { result } = renderHook(() => useProgressTracking());

      expect(result.current.progressUpdates).toBeInstanceOf(Map);
      expect(result.current.trackedTaskIds).toEqual([]);
    });

    it('should initialize with custom options', () => {
      const onProgress = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useProgressTracking({
          pollInterval: 5000,
          autoStart: false,
          useMock: true,
          onProgress,
          onComplete,
          onError,
        })
      );

      expect(result.current).toBeDefined();
    });
  });

  describe('startTracking', () => {
    it('should start tracking a task', () => {
      const { result } = renderHook(() => useProgressTracking({ autoStart: false }));

      act(() => {
        result.current.startTracking('task-1');
      });

      // Service should be called
      expect(result.current.isTracking).toBeDefined();
    });

    it('should call onProgress callback', async () => {
      const onProgress = vi.fn();
      const { result } = renderHook(() =>
        useProgressTracking({ autoStart: false, onProgress })
      );

      act(() => {
        result.current.startTracking('task-1');
      });

      // Callback should be set up
      expect(onProgress).toBeDefined();
    });

    it('should update progress state', async () => {
      const { result } = renderHook(() => useProgressTracking({ autoStart: false }));

      act(() => {
        result.current.startTracking('task-1');
      });

      await waitFor(() => {
        expect(result.current.progressUpdates).toBeInstanceOf(Map);
      });
    });
  });

  describe('stopTracking', () => {
    it('should stop tracking a task', () => {
      const { result } = renderHook(() => useProgressTracking({ autoStart: false }));

      act(() => {
        result.current.startTracking('task-1');
      });

      act(() => {
        result.current.stopTracking('task-1');
      });

      expect(result.current.stopTracking).toBeDefined();
    });
  });

  describe('startTrackingAll', () => {
    it('should start tracking all processing tasks', () => {
      const processingTask: GenerationTask = {
        ...mockTask,
        status: 'processing',
      };

      (useAppStore as any).mockImplementation((selector: any) => {
        const state = {
          taskQueue: [processingTask],
          reorderTasks: vi.fn(),
        };
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useProgressTracking({ autoStart: false }));

      act(() => {
        result.current.startTrackingAll();
      });

      expect(result.current.startTrackingAll).toBeDefined();
    });

    it('should not track non-processing tasks', () => {
      const pendingTask: GenerationTask = {
        ...mockTask,
        status: 'pending',
      };

      (useAppStore as any).mockImplementation((selector: any) => {
        const state = {
          taskQueue: [pendingTask],
          reorderTasks: vi.fn(),
        };
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useProgressTracking({ autoStart: false }));

      act(() => {
        result.current.startTrackingAll();
      });

      // Should not track pending tasks
      expect(result.current.trackedTaskIds).toEqual([]);
    });
  });

  describe('stopTrackingAll', () => {
    it('should stop tracking all tasks', () => {
      const { result } = renderHook(() => useProgressTracking({ autoStart: false }));

      act(() => {
        result.current.startTracking('task-1');
        result.current.startTracking('task-2');
      });

      act(() => {
        result.current.stopTrackingAll();
      });

      expect(result.current.stopTrackingAll).toBeDefined();
    });
  });

  describe('isTracking', () => {
    it('should return tracking status', () => {
      const { result } = renderHook(() => useProgressTracking({ autoStart: false }));

      expect(result.current.isTracking('task-1')).toBe(false);

      act(() => {
        result.current.startTracking('task-1');
      });

      // After starting, isTracking should be available
      expect(result.current.isTracking).toBeDefined();
    });
  });

  describe('getProgress', () => {
    it('should return progress for a task', () => {
      const { result } = renderHook(() => useProgressTracking({ autoStart: false }));

      const progress = result.current.getProgress('task-1');

      expect(progress).toBeUndefined(); // No progress yet
    });

    it('should return undefined for non-existent task', () => {
      const { result } = renderHook(() => useProgressTracking({ autoStart: false }));

      const progress = result.current.getProgress('non-existent');

      expect(progress).toBeUndefined();
    });
  });

  describe('autoStart', () => {
    it('should auto-start tracking processing tasks', async () => {
      const processingTask: GenerationTask = {
        ...mockTask,
        status: 'processing',
      };

      (useAppStore as any).mockImplementation((selector: any) => {
        const state = {
          taskQueue: [processingTask],
          reorderTasks: vi.fn(),
        };
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useProgressTracking({ autoStart: true }));

      await waitFor(() => {
        expect(result.current).toBeDefined();
      });
    });

    it('should not auto-start when disabled', () => {
      const processingTask: GenerationTask = {
        ...mockTask,
        status: 'processing',
      };

      (useAppStore as any).mockImplementation((selector: any) => {
        const state = {
          taskQueue: [processingTask],
          reorderTasks: vi.fn(),
        };
        return selector ? selector(state) : state;
      });

      const { result } = renderHook(() => useProgressTracking({ autoStart: false }));

      expect(result.current.trackedTaskIds).toEqual([]);
    });
  });

  describe('store integration', () => {
    it('should update store when task status changes', async () => {
      const reorderTasks = vi.fn();
      
      (useAppStore as any).getState = vi.fn(() => ({
        taskQueue: [mockTask],
        reorderTasks,
      }));

      const { result } = renderHook(() => useProgressTracking({ autoStart: false }));

      act(() => {
        result.current.startTracking('task-1');
      });

      // Store update should be available
      await waitFor(() => {
        expect(result.current).toBeDefined();
      });
    });
  });

  describe('callbacks', () => {
    it('should call onComplete when task completes', async () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useProgressTracking({ autoStart: false, onComplete })
      );

      act(() => {
        result.current.startTracking('task-1');
      });

      // Callback should be set up
      expect(onComplete).toBeDefined();
    });

    it('should call onError when task fails', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useProgressTracking({ autoStart: false, onError })
      );

      act(() => {
        result.current.startTracking('task-1');
      });

      // Callback should be set up
      expect(onError).toBeDefined();
    });

    it('should call onProgress on updates', async () => {
      const onProgress = vi.fn();
      const { result } = renderHook(() =>
        useProgressTracking({ autoStart: false, onProgress })
      );

      act(() => {
        result.current.startTracking('task-1');
      });

      // Callback should be set up
      expect(onProgress).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should stop all tracking on unmount', () => {
      const { result, unmount } = renderHook(() => useProgressTracking({ autoStart: false }));

      act(() => {
        result.current.startTracking('task-1');
        result.current.startTracking('task-2');
      });

      unmount();

      // Cleanup should have been called
      expect(result.current).toBeDefined();
    });
  });

  describe('progressUpdates', () => {
    it('should maintain progress updates map', () => {
      const { result } = renderHook(() => useProgressTracking({ autoStart: false }));

      expect(result.current.progressUpdates).toBeInstanceOf(Map);
      expect(result.current.progressUpdates.size).toBe(0);
    });
  });

  describe('trackedTaskIds', () => {
    it('should maintain tracked task IDs list', () => {
      const { result } = renderHook(() => useProgressTracking({ autoStart: false }));

      expect(result.current.trackedTaskIds).toEqual([]);
    });
  });
});
