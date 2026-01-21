/**
 * React Hook for Result Display
 * Provides easy integration with the result service
 */

import { useState, useEffect, useCallback } from 'react';
import { ResultService, GeneratedResult, GeneratedAsset, ResultFetchOptions } from '../services/resultService';

interface ResultDisplayOptions {
  autoFetch?: boolean;
  useMock?: boolean;
  fetchOptions?: ResultFetchOptions;
  onResultFetched?: (result: GeneratedResult) => void;
  onDownloadComplete?: (asset: GeneratedAsset) => void;
  onError?: (error: string) => void;
}

export function useResultDisplay(options: ResultDisplayOptions = {}) {
  const { autoFetch = true, useMock = false, fetchOptions = {} } = options;
  const [results, setResults] = useState<Map<string, GeneratedResult>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const service = useMock ? new MockResultService() : new ResultService();

  const fetchResult = useCallback(async (taskId: string): Promise<GeneratedResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await service.fetchResult(taskId, fetchOptions);
      if (result) {
        setResults((prev) => new Map(prev).set(result.taskId, result));
        if (options.onResultFetched) {
          options.onResultFetched(result);
        }
        return result;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      if (options.onError) {
        options.onError(err instanceof Error ? err.message : 'Unknown error');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service, fetchOptions, options]);

  const fetchMultipleResults = useCallback(async (taskIds: string[]): Promise<GeneratedResult[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedResults = await service.fetchMultipleResults(taskIds, fetchOptions);
      const newResults = new Map(results);
      fetchedResults.forEach((result) => newResults.set(result.taskId, result));
      setResults(newResults);
      return fetchedResults;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      if (options.onError) {
        options.onError(err instanceof Error ? err.message : 'Unknown error');
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [service, fetchOptions, results, options]);

  const fetchProjectResults = useCallback(async (projectName: string): Promise<GeneratedResult[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedResults = await service.fetchProjectResults(projectName, fetchOptions);
      const newResults = new Map(results);
      fetchedResults.forEach((result) => newResults.set(result.taskId, result));
      setResults(newResults);
      return fetchedResults;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      if (options.onError) {
        options.onError(err instanceof Error ? err.message : 'Unknown error');
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [service, fetchOptions, results, options]);

  const downloadAsset = useCallback(async (asset: GeneratedAsset, filename?: string): Promise<boolean> => {
    try {
      const success = await service.downloadAsset(asset, filename);
      if (success && options.onDownloadComplete) {
        options.onDownloadComplete(asset);
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      if (options.onError) {
        options.onError(err instanceof Error ? err.message : 'Unknown error');
      }
      return false;
    }
  }, [service, options]);

  const downloadAllAssets = useCallback(async (result: GeneratedResult): Promise<boolean> => {
    try {
      return await service.downloadAllAssets(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      if (options.onError) {
        options.onError(err instanceof Error ? err.message : 'Unknown error');
      }
      return false;
    }
  }, [service, options]);

  const deleteResult = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const success = await service.deleteResult(taskId);
      if (success) {
        setResults((prev) => {
          const newResults = new Map(prev);
          newResults.delete(taskId);
          return newResults;
        });
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      if (options.onError) {
        options.onError(err instanceof Error ? err.message : 'Unknown error');
      }
      return false;
    }
  }, [service, options]);

  const getPreviewUrl = useCallback((asset: GeneratedAsset): string => {
    return service.getPreviewUrl(asset);
  }, [service]);

  const getResult = useCallback((taskId: string): GeneratedResult | undefined => {
    return results.get(taskId);
  }, [results]);

  const clearResults = useCallback(() => {
    setResults(new Map());
  }, []);

  return {
    fetchResult,
    fetchMultipleResults,
    fetchProjectResults,
    downloadAsset,
    downloadAllAssets,
    deleteResult,
    getPreviewUrl,
    getResult,
    results,
    isLoading,
    error,
    clearResults,
  };
}

// Mock service for testing
class MockResultService {
  private mockResults: Map<string, GeneratedResult> = new Map();

  constructor() {
    this.initializeMockResults();
  }

  private initializeMockResults(): void {
    const mockResult: GeneratedResult = {
      taskId: 'mock-task-1',
      shotId: 'shot-1',
      type: 'grid',
      status: 'success',
      assets: [
        {
          id: 'asset-1',
          type: 'image',
          name: 'grid_output.png',
          url: 'https://via.placeholder.com/800x600',
          thumbnail: 'https://via.placeholder.com/200x150',
          size: 1024,
          format: 'png',
          dimensions: { width: 800, height: 600 },
        },
      ],
      generatedAt: new Date(),
      processingTime: 120,
      qualityScore: 95,
      metrics: { resolution: 800, fps: 30 },
    };

    this.mockResults.set('mock-task-1', mockResult);
  }

  async fetchResult(taskId: string): Promise<GeneratedResult | null> {
    return this.mockResults.get(taskId) || null;
  }

  async fetchMultipleResults(taskIds: string[]): Promise<GeneratedResult[]> {
    return taskIds.map((taskId) => this.mockResults.get(taskId)).filter((result): result is GeneratedResult => result !== null);
  }

  async fetchProjectResults(projectName: string): Promise<GeneratedResult[]> {
    return Array.from(this.mockResults.values());
  }

  async downloadAsset(asset: GeneratedAsset, filename?: string): Promise<boolean> {
    console.log(`Mock download of asset: ${asset.name}`);
    return true;
  }

  async downloadAllAssets(result: GeneratedResult): Promise<boolean> {
    console.log(`Mock download of all assets for result: ${result.taskId}`);
    return true;
  }

  async deleteResult(taskId: string): Promise<boolean> {
    console.log(`Mock delete of result: ${taskId}`);
    return true;
  }

  getPreviewUrl(asset: GeneratedAsset): string {
    return asset.thumbnail || asset.url;
  }
}