/**
 * useBatchOperationEstimate - Hook pour estimation de temps d'opérations par lots
 * 
 * Fournit des estimations de temps basées sur l'historique:
 * - Calcul du temps estimé pour une opération
 * - Affichage formaté du temps
 * - Mise à jour en temps réel
 * 
 * Exigence: 8.8 - Estimation de temps
 */

import { useState, useEffect, useMemo } from 'react';
import type { BatchOperationType, Shot } from '../types';
import { BatchOperationsManager } from '../services/batchOperations';

/**
 * Résultat de l'estimation
 */
export interface BatchOperationEstimate {
  estimatedTime: number; // en millisecondes
  formattedTime: string; // formaté pour affichage
  confidence: 'low' | 'medium' | 'high'; // confiance dans l'estimation
  basedOnSamples: number; // nombre d'échantillons utilisés
}

/**
 * Options du hook
 */
export interface UseBatchOperationEstimateOptions {
  manager?: BatchOperationsManager;
  autoUpdate?: boolean; // Mettre à jour automatiquement
  updateInterval?: number; // Intervalle de mise à jour (ms)
}

/**
 * Hook pour estimation de temps d'opérations par lots
 * Exigence: 8.8 - Estimation de temps basée sur l'historique
 */
export function useBatchOperationEstimate(
  type: BatchOperationType,
  items: Shot[],
  options: UseBatchOperationEstimateOptions = {}
): BatchOperationEstimate {
  const {
    manager: externalManager,
    autoUpdate = false,
    updateInterval = 5000
  } = options;
  
  // Créer ou utiliser le gestionnaire fourni
  const manager = useMemo(
    () => externalManager || new BatchOperationsManager(),
    [externalManager]
  );
  
  // État de l'estimation
  const [estimate, setEstimate] = useState<BatchOperationEstimate>(() =>
    calculateEstimate(manager, type, items.length)
  );
  
  // Mettre à jour l'estimation
  useEffect(() => {
    const updateEstimate = () => {
      setEstimate(calculateEstimate(manager, type, items.length));
    };
    
    // Mise à jour initiale
    updateEstimate();
    
    // Mise à jour automatique si activée
    if (autoUpdate) {
      const interval = setInterval(updateEstimate, updateInterval);
      return () => clearInterval(interval);
    }
  }, [manager, type, items.length, autoUpdate, updateInterval]);
  
  return estimate;
}

/**
 * Calcule l'estimation pour une opération
 */
function calculateEstimate(
  manager: BatchOperationsManager,
  type: BatchOperationType,
  itemCount: number
): BatchOperationEstimate {
  // Obtenir le temps estimé en millisecondes
  const estimatedTime = manager.estimateTime(type, itemCount);
  
  // Formater le temps
  const formattedTime = formatTime(estimatedTime);
  
  // Déterminer la confiance basée sur l'historique
  const operations = manager.getAllOperations();
  const relevantOps = operations.filter(
    op => op.type === type && op.status === 'completed'
  );
  
  const basedOnSamples = relevantOps.length;
  
  let confidence: 'low' | 'medium' | 'high';
  if (basedOnSamples === 0) {
    confidence = 'low';
  } else if (basedOnSamples < 5) {
    confidence = 'medium';
  } else {
    confidence = 'high';
  }
  
  return {
    estimatedTime,
    formattedTime,
    confidence,
    basedOnSamples
  };
}

/**
 * Formate un temps en millisecondes pour affichage
 */
function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    const seconds = Math.ceil(ms / 1000);
    return `${seconds}s`;
  } else if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.ceil((ms % 60000) / 1000);
    if (seconds === 0) {
      return `${minutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  } else {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Hook simplifié pour obtenir juste le temps formaté
 */
export function useBatchOperationTime(
  type: BatchOperationType,
  items: Shot[],
  options?: UseBatchOperationEstimateOptions
): string {
  const estimate = useBatchOperationEstimate(type, items, options);
  return estimate.formattedTime;
}

/**
 * Hook pour obtenir les estimations de toutes les opérations
 */
export function useAllBatchOperationEstimates(
  items: Shot[],
  options?: UseBatchOperationEstimateOptions
): Record<BatchOperationType, BatchOperationEstimate> {
  const types: BatchOperationType[] = ['duplicate', 'delete', 'export', 'transform', 'tag'];
  
  const estimates = useMemo(() => {
    const manager = options?.manager || new BatchOperationsManager();
    const result: Record<string, BatchOperationEstimate> = {};
    
    for (const type of types) {
      result[type] = calculateEstimate(manager, type, items.length);
    }
    
    return result as Record<BatchOperationType, BatchOperationEstimate>;
  }, [items.length, options?.manager]);
  
  return estimates;
}
