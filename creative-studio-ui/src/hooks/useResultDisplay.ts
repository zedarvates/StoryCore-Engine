/**
 * useResultDisplay Hook
 * 
 * React hook for managing and displaying generated results.
 * Provides result fetching, caching, and download functionality.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';
import {
  ResultService,
  createResultService,
  type GeneratedResult,
  type GeneratedAsset,
  type ResultFetchOptions,
} from '../services/resultService';

export interface UseResultDisplayOptions {
  /**
   * Auto-fetch results for completed tasks
   * @default true
   */
  autoFetch?: boolean;

  /**
   * Use mock service for development/testing
   * @default false
   */
  useMock?: boolean;

  /**
   * Result fetch options
   */
  fetchOptions?: ResultFetchOptions;

  /**
   * Callback when result is fetched
   */
  onResultFetched?: (result: GeneratedResult) => void;

  /**
   * Callback when download completes
   */
  onDownloadComplete?: (asset: GeneratedAsset) => void;

  /**
   * Callback when error occurs
   */
  onError?: (error: string) => void;
}

export interface UseResultDisplayReturn {
  /**
   * Fetch result for a task
   */
  fetchResult: (taskId: string) => Promise<GeneratedResult | null>;

  /**
   * Fetch results for multiple tasks
   */
  fetchMultipleResults: (taskIds: string[]) => Promise<GeneratedResult[]>;

  /**
   * Fetch all results for current project
   */
  fetchProjectResults: () => Promise<GeneratedResult[]>;

  /**
   * Download an asset
   */
  downloadAsset: (asset: GeneratedAsset, filename?: string) => Promise<void>;

  /**
   * Download all assets from a result
   */
  downloadAllAssets: (result: GeneratedResult) => Promise<void>;

  /**
   * Delete a result
   */
  deleteResult: (taskId: string) => Promise<void>;

  /**
   * Get preview URL for an asset
   */
  getPreviewUrl: (asset: GeneratedAsset) => string;

  /**
   * All fetched results (cached)
   */
  results: Map<string, GeneratedResult>;

  /**
   * Get result for a specific task
   */
  getResult: (taskId: string) => GeneratedResult | undefined;

  /**
   * Loading state
   */
  isLoading: boolean;

  /**
   * Error state
   */
  error: string | null;

  /**
   * Clear all cached results
   */
  clearResults: () => void;
}

export function useResultDisplay(
  options: UseResultDisplayOptions = {}
): UseResultDisplayReturn {
  const {
    autoFetch = true,
    useMock = false,
    fetchOptions = {},
    onResultFetched,
    onDownloadComplete,
    onError,
  } = options;

  // Store references
  const taskQueue = useAppStore((state) => state.taskQueue);
  const project = useAppStore((state) => state.project);

  // Service instance
  const serviceRef = useRef<ResultService | null>(null);

  // State
  const [results, setResults] = useState<Map<string, GeneratedResult>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize service
  useEffect(() => {
    serviceRef.current = createResultService(useMock);
  }, [useMock]);

  /**
   * Fetch result for a task
   */
  const fetchResult = useCallback(
    async (taskId: string): Promise<GeneratedResult | null> => {
      if (!serviceRef.current) return null;

      setIsLoading(true);
      setError(null);

      try {
        const result = await serviceRef.current.fetchResult(taskId, fetchOptions);
        
        // Update cache
        setResults((prev) => new Map(prev).set(taskId, result));

        // Notify callback
        if (onResultFetched) {
          onResultFetched(result);
        }

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch result';
        setError(errorMessage);
        
        if (onError) {
          onError(errorMessage);
        }

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchOptions, onResultFetched, onError]
  );

  /**
   * Fetch results for multiple tasks
   */
  const fetchMultipleResults = useCallback(
    async (taskIds: string[]): Promise<GeneratedResult[]> => {
      if (!serviceRef.current) return [];

      setIsLoading(true);
      setError(null);

      try {
        const fetchedResults = await serviceRef.current.fetchMultipleResults(taskIds, fetchOptions);
        
        // Update cache
        setResults((prev) => {
          const newMap = new Map(prev);
          fetchedResults.forEach((result) => {
            newMap.set(result.taskId, result);
          });
          return newMap;
        });

        // Notify callbacks
        if (onResultFetched) {
          fetchedResults.forEach((result) => onResultFetched(result));
        }

        return fetchedResults;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch results';
        setError(errorMessage);
        
        if (onError) {
          onError(errorMessage);
        }

        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [fetchOptions, onResultFetched, onError]
  );

  /**
   * Fetch all results for current project
   */
  const fetchProjectResults = useCallback(async (): Promise<GeneratedResult[]> => {
    if (!serviceRef.current || !project) return [];

    setIsLoading(true);
    setError(null);

    try {
      const fetchedResults = await serviceRef.current.fetchProjectResults(
        project.project_name,
        fetchOptions
      );
      
      // Update cache
      setResults((prev) => {
        const newMap = new Map(prev);
        fetchedResults.forEach((result) => {
          newMap.set(result.taskId, result);
        });
        return newMap;
      });

      // Notify callbacks
      if (onResultFetched) {
        fetchedResults.forEach((result) => onResultFetched(result));
      }

      return fetchedResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project results';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }

      return [];
    } finally {
      setIsLoading(false);
    }
  }, [project, fetchOptions, onResultFetched, onError]);

  /**
   * Download an asset
   */
  const downloadAsset = useCallback(
    async (asset: GeneratedAsset, filename?: string): Promise<void> => {
      if (!serviceRef.current) return;

      setError(null);

      try {
        await serviceRef.current.downloadAsset(asset, filename);
        
        if (onDownloadComplete) {
          onDownloadComplete(asset);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to download asset';
        setError(errorMessage);
        
        if (onError) {
          onError(errorMessage);
        }
      }
    },
    [onDownloadComplete, onError]
  );

  /**
   * Download all assets from a result
   */
  const downloadAllAssets = useCallback(
    async (result: GeneratedResult): Promise<void> => {
      if (!serviceRef.current) return;

      setError(null);

      try {
        await serviceRef.current.downloadAllAssets(result);
        
        if (onDownloadComplete) {
          result.assets.forEach((asset) => onDownloadComplete(asset));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to download assets';
        setError(errorMessage);
        
        if (onError) {
          onError(errorMessage);
        }
      }
    },
    [onDownloadComplete, onError]
  );

  /**
   * Delete a result
   */
  const deleteResult = useCallback(
    async (taskId: string): Promise<void> => {
      if (!serviceRef.current) return;

      setError(null);

      try {
        await serviceRef.current.deleteResult(taskId);
        
        // Remove from cache
        setResults((prev) => {
          const newMap = new Map(prev);
          newMap.delete(taskId);
          return newMap;
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete result';
        setError(errorMessage);
        
        if (onError) {
          onError(errorMessage);
        }
      }
    },
    [onError]
  );

  /**
   * Get preview URL for an asset
   */
  const getPreviewUrl = useCallback((asset: GeneratedAsset): string => {
    if (!serviceRef.current) return '';
    return serviceRef.current.getPreviewUrl(asset);
  }, []);

  /**
   * Get result for a specific task
   */
  const getResult = useCallback(
    (taskId: string): GeneratedResult | undefined => {
      return results.get(taskId);
    },
    [results]
  );

  /**
   * Clear all cached results
   */
  const clearResults = useCallback(() => {
    setResults(new Map());
    setError(null);
  }, []);

  // Auto-fetch results for completed tasks
  useEffect(() => {
    if (!autoFetch) return;

    const completedTasks = taskQueue.filter((task) => task.status === 'completed');
    const tasksToFetch = completedTasks.filter((task) => !results.has(task.id));

    if (tasksToFetch.length > 0) {
      const taskIds = tasksToFetch.map((task) => task.id);
      fetchMultipleResults(taskIds);
    }
  }, [taskQueue, autoFetch, results, fetchMultipleResults]);

  return {
    fetchResult,
    fetchMultipleResults,
    fetchProjectResults,
    downloadAsset,
    downloadAllAssets,
    deleteResult,
    getPreviewUrl,
    results,
    getResult,
    isLoading,
    error,
    clearResults,
  };
}
