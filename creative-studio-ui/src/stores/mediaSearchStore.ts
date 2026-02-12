/**
 * Media Search Store - Zustand store for media search functionality
 * Enhanced with pagination, filters, and 10-minute cache expiry
 */

import { create } from 'zustand';
import { 
  mediaSearchService, 
  SearchResult, 
  AssetType, 
  SearchMode,
  SearchRequest 
} from '../services/mediaSearchService';

interface SearchFilters {
  projectId?: string;
  assetTypes?: AssetType[];
  searchMode?: SearchMode;
  similarityThreshold?: number;
}

interface PaginatedSearchRequest extends SearchRequest {
  offset?: number;
}

export interface MediaSearchState {
  // Query state
  query: string;
  
  // Results state
  results: SearchResult[];
  totalResults: number;
  
  // Pagination state
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  
  // Loading and error state
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  
  // Filters state
  filters: SearchFilters;
  
  // Recent searches
  recentSearches: string[];
  
  // Cache metadata
  lastSearchTimestamp: number | null;
  cacheExpiryMinutes: number;
  
  // Actions
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
  setFilters: (filters: SearchFilters) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  checkCacheExpiry: () => boolean;
}

const CACHE_EXPIRY_MINUTES = 10;
const DEFAULT_PAGE_SIZE = 20;

export const useMediaSearchStore = create<MediaSearchState>((set, get) => ({
  query: '',
  results: [],
  totalResults: 0,
  currentPage: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  error: null,
  filters: {},
  recentSearches: [],
  lastSearchTimestamp: null,
  cacheExpiryMinutes: CACHE_EXPIRY_MINUTES,

  search: async (query: string, filters?: SearchFilters) => {
    if (!query.trim()) {
      set({ error: 'La requête ne peut pas être vide', results: [] });
      return;
    }

    const { pageSize, filters: existingFilters } = get();
    const finalFilters = filters || existingFilters;

    set({ 
      isLoading: true, 
      error: null, 
      query,
      currentPage: 1,
      filters: finalFilters,
      results: [] 
    });

    try {
      const request: PaginatedSearchRequest = {
        query,
        ...finalFilters,
        limit: pageSize
      };
      const response = await mediaSearchService.search(request);

      set({
        results: response,
        totalResults: response.length,
        currentPage: 1,
        hasMore: response.length >= pageSize,
        isLoading: false,
        lastSearchTimestamp: Date.now()
      });

      // Add to recent searches
      get().addRecentSearch(query);
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erreur de recherche',
        isLoading: false 
      });
    }
  },

  loadMore: async () => {
    const { 
      isLoadingMore, 
      hasMore, 
      query, 
      filters, 
      currentPage, 
      pageSize,
      results 
    } = get();

    if (isLoadingMore || !hasMore || !query.trim()) {
      return;
    }

    set({ isLoadingMore: true, error: null });

    try {
      const offset = results.length;
      const request: PaginatedSearchRequest = {
        query,
        ...filters,
        limit: pageSize,
        offset
      };
      const response = await mediaSearchService.search(request);

      const newResults = [...results, ...response];
      const newHasMore = response.length >= pageSize;

      set({
        results: newResults,
        totalResults: newResults.length,
        currentPage: currentPage + 1,
        hasMore: newHasMore,
        isLoadingMore: false,
        lastSearchTimestamp: Date.now()
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erreur de chargement',
        isLoadingMore: false 
      });
    }
  },

  clearResults: () => {
    set({ 
      results: [], 
      query: '', 
      error: null,
      totalResults: 0,
      currentPage: 1,
      hasMore: false,
      lastSearchTimestamp: null
    });
  },

  setFilters: (filters: SearchFilters) => {
    set({ filters });
  },

  addRecentSearch: (query: string) => {
    const { recentSearches } = get();
    const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 10);
    set({ recentSearches: updated });
    
    // Persist to localStorage
    try {
      localStorage.setItem('mediaSearchRecent', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to persist recent searches:', e);
    }
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
    localStorage.removeItem('mediaSearchRecent');
  },

  checkCacheExpiry: () => {
    const { lastSearchTimestamp, cacheExpiryMinutes } = get();
    
    if (!lastSearchTimestamp) {
      return true; // No cache, needs refresh
    }

    const expiryTime = cacheExpiryMinutes * 60 * 1000;
    const isExpired = Date.now() - lastSearchTimestamp > expiryTime;

    return !isExpired;
  }
}));

// Load recent searches from localStorage on init
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('mediaSearchRecent');
    if (saved) {
      useMediaSearchStore.setState({ recentSearches: JSON.parse(saved) });
    }
  } catch (e) {
    console.warn('Failed to load recent searches:', e);
  }
}

// Export helper types for consumers
export type { SearchResult, SearchFilters, AssetType, SearchMode };
