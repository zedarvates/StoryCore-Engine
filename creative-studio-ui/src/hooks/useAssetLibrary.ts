/**
 * React Hook for Asset Library Service
 * 
 * Provides real-time synchronization with AssetLibraryService
 * using the Observer pattern.
 */

import { useState, useEffect, useCallback } from 'react';
import AssetLibraryService, { 
  type AssetSource, 
  type AssetSearchOptions,
  ASSET_CATEGORIES,
} from '@/services/assetLibraryService';
import type { Asset } from '@/types';

// Get singleton instance
const assetLibraryService = AssetLibraryService.getInstance();

// ============================================================================
// Hook: useAssetLibrary
// ============================================================================

export interface UseAssetLibraryReturn {
  sources: AssetSource[];
  isLoading: boolean;
  error: Error | null;
  searchAssets: (options: AssetSearchOptions) => Promise<Asset[]>;
  getAssetById: (assetId: string) => Promise<Asset | null>;
  refresh: (projectPath?: string) => Promise<void>;
  clearCache: () => void;
}

/**
 * Hook for accessing asset library with real-time synchronization
 * 
 * @param projectPath - Optional project path to load project-specific assets
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { sources, searchAssets, refresh } = useAssetLibrary('/path/to/project');
 *   
 *   const handleSearch = async () => {
 *     const results = await searchAssets({ query: 'background', type: 'image' });
 *     console.log(results);
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handleSearch}>Search</button>
 *       <button onClick={() => refresh()}>Refresh</button>
 *       {sources.map(source => (
 *         <div key={source.id}>{source.name}: {source.assets.length} assets</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAssetLibrary(projectPath?: string): UseAssetLibraryReturn {
  const [sources, setSources] = useState<AssetSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load initial assets
  useEffect(() => {
    const loadInitialAssets = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const initialSources = await assetLibraryService.getAllAssets(projectPath);
        setSources(initialSources);
      } catch (err) {
        console.error('[useAssetLibrary] Failed to load assets:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialAssets();
  }, [projectPath]);

  // Subscribe to source updates
  useEffect(() => {
    const unsubscribe = assetLibraryService.subscribeToSourceUpdates((updatedSources) => {
      console.log('[useAssetLibrary] Sources updated:', updatedSources.length);
      setSources(updatedSources);
    });

    return unsubscribe;
  }, []);

  // Search assets
  const searchAssets = useCallback(async (options: AssetSearchOptions): Promise<Asset[]> => {
    try {
      return await assetLibraryService.searchAssets(options, sources);
    } catch (err) {
      console.error('[useAssetLibrary] Search failed:', err);
      setError(err as Error);
      return [];
    }
  }, [sources]);

  // Get asset by ID
  const getAssetById = useCallback(async (assetId: string): Promise<Asset | null> => {
    try {
      return await assetLibraryService.getAssetById(assetId, sources);
    } catch (err) {
      console.error('[useAssetLibrary] Get asset failed:', err);
      setError(err as Error);
      return null;
    }
  }, [sources]);

  // Refresh assets
  const refresh = useCallback(async (newProjectPath?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedSources = await assetLibraryService.refresh(newProjectPath || projectPath);
      setSources(updatedSources);
    } catch (err) {
      console.error('[useAssetLibrary] Refresh failed:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  // Clear cache
  const clearCache = useCallback(() => {
    assetLibraryService.clearCache();
  }, []);

  return {
    sources,
    isLoading,
    error,
    searchAssets,
    getAssetById,
    refresh,
    clearCache,
  };
}

// ============================================================================
// Hook: useAssetSearch
// ============================================================================

export interface UseAssetSearchReturn {
  results: Asset[];
  isSearching: boolean;
  error: Error | null;
  search: (options: AssetSearchOptions) => Promise<void>;
  clearResults: () => void;
}

/**
 * Hook for searching assets with state management
 * 
 * @example
 * ```typescript
 * function SearchComponent() {
 *   const { results, isSearching, search } = useAssetSearch();
 *   
 *   const handleSearch = () => {
 *     search({ query: 'music', type: 'audio' });
 *   };
 *   
 *   return (
 *     <div>
 *       <button onClick={handleSearch} disabled={isSearching}>
 *         Search
 *       </button>
 *       {results.map(asset => (
 *         <div key={asset.id}>{asset.name}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAssetSearch(): UseAssetSearchReturn {
  const [results, setResults] = useState<Asset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = useCallback(async (options: AssetSearchOptions) => {
    try {
      setIsSearching(true);
      setError(null);
      const searchResults = await assetLibraryService.searchAssets(options);
      setResults(searchResults);
    } catch (err) {
      console.error('[useAssetSearch] Search failed:', err);
      setError(err as Error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isSearching,
    error,
    search,
    clearResults,
  };
}

// ============================================================================
// Hook: useAssetCategories
// ============================================================================

export interface UseAssetCategoriesReturn {
  categories: typeof ASSET_CATEGORIES;
  getAssetsByCategory: (categoryId: string) => Promise<Asset[]>;
}

/**
 * Hook for working with asset categories
 * 
 * @example
 * ```typescript
 * function CategoryFilter() {
 *   const { categories, getAssetsByCategory } = useAssetCategories();
 *   
 *   const handleCategoryClick = async (categoryId: string) => {
 *     const assets = await getAssetsByCategory(categoryId);
 *     console.log(assets);
 *   };
 *   
 *   return (
 *     <div>
 *       {categories.map(category => (
 *         <button key={category.id} onClick={() => handleCategoryClick(category.id)}>
 *           {category.name}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAssetCategories(): UseAssetCategoriesReturn {
  const getAssetsByCategory = useCallback(async (categoryId: string): Promise<Asset[]> => {
    try {
      return await assetLibraryService.getAssetsByCategory(categoryId);
    } catch (err) {
      console.error('[useAssetCategories] Get assets by category failed:', err);
      return [];
    }
  }, []);

  return {
    categories: ASSET_CATEGORIES,
    getAssetsByCategory,
  };
}

// ============================================================================
// Hook: useAssetStatistics
// ============================================================================

export interface AssetStatistics {
  totalAssets: number;
  byType: Record<string, number>;
  bySource: Record<string, number>;
}

export interface UseAssetStatisticsReturn {
  statistics: AssetStatistics | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook for getting asset statistics
 * 
 * @example
 * ```typescript
 * function StatisticsPanel() {
 *   const { statistics, isLoading } = useAssetStatistics();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!statistics) return null;
 *   
 *   return (
 *     <div>
 *       <p>Total Assets: {statistics.totalAssets}</p>
 *       <p>Images: {statistics.byType.image || 0}</p>
 *       <p>Audio: {statistics.byType.audio || 0}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAssetStatistics(): UseAssetStatisticsReturn {
  const [statistics, setStatistics] = useState<AssetStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStatistics = useCallback(async () => {
    try {
      setIsLoading(true);
      const stats = await assetLibraryService.getStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('[useAssetStatistics] Failed to load statistics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load initial statistics
  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  // Subscribe to source updates to refresh statistics
  useEffect(() => {
    const unsubscribe = assetLibraryService.subscribeToSourceUpdates(() => {
      loadStatistics();
    });

    return unsubscribe;
  }, [loadStatistics]);

  return {
    statistics,
    isLoading,
    refresh: loadStatistics,
  };
}
