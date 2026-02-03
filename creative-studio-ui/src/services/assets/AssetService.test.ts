/**
 * Unit tests for AssetService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AssetService } from '../AssetService';
import { ASSET_VALIDATION_RULES } from '../../../types/asset';

describe('AssetService', () => {
  let assetService: AssetService;

  beforeEach(() => {
    assetService = new AssetService();
  });

  describe('validateAsset', () => {
    it('should reject unsupported file types', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = assetService.validateAsset(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Unsupported file type');
    });

    it('should accept valid PNG image', () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const result = assetService.validateAsset(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid JPG image', () => {
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = assetService.validateAsset(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid MP3 audio', () => {
      const file = new File(['content'], 'test.mp3', { type: 'audio/mpeg' });
      const result = assetService.validateAsset(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid MP4 video', () => {
      const file = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      const result = assetService.validateAsset(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files exceeding size limit', () => {
      // Create a file larger than 50MB (image limit)
      const largeSize = 51 * 1024 * 1024;
      const file = new File([new ArrayBuffer(largeSize)], 'large.png', {
        type: 'image/png',
      });
      const result = assetService.validateAsset(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('exceeds maximum allowed size');
    });

    it('should validate file extension case-insensitively', () => {
      const file = new File(['content'], 'test.PNG', { type: 'image/png' });
      const result = assetService.validateAsset(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('generateAssetId', () => {
    it('should generate unique IDs with timestamp', () => {
      const filename = 'test-image.png';
      const id1 = assetService.generateAssetId(filename);
      const id2 = assetService.generateAssetId(filename);

      expect(id1).toMatch(/^asset_\d+_test-image$/);
      expect(id2).toMatch(/^asset_\d+_test-image$/);
      // IDs should be different due to timestamp
      expect(id1).not.toBe(id2);
    });

    it('should sanitize special characters in filename', () => {
      const filename = 'test image (1).png';
      const id = assetService.generateAssetId(filename);

      expect(id).toMatch(/^asset_\d+_test_image__1_$/);
    });

    it('should remove file extension from ID', () => {
      const filename = 'my-file.jpg';
      const id = assetService.generateAssetId(filename);

      expect(id).not.toContain('.jpg');
      expect(id).toMatch(/^asset_\d+_my-file$/);
    });
  });

  describe('createAssetMetadata', () => {
    it('should create metadata with all required fields', () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      const assetPath = '/project/assets/images/asset_123_test.png';
      const assetId = 'asset_123_test';

      const metadata = assetService.createAssetMetadata(
        file,
        assetPath,
        assetId
      );

      expect(metadata).toHaveProperty('id', assetId);
      expect(metadata).toHaveProperty('filename', 'test.png');
      expect(metadata).toHaveProperty('type', 'image');
      expect(metadata).toHaveProperty('path', assetPath);
      expect(metadata).toHaveProperty('size', file.size);
      expect(metadata).toHaveProperty('imported_at');
      expect(metadata.imported_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should correctly identify asset type from file', () => {
      const imageFile = new File(['content'], 'test.jpg', {
        type: 'image/jpeg',
      });
      const audioFile = new File(['content'], 'test.mp3', {
        type: 'audio/mpeg',
      });
      const videoFile = new File(['content'], 'test.mp4', {
        type: 'video/mp4',
      });

      const imageMetadata = assetService.createAssetMetadata(
        imageFile,
        '/path',
        'id1'
      );
      const audioMetadata = assetService.createAssetMetadata(
        audioFile,
        '/path',
        'id2'
      );
      const videoMetadata = assetService.createAssetMetadata(
        videoFile,
        '/path',
        'id3'
      );

      expect(imageMetadata.type).toBe('image');
      expect(audioMetadata.type).toBe('audio');
      expect(videoMetadata.type).toBe('video');
    });
  });

  describe('ASSET_VALIDATION_RULES', () => {
    it('should have correct image validation rules', () => {
      expect(ASSET_VALIDATION_RULES.image.allowedExtensions).toEqual([
        '.png',
        '.jpg',
        '.jpeg',
      ]);
      expect(ASSET_VALIDATION_RULES.image.maxSize).toBe(50 * 1024 * 1024);
      expect(ASSET_VALIDATION_RULES.image.minDimensions).toEqual({
        width: 256,
        height: 256,
      });
    });

    it('should have correct audio validation rules', () => {
      expect(ASSET_VALIDATION_RULES.audio.allowedExtensions).toEqual([
        '.mp3',
        '.wav',
      ]);
      expect(ASSET_VALIDATION_RULES.audio.maxSize).toBe(100 * 1024 * 1024);
      expect(ASSET_VALIDATION_RULES.audio.minDuration).toBe(0.1);
    });

    it('should have correct video validation rules', () => {
      expect(ASSET_VALIDATION_RULES.video.allowedExtensions).toEqual([
        '.mp4',
        '.mov',
      ]);
      expect(ASSET_VALIDATION_RULES.video.maxSize).toBe(500 * 1024 * 1024);
      expect(ASSET_VALIDATION_RULES.video.minDuration).toBe(0.1);
    });
  });
});
