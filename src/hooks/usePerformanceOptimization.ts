/**
 * Performance Optimization Hooks
 * 
 * Requirements: 86-91
 * Level: 🟡 HAUTE
 * 
 * Custom hooks for React performance optimization
 */

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

/**
 * Hook for memoizing expensive calculations
 */
export function useExpensiveCalculation<T>(
  calculate: () => T,
  dependencies: any[],
  options: { enabled?: boolean } = {}
): T {
  const { enabled = true } = options;
  
  return useMemo(() => {
    if (!enabled) {
      return undefined as any;
    }
    return calculate();
  }, [enabled, ...dependencies]);
}

/**
 * Hook for memoizing event handlers with automatic dependency tracking
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  dependencies: any[] = []
): T {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, dependencies);
}

/**
 * Hook for tracking render performance
 */
export function useRenderTracking(name: string) {
  const renderCount = useRef(0);
  const firstRenderTime = useRef<number | null>(null);
  const lastRenderTime = useRef<number | null>(null);
  
  useEffect(() => {
    if (firstRenderTime.current === null) {
      firstRenderTime.current = performance.now();
    }
    lastRenderTime.current = performance.now();
    renderCount.current += 1;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[RenderTrack] ${name}:`, {
        renderCount: renderCount.current,
        timeSinceFirst: firstRenderTime.current 
          ? `${(performance.now() - firstRenderTime.current).toFixed(2)}ms`
          : 'N/A',
        timeSinceLast: lastRenderTime.current 
          ? `${(performance.now() - (lastRenderTime.current - (performance.now() - lastRenderTime.current))).toFixed(2)}ms`
          : 'N/A',
      });
    }
  });
  
  return {
    renderCount: renderCount.current,
    firstRenderTime: firstRenderTime.current,
    lastRenderTime: lastRenderTime.current,
  };
}

/**
 * Hook for conditional memoization
 */
export function useConditionalMemo<T>(
  factory: () => T,
  condition: boolean,
  dependencies: any[]
): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);
  
  useEffect(() => {
    if (condition) {
      setValue(factory());
    } else {
      setValue(undefined);
    }
  }, [condition, ...dependencies]);
  
  return value;
}

/**
 * Hook for batching state updates
 */
export function useBatchUpdates() {
  const updateQueue = useRef<Array<() => void>>([]);
  const isProcessing = useRef(false);
  
  const batchUpdate = useCallback((update: () => void) => {
    updateQueue.current.push(update);
    
    if (!isProcessing.current) {
      isProcessing.current = true;
      
      // Process updates in next tick
      Promise.resolve().then(() => {
        while (updateQueue.current.length > 0) {
          const update = updateQueue.current.shift();
          if (update) {
            update();
          }
        }
        isProcessing.current = false;
      });
    }
  }, []);
  
  return batchUpdate;
}

/**
 * Hook for measuring performance
 */
export function usePerformanceMeasure(name: string) {
  const startTime = useRef<number | null>(null);
  const measurements = useRef<Array<{ name: string; duration: number }>>([]);
  
  const start = useCallback(() => {
    startTime.current = performance.now();
  }, []);
  
  const end = useCallback((measurementName?: string) => {
    if (startTime.current !== null) {
      const duration = performance.now() - startTime.current;
      const measureName = measurementName || name;
      
      measurements.current.push({
        name: measureName,
        duration,
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Perf] ${measureName}: ${duration.toFixed(2)}ms`);
      }
      
      startTime.current = null;
      return duration;
    }
    return 0;
  }, [name]);
  
  const getMeasurements = useCallback(() => {
    return measurements.current;
  }, []);
  
  const clearMeasurements = useCallback(() => {
    measurements.current = [];
  }, []);
  
  return {
    start,
    end,
    getMeasurements,
    clearMeasurements,
  };
}

/**
 * Hook for optimizing re-renders with deep comparison
 */
export function useDeepMemo<T>(value: T): T {
  const ref = useRef<T>(value);
  const signalRef = useRef<number>(0);
  
  if (!deepEqual(ref.current, value)) {
    ref.current = value;
    signalRef.current += 1;
  }
  
  return ref.current;
}

/**
 * Deep equality check
 */
function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  const keysA = Object.keys(a) as Array<keyof T>;
  const keysB = Object.keys(b) as Array<keyof T>;
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => deepEqual(a[key], b[key]));
}

/**
 * Hook for throttling function calls
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  dependencies: any[] = []
): T {
  const lastCallTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedCallback = useRef(callback);
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime.current;
    
    const execute = () => {
      lastCallTime.current = now;
      savedCallback.current(...args);
    };
    
    if (timeSinceLastCall >= delay) {
      execute();
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(execute, delay - timeSinceLastCall);
    }
  }, [delay, ...dependencies]);
}

/**
 * Hook for optimizing list rendering with windowing
 */
export function useVirtualList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 3
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    return {
      items: items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);
  
  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return {
    visibleItems,
    onScroll,
    scrollTop,
  };
}

/**
 * Hook for optimizing image loading
 */
export function useLazyImage(
  src: string,
  options: { rootMargin?: string; threshold?: number } = {}
) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    if (!src) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.01,
      }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, [src, options.rootMargin, options.threshold]);
  
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);
  
  return {
    isLoaded,
    isInView,
    imgRef,
    onLoad: handleLoad,
    shouldLoad: isInView,
  };
}

/**
 * Hook for component profiling
 */
export function useComponentProfiler(
  componentName: string,
  options: { enabled?: boolean; threshold?: number } = {}
) {
  const { enabled = process.env.NODE_ENV === 'development', threshold = 16 } = options;
  const frameTimeRef = useRef<number>(0);
  const warningCountRef = useRef<number>(0);
  
  useEffect(() => {
    if (!enabled) return;
    
    const checkPerformance = () => {
      const frameTime = performance.now() - frameTimeRef.current;
      
      if (frameTime > threshold) {
        warningCountRef.current += 1;
        console.warn(
          `[PerfWarning] ${componentName} took ${frameTime.toFixed(2)}ms ` +
          `to render (threshold: ${threshold}ms). ` +
          `Warning count: ${warningCountRef.current}`
        );
      }
      
      frameTimeRef.current = performance.now();
      requestAnimationFrame(checkPerformance);
    };
    
    frameTimeRef.current = performance.now();
    requestAnimationFrame(checkPerformance);
  }, [enabled, componentName, threshold]);
  
  return {
    warningCount: warningCountRef.current,
  };
}
