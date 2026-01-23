/**
 * React Hook for Narrative Service
 * 
 * Provides real-time synchronization with NarrativeService
 * using the Observer pattern.
 */

import { useState, useEffect, useCallback } from 'react';
import { NarrativeService } from '@/services/asset-integration/NarrativeService';
import type { NarrativeText } from '@/types/asset-integration';

// Get singleton instance
const narrativeService = NarrativeService.getInstance();

// ============================================================================
// Hook: useNarrative
// ============================================================================

export interface UseNarrativeReturn {
  narrative: NarrativeText | null;
  isLoading: boolean;
  error: Error | null;
  loadNarrative: (path: string) => Promise<void>;
  saveNarrative: (narrative: NarrativeText, path: string) => Promise<void>;
  createNewNarrative: (title: string, type?: NarrativeText['type']) => NarrativeText;
  updateContent: (narrative: NarrativeText, newContent: string) => NarrativeText;
  clearCache: () => void;
}

/**
 * Hook for managing narrative texts with real-time synchronization
 * 
 * @param initialPath - Optional path to load narrative on mount
 * 
 * @example
 * ```typescript
 * function NarrativeEditor() {
 *   const { 
 *     narrative, 
 *     isLoading, 
 *     loadNarrative, 
 *     saveNarrative,
 *     updateContent 
 *   } = useNarrative('/path/to/narrative.txt');
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!narrative) return <div>No narrative loaded</div>;
 *   
 *   return (
 *     <div>
 *       <h2>{narrative.title}</h2>
 *       <textarea value={narrative.content} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useNarrative(initialPath?: string): UseNarrativeReturn {
  const [narrative, setNarrative] = useState<NarrativeText | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(initialPath || null);

  // Load initial narrative
  useEffect(() => {
    if (initialPath) {
      loadNarrative(initialPath);
    }
  }, [initialPath]);

  // Subscribe to narrative updates
  useEffect(() => {
    const unsubscribe = narrativeService.subscribeToNarrativeUpdates((path, updatedNarrative) => {
      
      // Update if it's the current narrative
      if (currentPath && path === currentPath) {
        setNarrative(updatedNarrative);
      }
    });

    return unsubscribe;
  }, [currentPath]);

  // Load narrative
  const loadNarrative = useCallback(async (path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setCurrentPath(path);
      const loadedNarrative = await narrativeService.loadNarrativeText(path);
      setNarrative(loadedNarrative);
    } catch (err) {
      console.error('[useNarrative] Failed to load narrative:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save narrative
  const saveNarrative = useCallback(async (narrativeToSave: NarrativeText, path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await narrativeService.saveNarrativeText(narrativeToSave, path);
      setNarrative(narrativeToSave);
      setCurrentPath(path);
    } catch (err) {
      console.error('[useNarrative] Failed to save narrative:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new narrative
  const createNewNarrative = useCallback((title: string, type?: NarrativeText['type']): NarrativeText => {
    const newNarrative = narrativeService.createNewNarrative(title, type);
    setNarrative(newNarrative);
    setCurrentPath(null); // New narrative doesn't have a path yet
    return newNarrative;
  }, []);

  // Update content
  const updateContent = useCallback((narrativeToUpdate: NarrativeText, newContent: string): NarrativeText => {
    const updatedNarrative = narrativeService.updateNarrativeContent(narrativeToUpdate, newContent);
    setNarrative(updatedNarrative);
    return updatedNarrative;
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    narrativeService.clearCache();
  }, []);

  return {
    narrative,
    isLoading,
    error,
    loadNarrative,
    saveNarrative,
    createNewNarrative,
    updateContent,
    clearCache,
  };
}

// ============================================================================
// Hook: useNarrativeCache
// ============================================================================

export interface UseNarrativeCacheReturn {
  clearCache: () => void;
  cacheCleared: boolean;
}

/**
 * Hook for managing narrative cache
 * 
 * @example
 * ```typescript
 * function CacheManager() {
 *   const { clearCache, cacheCleared } = useNarrativeCache();
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
export function useNarrativeCache(): UseNarrativeCacheReturn {
  const [cacheCleared, setCacheCleared] = useState(false);

  // Subscribe to cache updates
  useEffect(() => {
    const unsubscribe = narrativeService.subscribeToCacheUpdates((cleared) => {
      setCacheCleared(cleared);
      
      // Reset flag after 3 seconds
      if (cleared) {
        setTimeout(() => setCacheCleared(false), 3000);
      }
    });

    return unsubscribe;
  }, []);

  const clearCache = useCallback(() => {
    narrativeService.clearCache();
  }, []);

  return {
    clearCache,
    cacheCleared,
  };
}

// ============================================================================
// Hook: useNarrativeList
// ============================================================================

export interface UseNarrativeListReturn {
  narratives: string[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for listing available narratives
 * 
 * @example
 * ```typescript
 * function NarrativeList() {
 *   const { narratives, isLoading, refresh } = useNarrativeList();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   
 *   return (
 *     <div>
 *       <button onClick={refresh}>Refresh</button>
 *       <ul>
 *         {narratives.map(path => <li key={path}>{path}</li>)}
 *       </ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useNarrativeList(): UseNarrativeListReturn {
  const [narratives, setNarratives] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadNarratives = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const availableNarratives = await narrativeService.listAvailableNarratives();
      setNarratives(availableNarratives);
    } catch (err) {
      console.error('[useNarrativeList] Failed to load narratives:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load narratives on mount
  useEffect(() => {
    loadNarratives();
  }, [loadNarratives]);

  return {
    narratives,
    isLoading,
    error,
    refresh: loadNarratives,
  };
}
