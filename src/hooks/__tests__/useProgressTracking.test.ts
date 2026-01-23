/**
 * Tests for useProgressTracking Hook
 */

import { renderHook, act } from '@testing-library/react';
import { useProgressTracking } from '../useProgressTracking';
import { ProgressTrackingService, MockProgressTrackingService } from '../../services/progressTrackingService';

// Mock the services
jest.mock('../../services/progressTrackingService', () => ({
  ProgressTrackingService: jest.fn().mockImplementation(() => ({
    startTracking: jest.fn(),
    stopTracking: jest.fn(),
    stopAllTracking: jest.fn(),
    isTracking: jest.fn().mockReturnValue(false),
    getTrackedTaskIds: jest.fn().mockReturnValue([]),
    fetchProgress: jest.fn().mockResolvedValue(null),
    fetchMultipleProgress: jest.fn().mockResolvedValue([]),
  })),
  MockProgressTrackingService: jest.fn().mockImplementation(() => ({
    startTracking: jest.fn(),
    stopTracking: jest.fn(),
    stopAllTracking: jest.fn(),
    isTracking: jest.fn().mockReturnValue(false),
    getTrackedTaskIds: jest.fn().mockReturnValue([]),
    fetchProgress: jest.fn().mockResolvedValue(null),
    fetchMultipleProgress: jest.fn().mockResolvedValue([]),
  })),
}));

describe('useProgressTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with real service', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useProgressTracking({ useMock: false }));

      expect(result.current.progressUpdates.size).toBe(0);
      expect(result.current.trackedTaskIds.length).toBe(0);
    });

    it('should start tracking a task', () => {
      const { result } = renderHook(() => useProgressTracking({ useMock: false }));

      act(() => {
        result.current.startTracking('test-task-id');
      });

      expect(result.current.trackedTaskIds).toContain('test-task-id');
    });

    it('should stop tracking a task', () => {
      const { result } = renderHook(() => useProgressTracking({ useMock: false }));

      act(() => {
        result.current.startTracking('test-task-id');
        result.current.stopTracking('test-task-id');
      });

      expect(result.current.trackedTaskIds).not.toContain('test-task-id');
    });

    it('should stop all tracking', () => {
      const { result } = renderHook(() => useProgressTracking({ useMock: false }));

      act(() => {
        result.current.startTracking('task-1');
        result.current.startTracking('task-2');
        result.current.stopTrackingAll();
      });

      expect(result.current.trackedTaskIds.length).toBe(0);
    });

    it('should check if a task is being tracked', () => {
      const { result } = renderHook(() => useProgressTracking({ useMock: false }));

      act(() => {
        result.current.startTracking('test-task-id');
      });

      expect(result.current.isTracking('test-task-id')).toBe(true);
      expect(result.current.isTracking('non-tracked-task')).toBe(false);
    });

    it('should get progress for a task', () => {
      const { result } = renderHook(() => useProgressTracking({ useMock: false }));

      // Mock the service to return progress
      (ProgressTrackingService as jest.Mock).mockImplementationOnce(() => ({
        startTracking: jest.fn(),
        stopTracking: jest.fn(),
        stopAllTracking: jest.fn(),
        isTracking: jest.fn().mockReturnValue(true),
        getTrackedTaskIds: jest.fn().mockReturnValue(['test-task-id']),
        fetchProgress: jest.fn().mockResolvedValue({
          taskId: 'test-task-id',
          status: 'processing',
          progress: 50,
          message: 'Task in progress',
        }),
        fetchMultipleProgress: jest.fn().mockResolvedValue([]),
      }));

      const { rerender } = renderHook(() => useProgressTracking({ useMock: false }));

      act(() => {
        result.current.startTracking('test-task-id');
      });

      // Simulate progress update
      act(() => {
        const progress = result.current.getProgress('test-task-id');
        expect(progress).toBeDefined();
      });
    });
  });

  describe('with mock service', () => {
    it('should initialize with mock service', () => {
      const { result } = renderHook(() => useProgressTracking({ useMock: true }));

      expect(result.current.progressUpdates.size).toBe(0);
      expect(result.current.trackedTaskIds.length).toBe(0);
    });

    it('should start tracking with mock service', () => {
      const { result } = renderHook(() => useProgressTracking({ useMock: true }));

      act(() => {
        result.current.startTracking('test-task-id');
      });

      expect(result.current.trackedTaskIds).toContain('test-task-id');
    });
  });

  describe('cleanup', () => {
    it('should stop all tracking on unmount', () => {
      const { unmount } = renderHook(() => useProgressTracking({ useMock: false }));

      act(() => {
        // Start tracking would be called here in a real scenario
      });

      unmount();

      // The service's stopAllTracking should have been called
      const serviceInstance = (ProgressTrackingService as jest.Mock).mock.results[0].value;
      expect(serviceInstance.stopAllTracking).toHaveBeenCalled();
    });
  });
});