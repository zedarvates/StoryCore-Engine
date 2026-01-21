/**
 * Progress Tracking Service
 * Provides functionality for tracking task progress
 */

export interface ProgressUpdate {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ProgressTrackingOptions {
  pollInterval?: number;
  onProgress?: (update: ProgressUpdate) => void;
  onComplete?: (taskId: string) => void;
  onError?: (taskId: string, error: string) => void;
}

export class ProgressTrackingService {
  private pollInterval: number;
  private trackingIntervals: Map<string, NodeJS.Timeout>;
  private onProgress?: (update: ProgressUpdate) => void;
  private onComplete?: (taskId: string) => void;
  private onError?: (taskId: string, error: string) => void;

  constructor(options: ProgressTrackingOptions = {}) {
    this.pollInterval = options.pollInterval || 2000;
    this.trackingIntervals = new Map();
    this.onProgress = options.onProgress;
    this.onComplete = options.onComplete;
    this.onError = options.onError;
  }

  startTracking(taskId: string, options: ProgressTrackingOptions = {}): void {
    if (this.trackingIntervals.has(taskId)) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const update = await this.fetchProgress(taskId);
        if (update) {
          if (options.onProgress) {
            options.onProgress(update);
          }
          if (this.onProgress) {
            this.onProgress(update);
          }

          if (update.status === 'completed' || update.status === 'failed') {
            this.stopTracking(taskId);
            if (update.status === 'completed' && options.onComplete) {
              options.onComplete(taskId);
            }
            if (update.status === 'failed' && options.onError && update.error) {
              options.onError(taskId, update.error);
            }
          }
        }
      } catch (error) {
        this.stopTracking(taskId);
        if (options.onError) {
          options.onError(taskId, error instanceof Error ? error.message : 'Unknown error');
        }
        if (this.onError) {
          this.onError(taskId, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    }, options.pollInterval || this.pollInterval);

    this.trackingIntervals.set(taskId, intervalId);
  }

  stopTracking(taskId: string): void {
    const intervalId = this.trackingIntervals.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      this.trackingIntervals.delete(taskId);
    }
  }

  stopAllTracking(): void {
    this.trackingIntervals.forEach((intervalId) => clearInterval(intervalId));
    this.trackingIntervals.clear();
  }

  isTracking(taskId: string): boolean {
    return this.trackingIntervals.has(taskId);
  }

  getTrackedTaskIds(): string[] {
    return Array.from(this.trackingIntervals.keys());
  }

  async fetchProgress(taskId: string): Promise<ProgressUpdate | null> {
    // Simulate fetching progress from backend
    const mockProgress = Math.min(Math.random() * 100, 100);
    const status = mockProgress < 100 ? 'processing' : 'completed';

    return {
      taskId,
      status,
      progress: mockProgress,
      message: status === 'completed' ? 'Task completed' : 'Task in progress',
      startedAt: new Date(),
    };
  }

  async fetchMultipleProgress(taskIds: string[]): Promise<ProgressUpdate[]> {
    return Promise.all(taskIds.map((taskId) => this.fetchProgress(taskId))).then((results) =>
      results.filter((result): result is ProgressUpdate => result !== null)
    );
  }
}

export class MockProgressTrackingService extends ProgressTrackingService {
  private mockProgress: Map<string, number> = new Map();

  constructor() {
    super({ pollInterval: 1000 });
  }

  setMockProgress(taskId: string, progress: number): void {
    this.mockProgress.set(taskId, progress);
  }

  async fetchProgress(taskId: string): Promise<ProgressUpdate | null> {
    const currentProgress = this.mockProgress.get(taskId) || 0;
    const newProgress = Math.min(currentProgress + 10, 100);
    this.mockProgress.set(taskId, newProgress);

    const status = newProgress < 100 ? 'processing' : 'completed';

    return {
      taskId,
      status,
      progress: newProgress,
      message: status === 'completed' ? 'Task completed' : 'Task in progress',
      startedAt: new Date(),
    };
  }
}

export function createProgressTrackingService(useMock: boolean = false): ProgressTrackingService {
  return useMock ? new MockProgressTrackingService() : new ProgressTrackingService();
}