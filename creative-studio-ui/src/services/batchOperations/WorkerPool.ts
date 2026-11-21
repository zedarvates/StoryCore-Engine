/**
 * WorkerPool - Pool de Web Workers pour traitement parallèle
 * 
 * Gère un pool de workers pour exécuter des tâches en parallèle:
 * - Allocation et libération de workers
 * - File d'attente de tâches
 * - Gestion des erreurs
 * - Annulation de tâches
 * 
 * Exigences: 10.1, 10.6
 */
import type { WorkerTask } from '../../types';
import type { WorkerMessage } from '../../workers/processing.worker';

/**
 * Configuration du pool de workers
 */
export interface WorkerPoolConfig {
  size?: number;
  workerUrl?: string;
}

/**
 * Pool de Web Workers
 * Exigence: 10.1 - Traitement non-bloquant
 * Exigence: 10.6 - Traitement parallèle avec file d'attente
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private readonly activeTasks = new WeakMap<Worker, WorkerTask>();
  public readonly size: number;
  
  constructor(config: WorkerPoolConfig = {}) {
    this.size = config.size || navigator.hardwareConcurrency || 4;
    this.initializeWorkers();
  }
  
  /**
   * Initialise les workers
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.size; i++) {
      try {
        const worker = new Worker(
          new URL('../../workers/processing.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        worker.onmessage = (event) => {
          this.handleWorkerMessage(worker, event.data);
        };
        
        worker.onerror = (error) => {
          this.handleWorkerError(worker, error);
        };
        
        this.workers.push(worker);
        this.availableWorkers.push(worker);
      } catch (error) {
        console.error(`Failed to create worker ${i}:`, error);
      }
    }
  }
  
  /**
   * Exécute une tâche
   * Exigence: 10.1 - Traitement non-bloquant
   */
  async execute(type: string, data: unknown): Promise<unknown> {
    if (this.workers.length === 0) {
      throw new Error('No processing worker is available');
    }
    return new Promise((resolve, reject) => {
      const task: WorkerTask = {
        id: this.generateId(),
        type,
        data,
        resolve,
        reject
      };
      
      const worker = this.availableWorkers.pop();
      
      if (worker) {
        this.executeTask(worker, task);
      } else {
        // Aucun worker disponible, ajouter à la file d'attente
        this.taskQueue.push(task);
      }
    });
  }
  
  /**
   * Exécute une tâche sur un worker
   */
  private executeTask(worker: Worker, task: WorkerTask): void {
    const message: WorkerMessage = {
      id: task.id,
      type: task.type,
      data: task.data
    };
    
    this.activeTasks.set(worker, task);
    try {
      worker.postMessage(message);
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error('Could not send task to worker'));
      this.releaseWorker(worker);
    }
  }
  
  /**
   * Gère les messages des workers
   */
  private handleWorkerMessage(worker: Worker, message: unknown): void {
    const task = this.activeTasks.get(worker);
    if (!task || typeof message !== 'object' || message === null || !('id' in message) ||
        message.id !== task.id || !('status' in message)) {
      return;
    }

    if (message.status === 'completed') {
      task.resolve('result' in message ? message.result : undefined);
      this.releaseWorker(worker);
    } else if (message.status === 'error') {
      const reason = 'error' in message && typeof message.error === 'string'
        ? message.error
        : 'Processing worker reported an error';
      task.reject(new Error(reason));
      this.releaseWorker(worker);
    }
  }

  /**
   * Gère les erreurs des workers
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    const task = this.activeTasks.get(worker);
    
    if (task) {
      task.reject(new Error(error.message));
      this.activeTasks.delete(worker);
    }
    
    // Recréer le worker
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      worker.terminate();
      this.workers.splice(index, 1);
      this.availableWorkers = this.availableWorkers.filter((available) => available !== worker);
      
      try {
        const newWorker = new Worker(
          new URL('../../workers/processing.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        newWorker.onmessage = (event) => {
          this.handleWorkerMessage(newWorker, event.data);
        };
        
        newWorker.onerror = (error) => {
          this.handleWorkerError(newWorker, error);
        };
        
        this.workers.push(newWorker);
        this.releaseWorker(newWorker);
      } catch (error) {
        console.error('Failed to recreate worker:', error);
        if (this.workers.length === 0) {
          for (const queuedTask of this.taskQueue) {
            queuedTask.reject(new Error('No processing worker is available'));
          }
          this.taskQueue = [];
        }
      }
    }
  }
  
  /**
   * Libère un worker et traite la prochaine tâche
   * Exigence: 10.6 - File d'attente de tâches
   */
  private releaseWorker(worker: Worker): void {
    this.activeTasks.delete(worker);
    
    // Traiter la prochaine tâche en attente
    const nextTask = this.taskQueue.shift();
    if (nextTask) {
      this.executeTask(worker, nextTask);
    } else {
      // Aucune tâche en attente, rendre le worker disponible
      this.availableWorkers.push(worker);
    }
  }
  
  /**
   * Annule toutes les tâches en cours
   * Exigence: 10.5 - Annulation de tâches
   */
  cancelAll(): void {
    // Vider la file d'attente
    for (const task of this.taskQueue) {
      task.reject(new Error('Task cancelled'));
    }
    this.taskQueue = [];
    
    // Annuler les tâches en cours
    for (const worker of this.workers) {
      const task = this.activeTasks.get(worker);
      if (task) {
        // Envoyer un message d'annulation au worker
        worker.postMessage({ id: task.id, type: 'cancel' });
        task.reject(new Error('Task cancelled'));
        this.activeTasks.delete(worker);
      }
    }
    
    // Tous les workers sont maintenant disponibles
    this.availableWorkers = [...this.workers];
  }
  
  /**
   * Termine tous les workers
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
   * Récupère le nombre de tâches en attente
   */
  getQueueSize(): number {
    return this.taskQueue.length;
  }
  
  /**
   * Récupère le nombre de workers disponibles
   */
  getAvailableWorkers(): number {
    return this.availableWorkers.length;
  }
  
  /**
   * Récupère le nombre de workers occupés
   */
  getBusyWorkers(): number {
    return this.workers.length - this.availableWorkers.length;
  }
  
  /**
   * Génère un ID unique
   */
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}


