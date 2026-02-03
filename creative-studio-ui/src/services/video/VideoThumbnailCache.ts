/**
 * Video Thumbnail Cache - LRU cache for video thumbnails
 * 
 * Provides efficient thumbnail storage and retrieval with:
 * - LRU eviction (max 1000 entries)
 * - Memory management
 * - Preloading strategy
 * - Async generation
 * 
 * @module services/video/VideoThumbnailCache
 */


// ============================================
// Configuration
// ============================================

export interface ThumbnailCacheConfig {
  /** Maximum number of thumbnails to cache */
  maxCacheSize: number;
  
  /** Thumbnail width in pixels */
  thumbnailWidth: number;
  
  /** Thumbnail height in pixels */
  thumbnailHeight: number;
  
  /** Quality of JPEG thumbnails (0-1) */
  quality: number;
  
  /** Preload margin (seconds before visible) */
  preloadMarginSeconds: number;
  
  /** Preload margin (seconds after visible) */
  preloadMarginAfterSeconds: number;
  
  /** Whether to preload visible thumbnails */
  enablePreloading: boolean;
}

// Default configuration
const DEFAULT_CONFIG: ThumbnailCacheConfig = {
  maxCacheSize: 1000,
  thumbnailWidth: 160,
  thumbnailHeight: 90,
  quality: 0.8,
  preloadMarginSeconds: 5,
  preloadMarginAfterSeconds: 5,
  enablePreloading: true,
};

// ============================================
// Types
// ============================================

/**
 * Thumbnail entry in cache
 */
export interface ThumbnailEntry {
  /** Unique key for this thumbnail */
  key: string;
  
  /** Video source ID */
  videoId: string;
  
  /** Frame number */
  frameNumber: number;
  
  /** Timestamp in seconds */
  timestamp: number;
  
  /** Thumbnail data URL */
  dataUrl: string;
  
  /** When this entry was created */
  createdAt: number;
  
  /** When this entry was last accessed */
  lastAccessedAt: number;
  
  /** Access count */
  accessCount: number;
  
  /** Width of original video */
  originalWidth: number;
  
  /** Height of original video */
  originalHeight: number;
}

/**
 * Preload request
 */
export interface PreloadRequest {
  /** Video source ID */
  videoId: string;
  
  /** Start frame */
  startFrame: number;
  
  /** End frame */
  endFrame: number;
  
  /** Priority (higher = more important) */
  priority: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total entries in cache */
  size: number;
  
  /** Maximum cache size */
  maxSize: number;
  
  /** Hit count */
  hits: number;
  
  /** Miss count */
  misses: number;
  
  /** Hit rate */
  hitRate: number;
  
  /** Total preload requests */
  preloadCount: number;
  
  /** Completed preload requests */
  preloadCompleted: number;
  
  /** Memory usage estimate (bytes) */
  memoryUsage: number;
}

// ============================================
// LRU Cache Implementation
// ============================================

/**
 * LRU Cache for thumbnail entries
 */
class LRUCache<T> {
  private cache: Map<string, T>;
  private maxSize: number;
  private onEvict?: (key: string, value: T) => void;
  
  constructor(maxSize: number, onEvict?: (key: string, value: T) => void) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.onEvict = onEvict;
  }
  
  get(key: string): T | undefined {
    if (!this.cache.has(key)) return undefined;
    
    const value = this.cache.get(key)!;
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }
  
  set(key: string, value: T): void {
    // Delete if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Add new entry
    this.cache.set(key, value);
    
    // Evict oldest if over capacity
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        const evicted = this.cache.get(firstKey)!;
        this.cache.delete(firstKey);
        this.onEvict?.(firstKey, evicted);
      }
    }
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  has(key: string): boolean {
    return this.cache.has(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  keys(): IterableIterator<string> {
    return this.cache.keys();
  }
  
  values(): IterableIterator<T> {
    return this.cache.values();
  }
  
  entries(): IterableIterator<[string, T]> {
    return this.cache.entries();
  }
  
  get size(): number {
    return this.cache.size;
  }
}

// ============================================
// Service Class
// ============================================

export class VideoThumbnailCache {
  private config: ThumbnailCacheConfig;
  private cache: LRUCache<ThumbnailEntry>;
  private videoElements: Map<string, HTMLVideoElement>;
  private preloadQueue: PreloadRequest[];
  private isPreloading: boolean;
  
  // Statistics
  private stats: CacheStats;
  
  constructor(config: Partial<ThumbnailCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Create LRU cache with eviction callback
    this.cache = new LRUCache<ThumbnailEntry>(
      this.config.maxCacheSize,
      this.handleEviction.bind(this)
    );
    
    // Store video elements (weakly referenced in production)
    this.videoElements = new Map();
    
    // Preload queue
    this.preloadQueue = [];
    this.isPreloading = false;
    
    // Initialize stats
    this.stats = {
      size: 0,
      maxSize: this.config.maxCacheSize,
      hits: 0,
      misses: 0,
      hitRate: 0,
      preloadCount: 0,
      preloadCompleted: 0,
      memoryUsage: 0,
    };
  }
  
  // ============================================
  // Thumbnail Generation
  // ============================================
  
  /**
   * Generate a thumbnail from a video element at a specific time
   */
  async generateThumbnail(
    videoElement: HTMLVideoElement,
    videoId: string,
    frameNumber: number,
    timestamp: number
  ): Promise<ThumbnailEntry> {
    // Store video element
    this.videoElements.set(videoId, videoElement);
    
    // Create canvas for thumbnail generation
    const canvas = document.createElement('canvas');
    canvas.width = this.config.thumbnailWidth;
    canvas.height = this.config.thumbnailHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Seek to timestamp
    const originalTime = videoElement.currentTime;
    videoElement.currentTime = timestamp;
    
    // Wait for seek to complete
    await new Promise<void>((resolve, reject) => {
      const onSeeked = () => {
        videoElement.removeEventListener('seeked', onSeeked);
        resolve();
      };
      
      const onError = () => {
        videoElement.removeEventListener('seeked', onSeeked);
        reject(new Error(`Seek failed for frame ${frameNumber}`));
      };
      
      videoElement.addEventListener('seeked', onSeeked, { once: true });
      videoElement.addEventListener('error', onError, { once: true });
    });
    
    // Draw video frame to canvas
    ctx.drawImage(
      videoElement,
      0,
      0,
      this.config.thumbnailWidth,
      this.config.thumbnailHeight
    );
    
    // Restore original time
    videoElement.currentTime = originalTime;
    
    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', this.config.quality);
    
    // Create entry
    const entry: ThumbnailEntry = {
      key: this.generateKey(videoId, frameNumber),
      videoId,
      frameNumber,
      timestamp,
      dataUrl,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      originalWidth: videoElement.videoWidth,
      originalHeight: videoElement.videoHeight,
    };
    
    return entry;
  }
  
  /**
   * Generate multiple thumbnails for a range of frames
   */
  async generateThumbnailRange(
    videoElement: HTMLVideoElement,
    videoId: string,
    startFrame: number,
    endFrame: number,
    frameRate: number,
    onProgress?: (current: number, total: number) => void
  ): Promise<ThumbnailEntry[]> {
    const entries: ThumbnailEntry[] = [];
    const total = endFrame - startFrame + 1;
    let current = 0;
    
    for (let frame = startFrame; frame <= endFrame; frame++) {
      const timestamp = frame / frameRate;
      
      try {
        const entry = await this.generateThumbnail(
          videoElement,
          videoId,
          frame,
          timestamp
        );
        
        entries.push(entry);
        current++;
        onProgress?.(current, total);
      } catch (error) {
        console.warn(`Failed to generate thumbnail for frame ${frame}:`, error);
      }
    }
    
    return entries;
  }
  
  // ============================================
  // Cache Operations
  // ============================================
  
  /**
   * Get a thumbnail from cache
   */
  get(videoId: string, frameNumber: number): ThumbnailEntry | undefined {
    const key = this.generateKey(videoId, frameNumber);
    const entry = this.cache.get(key);
    
    if (entry) {
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;
      this.stats.hits++;
      this.updateHitRate();
      return entry;
    }
    
    this.stats.misses++;
    this.updateHitRate();
    return undefined;
  }
  
  /**
   * Get multiple thumbnails from cache
   */
  getMultiple(videoId: string, frameNumbers: number[]): Map<number, ThumbnailEntry> {
    const result = new Map<number, ThumbnailEntry>();
    
    for (const frameNumber of frameNumbers) {
      const entry = this.get(videoId, frameNumber);
      if (entry) {
        result.set(frameNumber, entry);
      }
    }
    
    return result;
  }
  
  /**
   * Store a thumbnail in cache
   */
  set(entry: ThumbnailEntry): void {
    this.cache.set(entry.key, entry);
    this.updateMemoryUsage();
    this.stats.size = this.cache.size;
  }
  
  /**
   * Store multiple thumbnails
   */
  setMultiple(entries: ThumbnailEntry[]): void {
    for (const entry of entries) {
      this.cache.set(entry.key, entry);
    }
    this.updateMemoryUsage();
    this.stats.size = this.cache.size;
  }
  
  /**
   * Delete a thumbnail from cache
   */
  delete(videoId: string, frameNumber: number): boolean {
    const key = this.generateKey(videoId, frameNumber);
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.updateMemoryUsage();
      this.stats.size = this.cache.size;
    }
    return deleted;
  }
  
  /**
   * Delete all thumbnails for a video
   */
  deleteVideo(videoId: string): number {
    let deleted = 0;
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${videoId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      if (this.cache.delete(key)) {
        deleted++;
      }
    }
    
    this.updateMemoryUsage();
    this.stats.size = this.cache.size;
    return deleted;
  }
  
  /**
   * Check if thumbnail exists in cache
   */
  has(videoId: string, frameNumber: number): boolean {
    const key = this.generateKey(videoId, frameNumber);
    return this.cache.has(key);
  }
  
  /**
   * Clear all cached thumbnails
   */
  clear(): void {
    this.cache.clear();
    this.videoElements.clear();
    this.updateMemoryUsage();
    this.stats.size = 0;
  }
  
  // ============================================
  // Preloading
  // ============================================
  
  /**
   * Request preload of thumbnails for a frame range
   */
  requestPreload(videoId: string, startFrame: number, endFrame: number, priority: number = 0): void {
    this.preloadQueue.push({
      videoId,
      startFrame,
      endFrame,
      priority,
    });
    
    // Sort by priority (higher first)
    this.preloadQueue.sort((a, b) => b.priority - a.priority);
    
    this.stats.preloadCount++;
    
    // Start processing queue if not already running
    if (!this.isPreloading) {
      this.processPreloadQueue();
    }
  }
  
  /**
   * Process preload queue
   */
  private async processPreloadQueue(): Promise<void> {
    if (!this.config.enablePreloading || this.preloadQueue.length === 0) {
      this.isPreloading = false;
      return;
    }
    
    this.isPreloading = true;
    
    const request = this.preloadQueue.shift();
    if (!request) {
      this.isPreloading = false;
      return;
    }
    
    const videoElement = this.videoElements.get(request.videoId);
    if (!videoElement) {
      // Skip if video not available
      this.processPreloadQueue();
      return;
    }
    
    const frameRate = 30; // Should be passed in or stored
    const missingFrames: number[] = [];
    
    // Find frames not in cache
    for (let frame = request.startFrame; frame <= request.endFrame; frame++) {
      if (!this.has(request.videoId, frame)) {
        missingFrames.push(frame);
      }
    }
    
    // Generate missing thumbnails
    if (missingFrames.length > 0) {
      try {
        const entries = await this.generateThumbnailRange(
          videoElement,
          request.videoId,
          missingFrames[0],
          missingFrames[missingFrames.length - 1],
          frameRate
        );
        
        this.setMultiple(entries);
        this.stats.preloadCompleted++;
      } catch (error) {
        console.warn('Preload failed:', error);
      }
    }
    
    // Continue processing queue
    this.processPreloadQueue();
  }
  
  /**
   * Cancel all pending preload requests for a video
   */
  cancelPreloads(videoId: string): void {
    this.preloadQueue = this.preloadQueue.filter(r => r.videoId !== videoId);
  }
  
  /**
   * Preload thumbnails for visible timeline region
   */
  preloadVisibleRegion(
    videoId: string,
    visibleStartTime: number,
    visibleEndTime: number,
    frameRate: number
  ): void {
    const startFrame = Math.floor(visibleStartTime * frameRate);
    const endFrame = Math.ceil(visibleEndTime * frameRate);
    
    // Expand range by preload margin
    const preloadStartFrame = Math.max(0, startFrame - 
      Math.floor(this.config.preloadMarginSeconds * frameRate));
    const preloadEndFrame = endFrame + 
      Math.floor(this.config.preloadMarginAfterSeconds * frameRate);
    
    this.requestPreload(videoId, preloadStartFrame, preloadEndFrame, 1);
  }
  
  // ============================================
  // Statistics
  // ============================================
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }
  
  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hits: 0,
      misses: 0,
      hitRate: 0,
      preloadCount: 0,
      preloadCompleted: 0,
      memoryUsage: this.stats.memoryUsage,
    };
  }
  
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
  
  private updateMemoryUsage(): void {
    // Estimate memory: each thumbnail is roughly (width * height * 3) bytes in base64
    const avgSize = this.config.thumbnailWidth * this.config.thumbnailHeight * 3;
    this.stats.memoryUsage = this.cache.size * avgSize;
  }
  
  // ============================================
  // Event Handlers
  // ============================================
  
  /**
   * Handle cache eviction
   */
  private handleEviction(key: string): void {
    // Could trigger events or cleanup here
    // For now, just log in development
    if (process.env.NODE_ENV === 'development') {
      console.debug(`Thumbnail evicted: ${key}`);
    }
  }
  
  // ============================================
  // Utility Methods
  // ============================================
  
  /**
   * Generate cache key
   */
  private generateKey(videoId: string, frameNumber: number): string {
    return `${videoId}:${frameNumber}`;
  }
  
  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * Get maximum cache size
   */
  get maxSize(): number {
    return this.config.maxCacheSize;
  }
  
  // ============================================
  // Cleanup
  // ============================================
  
  /**
   * Destroy the cache
   */
  destroy(): void {
    this.clear();
    this.preloadQueue = [];
    this.isPreloading = false;
  }
}

// ============================================
// Singleton Instance
// ============================================

let defaultInstance: VideoThumbnailCache | null = null;

/**
 * Get or create the default VideoThumbnailCache instance
 */
export function getDefaultVideoThumbnailCache(): VideoThumbnailCache {
  if (!defaultInstance) {
    defaultInstance = new VideoThumbnailCache();
  }
  return defaultInstance;
}

/**
 * Reset the default instance (for testing)
 */
export function resetDefaultVideoThumbnailCache(): void {
  if (defaultInstance) {
    defaultInstance.destroy();
    defaultInstance = null;
  }
}
