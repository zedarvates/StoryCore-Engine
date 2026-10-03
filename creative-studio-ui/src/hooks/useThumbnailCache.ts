/**
 * React Hook for Thumbnail Cache Service
 * 
 * Provides real-time synchronization with ThumbnailCache
 * using the Observer pattern.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ThumbnailCache,
  type ThumbnailCacheConfig,
  type CacheEntry,
  type CacheStats
} from '@/services/ThumbnailCache';

// ============================================================================
// Hook: useThumbnailCache
// ============================================================================

export interface UseThumbnailCacheReturn {
  cache: ThumbnailCache;
  stats: CacheStats;
  getThumbnail: (videoUrl: string, time: number, quality?: string) => Promise<Blob | null>;
  setThumbnail: (videoUrl: string, time: number, blob: Blob, quality?: string) => Promise<void>;
  clearCache: () => Promise<void>;
  preloadThumbnails: (videoUrl: string, times: number[], quality?: string) => Promise<void>;
  preloadAdjacent: (videoUrl: string, currentTime: number, framerate: number, quality?: string) => Promise<void>;
}

/**
 * Hook for managing thumbnail cache with real-time synchronization
 * 
 * @param config - Optional cache configuration
 * 
 * @example
 * ```typescript
 * function VideoPlayer() {
 *   const { 
 *     getThumbnail, 
 *     setThumbnail, 
 *     stats,
 *     preloadAdjacent 
 *   } = useThumbnailCache();
 *   
 *   const handleSeek = async (time: number) => {
 *     const thumbnail = await getThumbnail(videoUrl, time);
 *     if (thumbnail) {
 *       // Display thumbnail
 *     }
 *     
 *     // Preload adjacent thumbnails
 *     await preloadAdjacent(videoUrl, time, 24);
 *   };
 *   
 *   return (
 *     <div>
 *       <p>Cache usage: {stats.memoryUsage.toFixed(1)}%</p>
 *       <p>Cached thumbnails: {stats.memoryCount}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useThumbnailCache(config?: ThumbnailCacheConfig): UseThumbnailCacheReturn {
  const [cache] = useState(() => ThumbnailCache.getInstance(config));
  const [stats, setStats] = useState<CacheStats>(() => cache.getStats());

  // Subscribe to cache stats updates
  useEffect(() => {
    const unsubscribe = cache.subscribeToCacheStats((updatedStats) => {
      setStats(updatedStats);
    });

    return unsubscribe;
  }, [cache]);

  // Initialize IndexedDB
  useEffect(() => {
    cache.initIndexedDB().catch(err => {
      console.error('[useThumbnailCache] Failed to initialize IndexedDB:', err);
    });
  }, [cache]);

  // Get thumbnail
  const getThumbnail = useCallback(async (videoUrl: string, time: number, quality?: string) => {
    try {
      return await cache.get(videoUrl, time, quality);
    } catch (err) {
      console.error('[useThumbnailCache] Failed to get thumbnail:', err);
      return null;
    }
  }, [cache]);

  // Set thumbnail
  const setThumbnail = useCallback(async (videoUrl: string, time: number, blob: Blob, quality?: string) => {
    try {
      await cache.set(videoUrl, time, blob, quality);
    } catch (err) {
      console.error('[useThumbnailCache] Failed to set thumbnail:', err);
    }
  }, [cache]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      await cache.clear();
    } catch (err) {
      console.error('[useThumbnailCache] Failed to clear cache:', err);
    }
  }, [cache]);

  // Preload thumbnails
  const preloadThumbnails = useCallback(async (videoUrl: string, times: number[], quality?: string) => {
    try {
      await cache.preload(videoUrl, times, quality);
    } catch (err) {
      console.error('[useThumbnailCache] Failed to preload thumbnails:', err);
    }
  }, [cache]);

  // Preload adjacent thumbnails
  const preloadAdjacent = useCallback(async (videoUrl: string, currentTime: number, framerate: number, quality?: string) => {
    try {
      await cache.preloadAdjacent(videoUrl, currentTime, framerate, quality);
    } catch (err) {
      console.error('[useThumbnailCache] Failed to preload adjacent thumbnails:', err);
    }
  }, [cache]);

  return {
    cache,
    stats,
    getThumbnail,
    setThumbnail,
    clearCache,
    preloadThumbnails,
    preloadAdjacent,
  };
}

/**
 * Hook for fetching a specific video thumbnail
 * Matches the signature expected by ThumbnailPreview
 */
export function useVideoThumbnail(
  videoUrl: string,
  time: number,
  options: {
    quality?: string;
    preloadAdjacent?: boolean;
    framerate?: number
  } = {}
) {
  const { getThumbnail, preloadAdjacent } = useThumbnailCache();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!videoUrl) {
      setThumbnailUrl(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const blob = await getThumbnail(videoUrl, time, options.quality);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setThumbnailUrl(prev => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } else {
        setThumbnailUrl(null);
      }

      if (options.preloadAdjacent && options.framerate) {
        // Fire and forget preload
        preloadAdjacent(videoUrl, time, options.framerate, options.quality).catch(console.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [videoUrl, time, options.quality, options.preloadAdjacent, options.framerate, getThumbnail, preloadAdjacent]);

  useEffect(() => {
    load();
    return () => {
      // Cleanup is handled in state updater or new load
    };
  }, [load]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setThumbnailUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  return { thumbnailUrl, isLoading, error, reload: load };
}

// ============================================================================
// Hook: useThumbnailCacheStats
// ============================================================================

export interface UseThumbnailCacheStatsReturn {
  stats: CacheStats;
  refresh: () => void;
}

/**
 * Hook for monitoring thumbnail cache statistics
 * 
 * @example
 * ```typescript
 * function CacheMonitor() {
 *   const { stats, refresh } = useThumbnailCacheStats();
 *   
 *   return (
 *     <div>
 *       <h3>Cache Statistics</h3>
 *       <p>Memory Usage: {stats.memoryUsage.toFixed(1)}%</p>
 *       <p>Cached Items: {stats.memoryCount}</p>
 *       <p>Memory Size: {(stats.memorySize / 1024 / 1024).toFixed(2)} MB</p>
 *       <button onClick={refresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useThumbnailCacheStats(): UseThumbnailCacheStatsReturn {
  const cache = ThumbnailCache.getInstance();
  const [stats, setStats] = useState<CacheStats>(() => cache.getStats());

  // Subscribe to cache stats updates
  useEffect(() => {
    const unsubscribe = cache.subscribeToCacheStats((updatedStats) => {
      setStats(updatedStats);
    });

    return unsubscribe;
  }, [cache]);

  const refresh = useCallback(() => {
    setStats(cache.getStats());
  }, [cache]);

  return {
    stats,
    refresh,
  };
}

// ============================================================================
// Hook: useThumbnailPreloader
// ============================================================================

export interface UseThumbnailPreloaderReturn {
  isPreloading: boolean;
  preloadVisible: (videoUrl: string, visibleTimes: number[], adjacentTimes: number[], quality?: string) => Promise<void>;
  preloadRange: (videoUrl: string, startTime: number, endTime: number, interval: number, quality?: string) => Promise<void>;
}

/**
 * Hook for preloading thumbnails with loading state
 * 
 * @example
 * ```typescript
 * function ThumbnailPreloader({ videoUrl }: { videoUrl: string }) {
 *   const { isPreloading, preloadRange } = useThumbnailPreloader();
 *   
 *   const handlePreload = async () => {
 *     // Preload thumbnails every 1 second from 0 to 60 seconds
 *     await preloadRange(videoUrl, 0, 60, 1);
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handlePreload} disabled={isPreloading}>
 *         {isPreloading ? 'Preloading...' : 'Preload Thumbnails'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useThumbnailPreloader(): UseThumbnailPreloaderReturn {
  const cache = ThumbnailCache.getInstance();
  const [isPreloading, setIsPreloading] = useState(false);

  // Preload visible thumbnails
  const preloadVisible = useCallback(async (
    videoUrl: string,
    visibleTimes: number[],
    adjacentTimes: number[],
    quality?: string
  ) => {
    try {
      setIsPreloading(true);
      await cache.preloadVisible(videoUrl, visibleTimes, adjacentTimes, quality);
    } catch (err) {
      console.error('[useThumbnailPreloader] Failed to preload visible:', err);
    } finally {
      setIsPreloading(false);
    }
  }, [cache]);

  // Preload range of thumbnails
  const preloadRange = useCallback(async (
    videoUrl: string,
    startTime: number,
    endTime: number,
    interval: number,
    quality?: string
  ) => {
    try {
      setIsPreloading(true);
      const times: number[] = [];
      for (let time = startTime; time <= endTime; time += interval) {
        times.push(time);
      }
      await cache.preload(videoUrl, times, quality);
    } catch (err) {
      console.error('[useThumbnailPreloader] Failed to preload range:', err);
    } finally {
      setIsPreloading(false);
    }
  }, [cache]);

  return {
    isPreloading,
    preloadVisible,
    preloadRange,
  };
}

// ============================================================================
// Hook: useThumbnailCacheClear
// ============================================================================

export interface UseThumbnailCacheClearReturn {
  clearCache: () => Promise<void>;
  isClearing: boolean;
  cacheCleared: boolean;
}

/**
 * Hook for clearing thumbnail cache with state management
 * 
 * @example
 * ```typescript
 * function CacheClearButton() {
 *   const { clearCache, isClearing, cacheCleared } = useThumbnailCacheClear();
 *   
 *   return (
 *     <div>
 *       <button onClick={clearCache} disabled={isClearing}>
 *         {isClearing ? 'Clearing...' : 'Clear Cache'}
 *       </button>
 *       {cacheCleared && <p>Cache cleared successfully!</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useThumbnailCacheClear(): UseThumbnailCacheClearReturn {
  const cache = ThumbnailCache.getInstance();
  const [isClearing, setIsClearing] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  // Subscribe to cache clear events
  useEffect(() => {
    const unsubscribe = cache.subscribeToCacheClear((cleared) => {
      setCacheCleared(cleared);

      // Reset flag after 3 seconds
      if (cleared) {
        setTimeout(() => setCacheCleared(false), 3000);
      }
    });

    return unsubscribe;
  }, [cache]);

  const clearCache = useCallback(async () => {
    try {
      setIsClearing(true);
      await cache.clear();
    } catch (err) {
      console.error('[useThumbnailCacheClear] Failed to clear cache:', err);
    } finally {
      setIsClearing(false);
    }
  }, [cache]);

  return {
    clearCache,
    isClearing,
    cacheCleared,
  };
}
