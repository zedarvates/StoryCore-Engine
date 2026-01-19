/**
 * useBackendIntegration Hook
 * 
 * React hook for backend API integration with task submission and status tracking
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { backendApi, type BackendApiService } from '@/services/backendApiService';
import { exportProject } from '@/services/projectExportService';
import type { GenerationTask } from '@/types';

export interface UseBackendIntegrationReturn {
  /**
   * Submit current project for generation
   */
  submitProject: () => Promise<boolean>;
  
  /**
   * Submit a specific task
   */
  submitTask: (task: GenerationTask) => Promise<boolean>;
  
  /**
   * Submit all tasks in queue
   */
  submitAllTasks: () => Promise<void>;
  
  /**
   * Get status of a task
   */
  getTaskStatus: (taskId: string) => Promise<void>;
  
  /**
   * Cancel a running task
   */
  cancelTask: (taskId: string) => Promise<boolean>;
  
  /**
   * Invoke StoryCore-Engine CLI command
   */
  invokeCliCommand: (command: string, args: Record<string, any>) => Promise<any>;
  
  /**
   * Current submission state
   */
  isSubmitting: boolean;
  
  /**
   * Last error message
   */
  error: string | null;
  
  /**
   * Clear error
   */
  clearError: () => void;
}

export interface UseBackendIntegrationOptions {
  /**
   * Custom backend API service
   */
  apiService?: BackendApiService;
  
  /**
   * Auto-refresh interval for task status (ms)
   */
  refreshInterval?: number;
  
  /**
   * Enable auto-refresh
   */
  autoRefresh?: boolean;
}

export function useBackendIntegration(
  options: UseBackendIntegrationOptions = {}
): UseBackendIntegrationReturn {
  const {
    apiService = backendApi,
    refreshInterval = 5000,
    autoRefresh = false,
  } = options;

  const { project, shots, assets, taskQueue, reorderTasks } = useAppStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Submit current project for generation
   */
  const submitProject = useCallback(async (): Promise<boolean> => {
    if (!project) {
      setError('No project to submit');
      return false;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Export project to Data Contract v1 format
      const exportedProject = exportProject(project.project_name, shots, assets);
      
      // Submit to backend
      const response = await apiService.submitProject(exportedProject);
      
      if (!response.success) {
        setError(response.error || 'Failed to submit project');
        return false;
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [project, shots, assets, apiService]);

  /**
   * Submit a specific task
   */
  const submitTask = useCallback(async (task: GenerationTask): Promise<boolean> => {
    if (!project) {
      setError('No project context for task');
      return false;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Export project for context
      const exportedProject = exportProject(project.project_name, shots, assets);
      
      // Submit task to backend
      const response = await apiService.submitTask(task, exportedProject);
      
      if (!response.success) {
        setError(response.error || 'Failed to submit task');
        return false;
      }

      // Update task status in queue
      const updatedQueue = taskQueue.map((t) =>
        t.id === task.id
          ? { ...t, status: 'processing' as const, startedAt: new Date() }
          : t
      );
      reorderTasks(updatedQueue);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [project, shots, assets, taskQueue, apiService, reorderTasks]);

  /**
   * Submit all tasks in queue
   */
  const submitAllTasks = useCallback(async (): Promise<void> => {
    if (!project) {
      setError('No project context for tasks');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get pending tasks
      const pendingTasks = taskQueue.filter((t) => t.status === 'pending');
      
      if (pendingTasks.length === 0) {
        setError('No pending tasks to submit');
        return;
      }

      // Submit tasks sequentially
      for (const task of pendingTasks) {
        const success = await submitTask(task);
        if (!success) {
          // Stop on first failure
          break;
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [project, taskQueue, submitTask]);

  /**
   * Get status of a task
   */
  const getTaskStatus = useCallback(async (taskId: string): Promise<void> => {
    try {
      const response = await apiService.getTaskStatus(taskId);
      
      if (!response.success) {
        console.error('Failed to get task status:', response.error);
        return;
      }

      // Update task in queue
      const updatedQueue = taskQueue.map((t) => {
        if (t.id === taskId && response.data) {
          return {
            ...t,
            status: response.data.status,
            error: response.data.error,
            completedAt: response.data.status === 'completed' ? new Date() : t.completedAt,
          };
        }
        return t;
      });
      reorderTasks(updatedQueue);
    } catch (err) {
      console.error('Error getting task status:', err);
    }
  }, [taskQueue, apiService, reorderTasks]);

  /**
   * Cancel a running task
   */
  const cancelTask = useCallback(async (taskId: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await apiService.cancelTask(taskId);
      
      if (!response.success) {
        setError(response.error || 'Failed to cancel task');
        return false;
      }

      // Update task status in queue
      const updatedQueue = taskQueue.map((t) =>
        t.id === taskId
          ? { ...t, status: 'failed' as const, error: 'Cancelled by user' }
          : t
      );
      reorderTasks(updatedQueue);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return false;
    }
  }, [taskQueue, apiService, reorderTasks]);

  /**
   * Invoke StoryCore-Engine CLI command
   */
  const invokeCliCommand = useCallback(
    async (command: string, args: Record<string, any>): Promise<any> => {
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await apiService.invokeCliCommand(command, args);
        
        if (!response.success) {
          setError(response.error || 'Failed to execute command');
          return null;
        }

        return response.data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [apiService]
  );

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Auto-refresh task statuses
   */
  useEffect(() => {
    if (!autoRefresh) {
      return;
    }

    const refreshStatuses = async () => {
      const processingTasks = taskQueue.filter((t) => t.status === 'processing');
      
      for (const task of processingTasks) {
        await getTaskStatus(task.id);
      }
    };

    // Initial refresh
    refreshStatuses();

    // Set up interval
    refreshTimerRef.current = setInterval(refreshStatuses, refreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, taskQueue, getTaskStatus]);

  return {
    submitProject,
    submitTask,
    submitAllTasks,
    getTaskStatus,
    cancelTask,
    invokeCliCommand,
    isSubmitting,
    error,
    clearError,
  };
}
