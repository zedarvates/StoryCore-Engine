/**
 * Test Suite: Draft Storage Service
 * Tests the DraftStorageService for production wizards
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DraftStorageService, DraftMetadata } from '../draftStorage';

// Mock localStorage for fallback testing
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Electron API
const electronMock = {
  secureStorage: {
    encrypt: vi.fn((data: string) => Promise.resolve(`encrypted-${data}`)),
    decrypt: vi.fn((data: string) => Promise.resolve(data.replace('encrypted-', ''))),
    set: vi.fn((_key: string, _value: string) => Promise.resolve()),
    get: vi.fn((_key: string): Promise<string | null> => Promise.resolve(null)),
    delete: vi.fn((_key: string) => Promise.resolve()),
    list: vi.fn((_prefix?: string): Promise<string[]> => Promise.resolve([])),
  },
};

Object.defineProperty(window, 'electron', {
  value: electronMock,
  writable: true,
});

// Mock fs for Electron main process (if needed)
// This would be for integration tests with the actual Electron handlers

describe('DraftStorageService', () => {
  let service: DraftStorageService;

  beforeEach(() => {
    service = new DraftStorageService();
    vi.clearAllMocks();

    // Reset mocks
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    electronMock.secureStorage.set.mockResolvedValue(undefined);
    electronMock.secureStorage.get.mockResolvedValue(null);
    electronMock.secureStorage.list.mockResolvedValue([]);
  });

  describe('Save Draft', () => {
    it('should save a draft successfully', async () => {
      const testData = {
        id: 'test-sequence',
        name: 'Test Sequence',
        description: 'A test sequence',
        worldId: 'world-1',
        targetDuration: 300,
        frameRate: 30,
        resolution: { width: 1920, height: 1080 },
        acts: [],
        scenes: [],
        shots: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        status: 'draft' as const,
        tags: [],
      };

      electronMock.secureStorage.set.mockResolvedValueOnce(undefined);

      const draftId = await service.saveDraft('sequence-plan', testData);

      expect(draftId).toBeDefined();
      expect(typeof draftId).toBe('string');
      expect(electronMock.secureStorage.set).toHaveBeenCalledTimes(1);
    });

    it('should handle save errors gracefully', async () => {
      const testData = {
        id: 'test-sequence',
        name: 'Test Sequence',
        description: 'A test sequence',
        worldId: 'world-1',
        targetDuration: 300,
        frameRate: 30,
        resolution: { width: 1920, height: 1080 },
        acts: [],
        scenes: [],
        shots: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        status: 'draft' as const,
        tags: [],
      };

      electronMock.secureStorage.set.mockRejectedValueOnce(new Error('Storage error'));

      await expect(service.saveDraft('sequence-plan', testData)).rejects.toThrow('Draft save failed');
    });

    it('should enforce maximum drafts per type', async () => {
      // Create service with low limit for testing
      const limitedService = new DraftStorageService();
      limitedService.setMaxDraftsPerType(2);

      // Mock existing drafts
      electronMock.secureStorage.list.mockResolvedValue([
        'production-wizard-sequence-plan-draft1',
        'production-wizard-sequence-plan-draft2',
        'production-wizard-sequence-plan-draft3', // This should be deleted
      ]);
      electronMock.secureStorage.delete.mockResolvedValue(undefined);

      const testData = {
        id: 'test-sequence',
        name: 'Test Sequence',
        description: 'A test sequence',
        worldId: 'world-1',
        targetDuration: 300,
        frameRate: 30,
        resolution: { width: 1920, height: 1080 },
        acts: [],
        scenes: [],
        shots: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        status: 'draft' as const,
        tags: [],
      };
      await limitedService.saveDraft('sequence-plan', testData);

      expect(electronMock.secureStorage.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Load Draft', () => {
    it('should load an existing draft', async () => {
      const testData = { name: 'Test Sequence', value: 42 };
      const mockEncryptedData = JSON.stringify({
        id: 'test-draft',
        wizardType: 'sequence-plan',
        timestamp: Date.now(),
        data: testData,
        version: '1.0',
      });

      electronMock.secureStorage.get.mockResolvedValueOnce(`encrypted-${mockEncryptedData}`);

      const result = await service.loadDraft('sequence-plan', 'test-draft');

      expect(result).toEqual(testData);
      expect(electronMock.secureStorage.get).toHaveBeenCalledWith('production-wizard-sequence-plan-test-draft');
    });

    it('should return null for non-existent draft', async () => {
      electronMock.secureStorage.get.mockResolvedValueOnce(null);

      const result = await service.loadDraft('sequence-plan', 'non-existent');

      expect(result).toBeNull();
    });

    it('should return null for expired draft', async () => {
      const expiredTimestamp = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days ago
      const mockEncryptedData = JSON.stringify({
        id: 'expired-draft',
        wizardType: 'sequence-plan',
        timestamp: expiredTimestamp,
        data: { name: 'Expired' },
        version: '1.0',
      });

      electronMock.secureStorage.get.mockResolvedValueOnce(`encrypted-${mockEncryptedData}`);
      electronMock.secureStorage.delete.mockResolvedValueOnce(undefined);

      const result = await service.loadDraft('sequence-plan', 'expired-draft');

      expect(result).toBeNull();
      expect(electronMock.secureStorage.delete).toHaveBeenCalledTimes(1);
    });

    it('should handle corrupted draft data', async () => {
      electronMock.secureStorage.get.mockResolvedValueOnce('encrypted-invalid-json');

      const result = await service.loadDraft('sequence-plan', 'corrupted');

      expect(result).toBeNull();
    });
  });

  describe('List Drafts', () => {
    it('should list drafts with metadata', async () => {
      const mockDrafts = [
        {
          id: 'draft1',
          wizardType: 'sequence-plan',
          timestamp: Date.now(),
          preview: 'Test Draft 1',
          completionPercentage: 75,
          lastModified: Date.now(),
        },
        {
          id: 'draft2',
          wizardType: 'shot',
          timestamp: Date.now() - 1000,
          preview: 'Test Draft 2',
          completionPercentage: 50,
          lastModified: Date.now() - 1000,
        },
      ];

      electronMock.secureStorage.list.mockResolvedValueOnce([
        'production-wizard-sequence-plan-draft1',
        'production-wizard-shot-draft2',
      ]);

      // Mock individual draft loading
      electronMock.secureStorage.get
        .mockResolvedValueOnce(JSON.stringify({
          id: 'draft1',
          wizardType: 'sequence-plan',
          timestamp: Date.now(),
          data: { name: 'Test Draft 1' },
          version: '1.0',
        }))
        .mockResolvedValueOnce(JSON.stringify({
          id: 'draft2',
          wizardType: 'shot',
          timestamp: Date.now() - 1000,
          data: { name: 'Test Draft 2' },
          version: '1.0',
        }));

      const drafts = await service.listDrafts();

      expect(drafts).toHaveLength(2);
      expect(drafts[0].wizardType).toBe('sequence-plan');
      expect(drafts[1].wizardType).toBe('shot');
      // Should be sorted by timestamp (newest first)
      expect(drafts[0].timestamp).toBeGreaterThan(drafts[1].timestamp);
    });

    it('should filter drafts by wizard type', async () => {
      electronMock.secureStorage.list.mockImplementation((prefix) => {
        if (prefix === 'sequence-plan') {
          return Promise.resolve(['production-wizard-sequence-plan-draft1']);
        }
        return Promise.resolve([]);
      });

      electronMock.secureStorage.get.mockResolvedValueOnce(JSON.stringify({
        id: 'draft1',
        wizardType: 'sequence-plan',
        timestamp: Date.now(),
        data: { name: 'Sequence Draft' },
        version: '1.0',
      }));

      const drafts = await service.listDrafts('sequence-plan');

      expect(drafts).toHaveLength(1);
      expect(drafts[0].wizardType).toBe('sequence-plan');
    });

    it('should handle corrupted draft files gracefully', async () => {
      electronMock.secureStorage.list.mockResolvedValueOnce([
        'production-wizard-sequence-plan-draft1',
        'production-wizard-sequence-plan-draft2',
      ]);

      electronMock.secureStorage.get
        .mockResolvedValueOnce(JSON.stringify({
          id: 'draft1',
          wizardType: 'sequence-plan',
          timestamp: Date.now(),
          data: { name: 'Valid Draft' },
          version: '1.0',
        }))
        .mockResolvedValueOnce('encrypted-invalid-json'); // Corrupted

      const drafts = await service.listDrafts();

      expect(drafts).toHaveLength(1); // Only valid draft should be included
      expect(drafts[0].id).toBe('draft1');
    });
  });

  describe('Delete Draft', () => {
    it('should delete a draft successfully', async () => {
      electronMock.secureStorage.delete.mockResolvedValueOnce(undefined);

      await expect(service.deleteDraft('sequence-plan', 'test-draft')).resolves.toBeUndefined();

      expect(electronMock.secureStorage.delete).toHaveBeenCalledWith('production-wizard-sequence-plan-test-draft');
    });

    it('should handle delete errors', async () => {
      electronMock.secureStorage.delete.mockRejectedValueOnce(new Error('Delete failed'));

      await expect(service.deleteDraft('sequence-plan', 'test-draft')).rejects.toThrow('Draft deletion failed');
    });
  });

  describe('Clear All Drafts', () => {
    it('should clear all drafts for a wizard type', async () => {
      electronMock.secureStorage.list.mockResolvedValueOnce([
        'production-wizard-sequence-plan-draft1',
        'production-wizard-sequence-plan-draft2',
      ]);

      electronMock.secureStorage.delete.mockResolvedValue(undefined);

      await service.clearAllDrafts('sequence-plan');

      expect(electronMock.secureStorage.delete).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when clearing drafts', async () => {
      electronMock.secureStorage.list.mockRejectedValueOnce(new Error('List failed'));

      await expect(service.clearAllDrafts('sequence-plan')).rejects.toThrow('Clear all drafts failed');
    });
  });

  describe('Fallback to localStorage', () => {
    beforeEach(() => {
      // Remove electron mock to test fallback
      delete (window as any).electron;
    });

    afterEach(() => {
      // Restore electron mock
      (window as any).electron = electronMock;
    });

    it('should use localStorage when Electron is not available', async () => {
      const testData = {
        id: 'test-id',
        name: 'Fallback Test',
        description: 'Test description',
        worldId: 'world-1',
        targetDuration: 300,
        frameRate: 30,
        resolution: { width: 1920, height: 1080 },
        acts: [],
        scenes: [],
        shots: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        status: 'draft' as const,
        tags: [],
      };

      await service.saveDraft('sequence-plan', testData);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const call = localStorageMock.setItem.mock.calls[0];
      expect(call[0]).toContain('production-wizard-sequence-plan-');
    });
  });
});
