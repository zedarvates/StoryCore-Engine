import { useEffect, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import type { GenerationTask } from '@/types';

/**
 * Hook for executing tasks in queue order
 * Processes pending tasks sequentially
 */
export function useTaskExecution() {
  const { taskQueue, updateTask } = useAppStore();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Find the next pending task
    const nextTask = taskQueue.find((task) => task.status === 'pending');

    // If there's a pending task and we're not already processing
    if (nextTask && !isProcessingRef.current) {
      // Check if there's already a processing task
      const hasProcessingTask = taskQueue.some((task) => task.status === 'processing');

      if (!hasProcessingTask) {
        executeTask(nextTask);
      }
    }
  }, [taskQueue]);

  const executeTask = async (task: GenerationTask) => {
    isProcessingRef.current = true;

    try {
      // Update task status to processing
      const updatedTask: GenerationTask = {
        ...task,
        status: 'processing',
        startedAt: new Date(),
      };

      // In a real implementation, this would call the backend
      // For now, we'll simulate task execution
      await simulateTaskExecution(updatedTask);

      // Update task status to completed
      const completedTask: GenerationTask = {
        ...updatedTask,
        status: 'completed',
        completedAt: new Date(),
      };

      // Note: In real implementation, updateTask would be called here
      // updateTask(completedTask.id, completedTask);
    } catch (error) {
      // Update task status to failed
      const failedTask: GenerationTask = {
        ...task,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Note: In real implementation, updateTask would be called here
      // updateTask(failedTask.id, failedTask);
    } finally {
      isProcessingRef.current = false;
    }
  };

  /**
   * Simulate task execution (replace with real backend calls)
   */
  const simulateTaskExecution = async (task: GenerationTask): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Simulate processing time based on task type
      const processingTime = {
        grid: 3000,
        promotion: 2000,
        refine: 2500,
        qa: 1500,
      }[task.type];

      setTimeout(() => {
        // Simulate 90% success rate
        if (Math.random() > 0.1) {
          resolve();
        } else {
          reject(new Error('Simulated task failure'));
        }
      }, processingTime);
    });
  };

  return {
    isProcessing: isProcessingRef.current,
  };
}
