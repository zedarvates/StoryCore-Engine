/**
 * Performance optimization utilities for ProjectDashboardNew
 * 
 * Provides memoization, debouncing, and other performance optimizations
 * to improve responsiveness with large projects.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';
import type { Project, PromptValidation } from '../types/projectDashboard';
import { validatePrompt } from './promptValidation';
import { analyzeProjectPrompts, type ProjectPromptAnalysis } from './promptAnalysis';

// ============================================================================
// Memoization Cache
// ============================================================================

/**
 * Simple LRU cache for memoization
 */
class LRUCache<K, V> {
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
    // Remove if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Add to end
    this.cache.set(key, value);
    
    // Evict oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }
}

// ============================================================================
// Validation Memoization
// ============================================================================

/**
 * Cache for prompt validation results
 * Requirements: 10.1
 */
const validationCache = new LRUCache<string, PromptValidation>(500);

/**
 * Memoized prompt validation
 * Caches validation results to avoid redundant computations
 * 
 * @param prompt - The prompt to validate
 * @returns Cached or newly computed validation result
 */
export function memoizedValidatePrompt(prompt: string): PromptValidation {
  // Check cache first
  const cached = validationCache.get(prompt);
  if (cached) {
    return cached;
  }

  // Compute and cache
  const result = validatePrompt(prompt);
  validationCache.set(prompt, result);
  return result;
}

/**
 * Clear validation cache
 * Useful when validation rules change
 */
export function clearValidationCache(): void {
  validationCache.clear();
}

// ============================================================================
// Analysis Memoization
// ============================================================================

/**
 * Cache for project analysis results
 * Requirements: 10.1
 */
const analysisCache = new LRUCache<string, ProjectPromptAnalysis>(50);

/**
 * Generate cache key for project analysis
 */
function getProjectAnalysisCacheKey(project: Project): string {
  // Create a key based on shot prompts
  const promptsHash = project.shots
    .map(shot => `${shot.id}:${shot.prompt}`)
    .join('|');
  return promptsHash;
}

/**
 * Memoized project prompt analysis
 * Caches analysis results to avoid redundant computations
 * 
 * @param project - The project to analyze
 * @returns Cached or newly computed analysis result
 */
export function memoizedAnalyzeProjectPrompts(project: Project): ProjectPromptAnalysis {
  const cacheKey = getProjectAnalysisCacheKey(project);
  
  // Check cache first
  const cached = analysisCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Compute and cache
  const result = analyzeProjectPrompts(project);
  analysisCache.set(cacheKey, result);
  return result;
}

/**
 * Clear analysis cache
 * Useful when analysis logic changes
 */
export function clearAnalysisCache(): void {
  analysisCache.clear();
}

// ============================================================================
// Debouncing
// ============================================================================

/**
 * Debounce hook for expensive operations
 * Requirements: 10.2
 * 
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
}

// ============================================================================
// Throttling
// ============================================================================

/**
 * Throttle hook for rate-limiting expensive operations
 * Requirements: 10.2
 * 
 * @param callback - Function to throttle
 * @param delay - Minimum delay between calls in milliseconds
 * @returns Throttled function
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const lastRunRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastRun = now - lastRunRef.current;

    if (timeSinceLastRun >= delay) {
      // Enough time has passed, execute immediately
      callbackRef.current(...args);
      lastRunRef.current = now;
    } else {
      // Schedule for later
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        lastRunRef.current = Date.now();
      }, delay - timeSinceLastRun);
    }
  }, [delay]);
}

// ============================================================================
// Virtual Scrolling Utilities
// ============================================================================

/**
 * Calculate visible items for virtual scrolling
 * Requirements: 10.2
 * 
 * @param items - All items
 * @param scrollTop - Current scroll position
 * @param containerHeight - Height of the container
 * @param itemHeight - Height of each item
 * @param overscan - Number of items to render outside viewport
 * @returns Visible items with their positions
 */
export function calculateVisibleItems<T>(
  items: T[],
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  overscan: number = 3
): {
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetY: number;
} {
  const totalHeight = items.length * itemHeight;
  
  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Get visible items
  const visibleItems = items.slice(startIndex, endIndex + 1);
  
  // Calculate offset for positioning
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    startIndex,
    endIndex,
    totalHeight,
    offsetY,
  };
}

/**
 * Hook for virtual scrolling
 * Requirements: 10.2
 * 
 * @param items - All items to virtualize
 * @param itemHeight - Height of each item in pixels
 * @param containerHeight - Height of the container in pixels
 * @param overscan - Number of items to render outside viewport
 * @returns Virtual scrolling state and handlers
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 3
) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const virtualState = useMemo(() => {
    return calculateVisibleItems(
      items,
      scrollTop,
      containerHeight,
      itemHeight,
      overscan
    );
  }, [items, scrollTop, containerHeight, itemHeight, overscan]);

  return {
    ...virtualState,
    handleScroll,
  };
}

// ============================================================================
// Web Worker Utilities
// ============================================================================

/**
 * Web Worker wrapper for heavy computations
 * Requirements: 10.4
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: Array<{
    data: unknown;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }> = [];

  constructor(workerScript: string, poolSize: number = navigator.hardwareConcurrency || 4) {
    // Create worker pool
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript);
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  /**
   * Execute task in worker pool
   */
  async execute<T = any>(data: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const worker = this.availableWorkers.pop();

      if (worker) {
        // Worker available, execute immediately
        this.executeInWorker(worker, data, resolve, reject);
      } else {
        // No workers available, queue the task
        this.taskQueue.push({ data, resolve, reject });
      }
    });
  }

  /**
   * Execute task in specific worker
   */
  private executeInWorker(
    worker: Worker,
    data: unknown,
    resolve: (value: unknown) => void,
    reject: (error: unknown) => void
  ): void {
    const handleMessage = (e: MessageEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      
      // Return worker to pool
      this.availableWorkers.push(worker);
      
      // Process next task if any
      this.processNextTask();
      
      resolve(e.data);
    };

    const handleError = (e: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      
      // Return worker to pool
      this.availableWorkers.push(worker);
      
      // Process next task if any
      this.processNextTask();
      
      reject(e.error || new Error(e.message));
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    worker.postMessage(data);
  }

  /**
   * Process next task in queue
   */
  private processNextTask(): void {
    if (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const task = this.taskQueue.shift()!;
      const worker = this.availableWorkers.pop()!;
      this.executeInWorker(worker, task.data, task.resolve, task.reject);
    }
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.taskQueue = [];
  }
}

// ============================================================================
// Lazy Loading Utilities
// ============================================================================

/**
 * Hook for lazy loading data
 * Requirements: 10.3
 * 
 * @param loadFn - Function to load data
 * @param deps - Dependencies that trigger reload
 * @returns Loading state and data
 */
export function useLazyLoad<T>(
  loadFn: () => Promise<T>,
  deps: React.DependencyList = []
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  reload: () => void;
} {
  const [data, setData] = React.useState<T | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const loadFnRef = useRef(loadFn);

  // Update load function ref
  useEffect(() => {
    loadFnRef.current = loadFn;
  }, [loadFn]);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await loadFnRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount and when deps change
  useEffect(() => {
    load();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    isLoading,
    error,
    reload: load,
  };
}

/**
 * Hook for intersection observer (lazy loading on scroll)
 * Requirements: 10.3
 * 
 * @param options - Intersection observer options
 * @returns Ref and visibility state
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): {
  ref: React.RefObject<HTMLElement | null>;
  isVisible: boolean;
} {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return { ref, isVisible };
}

// ============================================================================
// React Import (for hooks that use React.useState)
// ============================================================================

import React from 'react';


