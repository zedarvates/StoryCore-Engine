/**
 * BatchOperationsManager - Batch operations manager
 * 
 * Manages the execution of operations on multiple shots simultaneously with:
 * - Parallel processing via WorkerPool
 * - Progress tracking
 * - Partial error handling
 * - Operation cancellation
 * 
 * Requirements: 8.1, 8.2, 8.4, 8.6, 8.7
 */

import type { Shot, BatchOperation, BatchOperationType, BatchOperationResult } from '../../types';
import { WorkerPool, WorkerPoolConfig } from './WorkerPool';

/**
 * Options for batch operations
 */
export interface BatchOperationOptions {
  // Duplication options
  suffix?: string;
  
  // Transformation options
  transform?: Record<string, unknown>;
  
  // Export options
  format?: string;
  quality?: string;
  
  // Tag options
  tags?: string[];
  addTags?: boolean; // true = add, false = replace
  
  // General options
  parallel?: boolean; // Process in parallel (default: true)
  maxConcurrent?: number; // Max number of parallel tasks
}

/**
 * Batch operations manager
 * Requirements: 8.1, 8.2, 8.4, 8.6, 8.7
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
   * Executes a batch operation
   * Requirement: 8.2 - Application to all selected shots
   * Requirement: 8.4 - Parallel processing with progress
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
      // Determine processing mode
      const parallel = options.parallel !== false;
      const maxConcurrent = options.maxConcurrent || this.workerPool.size;
      
      if (parallel) {
        // Parallel processing with worker pool
        const chunks = this.chunkArray(items, maxConcurrent);
        
        const chunkPromises = chunks.map((chunk, index) => 
          this.processChunk(operation, chunk, index, options)
        );
        
        const chunkResults = await Promise.all(chunkPromises);
        
        // Aggregate results
        for (const chunkResult of chunkResults) {
          results.success.push(...chunkResult.success);
          results.failed.push(...chunkResult.failed);
        }
      } else {
        // Sequential processing
        for (let i = 0; i < items.length; i++) {
          const shot = items[i];
          
          try {
            const result = await this.processItem(operation.type, shot, options);
            results.success.push(result);
          } catch (error) {
            results.failed.push({ shot, error: error as Error });
          }
          
          // Update progress
          operation.progress = ((i + 1) / items.length) * 100;
        }
      }
      
      operation.status = 'completed';
      operation.progress = 100;
      operation.endTime = Date.now();
      results.totalTime = operation.endTime! - operation.startTime!;
      
      // Add to history for time estimation
      this.operationHistory.push({
        operation: { ...operation },
        timestamp: Date.now()
      });
      
      // Limit history to 100 entries
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
   * Processes a chunk of elements in parallel
   * Requirement: 8.4 - Parallel processing
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
      
      // Check if operation was cancelled
      if (operation.status === 'cancelled') {
        break;
      }
      
      try {
        const result = await this.processItem(operation.type, shot, options);
        success.push(result);
        
        // Update progress
        const totalProcessed = chunkIndex * chunk.length + i + 1;
        operation.progress = (totalProcessed / operation.items.length) * 100;
        
      } catch (error) {
        failed.push({ shot, error: error as Error });
      }
    }
    
    return { success, failed };
  }
  
  /**
   * Processes an individual item
   * Requirement: 8.2 - Applying transformations
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
   * Duplicates a shot
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
   * Deletes a shot (marks as deleted)
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
   * Exports a shot
   */
  private async exportShot(shot: Shot, options: BatchOperationOptions): Promise<Shot> {
    // Use worker pool for export
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
   * Transforms a shot
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
   * Adds or replaces tags
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
   * Cancels an ongoing operation
   * Requirement: 8.7 - Operation cancellation
   */
  cancel(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (operation && operation.status === 'running') {
      operation.status = 'cancelled';
      operation.endTime = Date.now();
      
      // Cancel ongoing workers
      this.workerPool.cancelAll();
    }
  }
  
  /**
   * Retrieves an operation
   */
  getOperation(operationId: string): BatchOperation | undefined {
    return this.operations.get(operationId);
  }
  
  /**
   * Retrieves all operations
   */
  getAllOperations(): BatchOperation[] {
    return Array.from(this.operations.values());
  }
  
  /**
   * Estimates processing time
   * Requirement: 8.8 - Time estimation
   */
  estimateTime(type: BatchOperationType, itemCount: number): number {
    // Filter history for this operation type
    const relevantHistory = this.operationHistory.filter(
      h => h.operation.type === type && h.operation.status === 'completed'
    );
    
    if (relevantHistory.length === 0) {
      // No history, use default estimation
      const defaultTimePerItem = this.getDefaultTimePerItem(type);
      return defaultTimePerItem * itemCount;
    }
    
    // Calculate average time per item
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
   * Default time per item (in ms)
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
   * Splits an array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  /**
   * Generates a unique ID
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

