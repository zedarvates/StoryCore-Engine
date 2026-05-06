/**
 * Debounce Hook
 * 
 * Requirements: 87
 * Level: 🟡 HAUTE
 * 
 * Debounces function calls to prevent excessive executions
 */

import { useRef, useCallback, useEffect } from 'react';

export interface DebounceOptions {
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Creates a debounced function that delays invoking the provided function
 */
export function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: DebounceOptions = {}
): T {
  const { maxWait, leading = false, trailing = true } = options;
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCallTimeRef = useRef<number>(0);
  const lastArgsRef = useRef<any[] | null>(null);
  const lastThisRef = useRef<any>(null);
  const resultRef = useRef<any>();
  const maxWaitRef = useRef<NodeJS.Timeout | null>(null);
  
  const invokeFunc = useCallback(function(this: any, ...args: any[]) {
    const callTime = Date.now();
    lastCallTimeRef.current = callTime;
    
    const result = func.apply(this, args);
    resultRef.current = result;
    
    return result;
  }, [func]);
  
  const startTimer = useCallback(function(this: any, delay: number, ...args: any[]) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const timeSinceLastCall = Date.now() - lastCallTimeRef.current;
      
      if (leading && !lastArgsRef.current) {
        // Leading edge already executed
        if (trailing && lastArgsRef.current) {
          invokeFunc.apply(this, lastArgsRef.current);
          lastArgsRef.current = null;
        }
      } else if (trailing && lastArgsRef.current) {
        // Trailing edge execution
        invokeFunc.apply(this, lastArgsRef.current);
        lastArgsRef.current = null;
      }
      
      timeoutRef.current = null;
    }, delay);
  }, [invokeFunc, trailing, leading]);
  
  const debounced = useCallback(function(this: any, ...args: any[]) {
    const now = Date.now();
    const isInvoking = leading && !lastArgsRef.current;
    
    lastArgsRef.current = args;
    lastThisRef.current = this;
    
    if (isInvoking) {
      // Leading edge execution
      lastCallTimeRef.current = now;
      const result = invokeFunc.apply(this, args);
      resultRef.current = result;
    }
    
    const remainingTime = wait - (now - lastCallTimeRef.current);
    
    if (remainingTime <= 0 || remainingTime > wait) {
      // Reset timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      lastCallTimeRef.current = now;
      
      if (!isInvoking && trailing) {
        invokeFunc.apply(this, args);
      }
    } else if (!timeoutRef.current && trailing !== false) {
      // Start new timer
      startTimer.apply(this, [remainingTime, ...args]);
    }
    
    // Setup maxWait timer if configured
    if (maxWait && !maxWaitRef.current) {
      maxWaitRef.current = setTimeout(() => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (lastArgsRef.current) {
          invokeFunc.apply(lastThisRef.current, lastArgsRef.current);
          lastArgsRef.current = null;
        }
        maxWaitRef.current = null;
      }, maxWait);
    }
    
    return resultRef.current;
  }, [func, wait, maxWait, leading, trailing, invokeFunc, startTimer]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (maxWaitRef.current) {
        clearTimeout(maxWaitRef.current);
      }
    };
  }, []);
  
  return debounced as T;
}

/**
 * Hook for debouncing state updates
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number,
  options?: DebounceOptions
): [T, (value: T) => void, T] {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
  
  const debouncedSetValue = useDebounce(
    (newValue: T) => {
      setDebouncedValue(newValue);
    },
    delay,
    options
  );
  
  const handleChange = useCallback(
    (newValue: T) => {
      setValue(newValue);
      debouncedSetValue(newValue);
    },
    [debouncedSetValue]
  );
  
  return [value, handleChange, debouncedValue];
}

/**
 * Hook for debouncing effect execution
 */
export function useDebouncedEffect(
  effect: () => void | (() => void),
  dependencies: any[],
  delay: number,
  options?: DebounceOptions
) {
  const effectRef = useRef(effect);
  effectRef.current = effect;
  
  const debouncedEffect = useDebounce(
    () => {
      return effectRef.current();
    },
    delay,
    options
  );
  
  useEffect(() => {
    return debouncedEffect();
  }, [debouncedEffect, ...dependencies]);
}

/**
 * Hook for debouncing callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  options?: DebounceOptions
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  
  const debounced = useDebounce(
    (...args: Parameters<T>) => {
      return callbackRef.current(...args);
    },
    delay,
    options
  );
  
  return debounced;
}

/**
 * Hook for debouncing search input
 */
export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  delay: number = 300,
  options?: DebounceOptions
) {
  const [results, setResults] = useState<T[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const debouncedSearch = useDebounce(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      
      setIsSearching(true);
      setError(null);
      
      try {
        const searchResults = await searchFn(query);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Search failed'));
      } finally {
        setIsSearching(false);
      }
    },
    delay,
    options
  );
  
  const search = useCallback(
    (query: string) => {
      debouncedSearch(query);
    },
    [debouncedSearch]
  );
  
  return {
    results,
    search,
    isSearching,
    error,
  };
}

/**
 * Hook for debouncing resize events
 */
export function useDebouncedResize(
  delay: number = 250,
  options?: DebounceOptions
) {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });
  
  const debouncedSetDimensions = useDebounce(
    (width: number, height: number) => {
      setDimensions({ width, height });
    },
    delay,
    options
  );
  
  useEffect(() => {
    const handleResize = () => {
      debouncedSetDimensions(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [debouncedSetDimensions]);
  
  return dimensions;
}
