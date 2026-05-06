/**
 * Debounce Hook for Search Optimization
 * 
 * Requirements: 87
 * Performance Level: 🟡 HAUTE
 * 
 * Implements debouncing for search inputs to reduce
 * unnecessary API calls and improve performance.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface DebounceOptions {
  maxWait?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Debounce function to limit execution frequency
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: DebounceOptions = {}
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: any[] | null = null;
  let lastThis: any;
  let result: ReturnType<T>;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;

  const { maxWait = 0, leading = false, trailing = true } = options;

  function invokeFunc(time: number) {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = lastThis = null;
    lastInvokeTime = time;
    
    if (args) {
      result = func.apply(thisArg, args);
    }
    
    return result;
  }

  function leadingEdge(time: number) {
    lastInvokeTime = time;
    
    if (leading) {
      return invokeFunc(time);
    }
  }

  function remainingWait(time: number) {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    if (maxWait === 0) {
      return Math.max(timeWaiting, 0);
    }

    return Math.min(timeWaiting, maxWait - timeSinceLastInvoke);
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === null ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== 0 && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired() {
    const time = Date.now();
    
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    
    timeoutId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time: number) {
    timeoutId = null;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    
    lastArgs = lastThis = null;
    return result;
  }

  function cancel() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timeoutId = null;
  }

  function flush() {
    return timeoutId === null ? result : trailingEdge(Date.now());
  }

  function debounced(...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(lastCallTime);
      }
      
      if (maxWait !== 0) {
        timeoutId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    
    if (timeoutId === null) {
      timeoutId = setTimeout(timerExpired, wait);
    }
    
    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;

  return debounced;
}

/**
 * React hook for debounced values
 */
export function useDebounce<T>(
  value: T,
  delay: number,
  options: DebounceOptions = {}
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestValueRef = useRef<T>(value);

  useEffect(() => {
    latestValueRef.current = value;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(latestValueRef.current);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedValue;
}

/**
 * Hook for debounced search with loading state
 */
export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  delay: number = 300
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const searchRef = useRef(searchFn);

  // Update search function ref
  useEffect(() => {
    searchRef.current = searchFn;
  }, [searchFn]);

  // Debounced search
  const debouncedSearch = useRef(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const searchResults = await searchRef.current(searchQuery);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Search failed'));
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, delay)
  ).current;

  // Execute debounced search when query changes
  useEffect(() => {
    debouncedSearch(query);

    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clearResults: () => setResults([]),
  };
}

/**
 * Debounced input component
 */
export interface DebouncedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
  debounceOptions?: DebounceOptions;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({
  value,
  onChange,
  delay = 300,
  debounceOptions,
  ...props
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const debouncedOnChange = useRef(
    debounce(onChange, delay, debounceOptions)
  ).current;

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    debouncedOnChange(newValue);
  };

  useEffect(() => {
    return () => {
      debouncedOnChange.cancel();
    };
  }, [debouncedOnChange]);

  return (
    <input
      {...props}
      value={internalValue}
      onChange={handleChange}
    />
  );
};

/**
 * Search input with debouncing
 */
export interface DebouncedSearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onSearch: (query: string) => void;
  delay?: number;
  placeholder?: string;
  showLoading?: boolean;
}

export const DebouncedSearchInput: React.FC<DebouncedSearchInputProps> = ({
  onSearch,
  delay = 300,
  placeholder = 'Search...',
  showLoading = false,
  ...props
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearch = useRef(
    debounce(async (searchQuery: string) => {
      setIsLoading(false);
      onSearch(searchQuery);
    }, delay)
  ).current;

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setIsLoading(true);
    debouncedSearch(newQuery);
  };

  return (
    <div className="debounced-search-input">
      <input
        {...props}
        type="search"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="search-input"
      />
      {showLoading && isLoading && (
        <div className="search-loading">
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  );
};

// CSS Styles
const debounceStyles = `
.debounced-search-input {
  position: relative;
  display: inline-block;
}

.debounced-search-input .search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.debounced-search-input .search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.debounced-search-input .search-loading {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.debounced-search-input .loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'debounce-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = debounceStyles;
    document.head.appendChild(style);
  }
}
