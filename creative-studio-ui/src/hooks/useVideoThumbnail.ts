/**
 * useVideoThumbnail Hook - React hook for video thumbnails
 * 
 * Provides easy access to VideoThumbnailCache functionality
 * with React state integration.
 * 
 * @module hooks/useVideoThumbnail
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoThumbnailCache, ThumbnailEntry, CacheStats } from '../services/video/VideoThumbnailCache';

// ============================================
// Hook Return Type
// ============================================

export interface UseVideoThumbnailReturn {
  // Thumbnail operations
  getThumbnail: (videoId: string, frameNumber: number) => ThumbnailEntry | undefined;
  getThumbnailDataUrl: (videoId: string, frameNumber: number) => string | undefined;
  
  // Bulk operations
  getMultipleThumbnails: (videoId: string, frameNumbers: number[]) => Map<number, ThumbnailEntry>;
  preloadRange: (videoId: string, startFrame: number, endFrame: number) => void;
  
  // Video management
  registerVideo: (videoId: string, videoElement: HTMLVideoElement) => void;
  unregisterVideo: (videoId: string) => void;
  generateThumbnail: (videoId: string, frameNumber: number) => Promise<ThumbnailEntry | undefined>;
  generateRange: (videoId: string, startFrame: number, endFrame: number, frameRate: number) => Promise<void>;
  
  // Cache management
  clearCache: () => void;
  clearVideoCache: (videoId: string) => number;
  
  // Statistics
  stats: CacheStats;
  
  // Service
  cache: VideoThumbnailCache | null;
}

// ============================================
// Hook
// ============================================

export function useVideoThumbnail(): UseVideoThumbnailReturn {
  // Cache reference
  const cacheRef = useRef<VideoThumbnailCache | null>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  // State for statistics
  const [stats, setStats] = useState<CacheStats>({
    size: 0,
    maxSize: 1000,
    hits: 0,
    misses: 0,
    hitRate: 0,
    preloadCount: 0,
    preloadCompleted: 0,
    memoryUsage: 0,
  });
  
  // Initialize cache
  useEffect(() => {
    if (!cacheRef.current) {
      cacheRef.current = new VideoThumbnailCache();
    }
    
    return () => {
      if (cacheRef.current) {
        cacheRef.current.destroy();
        cacheRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Intentionally run only on mount - cache should be initialized once
  }, []);
  
  // Update stats periodically
  useEffect(() => {
    const cache = cacheRef.current;
    if (!cache) return;
    
    const interval = setInterval(() => {
      setStats(cache.getStats());
    }, 1000);
    
    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Intentionally run only on mount - stats polling should start once
  }, []);
  
  // Get cache
  const cache = cacheRef.current;
  
  // Thumbnail operations
  const getThumbnail = useCallback((videoId: string, frameNumber: number) => {
    return cache?.get(videoId, frameNumber);
  }, [cache]);
  
  const getThumbnailDataUrl = useCallback((videoId: string, frameNumber: number) => {
    const entry = cache?.get(videoId, frameNumber);
    return entry?.dataUrl;
  }, [cache]);
  
  // Bulk operations
  const getMultipleThumbnails = useCallback((videoId: string, frameNumbers: number[]) => {
    return cache?.getMultiple(videoId, frameNumbers) || new Map();
  }, [cache]);
  
  const preloadRange = useCallback((videoId: string, startFrame: number, endFrame: number) => {
    cache?.requestPreload(videoId, startFrame, endFrame);
  }, [cache]);
  
  // Video management
  const registerVideo = useCallback((videoId: string, videoElement: HTMLVideoElement) => {
    videoElementsRef.current.set(videoId, videoElement);
  }, []);
  
  const unregisterVideo = useCallback((videoId: string) => {
    videoElementsRef.current.delete(videoId);
    cache?.cancelPreloads(videoId);
  }, [cache]);
  
  const generateThumbnail = useCallback(async (videoId: string, frameNumber: number) => {
    const videoElement = videoElementsRef.current.get(videoId);
    if (!videoElement || !cache) {
      return undefined;
    }
    
    const frameRate = 30; // Should be obtained from video metadata
    const timestamp = frameNumber / frameRate;
    
    const entry = await cache.generateThumbnail(videoElement, videoId, frameNumber, timestamp);
    cache.set(entry);
    
    return entry;
  }, [cache]);
  
  const generateRange = useCallback(async (
    videoId: string,
    startFrame: number,
    endFrame: number,
    frameRate: number
  ) => {
    const videoElement = videoElementsRef.current.get(videoId);
    if (!videoElement || !cache) {
      return;
    }
    
    const entries = await cache.generateThumbnailRange(
      videoElement,
      videoId,
      startFrame,
      endFrame,
      frameRate
    );
    
    cache.setMultiple(entries);
  }, [cache]);
  
  // Cache management
  const clearCache = useCallback(() => {
    cache?.clear();
  }, [cache]);
  
  const clearVideoCache = useCallback((videoId: string) => {
    return cache?.deleteVideo(videoId) || 0;
  }, [cache]);
  
  return {
    // Thumbnail operations
    getThumbnail,
    getThumbnailDataUrl,
    
    // Bulk operations
    getMultipleThumbnails,
    preloadRange,
    
    // Video management
    registerVideo,
    unregisterVideo,
    generateThumbnail,
    generateRange,
    
    // Cache management
    clearCache,
    clearVideoCache,
    
    // Statistics
    stats,
    
    // Service
    cache,
  };
}

// ============================================
// Specialized Hooks
// ============================================

/**
 * Hook for thumbnails of a specific video
 */
export function useVideoThumbnails(videoId: string | null) {
  const {
    getThumbnail,
    getThumbnailDataUrl,
    registerVideo,
    unregisterVideo,
    generateThumbnail,
    generateRange,
    preloadRange,
  } = useVideoThumbnail();
  
  // Register video when ID changes
  useEffect(() => {
    if (!videoId) return;
    
    // Create a dummy video element or find existing one
    // In practice, this would be provided by the component
    const videoElement = document.createElement('video');
    registerVideo(videoId, videoElement);
    
    return () => {
      unregisterVideo(videoId);
    };
  }, [videoId, registerVideo, unregisterVideo]);
  
  const getFrame = useCallback((frameNumber: number) => {
    if (!videoId) return undefined;
    return getThumbnail(videoId, frameNumber);
  }, [videoId, getThumbnail]);
  
  const getFrameDataUrl = useCallback((frameNumber: number) => {
    if (!videoId) return undefined;
    return getThumbnailDataUrl(videoId, frameNumber);
  }, [videoId, getThumbnailDataUrl]);
  
  const generateFrames = useCallback(async (startFrame: number, endFrame: number, frameRate: number) => {
    if (!videoId) return;
    await generateRange(videoId, startFrame, endFrame, frameRate);
  }, [videoId, generateRange]);
  
  const preloadFrames = useCallback((startFrame: number, endFrame: number) => {
    if (!videoId) return;
    preloadRange(videoId, startFrame, endFrame);
  }, [videoId, preloadRange]);
  
  return {
    getFrame,
    getFrameDataUrl,
    generateFrames,
    preloadFrames,
  };
}

/**
 * Hook for timeline thumbnail strip
 */
export interface TimelineThumbnails {
  thumbnails: Map<number, string>;
  preloadVisible: (visibleStartFrame: number, visibleEndFrame: number, frameRate: number) => void;
  isLoading: boolean;
  progress: number;
}

export function useTimelineThumbnails(
  videoId: string | null,
  frameCount: number,
  frameRate: number,
  visibleRange: [number, number] | null
): TimelineThumbnails {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const {
    getMultipleThumbnails,
    preloadRange,
    generateRange,
    registerVideo,
    unregisterVideo,
  } = useVideoThumbnail();
  
  // Register/unregister video
  useEffect(() => {
    if (!videoId) return;
    
    const videoElement = document.createElement('video');
    registerVideo(videoId, videoElement);
    
    return () => {
      unregisterVideo(videoId);
    };
  }, [videoId, registerVideo, unregisterVideo]);
  
  // Load thumbnails for visible range
  useEffect(() => {
    if (!videoId || !visibleRange) return;
    
    const [startFrame, endFrame] = visibleRange;
    const frameNumbers: number[] = [];
    
    for (let frame = startFrame; frame <= endFrame; frame++) {
      frameNumbers.push(frame);
    }
    
    // Try to get from cache first
    const cached = getMultipleThumbnails(videoId, frameNumbers);
    
    if (cached.size === frameNumbers.length) {
      // All in cache
      const thumbnailMap = new Map<number, string>();
      cached.forEach((entry, frame) => {
        thumbnailMap.set(frame, entry.dataUrl);
      });
      setThumbnails(thumbnailMap);
      return;
    }
    
    // Need to generate
    setIsLoading(true);
    setProgress(0);
    
    const missingFrames = frameNumbers.filter(f => !cached.has(f));
    
    generateRange(videoId, missingFrames[0], missingFrames[missingFrames.length - 1], frameRate)
      .then(() => {
        // Fetch all after generation
        const allCached = getMultipleThumbnails(videoId, frameNumbers);
        const thumbnailMap = new Map<number, string>();
        allCached.forEach((entry, frame) => {
          thumbnailMap.set(frame, entry.dataUrl);
        });
        setThumbnails(thumbnailMap);
      })
      .catch(err => {
        console.warn('Failed to generate thumbnails:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [videoId, visibleRange, frameRate, getMultipleThumbnails, generateRange]);
  
  const preloadVisible = useCallback((startFrame: number, endFrame: number) => {
    if (!videoId) return;
    preloadRange(videoId, startFrame, endFrame);
  }, [videoId, preloadRange]);
  
  return {
    thumbnails,
    preloadVisible,
    isLoading,
    progress,
  };
}
