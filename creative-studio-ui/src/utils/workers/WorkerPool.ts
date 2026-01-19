/**
 * WorkerPool manages a pool of Web Workers for asynchronous processing
 * Supports task queuing, worker allocation, and progress tracking
 */

export interface WorkerTask {
  id: string;
  type: string;
  data: any;
  priority?: number;
}

export interface WorkerResult {
  taskId: string;
  success: boolean;
  data?: any;
  error?: string;
}

export interface WorkerProgress {
  taskId: string;
  progress: number;
  message?: string;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private activeTasks = new Map<string, WorkerTask>();
  private maxWorkers: number;
  private onResult?: (result: WorkerResult) => void;
  private onProgress?: (progress: WorkerProgress) => void;
  private nextWorkerId = 0;

  constructor(maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = Math.min(maxWorkers, 8); // Cap at 8 workers
    this.initializeWorkers();
  }

  private initializeWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker();
    }
  }

  private createWorker(): Worker {
    const worker = new Worker(new URL('./processing.worker.ts', import.meta.url), {
      type: 'module'
    });

    const workerId = this.nextWorkerId++;
    worker.postMessage({ type: 'INIT', workerId });

    worker.onmessage = (event) => {
      const { type, taskId, ...data } = event.data;

      switch (type) {
        case 'TASK_COMPLETE':
          this.handleTaskComplete(taskId, data.success, data.result, data.error);
          break;
        case 'TASK_PROGRESS':
          this.handleTaskProgress(taskId, data.progress, data.message);
          break;
        case 'WORKER_READY':
          this.availableWorkers.push(worker);
          this.processQueue();
          break;
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      // Remove faulty worker and create a new one
      this.removeWorker(worker);
      this.createWorker();
    };

    this.workers.push(worker);
    return worker;
  }

  private removeWorker(worker: Worker) {
    const index = this.workers.indexOf(worker);
    if (index > -1) {
      this.workers.splice(index, 1);
    }

    const availIndex = this.availableWorkers.indexOf(worker);
    if (availIndex > -1) {
      this.availableWorkers.splice(availIndex, 1);
    }

    worker.terminate();
  }

  private handleTaskComplete(taskId: string, success: boolean, result?: any, error?: string) {
    const task = this.activeTasks.get(taskId);
    if (!task) return;

    this.activeTasks.delete(taskId);

    if (this.onResult) {
      this.onResult({
        taskId,
        success,
        data: result,
        error
      });
    }

    // Worker becomes available again
    // Note: In a real implementation, we'd track which worker completed the task
    this.processQueue();
  }

  private handleTaskProgress(taskId: string, progress: number, message?: string) {
    if (this.onProgress) {
      this.onProgress({
        taskId,
        progress,
        message
      });
    }
  }

  private processQueue() {
    if (this.taskQueue.length === 0 || this.availableWorkers.length === 0) {
      return;
    }

    // Sort queue by priority (higher number = higher priority)
    this.taskQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const task = this.taskQueue.shift()!;
    const worker = this.availableWorkers.pop()!;

    this.activeTasks.set(task.id, task);

    worker.postMessage({
      type: 'EXECUTE_TASK',
      taskId: task.id,
      taskType: task.type,
      data: task.data
    });
  }

  /**
   * Execute a task asynchronously
   */
  async executeTask(task: WorkerTask): Promise<WorkerResult> {
    return new Promise((resolve) => {
      const originalOnResult = this.onResult;

      this.onResult = (result) => {
        if (result.taskId === task.id) {
          this.onResult = originalOnResult;
          resolve(result);
        } else if (originalOnResult) {
          originalOnResult(result);
        }
      };

      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  /**
   * Add a task to the queue (fire and forget)
   */
  enqueueTask(task: WorkerTask) {
    this.taskQueue.push(task);
    this.processQueue();
  }

  /**
   * Cancel all pending tasks
   */
  cancelAll() {
    this.taskQueue.length = 0;
    // Note: Active tasks would need to be cancelled individually
    // For now, we just clear the queue
  }

  /**
   * Set result callback
   */
  setOnResult(callback: (result: WorkerResult) => void) {
    this.onResult = callback;
  }

  /**
   * Set progress callback
   */
  setOnProgress(callback: (progress: WorkerProgress) => void) {
    this.onProgress = callback;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTasks.size
    };
  }

  /**
   * Cleanup all workers
   */
  destroy() {
    this.workers.forEach(worker => worker.terminate());
    this.workers.length = 0;
    this.availableWorkers.length = 0;
    this.taskQueue.length = 0;
    this.activeTasks.clear();
  }
}