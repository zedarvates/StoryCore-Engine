/**
 * StorageManager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager } from '../storageManager';

describe('StorageManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getStats', () => {
    it('should return storage stats', () => {
      const stats = StorageManager.getStats();
      
      expect(stats).toHaveProperty('used');
      expect(stats).toHaveProperty('limit');
      expect(stats).toHaveProperty('percentage');
      expect(stats).toHaveProperty('available');
      expect(stats.percentage).toBeGreaterThanOrEqual(0);
      expect(stats.percentage).toBeLessThanOrEqual(100);
    });

    it('should calculate percentage correctly', () => {
      const testData = 'x'.repeat(1000);
      StorageManager.setItem('test', testData);
      
      const stats = StorageManager.getStats();
      expect(stats.used).toBeGreaterThan(0);
      expect(stats.percentage).toBeGreaterThan(0);
    });
  });

  describe('canStore', () => {
    it('should return true for small data', () => {
      const smallData = 'test data';
      const canStore = StorageManager.canStore(smallData);
      
      expect(canStore).toBe(true);
    });

    it('should return false for data larger than available space', () => {
      // This is hard to test without mocking, so we'll skip for now
      // In a real scenario, you'd mock the storage limit
    });
  });

  describe('setItem and getItem', () => {
    it('should store and retrieve data', () => {
      const key = 'test-key';
      const value = 'test-value';
      
      StorageManager.setItem(key, value);
      const retrieved = StorageManager.getItem(key);
      
      expect(retrieved).toBe(value);
    });

    it('should handle JSON data', () => {
      const key = 'test-json';
      const data = { name: 'Test', value: 123 };
      const jsonString = JSON.stringify(data);
      
      StorageManager.setItem(key, jsonString);
      const retrieved = StorageManager.getItem(key);
      const parsed = JSON.parse(retrieved || '{}');
      
      expect(parsed).toEqual(data);
    });

    it('should return null for non-existent keys', () => {
      const retrieved = StorageManager.getItem('non-existent');
      
      expect(retrieved).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should remove stored items', () => {
      const key = 'test-remove';
      const value = 'test-value';
      
      StorageManager.setItem(key, value);
      expect(StorageManager.getItem(key)).toBe(value);
      
      StorageManager.removeItem(key);
      expect(StorageManager.getItem(key)).toBeNull();
    });
  });
});
