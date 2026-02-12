/**
 * Memoization utilities for expensive computations
 */

import { debounce, throttle } from './debounceAndThrottle';

// Re-export debounce and throttle from unified module
export { debounce, throttle };

// Using 'any[]' in generic constraint to allow memoizing functions with any parameter types
type MemoizedFunction<T extends (...args: unknown[]) => unknown> = T & {
  cache: Map<string, ReturnType<T>>;
  clearCache: () => void;
};

/**
 * Memoize a function with custom key generation
 */
// Using 'any[]' in generic constraint to allow memoizing functions with any parameter types
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): MemoizedFunction<T> {
  const cache = new Map<string, ReturnType<T>>();

  const memoized = ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as MemoizedFunction<T>;

  memoized.cache = cache;
  memoized.clearCache = () => cache.clear();

  return memoized;
}

/**
 * Memoize async functions
 */
// Using 'any' in generic constraint to allow memoizing async functions with any parameter and return types
export function memoizeAsync<T extends (...args: unknown[]) => Promise<any>>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): MemoizedFunction<T> {
  const cache = new Map<string, ReturnType<T>>();
  const pending = new Map<string, ReturnType<T>>();

  const memoized = (async (...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    // Return cached result
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    // Return pending promise if already in progress
    if (pending.has(key)) {
      return pending.get(key)!;
    }

    // Execute and cache
    const promise = fn(...args);
    pending.set(key, promise as ReturnType<T>);

    try {
      const result = await promise;
      cache.set(key, Promise.resolve(result) as ReturnType<T>);
      return result;
    } finally {
      pending.delete(key);
    }
  }) as MemoizedFunction<T>;

  memoized.cache = cache;
  memoized.clearCache = () => {
    cache.clear();
    pending.clear();
  };

  return memoized;
}

/**
 * LRU (Least Recently Used) cache implementation
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    // Move to end (most recently used)
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add to end
    this.cache.set(key, value);

    // Remove oldest if over capacity
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

