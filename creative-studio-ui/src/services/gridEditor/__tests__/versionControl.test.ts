/**
 * Version Control Service Tests
 * 
 * Tests for version history management functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VersionControlService } from '../VersionControlService';
import { GridConfiguration } from '../../../types/gridEditor';

describe('VersionControlService', () => {
  let service: VersionControlService;
  const projectId = 'test-project';

  // Create a mock grid configuration
  const createMockConfig = (description: string): GridConfiguration => ({
    version: '1.0',
    projectId,
    panels: [],
    presets: [],
    metadata: {
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      description,
    },
  });

  beforeEach(() => {
    service = new VersionControlService({
      maxVersions: 10,
      storageKey: 'test-versions',
    });
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up
    service.deleteAllVersions(projectId);
  });

  describe('Version Saving', () => {
    it('should save a version with metadata', () => {
      const config = createMockConfig('Test config');
      const version = service.saveVersion(config, {
        description: 'Test version',
        author: 'Test User',
      });

      expect(version.metadata.description).toBe('Test version');
      expect(version.metadata.author).toBe('Test User');
      expect(version.metadata.id).toBeDefined();
      expect(version.metadata.timestamp).toBeDefined();
    });

    it('should save version with auto-generated description', () => {
      const config = createMockConfig('Test config');
      const version = service.saveVersionAuto(config, 'Test User');

      expect(version.metadata.description).toContain('Auto-saved');
      expect(version.metadata.author).toBe('Test User');
    });

    it('should enforce max versions limit', () => {
      const config = createMockConfig('Test config');

      // Save more than max versions
      for (let i = 0; i < 15; i++) {
        service.saveVersion(config, { description: `Version ${i}` });
      }

      const versions = service.listVersions(projectId);
      expect(versions.length).toBe(10); // Should be limited to maxVersions
    });
  });

  describe('Version Retrieval', () => {
    it('should list versions in chronological order (newest first)', async () => {
      const config = createMockConfig('Test config');

      service.saveVersion(config, { description: 'First' });
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      service.saveVersion(config, { description: 'Second' });
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      service.saveVersion(config, { description: 'Third' });

      const versions = service.listVersions(projectId);
      expect(versions.length).toBe(3);
      expect(versions[0].metadata.description).toBe('Third');
      expect(versions[1].metadata.description).toBe('Second');
      expect(versions[2].metadata.description).toBe('First');
    });

    it('should retrieve specific version by ID', () => {
      const config = createMockConfig('Test config');
      const saved = service.saveVersion(config, { description: 'Test' });

      const retrieved = service.getVersion(projectId, saved.metadata.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.metadata.id).toBe(saved.metadata.id);
      expect(retrieved?.metadata.description).toBe('Test');
    });

    it('should get latest version', async () => {
      const config = createMockConfig('Test config');

      service.saveVersion(config, { description: 'First' });
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      service.saveVersion(config, { description: 'Second' });
      await new Promise(resolve => setTimeout(resolve, 10)); // Ensure different timestamps
      const latest = service.saveVersion(config, { description: 'Latest' });

      const retrieved = service.getLatestVersion(projectId);
      expect(retrieved?.metadata.id).toBe(latest.metadata.id);
      expect(retrieved?.metadata.description).toBe('Latest');
    });

    it('should return null for non-existent version', () => {
      const version = service.getVersion(projectId, 'non-existent-id');
      expect(version).toBeNull();
    });
  });

  describe('Version Comparison', () => {
    it('should compare two versions and find differences', () => {
      const config1 = createMockConfig('First config');
      const config2 = createMockConfig('Second config');

      const v1 = service.saveVersion(config1);
      const v2 = service.saveVersion(config2);

      const comparison = service.compareVersions(
        projectId,
        v1.metadata.id,
        v2.metadata.id
      );

      expect(comparison).toBeDefined();
      expect(comparison?.version1.id).toBe(v1.metadata.id);
      expect(comparison?.version2.id).toBe(v2.metadata.id);
      expect(comparison?.differences).toBeDefined();
    });

    it('should detect metadata changes', () => {
      const config1 = createMockConfig('First description');
      const config2 = createMockConfig('Second description');

      const v1 = service.saveVersion(config1);
      const v2 = service.saveVersion(config2);

      const comparison = service.compareVersions(
        projectId,
        v1.metadata.id,
        v2.metadata.id
      );

      const metadataDiff = comparison?.differences.find(d => d.type === 'metadata');
      expect(metadataDiff).toBeDefined();
      expect(metadataDiff?.description).toContain('description changed');
    });

    it('should return null for non-existent versions', () => {
      const comparison = service.compareVersions(
        projectId,
        'non-existent-1',
        'non-existent-2'
      );

      expect(comparison).toBeNull();
    });
  });

  describe('Version Deletion', () => {
    it('should delete a specific version', () => {
      const config = createMockConfig('Test config');
      const version = service.saveVersion(config);

      const deleted = service.deleteVersion(projectId, version.metadata.id);
      expect(deleted).toBe(true);

      const retrieved = service.getVersion(projectId, version.metadata.id);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent version', () => {
      const deleted = service.deleteVersion(projectId, 'non-existent-id');
      expect(deleted).toBe(false);
    });

    it('should delete all versions for a project', () => {
      const config = createMockConfig('Test config');

      service.saveVersion(config, { description: 'First' });
      service.saveVersion(config, { description: 'Second' });
      service.saveVersion(config, { description: 'Third' });

      service.deleteAllVersions(projectId);

      const versions = service.listVersions(projectId);
      expect(versions.length).toBe(0);
    });
  });

  describe('Storage Management', () => {
    it('should provide storage statistics', () => {
      const config = createMockConfig('Test config');

      service.saveVersion(config);
      service.saveVersion(config);

      const stats = service.getStorageStats(projectId);
      expect(stats.versionCount).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.averageSize).toBeGreaterThan(0);
    });

    it('should export version history', () => {
      const config = createMockConfig('Test config');

      service.saveVersion(config, { description: 'First' });
      service.saveVersion(config, { description: 'Second' });

      const blob = service.exportVersionHistory(projectId);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });
  });

  describe('Auto-Save', () => {
    it('should start and stop auto-save', () => {
      const config = createMockConfig('Test config');
      let callCount = 0;

      const getConfig = () => {
        callCount++;
        return config;
      };

      // Start auto-save with very short interval for testing
      service.startAutoSave(getConfig, 'Test User');

      // Stop immediately
      service.stopAutoSave();

      // Auto-save should not have triggered yet
      expect(callCount).toBe(0);
    });
  });
});
