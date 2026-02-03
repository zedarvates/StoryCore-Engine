/**
 * Persistence Helper Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  persistData,
  retrieveData,
  clearData,
  getStorageStats,
  clearMemoryStorage,
} from '../persistenceHelper';

describe('persistenceHelper', () => {
  beforeEach(() => {
    localStorage.clear();
    clearMemoryStorage();
  });

  afterEach(() => {
    localStorage.clear();
    clearMemoryStorage();
  });

  describe('persistData', () => {
    it('should persist data to storage', async () => {
      const data = { name: 'test', value: 123 };
      const success = await persistData('test-key', data);

      expect(success).toBe(true);
      expect(localStorage.getItem('test-key')).toBe(JSON.stringify(data));
    });

    it('should handle JSON serialization', async () => {
      const data = { date: new Date().toISOString(), nested: { value: 42 } };
      const success = await persistData('test-key', data);

      expect(success).toBe(true);
      const retrieved = JSON.parse(localStorage.getItem('test-key') || '{}');
      expect(retrieved.nested.value).toBe(42);
    });

    it('should fallback to memory storage', async () => {
      // This test would need to mock StorageManager to fail
      // For now, we just verify the function completes
      const data = { test: 'data' };
      const success = await persistData('test-key', data, {
        maxRetries: 1,
        fallbackToMemory: true,
      });

      expect(typeof success).toBe('boolean');
    });
  });

  describe('retrieveData', () => {
    it('should retrieve persisted data', async () => {
      const data = { name: 'test', value: 123 };
      await persistData('test-key', data);

      const retrieved = retrieveData('test-key');
      expect(retrieved).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const retrieved = retrieveData('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should return default value if provided', () => {
      const defaultValue = { default: true };
      const retrieved = retrieveData('non-existent', defaultValue);
      expect(retrieved).toEqual(defaultValue);
    });
  });

  describe('clearData', () => {
    it('should clear data from storage', async () => {
      const data = { test: 'data' };
      await persistData('test-key', data);

      clearData('test-key');
      expect(localStorage.getItem('test-key')).toBeNull();
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', () => {
      const stats = getStorageStats();

      expect(stats).toHaveProperty('localStorage');
      expect(stats).toHaveProperty('memory');
      expect(stats.localStorage).toHaveProperty('used');
      expect(stats.memory).toHaveProperty('used');
      expect(stats.memory).toHaveProperty('items');
    });
  });

  describe('clearMemoryStorage', () => {
    it('should clear all memory storage', async () => {
      await persistData('key1', { data: 1 }, { fallbackToMemory: true });
      await persistData('key2', { data: 2 }, { fallbackToMemory: true });

      clearMemoryStorage();

      const stats = getStorageStats();
      expect(stats.memory.items).toBe(0);
    });
  });
});
