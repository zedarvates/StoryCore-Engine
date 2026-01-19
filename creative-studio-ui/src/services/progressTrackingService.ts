/**
 * Progress Tracking Service
 * 
 * Monitors generation task progress and provides real-time status updates.
 * Supports polling-based updates with configurable intervals.
 */

import type { GenerationTask } from '../types';

export interface ProgressUpdate {
  taskId: string;
  status: GenerationTask['status'];
  progress: number; // 0-100
  message?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ProgressTrackingOptions {
  pollInterval?: number; // milliseconds, default 2000
  onProgress?: (update: ProgressUpdate) => void;
  onComplete?: (taskId: string) => void;
  onError?: (taskId: string, error: string) => void;
}

export class ProgressTrackingService {
  private pollingIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private baseUrl: string;

  constructor(baseUrl: string = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Start tracking a task's progress
   */
  startTracking(taskId: string, options: ProgressTrackingOptions = {}): void {
    // Stop any existing tracking for this task
    this.stopTracking(taskId);

    const pollInterval = options.pollInterval || 2000;

    // Start polling
    const intervalId = setInterval(async () => {
      try {
        const update = await this.fetchProgress(taskId);
        
        // Notify progress callback
        if (options.onProgress) {
          options.onProgress(update);
        }

        // Check if task is complete
        if (update.status === 'completed') {
          this.stopTracking(taskId);
          if (options.onComplete) {
            options.onComplete(taskId);
          }
        } else if (update.status === 'failed') {
          this.stopTracking(taskId);
          if (options.onError) {
            options.onError(taskId, update.error || 'Task failed');
          }
        }
      } catch (error) {
        console.error(`Error tracking task ${taskId}:`, error);
        if (options.onError) {
          options.onError(taskId, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    }, pollInterval);

    this.pollingIntervals.set(taskId, intervalId);
  }

  /**
   * Stop tracking a task's progress
   */
  stopTracking(taskId: string): void {
    const intervalId = this.pollingIntervals.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(taskId);
    }
  }

  /**
   * Stop tracking all tasks
   */
  stopAllTracking(): void {
    this.pollingIntervals.forEach((intervalId) => clearInterval(intervalId));
    this.pollingIntervals.clear();
  }

  /**
   * Fetch current progress for a task
   */
  async fetchProgress(taskId: string): Promise<ProgressUpdate> {
    const response = await fetch(`${this.baseUrl}/api/tasks/${taskId}/progress`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch progress: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      taskId: data.taskId,
      status: data.status,
      progress: data.progress || 0,
      message: data.message,
      error: data.error,
      startedAt: data.startedAt ? new Date(data.startedAt) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
    };
  }

  /**
   * Fetch progress for multiple tasks
   */
  async fetchMultipleProgress(taskIds: string[]): Promise<ProgressUpdate[]> {
    const promises = taskIds.map((taskId) => this.fetchProgress(taskId));
    return Promise.all(promises);
  }

  /**
   * Check if a task is being tracked
   */
  isTracking(taskId: string): boolean {
    return this.pollingIntervals.has(taskId);
  }

  /**
   * Get all tracked task IDs
   */
  getTrackedTaskIds(): string[] {
    return Array.from(this.pollingIntervals.keys());
  }
}

/**
 * Mock Progress Tracking Service for development/testing
 */
export class MockProgressTrackingService extends ProgressTrackingService {
  private mockProgress: Map<string, ProgressUpdate> = new Map();
  private mockDelay: number = 1000;

  setMockProgress(taskId: string, update: ProgressUpdate): void {
    this.mockProgress.set(taskId, update);
  }

  setMockDelay(delay: number): void {
    this.mockDelay = delay;
  }

  async fetchProgress(taskId: string): Promise<ProgressUpdate> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, this.mockDelay));

    // Return mock progress or simulate progress
    if (this.mockProgress.has(taskId)) {
      return this.mockProgress.get(taskId)!;
    }

    // Simulate progressive completion
    const existingProgress = this.mockProgress.get(taskId);
    const currentProgress = existingProgress?.progress || 0;
    
    if (currentProgress >= 100) {
      return {
        taskId,
        status: 'completed',
        progress: 100,
        message: 'Task completed successfully',
        completedAt: new Date(),
      };
    }

    const newProgress = Math.min(currentProgress + 10, 100);
    const update: ProgressUpdate = {
      taskId,
      status: newProgress >= 100 ? 'completed' : 'processing',
      progress: newProgress,
      message: `Processing... ${newProgress}%`,
      startedAt: existingProgress?.startedAt || new Date(),
      completedAt: newProgress >= 100 ? new Date() : undefined,
    };

    this.mockProgress.set(taskId, update);
    return update;
  }
}

/**
 * Factory function to create the appropriate service
 */
export function createProgressTrackingService(useMock: boolean = false): ProgressTrackingService {
  if (useMock || import.meta.env.VITE_USE_MOCK_BACKEND === 'true') {
    return new MockProgressTrackingService();
  }
  return new ProgressTrackingService();
}
