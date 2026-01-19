/**
 * useResultDisplay Hook Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useResultDisplay } from '../useResultDisplay';
import { useAppStore } from '@/stores/useAppStore';
import type { GeneratedResult, GeneratedAsset } from '@/services/resultService';

// Mock the store
vi.mock('@/stores/useAppStore');

// Mock the service
vi.mock('@/services/resultService', () => ({
  createResultService: vi.fn(() => ({
    fetchResult: vi.fn(),
    fetchMultipleResults: vi.fn(),
    fetchProjectResults: vi.fn(),
    downloadAsset: vi.fn(),
    downloadAllAssets: vi.fn(),
    deleteResult: vi.fn(),
    getPreviewUrl: vi.fn((asset: GeneratedAsset) => asset.url),
  })),
  ResultService: vi.fn(),
  MockResultService: vi.fn(),
}));

describe('useResultDisplay', () => {
  const mockResult: GeneratedResult = {
    taskId: 'task-1',
    shotId: 'shot-1',
    type: 'grid',
    status: 'success',
    assets: [
      {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://localhost:3000/assets/test.png',
      },
    ],
    generatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock store state
    (useAppStore as any).mockImplementation((selector: any) => {
      const state = {
        taskQueue: [],
        project: { project_name: 'test-project' },
      };
      return selector(state);
    });
  });

  describe('initialization', () => {
    it('should initialize with empty results', () => {
      const { result } = renderHook(() => useResultDisplay({ autoFetch: false }));

      expect(result.current.results.size).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should create service with useMock option', () => {
      const { createResultService } = require('@/services/resultService');
      
      renderHook(() => useResultDisplay({ useMock: true, autoFetch: false }));

      expect(createResultService).toHaveBeenCalledWith(true);
    });
  });

  describe('fetchResult', () => {
    it('should fetch result for a task', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      mockService.fetchResult.mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useResultDisplay({ autoFetch: false }));

      let fetchedResult: GeneratedResult | null = null;
      await act(async () => {
        fetchedResult = await result.current.fetchResult('task-1');
      });

      expect(fetchedResult).toEqual(mockResult);
      expect(result.current.results.get('task-1')).toEqual(mockResult);
    });

    it('should set loading state during fetch', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      
      let resolvePromise: (value: GeneratedResult) => void;
      const promise = new Promise<GeneratedResult>((resolve) => {
        resolvePromise = resolve;
      });
      mockService.fetchResult.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useResultDisplay({ autoFetch: false }));

      act(() => {
        result.current.fetchResult('task-1');
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      await act(async () => {
        resolvePromise!(mockResult);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle fetch error', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      mockService.fetchResult.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useResultDisplay({ autoFetch: false }));

      await act(async () => {
        await result.current.fetchResult('task-1');
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should call onResultFetched callback', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      mockService.fetchResult.mockResolvedValueOnce(mockResult);

      const onResultFetched = vi.fn();
      const { result } = renderHook(() =>
        useResultDisplay({ autoFetch: false, onResultFetched })
      );

      await act(async () => {
        await result.current.fetchResult('task-1');
      });

      expect(onResultFetched).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('fetchMultipleResults', () => {
    it('should fetch multiple results', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      
      const results = [
        { ...mockResult, taskId: 'task-1' },
        { ...mockResult, taskId: 'task-2' },
      ];
      mockService.fetchMultipleResults.mockResolvedValueOnce(results);

      const { result } = renderHook(() => useResultDisplay({ autoFetch: false }));

      let fetchedResults: GeneratedResult[] = [];
      await act(async () => {
        fetchedResults = await result.current.fetchMultipleResults(['task-1', 'task-2']);
      });

      expect(fetchedResults).toHaveLength(2);
      expect(result.current.results.size).toBe(2);
    });
  });

  describe('fetchProjectResults', () => {
    it('should fetch all results for project', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      
      const results = [mockResult];
      mockService.fetchProjectResults.mockResolvedValueOnce(results);

      const { result } = renderHook(() => useResultDisplay({ autoFetch: false }));

      let fetchedResults: GeneratedResult[] = [];
      await act(async () => {
        fetchedResults = await result.current.fetchProjectResults();
      });

      expect(fetchedResults).toHaveLength(1);
      expect(mockService.fetchProjectResults).toHaveBeenCalledWith(
        'test-project',
        expect.any(Object)
      );
    });
  });

  describe('downloadAsset', () => {
    it('should download an asset', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      mockService.downloadAsset.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useResultDisplay({ autoFetch: false }));

      const asset = mockResult.assets[0];
      await act(async () => {
        await result.current.downloadAsset(asset);
      });

      expect(mockService.downloadAsset).toHaveBeenCalledWith(asset, undefined);
    });

    it('should call onDownloadComplete callback', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      mockService.downloadAsset.mockResolvedValueOnce(undefined);

      const onDownloadComplete = vi.fn();
      const { result } = renderHook(() =>
        useResultDisplay({ autoFetch: false, onDownloadComplete })
      );

      const asset = mockResult.assets[0];
      await act(async () => {
        await result.current.downloadAsset(asset);
      });

      expect(onDownloadComplete).toHaveBeenCalledWith(asset);
    });
  });

  describe('downloadAllAssets', () => {
    it('should download all assets from result', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      mockService.downloadAllAssets.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useResultDisplay({ autoFetch: false }));

      await act(async () => {
        await result.current.downloadAllAssets(mockResult);
      });

      expect(mockService.downloadAllAssets).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('deleteResult', () => {
    it('should delete a result', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      mockService.fetchResult.mockResolvedValueOnce(mockResult);
      mockService.deleteResult.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useResultDisplay({ autoFetch: false }));

      // First fetch to populate cache
      await act(async () => {
        await result.current.fetchResult('task-1');
      });

      expect(result.current.results.has('task-1')).toBe(true);

      // Then delete
      await act(async () => {
        await result.current.deleteResult('task-1');
      });

      expect(result.current.results.has('task-1')).toBe(false);
    });
  });

  describe('getResult', () => {
    it('should get result from cache', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      mockService.fetchResult.mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useResultDisplay({ autoFetch: false }));

      await act(async () => {
        await result.current.fetchResult('task-1');
      });

      const cachedResult = result.current.getResult('task-1');
      expect(cachedResult).toEqual(mockResult);
    });

    it('should return undefined for non-existent result', () => {
      const { result } = renderHook(() => useResultDisplay({ autoFetch: false }));

      const cachedResult = result.current.getResult('non-existent');
      expect(cachedResult).toBeUndefined();
    });
  });

  describe('clearResults', () => {
    it('should clear all cached results', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      mockService.fetchResult.mockResolvedValueOnce(mockResult);

      const { result } = renderHook(() => useResultDisplay({ autoFetch: false }));

      await act(async () => {
        await result.current.fetchResult('task-1');
      });

      expect(result.current.results.size).toBe(1);

      act(() => {
        result.current.clearResults();
      });

      expect(result.current.results.size).toBe(0);
    });
  });

  describe('autoFetch', () => {
    it('should auto-fetch results for completed tasks', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      mockService.fetchMultipleResults.mockResolvedValueOnce([mockResult]);

      // Mock store with completed tasks
      (useAppStore as any).mockImplementation((selector: any) => {
        const state = {
          taskQueue: [
            { id: 'task-1', status: 'completed' },
            { id: 'task-2', status: 'pending' },
          ],
          project: { project_name: 'test-project' },
        };
        return selector(state);
      });

      renderHook(() => useResultDisplay({ autoFetch: true }));

      await waitFor(() => {
        expect(mockService.fetchMultipleResults).toHaveBeenCalledWith(['task-1']);
      });
    });

    it('should not auto-fetch when disabled', () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();

      (useAppStore as any).mockImplementation((selector: any) => {
        const state = {
          taskQueue: [{ id: 'task-1', status: 'completed' }],
          project: { project_name: 'test-project' },
        };
        return selector(state);
      });

      renderHook(() => useResultDisplay({ autoFetch: false }));

      expect(mockService.fetchMultipleResults).not.toHaveBeenCalled();
    });
  });

  describe('getPreviewUrl', () => {
    it('should get preview URL for asset', () => {
      const { result } = renderHook(() => useResultDisplay({ autoFetch: false }));

      const asset = mockResult.assets[0];
      const previewUrl = result.current.getPreviewUrl(asset);

      expect(previewUrl).toBe(asset.url);
    });
  });

  describe('error handling', () => {
    it('should call onError callback on fetch error', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      mockService.fetchResult.mockRejectedValueOnce(new Error('Network error'));

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useResultDisplay({ autoFetch: false, onError })
      );

      await act(async () => {
        await result.current.fetchResult('task-1');
      });

      expect(onError).toHaveBeenCalledWith('Network error');
    });

    it('should call onError callback on download error', async () => {
      const { createResultService } = require('@/services/resultService');
      const mockService = createResultService();
      mockService.downloadAsset.mockRejectedValueOnce(new Error('Download failed'));

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useResultDisplay({ autoFetch: false, onError })
      );

      const asset = mockResult.assets[0];
      await act(async () => {
        await result.current.downloadAsset(asset);
      });

      expect(onError).toHaveBeenCalledWith('Download failed');
    });
  });
});
