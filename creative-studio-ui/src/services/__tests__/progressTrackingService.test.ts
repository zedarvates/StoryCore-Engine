/**
 * Tests for Progress Tracking Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ProgressTrackingService,
  MockProgressTrackingService,
  createProgressTrackingService,
  type ProgressUpdate,
} from '../progressTrackingService';

describe('ProgressTrackingService', () => {
  let service: ProgressTrackingService;
  const baseUrl = 'http://localhost:3000';

  beforeEach(() => {
    service = new ProgressTrackingService(baseUrl);
    vi.useFakeTimers();
  });

  afterEach(() => {
    service.stopAllTracking();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('fetchProgress', () => {
    it('should fetch progress for a task', async () => {
      const mockResponse: ProgressUpdate = {
        taskId: 'task-1',
        status: 'processing',
        progress: 50,
        message: 'Processing...',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.fetchProgress('task-1');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(`${baseUrl}/api/tasks/task-1/progress`);
    });

    it('should throw error on failed fetch', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(service.fetchProgress('task-1')).rejects.toThrow('Failed to fetch progress: Not Found');
    });

    it('should parse dates correctly', async () => {
      const mockResponse = {
        taskId: 'task-1',
        status: 'completed',
        progress: 100,
        startedAt: '2026-01-15T10:00:00Z',
        completedAt: '2026-01-15T10:05:00Z',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await service.fetchProgress('task-1');

      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('fetchMultipleProgress', () => {
    it('should fetch progress for multiple tasks', async () => {
      const mockResponses = [
        { taskId: 'task-1', status: 'processing', progress: 50 },
        { taskId: 'task-2', status: 'completed', progress: 100 },
      ];

      global.fetch = vi.fn().mockImplementation((url: string) => {
        const taskId = url.split('/').slice(-2)[0];
        const response = mockResponses.find((r) => r.taskId === taskId);
        return Promise.resolve({
          ok: true,
          json: async () => response,
        });
      });

      const results = await service.fetchMultipleProgress(['task-1', 'task-2']);

      expect(results).toHaveLength(2);
      expect(results[0].taskId).toBe('task-1');
      expect(results[1].taskId).toBe('task-2');
    });

    it('should handle empty task list', async () => {
      const results = await service.fetchMultipleProgress([]);
      expect(results).toEqual([]);
    });
  });

  describe('startTracking', () => {
    it('should start polling for task progress', async () => {
      const onProgress = vi.fn();
      const mockResponse: ProgressUpdate = {
        taskId: 'task-1',
        status: 'processing',
        progress: 50,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      service.startTracking('task-1', { pollInterval: 1000, onProgress });

      // Wait for first poll
      await vi.advanceTimersByTimeAsync(1000);

      expect(onProgress).toHaveBeenCalledWith(mockResponse);
      expect(service.isTracking('task-1')).toBe(true);
    });

    it('should call onComplete when task completes', async () => {
      const onComplete = vi.fn();
      const mockResponse: ProgressUpdate = {
        taskId: 'task-1',
        status: 'completed',
        progress: 100,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      service.startTracking('task-1', { pollInterval: 1000, onComplete });

      await vi.advanceTimersByTimeAsync(1000);

      expect(onComplete).toHaveBeenCalledWith('task-1');
      expect(service.isTracking('task-1')).toBe(false);
    });

    it('should call onError when task fails', async () => {
      const onError = vi.fn();
      const mockResponse: ProgressUpdate = {
        taskId: 'task-1',
        status: 'failed',
        progress: 50,
        error: 'Task failed',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      service.startTracking('task-1', { pollInterval: 1000, onError });

      await vi.advanceTimersByTimeAsync(1000);

      expect(onError).toHaveBeenCalledWith('task-1', 'Task failed');
      expect(service.isTracking('task-1')).toBe(false);
    });

    it('should use default poll interval', async () => {
      const onProgress = vi.fn();
      const mockResponse: ProgressUpdate = {
        taskId: 'task-1',
        status: 'processing',
        progress: 50,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      service.startTracking('task-1', { onProgress });

      // Default interval is 2000ms
      await vi.advanceTimersByTimeAsync(2000);

      expect(onProgress).toHaveBeenCalled();
    });

    it('should stop existing tracking before starting new', async () => {
      const onProgress1 = vi.fn();
      const onProgress2 = vi.fn();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ taskId: 'task-1', status: 'processing', progress: 50 }),
      });

      service.startTracking('task-1', { pollInterval: 1000, onProgress: onProgress1 });
      service.startTracking('task-1', { pollInterval: 1000, onProgress: onProgress2 });

      await vi.advanceTimersByTimeAsync(1000);

      // Only second callback should be called
      expect(onProgress1).not.toHaveBeenCalled();
      expect(onProgress2).toHaveBeenCalled();
    });
  });

  describe('stopTracking', () => {
    it('should stop tracking a task', async () => {
      const onProgress = vi.fn();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ taskId: 'task-1', status: 'processing', progress: 50 }),
      });

      service.startTracking('task-1', { pollInterval: 1000, onProgress });
      service.stopTracking('task-1');

      await vi.advanceTimersByTimeAsync(1000);

      expect(onProgress).not.toHaveBeenCalled();
      expect(service.isTracking('task-1')).toBe(false);
    });

    it('should handle stopping non-existent task', () => {
      expect(() => service.stopTracking('non-existent')).not.toThrow();
    });
  });

  describe('stopAllTracking', () => {
    it('should stop tracking all tasks', async () => {
      const onProgress1 = vi.fn();
      const onProgress2 = vi.fn();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ taskId: 'task-1', status: 'processing', progress: 50 }),
      });

      service.startTracking('task-1', { pollInterval: 1000, onProgress: onProgress1 });
      service.startTracking('task-2', { pollInterval: 1000, onProgress: onProgress2 });

      service.stopAllTracking();

      await vi.advanceTimersByTimeAsync(1000);

      expect(onProgress1).not.toHaveBeenCalled();
      expect(onProgress2).not.toHaveBeenCalled();
      expect(service.getTrackedTaskIds()).toEqual([]);
    });
  });

  describe('isTracking', () => {
    it('should return true for tracked task', () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ taskId: 'task-1', status: 'processing', progress: 50 }),
      });

      service.startTracking('task-1');

      expect(service.isTracking('task-1')).toBe(true);
    });

    it('should return false for non-tracked task', () => {
      expect(service.isTracking('task-1')).toBe(false);
    });
  });

  describe('getTrackedTaskIds', () => {
    it('should return all tracked task IDs', () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ taskId: 'task-1', status: 'processing', progress: 50 }),
      });

      service.startTracking('task-1');
      service.startTracking('task-2');

      const trackedIds = service.getTrackedTaskIds();

      expect(trackedIds).toContain('task-1');
      expect(trackedIds).toContain('task-2');
      expect(trackedIds).toHaveLength(2);
    });

    it('should return empty array when no tasks tracked', () => {
      expect(service.getTrackedTaskIds()).toEqual([]);
    });
  });
});

describe('MockProgressTrackingService', () => {
  let mockService: MockProgressTrackingService;

  beforeEach(() => {
    mockService = new MockProgressTrackingService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    mockService.stopAllTracking();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('fetchProgress', () => {
    it('should return mock progress', async () => {
      const mockUpdate: ProgressUpdate = {
        taskId: 'task-1',
        status: 'processing',
        progress: 75,
        message: 'Mock progress',
      };

      mockService.setMockProgress('task-1', mockUpdate);

      const result = await mockService.fetchProgress('task-1');

      expect(result).toEqual(mockUpdate);
    });

    it('should simulate progressive completion', async () => {
      const result1 = await mockService.fetchProgress('task-1');
      expect(result1.progress).toBe(10);
      expect(result1.status).toBe('processing');

      const result2 = await mockService.fetchProgress('task-1');
      expect(result2.progress).toBe(20);
      expect(result2.status).toBe('processing');
    });

    it('should complete at 100%', async () => {
      // Advance to 100%
      for (let i = 0; i < 10; i++) {
        await mockService.fetchProgress('task-1');
      }

      const result = await mockService.fetchProgress('task-1');
      expect(result.progress).toBe(100);
      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should respect mock delay', async () => {
      mockService.setMockDelay(500);

      const startTime = Date.now();
      await mockService.fetchProgress('task-1');
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(500);
    });
  });

  describe('setMockProgress', () => {
    it('should set custom mock progress', async () => {
      const customUpdate: ProgressUpdate = {
        taskId: 'task-1',
        status: 'failed',
        progress: 50,
        error: 'Custom error',
      };

      mockService.setMockProgress('task-1', customUpdate);

      const result = await mockService.fetchProgress('task-1');

      expect(result).toEqual(customUpdate);
    });
  });
});

describe('createProgressTrackingService', () => {
  it('should create real service by default', () => {
    const service = createProgressTrackingService(false);
    expect(service).toBeInstanceOf(ProgressTrackingService);
    expect(service).not.toBeInstanceOf(MockProgressTrackingService);
  });

  it('should create mock service when requested', () => {
    const service = createProgressTrackingService(true);
    expect(service).toBeInstanceOf(MockProgressTrackingService);
  });

  it('should respect environment variable', () => {
    const originalEnv = import.meta.env.VITE_USE_MOCK_BACKEND;
    
    // @ts-ignore - Setting env var for test
    import.meta.env.VITE_USE_MOCK_BACKEND = 'true';
    
    const service = createProgressTrackingService();
    expect(service).toBeInstanceOf(MockProgressTrackingService);
    
    // Restore
    // @ts-ignore
    import.meta.env.VITE_USE_MOCK_BACKEND = originalEnv;
  });
});
