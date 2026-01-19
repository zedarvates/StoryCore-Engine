/**
 * useProgressTracking Hook
 * 
 * React hook for tracking generation task progress with real-time updates.
 * Integrates with Zustand store to update task queue status.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import {
  ProgressTrackingService,
  createProgressTrackingService,
  type ProgressUpdate,
  type ProgressTrackingOptions,
} from '@/services/progressTrackingService';
import type { GenerationTask } from '@/types';

export interface UseProgressTrackingOptions {
  /**
   * Polling interval in milliseconds
   * @default 2000
   */
  pollInterval?: number;

  /**
   * Auto-start tracking when tasks are added
   * @default true
   */
  autoStart?: boolean;

  /**
   * Use mock service for development/testing
   * @default false
   */
  useMock?: boolean;

  /**
   * Callback when progress updates
   */
  onProgress?: (update: ProgressUpdate) => void;

  /**
   * Callback when task completes
   */
  onComplete?: (taskId: string) => void;

  /**
   * Callback when task fails
   */
  onError?: (taskId: string, error: string) => void;
}

export interface UseProgressTrackingReturn {
  /**
   * Start tracking a specific task
   */
  startTracking: (taskId: string) => void;

  /**
   * Stop tracking a specific task
   */
  stopTracking: (taskId: string) => void;

  /**
   * Start tracking all processing tasks
   */
  startTrackingAll: () => void;

  /**
   * Stop tracking all tasks
   */
  stopTrackingAll: () => void;

  /**
   * Check if a task is being tracked
   */
  isTracking: (taskId: string) => boolean;

  /**
   * Get progress for a specific task
   */
  getProgress: (taskId: string) => ProgressUpdate | undefined;

  /**
   * All progress updates
   */
  progressUpdates: Map<string, ProgressUpdate>;

  /**
   * Currently tracked task IDs
   */
  trackedTaskIds: string[];
}

export function useProgressTracking(
  options: UseProgressTrackingOptions = {}
): UseProgressTrackingReturn {
  const {
    pollInterval = 2000,
    autoStart = true,
    useMock = false,
    onProgress,
    onComplete,
    onError,
  } = options;

  // Store references
  const taskQueue = useAppStore((state) => state.taskQueue);
  const updateTaskStatus = useCallback(
    (taskId: string, status: GenerationTask['status'], error?: string) => {
      const store = useAppStore.getState();
      const updatedQueue = store.taskQueue.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
              error,
              startedAt: status === 'processing' && !task.startedAt ? new Date() : task.startedAt,
              completedAt: status === 'completed' || status === 'failed' ? new Date() : task.completedAt,
            }
          : task
      );
      store.reorderTasks(updatedQueue);
    },
    []
  );

  // Service instance
  const serviceRef = useRef<ProgressTrackingService | null>(null);
  
  // Progress updates state
  const [progressUpdates, setProgressUpdates] = useState<Map<string, ProgressUpdate>>(new Map());
  const [trackedTaskIds, setTrackedTaskIds] = useState<string[]>([]);

  // Initialize service
  useEffect(() => {
    serviceRef.current = createProgressTrackingService(useMock);

    return () => {
      serviceRef.current?.stopAllTracking();
    };
  }, [useMock]);

  // Update tracked task IDs
  useEffect(() => {
    if (serviceRef.current) {
      setTrackedTaskIds(serviceRef.current.getTrackedTaskIds());
    }
  }, [progressUpdates]);

  // Auto-start tracking for processing tasks
  useEffect(() => {
    if (!autoStart || !serviceRef.current) return;

    const processingTasks = taskQueue.filter((task) => task.status === 'processing');
    
    processingTasks.forEach((task) => {
      if (!serviceRef.current!.isTracking(task.id)) {
        startTracking(task.id);
      }
    });
  }, [taskQueue, autoStart]);

  /**
   * Start tracking a specific task
   */
  const startTracking = useCallback(
    (taskId: string) => {
      if (!serviceRef.current) return;

      const trackingOptions: ProgressTrackingOptions = {
        pollInterval,
        onProgress: (update) => {
          // Update local state
          setProgressUpdates((prev) => new Map(prev).set(taskId, update));

          // Update store
          updateTaskStatus(taskId, update.status, update.error);

          // Call user callback
          if (onProgress) {
            onProgress(update);
          }
        },
        onComplete: (completedTaskId) => {
          // Update local state
          setProgressUpdates((prev) => {
            const newMap = new Map(prev);
            const update = newMap.get(completedTaskId);
            if (update) {
              newMap.set(completedTaskId, { ...update, status: 'completed', progress: 100 });
            }
            return newMap;
          });

          // Update store
          updateTaskStatus(completedTaskId, 'completed');

          // Call user callback
          if (onComplete) {
            onComplete(completedTaskId);
          }
        },
        onError: (failedTaskId, error) => {
          // Update local state
          setProgressUpdates((prev) => {
            const newMap = new Map(prev);
            const update = newMap.get(failedTaskId);
            if (update) {
              newMap.set(failedTaskId, { ...update, status: 'failed', error });
            }
            return newMap;
          });

          // Update store
          updateTaskStatus(failedTaskId, 'failed', error);

          // Call user callback
          if (onError) {
            onError(failedTaskId, error);
          }
        },
      };

      serviceRef.current.startTracking(taskId, trackingOptions);
      setTrackedTaskIds(serviceRef.current.getTrackedTaskIds());
    },
    [pollInterval, onProgress, onComplete, onError, updateTaskStatus]
  );

  /**
   * Stop tracking a specific task
   */
  const stopTracking = useCallback((taskId: string) => {
    if (!serviceRef.current) return;

    serviceRef.current.stopTracking(taskId);
    setTrackedTaskIds(serviceRef.current.getTrackedTaskIds());
  }, []);

  /**
   * Start tracking all processing tasks
   */
  const startTrackingAll = useCallback(() => {
    const processingTasks = taskQueue.filter((task) => task.status === 'processing');
    processingTasks.forEach((task) => startTracking(task.id));
  }, [taskQueue, startTracking]);

  /**
   * Stop tracking all tasks
   */
  const stopTrackingAll = useCallback(() => {
    if (!serviceRef.current) return;

    serviceRef.current.stopAllTracking();
    setTrackedTaskIds([]);
  }, []);

  /**
   * Check if a task is being tracked
   */
  const isTracking = useCallback(
    (taskId: string): boolean => {
      return serviceRef.current?.isTracking(taskId) || false;
    },
    []
  );

  /**
   * Get progress for a specific task
   */
  const getProgress = useCallback(
    (taskId: string): ProgressUpdate | undefined => {
      return progressUpdates.get(taskId);
    },
    [progressUpdates]
  );

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
