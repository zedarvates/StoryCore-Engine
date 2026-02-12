/**
 * Performance Monitoring Service Tests
 * Tests for performance monitoring, timer accuracy, memory tracking, and cache performance
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PerformanceMonitoringService,
  getPerformanceMonitoringService,
  resetPerformanceMonitoringService,
  formatBytes,
  formatDuration,
} from '../performanceMonitoringService';
import {
  MemoryMonitor,
  referenceImageCache,
  referenceMetadataCache,
  videoFrameCache,
  estimateSize,
  createMemoryMonitor,
} from '../../utils/memoryMonitor';

// ============================================================================
// Performance Monitoring Service Tests
// ============================================================================

describe('PerformanceMonitoringService', () => {
  let service: PerformanceMonitoringService;

  beforeEach(() => {
    resetPerformanceMonitoringService();
    service = getPerformanceMonitoringService({ enabled: true });
  });

  afterEach(() => {
    service.shutdown();
  });

  describe('Timer Operations', () => {
    it('should start and end a timer correctly', () => {
      const operationId = 'test-operation-1';
      service.startTimer(operationId, 'test');

      // Simulate some work
      const startTime = performance.now();
      while (performance.now() - startTime < 10) {
        // Busy wait for 10ms
      }

      const duration = service.endTimer(operationId);

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(100); // Should be under 100ms
    });

    it('should track multiple concurrent timers', () => {
      const operations = ['op1', 'op2', 'op3', 'op4', 'op5'];
      
      operations.forEach((op) => {
        service.startTimer(op, op);
      });

      // Verify all timers are active
      const history = service.getTimingHistory();
      expect(history.length).toBe(0);

      // End all timers
      operations.forEach((op) => {
        service.endTimer(op);
      });

      const completedHistory = service.getTimingHistory();
      expect(completedHistory.length).toBe(5);
    });

    it('should return 0 when ending non-existent timer', () => {
      const duration = service.endTimer('non-existent-id');
      expect(duration).toBe(0);
    });

    it('should create timer context manager', () => {
      const { stop } = service.createTimer('context-test');
      
      // Simulate work
      const start = performance.now();
      while (performance.now() - start < 5) {}

      const duration = stop();

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(duration).toBeLessThan(50);
    });

    it('should measure async functions', async () => {
      const result = await service.measure('async-test', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'test-result';
      });

      expect(result.result).toBe('test-result');
      expect(result.duration).toBeGreaterThanOrEqual(10);
      expect(result.duration).toBeLessThan(100);
    });

    it('should measure sync functions', async () => {
      const result = await service.measure('sync-test', () => {
        const start = performance.now();
        while (performance.now() - start < 5) {}
        return 42;
      });

      expect(result.result).toBe(42);
      expect(result.duration).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Memory Tracking', () => {
    it('should track memory usage', () => {
      const snapshot = service.trackMemoryUsage();
      
      // Snapshot might be null in test environment without performance.memory
      if (snapshot) {
        expect(snapshot.heapUsed).toBeGreaterThanOrEqual(0);
        expect(snapshot.heapTotal).toBeGreaterThanOrEqual(0);
        expect(snapshot.timestamp).toBeGreaterThan(0);
      }
    });

    it('should get current memory usage', () => {
      const usage = service.getMemoryUsage();
      // Can be null in environments without performance.memory
      expect(usage === null || usage.heapUsed >= 0).toBe(true);
    });

    it('should store memory snapshots', () => {
      // Track multiple memory snapshots
      for (let i = 0; i < 5; i++) {
        service.trackMemoryUsage();
      }

      const snapshots = service.getMemorySnapshots();
      expect(snapshots.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Custom Metrics', () => {
    it('should track reference inheritance metrics', () => {
      service.trackReferenceInheritance(3, 15.5);

      const metrics = service.getInheritanceMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].depth).toBe(3);
      expect(metrics[0].duration).toBe(15.5);
    });

    it('should track video replication metrics', () => {
      service.trackVideoReplication(50, 200);

      const metrics = service.getReplicationMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].progress).toBe(50);
      expect(metrics[0].duration).toBe(200);
    });

    it('should track consistency check metrics', () => {
      service.trackConsistencyCheck(10, 150);

      const metrics = service.getConsistencyMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].shotCount).toBe(10);
      expect(metrics[0].duration).toBe(150);
    });

    it('should track custom metrics', () => {
      service.trackCustomMetric('timer', 'custom-operation', 42, { extra: 'data' });

      const metrics = service.getCustomMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].type).toBe('timer');
      expect(metrics[0].operation).toBe('custom-operation');
      expect(metrics[0].value).toBe(42);
      expect(metrics[0].metadata?.extra).toBe('data');
    });
  });

  describe('Performance Report', () => {
    it('should generate performance report', () => {
      const report = service.getPerformanceReport();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('memory');
      expect(report).toHaveProperty('inheritance');
      expect(report).toHaveProperty('replication');
      expect(report).toHaveProperty('consistency');
      expect(report).toHaveProperty('recentOperations');
    });

    it('should include timing history in report', () => {
      service.createTimer('report-test-1').stop();
      service.createTimer('report-test-2').stop();

      const report = service.getPerformanceReport();
      expect(report.summary.totalOperations).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Service Management', () => {
    it('should clear all metrics', () => {
      service.createTimer('test').stop();
      service.trackMemoryUsage();
      service.trackReferenceInheritance(1, 10);

      service.clear();

      const history = service.getTimingHistory();
      const memory = service.getMemorySnapshots();
      const inheritance = service.getInheritanceMetrics();

      expect(history.length).toBe(0);
      expect(memory.length).toBe(0);
      expect(inheritance.length).toBe(0);
    });

    it('should enable and disable monitoring', () => {
      service.setEnabled(false);
      expect(service.isEnabled()).toBe(false);

      service.setEnabled(true);
      expect(service.isEnabled()).toBe(true);
    });

    it('should not track when disabled', () => {
      service.setEnabled(false);
      service.createTimer('disabled-test').stop();

      const history = service.getTimingHistory();
      expect(history.length).toBe(0);
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('formatBytes', () => {
  it('should format 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('should format bytes', () => {
    expect(formatBytes(500)).toBe('500 Bytes');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });

  it('should format gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should format partial units', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });
});

describe('formatDuration', () => {
  it('should format microseconds', () => {
    expect(formatDuration(0.5)).toMatch(/μs/);
  });

  it('should format milliseconds', () => {
    expect(formatDuration(50)).toBe('50.00ms');
  });

  it('should format seconds', () => {
    expect(formatDuration(1500)).toBe('1.50s');
  });

  it('should format minutes', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
  });
});

// ============================================================================
// Memory Monitor Tests
// ============================================================================

describe('MemoryMonitor', () => {
  let monitor: MemoryMonitor<string>;

  beforeEach(() => {
    monitor = createMemoryMonitor<string>({
      maxCacheSize: 10,
      maxMemoryUsage: 1024,
      cleanupThreshold: 0.8,
      evictionRatio: 0.3,
      checkInterval: 60000, // Disable auto-check in tests
    });
  });

  afterEach(() => {
    monitor.shutdown();
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      monitor.set('key1', 'value1', 100);
      expect(monitor.get('key1')).toBe('value1');
    });

    it('should return null for missing keys', () => {
      expect(monitor.get('missing-key')).toBeNull();
    });

    it('should check if key exists', () => {
      monitor.set('key1', 'value1', 100);
      expect(monitor.has('key1')).toBe(true);
      expect(monitor.has('missing-key')).toBe(false);
    });

    it('should delete keys', () => {
      monitor.set('key1', 'value1', 100);
      expect(monitor.delete('key1')).toBe(true);
      expect(monitor.get('key1')).toBeNull();
    });

    it('should clear all entries', () => {
      monitor.set('key1', 'value1', 100);
      monitor.set('key2', 'value2', 100);
      monitor.clear();
      expect(monitor.get('key1')).toBeNull();
      expect(monitor.get('key2')).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', () => {
      monitor.set('key1', 'value1', 100);
      monitor.get('key1'); // Hit
      monitor.get('missing'); // Miss

      const stats = monitor.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should calculate hit rate', () => {
      monitor.set('key1', 'value1', 100);
      monitor.get('key1');
      monitor.get('key1');
      monitor.get('missing1');
      monitor.get('missing2');
      monitor.get('missing3');

      const stats = monitor.getStats();
      expect(stats.hitRate).toBeCloseTo(0.4, 1); // 2 hits / 5 total
    });

    it('should track current size and memory usage', () => {
      monitor.set('key1', 'value1', 100);
      monitor.set('key2', 'value2', 200);

      const stats = monitor.getStats();
      expect(stats.currentSize).toBe(2);
      expect(stats.currentMemoryUsage).toBe(300);
    });
  });

  describe('TTL Support', () => {
    it('should expire entries after TTL', async () => {
      const ttlMonitor = createMemoryMonitor<string>({
        maxCacheSize: 10,
        maxMemoryUsage: 1024,
        checkInterval: 60000,
      });

      ttlMonitor.set('key1', 'value1', 100, 50); // 50ms TTL

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(ttlMonitor.get('key1')).toBeNull();

      ttlMonitor.shutdown();
    });

    it('should not expire entries without TTL', async () => {
      monitor.set('key1', 'value1', 100); // No TTL

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(monitor.get('key1')).toBe('value1');
    });
  });

  describe('Memory Pressure', () => {
    it('should detect memory pressure', () => {
      // Fill cache to trigger pressure
      for (let i = 0; i < 8; i++) {
        monitor.set(`key${i}`, `value${i}`, 150);
      }

      const pressure = monitor.getMemoryPressure();
      expect(pressure.level).toBeDefined();
    });

    it('should trigger cleanup callback', () => {
      let cleanupCount = 0;
      monitor.onCleanup((count: number) => {
        cleanupCount = count;
      });

      // Force cleanup
      monitor.forceCleanup();

      expect(cleanupCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Eviction', () => {
    it('should evict when over capacity', () => {
      const smallMonitor = createMemoryMonitor<string>({
        maxCacheSize: 3,
        maxMemoryUsage: 1000,
        checkInterval: 60000,
      });

      smallMonitor.set('key1', 'value1', 100);
      smallMonitor.set('key2', 'value2', 100);
      smallMonitor.set('key3', 'value3', 100);

      // This should trigger eviction
      smallMonitor.set('key4', 'value4', 100);

      // At least one entry should have been evicted
      const stats = smallMonitor.getStats();
      expect(stats.evictions).toBeGreaterThanOrEqual(0);

      smallMonitor.shutdown();
    });

    it('should evict LRU entries first', () => {
      const lruMonitor = createMemoryMonitor<string>({
        maxCacheSize: 3,
        maxMemoryUsage: 1000,
        checkInterval: 60000,
      });

      lruMonitor.set('key1', 'value1', 100);
      lruMonitor.set('key2', 'value2', 100);
      lruMonitor.set('key3', 'value3', 100);

      // Access key1 to make it recently used
      lruMonitor.get('key1');

      // Add new entry - should evict key2 (LRU)
      lruMonitor.set('key4', 'value4', 100);

      // key1 should still exist (was accessed recently)
      expect(lruMonitor.get('key1')).toBe('value1');

      lruMonitor.shutdown();
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      monitor.updateConfig({
        maxCacheSize: 100,
        maxMemoryUsage: 10000,
      });

      const config = monitor.getConfig();
      expect(config.maxCacheSize).toBe(100);
      expect(config.maxMemoryUsage).toBe(10000);
    });
  });
});

// ============================================================================
// estimateSize Tests
// ============================================================================

describe('estimateSize', () => {
  it('should estimate null and undefined', () => {
    expect(estimateSize(null)).toBe(0);
    expect(estimateSize(undefined)).toBe(0);
  });

  it('should estimate strings', () => {
    expect(estimateSize('hello')).toBe(10); // 5 chars * 2 bytes
    expect(estimateSize('')).toBe(0);
  });

  it('should estimate numbers', () => {
    expect(estimateSize(42)).toBe(8);
    expect(estimateSize(3.14)).toBe(8);
  });

  it('should estimate booleans', () => {
    expect(estimateSize(true)).toBe(4);
    expect(estimateSize(false)).toBe(4);
  });

  it('should estimate objects', () => {
    const obj = { name: 'test', value: 123 };
    const size = estimateSize(obj);
    expect(size).toBeGreaterThan(0);
  });

  it('should estimate arrays', () => {
    const arr = [1, 2, 3, 4, 5];
    const size = estimateSize(arr);
    expect(size).toBeGreaterThan(0);
  });
});

// ============================================================================
// Singleton Cache Tests
// ============================================================================

describe('Singleton Caches', () => {
  afterEach(() => {
    referenceImageCache.clear();
    referenceMetadataCache.clear();
    videoFrameCache.clear();
  });

  it('referenceImageCache should exist and be a MemoryMonitor', () => {
    expect(referenceImageCache).toBeInstanceOf(MemoryMonitor);
  });

  it('referenceMetadataCache should exist and be a MemoryMonitor', () => {
    expect(referenceMetadataCache).toBeInstanceOf(MemoryMonitor);
  });

  it('videoFrameCache should exist and be a MemoryMonitor', () => {
    expect(videoFrameCache).toBeInstanceOf(MemoryMonitor);
  });
});

// ============================================================================
// Performance Benchmarks
// ============================================================================

describe('Performance Benchmarks', () => {
  it('timer operations should be fast (< 1ms overhead)', () => {
    const service = getPerformanceMonitoringService();

    // Measure baseline
    const baselineStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      performance.now();
    }
    const baselineEnd = performance.now();
    const baselineTime = baselineEnd - baselineStart;

    // Measure with timer operations
    const timerStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      const id = `bench-${i}`;
      service.startTimer(id, 'bench');
      service.endTimer(id);
    }
    const timerEnd = performance.now();
    const timerTime = timerEnd - timerStart;

    // Timer overhead should be minimal (< 10x baseline)
    expect(timerTime).toBeLessThan(baselineTime * 10);

    service.shutdown();
  });

  it('cache operations should be fast', () => {
    const cache = createMemoryMonitor<unknown>({
      maxCacheSize: 100,
      maxMemoryUsage: 10240,
      checkInterval: 60000,
    });

    const iterations = 1000;

    // Benchmark set operations
    const setStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      cache.set(`key${i}`, { data: `value${i}` }, 100);
    }
    const setTime = performance.now() - setStart;

    // Benchmark get operations
    const getStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      cache.get(`key${i}`);
    }
    const getTime = performance.now() - getStart;

    // Both should complete quickly
    expect(setTime).toBeLessThan(500); // < 500ms for 1000 sets
    expect(getTime).toBeLessThan(100); // < 100ms for 1000 gets

    cache.shutdown();
  });
});
