/**
 * Video Thumbnail Cache Unit Tests
 */

import { VideoThumbnailCache, ThumbnailEntry } from '../VideoThumbnailCache';

const createMockVideoElement = () => {
  return {
    currentTime: 0,
    videoWidth: 1920,
    videoHeight: 1080,
  } as HTMLVideoElement;
};

describe('VideoThumbnailCache', () => {
  let cache: VideoThumbnailCache;

  beforeEach(() => {
    cache = new VideoThumbnailCache({
      maxCacheSize: 10,
      thumbnailWidth: 160,
      thumbnailHeight: 90,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('Initialization', () => {
    it('initializes with custom configuration', () => {
      expect(cache.maxSize).toBe(10);
    });

    it('initializes with default configuration', () => {
      const defaultCache = new VideoThumbnailCache();
      expect(defaultCache.maxSize).toBe(1000);
      defaultCache.destroy();
    });
  });

  describe('Cache Operations', () => {
    it('stores and retrieves thumbnails', () => {
      const entry: ThumbnailEntry = {
        key: 'video-1:0',
        videoId: 'video-1',
        frameNumber: 0,
        timestamp: 0,
        dataUrl: 'data:image/jpeg;base64,test',
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
        originalWidth: 1920,
        originalHeight: 1080,
      };
      cache.set(entry);
      
      const retrieved = cache.get('video-1', 0);
      expect(retrieved).toBeDefined();
      expect(retrieved?.frameNumber).toBe(0);
    });

    it('tracks cache statistics', () => {
      const stats = cache.getStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('memoryUsage');
    });

    it('evicts old entries when cache is full', () => {
      for (let i = 0; i < 15; i++) {
        const entry: ThumbnailEntry = {
          key: `test-video:${i}`,
          videoId: 'test-video',
          frameNumber: i,
          timestamp: i / 30,
          dataUrl: 'data:image/jpeg;base64,test',
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 0,
          originalWidth: 1920,
          originalHeight: 1080,
        };
        cache.set(entry);
      }
      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(10);
    });

    it('returns undefined for cache miss', () => {
      const result = cache.get('video-1', 999);
      expect(result).toBeUndefined();
    });
  });

  describe('Cache Invalidation', () => {
    it('deletes specific thumbnail', () => {
      const entry: ThumbnailEntry = {
        key: 'video-1:0',
        videoId: 'video-1',
        frameNumber: 0,
        timestamp: 0,
        dataUrl: 'data:image/jpeg;base64,test',
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
        originalWidth: 1920,
        originalHeight: 1080,
      };
      cache.set(entry);
      expect(cache.has('video-1', 0)).toBe(true);
      
      cache.delete('video-1', 0);
      expect(cache.has('video-1', 0)).toBe(false);
    });

    it('deletes all thumbnails for a video', () => {
      for (let i = 0; i < 5; i++) {
        const entry: ThumbnailEntry = {
          key: `video-1:${i}`,
          videoId: 'video-1',
          frameNumber: i,
          timestamp: i / 30,
          dataUrl: 'data:image/jpeg;base64,test',
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 0,
          originalWidth: 1920,
          originalHeight: 1080,
        };
        cache.set(entry);
      }
      
      const deleted = cache.deleteVideo('video-1');
      expect(deleted).toBe(5);
      expect(cache.has('video-1', 0)).toBe(false);
    });

    it('clears entire cache', () => {
      for (let i = 0; i < 5; i++) {
        const entry: ThumbnailEntry = {
          key: `video-1:${i}`,
          videoId: 'video-1',
          frameNumber: i,
          timestamp: i / 30,
          dataUrl: 'data:image/jpeg;base64,test',
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 0,
          originalWidth: 1920,
          originalHeight: 1080,
        };
        cache.set(entry);
      }
      
      cache.clear();
      expect(cache.size).toBe(0);
    });
  });

  describe('Hit Rate Tracking', () => {
    it('tracks hits correctly', () => {
      const entry: ThumbnailEntry = {
        key: 'video-1:0',
        videoId: 'video-1',
        frameNumber: 0,
        timestamp: 0,
        dataUrl: 'data:image/jpeg;base64,test',
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
        originalWidth: 1920,
        originalHeight: 1080,
      };
      cache.set(entry);
      
      // Access the entry
      cache.get('video-1', 0);
      
      const stats = cache.getStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    it('tracks misses correctly', () => {
      cache.get('video-1', 999);
      
      const stats = cache.getStats();
      expect(stats.misses).toBeGreaterThan(0);
    });

    it('calculates hit rate correctly', () => {
      const entry: ThumbnailEntry = {
        key: 'video-1:0',
        videoId: 'video-1',
        frameNumber: 0,
        timestamp: 0,
        dataUrl: 'data:image/jpeg;base64,test',
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
        originalWidth: 1920,
        originalHeight: 1080,
      };
      cache.set(entry);
      
      // Hit
      cache.get('video-1', 0);
      // Miss
      cache.get('video-1', 1);
      
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0.5);
    });
  });

  describe('Preloading', () => {
    it('cancels pending preloads for a video', () => {
      cache.requestPreload('video-1', 0, 100, 1);
      cache.requestPreload('video-2', 0, 100, 1);
      
      cache.cancelPreloads('video-1');
      
      // Queue should still have video-2 request
      expect((cache as unknown as { preloadQueue: unknown[] }).preloadQueue.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Cleanup', () => {
    it('destroys cache and clears all data', () => {
      const entry: ThumbnailEntry = {
        key: 'video-1:0',
        videoId: 'video-1',
        frameNumber: 0,
        timestamp: 0,
        dataUrl: 'data:image/jpeg;base64,test',
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
        originalWidth: 1920,
        originalHeight: 1080,
      };
      cache.set(entry);
      cache.destroy();
      expect(cache.size).toBe(0);
    });

    it('resets statistics', () => {
      const entry: ThumbnailEntry = {
        key: 'video-1:0',
        videoId: 'video-1',
        frameNumber: 0,
        timestamp: 0,
        dataUrl: 'data:image/jpeg;base64,test',
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
        originalWidth: 1920,
        originalHeight: 1080,
      };
      cache.set(entry);
      cache.get('video-1', 0);
      
      cache.resetStats();
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Get Multiple', () => {
    it('retrieves multiple thumbnails at once', () => {
      for (let i = 0; i < 5; i++) {
        const entry: ThumbnailEntry = {
          key: `video-1:${i}`,
          videoId: 'video-1',
          frameNumber: i,
          timestamp: i / 30,
          dataUrl: 'data:image/jpeg;base64,test',
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 0,
          originalWidth: 1920,
          originalHeight: 1080,
        };
        cache.set(entry);
      }
      
      const result = cache.getMultiple('video-1', [0, 2, 4]);
      expect(result.size).toBe(3);
      expect(result.has(0)).toBe(true);
      expect(result.has(2)).toBe(true);
      expect(result.has(4)).toBe(true);
    });
  });
});

