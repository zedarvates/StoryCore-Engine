/**
 * Batch Operations Service
 * 
 * Service de gestion des opérations par lots avec:
 * - BatchOperationsManager pour orchestrer les opérations
 * - WorkerPool pour le traitement parallèle
 * 
 * Exigences: 8.1, 8.2, 8.4, 8.6, 8.7, 10.1, 10.6
 */

export { BatchOperationsManager } from './BatchOperationsManager';
export type { BatchOperationOptions } from './BatchOperationsManager';

export { WorkerPool } from './WorkerPool';
export type { WorkerPoolConfig } from './WorkerPool';
