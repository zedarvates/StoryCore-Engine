/**
 * BatchOperationsManager - Gestionnaire d'opérations par lots
 * 
 * Gère l'exécution d'opérations sur plusieurs plans simultanément avec:
 * - Traitement parallèle via WorkerPool
 * - Gestion de la progression
 * - Gestion des erreurs partielles
 * - Annulation d'opérations
 * 
 * Exigences: 8.1, 8.2, 8.4, 8.6, 8.7
 */

import type { Shot, BatchOperation, BatchOperationType, BatchOperationResult } from '../../types';
import { WorkerPool, WorkerPoolConfig } from './WorkerPool';

/**
 * Options pour les opérations par lots
 */
export interface BatchOperationOptions {
  // Options de duplication
  suffix?: string;
  
  // Options de transformation
  transform?: Record<string, any>;
  
  // Options d'export
  format?: string;
  quality?: string;
  
  // Options de tag
  tags?: string[];
  addTags?: boolean; // true = ajouter, false = remplacer
  
  // Options générales
  parallel?: boolean; // Traiter en parallèle (défaut: true)
  maxConcurrent?: number; // Nombre max de tâches parallèles
}

/**
 * Gestionnaire d'opérations par lots
 * Exigences: 8.1, 8.2, 8.4, 8.6, 8.7
 */
export class BatchOperationsManager {
  private operations: Map<string, BatchOperation> = new Map();
  private workerPool: WorkerPool;
  private operationHistory: Array<{ operation: BatchOperation; timestamp: number }> = [];
  
  constructor(config: WorkerPoolConfig | number = {}) {
    const workerConfig = typeof config === 'number' ? { size: config } : config;
    this.workerPool = new WorkerPool(workerConfig);
  }
  
  /**
   * Exécute une opération par lots
   * Exigence: 8.2 - Application à tous les plans sélectionnés
   * Exigence: 8.4 - Traitement parallèle avec progression
   */
  async execute(
    type: BatchOperationType,
    items: Shot[],
    options: BatchOperationOptions = {}
  ): Promise<BatchOperationResult> {
    const operationId = this.generateId();
    const operation: BatchOperation = {
      id: operationId,
      type,
      items,
      status: 'pending',
      progress: 0,
      startTime: Date.now()
    };
    
    this.operations.set(operationId, operation);
    operation.status = 'running';
    
    const results: BatchOperationResult = {
      success: [],
      failed: [],
      totalTime: 0
    };
    
    try {
      // Déterminer le mode de traitement
      const parallel = options.parallel !== false;
      const maxConcurrent = options.maxConcurrent || this.workerPool.size;
      
      if (parallel) {
        // Traitement parallèle avec pool de workers
        const chunks = this.chunkArray(items, maxConcurrent);
        
        const chunkPromises = chunks.map((chunk, index) => 
          this.processChunk(operation, chunk, index, options)
        );
        
        const chunkResults = await Promise.all(chunkPromises);
        
        // Agréger les résultats
        for (const chunkResult of chunkResults) {
          results.success.push(...chunkResult.success);
          results.failed.push(...chunkResult.failed);
        }
      } else {
        // Traitement séquentiel
        for (let i = 0; i < items.length; i++) {
          const shot = items[i];
          
          try {
            const result = await this.processItem(operation.type, shot, options);
            results.success.push(result);
          } catch (error) {
            results.failed.push({ shot, error: error as Error });
          }
          
          // Mettre à jour la progression
          operation.progress = ((i + 1) / items.length) * 100;
        }
      }
      
      operation.status = 'completed';
      operation.progress = 100;
      operation.endTime = Date.now();
      results.totalTime = operation.endTime! - operation.startTime!;
      
      // Ajouter à l'historique pour estimation de temps
      this.operationHistory.push({
        operation: { ...operation },
        timestamp: Date.now()
      });
      
      // Limiter l'historique à 100 entrées
      if (this.operationHistory.length > 100) {
        this.operationHistory.shift();
      }
      
    } catch (error) {
      operation.status = 'failed';
      operation.error = error as Error;
      operation.endTime = Date.now();
      throw error;
    }
    
    return results;
  }
  
  /**
   * Traite un chunk d'éléments en parallèle
   * Exigence: 8.4 - Traitement parallèle
   */
  private async processChunk(
    operation: BatchOperation,
    chunk: Shot[],
    chunkIndex: number,
    options: BatchOperationOptions
  ): Promise<{ success: Shot[]; failed: Array<{ shot: Shot; error: Error }> }> {
    const success: Shot[] = [];
    const failed: Array<{ shot: Shot; error: Error }> = [];
    
    for (let i = 0; i < chunk.length; i++) {
      const shot = chunk[i];
      
      // Vérifier si l'opération a été annulée
      if (operation.status === 'cancelled') {
        break;
      }
      
      try {
        const result = await this.processItem(operation.type, shot, options);
        success.push(result);
        
        // Mettre à jour la progression
        const totalProcessed = chunkIndex * chunk.length + i + 1;
        operation.progress = (totalProcessed / operation.items.length) * 100;
        
      } catch (error) {
        failed.push({ shot, error: error as Error });
      }
    }
    
    return { success, failed };
  }
  
  /**
   * Traite un élément individuel
   * Exigence: 8.2 - Application des transformations
   */
  private async processItem(
    type: BatchOperationType,
    shot: Shot,
    options: BatchOperationOptions
  ): Promise<Shot> {
    switch (type) {
      case 'duplicate':
        return this.duplicateShot(shot, options);
      
      case 'delete':
        return this.deleteShot(shot);
      
      case 'export':
        return this.exportShot(shot, options);
      
      case 'transform':
        return this.transformShot(shot, options);
      
      case 'tag':
        return this.tagShot(shot, options);
      
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }
  
  /**
   * Duplique un plan
   */
  private async duplicateShot(shot: Shot, options: BatchOperationOptions): Promise<Shot> {
    const suffix = options.suffix || 'copy';
    const newId = `${shot.id}_${suffix}_${Date.now()}`;
    
    return {
      ...shot,
      id: newId,
      title: `${shot.title} (${suffix})`,
      position: shot.position + 1
    };
  }
  
  /**
   * Supprime un plan (marque comme supprimé)
   */
  private async deleteShot(shot: Shot): Promise<Shot> {
    return {
      ...shot,
      metadata: {
        ...shot.metadata,
        deleted: true,
        deletedAt: Date.now()
      }
    };
  }
  
  /**
   * Exporte un plan
   */
  private async exportShot(shot: Shot, options: BatchOperationOptions): Promise<Shot> {
    // Utiliser le worker pool pour l'export
    const result = await this.workerPool.execute('exportShot', {
      shot,
      format: options.format || 'json',
      quality: options.quality || 'high'
    });
    
    return {
      ...shot,
      metadata: {
        ...shot.metadata,
        exported: true,
        exportedAt: Date.now(),
        exportFormat: options.format,
        exportResult: result
      }
    };
  }
  
  /**
   * Transforme un plan
   */
  private async transformShot(shot: Shot, options: BatchOperationOptions): Promise<Shot> {
    if (!options.transform) {
      throw new Error('Transform options required');
    }
    
    return {
      ...shot,
      ...options.transform,
      metadata: {
        ...shot.metadata,
        transformed: true,
        transformedAt: Date.now()
      }
    };
  }
  
  /**
   * Ajoute ou remplace des tags
   */
  private async tagShot(shot: Shot, options: BatchOperationOptions): Promise<Shot> {
    if (!options.tags) {
      throw new Error('Tags required');
    }
    
    const addTags = options.addTags !== false;
    const existingTags = shot.metadata?.tags || [];
    
    const newTags = addTags
      ? [...new Set([...existingTags, ...options.tags])]
      : options.tags;
    
    return {
      ...shot,
      metadata: {
        ...shot.metadata,
        tags: newTags,
        taggedAt: Date.now()
      }
    };
  }
  
  /**
   * Annule une opération en cours
   * Exigence: 8.7 - Annulation d'opérations
   */
  cancel(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (operation && operation.status === 'running') {
      operation.status = 'cancelled';
      operation.endTime = Date.now();
      
      // Annuler les workers en cours
      this.workerPool.cancelAll();
    }
  }
  
  /**
   * Récupère une opération
   */
  getOperation(operationId: string): BatchOperation | undefined {
    return this.operations.get(operationId);
  }
  
  /**
   * Récupère toutes les opérations
   */
  getAllOperations(): BatchOperation[] {
    return Array.from(this.operations.values());
  }
  
  /**
   * Estime le temps de traitement
   * Exigence: 8.8 - Estimation de temps
   */
  estimateTime(type: BatchOperationType, itemCount: number): number {
    // Filtrer l'historique pour ce type d'opération
    const relevantHistory = this.operationHistory.filter(
      h => h.operation.type === type && h.operation.status === 'completed'
    );
    
    if (relevantHistory.length === 0) {
      // Pas d'historique, utiliser une estimation par défaut
      const defaultTimePerItem = this.getDefaultTimePerItem(type);
      return defaultTimePerItem * itemCount;
    }
    
    // Calculer le temps moyen par élément
    const totalTime = relevantHistory.reduce((sum, h) => {
      const time = (h.operation.endTime || 0) - (h.operation.startTime || 0);
      return sum + time;
    }, 0);
    
    const totalItems = relevantHistory.reduce((sum, h) => {
      return sum + h.operation.items.length;
    }, 0);
    
    const avgTimePerItem = totalTime / totalItems;
    
    return Math.ceil(avgTimePerItem * itemCount);
  }
  
  /**
   * Temps par défaut par élément (en ms)
   */
  private getDefaultTimePerItem(type: BatchOperationType): number {
    switch (type) {
      case 'duplicate':
        return 100;
      case 'delete':
        return 50;
      case 'export':
        return 2000;
      case 'transform':
        return 500;
      case 'tag':
        return 50;
      default:
        return 1000;
    }
  }
  
  /**
   * Divise un tableau en chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  /**
   * Génère un ID unique
   */
  private generateId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Nettoie les opérations terminées
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 heure
    
    for (const [id, operation] of this.operations.entries()) {
      if (
        operation.status !== 'running' &&
        operation.endTime &&
        now - operation.endTime > maxAge
      ) {
        this.operations.delete(id);
      }
    }
  }
  
  /**
   * Termine le gestionnaire
   */
  terminate(): void {
    this.workerPool.terminate();
    this.operations.clear();
    this.operationHistory = [];
  }
}
