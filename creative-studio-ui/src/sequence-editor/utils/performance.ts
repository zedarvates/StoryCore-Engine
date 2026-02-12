/**
 * Performance Optimization Utilities
 * 
 * Provides utilities for optimizing component rendering, memoization,
 * and bundle size optimization.
 * 
 * Requirements: 3.6, 20.1, 22.3
 */

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { debounce, throttle } from '../../utils/debounceAndThrottle';

// Re-export debounce and throttle from unified module
export { debounce, throttle };

// ============================================================================
// Request Idle Callback
// ============================================================================

/**
 * Request idle callback with fallback
 */
export const requestIdleCallback =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? window.requestIdleCallback
    : (callback: IdleRequestCallback) => setTimeout(callback, 1);

/**
 * Cancel idle callback with fallback
 */
export const cancelIdleCallback =
  typeof window !== 'undefined' && 'cancelIdleCallback' in window
    ? window.cancelIdleCallback
    : (id: number) => clearTimeout(id);

// ============================================================================
// React Hooks for Performance
// ============================================================================

/**
 * Hook for debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Hook for throttled value
 */
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastRan = useRef<number>(Date.now());
  
  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);
  
  return throttledValue;
}

/**
 * Hook for debounced callback
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * Hook for throttled callback
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const inThrottle = useRef<boolean>(false);
  
  return useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callback(...args);
        inThrottle.current = true;
        setTimeout(() => {
          inThrottle.current = false;
        }, limit);
      }
    },
    [callback, limit]
  );
}

// ============================================================================
// Intersection Observer for Lazy Loading
// ============================================================================

export interface UseIntersectionObserverOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  freezeOnceVisible?: boolean;
}

/**
 * Hook for intersection observer (lazy loading)
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: UseIntersectionObserverOptions = {}
): IntersectionObserverEntry | undefined {
  const { root = null, rootMargin = '0px', threshold = 0, freezeOnceVisible = false } = options;
  
  const [entry, setEntry] = React.useState<IntersectionObserverEntry>();
  
  const frozen = entry?.isIntersecting && freezeOnceVisible;
  
  useEffect(() => {
    const node = elementRef?.current;
    const hasIOSupport = !!window.IntersectionObserver;
    
    if (!hasIOSupport || frozen || !node) return;
    
    const observerParams = { threshold, root, rootMargin };
    const observer = new IntersectionObserver(([entry]) => setEntry(entry), observerParams);
    
    observer.observe(node);
    
    return () => observer.disconnect();
  }, [elementRef, threshold, root, rootMargin, frozen]);
  
  return entry;
}

// ============================================================================
// Virtual Scrolling Utilities
// ============================================================================

export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  itemCount: number;
  overscan?: number;
}

export interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  visibleItems: number;
}

/**
 * Calculate visible items for virtual scrolling
 */
export function calculateVirtualScroll(
  scrollTop: number,
  options: VirtualScrollOptions
): VirtualScrollResult {
  const { itemHeight, containerHeight, itemCount, overscan = 3 } = options;
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleItems = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(itemCount - 1, startIndex + visibleItems + overscan * 2);
  const offsetY = startIndex * itemHeight;
  
  return {
    startIndex,
    endIndex,
    offsetY,
    visibleItems,
  };
}

/**
 * Hook for virtual scrolling
 */
export function useVirtualScroll(
  containerRef: React.RefObject<HTMLElement>,
  options: VirtualScrollOptions
): VirtualScrollResult {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = throttle(() => {
      setScrollTop(container.scrollTop);
    }, 16); // ~60fps
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [containerRef]);
  
  return useMemo(
    () => calculateVirtualScroll(scrollTop, options),
    [scrollTop, options.itemHeight, options.containerHeight, options.itemCount, options.overscan]
  );
}

// ============================================================================
// Memoization Utilities
// ============================================================================

/**
 * Deep equality check for objects
 */
export function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;
  
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }
  
  return true;
}

/**
 * Shallow equality check for objects
 */
export function shallowEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;
  
  if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }
  
  return true;
}

// ============================================================================
// Performance Monitoring
// ============================================================================

/**
 * Measure component render time
 */
export function measureRenderTime(componentName: string): () => void {
  const startTime = performance.now();
  
  return () => {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    if (renderTime > 16) {
      // Warn if render takes longer than one frame (60fps)
      console.warn(`${componentName} render took ${renderTime.toFixed(2)}ms`);
    }
  };
}

/**
 * Hook for measuring component render time
 */
export function useRenderTime(componentName: string): void {
  useEffect(() => {
    const endMeasure = measureRenderTime(componentName);
    return endMeasure;
  });
}

/**
 * Hook for detecting slow renders
 */
export function useSlowRenderDetection(componentName: string, threshold: number = 16): void {
  const renderCount = useRef(0);
  const slowRenderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current++;
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      
      if (renderTime > threshold) {
        slowRenderCount.current++;
        console.warn(
          `${componentName} slow render #${slowRenderCount.current}/${renderCount.current}: ${renderTime.toFixed(2)}ms`
        );
      }
    };
  });
}

// ============================================================================
// Memory Management
// ============================================================================

/**
 * Create a cache with size limit
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
  
  set(key: K, value: V): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Add to end
    this.cache.set(key, value);
    
    // Remove oldest if over limit
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }
  
  has(key: K): boolean {
    return this.cache.has(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Hook for LRU cache
 */
export function useLRUCache<K, V>(maxSize: number = 100): LRUCache<K, V> {
  // Use useState with lazy initialization to avoid constructor issues in production
  const [cache] = useState(() => new LRUCache<K, V>(maxSize));
  return cache;
}

// ============================================================================
// Code Splitting Utilities
// ============================================================================

/**
 * Preload a lazy-loaded component
 */
export function preloadComponent(
  lazyComponent: React.LazyExoticComponent<React.ComponentType<any>>
): void {
  // @ts-ignore - accessing internal _result
  if (lazyComponent._result === null) {
    // @ts-ignore - accessing internal _ctor
    lazyComponent._ctor();
  }
}

// ============================================================================
// Export React import for hooks that use useState
// ============================================================================

import * as React from 'react';


