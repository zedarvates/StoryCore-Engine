/**
 * Tests for Result Service
 */

import { ResultService, MockResultService, GeneratedResult, GeneratedAsset } from '../resultService';

describe('ResultService', () => {
  let service: ResultService;

  beforeEach(() => {
    service = new ResultService('http://localhost:3000');
  });

  describe('fetchResult', () => {
    it('should fetch a result successfully', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({
          taskId: 'test-task-id',
          shotId: 'shot-1',
          type: 'grid',
          status: 'success',
          assets: [],
          generatedAt: new Date().toISOString(),
        }),
      });

      const result = await service.fetchResult('test-task-id');
      expect(result).not.toBeNull();
      expect(result?.taskId).toBe('test-task-id');
    });

    it('should return null on fetch failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await service.fetchResult('non-existent-task-id');
      expect(result).toBeNull();
    });
  });

  describe('fetchMultipleResults', () => {
    it('should fetch multiple results successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({
          taskId: 'test-task-id',
          shotId: 'shot-1',
          type: 'grid',
          status: 'success',
          assets: [],
          generatedAt: new Date().toISOString(),
        }),
      });

      const results = await service.fetchMultipleResults(['task-1', 'task-2']);
      expect(results.length).toBe(2);
    });
  });

  describe('fetchProjectResults', () => {
    it('should fetch project results successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({
          results: [
            {
              taskId: 'test-task-id',
              shotId: 'shot-1',
              type: 'grid',
              status: 'success',
              assets: [],
              generatedAt: new Date().toISOString(),
            },
          ],
        }),
      });

      const results = await service.fetchProjectResults('test-project');
      expect(results.length).toBe(1);
    });

    it('should return empty array on fetch failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const results = await service.fetchProjectResults('non-existent-project');
      expect(results).toEqual([]);
    });
  });

  describe('downloadAsset', () => {
    it('should download an asset successfully', async () => {
      // Mock fetch and DOM methods
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: () => new Blob(['test'], { type: 'image/png' }),
      });

      // Mock DOM methods
      const createObjectURLMock = jest.fn().mockReturnValue('blob:url');
      const appendChildMock = jest.fn();
      const removeChildMock = jest.fn();
      const clickMock = jest.fn();
      const revokeObjectURLMock = jest.fn();

      global.URL.createObjectURL = createObjectURLMock;
      document.body.appendChild = appendChildMock;
      document.body.removeChild = removeChildMock;
      HTMLAnchorElement.prototype.click = clickMock;
      global.URL.revokeObjectURL = revokeObjectURLMock;

      const asset: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://example.com/test.png',
      };

      const result = await service.downloadAsset(asset);
      expect(result).toBe(true);
      expect(clickMock).toHaveBeenCalled();
    });

    it('should return false on download failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const asset: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://example.com/test.png',
      };

      const result = await service.downloadAsset(asset);
      expect(result).toBe(false);
    });
  });

  describe('downloadAllAssets', () => {
    it('should download all assets successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        blob: () => new Blob(['test'], { type: 'image/png' }),
      });

      const createObjectURLMock = jest.fn().mockReturnValue('blob:url');
      const clickMock = jest.fn();

      global.URL.createObjectURL = createObjectURLMock;
      HTMLAnchorElement.prototype.click = clickMock;

      const result: GeneratedResult = {
        taskId: 'test-task-id',
        shotId: 'shot-1',
        type: 'grid',
        status: 'success',
        assets: [
          {
            id: 'asset-1',
            type: 'image',
            name: 'test1.png',
            url: 'http://example.com/test1.png',
          },
          {
            id: 'asset-2',
            type: 'image',
            name: 'test2.png',
            url: 'http://example.com/test2.png',
          },
        ],
        generatedAt: new Date(),
      };

      const success = await service.downloadAllAssets(result);
      expect(success).toBe(true);
      expect(clickMock).toHaveBeenCalledTimes(2);
    });

    it('should return false if any download fails', async () => {
      // First call succeeds, second fails
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          blob: () => new Blob(['test'], { type: 'image/png' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

      const result: GeneratedResult = {
        taskId: 'test-task-id',
        shotId: 'shot-1',
        type: 'grid',
        status: 'success',
        assets: [
          {
            id: 'asset-1',
            type: 'image',
            name: 'test1.png',
            url: 'http://example.com/test1.png',
          },
          {
            id: 'asset-2',
            type: 'image',
            name: 'test2.png',
            url: 'http://example.com/test2.png',
          },
        ],
        generatedAt: new Date(),
      };

      const success = await service.downloadAllAssets(result);
      expect(success).toBe(false);
    });
  });

  describe('deleteResult', () => {
    it('should delete a result successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      });

      const result = await service.deleteResult('test-task-id');
      expect(result).toBe(true);
    });

    it('should return false on delete failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await service.deleteResult('test-task-id');
      expect(result).toBe(false);
    });
  });

  describe('getPreviewUrl', () => {
    it('should return thumbnail if available', () => {
      const asset: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://example.com/test.png',
        thumbnail: 'http://example.com/thumbnail.png',
      };

      const url = service.getPreviewUrl(asset);
      expect(url).toBe('http://example.com/thumbnail.png');
    });

    it('should return url if thumbnail not available', () => {
      const asset: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://example.com/test.png',
      };

      const url = service.getPreviewUrl(asset);
      expect(url).toBe('http://example.com/test.png');
    });
  });
});

describe('MockResultService', () => {
  let mockService: MockResultService;

  beforeEach(() => {
    mockService = new MockResultService();
  });

  describe('fetchResult', () => {
    it('should fetch a mock result', async () => {
      const result = await mockService.fetchResult('mock-task-1');
      expect(result).not.toBeNull();
      expect(result?.taskId).toBe('mock-task-1');
      expect(result?.type).toBe('grid');
    });

    it('should return null for non-existent task', async () => {
      const result = await mockService.fetchResult('non-existent-task');
      expect(result).toBeNull();
    });
  });

  describe('fetchMultipleResults', () => {
    it('should fetch multiple mock results', async () => {
      const results = await mockService.fetchMultipleResults(['mock-task-1']);
      expect(results.length).toBe(1);
      expect(results[0].taskId).toBe('mock-task-1');
    });
  });

  describe('fetchProjectResults', () => {
    it('should fetch all mock results', async () => {
      const results = await mockService.fetchProjectResults('test-project');
      expect(results.length).toBe(1);
    });
  });

  describe('downloadAsset', () => {
    it('should log mock download', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      const asset: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://example.com/test.png',
      };

      await mockService.downloadAsset(asset);
      expect(consoleSpy).toHaveBeenCalledWith('Mock download of asset: test.png');
    });
  });

  describe('downloadAllAssets', () => {
    it('should log mock download of all assets', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      const result: GeneratedResult = {
        taskId: 'mock-task-1',
        shotId: 'shot-1',
        type: 'grid',
        status: 'success',
        assets: [
          {
            id: 'asset-1',
            type: 'image',
            name: 'test.png',
            url: 'http://example.com/test.png',
          },
        ],
        generatedAt: new Date(),
      };

      await mockService.downloadAllAssets(result);
      expect(consoleSpy).toHaveBeenCalledWith('Mock download of all assets for result: mock-task-1');
    });
  });

  describe('deleteResult', () => {
    it('should log mock delete', async () => {
      const consoleSpy = jest.spyOn(console, 'log');

      await mockService.deleteResult('mock-task-1');
      expect(consoleSpy).toHaveBeenCalledWith('Mock delete of result: mock-task-1');
    });
  });

  describe('getPreviewUrl', () => {
    it('should return thumbnail if available', () => {
      const asset: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://example.com/test.png',
        thumbnail: 'http://example.com/thumbnail.png',
      };

      const url = mockService.getPreviewUrl(asset);
      expect(url).toBe('http://example.com/thumbnail.png');
    });

    it('should return url if thumbnail not available', () => {
      const asset: GeneratedAsset = {
        id: 'asset-1',
        type: 'image',
        name: 'test.png',
        url: 'http://example.com/test.png',
      };

      const url = mockService.getPreviewUrl(asset);
      expect(url).toBe('http://example.com/test.png');
    });
  });
});

describe('createResultService', () => {
  it('should create a real result service', () => {
    const service = createResultService(false);
    expect(service).toBeInstanceOf(ResultService);
  });

  it('should create a mock result service', () => {
    const service = createResultService(true);
    expect(service).toBeInstanceOf(MockResultService);
  });
});

// Helper function to create the service
function createResultService(useMock: boolean): ResultService | MockResultService {
  return useMock ? new MockResultService() : new ResultService();
}