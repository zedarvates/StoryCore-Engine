/**
 * React Hook for Backend Integration
 * Provides easy integration with the backend API service
 */

import { useState, useCallback } from 'react';
import { useStore } from 'zustand';
import { BackendApiService, GenerationTask, ApiResponse } from '../services/backendApiService';

interface BackendIntegrationOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  useMock?: boolean;
}

export function useBackendIntegration(options: BackendIntegrationOptions = {}) {
  const { autoRefresh = false, refreshInterval = 5000, useMock = false } = options;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiService = new BackendApiService();

  // Mock service if enabled
  const api = useMock ? new MockBackendApiService() : apiService;

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const submitProject = useCallback(async (projectData: any): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.submitProject(projectData);
      if (response.success) {
        return true;
      } else {
        setError(response.error || 'Failed to submit project');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [api]);

  const submitTask = useCallback(async (task: GenerationTask): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.submitTask(task);
      if (response.success) {
        return true;
      } else {
        setError(response.error || 'Failed to submit task');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [api]);

  const submitAllTasks = useCallback(async (tasks: GenerationTask[]): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);

    try {
      for (const task of tasks) {
        const response = await api.submitTask(task);
        if (!response.success) {
          setError(response.error || `Failed to submit task ${task.taskId}`);
          return false;
        }
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [api]);

  const getTaskStatus = useCallback(async (taskId: string): Promise<ApiResponse<any>> => {
    setError(null);

    try {
      return await api.getTaskStatus(taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [api]);

  const cancelTask = useCallback(async (taskId: string): Promise<ApiResponse<any>> => {
    setError(null);

    try {
      return await api.cancelTask(taskId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [api]);

  const invokeCliCommand = useCallback(async (command: string, args: any = {}): Promise<ApiResponse<any>> => {
    setError(null);

    try {
      return await api.invokeCliCommand(command, args);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }, [api]);

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

// Mock service for testing
class MockBackendApiService {
  async submitProject(projectData: any): Promise<ApiResponse<any>> {
    return { success: true, data: { taskId: 'mock-task-id', status: 'pending' } };
  }

  async submitTask(task: GenerationTask): Promise<ApiResponse<any>> {
    return { success: true, data: { taskId: task.taskId, status: 'pending' } };
  }

  async getTaskStatus(taskId: string): Promise<ApiResponse<any>> {
    return { success: true, data: { taskId, status: 'processing', progress: 50 } };
  }

  async cancelTask(taskId: string): Promise<ApiResponse<any>> {
    return { success: true, data: { success: true } };
  }

  async invokeCliCommand(command: string, args: any = {}): Promise<ApiResponse<any>> {
    return { success: true, data: { output: `Mock output for ${command}` } };
  }
}