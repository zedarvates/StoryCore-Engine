/**
 * AssetManagementService Tests
 * 
 * Tests for asset management functionality including:
 * - Asset saving and organization
 * - Metadata storage and retrieval
 * - Asset association graph operations
 * 
 * Requirements: 9.1, 9.2, 9.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { assetManagementService, AssetManagementService } from '../AssetManagementService';
import type { GeneratedAsset, AssetMetadata } from '../../types/generation';

describe('AssetManagementService', () => {
  // Helper function to create mock asset
  const createMockAsset = (
    type: GeneratedAsset['type'] = 'image',
    overrides: Partial<GeneratedAsset> = {}
  ): GeneratedAsset => ({
    id: crypto.randomUUID(),
    type,
    url: `data:${type}/mock;base64,mockdata`,
    metadata: {
      generationParams: { prompt: 'test prompt' },
      fileSize: 1024,
      dimensions: { width: 512, height: 512 },
      format: type === 'image' ? 'png' : type === 'video' ? 'mp4' : 'wav',
    },
    relatedAssets: [],
    timestamp: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    // Clear the asset graph before each test
    assetManagementService.clearGraph();
  });

  // ============================================================================
  // Asset Graph Management Tests
  // ============================================================================

  describe('Asset Graph Management', () => {
    it('should add asset to graph', () => {
      const asset = createMockAsset('image');
      
      assetManagementService.addAssetToGraph(asset);
      
      const retrieved = assetManagementService.getAsset(asset.id);
      expect(retrieved).toEqual(asset);
    });

    it('should remove asset from graph', () => {
      const asset = createMockAsset('image');
      
      assetManagementService.addAssetToGraph(asset);
      assetManagementService.removeAssetFromGraph(asset.id);
      
      const retrieved = assetManagementService.getAsset(asset.id);
      expect(retrieved).toBeUndefined();
    });

    it('should get all assets from graph', () => {
      const asset1 = createMockAsset('image');
      const asset2 = createMockAsset('video');
      const asset3 = createMockAsset('audio');
      
      assetManagementService.addAssetToGraph(asset1);
      assetManagementService.addAssetToGraph(asset2);
      assetManagementService.addAssetToGraph(asset3);
      
      const allAssets = assetManagementService.getAllAssets();
      expect(allAssets).toHaveLength(3);
      expect(allAssets).toContainEqual(asset1);
      expect(allAssets).toContainEqual(asset2);
      expect(allAssets).toContainEqual(asset3);
    });

    it('should clear all assets from graph', () => {
      const asset1 = createMockAsset('image');
      const asset2 = createMockAsset('video');
      
      assetManagementService.addAssetToGraph(asset1);
      assetManagementService.addAssetToGraph(asset2);
      
      assetManagementService.clearGraph();
      
      const allAssets = assetManagementService.getAllAssets();
      expect(allAssets).toHaveLength(0);
    });
  });

  // ============================================================================
  // Asset Association Tests (Requirements: 9.5)
  // ============================================================================

  describe('Asset Association Graph', () => {
    it('should link two assets', () => {
      const sourceAsset = createMockAsset('image');
      const targetAsset = createMockAsset('video');
      
      assetManagementService.addAssetToGraph(sourceAsset);
      assetManagementService.addAssetToGraph(targetAsset);
      
      assetManagementService.linkAssets(sourceAsset.id, targetAsset.id);
      
      const relatedAssets = assetManagementService.getRelatedAssets(sourceAsset.id);
      expect(relatedAssets).toHaveLength(1);
      expect(relatedAssets[0]).toEqual(targetAsset);
    });

    it('should not duplicate links', () => {
      const sourceAsset = createMockAsset('image');
      const targetAsset = createMockAsset('video');
      
      assetManagementService.addAssetToGraph(sourceAsset);
      assetManagementService.addAssetToGraph(targetAsset);
      
      // Link twice
      assetManagementService.linkAssets(sourceAsset.id, targetAsset.id);
      assetManagementService.linkAssets(sourceAsset.id, targetAsset.id);
      
      const relatedAssets = assetManagementService.getRelatedAssets(sourceAsset.id);
      expect(relatedAssets).toHaveLength(1);
    });

    it('should link multiple assets in a chain', () => {
      const promptAsset = createMockAsset('prompt');
      const imageAsset = createMockAsset('image');
      const videoAsset = createMockAsset('video');
      const audioAsset = createMockAsset('audio');
      
      assetManagementService.addAssetToGraph(promptAsset);
      assetManagementService.addAssetToGraph(imageAsset);
      assetManagementService.addAssetToGraph(videoAsset);
      assetManagementService.addAssetToGraph(audioAsset);
      
      // Create pipeline chain: prompt → image → video → audio
      assetManagementService.linkAssets(promptAsset.id, imageAsset.id);
      assetManagementService.linkAssets(imageAsset.id, videoAsset.id);
      assetManagementService.linkAssets(videoAsset.id, audioAsset.id);
      
      // Verify chain
      const promptRelated = assetManagementService.getRelatedAssets(promptAsset.id);
      expect(promptRelated).toHaveLength(1);
      expect(promptRelated[0].id).toBe(imageAsset.id);
      
      const imageRelated = assetManagementService.getRelatedAssets(imageAsset.id);
      expect(imageRelated).toHaveLength(1);
      expect(imageRelated[0].id).toBe(videoAsset.id);
      
      const videoRelated = assetManagementService.getRelatedAssets(videoAsset.id);
      expect(videoRelated).toHaveLength(1);
      expect(videoRelated[0].id).toBe(audioAsset.id);
    });

    it('should return empty array for asset with no related assets', () => {
      const asset = createMockAsset('image');
      
      assetManagementService.addAssetToGraph(asset);
      
      const relatedAssets = assetManagementService.getRelatedAssets(asset.id);
      expect(relatedAssets).toHaveLength(0);
    });

    it('should remove asset from other assets edges when removed', () => {
      const sourceAsset = createMockAsset('image');
      const targetAsset = createMockAsset('video');
      
      assetManagementService.addAssetToGraph(sourceAsset);
      assetManagementService.addAssetToGraph(targetAsset);
      
      assetManagementService.linkAssets(sourceAsset.id, targetAsset.id);
      assetManagementService.removeAssetFromGraph(targetAsset.id);
      
      const relatedAssets = assetManagementService.getRelatedAssets(sourceAsset.id);
      expect(relatedAssets).toHaveLength(0);
    });

    it('should update source asset relatedAssets array when linking', () => {
      const sourceAsset = createMockAsset('image');
      const targetAsset = createMockAsset('video');
      
      assetManagementService.addAssetToGraph(sourceAsset);
      assetManagementService.addAssetToGraph(targetAsset);
      
      assetManagementService.linkAssets(sourceAsset.id, targetAsset.id);
      
      const retrievedSource = assetManagementService.getAsset(sourceAsset.id);
      expect(retrievedSource?.relatedAssets).toContain(targetAsset.id);
    });
  });

  // ============================================================================
  // Asset Query Tests
  // ============================================================================

  describe('Asset Querying', () => {
    it('should query assets by type', () => {
      const imageAsset1 = createMockAsset('image');
      const imageAsset2 = createMockAsset('image');
      const videoAsset = createMockAsset('video');
      
      assetManagementService.addAssetToGraph(imageAsset1);
      assetManagementService.addAssetToGraph(imageAsset2);
      assetManagementService.addAssetToGraph(videoAsset);
      
      const imageAssets = assetManagementService.queryAssets({ type: 'image' });
      expect(imageAssets).toHaveLength(2);
      expect(imageAssets.every(a => a.type === 'image')).toBe(true);
    });

    it('should query assets by date range', () => {
      const now = Date.now();
      const asset1 = createMockAsset('image', { timestamp: now - 10000 });
      const asset2 = createMockAsset('image', { timestamp: now - 5000 });
      const asset3 = createMockAsset('image', { timestamp: now });
      
      assetManagementService.addAssetToGraph(asset1);
      assetManagementService.addAssetToGraph(asset2);
      assetManagementService.addAssetToGraph(asset3);
      
      const recentAssets = assetManagementService.queryAssets({
        startDate: now - 6000,
      });
      
      expect(recentAssets).toHaveLength(2);
      expect(recentAssets.map(a => a.id)).toContain(asset2.id);
      expect(recentAssets.map(a => a.id)).toContain(asset3.id);
    });

    it('should limit query results', () => {
      const asset1 = createMockAsset('image');
      const asset2 = createMockAsset('image');
      const asset3 = createMockAsset('image');
      
      assetManagementService.addAssetToGraph(asset1);
      assetManagementService.addAssetToGraph(asset2);
      assetManagementService.addAssetToGraph(asset3);
      
      const limitedAssets = assetManagementService.queryAssets({ limit: 2 });
      expect(limitedAssets).toHaveLength(2);
    });

    it('should sort assets by timestamp (newest first)', () => {
      const now = Date.now();
      const asset1 = createMockAsset('image', { timestamp: now - 10000 });
      const asset2 = createMockAsset('image', { timestamp: now });
      const asset3 = createMockAsset('image', { timestamp: now - 5000 });
      
      assetManagementService.addAssetToGraph(asset1);
      assetManagementService.addAssetToGraph(asset2);
      assetManagementService.addAssetToGraph(asset3);
      
      const sortedAssets = assetManagementService.queryAssets({});
      
      expect(sortedAssets[0].id).toBe(asset2.id); // Newest
      expect(sortedAssets[1].id).toBe(asset3.id); // Middle
      expect(sortedAssets[2].id).toBe(asset1.id); // Oldest
    });

    it('should combine multiple query filters', () => {
      const now = Date.now();
      const imageAsset1 = createMockAsset('image', { timestamp: now - 10000 });
      const imageAsset2 = createMockAsset('image', { timestamp: now });
      const videoAsset = createMockAsset('video', { timestamp: now });
      
      assetManagementService.addAssetToGraph(imageAsset1);
      assetManagementService.addAssetToGraph(imageAsset2);
      assetManagementService.addAssetToGraph(videoAsset);
      
      const filteredAssets = assetManagementService.queryAssets({
        type: 'image',
        startDate: now - 5000,
        limit: 1,
      });
      
      expect(filteredAssets).toHaveLength(1);
      expect(filteredAssets[0].id).toBe(imageAsset2.id);
    });
  });

  // ============================================================================
  // Metadata Management Tests (Requirements: 9.2)
  // ============================================================================

  describe('Metadata Management', () => {
    it('should store asset metadata', () => {
      const asset = createMockAsset('image', {
        metadata: {
          generationParams: {
            prompt: 'test prompt',
            width: 512,
            height: 512,
          },
          fileSize: 2048,
          dimensions: { width: 512, height: 512 },
          format: 'png',
        },
      });
      
      assetManagementService.addAssetToGraph(asset);
      
      const retrieved = assetManagementService.getAsset(asset.id);
      expect(retrieved?.metadata).toEqual(asset.metadata);
    });

    it('should include generation parameters in metadata', () => {
      const generationParams = {
        prompt: 'a beautiful landscape',
        negativePrompt: 'ugly, blurry',
        width: 1024,
        height: 768,
        steps: 30,
        cfgScale: 7.5,
        seed: 12345,
      };
      
      const asset = createMockAsset('image', {
        metadata: {
          generationParams,
          fileSize: 4096,
          dimensions: { width: 1024, height: 768 },
          format: 'png',
        },
      });
      
      assetManagementService.addAssetToGraph(asset);
      
      const retrieved = assetManagementService.getAsset(asset.id);
      expect(retrieved?.metadata.generationParams).toEqual(generationParams);
    });

    it('should include timestamp in metadata', () => {
      const timestamp = Date.now();
      const asset = createMockAsset('image', { timestamp });
      
      assetManagementService.addAssetToGraph(asset);
      
      const retrieved = assetManagementService.getAsset(asset.id);
      expect(retrieved?.timestamp).toBe(timestamp);
    });

    it('should include file size in metadata', () => {
      const asset = createMockAsset('image', {
        metadata: {
          generationParams: {},
          fileSize: 8192,
          format: 'png',
        },
      });
      
      assetManagementService.addAssetToGraph(asset);
      
      const retrieved = assetManagementService.getAsset(asset.id);
      expect(retrieved?.metadata.fileSize).toBe(8192);
    });

    it('should include dimensions for image assets', () => {
      const asset = createMockAsset('image', {
        metadata: {
          generationParams: {},
          fileSize: 1024,
          dimensions: { width: 1920, height: 1080 },
          format: 'png',
        },
      });
      
      assetManagementService.addAssetToGraph(asset);
      
      const retrieved = assetManagementService.getAsset(asset.id);
      expect(retrieved?.metadata.dimensions).toEqual({ width: 1920, height: 1080 });
    });

    it('should include duration for video and audio assets', () => {
      const videoAsset = createMockAsset('video', {
        metadata: {
          generationParams: {},
          fileSize: 10240,
          dimensions: { width: 1920, height: 1080 },
          duration: 5.5,
          format: 'mp4',
        },
      });
      
      assetManagementService.addAssetToGraph(videoAsset);
      
      const retrieved = assetManagementService.getAsset(videoAsset.id);
      expect(retrieved?.metadata.duration).toBe(5.5);
    });
  });

  // ============================================================================
  // Asset Saving Tests (Requirements: 9.1)
  // ============================================================================

  describe('Asset Saving', () => {
    it('should handle save operation in non-Electron environment', async () => {
      const asset = createMockAsset('image');
      const projectPath = '/mock/project/path';
      
      // Mock console.warn to verify fallback behavior
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // This should not throw in non-Electron environment
      await expect(
        assetManagementService.saveAsset({
          projectPath,
          asset,
        })
      ).resolves.toBeDefined();
      
      // Verify warning was logged
      expect(warnSpy).toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });

    it('should add asset to graph after save attempt', async () => {
      const asset = createMockAsset('image');
      const projectPath = '/mock/project/path';
      
      // Mock console.warn to suppress warnings
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await assetManagementService.saveAsset({
        projectPath,
        asset,
      });
      
      const retrieved = assetManagementService.getAsset(asset.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(asset.id);
      
      warnSpy.mockRestore();
    });

    it('should update asset URL after save', async () => {
      const asset = createMockAsset('image');
      const projectPath = '/mock/project/path';
      
      // Mock console.warn to suppress warnings
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      await assetManagementService.saveAsset({
        projectPath,
        asset,
      });
      
      const retrieved = assetManagementService.getAsset(asset.id);
      expect(retrieved?.url).toContain('images/');
      
      warnSpy.mockRestore();
    });

    it('should use custom filename if provided', async () => {
      const asset = createMockAsset('image');
      const projectPath = '/mock/project/path';
      const customFilename = 'custom-image.png';
      
      // Mock console.warn to suppress warnings
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const savedPath = await assetManagementService.saveAsset({
        projectPath,
        asset,
        filename: customFilename,
      });
      
      expect(savedPath).toContain(customFilename);
      
      warnSpy.mockRestore();
    });

    it('should use custom subdirectory if provided', async () => {
      const asset = createMockAsset('image');
      const projectPath = '/mock/project/path';
      const customSubdir = 'custom-assets';
      
      // Mock console.warn to suppress warnings
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const savedPath = await assetManagementService.saveAsset({
        projectPath,
        asset,
        subdirectory: customSubdir,
      });
      
      expect(savedPath).toContain(customSubdir);
      
      warnSpy.mockRestore();
    });
  });

  // ============================================================================
  // Directory Creation Tests
  // ============================================================================

  describe('Directory Creation', () => {
    // Helper to access private method for testing
    const accessEnsureDirectoryExists = (service: AssetManagementService) => {
      return async (path: string): Promise<void> => {
        // Access the private method via prototype
        const method = Object.getOwnPropertyNames(Object.getPrototypeOf(service))
          .find(name => name === 'ensureDirectoryExists');
        if (method) {
          return (service as any)[method](path);
        }
        throw new Error('ensureDirectoryExists method not found');
      };
    };

    beforeEach(() => {
      // Clear window.electronAPI before each test
      delete (window as any).electronAPI;
    });

    it('should do nothing in non-Electron environment', async () => {
      const ensureDir = accessEnsureDirectoryExists(assetManagementService);
      
      // Should not throw in non-Electron environment
      await expect(ensureDir('/test/path')).resolves.not.toThrow();
    });

    it('should not create directory if it already exists', async () => {
      // Mock Electron API with exists returning true
      (window as any).electronAPI = {
        fs: {
          exists: vi.fn().mockResolvedValue(true),
          mkdir: vi.fn().mockResolvedValue(undefined),
        },
      };
      
      const ensureDir = accessEnsureDirectoryExists(assetManagementService);
      await ensureDir('/existing/directory');
      
      // mkdir should not be called since directory exists
      expect((window as any).electronAPI.fs.mkdir).not.toHaveBeenCalled();
    });

    it('should create directory if it does not exist', async () => {
      // Mock Electron API with exists returning false
      (window as any).electronAPI = {
        fs: {
          exists: vi.fn().mockResolvedValue(false),
          mkdir: vi.fn().mockResolvedValue(undefined),
        },
      };
      
      const ensureDir = accessEnsureDirectoryExists(assetManagementService);
      await ensureDir('/new/directory');
      
      // mkdir should be called with recursive option
      expect((window as any).electronAPI.fs.mkdir).toHaveBeenCalledWith(
        '/new/directory',
        { recursive: true }
      );
    });

    it('should create nested directories recursively', async () => {
      // Mock Electron API with exists returning false
      (window as any).electronAPI = {
        fs: {
          exists: vi.fn().mockResolvedValue(false),
          mkdir: vi.fn().mockResolvedValue(undefined),
        },
      };
      
      const ensureDir = accessEnsureDirectoryExists(assetManagementService);
      await ensureDir('/a/b/c/d/e');
      
      // mkdir should be called with recursive option
      expect((window as any).electronAPI.fs.mkdir).toHaveBeenCalledWith(
        '/a/b/c/d/e',
        { recursive: true }
      );
    });

    it('should handle mkdir error gracefully', async () => {
      // Mock Electron API with mkdir throwing an error
      (window as any).electronAPI = {
        fs: {
          exists: vi.fn().mockResolvedValue(false),
          mkdir: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
      };
      
      const ensureDir = accessEnsureDirectoryExists(assetManagementService);
      
      // Should throw an error with descriptive message
      await expect(ensureDir('/protected/directory')).rejects.toThrow(
        'Failed to ensure directory exists: Permission denied'
      );
    });

    it('should handle exists check error gracefully', async () => {
      // Mock Electron API with exists throwing an error
      (window as any).electronAPI = {
        fs: {
          exists: vi.fn().mockRejectedValue(new Error('Access denied')),
        },
      };
      
      const ensureDir = accessEnsureDirectoryExists(assetManagementService);
      
      // Should throw an error with descriptive message
      await expect(ensureDir('/test/path')).rejects.toThrow(
        'Failed to ensure directory exists: Access denied'
      );
    });

    it('should use recursive option for mkdir', async () => {
      // Mock Electron API
      (window as any).electronAPI = {
        fs: {
          exists: vi.fn().mockResolvedValue(false),
          mkdir: vi.fn().mockResolvedValue(undefined),
        },
      };
      
      const ensureDir = accessEnsureDirectoryExists(assetManagementService);
      await ensureDir('/deeply/nested/path');
      
      // Verify recursive option is used
      expect((window as any).electronAPI.fs.mkdir).toHaveBeenCalledWith(
        '/deeply/nested/path',
        { recursive: true }
      );
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Tests', () => {
    it('should handle complete pipeline workflow', async () => {
      const projectPath = '/mock/project/path';
      
      // Mock console.warn to suppress warnings
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Create pipeline assets
      const promptAsset = createMockAsset('prompt');
      const imageAsset = createMockAsset('image');
      const videoAsset = createMockAsset('video');
      const audioAsset = createMockAsset('audio');
      
      // Save assets
      await assetManagementService.saveAsset({ projectPath, asset: promptAsset });
      await assetManagementService.saveAsset({ projectPath, asset: imageAsset });
      await assetManagementService.saveAsset({ projectPath, asset: videoAsset });
      await assetManagementService.saveAsset({ projectPath, asset: audioAsset });
      
      // Link assets in pipeline
      assetManagementService.linkAssets(promptAsset.id, imageAsset.id);
      assetManagementService.linkAssets(imageAsset.id, videoAsset.id);
      assetManagementService.linkAssets(videoAsset.id, audioAsset.id);
      
      // Verify all assets are in graph
      const allAssets = assetManagementService.getAllAssets();
      expect(allAssets).toHaveLength(4);
      
      // Verify pipeline chain
      const promptRelated = assetManagementService.getRelatedAssets(promptAsset.id);
      expect(promptRelated[0].id).toBe(imageAsset.id);
      
      const imageRelated = assetManagementService.getRelatedAssets(imageAsset.id);
      expect(imageRelated[0].id).toBe(videoAsset.id);
      
      const videoRelated = assetManagementService.getRelatedAssets(videoAsset.id);
      expect(videoRelated[0].id).toBe(audioAsset.id);
      
      warnSpy.mockRestore();
    });

    it('should maintain metadata through save and retrieval', async () => {
      const projectPath = '/mock/project/path';
      
      // Mock console.warn to suppress warnings
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const asset = createMockAsset('image', {
        metadata: {
          generationParams: {
            prompt: 'test prompt',
            width: 512,
            height: 512,
          },
          fileSize: 2048,
          dimensions: { width: 512, height: 512 },
          format: 'png',
        },
      });
      
      await assetManagementService.saveAsset({ projectPath, asset });
      
      const retrieved = assetManagementService.getAsset(asset.id);
      expect(retrieved?.metadata).toEqual(asset.metadata);
      
      warnSpy.mockRestore();
    });
  });
});
