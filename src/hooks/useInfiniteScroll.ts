/**
 * Infinite Scroll Hook
 * 
 * Requirements: 88
 * Level: 🟡 HAUTE
 * 
 * Implements infinite scroll for paginated lists
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface InfiniteScrollOptions<T> {
  loadMore: (page: number, pageSize: number) => Promise<T[]>;
  pageSize?: number;
  threshold?: number;
  initialPage?: number;
  enabled?: boolean;
  resetOnLoad?: boolean;
  cacheKey?: string;
}

export interface InfiniteScrollState<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  totalLoaded: number;
  error: Error | null;
}

/**
 * Hook for implementing infinite scroll functionality
 */
export function useInfiniteScroll<T>(
  options: InfiniteScrollOptions<T>
): InfiniteScrollState<T> & {
  loadMore: () => Promise<void>;
  reset: () => void;
  refresh: () => Promise<void>;
} {
  const {
    loadMore,
    pageSize = 20,
    threshold = 200,
    initialPage = 1,
    enabled = true,
    resetOnLoad = false,
    cacheKey,
  } = options;
  
  const [state, setState] = useState<InfiniteScrollState<T>>({
    items: [],
    isLoading: false,
    hasMore: true,
    page: initialPage,
    totalLoaded: 0,
    error: null,
  });
  
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const cacheRef = useRef<Map<string, T[]>>(new Map());
  
  // Load cached data if available
  useEffect(() => {
    if (cacheKey && cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      setState(prev => ({
        ...prev,
        items: cached,
        totalLoaded: cached.length,
      }));
    }
  }, [cacheKey]);
  
  // Setup intersection observer for automatic loading
  useEffect(() => {
    if (!enabled || !('IntersectionObserver' in window)) {
      return;
    }
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && state.hasMore && !state.isLoading) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: `${threshold}px`,
        threshold: 0.1,
      }
    );
    
    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [state.hasMore, state.isLoading, enabled, threshold]);
  
  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);
  
  const loadMoreItems = useCallback(async () => {
    if (!enabled || loadingRef.current || !state.hasMore) {
      return;
    }
    
    loadingRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const newItems = await loadMore(state.page, pageSize);
      
      if (newItems.length === 0) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          hasMore: false,
        }));
      } else {
        const updatedItems = resetOnLoad 
          ? newItems 
          : [...state.items, ...newItems];
        
        const newState = {
          items: updatedItems,
          isLoading: false,
          hasMore: newItems.length >= pageSize,
          page: state.page + 1,
          totalLoaded: updatedItems.length,
          error: null,
        };
        
        setState(newState);
        
        // Cache results if cacheKey is provided
        if (cacheKey) {
          cacheRef.current.set(cacheKey, updatedItems);
        }
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error('Failed to load more items'),
      }));
    } finally {
      loadingRef.current = false;
    }
  }, [enabled, state.hasMore, state.isLoading, state.page, pageSize, loadMore, resetOnLoad, cacheKey]);
  
  const reset = useCallback(() => {
    setState({
      items: [],
      isLoading: false,
      hasMore: true,
      page: initialPage,
      totalLoaded: 0,
      error: null,
    });
    loadingRef.current = false;
    
    if (cacheKey) {
      cacheRef.current.delete(cacheKey);
    }
  }, [initialPage, cacheKey]);
  
  const refresh = useCallback(async () => {
    reset();
    await loadMoreItems();
  }, [reset, loadMoreItems]);
  
  return {
    ...state,
    loadMore: loadMoreItems,
    reset,
    refresh,
  };
}

/**
 * Hook for virtualized infinite scroll with item heights
 */
export function useVirtualInfiniteScroll<T>(
  items: T[],
  loadMore: () => Promise<void>,
  options: {
    itemHeight: number;
    containerHeight: number;
    threshold?: number;
    overscan?: number;
  }
) {
  const { itemHeight, containerHeight, threshold = 200, overscan = 3 } = options;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isLoadingRef = useRef(false);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    // Check if we need to load more
    const shouldLoadMore = 
      endIndex >= items.length - overscan && 
      !isLoadingRef.current;
    
    if (shouldLoadMore) {
      isLoadingRef.current = true;
      loadMore().finally(() => {
        isLoadingRef.current = false;
      });
    }
    
    return {
      items: items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan, loadMore]);
  
  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return {
    visibleItems,
    onScroll,
    scrollTop,
    containerRef,
  };
}

/**
 * Hook for paginated data fetching with infinite scroll
 */
export function usePaginatedInfiniteScroll<T>(
  fetchPage: (page: number, pageSize: number) => Promise<{ data: T[]; total: number }>,
  options: {
    pageSize?: number;
    initialPage?: number;
    enabled?: boolean;
  } = {}
) {
  const { pageSize = 20, initialPage = 1, enabled = true } = options;
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasMore = data.length < total;
  
  const loadPage = useCallback(async (pageNum: number) => {
    if (!enabled || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchPage(pageNum, pageSize);
      
      setData(prev => 
        pageNum === 1 ? result.data : [...prev, ...result.data]
      );
      setTotal(result.total);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch page'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage, pageSize, enabled, isLoading]);
  
  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      await loadPage(page + 1);
    }
  }, [hasMore, isLoading, page, loadPage]);
  
  const refresh = useCallback(async () => {
    setData([]);
    setTotal(0);
    setPage(initialPage);
    await loadPage(1);
  }, [initialPage, loadPage]);
  
  // Initial load
  useEffect(() => {
    if (enabled) {
      loadPage(1);
    }
  }, [enabled, loadPage]);
  
  return {
    data,
    total,
    page,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

/**
 * Hook for scroll position management
 */
export function useScrollManager(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    threshold?: number;
    onLoadMore?: () => Promise<void>;
  } = {}
) {
  const { threshold = 200, onLoadMore } = options;
  const [isNearBottom, setIsNearBottom] = useState(false);
  const loadingRef = useRef(false);
  
  const checkScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    
    setIsNearBottom(distanceFromBottom < threshold);
    
    if (
      distanceFromBottom < threshold &&
      onLoadMore &&
      !loadingRef.current
    ) {
      loadingRef.current = true;
      onLoadMore().finally(() => {
        loadingRef.current = false;
      });
    }
  }, [containerRef, threshold, onLoadMore]);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('scroll', checkScroll, { passive: true });
    return () => container.removeEventListener('scroll', checkScroll);
  }, [checkScroll]);
  
  return {
    isNearBottom,
    checkScroll,
  };
}
