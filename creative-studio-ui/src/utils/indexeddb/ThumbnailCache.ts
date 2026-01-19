/**
 * ThumbnailCache - LRU cache with IndexedDB persistence for video thumbnails
 * Manages memory and disk caching with efficient eviction policies
 */

import { IndexedDB } from './index';

export interface ThumbnailData {
  id: string;
  videoUrl: string;
  timestamp: number;
  width: number;
  height: number;
  blob: Blob;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
}

export interface CacheConfig {
  maxMemoryItems: number;
  maxDiskItems: number;
  memorySizeMB: number;
  diskSizeMB: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxMemoryItems: 100,
  maxDiskItems: 1000,
  memorySizeMB: 50,
  diskSizeMB: 200
};

export class ThumbnailCache {
  private memoryCache = new Map<string, ThumbnailData>();
  private accessOrder: string[] = [];
  private db: IndexedDB;
  private config: CacheConfig;
  private initialized = false;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.db = new IndexedDB({
      name: 'ThumbnailCache',
      version: 1,
      stores: [{
        name: 'thumbnails',
        keyPath: 'id',
        indexes: [{
          name: 'videoUrl',
          keyPath: 'videoUrl'
        }, {
          name: 'lastAccessed',
          keyPath: 'lastAccessed'
        }]
      }]
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.db.open();
      this.initialized = true;

      // Load frequently accessed items into memory on startup
      await this.warmupMemoryCache();
    } catch (error) {
      console.warn('Failed to initialize thumbnail cache:', error);
      // Continue without persistence
    }
  }

  private async warmupMemoryCache(): Promise<void> {
    try {
      const allThumbnails = await this.db.getAll<ThumbnailData>('thumbnails');

      // Sort by access frequency and recency
      const sorted = allThumbnails
        .sort((a, b) => {
          const scoreA = a.accessCount * Math.max(0, 1 - (Date.now() - a.lastAccessed) / (24 * 60 * 60 * 1000));
          const scoreB = b.accessCount * Math.max(0, 1 - (Date.now() - b.lastAccessed) / (24 * 60 * 60 * 1000));
          return scoreB - scoreA;
        })
        .slice(0, Math.floor(this.config.maxMemoryItems * 0.5));

      for (const thumbnail of sorted) {
        this.memoryCache.set(thumbnail.id, thumbnail);
        this.accessOrder.push(thumbnail.id);
      }
    } catch (error) {
      console.warn('Failed to warmup memory cache:', error);
    }
  }

  private generateThumbnailId(videoUrl: string, timestamp: number): string {
    return `${btoa(videoUrl)}_${timestamp}`;
  }

  async get(videoUrl: string, timestamp: number): Promise<ThumbnailData | null> {
    const id = this.generateThumbnailId(videoUrl, timestamp);

    // Check memory cache first
    let thumbnail = this.memoryCache.get(id);

    if (thumbnail) {
      // Update access metadata
      thumbnail.lastAccessed = Date.now();
      thumbnail.accessCount++;
      this.updateAccessOrder(id);
      return thumbnail;
    }

    // Check disk cache
    if (this.db.isOpen) {
      try {
        thumbnail = await this.db.get<ThumbnailData>('thumbnails', id);

        if (thumbnail) {
          // Update access metadata and move to memory
          thumbnail.lastAccessed = Date.now();
          thumbnail.accessCount++;
          await this.db.put('thumbnails', thumbnail);

          // Add to memory cache if space allows
          if (this.memoryCache.size < this.config.maxMemoryItems) {
            this.memoryCache.set(id, thumbnail);
            this.accessOrder.push(id);
          }

          return thumbnail;
        }
      } catch (error) {
        console.warn('Failed to get thumbnail from disk:', error);
      }
    }

    return null;
  }

  async set(videoUrl: string, timestamp: number, blob: Blob, width: number, height: number): Promise<void> {
    const id = this.generateThumbnailId(videoUrl, timestamp);
    const now = Date.now();

    const thumbnail: ThumbnailData = {
      id,
      videoUrl,
      timestamp,
      width,
      height,
      blob,
      createdAt: now,
      lastAccessed: now,
      accessCount: 1
    };

    // Add to memory cache
    this.memoryCache.set(id, thumbnail);
    this.accessOrder.push(id);

    // Evict from memory if needed
    this.evictMemoryIfNeeded();

    // Persist to disk
    if (this.db.isOpen) {
      try {
        await this.db.put('thumbnails', thumbnail);
        await this.evictDiskIfNeeded();
      } catch (error) {
        console.warn('Failed to persist thumbnail to disk:', error);
      }
    }
  }

  private evictMemoryIfNeeded(): void {
    while (this.memoryCache.size > this.config.maxMemoryItems) {
      const evictedId = this.accessOrder.shift();
      if (evictedId) {
        this.memoryCache.delete(evictedId);
      }
    }

    // Also check memory size
    let totalSize = 0;
    for (const thumbnail of this.memoryCache.values()) {
      totalSize += thumbnail.blob.size;
    }

    const maxSizeBytes = this.config.memorySizeMB * 1024 * 1024;
    while (totalSize > maxSizeBytes && this.accessOrder.length > 0) {
      const evictedId = this.accessOrder.shift();
      if (evictedId) {
        const thumbnail = this.memoryCache.get(evictedId);
        if (thumbnail) {
          totalSize -= thumbnail.blob.size;
          this.memoryCache.delete(evictedId);
        }
      }
    }
  }

  private async evictDiskIfNeeded(): Promise<void> {
    if (!this.db.isOpen) return;

    try {
      const allThumbnails = await this.db.getAll<ThumbnailData>('thumbnails');

      if (allThumbnails.length > this.config.maxDiskItems) {
        // Sort by access frequency and recency, keep most recent
        const sorted = allThumbnails.sort((a, b) => {
          const scoreA = a.accessCount * Math.max(0, 1 - (Date.now() - a.lastAccessed) / (7 * 24 * 60 * 60 * 1000));
          const scoreB = b.accessCount * Math.max(0, 1 - (Date.now() - b.lastAccessed) / (7 * 24 * 60 * 60 * 1000));
          return scoreB - scoreA;
        });

        const toDelete = sorted.slice(this.config.maxDiskItems);
        for (const thumbnail of toDelete) {
          await this.db.delete('thumbnails', thumbnail.id);
        }
      }

      // Check disk size (approximate)
      let totalSize = 0;
      for (const thumbnail of allThumbnails) {
        totalSize += thumbnail.blob.size;
      }

      const maxSizeBytes = this.config.diskSizeMB * 1024 * 1024;
      if (totalSize > maxSizeBytes) {
        // Simple FIFO eviction when size limit exceeded
        const sortedByAge = allThumbnails.sort((a, b) => a.createdAt - b.createdAt);
        let currentSize = totalSize;

        for (const thumbnail of sortedByAge) {
          if (currentSize <= maxSizeBytes) break;
          await this.db.delete('thumbnails', thumbnail.id);
          currentSize -= thumbnail.blob.size;
        }
      }
    } catch (error) {
      console.warn('Failed to evict disk cache:', error);
    }
  }

  private updateAccessOrder(id: string): void {
    const index = this.accessOrder.indexOf(id);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(id);
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.accessOrder.length = 0;

    if (this.db.isOpen) {
      try {
        await this.db.clear('thumbnails');
      } catch (error) {
        console.warn('Failed to clear disk cache:', error);
      }
    }
  }

  async getStats(): Promise<{
    memoryItems: number;
    diskItems: number;
    memorySizeMB: number;
    diskSizeMB: number;
  }> {
    let diskItems = 0;
    let diskSizeBytes = 0;

    if (this.db.isOpen) {
      try {
        const allThumbnails = await this.db.getAll<ThumbnailData>('thumbnails');
        diskItems = allThumbnails.length;
        diskSizeBytes = allThumbnails.reduce((sum, t) => sum + t.blob.size, 0);
      } catch (error) {
        console.warn('Failed to get disk stats:', error);
      }
    }

    const memorySizeBytes = Array.from(this.memoryCache.values())
      .reduce((sum, t) => sum + t.blob.size, 0);

    return {
      memoryItems: this.memoryCache.size,
      diskItems,
      memorySizeMB: memorySizeBytes / (1024 * 1024),
      diskSizeMB: diskSizeBytes / (1024 * 1024)
    };
  }

  close(): void {
    this.db.close();
  }
}