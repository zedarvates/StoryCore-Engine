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
        // Worker disponible, exécuter immédiatement
        this.executeTask(worker, task);
      } else {
        // Aucun worker disponible, ajouter à la file d'attente
        this.enqueueTask(task);
      }
    });
  }

  /**
   * Ajoute une tâche à la file d'attente en respectant les priorités
   * Exigence: 10.6 - Gestion des priorités
   */
  private enqueueTask(task: WorkerTask): void {
    // Insérer la tâche en fonction de sa priorité (plus haute priorité = plus tôt dans la file)
    const insertIndex = this.taskQueue.findIndex(t => (t.priority || 0) < (task.priority || 0));
    
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }
  }

  /**
   * Exécute une tâche sur un worker spécifique
   */
  private executeTask(worker: Worker, task: WorkerTask): void {
    const message: WorkerMessage = {
      id: task.id,
      type: task.type,
      data: task.data
    };

    worker.postMessage(message);

    // Stocker la tâche pour la résolution ultérieure
    (worker as any).__currentTask = task;
  }

  /**
   * Gère les messages reçus d'un worker
   * Exigence: 10.2 - Mises à jour de progression
   */
  private handleWorkerMessage(worker: Worker, response: WorkerResponse): void {
    const task = (worker as any).__currentTask as WorkerTask;

    if (!task || response.id !== task.id) {
      console.warn('Received message for unknown task:', response.id);
      return;
    }

    if (response.status === 'progress') {
      // Message de progression - ne pas libérer le worker
      // Les callbacks de progression peuvent être ajoutés dans une version future
      return;
    }

    if (response.status === 'error') {
      task.reject(new Error(response.error || 'Worker task failed'));
    } else if (response.status === 'completed') {
      task.resolve(response.result);
    }

    // Libérer le worker
    delete (worker as any).__currentTask;
    this.availableWorkers.push(worker);

    // Traiter la prochaine tâche en attente
    this.processNextTask(worker);
  }

  /**
   * Traite la prochaine tâche dans la file d'attente
   */
  private processNextTask(worker: Worker): void {
    const nextTask = this.taskQueue.shift();
    if (nextTask) {
      // Retirer le worker de la liste des disponibles
      const index = this.availableWorkers.indexOf(worker);
      if (index !== -1) {
        this.availableWorkers.splice(index, 1);
      }
      this.executeTask(worker, nextTask);
    }
  }

  /**
   * Gère les erreurs d'un worker
   * Exigence: 10.7 - Gestion d'erreurs avec contexte
   */
  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    const task = (worker as any).__currentTask as WorkerTask;

    if (task) {
      task.reject(new Error(`Worker error: ${error.message}`));
      delete (worker as any).__currentTask;
    }

    // Recréer le worker défaillant
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
   * Annule une tâche spécifique par son ID
   * Exigence: 10.5 - Annulation de tâches
   */
  cancel(taskId: string): boolean {
    // Chercher dans la file d'attente
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex !== -1) {
      const task = this.taskQueue.splice(queueIndex, 1)[0];
      task.reject(new Error('Task cancelled'));
      return true;
    }

    // Chercher dans les tâches en cours
    for (const worker of this.workers) {
      const task = (worker as any).__currentTask as WorkerTask;
      if (task && task.id === taskId) {
        task.reject(new Error('Task cancelled'));
        delete (worker as any).__currentTask;
        
        // Envoyer un message d'annulation au worker
        worker.postMessage({ id: taskId, type: 'cancel' });
        
        // Rendre le worker disponible
        if (!this.availableWorkers.includes(worker)) {
          this.availableWorkers.push(worker);
        }
        
        // Traiter la prochaine tâche
        this.processNextTask(worker);
        return true;
      }
    }

    return false;
  }

  /**
   * Annule toutes les tâches en cours et en attente
   * Exigence: 10.5 - Annulation de tâches
   */
  cancelAll(): void {
    // Rejeter toutes les tâches en attente
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (task) {
        task.reject(new Error('Task cancelled'));
      }
    }

    // Rejeter toutes les tâches en cours
    for (const worker of this.workers) {
      const task = (worker as any).__currentTask as WorkerTask;
      if (task) {
        task.reject(new Error('Task cancelled'));
        delete (worker as any).__currentTask;
        
        // Envoyer un message d'annulation au worker
        worker.postMessage({ id: task.id, type: 'cancel' });
      }
    }

    // Réinitialiser la liste des workers disponibles
    this.availableWorkers = [...this.workers];
  }

  /**
   * Termine proprement tous les workers du pool
   * Exigence: 10.5 - Terminaison propre
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
   * Retourne le nombre de tâches en attente
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
