/**
 * useWorkerPool - Hook React pour utiliser le WorkerPool
 * 
 * Ce hook fournit une interface simple pour exécuter des tâches
 * dans un pool de Web Workers avec gestion automatique du cycle de vie.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WorkerPool } from '../utils/workers/WorkerPool';

export interface WorkerPoolStats {
  queueSize: number;
  availableWorkers: number;
  busyWorkers: number;
  totalWorkers: number;
}

export interface UseWorkerPoolOptions {
  poolSize?: number;
  workerUrl?: string;
}

export interface UseWorkerPoolReturn {
  execute: <T, R>(type: string, data: T, priority?: number) => Promise<R>;
  cancel: (taskId: string) => boolean;
  cancelAll: () => void;
  stats: WorkerPoolStats;
  isReady: boolean;
}

/**
 * Hook pour utiliser un pool de Web Workers
 * 
 * @param options - Options de configuration du pool
 * @returns Interface pour exécuter des tâches et gérer le pool
 * 
 * @example
 * ```tsx
 * const { execute, stats, cancelAll } = useWorkerPool({ poolSize: 4 });
 * 
 * const handleGenerateThumbnail = async () => {
 *   try {
 *     const blob = await execute('generateThumbnail', {
 *       videoUrl: 'video.mp4',
 *       time: 5.0
 *     });
 *     // Utiliser le blob
 *   } catch (error) {
 *     console.error('Failed to generate thumbnail:', error);
 *   }
 * };
 * ```
 */
export function useWorkerPool(options: UseWorkerPoolOptions = {}): UseWorkerPoolReturn {
  const poolRef = useRef<WorkerPool | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [stats, setStats] = useState<WorkerPoolStats>({
    queueSize: 0,
    availableWorkers: 0,
    busyWorkers: 0,
    totalWorkers: 0
  });

  // Initialiser le pool
  useEffect(() => {
    const pool = new WorkerPool(options.poolSize, options.workerUrl);
    poolRef.current = pool;
    setIsReady(true);

    // Mettre à jour les stats initiales
    updateStats();

    // Nettoyer à la destruction
    return () => {
      if (poolRef.current) {
        poolRef.current.terminate();
        poolRef.current = null;
      }
      setIsReady(false);
    };
  }, [options.poolSize, options.workerUrl]);

  // Mettre à jour les statistiques
  const updateStats = useCallback(() => {
    if (poolRef.current) {
      setStats({
        queueSize: poolRef.current.getQueueSize(),
        availableWorkers: poolRef.current.getAvailableWorkers(),
        busyWorkers: poolRef.current.getBusyWorkers(),
        totalWorkers: poolRef.current.size
      });
    }
  }, []);

  // Exécuter une tâche
  const execute = useCallback(async <T, R>(
    type: string,
    data: T,
    priority: number = 0
  ): Promise<R> => {
    if (!poolRef.current) {
      throw new Error('WorkerPool not initialized');
    }

    updateStats();

    try {
      const result = await poolRef.current.execute<T, R>(type, data, priority);
      updateStats();
      return result;
    } catch (error) {
      updateStats();
      throw error;
    }
  }, [updateStats]);

  // Annuler une tâche spécifique
  const cancel = useCallback((taskId: string): boolean => {
    if (!poolRef.current) {
      return false;
    }

    const result = poolRef.current.cancel(taskId);
    updateStats();
    return result;
  }, [updateStats]);

  // Annuler toutes les tâches
  const cancelAll = useCallback(() => {
    if (poolRef.current) {
      poolRef.current.cancelAll();
      updateStats();
    }
  }, [updateStats]);

  return {
    execute,
    cancel,
    cancelAll,
    stats,
    isReady
  };
}

/**
 * Hook pour exécuter une tâche unique dans un worker
 * 
 * @param type - Type de tâche à exécuter
 * @param data - Données à traiter
 * @param options - Options d'exécution
 * @returns État de l'exécution et résultat
 * 
 * @example
 * ```tsx
 * const { result, loading, error } = useWorkerTask('generateThumbnail', {
 *   videoUrl: 'video.mp4',
 *   time: 5.0
 * });
 * ```
 */
export function useWorkerTask<T, R>(
  type: string,
  data: T,
  options: { enabled?: boolean; priority?: number } = {}
) {
  const { enabled = true, priority = 0 } = options;
  const { execute } = useWorkerPool();
  const [result, setResult] = useState<R | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const runTask = async () => {
      setLoading(true);
      setError(null);

      try {
        const taskResult = await execute<T, R>(type, data, priority);
        if (!cancelled) {
          setResult(taskResult);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    runTask();

    return () => {
      cancelled = true;
    };
  }, [type, JSON.stringify(data), enabled, priority, execute]);

  return { result, loading, error };
}
