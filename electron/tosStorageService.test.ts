/**
 * Unit tests for TOSStorageService
 * 
 * Tests cover:
 * - Saving acceptance with timestamp and version
 * - Checking acceptance status
 * - Handling first-time users
 * - Version change detection
 * - Banner dismissal
 * - Persistence across instances
 * - Error handling
 * 
 * Requirements: 4.2.1, 4.2.2, 4.2.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TOSStorageService, TOSAcceptance } from './tosStorageService';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// Mock Electron app
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/user/data'),
  },
}));

describe('TOSStorageService', () => {
  let service: TOSStorageService;
  let storagePath: string;

  beforeEach(() => {
    // Create service with test version
    service = new TOSStorageService('1.0');
    storagePath = service.getStoragePath();

    // Ensure clean state
    if (fs.existsSync(storagePath)) {
      fs.unlinkSync(storagePath);
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(storagePath)) {
      fs.unlinkSync(storagePath);
    }
  });

  describe('saveAcceptance', () => {
    it('should save acceptance with timestamp and version', async () => {
      const beforeTimestamp = Date.now();
      
      await service.saveAcceptance();
      
      const afterTimestamp = Date.now();

      // Verify file exists
      expect(fs.existsSync(storagePath)).toBe(true);

      // Read and verify content
      const jsonData = fs.readFileSync(storagePath, 'utf-8');
      const data: TOSAcceptance = JSON.parse(jsonData);

      expect(data.accepted).toBe(true);
      expect(data.version).toBe('1.0');
      expect(data.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(data.timestamp).toBeLessThanOrEqual(afterTimestamp);
      expect(data.dismissedBanner).toBe(false);
    });

    it('should save acceptance with custom version', async () => {
      await service.saveAcceptance('2.0');

      const jsonData = fs.readFileSync(storagePath, 'utf-8');
      const data: TOSAcceptance = JSON.parse(jsonData);

      expect(data.version).toBe('2.0');
    });

    it('should overwrite existing acceptance', async () => {
      // Save first acceptance
      await service.saveAcceptance('1.0');
      const firstData = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      // Save second acceptance
      await service.saveAcceptance('2.0');
      const secondData = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));

      expect(secondData.version).toBe('2.0');
      expect(secondData.timestamp).toBeGreaterThan(firstData.timestamp);
    });

    it('should throw error if save fails', async () => {
      // Mock fs.promises.writeFile to throw error
      const originalWriteFile = fs.promises.writeFile;
      vi.spyOn(fs.promises, 'writeFile').mockRejectedValue(new Error('Write failed'));

      await expect(service.saveAcceptance()).rejects.toThrow('Failed to save TOS acceptance');

      // Restore original
      fs.promises.writeFile = originalWriteFile;
    });
  });

  describe('checkAcceptance', () => {
    it('should return null for first-time users', async () => {
      const acceptance = await service.checkAcceptance();
      expect(acceptance).toBeNull();
    });

    it('should return acceptance data after saving', async () => {
      await service.saveAcceptance('1.0');

      const acceptance = await service.checkAcceptance();

      expect(acceptance).not.toBeNull();
      expect(acceptance?.accepted).toBe(true);
      expect(acceptance?.version).toBe('1.0');
      expect(acceptance?.timestamp).toBeGreaterThan(0);
    });

    it('should return null if file is corrupted', async () => {
      // Write invalid JSON
      fs.writeFileSync(storagePath, 'invalid json', 'utf-8');

      const acceptance = await service.checkAcceptance();
      expect(acceptance).toBeNull();
    });

    it('should return null if data structure is invalid', async () => {
      // Write incomplete data
      const invalidData = { accepted: true }; // Missing timestamp and version
      fs.writeFileSync(storagePath, JSON.stringify(invalidData), 'utf-8');

      const acceptance = await service.checkAcceptance();
      expect(acceptance).toBeNull();
    });

    it('should handle read errors gracefully', async () => {
      // Create file with no read permissions (Unix-like systems)
      if (process.platform !== 'win32') {
        fs.writeFileSync(storagePath, '{}', 'utf-8');
        fs.chmodSync(storagePath, 0o000);

        const acceptance = await service.checkAcceptance();
        expect(acceptance).toBeNull();

        // Restore permissions for cleanup
        fs.chmodSync(storagePath, 0o644);
      }
    });
  });

  describe('needsReview', () => {
    it('should return true for first-time users', async () => {
      const needsReview = await service.needsReview();
      expect(needsReview).toBe(true);
    });

    it('should return false if current version is accepted', async () => {
      await service.saveAcceptance('1.0');

      const needsReview = await service.needsReview();
      expect(needsReview).toBe(false);
    });

    it('should return true if version changed', async () => {
      // Save old version
      await service.saveAcceptance('1.0');

      // Create service with new version
      const newService = new TOSStorageService('2.0');

      const needsReview = await newService.needsReview();
      expect(needsReview).toBe(true);
    });

    it('should return false if version changed but banner dismissed', async () => {
      // Save old version
      await service.saveAcceptance('1.0');

      // Dismiss banner
      await service.dismissBanner();

      // Create service with new version
      const newService = new TOSStorageService('2.0');

      const needsReview = await newService.needsReview();
      expect(needsReview).toBe(false);
    });
  });

  describe('shouldShowDialog', () => {
    it('should return true for first-time users', async () => {
      const shouldShow = await service.shouldShowDialog();
      expect(shouldShow).toBe(true);
    });

    it('should return false if current version is accepted', async () => {
      await service.saveAcceptance('1.0');

      const shouldShow = await service.shouldShowDialog();
      expect(shouldShow).toBe(false);
    });

    it('should return true if version changed', async () => {
      // Save old version
      await service.saveAcceptance('1.0');

      // Create service with new version
      const newService = new TOSStorageService('2.0');

      const shouldShow = await newService.shouldShowDialog();
      expect(shouldShow).toBe(true);
    });

    it('should return true even if banner dismissed (dialog required for new version)', async () => {
      // Save old version
      await service.saveAcceptance('1.0');

      // Dismiss banner
      await service.dismissBanner();

      // Create service with new version
      const newService = new TOSStorageService('2.0');

      const shouldShow = await newService.shouldShowDialog();
      expect(shouldShow).toBe(true);
    });
  });

  describe('dismissBanner', () => {
    it('should set dismissedBanner flag', async () => {
      await service.saveAcceptance('1.0');
      await service.dismissBanner();

      const acceptance = await service.checkAcceptance();
      expect(acceptance?.dismissedBanner).toBe(true);
    });

    it('should not throw if no acceptance record exists', async () => {
      await expect(service.dismissBanner()).resolves.not.toThrow();
    });

    it('should preserve other acceptance data', async () => {
      await service.saveAcceptance('1.0');
      const beforeDismiss = await service.checkAcceptance();

      await service.dismissBanner();
      const afterDismiss = await service.checkAcceptance();

      expect(afterDismiss?.accepted).toBe(beforeDismiss?.accepted);
      expect(afterDismiss?.version).toBe(beforeDismiss?.version);
      expect(afterDismiss?.timestamp).toBe(beforeDismiss?.timestamp);
      expect(afterDismiss?.dismissedBanner).toBe(true);
    });

    it('should throw error if save fails', async () => {
      await service.saveAcceptance('1.0');

      // Mock fs.promises.writeFile to throw error
      const originalWriteFile = fs.promises.writeFile;
      vi.spyOn(fs.promises, 'writeFile').mockRejectedValue(new Error('Write failed'));

      await expect(service.dismissBanner()).rejects.toThrow('Failed to dismiss TOS banner');

      // Restore original
      fs.promises.writeFile = originalWriteFile;
    });
  });

  describe('clearAcceptance', () => {
    it('should delete acceptance file', async () => {
      await service.saveAcceptance('1.0');
      expect(fs.existsSync(storagePath)).toBe(true);

      await service.clearAcceptance();
      expect(fs.existsSync(storagePath)).toBe(false);
    });

    it('should not throw if file does not exist', async () => {
      await expect(service.clearAcceptance()).resolves.not.toThrow();
    });

    it('should throw error if delete fails', async () => {
      await service.saveAcceptance('1.0');

      // Mock fs.promises.unlink to throw error
      const originalUnlink = fs.promises.unlink;
      vi.spyOn(fs.promises, 'unlink').mockRejectedValue(new Error('Delete failed'));

      await expect(service.clearAcceptance()).rejects.toThrow('Failed to clear TOS acceptance');

      // Restore original
      fs.promises.unlink = originalUnlink;
    });
  });

  describe('persistence across instances', () => {
    it('should persist acceptance across service instances', async () => {
      // Save with first instance
      await service.saveAcceptance('1.0');

      // Create new instance
      const newService = new TOSStorageService('1.0');
      const acceptance = await newService.checkAcceptance();

      expect(acceptance).not.toBeNull();
      expect(acceptance?.accepted).toBe(true);
      expect(acceptance?.version).toBe('1.0');
    });

    it('should detect version changes across instances', async () => {
      // Save with version 1.0
      await service.saveAcceptance('1.0');

      // Create instance with version 2.0
      const newService = new TOSStorageService('2.0');
      const needsReview = await newService.needsReview();

      expect(needsReview).toBe(true);
    });
  });

  describe('getCurrentVersion', () => {
    it('should return current version', () => {
      expect(service.getCurrentVersion()).toBe('1.0');
    });

    it('should return custom version', () => {
      const customService = new TOSStorageService('2.5');
      expect(customService.getCurrentVersion()).toBe('2.5');
    });
  });

  describe('getStoragePath', () => {
    it('should return storage path', () => {
      const storagePath = service.getStoragePath();
      expect(storagePath).toContain('tos-acceptance.json');
      expect(storagePath).toContain('/mock/user/data');
    });

    it('should use app.getPath("userData")', () => {
      service.getStoragePath();
      expect(app.getPath).toHaveBeenCalledWith('userData');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete first-time user flow', async () => {
      // Check initial state
      expect(await service.shouldShowDialog()).toBe(true);
      expect(await service.needsReview()).toBe(true);
      expect(await service.checkAcceptance()).toBeNull();

      // User accepts TOS
      await service.saveAcceptance();

      // Check after acceptance
      expect(await service.shouldShowDialog()).toBe(false);
      expect(await service.needsReview()).toBe(false);
      
      const acceptance = await service.checkAcceptance();
      expect(acceptance?.accepted).toBe(true);
    });

    it('should handle TOS version update flow', async () => {
      // User accepts version 1.0
      await service.saveAcceptance('1.0');
      expect(await service.shouldShowDialog()).toBe(false);

      // App updates to version 2.0
      const newService = new TOSStorageService('2.0');
      expect(await newService.shouldShowDialog()).toBe(true);
      expect(await newService.needsReview()).toBe(true);

      // User accepts new version
      await newService.saveAcceptance();
      expect(await newService.shouldShowDialog()).toBe(false);
      expect(await newService.needsReview()).toBe(false);
    });

    it('should handle banner dismissal flow', async () => {
      // User accepts version 1.0
      await service.saveAcceptance('1.0');

      // App updates to version 2.0
      const newService = new TOSStorageService('2.0');
      expect(await newService.needsReview()).toBe(true);

      // User dismisses banner (but hasn't accepted new version)
      await newService.dismissBanner();
      expect(await newService.needsReview()).toBe(false);

      // Dialog should still be shown on next launch
      expect(await newService.shouldShowDialog()).toBe(true);
    });
  });
});
