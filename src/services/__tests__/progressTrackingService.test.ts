/**
 * Tests for Progress Tracking Service
 */

import { ProgressTrackingService, MockProgressTrackingService, ProgressUpdate } from '../progressTrackingService';

describe('ProgressTrackingService', () => {
  let service: ProgressTrackingService;

  beforeEach(() => {
    service = new ProgressTrackingService({ pollInterval: 100 });
  });

  describe('startTracking', () => {
    it('should start tracking a task', () => {
      const taskId = 'test-task-id';
      service.startTracking(taskId);
      expect(service.isTracking(taskId)).toBe(true);
    });

    it('should not start tracking the same task twice', () => {
      const taskId = 'test-task-id';
      service.startTracking(taskId);
      service.startTracking(taskId);
      expect(service.getTrackedTaskIds().length).toBe(1);
    });
  });

  describe('stopTracking', () => {
    it('should stop tracking a task', () => {
      const taskId = 'test-task-id';
      service.startTracking(taskId);
      service.stopTracking(taskId);
      expect(service.isTracking(taskId)).toBe(false);
    });

    it('should handle stopping non-tracked task', () => {
      const taskId = 'non-tracked-task';
      expect(() => service.stopTracking(taskId)).not.toThrow();
    });
  });

  describe('stopAllTracking', () => {
    it('should stop all tracking', () => {
      service.startTracking('task-1');
      service.startTracking('task-2');
      service.stopAllTracking();
      expect(service.getTrackedTaskIds().length).toBe(0);
    });
  });

  describe('fetchProgress', () => {
    it('should fetch progress for a task', async () => {
      const result = await service.fetchProgress('test-task-id');
      expect(result).not.toBeNull();
      expect(result?.taskId).toBe('test-task-id');
      expect(result?.progress).toBeGreaterThanOrEqual(0);
    });
  });

  describe('fetchMultipleProgress', () => {
    it('should fetch progress for multiple tasks', async () => {
      const results = await service.fetchMultipleProgress(['task-1', 'task-2']);
      expect(results.length).toBe(2);
      expect(results[0].taskId).toBe('task-1');
      expect(results[1].taskId).toBe('task-2');
    });
  });
});

describe('MockProgressTrackingService', () => {
  let mockService: MockProgressTrackingService;

  beforeEach(() => {
    mockService = new MockProgressTrackingService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('startTracking', () => {
    it('should start tracking and simulate progress', () => {
      const taskId = 'test-task-id';
      const onProgress = jest.fn();

      mockService.startTracking(taskId, { onProgress });

      // Advance timers to simulate progress
      jest.advanceTimersByTime(1000);
      expect(onProgress).toHaveBeenCalled();

      const callArgs = onProgress.mock.calls[0][0];
      expect(callArgs.taskId).toBe(taskId);
      expect(callArgs.progress).toBeGreaterThan(0);
    });

    it('should complete tracking after reaching 100%', () => {
      const taskId = 'test-task-id';
      const onProgress = jest.fn();
      const onComplete = jest.fn();

      mockService.startTracking(taskId, { onProgress, onComplete });

      // Advance timers multiple times to reach completion
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(1000);
      }

      expect(onComplete).toHaveBeenCalledWith(taskId);
    });
  });

  describe('setMockProgress', () => {
    it('should set custom progress for a task', () => {
      const taskId = 'test-task-id';
      mockService.setMockProgress(taskId, 75);
      expect(mockService['mockProgress'].get(taskId)).toBe(75);
    });
  });

  describe('fetchProgress', () => {
    it('should fetch mock progress', async () => {
      const taskId = 'test-task-id';
      mockService.setMockProgress(taskId, 50);

      const result = await mockService.fetchProgress(taskId);
      expect(result).not.toBeNull();
      expect(result?.progress).toBe(50);
    });

    it('should increment progress on each call', async () => {
      const taskId = 'test-task-id';

      const result1 = await mockService.fetchProgress(taskId);
      const progress1 = result1?.progress || 0;

      const result2 = await mockService.fetchProgress(taskId);
      const progress2 = result2?.progress || 0;

      expect(progress2).toBeGreaterThan(progress1);
    });
  });
});

describe('createProgressTrackingService', () => {
  it('should create a real progress tracking service', () => {
    const service = createProgressTrackingService(false);
    expect(service).toBeInstanceOf(ProgressTrackingService);
  });

  it('should create a mock progress tracking service', () => {
    const service = createProgressTrackingService(true);
    expect(service).toBeInstanceOf(MockProgressTrackingService);
  });
});

// Helper function to create the service
function createProgressTrackingService(useMock: boolean): ProgressTrackingService | MockProgressTrackingService {
  return useMock ? new MockProgressTrackingService() : new ProgressTrackingService();
}