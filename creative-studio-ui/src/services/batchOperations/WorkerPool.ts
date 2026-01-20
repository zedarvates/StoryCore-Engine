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

import type { WorkerTask, WorkerMessage } from '../../types';

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
  async execute<T>(type: string, data: any): Promise<T> {
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
      type: task.type as WorkerMessage['type'],
      data: task.data
    };
    
    worker.postMessage(message);
    
    // Stocker la tâche pour la résolution
    (worker as any).__currentTask = task;
  }
  
  /**
   * Gère les messages des workers
   */
  private handleWorkerMessage(worker: Worker, message: any): void {
    const task = (worker as any).__currentTask as WorkerTask;
    
    if (task && message.id === task.id) {
      if (message.status === 'completed') {
        task.resolve(message.result);
        this.releaseWorker(worker);
      } else if (message.status === 'error') {
        task.reject(new Error(message.error));
        this.releaseWorker(worker);
      } else if (message.status === 'progress') {
        // Progression - ne pas libérer le worker
        // Peut être géré par un callback si nécessaire
      }
    }
  }
  
  /**
   * Gère les erreurs des workers
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    const task = (worker as any).__currentTask as WorkerTask;
    
    if (task) {
      task.reject(new Error(error.message));
      delete (worker as any).__currentTask;
    }
    
    // Recréer le worker
    const index = this.workers.indexOf(worker);
    if (index !== -1) {
      worker.terminate();
      this.workers.splice(index, 1);
      
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
        this.availableWorkers.push(newWorker);
      } catch (error) {
        console.error('Failed to recreate worker:', error);
      }
    }
  }
  
  /**
   * Libère un worker et traite la prochaine tâche
   * Exigence: 10.6 - File d'attente de tâches
   */
  private releaseWorker(worker: Worker): void {
    delete (worker as any).__currentTask;
    
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
      const task = (worker as any).__currentTask as WorkerTask;
      if (task) {
        // Envoyer un message d'annulation au worker
        worker.postMessage({ id: task.id, type: 'cancel' });
        task.reject(new Error('Task cancelled'));
        delete (worker as any).__currentTask;
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
