/**
 * Generation History Service Tests
 * 
 * Tests for history logging, retrieval, and versioning functionality.
 * 
 * Requirements: 14.1, 14.3, 14.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GenerationHistoryService } from '../GenerationHistoryService';
import type { GeneratedAsset, HistoryEntry } from '../../types/generation';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Helper function to create mock asset
function createMockAsset(
  id: string,
  type: 'image' | 'video' | 'audio'
): GeneratedAsset {
  return {
    id,
    type,
    url: `https://example.com/${type}/${id}`,
    metadata: {
      generationParams: {
        prompt: 'test prompt',
        seed: 12345,
      },
      fileSize: 1024000,
      dimensions: type !== 'audio' ? { width: 1024, height: 768 } : undefined,
      duration: type !== 'image' ? 5.0 : undefined,
      format: type === 'image' ? 'png' : type === 'video' ? 'mp4' : 'wav',
    },
    relatedAssets: [],
    timestamp: Date.now(),
  };
}

describe('GenerationHistoryService', () => {
  let service: GenerationHistoryService;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    
    // Get fresh instance
    service = GenerationHistoryService.getInstance();
    
    // Clear history and reset max entries
    service.clearHistory();
    service.setMaxEntries(100);
  });

  describe('History Logging (Requirement 14.1)', () => {
    it('should log a generation to history', () => {
      const asset = createMockAsset('asset-1', 'image');
      const params = { prompt: 'test', seed: 123 };
      
      const entry = service.logGeneration('pipeline-1', 'image', params, asset);
      
      expect(entry).toBeDefined();
      expect(entry.id).toBeDefined();
      expect(entry.pipelineId).toBe('pipeline-1');
      expect(entry.type).toBe('image');
      expect(entry.params).toEqual(params);
      expect(entry.result).toEqual(asset);
      expect(entry.timestamp).toBeDefined();
      expect(entry.version).toBe(1);
    });

    it('should add logged generation to history entries', () => {
      const asset = createMockAsset('asset-1', 'image');
      
      service.logGeneration('pipeline-1', 'image', {}, asset);
      
      const entries = service.getAllEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].result.id).toBe('asset-1');
    });

    it('should log multiple generations', () => {
      const asset1 = createMockAsset('asset-1', 'image');
      const asset2 = createMockAsset('asset-2', 'video');
      const asset3 = createMockAsset('asset-3', 'audio');
      
      service.logGeneration('pipeline-1', 'image', {}, asset1);
      service.logGeneration('pipeline-1', 'video', {}, asset2);
      service.logGeneration('pipeline-2', 'audio', {}, asset3);
      
      const entries = service.getAllEntries();
      expect(entries).toHaveLength(3);
    });

    it('should maintain newest-first order', () => {
      const asset1 = createMockAsset('asset-1', 'image');
      const asset2 = createMockAsset('asset-2', 'image');
      
      const entry1 = service.logGeneration('pipeline-1', 'image', {}, asset1);
      const entry2 = service.logGeneration('pipeline-1', 'image', {}, asset2);
      
      const entries = service.getAllEntries();
      expect(entries[0].id).toBe(entry2.id);
      expect(entries[1].id).toBe(entry1.id);
    });

    it('should trim history to max entries', () => {
      service.setMaxEntries(5);
      
      // Add 10 entries
      for (let i = 0; i < 10; i++) {
        const asset = createMockAsset(`asset-${i}`, 'image');
        service.logGeneration('pipeline-1', 'image', {}, asset);
      }
      
      const entries = service.getAllEntries();
      expect(entries).toHaveLength(5);
    });

    it('should persist history to localStorage', () => {
      const asset = createMockAsset('asset-1', 'image');
      service.logGeneration('pipeline-1', 'image', {}, asset);
      
      const stored = localStorageMock.getItem('storycore_generation_history');
      expect(stored).toBeDefined();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.entries).toHaveLength(1);
    });
  });

  describe('History Retrieval (Requirement 14.3)', () => {
    beforeEach(() => {
      // Add test data
      const asset1 = createMockAsset('asset-1', 'image');
      const asset2 = createMockAsset('asset-2', 'video');
      const asset3 = createMockAsset('asset-3', 'audio');
      
      service.logGeneration('pipeline-1', 'image', { seed: 1 }, asset1);
      service.logGeneration('pipeline-1', 'video', { seed: 2 }, asset2);
      service.logGeneration('pipeline-2', 'audio', { seed: 3 }, asset3);
    });

    it('should retrieve all history entries', () => {
      const entries = service.getAllEntries();
      expect(entries).toHaveLength(3);
    });

    it('should query history by type', () => {
      const imageEntries = service.queryHistory({ type: 'image' });
      expect(imageEntries).toHaveLength(1);
      expect(imageEntries[0].type).toBe('image');
      
      const videoEntries = service.queryHistory({ type: 'video' });
      expect(videoEntries).toHaveLength(1);
      expect(videoEntries[0].type).toBe('video');
    });

    it('should query history by pipeline ID', () => {
      const pipeline1Entries = service.queryHistory({ pipelineId: 'pipeline-1' });
      expect(pipeline1Entries).toHaveLength(2);
      
      const pipeline2Entries = service.queryHistory({ pipelineId: 'pipeline-2' });
      expect(pipeline2Entries).toHaveLength(1);
    });

    it('should query history with limit', () => {
      const entries = service.queryHistory({ limit: 2 });
      expect(entries).toHaveLength(2);
    });

    it('should query history with date range', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      
      const entries = service.queryHistory({
        startDate: oneHourAgo,
        endDate: now + 1000,
      });
      
      expect(entries).toHaveLength(3);
    });

    it('should sort history by timestamp descending by default', () => {
      const entries = service.queryHistory();
      
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].timestamp).toBeGreaterThanOrEqual(entries[i + 1].timestamp);
      }
    });

    it('should sort history by timestamp ascending', () => {
      const entries = service.queryHistory({ sortOrder: 'asc' });
      
      for (let i = 0; i < entries.length - 1; i++) {
        expect(entries[i].timestamp).toBeLessThanOrEqual(entries[i + 1].timestamp);
      }
    });

    it('should get entry by ID', () => {
      const allEntries = service.getAllEntries();
      const entryId = allEntries[0].id;
      
      const entry = service.getEntryById(entryId);
      expect(entry).toBeDefined();
      expect(entry!.id).toBe(entryId);
    });

    it('should get entries by asset ID', () => {
      const entries = service.getEntriesByAssetId('asset-1');
      expect(entries).toHaveLength(1);
      expect(entries[0].result.id).toBe('asset-1');
    });

    it('should get entries by pipeline ID', () => {
      const entries = service.getEntriesByPipelineId('pipeline-1');
      expect(entries).toHaveLength(2);
    });

    it('should get entries by type', () => {
      const imageEntries = service.getEntriesByType('image');
      expect(imageEntries).toHaveLength(1);
      expect(imageEntries[0].type).toBe('image');
    });

    it('should get recent entries', () => {
      const recent = service.getRecentEntries(2);
      expect(recent).toHaveLength(2);
      
      // Should be newest first
      expect(recent[0].timestamp).toBeGreaterThanOrEqual(recent[1].timestamp);
    });
  });

  describe('Versioning (Requirement 14.4)', () => {
    it('should assign version 1 to first generation', () => {
      const asset = createMockAsset('asset-1', 'image');
      const entry = service.logGeneration('pipeline-1', 'image', {}, asset);
      
      expect(entry.version).toBe(1);
    });

    it('should increment version for regenerations', () => {
      const asset = createMockAsset('asset-1', 'image');
      
      const entry1 = service.logGeneration('pipeline-1', 'image', { seed: 1 }, asset);
      const entry2 = service.logGeneration('pipeline-1', 'image', { seed: 2 }, asset);
      const entry3 = service.logGeneration('pipeline-1', 'image', { seed: 3 }, asset);
      
      expect(entry1.version).toBe(1);
      expect(entry2.version).toBe(2);
      expect(entry3.version).toBe(3);
    });

    it('should get all versions of an asset', () => {
      const asset = createMockAsset('asset-1', 'image');
      
      service.logGeneration('pipeline-1', 'image', { seed: 1 }, asset);
      service.logGeneration('pipeline-1', 'image', { seed: 2 }, asset);
      service.logGeneration('pipeline-1', 'image', { seed: 3 }, asset);
      
      const versions = service.getAssetVersions('asset-1');
      expect(versions).toHaveLength(3);
      expect(versions[0].version).toBe(1);
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(3);
    });

    it('should get latest version of an asset', () => {
      const asset = createMockAsset('asset-1', 'image');
      
      service.logGeneration('pipeline-1', 'image', { seed: 1 }, asset);
      service.logGeneration('pipeline-1', 'image', { seed: 2 }, asset);
      const entry3 = service.logGeneration('pipeline-1', 'image', { seed: 3 }, asset);
      
      const latest = service.getLatestVersion('asset-1');
      expect(latest).toBeDefined();
      expect(latest!.version).toBe(3);
      expect(latest!.id).toBe(entry3.id);
    });

    it('should get specific version of an asset', () => {
      const asset = createMockAsset('asset-1', 'image');
      
      service.logGeneration('pipeline-1', 'image', { seed: 1 }, asset);
      const entry2 = service.logGeneration('pipeline-1', 'image', { seed: 2 }, asset);
      service.logGeneration('pipeline-1', 'image', { seed: 3 }, asset);
      
      const version2 = service.getVersion('asset-1', 2);
      expect(version2).toBeDefined();
      expect(version2!.version).toBe(2);
      expect(version2!.id).toBe(entry2.id);
    });

    it('should compare two versions and find parameter differences', () => {
      const asset = createMockAsset('asset-1', 'image');
      
      service.logGeneration('pipeline-1', 'image', { seed: 1, steps: 20 }, asset);
      service.logGeneration('pipeline-1', 'image', { seed: 2, steps: 30 }, asset);
      
      const comparison = service.compareVersions('asset-1', 1, 2);
      
      expect(comparison.version1Entry).toBeDefined();
      expect(comparison.version2Entry).toBeDefined();
      expect(comparison.paramDifferences).toHaveProperty('seed');
      expect(comparison.paramDifferences).toHaveProperty('steps');
      expect(comparison.paramDifferences.seed).toEqual({ v1: 1, v2: 2 });
      expect(comparison.paramDifferences.steps).toEqual({ v1: 20, v2: 30 });
    });

    it('should handle comparison with no differences', () => {
      const asset = createMockAsset('asset-1', 'image');
      const params = { seed: 1, steps: 20 };
      
      service.logGeneration('pipeline-1', 'image', params, asset);
      service.logGeneration('pipeline-1', 'image', params, asset);
      
      const comparison = service.compareVersions('asset-1', 1, 2);
      
      expect(Object.keys(comparison.paramDifferences)).toHaveLength(0);
    });

    it('should handle comparison with missing version', () => {
      const asset = createMockAsset('asset-1', 'image');
      
      service.logGeneration('pipeline-1', 'image', { seed: 1 }, asset);
      
      const comparison = service.compareVersions('asset-1', 1, 99);
      
      expect(comparison.version1Entry).toBeDefined();
      expect(comparison.version2Entry).toBeUndefined();
    });
  });

  describe('History Management', () => {
    it('should clear all history', () => {
      const asset1 = createMockAsset('asset-1', 'image');
      const asset2 = createMockAsset('asset-2', 'video');
      
      service.logGeneration('pipeline-1', 'image', {}, asset1);
      service.logGeneration('pipeline-1', 'video', {}, asset2);
      
      expect(service.getAllEntries()).toHaveLength(2);
      
      service.clearHistory();
      
      expect(service.getAllEntries()).toHaveLength(0);
    });

    it('should remove specific entry', () => {
      const asset = createMockAsset('asset-1', 'image');
      const entry = service.logGeneration('pipeline-1', 'image', {}, asset);
      
      expect(service.getAllEntries()).toHaveLength(1);
      
      const removed = service.removeEntry(entry.id);
      
      expect(removed).toBe(true);
      expect(service.getAllEntries()).toHaveLength(0);
    });

    it('should return false when removing non-existent entry', () => {
      const removed = service.removeEntry('non-existent-id');
      expect(removed).toBe(false);
    });

    it('should remove entries older than specified date', () => {
      const now = Date.now();
      
      // Create entries at different times
      const asset1 = createMockAsset('asset-1', 'image');
      const asset2 = createMockAsset('asset-2', 'image');
      const asset3 = createMockAsset('asset-3', 'image');
      
      // Log first entry
      service.logGeneration('pipeline-1', 'image', {}, asset1);
      
      // Wait a bit and log second entry
      const entries1 = service.getAllEntries();
      const oldTimestamp = entries1[0].timestamp;
      
      // Manually set older timestamp for testing
      entries1[0].timestamp = now - 10000;
      
      // Log more entries
      service.logGeneration('pipeline-1', 'image', {}, asset2);
      service.logGeneration('pipeline-1', 'image', {}, asset3);
      
      const removedCount = service.removeEntriesOlderThan(now - 6000);
      
      expect(removedCount).toBe(1);
      expect(service.getAllEntries()).toHaveLength(2);
    });

    it('should set max entries', () => {
      service.setMaxEntries(2);
      
      const asset1 = createMockAsset('asset-1', 'image');
      const asset2 = createMockAsset('asset-2', 'image');
      const asset3 = createMockAsset('asset-3', 'image');
      
      service.logGeneration('pipeline-1', 'image', {}, asset1);
      service.logGeneration('pipeline-1', 'image', {}, asset2);
      service.logGeneration('pipeline-1', 'image', {}, asset3);
      
      expect(service.getAllEntries()).toHaveLength(2);
    });

    it('should get history statistics', () => {
      const asset1 = createMockAsset('asset-1', 'image');
      const asset2 = createMockAsset('asset-2', 'video');
      const asset3 = createMockAsset('asset-3', 'audio');
      
      service.logGeneration('pipeline-1', 'image', {}, asset1);
      service.logGeneration('pipeline-1', 'video', {}, asset2);
      service.logGeneration('pipeline-2', 'audio', {}, asset3);
      
      const stats = service.getStatistics();
      
      expect(stats.totalEntries).toBe(3);
      expect(stats.entriesByType.image).toBe(1);
      expect(stats.entriesByType.video).toBe(1);
      expect(stats.entriesByType.audio).toBe(1);
      expect(stats.oldestEntry).toBeDefined();
      expect(stats.newestEntry).toBeDefined();
      expect(stats.averageVersions).toBe(1);
    });

    it('should calculate average versions correctly', () => {
      const asset1 = createMockAsset('asset-1', 'image');
      const asset2 = createMockAsset('asset-2', 'image');
      
      // asset-1 has 3 versions
      service.logGeneration('pipeline-1', 'image', {}, asset1);
      service.logGeneration('pipeline-1', 'image', {}, asset1);
      service.logGeneration('pipeline-1', 'image', {}, asset1);
      
      // asset-2 has 1 version
      service.logGeneration('pipeline-1', 'image', {}, asset2);
      
      const stats = service.getStatistics();
      
      // Average: (3 + 1) / 2 = 2
      expect(stats.averageVersions).toBe(2);
    });
  });

  describe('Persistence', () => {
    it('should export history to JSON', () => {
      const asset = createMockAsset('asset-1', 'image');
      service.logGeneration('pipeline-1', 'image', {}, asset);
      
      const json = service.exportToJSON();
      const parsed = JSON.parse(json);
      
      expect(parsed.entries).toHaveLength(1);
      expect(parsed.maxEntries).toBeDefined();
    });

    it('should import history from JSON', () => {
      const asset = createMockAsset('asset-1', 'image');
      service.logGeneration('pipeline-1', 'image', {}, asset);
      
      const json = service.exportToJSON();
      
      // Clear and import
      service.clearHistory();
      expect(service.getAllEntries()).toHaveLength(0);
      
      const success = service.importFromJSON(json);
      
      expect(success).toBe(true);
      expect(service.getAllEntries()).toHaveLength(1);
    });

    it('should handle invalid JSON import', () => {
      const success = service.importFromJSON('invalid json');
      expect(success).toBe(false);
    });

    it('should handle invalid history structure import', () => {
      const invalidHistory = JSON.stringify({ invalid: 'structure' });
      const success = service.importFromJSON(invalidHistory);
      expect(success).toBe(false);
    });

    it('should load history from localStorage on initialization', () => {
      const asset = createMockAsset('asset-1', 'image');
      service.logGeneration('pipeline-1', 'image', {}, asset);
      
      // Create new instance (simulates page reload)
      const newService = GenerationHistoryService.getInstance();
      
      const entries = newService.getAllEntries();
      expect(entries).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty history', () => {
      const entries = service.getAllEntries();
      expect(entries).toHaveLength(0);
      
      const stats = service.getStatistics();
      expect(stats.totalEntries).toBe(0);
      expect(stats.averageVersions).toBe(0);
    });

    it('should handle querying non-existent asset', () => {
      const versions = service.getAssetVersions('non-existent');
      expect(versions).toHaveLength(0);
      
      const latest = service.getLatestVersion('non-existent');
      expect(latest).toBeUndefined();
    });

    it('should handle querying non-existent version', () => {
      const asset = createMockAsset('asset-1', 'image');
      service.logGeneration('pipeline-1', 'image', {}, asset);
      
      const version = service.getVersion('asset-1', 99);
      expect(version).toBeUndefined();
    });

    it('should handle multiple assets with same ID but different types', () => {
      const imageAsset = createMockAsset('asset-1', 'image');
      const videoAsset = createMockAsset('asset-1', 'video');
      
      service.logGeneration('pipeline-1', 'image', {}, imageAsset);
      service.logGeneration('pipeline-1', 'video', {}, videoAsset);
      
      const entries = service.getEntriesByAssetId('asset-1');
      expect(entries).toHaveLength(2);
    });
  });
});
