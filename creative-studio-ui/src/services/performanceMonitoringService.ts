/**
 * Performance Monitoring Service
 * Tracks performance metrics for Continuous Creation feature
 * 
 * Features:
 * - Operation timing with performance.now()
 * - Memory usage tracking
 * - Custom metrics for reference inheritance, video replication, consistency checks
 * - Optional monitoring (can be disabled in production)
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Configuration
// ============================================================================

export interface PerformanceMonitoringConfig {
  enabled: boolean;
  maxHistoryEntries: number;
  sampleRate: number; // 0-1, for sampling expensive operations
  memoryTrackingInterval: number; // ms
}

const DEFAULT_CONFIG: PerformanceMonitoringConfig = {
  enabled: true,
  maxHistoryEntries: 1000,
  sampleRate: 1.0,
  memoryTrackingInterval: 5000,
};

// ============================================================================
// Types
// ============================================================================

export interface TimingEntry {
  id: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

export interface InheritanceMetric {
  depth: number;
  duration: number;
  timestamp: number;
}

export interface ReplicationMetric {
  progress: number; // 0-100
  duration: number;
  timestamp: number;
}

export interface ConsistencyMetric {
  shotCount: number;
  duration: number;
  timestamp: number;
}

export interface PerformanceReport {
  summary: {
    totalOperations: number;
    averageDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
  };
  memory: {
    currentHeapUsed: number;
    peakHeapUsed: number;
    averageHeapUsed: number;
  };
  inheritance: {
    totalInheritances: number;
    averageDepth: number;
    maxDepth: number;
    averageDuration: number;
  };
  replication: {
    totalReplications: number;
    averageProgressRate: number;
    averageDuration: number;
  };
  consistency: {
    totalChecks: number;
    averageDuration: number;
    averageShotCount: number;
  };
  recentOperations: TimingEntry[];
}

export interface PerformanceMetric {
  type: 'timer' | 'memory' | 'inheritance' | 'replication' | 'consistency' | 'cache';
  operation: string;
  value: number;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

// ============================================================================
// Performance Monitoring Service
// ============================================================================

export class PerformanceMonitoringService {
  private config: PerformanceMonitoringConfig;
  private activeTimers: Map<string, TimingEntry> = new Map();
  private timingHistory: TimingEntry[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private inheritanceMetrics: InheritanceMetric[] = [];
  private replicationMetrics: ReplicationMetric[] = [];
  private consistencyMetrics: ConsistencyMetric[] = [];
  private customMetrics: PerformanceMetric[] = [];
  private memoryTrackingInterval: ReturnType<typeof setInterval> | null = null;
  private enabled: boolean = true;

  constructor(config: Partial<PerformanceMonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.enabled = this.config.enabled;

    if (this.enabled && typeof window !== 'undefined') {
      this.startMemoryTracking();
    }
  }

  // ============================================================================
  // Timer Operations
  // ============================================================================

  /**
   * Start tracking an operation
   * @param operationId - Unique identifier for the operation
   * @param operation - Name of the operation
   * @param metadata - Optional metadata
   */
  startTimer(operationId: string, operation: string, metadata?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const entry: TimingEntry = {
      id: operationId,
      operation,
      startTime: performance.now(),
      metadata,
    };

    this.activeTimers.set(operationId, entry);
  }

  /**
   * End tracking an operation and return duration
   * @param operationId - The operation identifier
   * @param additionalMetadata - Optional additional metadata
   * @returns Duration in milliseconds
   */
  endTimer(operationId: string, additionalMetadata?: Record<string, unknown>): number {
    if (!this.enabled) return 0;

    const entry = this.activeTimers.get(operationId);
    if (!entry) {
      console.warn(`[PerformanceMonitoring] No active timer found for: ${operationId}`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - entry.startTime;

    const completedEntry: TimingEntry = {
      ...entry,
      endTime,
      duration,
      metadata: { ...entry.metadata, ...additionalMetadata },
    };

    // Remove from active timers
    this.activeTimers.delete(operationId);

    // Add to history
    this.timingHistory.push(completedEntry);

    // Trim history if needed
    if (this.timingHistory.length > this.config.maxHistoryEntries) {
      this.timingHistory = this.timingHistory.slice(-this.config.maxHistoryEntries);
    }

    return duration;
  }

  /**
   * Create a timer context manager for TypeScript
   * @param operation - Name of the operation
   * @returns Timer object with stop method
   */
  createTimer(operation: string): { stop: (metadata?: Record<string, unknown>) => number } {
    const id = uuidv4();
    this.startTimer(id, operation);

    return {
      stop: (metadata?: Record<string, unknown>): number => {
        return this.endTimer(id, metadata);
      },
    };
  }

  /**
   * Measure execution time of a function
   * @param operation - Name of the operation
   * @param fn - Function to measure
   * @param metadata - Optional metadata
   * @returns Result of the function and duration
   */
  async measure<T>(
    operation: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<{ result: T; duration: number }> {
    const timer = this.createTimer(operation);
    const startMemory = this.getMemoryUsage();

    try {
      const result = await fn();
      const duration = timer.stop({ ...metadata, success: true });

      return { result, duration };
    } catch (error) {
      timer.stop({ ...metadata, success: false, error: String(error) });
      throw error;
    }
  }

  // ============================================================================
  // Memory Tracking
  // ============================================================================

  /**
   * Track heap memory usage
   * @returns Current memory snapshot or null if unavailable
   */
  trackMemoryUsage(): MemorySnapshot | null {
    if (typeof window === 'undefined') return null;

    const perf = window.performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } };
    if (!perf.memory) return null;

    const memory = perf.memory;

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memory.usedJSHeapSize,
      heapTotal: memory.totalJSHeapSize,
      external: 0, // Not available in Chrome performance.memory
    };

    this.memorySnapshots.push(snapshot);

    // Trim history
    if (this.memorySnapshots.length > this.config.maxHistoryEntries) {
      this.memorySnapshots = this.memorySnapshots.slice(-this.config.maxHistoryEntries);
    }

    return snapshot;
  }

  /**
   * Get current memory usage
   * @returns Current memory snapshot or null
   */
  getMemoryUsage(): MemorySnapshot | null {
    return this.trackMemoryUsage();
  }

  /**
   * Start periodic memory tracking
   */
  private startMemoryTracking(): void {
    if (this.memoryTrackingInterval) {
      clearInterval(this.memoryTrackingInterval);
    }

    this.memoryTrackingInterval = setInterval(() => {
      this.trackMemoryUsage();
    }, this.config.memoryTrackingInterval);
  }

  /**
   * Stop periodic memory tracking
   */
  stopMemoryTracking(): void {
    if (this.memoryTrackingInterval) {
      clearInterval(this.memoryTrackingInterval);
      this.memoryTrackingInterval = null;
    }
  }

  // ============================================================================
  // Custom Metrics
  // ============================================================================

  /**
   * Track reference inheritance performance
   * @param depth - Inheritance depth (1 = direct, 2 = parent, etc.)
   * @param duration - Duration in milliseconds
   */
  trackReferenceInheritance(depth: number, duration: number): void {
    if (!this.enabled) return;

    const metric: InheritanceMetric = {
      depth,
      duration,
      timestamp: Date.now(),
    };

    this.inheritanceMetrics.push(metric);

    // Trim history
    if (this.inheritanceMetrics.length > this.config.maxHistoryEntries) {
      this.inheritanceMetrics = this.inheritanceMetrics.slice(-this.config.maxHistoryEntries);
    }

    // Also track as custom metric
    this.customMetrics.push({
      type: 'inheritance',
      operation: 'referenceInheritance',
      value: duration,
      metadata: { depth },
      timestamp: Date.now(),
    });
  }

  /**
   * Track video replication progress
   * @param progress - Progress percentage (0-100)
   * @param duration - Duration in milliseconds
   */
  trackVideoReplication(progress: number, duration: number): void {
    if (!this.enabled) return;

    const metric: ReplicationMetric = {
      progress,
      duration,
      timestamp: Date.now(),
    };

    this.replicationMetrics.push(metric);

    // Trim history
    if (this.replicationMetrics.length > this.config.maxHistoryEntries) {
      this.replicationMetrics = this.replicationMetrics.slice(-this.config.maxHistoryEntries);
    }

    // Also track as custom metric
    this.customMetrics.push({
      type: 'replication',
      operation: 'videoReplication',
      value: progress,
      metadata: { duration },
      timestamp: Date.now(),
    });
  }

  /**
   * Track visual consistency check time
   * @param shotCount - Number of shots checked
   * @param duration - Duration in milliseconds
   */
  trackConsistencyCheck(shotCount: number, duration: number): void {
    if (!this.enabled) return;

    const metric: ConsistencyMetric = {
      shotCount,
      duration,
      timestamp: Date.now(),
    };

    this.consistencyMetrics.push(metric);

    // Trim history
    if (this.consistencyMetrics.length > this.config.maxHistoryEntries) {
      this.consistencyMetrics = this.consistencyMetrics.slice(-this.config.maxHistoryEntries);
    }

    // Also track as custom metric
    this.customMetrics.push({
      type: 'consistency',
      operation: 'consistencyCheck',
      value: duration,
      metadata: { shotCount },
      timestamp: Date.now(),
    });
  }

  /**
   * Track a custom metric
   * @param type - Metric type
   * @param operation - Operation name
   * @param value - Metric value
   * @param metadata - Optional metadata
   */
  trackCustomMetric(
    type: PerformanceMetric['type'],
    operation: string,
    value: number,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.enabled) return;

    this.customMetrics.push({
      type,
      operation,
      value,
      metadata,
      timestamp: Date.now(),
    });

    // Trim history
    if (this.customMetrics.length > this.config.maxHistoryEntries) {
      this.customMetrics = this.customMetrics.slice(-this.config.maxHistoryEntries);
    }
  }

  // ============================================================================
  // Report Generation
  // ============================================================================

  /**
   * Generate performance report
   * @returns Comprehensive performance report
   */
  getPerformanceReport(): PerformanceReport {
    const durations = this.timingHistory
      .filter(e => e.duration !== undefined)
      .map(e => e.duration as number);

    const sortedDurations = [...durations].sort((a, b) => a - b);

    const calculatePercentile = (p: number): number => {
      if (sortedDurations.length === 0) return 0;
      const index = Math.floor(sortedDurations.length * p);
      return sortedDurations[Math.min(index, sortedDurations.length - 1)];
    };

    // Memory stats
    const memoryUsages = this.memorySnapshots.map(m => m.heapUsed);

    // Inheritance stats
    const avgDepth = this.inheritanceMetrics.length > 0
      ? this.inheritanceMetrics.reduce((sum, m) => sum + m.depth, 0) / this.inheritanceMetrics.length
      : 0;
    const maxDepth = this.inheritanceMetrics.length > 0
      ? Math.max(...this.inheritanceMetrics.map(m => m.depth))
      : 0;
    const avgInheritanceDuration = this.inheritanceMetrics.length > 0
      ? this.inheritanceMetrics.reduce((sum, m) => sum + m.duration, 0) / this.inheritanceMetrics.length
      : 0;

    // Replication stats
    const avgReplicationDuration = this.replicationMetrics.length > 0
      ? this.replicationMetrics.reduce((sum, m) => sum + m.duration, 0) / this.replicationMetrics.length
      : 0;

    // Consistency stats
    const avgConsistencyDuration = this.consistencyMetrics.length > 0
      ? this.consistencyMetrics.reduce((sum, m) => sum + m.duration, 0) / this.consistencyMetrics.length
      : 0;
    const avgShotCount = this.consistencyMetrics.length > 0
      ? this.consistencyMetrics.reduce((sum, m) => sum + m.shotCount, 0) / this.consistencyMetrics.length
      : 0;

    return {
      summary: {
        totalOperations: this.timingHistory.length,
        averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        p50Duration: calculatePercentile(0.5),
        p95Duration: calculatePercentile(0.95),
        p99Duration: calculatePercentile(0.99),
      },
      memory: {
        currentHeapUsed: memoryUsages.length > 0 ? memoryUsages[memoryUsages.length - 1] : 0,
        peakHeapUsed: memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0,
        averageHeapUsed: memoryUsages.length > 0 ? memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : 0,
      },
      inheritance: {
        totalInheritances: this.inheritanceMetrics.length,
        averageDepth: avgDepth,
        maxDepth: maxDepth,
        averageDuration: avgInheritanceDuration,
      },
      replication: {
        totalReplications: this.replicationMetrics.length,
        averageProgressRate: this.replicationMetrics.length > 0
          ? this.replicationMetrics.reduce((sum, m) => sum + m.progress, 0) / this.replicationMetrics.length
          : 0,
        averageDuration: avgReplicationDuration,
      },
      consistency: {
        totalChecks: this.consistencyMetrics.length,
        averageDuration: avgConsistencyDuration,
        averageShotCount: avgShotCount,
      },
      recentOperations: this.timingHistory.slice(-50),
    };
  }

  /**
   * Get raw timing history
   * @returns Array of timing entries
   */
  getTimingHistory(): TimingEntry[] {
    return [...this.timingHistory];
  }

  /**
   * Get memory snapshots
   * @returns Array of memory snapshots
   */
  getMemorySnapshots(): MemorySnapshot[] {
    return [...this.memorySnapshots];
  }

  /**
   * Get inheritance metrics
   * @returns Array of inheritance metrics
   */
  getInheritanceMetrics(): InheritanceMetric[] {
    return [...this.inheritanceMetrics];
  }

  /**
   * Get replication metrics
   * @returns Array of replication metrics
   */
  getReplicationMetrics(): ReplicationMetric[] {
    return [...this.replicationMetrics];
  }

  /**
   * Get consistency metrics
   * @returns Array of consistency metrics
   */
  getConsistencyMetrics(): ConsistencyMetric[] {
    return [...this.consistencyMetrics];
  }

  /**
   * Get custom metrics
   * @returns Array of custom metrics
   */
  getCustomMetrics(): PerformanceMetric[] {
    return [...this.customMetrics];
  }

  // ============================================================================
  // Service Management
  // ============================================================================

  /**
   * Enable or disable monitoring
   * @param enabled - Whether monitoring should be enabled
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (enabled) {
      this.startMemoryTracking();
    } else {
      this.stopMemoryTracking();
    }
  }

  /**
   * Check if monitoring is enabled
   * @returns Whether monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Clear all metrics and history
   */
  clear(): void {
    this.activeTimers.clear();
    this.timingHistory = [];
    this.memorySnapshots = [];
    this.inheritanceMetrics = [];
    this.replicationMetrics = [];
    this.consistencyMetrics = [];
    this.customMetrics = [];
  }

  /**
   * Shutdown the monitoring service
   */
  shutdown(): void {
    this.stopMemoryTracking();
    this.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let monitoringServiceInstance: PerformanceMonitoringService | null = null;

/**
 * Get the singleton performance monitoring service instance
 * @param config - Optional configuration
 * @returns PerformanceMonitoringService instance
 */
export function getPerformanceMonitoringService(config?: Partial<PerformanceMonitoringConfig>): PerformanceMonitoringService {
  if (!monitoringServiceInstance) {
    monitoringServiceInstance = new PerformanceMonitoringService(config);
  }
  return monitoringServiceInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetPerformanceMonitoringService(): void {
  if (monitoringServiceInstance) {
    monitoringServiceInstance.shutdown();
    monitoringServiceInstance = null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format bytes to human readable string
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration to human readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted string (e.g., "1.5s", "200ms")
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
