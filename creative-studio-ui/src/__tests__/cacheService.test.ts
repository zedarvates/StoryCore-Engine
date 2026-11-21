/**
 * Tests unitaires pour CacheService
 * 
 * Couvre:
 * - Pattern singleton
 * - Opérations CRUD (set, get, has, delete, clear)
 * - Expiration TTL
 * - Nettoyage automatique (cleanup)
 * - Statistiques
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CacheService, CacheEntry, CacheOptions } from '@/services/CacheService';

// Mock du logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    // Reset singleton entre les tests
    (CacheService as unknown as { instance: undefined }).instance = undefined;
    cacheService = CacheService.getInstance();
    cacheService.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CacheService.getInstance();
      const instance2 = CacheService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create only one instance', () => {
      CacheService.getInstance();
      const newInstance = CacheService.getInstance();
      expect(newInstance).toBeDefined();
    });
  });

  describe('set() and get()', () => {
    it('should store and retrieve a value', () => {
      const key = 'test-key';
      const data = { name: 'test', value: 42 };

      cacheService.set(key, data);
      const result = cacheService.get<typeof data>(key);

      expect(result).toEqual(data);
    });

    it('should return null for non-existent key', () => {
      const result = cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should store different types of data', () => {
      // String
      cacheService.set('string-key', 'hello');
      expect(cacheService.get<string>('string-key')).toBe('hello');

      // Number
      cacheService.set('number-key', 123);
      expect(cacheService.get<number>('number-key')).toBe(123);

      // Boolean
      cacheService.set('bool-key', true);
      expect(cacheService.get<boolean>('bool-key')).toBe(true);

      // Array
      cacheService.set('array-key', [1, 2, 3]);
      expect(cacheService.get<number[]>('array-key')).toEqual([1, 2, 3]);

      // Object
      const obj = { id: 1, name: 'test' };
      cacheService.set('object-key', obj);
      expect(cacheService.get<typeof obj>('object-key')).toEqual(obj);
    });

    it('should overwrite existing key', () => {
      cacheService.set('key', 'value1');
      cacheService.set('key', 'value2');
      expect(cacheService.get<string>('key')).toBe('value2');
    });
  });

  describe('TTL (Time To Live)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return null for expired entry', () => {
      const ttl = 1000; // 1 seconde
      cacheService.set('expiring-key', 'data', { ttl });

      // Avancer le temps au-delà du TTL
      vi.advanceTimersByTime(1500);

      const result = cacheService.get<string>('expiring-key');
      expect(result).toBeNull();
    });

    it('should return data for non-expired entry', () => {
      const ttl = 5000; // 5 secondes
      cacheService.set('valid-key', 'data', { ttl });

      // Avancer le temps mais pas au-delà du TTL
      vi.advanceTimersByTime(3000);

      const result = cacheService.get<string>('valid-key');
      expect(result).toBe('data');
    });

    it('should use default TTL when not specified', () => {
      cacheService.set('default-ttl-key', 'data');

      // Le TTL par défaut est de 5 minutes (300000ms)
      vi.advanceTimersByTime(299000);
      expect(cacheService.get<string>('default-ttl-key')).toBe('data');

      vi.advanceTimersByTime(2000);
      expect(cacheService.get<string>('default-ttl-key')).toBeNull();
    });

    it('should delete expired entry on access', () => {
      const ttl = 100;
      cacheService.set('key', 'data', { ttl });

      vi.advanceTimersByTime(200);

      // L'accès devrait supprimer l'entrée expirée
      cacheService.get<string>('key');
      
      // Vérifier que has() retourne false
      expect(cacheService.has('key')).toBe(false);
    });
  });

  describe('has()', () => {
    it('should return true for existing key', () => {
      cacheService.set('key', 'value');
      expect(cacheService.has('key')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cacheService.has('non-existent')).toBe(false);
    });

    it('should return false for expired key', () => {
      vi.useFakeTimers();
      
      cacheService.set('key', 'value', { ttl: 100 });
      vi.advanceTimersByTime(200);
      
      expect(cacheService.has('key')).toBe(false);
      
      vi.useRealTimers();
    });
  });

  describe('delete()', () => {
    it('should delete an existing key', () => {
      cacheService.set('key', 'value');
      const result = cacheService.delete('key');
      
      expect(result).toBe(true);
      expect(cacheService.get('key')).toBeNull();
    });

    it('should return false for non-existent key', () => {
      const result = cacheService.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should clear all entries', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');

      cacheService.clear();

      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.get('key2')).toBeNull();
      expect(cacheService.get('key3')).toBeNull();
    });

    it('should reset size to 0', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      cacheService.clear();
      
      const stats = cacheService.getStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('getStats()', () => {
    it('should return correct size', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');

      const stats = cacheService.getStats();
      expect(stats.size).toBe(2);
    });

    it('should return stats object with required properties', () => {
      const stats = cacheService.getStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(typeof stats.size).toBe('number');
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should cleanup expired entries when cache is full', () => {
      // Remplir le cache avec des entrées qui vont expirer
      for (let i = 0; i < 100; i++) {
        cacheService.set(`key-${i}`, `value-${i}`, { ttl: 100 });
      }

      // Avancer le temps pour faire expirer les entrées
      vi.advanceTimersByTime(200);

      // Ajouter une nouvelle entrée qui déclenchera le cleanup
      cacheService.set('new-key', 'new-value');

      // Les anciennes entrées devraient être nettoyées
      expect(cacheService.get('key-0')).toBeNull();
      expect(cacheService.get('new-key')).toBe('new-value');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      cacheService.set('null-key', null);
      const result = cacheService.get<null>('null-key');
      expect(result).toBeNull();
    });

    it('should handle undefined values', () => {
      cacheService.set('undefined-key', undefined);
      const result = cacheService.get<undefined>('undefined-key');
      expect(result).toBeUndefined();
    });

    it('should handle empty string', () => {
      cacheService.set('empty-key', '');
      expect(cacheService.get<string>('empty-key')).toBe('');
    });

    it('should handle empty object', () => {
      cacheService.set('empty-obj-key', {});
      expect(cacheService.get<object>('empty-obj-key')).toEqual({});
    });

    it('should handle empty array', () => {
      cacheService.set('empty-arr-key', []);
      expect(cacheService.get<unknown[]>('empty-arr-key')).toEqual([]);
    });

    it('should handle special characters in key', () => {
      const specialKey = 'key-with-special-chars!@#$%^&*()';
      cacheService.set(specialKey, 'value');
      expect(cacheService.get<string>(specialKey)).toBe('value');
    });

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(1000);
      cacheService.set(longKey, 'value');
      expect(cacheService.get<string>(longKey)).toBe('value');
    });

    it('should handle large data', () => {
      const largeData = 'x'.repeat(100000);
      cacheService.set('large-key', largeData);
      expect(cacheService.get<string>('large-key')).toBe(largeData);
    });
  });

  describe('CacheOptions', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should respect custom TTL option', () => {
      const customTTL = 10000;
      cacheService.set('custom-ttl-key', 'data', { ttl: customTTL });

      vi.advanceTimersByTime(9999);
      expect(cacheService.get<string>('custom-ttl-key')).toBe('data');

      vi.advanceTimersByTime(2);
      expect(cacheService.get<string>('custom-ttl-key')).toBeNull();
    });

    it('should handle zero TTL', () => {
      cacheService.set('zero-ttl-key', 'data', { ttl: 0 });
      
      // Avec TTL de 0, l'entrée devrait expirer immédiatement
      vi.advanceTimersByTime(1);
      expect(cacheService.get<string>('zero-ttl-key')).toBeNull();
    });
  });
});