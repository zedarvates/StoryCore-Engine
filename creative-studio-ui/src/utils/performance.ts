/**
 * Performance Utilities
 * Optimization utilities for large projects
 */

import { debounce, throttle } from './debounceAndThrottle';

// Re-export debounce and throttle from unified module
export { debounce, throttle };

// ============================================================================
// Memoization Cache
// ============================================================================

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  maxAge: number;
}

/**
 * Simple in-memory cache with TTL support
 */
export class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number;
  
  constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutes default
    this.defaultTTL = defaultTTL;
  }
  
  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    if (now - entry.timestamp > entry.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }
  
  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      maxAge: ttl ?? this.defaultTTL,
    });
  }
  
  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.maxAge) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  }
}

// ============================================================================
// Reference Image Lazy Loader
// ============================================================================

interface LazyImageState {
  loaded: boolean;
  error: boolean;
  src: string;
}

/**
 * Lazy load reference images with placeholder
 */
export class LazyImageLoader {
  private loadedImages = new Set<string>();
  private preloadQueue: string[] = [];
  private maxConcurrent = 3;
  private activeLoads = 0;
  
  /**
   * Load image with callback
   */
  loadImage(
    src: string,
    onLoad: (state: LazyImageState) => void,
    onError: (error: Error) => void
  ): void {
    if (this.loadedImages.has(src)) {
      onLoad({ loaded: true, error: false, src });
      return;
    }
    
    if (this.activeLoads >= this.maxConcurrent) {
      this.preloadQueue.push(src);
      return;
    }
    
    this.activeLoads++;
    
    const img = new Image();
    
    img.onload = () => {
      this.loadedImages.add(src);
      this.activeLoads--;
      onLoad({ loaded: true, error: false, src });
      this.processQueue();
    };
    
    img.onerror = () => {
      this.activeLoads--;
      onError(new Error(`Failed to load image: ${src}`));
      this.processQueue();
    };
    
    img.src = src;
  }
  
  /**
   * Process preload queue
   */
  private processQueue(): void {
    while (this.activeLoads < this.maxConcurrent && this.preloadQueue.length > 0) {
      const src = this.preloadQueue.shift();
      if (src) {
        // Trigger load without callbacks (will use cache)
        this.loadedImages.add(src);
      }
    }
  }
  
  /**
   * Check if image is already loaded
   */
  isLoaded(src: string): boolean {
    return this.loadedImages.has(src);
  }
  
  /**
   * Preload images in batches
   */
  preloadBatch(sources: string[], batchSize: number = 5): Promise<void[]> {
    const batches: string[][] = [];
    
    for (let i = 0; i < sources.length; i += batchSize) {
      batches.push(sources.slice(i, i + batchSize));
    }
    
    const promises = batches.map(batch => 
      new Promise<void>((resolve) => {
        let loaded = 0;
        batch.forEach(src => {
          this.loadImage(src, () => {
            loaded++;
            if (loaded === batch.length) resolve();
          }, () => {
            loaded++;
            if (loaded === batch.length) resolve();
          });
        });
      })
    );
    
    return Promise.all(promises);
  }
  
  /**
   * Clear loaded images cache
   */
  clearCache(): void {
    this.loadedImages.clear();
    this.preloadQueue = [];
    this.activeLoads = 0;
  }
}

// ============================================================================
// Consistency Check Optimizer
// ============================================================================

interface CheckResult {
  score: number;
  issues: string[];
  timestamp: number;
}

/**
 * Optimized consistency checker with memoization
 */
export class OptimizedConsistencyChecker {
  private cache = new MemoryCache<CheckResult>(30 * 1000); // 30 second cache
  
  /**
   * Check consistency with caching
   */
  check(
    entityId: string,
    references: string[],
    checkFn: () => CheckResult
  ): CheckResult {
    const cacheKey = `${entityId}:${references.sort().join(',')}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }
    
    const result = checkFn();
    this.cache.set(cacheKey, result);
    
    return result;
  }
  
  /**
   * Batch check multiple entities
   */
  batchCheck(
    entities: Array<{ id: string; references: string[] }>,
    checkFn: (entity: { id: string; references: string[] }) => CheckResult
  ): Map<string, CheckResult> {
    const results = new Map<string, CheckResult>();
    
    for (const entity of entities) {
      const result = this.check(entity.id, entity.references, () => checkFn(entity));
      results.set(entity.id, result);
    }
    
    return results;
  }
  
  /**
   * Invalidate cache for entity
   */
  invalidate(entityId: string): void {
    this.cache.delete(entityId);
  }
  
  /**
   * Clear all caches
   */
  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Virtual List Helper
// ============================================================================

interface VirtualListConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

/**
 * Calculate virtual list parameters
 */
export function calculateVirtualListParams(
  totalItems: number,
  config: VirtualListConfig
): {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  visibleCount: number;
} {
  const { itemHeight, containerHeight, overscan = 3 } = config;
  
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const totalHeight = totalItems * itemHeight;
  
  // Estimate scroll position (would need actual scroll position in real implementation)
  const estimatedScroll = 0;
  
  const startIndex = Math.max(0, Math.floor(estimatedScroll / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((estimatedScroll + containerHeight) / itemHeight) + overscan
  );
  
  return {
    startIndex,
    endIndex,
    offsetY: startIndex * itemHeight,
    visibleCount: endIndex - startIndex + 1,
  };
}

// ============================================================================
// Export singletons
// ============================================================================

export const lazyImageLoader = new LazyImageLoader();
export const consistencyChecker = new OptimizedConsistencyChecker();
export const referenceCache = new MemoryCache<unknown>(5 * 60 * 1000);
