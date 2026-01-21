/**
 * React Hook for Progress Tracking
 * Provides easy integration with the progress tracking service
 */

import { useState, useEffect, useCallback } from 'react';
import { ProgressTrackingService, ProgressUpdate, ProgressTrackingOptions } from '../services/progressTrackingService';

export function useProgressTracking(options: ProgressTrackingOptions = {}) {
  const { pollInterval = 2000, autoStart = true, useMock = false } = options;
  const [progressUpdates, setProgressUpdates] = useState<Map<string, ProgressUpdate>>(new Map());
  const [trackedTaskIds, setTrackedTaskIds] = useState<string[]>([]);
  const service = useMock ? new MockProgressTrackingService() : new ProgressTrackingService({ pollInterval });

  const startTracking = useCallback((taskId: string, opts: ProgressTrackingOptions = {}) => {
    service.startTracking(taskId, {
      ...opts,
      onProgress: (update) => {
        setProgressUpdates((prev) => new Map(prev).set(update.taskId, update));
        if (opts.onProgress) {
          opts.onProgress(update);
        }
      },
      onComplete: (completedTaskId) => {
        if (opts.onComplete) {
          opts.onComplete(completedTaskId);
        }
      },
      onError: (errorTaskId, error) => {
        if (opts.onError) {
          opts.onError(errorTaskId, error);
        }
      },
    });
    setTrackedTaskIds((prev) => [...prev, taskId]);
  }, [service]);

  const stopTracking = useCallback((taskId: string) => {
    service.stopTracking(taskId);
    setTrackedTaskIds((prev) => prev.filter((id) => id !== taskId));
  }, [service]);

  const startTrackingAll = useCallback((taskIds: string[]) => {
    taskIds.forEach((taskId) => startTracking(taskId));
  }, [startTracking]);

  const stopTrackingAll = useCallback(() => {
    service.stopAllTracking();
    setTrackedTaskIds([]);
  }, [service]);

  const isTracking = useCallback((taskId: string) => {
    return service.isTracking(taskId);
  }, [service]);

  const getProgress = useCallback((taskId: string) => {
    return progressUpdates.get(taskId);
  }, [progressUpdates]);

  useEffect(() => {
    return () => {
      service.stopAllTracking();
    };
  }, [service]);

  return {
    startTracking,
    stopTracking,
    startTrackingAll,
    stopTrackingAll,
    isTracking,
    getProgress,
    progressUpdates,
    trackedTaskIds,
  };
}

// Mock service for testing
class MockProgressTrackingService {
  private mockProgress: Map<string, number> = new Map();

  startTracking(taskId: string, options: ProgressTrackingOptions = {}): void {
    const intervalId = setInterval(() => {
      const currentProgress = this.mockProgress.get(taskId) || 0;
      const newProgress = Math.min(currentProgress + 10, 100);
      this.mockProgress.set(taskId, newProgress);

      const update: ProgressUpdate = {
        taskId,
        status: newProgress < 100 ? 'processing' : 'completed',
        progress: newProgress,
        message: newProgress < 100 ? 'Task in progress' : 'Task completed',
      };

      if (options.onProgress) {
        options.onProgress(update);
      }

      if (newProgress >= 100) {
        clearInterval(intervalId);
        if (options.onComplete) {
          options.onComplete(taskId);
        }
      }
    }, options.pollInterval || 1000);
  }

  stopTracking(taskId: string): void {
    // Mock implementation
  }

  stopAllTracking(): void {
    // Mock implementation
  }

  isTracking(taskId: string): boolean {
    return this.mockProgress.has(taskId);
  }

  getTrackedTaskIds(): string[] {
    return Array.from(this.mockProgress.keys());
  }

  async fetchProgress(taskId: string): Promise<ProgressUpdate | null> {
    const progress = this.mockProgress.get(taskId) || 0;
    return {
      taskId,
      status: progress < 100 ? 'processing' : 'completed',
      progress,
      message: progress < 100 ? 'Task in progress' : 'Task completed',
    };
  }

  async fetchMultipleProgress(taskIds: string[]): Promise<ProgressUpdate[]> {
    return Promise.all(taskIds.map((taskId) => this.fetchProgress(taskId))).then((results) =>
      results.filter((result): result is ProgressUpdate => result !== null)
    );
  }
}