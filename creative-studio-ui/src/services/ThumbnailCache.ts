/**
 * ThumbnailCache Service
 * 
 * Implements a two-tier caching system for video thumbnails:
 * - Memory cache with LRU eviction policy
 * - Persistent disk cache using IndexedDB
 * 
 * Now with Observer pattern for real-time synchronization
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.8
 */

export interface ThumbnailCacheConfig {
  maxMemorySize: number; // in MB
  maxDiskSize: number; // in MB
  quality: 'low' | 'medium' | 'high';
  preloadDistance: number; // number of thumbnails to preload
}

export interface CacheEntry {
  key: string;
  blob: Blob;
  size: number;
  lastAccessed: number;
  quality: string;
}

/**
 * Callback type for cache updates
 */
export type CacheUpdateCallback = (key: string, entry: CacheEntry) => void;

/**
 * Callback type for cache clear events
 */
export type CacheClearCallback = (cleared: boolean) => void;

/**
 * Callback type for cache stats updates
 */
export type CacheStatsCallback = (stats: CacheStats) => void;

export interface CacheStats {
  memorySize: number;
  memoryUsage: number;
  memoryCount: number;
  maxMemorySize: number;
}

export class ThumbnailCache {
  private memoryCache: Map<string, CacheEntry>;
  private db: IDBDatabase | null = null;
  private config: ThumbnailCacheConfig;
  private currentMemorySize: number;
  private static instance: ThumbnailCache | null = null;
  private initPromise: Promise<void> | null = null;
  
  // Subscribers for different events
  private cacheUpdateSubscribers: Set<CacheUpdateCallback> = new Set();
  private cacheClearSubscribers: Set<CacheClearCallback> = new Set();
  private cacheStatsSubscribers: Set<CacheStatsCallback> = new Set();

  private constructor(config: ThumbnailCacheConfig) {
    this.memoryCache = new Map();
    this.config = config;
    this.currentMemorySize = 0;
    console.log('[ThumbnailCache] Service initialized with Observer pattern');
  }

  /**
   * Get singleton instance of ThumbnailCache
   */
  static getInstance(config?: ThumbnailCacheConfig): ThumbnailCache {
    if (!ThumbnailCache.instance) {
      const defaultConfig: ThumbnailCacheConfig = {
        maxMemorySize: 100, // 100 MB
        maxDiskSize: 500, // 500 MB
        quality: 'medium',
        preloadDistance: 5
      };
      ThumbnailCache.instance = new ThumbnailCache(config || defaultConfig);
    }
    return ThumbnailCache.instance;
  }

  /**
   * Subscribe to cache updates
   * Returns unsubscribe function
   */
  public subscribeToCacheUpdates(callback: CacheUpdateCallback): () => void {
    this.cacheUpdateSubscribers.add(callback);
    return () => {
      this.cacheUpdateSubscribers.delete(callback);
    };
  }

  /**
   * Subscribe to cache clear events
   * Returns unsubscribe function
   */
  public subscribeToCacheClear(callback: CacheClearCallback): () => void {
    this.cacheClearSubscribers.add(callback);
    return () => {
      this.cacheClearSubscribers.delete(callback);
    };
  }

  /**
   * Subscribe to cache stats updates
   * Returns unsubscribe function
   */
  public subscribeToCacheStats(callback: CacheStatsCallback): () => void {
    this.cacheStatsSubscribers.add(callback);
    return () => {
      this.cacheStatsSubscribers.delete(callback);
    };
  }

  /**
   * Notify subscribers of cache update
   */
  private notifyCacheUpdate(key: string, entry: CacheEntry): void {
    this.cacheUpdateSubscribers.forEach(callback => {
      try {
        callback(key, entry);
      } catch (error) {
        console.error('[ThumbnailCache] Error in cache update subscriber:', error);
      }
    });
  }

  /**
   * Notify subscribers of cache clear
   */
  private notifyCacheClear(cleared: boolean): void {
    this.cacheClearSubscribers.forEach(callback => {
      try {
        callback(cleared);
      } catch (error) {
        console.error('[ThumbnailCache] Error in cache clear subscriber:', error);
      }
    });
  }

  /**
   * Notify subscribers of cache stats update
   */
  private notifyCacheStats(): void {
    const stats = this.getStats();
    this.cacheStatsSubscribers.forEach(callback => {
      try {
        callback(stats);
      } catch (error) {
        console.error('[ThumbnailCache] Error in cache stats subscriber:', error);
      }
    });
  }

  /**
   * Initialize IndexedDB for persistent storage
   * Validates: Requirement 5.8
   */
  async initIndexedDB(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('ThumbnailCacheDB', 1);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('thumbnails')) {
          const objectStore = db.createObjectStore('thumbnails', { keyPath: 'key' });
          objectStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          objectStore.createIndex('size', 'size', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get thumbnail from cache (memory first, then disk)
   * Validates: Requirements 5.1, 5.2
   */
  async get(videoUrl: string, time: number, quality?: string): Promise<Blob | null> {
    const key = this.generateKey(videoUrl, time, quality);

    // Check memory cache first (Requirement 5.1)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      memoryEntry.lastAccessed = Date.now();
      return memoryEntry.blob;
    }

    // Check IndexedDB (Requirement 5.2)
    const diskEntry = await this.getFromDisk(key);
    if (diskEntry) {
      this.addToMemory(key, diskEntry);
      return diskEntry.blob;
    }

    return null;
  }

  /**
   * Set thumbnail in cache (both memory and disk)
   * Validates: Requirements 5.1, 5.3
   */
  async set(videoUrl: string, time: number, blob: Blob, quality?: string): Promise<void> {
    const key = this.generateKey(videoUrl, time, quality);
    const entry: CacheEntry = {
      key,
      blob,
      size: blob.size,
      lastAccessed: Date.now(),
      quality: quality || this.config.quality
    };

    // Add to memory cache with LRU eviction (Requirement 5.3)
    this.addToMemory(key, entry);

    // Persist to disk
    await this.saveToDisk(key, entry);
    
    // Notify subscribers
    this.notifyCacheUpdate(key, entry);
    this.notifyCacheStats();
  }

  /**
   * Add entry to memory cache with LRU eviction
   * Validates: Requirement 5.3
   */
  private addToMemory(key: string, entry: CacheEntry): void {
    const maxMemoryBytes = this.config.maxMemorySize * 1024 * 1024;

    // Evict LRU entries if necessary (Requirement 5.3)
    while (this.currentMemorySize + entry.size > maxMemoryBytes && this.memoryCache.size > 0) {
      this.evictLRU();
    }

    // Only add if there's space
    if (this.currentMemorySize + entry.size <= maxMemoryBytes) {
      this.memoryCache.set(key, entry);
      this.currentMemorySize += entry.size;
    }
  }

  /**
   * Evict least recently used entry from memory cache
   * Validates: Requirement 5.3 (LRU eviction policy)
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.memoryCache.get(oldestKey)!;
      this.currentMemorySize -= entry.size;
      this.memoryCache.delete(oldestKey);
    }
  }

  /**
   * Get entry from IndexedDB
   * Validates: Requirement 5.8
   */
  private async getFromDisk(key: string): Promise<CacheEntry | null> {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction(['thumbnails'], 'readonly');
      const objectStore = transaction.objectStore('thumbnails');
      const request = objectStore.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get entry from disk: ${key}`));
      };
    });
  }

  /**
   * Save entry to IndexedDB
   * Validates: Requirement 5.8
   */
  private async saveToDisk(key: string, entry: CacheEntry): Promise<void> {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction(['thumbnails'], 'readwrite');
      const objectStore = transaction.objectStore('thumbnails');
      const request = objectStore.put(entry);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        // Handle quota exceeded error
        if (request.error?.name === 'QuotaExceededError') {
          this.handleQuotaExceeded().then(() => {
            // Retry after cleanup
            this.saveToDisk(key, entry).then(resolve).catch(reject);
          }).catch(reject);
        } else {
          reject(new Error(`Failed to save entry to disk: ${key}`));
        }
      };
    });
  }

  /**
   * Handle quota exceeded error by removing oldest entries
   * Validates: Requirement 5.8
   */
  private async handleQuotaExceeded(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction(['thumbnails'], 'readwrite');
      const objectStore = transaction.objectStore('thumbnails');
      const index = objectStore.index('lastAccessed');
      const request = index.openCursor();

      let deletedCount = 0;
      const maxToDelete = 10; // Delete 10 oldest entries

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && deletedCount < maxToDelete) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to handle quota exceeded'));
      };
    });
  }

  /**
   * Generate cache key from video URL, time, and quality
   */
  private generateKey(videoUrl: string, time: number, quality?: string): string {
    return `${videoUrl}:${time}:${quality || this.config.quality}`;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.memoryCache.has(key);
  }

  /**
   * Get current memory cache size
   */
  size(): number {
    return this.memoryCache.size;
  }

  /**
   * Get current memory usage in bytes
   */
  getMemoryUsage(): number {
    return this.currentMemorySize;
  }

  /**
   * Clear all caches (memory and disk)
   */
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    this.currentMemorySize = 0;

    // Clear disk cache
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB not initialized'));
        return;
      }

      const transaction = this.db.transaction(['thumbnails'], 'readwrite');
      const objectStore = transaction.objectStore('thumbnails');
      const request = objectStore.clear();

      request.onsuccess = () => {
        // Notify subscribers
        this.notifyCacheClear(true);
        this.notifyCacheStats();
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear disk cache'));
      };
    });
  }

  /**
   * Preload thumbnails for given times
   * Validates: Requirements 5.5, 5.7
   */
  async preload(videoUrl: string, times: number[], quality?: string): Promise<void> {
    const promises = times.map(time => 
      this.generateAndCache(videoUrl, time, quality)
    );
    await Promise.all(promises);
  }

  /**
   * Preload adjacent thumbnails based on current position
   * Validates: Requirements 5.5, 5.7
   */
  async preloadAdjacent(
    videoUrl: string,
    currentTime: number,
    framerate: number,
    quality?: string
  ): Promise<void> {
    const frameTime = 1 / framerate;
    const times: number[] = [];

    // Preload thumbnails before and after current position
    for (let i = 1; i <= this.config.preloadDistance; i++) {
      times.push(currentTime + (i * frameTime));
      times.push(Math.max(0, currentTime - (i * frameTime)));
    }

    await this.preload(videoUrl, times, quality);
  }

  /**
   * Preload thumbnails for visible range with priority
   * Validates: Requirements 5.5, 5.7
   */
  async preloadVisible(
    videoUrl: string,
    visibleTimes: number[],
    adjacentTimes: number[],
    quality?: string
  ): Promise<void> {
    // Prioritize visible thumbnails
    const visiblePromises = visibleTimes.map(time =>
      this.generateAndCache(videoUrl, time, quality)
    );

    // Wait for visible thumbnails first
    await Promise.all(visiblePromises);

    // Then preload adjacent thumbnails in background
    const adjacentPromises = adjacentTimes.map(time =>
      this.generateAndCache(videoUrl, time, quality)
    );

    // Don't wait for adjacent thumbnails
    Promise.all(adjacentPromises).catch(err => {
      console.warn('Failed to preload adjacent thumbnails:', err);
    });
  }

  /**
   * Generate thumbnail and cache it
   * Validates: Requirements 5.5, 5.7
   */
  async generateAndCache(
    videoUrl: string,
    time: number,
    quality?: string
  ): Promise<Blob> {
    const key = this.generateKey(videoUrl, time, quality);

    // Check if already in cache
    const cached = await this.get(videoUrl, time, quality);
    if (cached) {
      return cached;
    }

    // Generate thumbnail (this would be implemented by the video player)
    const blob = await this.generateThumbnail(videoUrl, time, quality);
    await this.set(videoUrl, time, blob, quality);
    return blob;
  }

  /**
   * Generate thumbnail from video at specific time
   * This is a placeholder - actual implementation would use video element
   */
  private async generateThumbnail(
    videoUrl: string,
    time: number,
    quality?: string
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;

      video.addEventListener('loadedmetadata', () => {
        video.currentTime = time;
      });

      video.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        const qualitySettings = {
          low: { width: 160, height: 90 },
          medium: { width: 320, height: 180 },
          high: { width: 640, height: 360 }
        };

        const settings = qualitySettings[quality as keyof typeof qualitySettings] || qualitySettings.medium;
        canvas.width = settings.width;
        canvas.height = settings.height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail blob'));
            }
          }, 'image/jpeg', 0.8);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      });

      video.addEventListener('error', () => {
        reject(new Error(`Failed to load video: ${videoUrl}`));
      });
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    memoryUsage: number;
    memoryCount: number;
    maxMemorySize: number;
  } {
    return {
      memorySize: this.currentMemorySize,
      memoryUsage: (this.currentMemorySize / (this.config.maxMemorySize * 1024 * 1024)) * 100,
      memoryCount: this.memoryCache.size,
      maxMemorySize: this.config.maxMemorySize * 1024 * 1024
    };
  }
}
