/**
 * React Hook for Timeline Service
 * 
 * Provides real-time synchronization with TimelineService
 * using the Observer pattern.
 */

import { useState, useEffect, useCallback } from 'react';
import { TimelineService } from '@/services/asset-integration/TimelineService';
import type { VideoTimelineMetadata, Scene } from '@/types/asset-integration';

// Get singleton instance
const timelineService = TimelineService.getInstance();

// ============================================================================
// Hook: useTimeline
// ============================================================================

export interface UseTimelineReturn {
  timeline: VideoTimelineMetadata | null;
  isLoading: boolean;
  error: Error | null;
  loadTimeline: (path: string) => Promise<void>;
  saveTimeline: (timeline: VideoTimelineMetadata, path: string) => Promise<void>;
  createNewScene: (sceneNumber: number, startTime: number, duration: number) => Scene;
  calculateTotalDuration: (scenes: Scene[]) => number;
  validateTimeline: (timeline: VideoTimelineMetadata) => { isValid: boolean; errors: string[] };
  clearCache: () => void;
}

/**
 * Hook for managing video timelines with real-time synchronization
 * 
 * @param initialPath - Optional path to load timeline on mount
 * 
 * @example
 * ```typescript
 * function TimelineEditor() {
 *   const { 
 *     timeline, 
 *     isLoading, 
 *     loadTimeline, 
 *     saveTimeline 
 *   } = useTimeline('/path/to/timeline.json');
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!timeline) return <div>No timeline loaded</div>;
 *   
 *   return (
 *     <div>
 *       <h2>{timeline.metadata.title}</h2>
 *       <p>Scenes: {timeline.scenes.length}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTimeline(initialPath?: string): UseTimelineReturn {
  const [timeline, setTimeline] = useState<VideoTimelineMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(initialPath || null);

  // Load initial timeline
  useEffect(() => {
    if (initialPath) {
      loadTimeline(initialPath);
    }
  }, [initialPath]);

  // Subscribe to timeline updates
  useEffect(() => {
    const unsubscribe = timelineService.subscribeToTimelineUpdates((path, updatedTimeline) => {
      console.log('[useTimeline] Timeline updated:', path);
      
      // Update if it's the current timeline
      if (currentPath && path === currentPath) {
        setTimeline(updatedTimeline);
      }
    });

    return unsubscribe;
  }, [currentPath]);

  // Load timeline
  const loadTimeline = useCallback(async (path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentPath(path);
      const loadedTimeline = await timelineService.loadTimeline(path);
      setTimeline(loadedTimeline);
    } catch (err) {
      console.error('[useTimeline] Failed to load timeline:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save timeline
  const saveTimeline = useCallback(async (timelineToSave: VideoTimelineMetadata, path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await timelineService.saveTimeline(timelineToSave, path);
      setTimeline(timelineToSave);
      setCurrentPath(path);
    } catch (err) {
      console.error('[useTimeline] Failed to save timeline:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new scene
  const createNewScene = useCallback((sceneNumber: number, startTime: number, duration: number): Scene => {
    return timelineService.createNewScene(sceneNumber, startTime, duration);
  }, []);

  // Calculate total duration
  const calculateTotalDuration = useCallback((scenes: Scene[]): number => {
    return timelineService.calculateTotalDuration(scenes);
  }, []);

  // Validate timeline
  const validateTimeline = useCallback((timelineToValidate: VideoTimelineMetadata) => {
    return timelineService.validateTimeline(timelineToValidate);
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    timelineService.clearCache();
  }, []);

  return {
    timeline,
    isLoading,
    error,
    loadTimeline,
    saveTimeline,
    createNewScene,
    calculateTotalDuration,
    validateTimeline,
    clearCache,
  };
}

// ============================================================================
// Hook: useTimelineCache
// ============================================================================

export interface UseTimelineCacheReturn {
  clearCache: () => void;
  cacheCleared: boolean;
}

/**
 * Hook for managing timeline cache
 * 
 * @example
 * ```typescript
 * function CacheManager() {
 *   const { clearCache, cacheCleared } = useTimelineCache();
 *   
 *   return (
 *     <div>
 *       <button onClick={clearCache}>Clear Cache</button>
 *       {cacheCleared && <p>Cache cleared!</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTimelineCache(): UseTimelineCacheReturn {
  const [cacheCleared, setCacheCleared] = useState(false);

  // Subscribe to cache updates
  useEffect(() => {
    const unsubscribe = timelineService.subscribeToCacheUpdates((cleared) => {
      console.log('[useTimelineCache] Cache update:', cleared);
      setCacheCleared(cleared);
      
      // Reset flag after 3 seconds
      if (cleared) {
        setTimeout(() => setCacheCleared(false), 3000);
      }
    });

    return unsubscribe;
  }, []);

  const clearCache = useCallback(() => {
    timelineService.clearCache();
  }, []);

  return {
    clearCache,
    cacheCleared,
  };
}

// ============================================================================
// Hook: useTimelineValidation
// ============================================================================

export interface UseTimelineValidationReturn {
  validate: (timeline: VideoTimelineMetadata) => { isValid: boolean; errors: string[] };
  isValid: boolean;
  errors: string[];
}

/**
 * Hook for timeline validation
 * 
 * @param timeline - Timeline to validate
 * 
 * @example
 * ```typescript
 * function ValidationPanel({ timeline }: { timeline: VideoTimelineMetadata }) {
 *   const { isValid, errors } = useTimelineValidation(timeline);
 *   
 *   return (
 *     <div>
 *       <p>Valid: {isValid ? 'Yes' : 'No'}</p>
 *       {errors.length > 0 && (
 *         <ul>
 *           {errors.map((error, i) => <li key={i}>{error}</li>)}
 *         </ul>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTimelineValidation(timeline: VideoTimelineMetadata | null): UseTimelineValidationReturn {
  const [isValid, setIsValid] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const validate = useCallback((timelineToValidate: VideoTimelineMetadata) => {
    const result = timelineService.validateTimeline(timelineToValidate);
    setIsValid(result.isValid);
    setErrors(result.errors);
    return result;
  }, []);

  // Auto-validate when timeline changes
  useEffect(() => {
    if (timeline) {
      validate(timeline);
    }
  }, [timeline, validate]);

  return {
    validate,
    isValid,
    errors,
  };
}
