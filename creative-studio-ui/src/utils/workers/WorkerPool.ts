/**
 * WorkerPool - Gestion d'un pool de Web Workers pour traitement asynchrone
 * 
 * Cette classe gère un pool de workers pour exécuter des tâches en arrière-plan
 * sans bloquer l'interface utilisateur. Elle implémente une file d'attente de tâches
 * et alloue automatiquement les workers disponibles.
 * 
 * Exigences: 10.1, 10.6
 */

export interface WorkerTask<T = any, R = any> {
  id: string;
  type: string;
  data: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
  priority?: number;
}

export interface WorkerMessage<T = any> {
  id: string;
  type: string;
  data: T;
}

export interface WorkerResponse<R = any> {
  id: string;
  status: 'completed' | 'error' | 'progress';
  result?: R;
  error?: string;
  progress?: number;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  public readonly size: number;
  private workerUrl: string;

  /**
   * Crée un nouveau pool de workers
   * @param size - Nombre de workers dans le pool (par défaut: nombre de cœurs CPU)
   * @param workerUrl - URL du script worker à charger
   */
  constructor(
    size: number = navigator.hardwareConcurrency || 4,
    workerUrl: string = new URL('../../workers/processing.worker.ts', import.meta.url).href
  ) {
    this.size = size;
    this.workerUrl = workerUrl;
    this.initializeWorkers();
  }

  /**
   * Initialise tous les workers du pool
   * Exigence: 10.1 - Traitement non-bloquant
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.size; i++) {
      const worker = this.createWorker();
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Crée un nouveau worker avec les gestionnaires d'événements
   */
  private createWorker(): Worker {
    const worker = new Worker(this.workerUrl, { type: 'module' });

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      this.handleWorkerMessage(worker, event.data);
    };

    worker.onerror = (error: ErrorEvent) => {
      this.handleWorkerError(worker, error);
    };

    return worker;
  }

  /**
   * Exécute une tâche dans le pool de workers
   * @param type - Type de tâche à exécuter
   * @param data - Données à traiter
   * @param priority - Priorité de la tâche (optionnel)
   * @returns Promise qui se résout avec le résultat
   * 
   * Exigence: 10.6 - File d'attente avec priorités
   */
  async execute<T, R>(type: string, data: T, priority: number = 0): Promise<R> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask<T, R> = {
        id: this.generateTaskId(),
        type,
        data,
        resolve,
        reject,
        priority
      };

      const worker = this.availableWorkers.pop();

      if (worker) {
        // Worker available, execute immediately
        this.executeTask(worker, task);
      } else {
        // No worker available, add to queue
        this.enqueueTask(task);
      }
    });
  }

  /**
   * Adds a task to the queue respecting priorities
   * Requirement: 10.6 - Priority management
   */
  private enqueueTask(task: WorkerTask): void {
    // Insert task based on its priority (higher priority = earlier in queue)
    const insertIndex = this.taskQueue.findIndex(t => (t.priority || 0) < (task.priority || 0));
    
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }
  }

  /**
   * Executes a task on a specific worker
   */
  private executeTask(worker: Worker, task: WorkerTask): void {
    const message: WorkerMessage = {
      id: task.id,
      type: task.type,
      data: task.data
    };

    worker.postMessage(message);

    // Store task for later resolution
    (worker as any).__currentTask = task;
  }

  /**
   * Handles messages received from a worker
   * Requirement: 10.2 - Progress updates
   */
  private handleWorkerMessage(worker: Worker, response: WorkerResponse): void {
    const task = (worker as any).__currentTask as WorkerTask;

    if (!task || response.id !== task.id) {
      console.warn('Received message for unknown task:', response.id);
      return;
    }

    if (response.status === 'progress') {
      // Progress message - do not release worker
      // Progress callbacks can be added in a future version
      return;
    }

    if (response.status === 'error') {
      task.reject(new Error(response.error || 'Worker task failed'));
    } else if (response.status === 'completed') {
      task.resolve(response.result);
    }

    // Release worker
    delete (worker as any).__currentTask;
    this.availableWorkers.push(worker);

    // Process next pending task
    this.processNextTask(worker);
  }

  /**
   * Processes the next task in the queue
   */
  private processNextTask(worker: Worker): void {
    const nextTask = this.taskQueue.shift();
    if (nextTask) {
      // Remove worker from available list
      const index = this.availableWorkers.indexOf(worker);
      if (index !== -1) {
        this.availableWorkers.splice(index, 1);
      }
      this.executeTask(worker, nextTask);
    }
  }

  /**
   * Handles worker errors
   * Requirement: 10.7 - Error handling with context
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    const task = (worker as any).__currentTask as WorkerTask;

    if (task) {
      task.reject(new Error(`Worker error: ${error.message}`));
      delete (worker as any).__currentTask;
    }

    // Recreate failed worker
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      worker.terminate();
      this.workers.splice(index, 1);

      const newWorker = this.createWorker();
      this.workers.push(newWorker);
      this.availableWorkers.push(newWorker);
    }
  }

  /**
   * Cancels a specific task by its ID
   * Requirement: 10.5 - Task cancellation
   */
  cancel(taskId: string): boolean {
    // Search in queue
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue.splice(queueIndex, 1)[0];
      task.reject(new Error('Task cancelled'));
      return true;
    }

    // Search in running tasks
    for (const worker of this.workers) {
      const task = (worker as any).__currentTask as WorkerTask;
      if (task && task.id === taskId) {
        task.reject(new Error('Task cancelled'));
        delete (worker as any).__currentTask;
        
        // Send cancellation message to worker
        worker.postMessage({ id: taskId, type: 'cancel' });
        
        // Make worker available
        if (!this.availableWorkers.includes(worker)) {
          this.availableWorkers.push(worker);
        }
        
        // Process next task
        this.processNextTask(worker);
        return true;
      }
    }

    return false;
  }

  /**
   * Cancels all running and pending tasks
   * Requirement: 10.5 - Task cancellation
   */
  cancelAll(): void {
    // Reject all pending tasks
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (task) {
        task.reject(new Error('Task cancelled'));
      }
    }

    // Reject all running tasks
    for (const worker of this.workers) {
      const task = (worker as any).__currentTask as WorkerTask;
      if (task) {
        task.reject(new Error('Task cancelled'));
        delete (worker as any).__currentTask;
        
        // Send cancellation message to worker
        worker.postMessage({ id: task.id, type: 'cancel' });
      }
    }

    // Reset available workers list
    this.availableWorkers = [...this.workers];
  }

  /**
   * Properly terminates all workers in the pool
   * Requirement: 10.5 - Clean termination
   */
  terminate(): void {
    this.cancelAll();

    for (const worker of this.workers) {
      worker.terminate();
    }

    this.workers = [];
    this.availableWorkers = [];
  }

  /**
   * Returns the number of pending tasks
   */
  getQueueSize(): number {
    return this.taskQueue.length;
  }

  /**
   * Retourne le nombre de workers disponibles
   */
  getAvailableWorkers(): number {
    return this.availableWorkers.length;
  }

  /**
   * Retourne le nombre de workers occupés
   */
  getBusyWorkers(): number {
    return this.size - this.availableWorkers.length;
  }

  /**
   * Génère un ID unique pour une tâche
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
