/**
 * Performance Optimization Utilities
 * 
 * Provides debouncing, throttling, and memoization utilities
 * Requirements: Performance goals from design
 */

import { useCallback, useEffect, useRef, useMemo } from 'react';

/**
 * Debounce function - delays execution until after wait time has elapsed
 * since the last invocation
 */
// Using 'any[]' in generic constraint to allow debouncing functions with any parameter types
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  // Use number type for browser setTimeout compatibility
  let timeout: number | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = window.setTimeout(later, wait) as unknown as number;
  };
}

/**
 * Throttle function - ensures function is called at most once per wait period
 */
// Using 'any[]' in generic constraint to allow throttling functions with any parameter types
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
  };
}

/**
 * React hook for debounced values
 * Useful for search inputs and form validation
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
 * React hook for debounced callbacks
 * Useful for event handlers that should be debounced
 */
// Using 'any[]' in generic constraint to allow debouncing callbacks with any parameter types
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * React hook for throttled callbacks
 * Useful for scroll and resize handlers
 */
// Using 'any[]' in generic constraint to allow throttling callbacks with any parameter types
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  const throttleRef = useRef(false);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (!throttleRef.current) {
        callbackRef.current(...args);
        throttleRef.current = true;

        setTimeout(() => {
          throttleRef.current = false;
        }, delay);
      }
    },
    [delay]
  );
}

/**
 * Memoize expensive computations
 * Simple memoization with single argument
 */
// Using 'any[]' in generic constraint to allow memoizing functions with any parameter types
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * React hook for memoized expensive computations
 * Wrapper around useMemo with better ergonomics
 */
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList
): T {
  return useMemo(factory, deps);
}

/**
 * Virtual scrolling helper
 * Calculates visible items for large lists
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 3
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const end = Math.min(totalItems, start + visibleCount + overscan * 2);

  return { start, end };
}

/**
 * React hook for virtual scrolling
 */
export function useVirtualScroll({
  itemCount,
  itemHeight,
  containerHeight,
  overscan = 3,
}: {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const { start, end } = useMemo(
    () =>
      calculateVisibleRange(
        scrollTop,
        containerHeight,
        itemHeight,
        itemCount,
        overscan
      ),
    [scrollTop, containerHeight, itemHeight, itemCount, overscan]
  );

  const totalHeight = itemCount * itemHeight;

  const handleScroll = useThrottledCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, 16); // ~60fps

  return {
    start,
    end,
    totalHeight,
    handleScroll,
    visibleItems: Array.from({ length: end - start }, (_, i) => start + i),
  };
}

/**
 * Batch updates helper
 * Collects multiple updates and applies them in a single batch
 */
export class BatchUpdater<T> {
  private updates: T[] = [];
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private callback: (updates: T[]) => void;
  private delay: number;

  constructor(callback: (updates: T[]) => void, delay: number = 100) {
    this.callback = callback;
    this.delay = delay;
  }

  add(update: T): void {
    this.updates.push(update);

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  flush(): void {
    if (this.updates.length > 0) {
      this.callback([...this.updates]);
      this.updates = [];
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  clear(): void {
    this.updates = [];
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

/**
 * React hook for batch updates
 */
export function useBatchUpdates<T>(
  callback: (updates: T[]) => void,
  delay: number = 100
) {
  const batcherRef = useRef<BatchUpdater<T> | null>(null);

  if (!batcherRef.current) {
    batcherRef.current = new BatchUpdater(callback, delay);
  }

  useEffect(() => {
    return () => {
      batcherRef.current?.flush();
    };
  }, []);

  return {
    add: (update: T) => batcherRef.current?.add(update),
    flush: () => batcherRef.current?.flush(),
    clear: () => batcherRef.current?.clear(),
  };
}

/**
 * Lazy load images helper
 * Returns a function to check if an element is in viewport
 */
export function createIntersectionObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    });
  }, options);
}

/**
 * React hook for lazy loading images
 */
export function useLazyLoad(ref: React.RefObject<HTMLElement>) {
  const [isVisible, setIsVisible] = React.useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = createIntersectionObserver(
      (entry) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return isVisible;
}

/**
 * Performance monitoring helper
 * Measures execution time of functions
 */
// Using 'any[]' in generic constraint to allow measuring performance of functions with any parameter types
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  label: string
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();

    console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);

    return result;
  }) as T;
}

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor(label: string, deps: React.DependencyList) {
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = performance.now();
  }, deps);

  useEffect(() => {
    const endTime = performance.now();
    const duration = endTime - startTimeRef.current;

    if (duration > 0) {
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
    }
  });
}

// Re-export React for useDebounce hook
import React from 'react';
