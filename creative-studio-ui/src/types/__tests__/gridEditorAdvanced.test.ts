/**
 * Tests for Advanced Grid Editor Types
 * Validates type guards, schemas, and type safety
 */

import { describe, it, expect } from 'vitest';
import {
  isPosition,
  isGridLayoutConfig,
  isThumbnailCacheConfig,
  isExportConfiguration,
  PositionSchema,
  GridLayoutConfigSchema,
  ThumbnailCacheConfigSchema,
  ExportConfigurationSchema,
  type Position,
  type GridLayoutConfig,
  type ThumbnailCacheConfig,
  type ExportConfiguration,
} from '../gridEditorAdvanced';

describe('Advanced Grid Editor Types', () => {
  describe('Position Type Guard', () => {
    it('should validate valid position', () => {
      const validPosition: Position = { x: 10, y: 20 };
      expect(isPosition(validPosition)).toBe(true);
    });

    it('should reject invalid position - missing y', () => {
      const invalidPosition = { x: 10 };
      expect(isPosition(invalidPosition)).toBe(false);
    });

    it('should reject invalid position - wrong types', () => {
      const invalidPosition = { x: '10', y: '20' };
      expect(isPosition(invalidPosition)).toBe(false);
    });

    it('should reject null', () => {
      expect(isPosition(null)).toBe(false);
    });
  });

  describe('GridLayoutConfig Type Guard', () => {
    it('should validate valid grid layout config', () => {
      const validConfig: GridLayoutConfig = {
        columns: 3,
        rows: 3,
        gap: 16,
        cellSize: { width: 100, height: 100 },
        snapEnabled: true,
        snapThreshold: 10,
        showGridLines: true,
      };
      expect(isGridLayoutConfig(validConfig)).toBe(true);
    });

    it('should reject invalid config - negative columns', () => {
      const invalidConfig = {
        columns: -1,
        rows: 3,
        gap: 16,
        cellSize: { width: 100, height: 100 },
        snapEnabled: true,
        snapThreshold: 10,
        showGridLines: true,
      };
      expect(isGridLayoutConfig(invalidConfig)).toBe(false);
    });

    it('should reject invalid config - missing fields', () => {
      const invalidConfig = {
        columns: 3,
        rows: 3,
      };
      expect(isGridLayoutConfig(invalidConfig)).toBe(false);
    });
  });

  describe('ThumbnailCacheConfig Type Guard', () => {
    it('should validate valid cache config', () => {
      const validConfig: ThumbnailCacheConfig = {
        maxMemorySize: 50,
        maxDiskSize: 200,
        quality: 'medium',
        preloadDistance: 5,
      };
      expect(isThumbnailCacheConfig(validConfig)).toBe(true);
    });

    it('should reject invalid quality', () => {
      const invalidConfig = {
        maxMemorySize: 50,
        maxDiskSize: 200,
        quality: 'ultra',
        preloadDistance: 5,
      };
      expect(isThumbnailCacheConfig(invalidConfig)).toBe(false);
    });

    it('should reject negative values', () => {
      const invalidConfig = {
        maxMemorySize: -50,
        maxDiskSize: 200,
        quality: 'medium',
        preloadDistance: 5,
      };
      expect(isThumbnailCacheConfig(invalidConfig)).toBe(false);
    });
  });

  describe('ExportConfiguration Type Guard', () => {
    it('should validate valid export config', () => {
      const validConfig: ExportConfiguration = {
        gridLayout: {
          columns: 3,
          rows: 3,
          gap: 16,
          cellSize: { width: 100, height: 100 },
          snapEnabled: true,
          snapThreshold: 10,
          showGridLines: true,
        },
        snapSettings: {
          enabled: true,
          size: 16,
          threshold: 10,
        },
        visualPreferences: {
          showGridLines: true,
          theme: 'dark',
        },
        version: '1.0.0',
      };
      expect(isExportConfiguration(validConfig)).toBe(true);
    });

    it('should reject invalid grid size', () => {
      const invalidConfig = {
        gridLayout: {
          columns: 3,
          rows: 3,
          gap: 16,
          cellSize: { width: 100, height: 100 },
          snapEnabled: true,
          snapThreshold: 10,
          showGridLines: true,
        },
        snapSettings: {
          enabled: true,
          size: 15, // Invalid - must be 8, 16, 24, or 32
          threshold: 10,
        },
        visualPreferences: {
          showGridLines: true,
          theme: 'dark',
        },
        version: '1.0.0',
      };
      expect(isExportConfiguration(invalidConfig)).toBe(false);
    });
  });

  describe('Zod Schemas', () => {
    it('should parse valid position', () => {
      const result = PositionSchema.safeParse({ x: 10, y: 20 });
      expect(result.success).toBe(true);
    });

    it('should parse valid grid layout config', () => {
      const config = {
        columns: 3,
        rows: 3,
        gap: 16,
        cellSize: { width: 100, height: 100 },
        snapEnabled: true,
        snapThreshold: 10,
        showGridLines: true,
      };
      const result = GridLayoutConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should parse valid thumbnail cache config', () => {
      const config = {
        maxMemorySize: 50,
        maxDiskSize: 200,
        quality: 'high',
        preloadDistance: 5,
      };
      const result = ThumbnailCacheConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should parse valid export configuration', () => {
      const config = {
        gridLayout: {
          columns: 3,
          rows: 3,
          gap: 16,
          cellSize: { width: 100, height: 100 },
          snapEnabled: true,
          snapThreshold: 10,
          showGridLines: true,
        },
        snapSettings: {
          enabled: true,
          size: 24,
          threshold: 10,
        },
        visualPreferences: {
          showGridLines: true,
          theme: 'light',
        },
        version: '1.0.0',
      };
      const result = ExportConfigurationSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should enforce Position type', () => {
      const position: Position = { x: 10, y: 20 };
      expect(position.x).toBe(10);
      expect(position.y).toBe(20);
    });

    it('should enforce GridLayoutConfig type', () => {
      const config: GridLayoutConfig = {
        columns: 3,
        rows: 3,
        gap: 16,
        cellSize: { width: 100, height: 100 },
        snapEnabled: true,
        snapThreshold: 10,
        showGridLines: true,
      };
      expect(config.columns).toBe(3);
      expect(config.snapEnabled).toBe(true);
    });

    it('should enforce ThumbnailCacheConfig type', () => {
      const config: ThumbnailCacheConfig = {
        maxMemorySize: 50,
        maxDiskSize: 200,
        quality: 'medium',
        preloadDistance: 5,
      };
      expect(config.quality).toBe('medium');
      expect(config.maxMemorySize).toBe(50);
    });
  });
});
