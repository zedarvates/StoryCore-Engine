/**
 * Memory Monitor Utility
 * Memory-aware cache with automatic cleanup and pressure detection
 * 
 * Features:
 * - Cache size tracking with configurable limits
 * - Memory pressure detection
 * - Automatic cleanup when threshold exceeded
 * - Stats reporting (hits, misses, evictions)
 */

// ============================================================================
// Configuration
// ============================================================================

export interface MemoryMonitorConfig {
  maxCacheSize: number; // Maximum number of entries
  maxMemoryUsage: number; // Maximum memory in bytes
  cleanupThreshold: number; // Percentage (0-1) at which to trigger cleanup
  evictionRatio: number; // Ratio of entries to evict when cleaning (0-1)
  checkInterval: number; // ms between memory checks
}

const DEFAULT_CONFIG: MemoryMonitorConfig = {
  maxCacheSize: 1000,
  maxMemoryUsage: 100 * 1024 * 1024, // 100 MB
  cleanupThreshold: 0.8, // 80%
  evictionRatio: 0.3, // Evict 30% of entries
  checkInterval: 5000, // 5 seconds
};

// ============================================================================
// Types
// ============================================================================

export interface CacheEntry<T> {
  key: string;
  value: T;
  size: number; // Estimated size in bytes
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  ttl?: number; // Time to live in ms (optional)
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  cleanups: number;
  currentSize: number;
  currentMemoryUsage: number;
  hitRate: number; // 0-1
}

export interface MemoryPressureState {
  isUnderPressure: boolean;
  level: 'normal' | 'moderate' | 'high' | 'critical';
  lastTriggered: number | null;
}

// ============================================================================
// Memory Monitor Class
// ============================================================================

export class MemoryMonitor<T> {
  private config: MemoryMonitorConfig;
  private cache: Map<string, CacheEntry<T>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    cleanups: 0,
    currentSize: 0,
    currentMemoryUsage: 0,
    hitRate: 0,
  };
  private memoryPressure: MemoryPressureState = {
    isUnderPressure: false,
    level: 'normal',
    lastTriggered: null,
  };
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private onPressureCallback: ((level: MemoryPressureState['level']) => void) | null = null;
  private onCleanupCallback: ((evictedCount: number) => void) | null = null;

  constructor(config: Partial<MemoryMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (typeof window !== 'undefined') {
      this.startMonitoring();
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Update hit rate statistic
   */
  private updateHitRate(): void {
    this.stats.hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  // ============================================================================
  // Cache Operations
  // ============================================================================

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.evict(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access metadata
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    this.stats.hits++;
    this.updateHitRate();
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, size: number, ttl?: number): void {
    // Check if we need to evict before adding
    if (this.shouldEvict()) {
      this.cleanup();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      size,
      timestamp: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      ttl,
    };

    // Remove existing entry if present
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      this.stats.currentSize--;
      this.stats.currentMemoryUsage -= oldEntry.size;
    }

    this.cache.set(key, entry);
    this.stats.currentSize++;
    this.stats.currentMemoryUsage += size;

    // Check memory pressure after adding
    this.checkMemoryPressure();
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.stats.currentSize--;
    this.stats.currentMemoryUsage -= entry.size;
    return true;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.evict(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.currentSize = 0;
    this.stats.currentMemoryUsage = 0;
  }

  // ============================================================================
  // Memory Management
  // ============================================================================

  /**
   * Check if eviction should be triggered
   */
  private shouldEvict(): boolean {
    // Check cache size limit
    if (this.stats.currentSize >= this.config.maxCacheSize) {
      return true;
    }

    // Check memory usage limit
    if (this.stats.currentMemoryUsage >= this.config.maxMemoryUsage) {
      return true;
    }

    return false;
  }

  /**
   * Check memory pressure state
   */
  private checkMemoryPressure(): void {
    const usageRatio = this.stats.currentMemoryUsage / this.config.maxMemoryUsage;
    
    let newLevel: MemoryPressureState['level'] = 'normal';
    let wasUnderPressure = this.memoryPressure.isUnderPressure;

    if (usageRatio >= 1) {
      newLevel = 'critical';
    } else if (usageRatio >= 0.9) {
      newLevel = 'high';
    } else if (usageRatio >= 0.75) {
      newLevel = 'moderate';
    } else {
      newLevel = 'normal';
    }

    const isUnderPressure = newLevel !== 'normal';
    this.memoryPressure = {
      isUnderPressure,
      level: newLevel,
      lastTriggered: isUnderPressure ? Date.now() : this.memoryPressure.lastTriggered,
    };

    // Trigger callback if pressure state changed
    if (isUnderPressure && !wasUnderPressure && this.onPressureCallback) {
      this.onPressureCallback(newLevel);
    }
  }

  /**
   * Evict a single entry
   */
  private evict(key: string): void {
    const entry = this.cache.get(key);
    if (!entry) return;

    this.cache.delete(key);
    this.stats.currentSize--;
    this.stats.currentMemoryUsage -= entry.size;
    this.stats.evictions++;
  }

  /**
   * Clean up old or least recently used entries
   */
  cleanup(): number {
    const entriesToEvict = Math.ceil(this.config.evictionRatio * this.config.maxCacheSize);
    let evicted = 0;

    // Sort by last accessed time (oldest first)
    const sortedEntries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Evict oldest entries that are expired or based on LRU
    for (const [key, entry] of sortedEntries) {
      if (evicted >= entriesToEvict) break;
      if (this.stats.currentSize <= this.config.maxCacheSize * 0.5) break;

      if (this.isExpired(entry)) {
        this.evict(key);
        evicted++;
      } else if (this.stats.currentSize > this.config.maxCacheSize * 0.7) {
        this.evict(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.stats.cleanups++;
    }

    if (evicted > 0 && this.onCleanupCallback) {
      this.onCleanupCallback(evicted);
    }

    return evicted;
  }

  /**
   * Force cleanup to get under memory threshold
   */
  forceCleanup(): number {
    const targetSize = Math.floor(this.config.maxCacheSize * 0.5);
    let evicted = 0;

    const sortedEntries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    for (const [key] of sortedEntries) {
      if (this.stats.currentSize <= targetSize) break;
      this.evict(key);
      evicted++;
    }

    while (this.stats.currentMemoryUsage > this.config.maxMemoryUsage * 0.7) {
      if (this.stats.currentSize === 0) break;
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)[0];
      if (oldest) {
        this.evict(oldest[0]);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.stats.cleanups++;
      if (this.onCleanupCallback) {
        this.onCleanupCallback(evicted);
      }
    }

    return evicted;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get current cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0,
    };
  }

  /**
   * Get formatted stats for display
   */
  getFormattedStats(): string {
    const stats = this.getStats();
    return `
Cache Stats:
  Size: ${stats.currentSize} / ${this.config.maxCacheSize}
  Memory: ${(stats.currentMemoryUsage / 1024 / 1024).toFixed(2)} MB / ${(this.config.maxMemoryUsage / 1024 / 1024).toFixed(2)} MB
  Hits: ${stats.hits}
  Misses: ${stats.misses}
  Evictions: ${stats.evictions}
  Cleanups: ${stats.cleanups}
  Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%
  Pressure: ${this.memoryPressure.level.toUpperCase()}
`.trim();
  }

  /**
   * Get current memory pressure state
   */
  getMemoryPressure(): MemoryPressureState {
    return { ...this.memoryPressure };
  }

  /**
   * Get cache entries info
   */
  getEntriesInfo(): Array<{ key: string; size: number; lastAccessed: number; accessCount: number }> {
    return Array.from(this.cache.values()).map(entry => ({
      key: entry.key,
      size: entry.size,
      lastAccessed: entry.lastAccessed,
      accessCount: entry.accessCount,
    }));
  }

  /**
   * Get oldest entries
   */
  getOldestEntries(limit: number = 10): Array<{ key: string; lastAccessed: number }> {
    return Array.from(this.cache.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed)
      .slice(0, limit)
      .map(entry => ({
        key: entry.key,
        lastAccessed: entry.lastAccessed,
      }));
  }

  /**
   * Get least frequently used entries
   */
  getLeastFrequentlyUsedEntries(limit: number = 10): Array<{ key: string; accessCount: number }> {
    return Array.from(this.cache.values())
      .sort((a, b) => a.accessCount - b.accessCount)
      .slice(0, limit)
      .map(entry => ({
        key: entry.key,
        accessCount: entry.accessCount,
      }));
  }

  // ============================================================================
  // Callbacks
  // ============================================================================

  onMemoryPressure(callback: (level: MemoryPressureState['level']) => void): void {
    this.onPressureCallback = callback;
  }

  onCleanup(callback: (evictedCount: number) => void): void {
    this.onCleanupCallback = callback;
  }

  // ============================================================================
  // Monitoring
  // ============================================================================

  private startMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkMemoryPressure();
      
      if (this.memoryPressure.isUnderPressure && this.shouldEvict()) {
        this.cleanup();
      }
    }, this.config.checkInterval);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  updateConfig(config: Partial<MemoryMonitorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MemoryMonitorConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Shutdown
  // ============================================================================

  shutdown(): void {
    this.stopMonitoring();
    this.clear();
    this.onPressureCallback = null;
    this.onCleanupCallback = null;
  }
}

// ============================================================================
// Singleton Cache Instances
// ============================================================================

export const referenceImageCache = new MemoryMonitor<ImageData>({
  maxCacheSize: 100,
  maxMemoryUsage: 50 * 1024 * 1024,
  cleanupThreshold: 0.8,
  evictionRatio: 0.25,
  checkInterval: 10000,
});

export const referenceMetadataCache = new MemoryMonitor<Record<string, unknown>>({
  maxCacheSize: 500,
  maxMemoryUsage: 20 * 1024 * 1024,
  cleanupThreshold: 0.8,
  evictionRatio: 0.2,
  checkInterval: 15000,
});

export const videoFrameCache = new MemoryMonitor<ImageBitmap>({
  maxCacheSize: 50,
  maxMemoryUsage: 100 * 1024 * 1024,
  cleanupThreshold: 0.85,
  evictionRatio: 0.3,
  checkInterval: 5000,
});

// ============================================================================
// Helper Functions
// ============================================================================

export function estimateSize(value: unknown): number {
  if (value === null || value === undefined) return 0;
  
  if (typeof value === 'string') {
    return value.length * 2;
  }
  
  if (typeof value === 'number') return 8;
  if (typeof value === 'boolean') return 4;
  if (typeof value === 'bigint') return 16;
  
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 100;
    }
  }
  
  return 0;
}

export function createMemoryMonitor<T>(config?: Partial<MemoryMonitorConfig>): MemoryMonitor<T> {
  return new MemoryMonitor<T>(config);
}
