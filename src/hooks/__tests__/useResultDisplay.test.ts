/**
 * Tests for useResultDisplay Hook
 */

import { renderHook, act } from '@testing-library/react';
import { useResultDisplay } from '../useResultDisplay';
import { ResultService, MockResultService } from '../../services/resultService';

// Mock the services
jest.mock('../../services/resultService', () => ({
  ResultService: jest.fn().mockImplementation(() => ({
    fetchResult: jest.fn().mockResolvedValue(null),
    fetchMultipleResults: jest.fn().mockResolvedValue([]),
    fetchProjectResults: jest.fn().mockResolvedValue([]),
    downloadAsset: jest.fn().mockResolvedValue(false),
    downloadAllAssets: jest.fn().mockResolvedValue(false),
    deleteResult: jest.fn().mockResolvedValue(false),
    getPreviewUrl: jest.fn().mockReturnValue(''),
  })),
  MockResultService: jest.fn().mockImplementation(() => ({
    fetchResult: jest.fn().mockResolvedValue(null),
    fetchMultipleResults: jest.fn().mockResolvedValue([]),
    fetchProjectResults: jest.fn().mockResolvedValue([]),
    downloadAsset: jest.fn().mockResolvedValue(false),
    downloadAllAssets: jest.fn().mockResolvedValue(false),
    deleteResult: jest.fn().mockResolvedValue(false),
    getPreviewUrl: jest.fn().mockReturnValue(''),
  })),
}));

describe('useResultDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with real service', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useResultDisplay({ useMock: false }));

      expect(result.current.results.size).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should fetch a result successfully', async () => {
      const mockResult = {
        taskId: 'test-task-id',
        shotId: 'shot-1',
        type: 'grid',
        status: 'success',
        assets: [],
        generatedAt: new Date(),
      };

      (ResultService as jest.Mock).mockImplementationOnce(() => ({
        fetchResult: jest.fn().mockResolvedValue(mockResult),
        fetchMultipleResults: jest.fn().mockResolvedValue([]),
        fetchProjectResults: jest.fn().mockResolvedValue([]),
        downloadAsset: jest.fn().mockResolvedValue(false),
        downloadAllAssets: jest.fn().mockResolvedValue(false),
        deleteResult: jest.fn().mockResolvedValue(false),
        getPreviewUrl: jest.fn().mockReturnValue(''),
      }));

      const { result } = renderHook(() => useResultDisplay({ useMock: false }));

      await act(async () => {
        const fetchedResult = await result.current.fetchResult('test-task-id');
        expect(fetchedResult).toEqual(mockResult);
        expect(result.current.results.size).toBe(1);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle fetch failure', async () => {
      (ResultService as jest.Mock).mockImplementationOnce(() => ({
        fetchResult: jest.fn().mockRejectedValue(new Error('Fetch failed')),
        fetchMultipleResults: jest.fn().mockResolvedValue([]),
        fetchProjectResults: jest.fn().mockResolvedValue([]),
        downloadAsset: jest.fn().mockResolvedValue(false),
        downloadAllAssets: jest.fn().mockResolvedValue(false),
        deleteResult: jest.fn().mockResolvedValue(false),
        getPreviewUrl: jest.fn().mockReturnValue(''),
      }));

      const { result } = renderHook(() => useResultDisplay({ useMock: false }));

      await act(async () => {
        const fetchedResult = await result.current.fetchResult('test-task-id');
        expect(fetchedResult).toBeNull();
        expect(result.current.error).toBe('Fetch failed');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should fetch multiple results successfully', async () => {
      const mockResults = [
        {
          taskId: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'success',
          assets: [],
          generatedAt: new Date(),
        },
        {
          taskId: 'task-2',
          shotId: 'shot-2',
          type: 'promotion',
          status: 'success',
          assets: [],
          generatedAt: new Date(),
        },
      ];

      (ResultService as jest.Mock).mockImplementationOnce(() => ({
        fetchResult: jest.fn().mockResolvedValue(null),
        fetchMultipleResults: jest.fn().mockResolvedValue(mockResults),
        fetchProjectResults: jest.fn().mockResolvedValue([]),
        downloadAsset: jest.fn().mockResolvedValue(false),
        downloadAllAssets: jest.fn().mockResolvedValue(false),
        deleteResult: jest.fn().mockResolvedValue(false),
        getPreviewUrl: jest.fn().mockReturnValue(''),
      }));

      const { result } = renderHook(() => useResultDisplay({ useMock: false }));

      await act(async () => {
        const fetchedResults = await result.current.fetchMultipleResults(['task-1', 'task-2']);
        expect(fetchedResults).toEqual(mockResults);
        expect(result.current.results.size).toBe(2);
      });
    });

    it('should fetch project results successfully', async () => {
      const mockResults = [
        {
          taskId: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'success',
          assets: [],
          generatedAt: new Date(),
        },
      ];

      (ResultService as jest.Mock).mockImplementationOnce(() => ({
        fetchResult: jest.fn().mockResolvedValue(null),
        fetchMultipleResults: jest.fn().mockResolvedValue([]),
        fetchProjectResults: jest.fn().mockResolvedValue(mockResults),
        downloadAsset: jest.fn().mockResolvedValue(false),
        downloadAllAssets: jest.fn().mockResolvedValue(false),
        deleteResult: jest.fn().mockResolvedValue(false),
        getPreviewUrl: jest.fn().mockReturnValue(''),
      }));

      const { result } = renderHook(() => useResultDisplay({ useMock: false }));

      await act(async () => {
        const fetchedResults = await result.current.fetchProjectResults('test-project');
        expect(fetchedResults).toEqual(mockResults);
        expect(result.current.results.size).toBe(1);
      });
    });

    it('should download an asset successfully', async () => {
      (ResultService as jest.Mock).mockImplementationOnce(() => ({
        fetchResult: jest.fn().mockResolvedValue(null),
        fetchMultipleResults: jest.fn().mockResolvedValue([]),
        fetchProjectResults: jest.fn().mockResolvedValue([]),
        downloadAsset: jest.fn().mockResolvedValue(true),
        downloadAllAssets: jest.fn().mockResolvedValue(false),
        deleteResult: jest.fn().mockResolvedValue(false),
        getPreviewUrl: jest.fn().mockReturnValue(''),
      }));

      const { result } = renderHook(() => useResultDisplay({ useMock: false }));

      const asset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://example.com/test.png',
      };

      await act(async () => {
        const success = await result.current.downloadAsset(asset);
        expect(success).toBe(true);
      });
    });

    it('should delete a result successfully', async () => {
      // First, add a result
      const mockResult = {
        taskId: 'test-task-id',
        shotId: 'shot-1',
        type: 'grid',
        status: 'success',
        assets: [],
        generatedAt: new Date(),
      };

      (ResultService as jest.Mock).mockImplementationOnce(() => ({
        fetchResult: jest.fn().mockResolvedValue(mockResult),
        fetchMultipleResults: jest.fn().mockResolvedValue([]),
        fetchProjectResults: jest.fn().mockResolvedValue([]),
        downloadAsset: jest.fn().mockResolvedValue(false),
        downloadAllAssets: jest.fn().mockResolvedValue(false),
        deleteResult: jest.fn().mockResolvedValue(true),
        getPreviewUrl: jest.fn().mockReturnValue(''),
      }));

      const { result } = renderHook(() => useResultDisplay({ useMock: false }));

      await act(async () => {
        await result.current.fetchResult('test-task-id');
        expect(result.current.results.size).toBe(1);

        const success = await result.current.deleteResult('test-task-id');
        expect(success).toBe(true);
        expect(result.current.results.size).toBe(0);
      });
    });

    it('should get preview URL', () => {
      (ResultService as jest.Mock).mockImplementationOnce(() => ({
        fetchResult: jest.fn().mockResolvedValue(null),
        fetchMultipleResults: jest.fn().mockResolvedValue([]),
        fetchProjectResults: jest.fn().mockResolvedValue([]),
        downloadAsset: jest.fn().mockResolvedValue(false),
        downloadAllAssets: jest.fn().mockResolvedValue(false),
        deleteResult: jest.fn().mockResolvedValue(false),
        getPreviewUrl: jest.fn().mockReturnValue('http://example.com/preview.png'),
      }));

      const { result } = renderHook(() => useResultDisplay({ useMock: false }));

      const asset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://example.com/test.png',
        thumbnail: 'http://example.com/thumbnail.png',
      };

      const url = result.current.getPreviewUrl(asset);
      expect(url).toBe('http://example.com/preview.png');
    });

    it('should get result from cache', () => {
      const mockResult = {
        taskId: 'test-task-id',
        shotId: 'shot-1',
        type: 'grid',
        status: 'success',
        assets: [],
        generatedAt: new Date(),
      };

      (ResultService as jest.Mock).mockImplementationOnce(() => ({
        fetchResult: jest.fn().mockResolvedValue(mockResult),
        fetchMultipleResults: jest.fn().mockResolvedValue([]),
        fetchProjectResults: jest.fn().mockResolvedValue([]),
        downloadAsset: jest.fn().mockResolvedValue(false),
        downloadAllAssets: jest.fn().mockResolvedValue(false),
        deleteResult: jest.fn().mockResolvedValue(false),
        getPreviewUrl: jest.fn().mockReturnValue(''),
      }));

      const { result } = renderHook(() => useResultDisplay({ useMock: false }));

      act(() => {
        // Manually add to cache
        result.current.results.set('test-task-id', mockResult);
      });

      const cachedResult = result.current.getResult('test-task-id');
      expect(cachedResult).toEqual(mockResult);
    });

    it('should clear results', () => {
      const { result } = renderHook(() => useResultDisplay({ useMock: false }));

      act(() => {
        // Add some results
        result.current.results.set('task-1', {
          taskId: 'task-1',
          shotId: 'shot-1',
          type: 'grid',
          status: 'success',
          assets: [],
          generatedAt: new Date(),
        });
        result.current.results.set('task-2', {
          taskId: 'task-2',
          shotId: 'shot-2',
          type: 'promotion',
          status: 'success',
          assets: [],
          generatedAt: new Date(),
        });

        expect(result.current.results.size).toBe(2);

        result.current.clearResults();
        expect(result.current.results.size).toBe(0);
      });
    });
  });

  describe('with mock service', () => {
    it('should initialize with mock service', () => {
      const { result } = renderHook(() => useResultDisplay({ useMock: true }));

      expect(result.current.results.size).toBe(0);
      expect(result.current.isLoading).toBe(false);
    });

    it('should fetch a mock result', async () => {
      const mockResult = {
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

      (MockResultService as jest.Mock).mockImplementationOnce(() => ({
        fetchResult: jest.fn().mockResolvedValue(mockResult),
        fetchMultipleResults: jest.fn().mockResolvedValue([]),
        fetchProjectResults: jest.fn().mockResolvedValue([]),
        downloadAsset: jest.fn().mockResolvedValue(false),
        downloadAllAssets: jest.fn().mockResolvedValue(false),
        deleteResult: jest.fn().mockResolvedValue(false),
        getPreviewUrl: jest.fn().mockReturnValue(''),
      }));

      const { result } = renderHook(() => useResultDisplay({ useMock: true }));

      await act(async () => {
        const fetchedResult = await result.current.fetchResult('mock-task-1');
        expect(fetchedResult).toEqual(mockResult);
        expect(result.current.results.size).toBe(1);
      });
    });
  });
});