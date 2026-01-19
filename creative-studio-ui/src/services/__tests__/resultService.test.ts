/**
 * Result Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ResultService,
  MockResultService,
  createResultService,
  type GeneratedResult,
  type GeneratedAsset,
} from '../resultService';

describe('ResultService', () => {
  let service: ResultService;

  beforeEach(() => {
    service = new ResultService('http://localhost:3000');
    global.fetch = vi.fn();
  });

  describe('fetchResult', () => {
    it('should fetch result for a task', async () => {
      const mockResult = {
        taskId: 'task-1',
        shotId: 'shot-1',
        type: 'grid',
        status: 'success',
        assets: [],
        generatedAt: '2024-01-15T10:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await service.fetchResult('task-1');

      expect(result.taskId).toBe('task-1');
      expect(result.status).toBe('success');
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should include query parameters', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ taskId: 'task-1', assets: [] }),
      });

      await service.fetchResult('task-1', {
        includeAssets: false,
        includeThumbnails: false,
        includeMetrics: true,
      });

      const fetchCall = (global.fetch as any).mock.calls[0][0];
      expect(fetchCall).toContain('includeAssets=false');
      expect(fetchCall).toContain('includeThumbnails=false');
      expect(fetchCall).toContain('includeMetrics=true');
    });

    it('should throw error on failed fetch', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(service.fetchResult('task-1')).rejects.toThrow('Failed to fetch result');
    });
  });

  describe('fetchMultipleResults', () => {
    it('should fetch multiple results', async () => {
      const mockResults = [
        { taskId: 'task-1', assets: [], generatedAt: '2024-01-15T10:00:00Z' },
        { taskId: 'task-2', assets: [], generatedAt: '2024-01-15T11:00:00Z' },
      ];

      (global.fetch as any).mockImplementation((url: string) => {
        const taskId = url.includes('task-1') ? 'task-1' : 'task-2';
        const result = mockResults.find((r) => r.taskId === taskId);
        return Promise.resolve({
          ok: true,
          json: async () => result,
        });
      });

      const results = await service.fetchMultipleResults(['task-1', 'task-2']);

      expect(results).toHaveLength(2);
      expect(results[0].taskId).toBe('task-1');
      expect(results[1].taskId).toBe('task-2');
    });
  });

  describe('fetchProjectResults', () => {
    it('should fetch all results for a project', async () => {
      const mockResponse = {
        results: [
          { taskId: 'task-1', assets: [], generatedAt: '2024-01-15T10:00:00Z' },
          { taskId: 'task-2', assets: [], generatedAt: '2024-01-15T11:00:00Z' },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await service.fetchProjectResults('my-project');

      expect(results).toHaveLength(2);
      expect(results[0].taskId).toBe('task-1');
      expect(results[1].taskId).toBe('task-2');
    });
  });

  describe('downloadAsset', () => {
    it('should download an asset', async () => {
      const mockAsset: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://localhost:3000/assets/test.png',
      };

      const mockBlob = new Blob(['test'], { type: 'image/png' });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      // Mock DOM methods
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

      await service.downloadAsset(mockAsset);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('should use custom filename', async () => {
      const mockAsset: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://localhost:3000/assets/test.png',
      };

      const mockBlob = new Blob(['test'], { type: 'image/png' });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => mockBlob,
      });

      const createElementSpy = vi.spyOn(document, 'createElement');
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => null as any);

      await service.downloadAsset(mockAsset, 'custom-name.png');

      const linkElement = createElementSpy.mock.results[0].value as HTMLAnchorElement;
      expect(linkElement.download).toBe('custom-name.png');
    });
  });

  describe('getPreviewUrl', () => {
    it('should return thumbnail if available', () => {
      const asset: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://localhost:3000/assets/test.png',
        thumbnail: 'http://localhost:3000/thumbnails/test.png',
      };

      const previewUrl = service.getPreviewUrl(asset);
      expect(previewUrl).toBe('http://localhost:3000/thumbnails/test.png');
    });

    it('should return asset URL for images without thumbnail', () => {
      const asset: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://localhost:3000/assets/test.png',
      };

      const previewUrl = service.getPreviewUrl(asset);
      expect(previewUrl).toBe('http://localhost:3000/assets/test.png');
    });

    it('should generate thumbnail URL for non-image assets', () => {
      const asset: GeneratedAsset = {
        id: 'asset-1',
        type: 'video',
        name: 'test.mp4',
        url: 'http://localhost:3000/assets/test.mp4',
      };

      const previewUrl = service.getPreviewUrl(asset);
      expect(previewUrl).toContain('/api/assets/asset-1/thumbnail');
    });
  });

  describe('deleteResult', () => {
    it('should delete a result', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await service.deleteResult('task-1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/tasks/task-1/result',
        { method: 'DELETE' }
      );
    });

    it('should throw error on failed delete', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(service.deleteResult('task-1')).rejects.toThrow('Failed to delete result');
    });
  });
});

describe('MockResultService', () => {
  let service: MockResultService;

  beforeEach(() => {
    service = new MockResultService();
  });

  describe('fetchResult', () => {
    it('should return mock result', async () => {
      const result = await service.fetchResult('task-1');

      expect(result.taskId).toBe('task-1');
      expect(result.status).toBe('success');
      expect(result.assets.length).toBeGreaterThan(0);
    });

    it('should return custom mock result', async () => {
      const customResult: GeneratedResult = {
        taskId: 'custom-1',
        shotId: 'shot-1',
        type: 'promotion',
        status: 'success',
        assets: [],
        generatedAt: new Date(),
      };

      service.setMockResult('custom-1', customResult);

      const result = await service.fetchResult('custom-1');
      expect(result.taskId).toBe('custom-1');
      expect(result.type).toBe('promotion');
    });

    it('should respect mock delay', async () => {
      service.setMockDelay(100);

      const start = Date.now();
      await service.fetchResult('task-1');
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('downloadAsset', () => {
    it('should log download', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const asset: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://localhost:3000/assets/test.png',
      };

      await service.downloadAsset(asset);

      expect(consoleSpy).toHaveBeenCalledWith('Mock download: test.png');
    });
  });

  describe('deleteResult', () => {
    it('should remove result from cache', async () => {
      // Fetch to populate cache
      await service.fetchResult('task-1');

      // Delete
      await service.deleteResult('task-1');

      // Fetch again should generate new result
      const result = await service.fetchResult('task-1');
      expect(result.taskId).toBe('task-1');
    });
  });
});

describe('createResultService', () => {
  it('should create MockResultService when useMock is true', () => {
    const service = createResultService(true);
    expect(service).toBeInstanceOf(MockResultService);
  });

  it('should create ResultService when useMock is false', () => {
    const service = createResultService(false);
    expect(service).toBeInstanceOf(ResultService);
    expect(service).not.toBeInstanceOf(MockResultService);
  });
});
