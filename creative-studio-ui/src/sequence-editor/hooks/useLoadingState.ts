/**
 * React Hook for Loading State Management
 * 
 * Provides utilities for managing loading states with automatic
 * spinner display for operations exceeding 500ms.
 * 
 * Requirement 20.6: Display spinners for operations exceeding 500ms
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Loading state type
 */
export interface LoadingState {
  isLoading: boolean;
  showSpinner: boolean;
  progress?: number;
  message?: string;
}

/**
 * Hook for managing loading state with automatic spinner display
 * 
 * @param minDisplayTime - Minimum time to show spinner (ms)
 * @param spinnerDelay - Delay before showing spinner (ms)
 * @returns Loading state and control functions
 */
export function useLoadingState(
  minDisplayTime: number = 500,
  spinnerDelay: number = 500
) {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    showSpinner: false,
    progress: undefined,
    message: undefined,
  });
  
  const spinnerTimeoutRef = useRef<number | null>(null);
  const minDisplayTimeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  /**
   * Starts loading state
   */
  const startLoading = useCallback((message?: string) => {
    startTimeRef.current = Date.now();
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      message,
    }));
    
    // Show spinner after delay
    spinnerTimeoutRef.current = window.setTimeout(() => {
      setState(prev => ({
        ...prev,
        showSpinner: true,
      }));
    }, spinnerDelay);
  }, [spinnerDelay]);
  
  /**
   * Stops loading state
   */
  const stopLoading = useCallback(() => {
    // Clear spinner timeout if not shown yet
    if (spinnerTimeoutRef.current !== null) {
      clearTimeout(spinnerTimeoutRef.current);
      spinnerTimeoutRef.current = null;
    }
    
    const elapsed = Date.now() - startTimeRef.current;
    const remainingTime = Math.max(0, minDisplayTime - elapsed);
    
    // If spinner is shown, keep it visible for minimum display time
    if (state.showSpinner && remainingTime > 0) {
      minDisplayTimeoutRef.current = window.setTimeout(() => {
        setState({
          isLoading: false,
          showSpinner: false,
          progress: undefined,
          message: undefined,
        });
      }, remainingTime);
    } else {
      setState({
        isLoading: false,
        showSpinner: false,
        progress: undefined,
        message: undefined,
      });
    }
  }, [minDisplayTime, state.showSpinner]);
  
  /**
   * Updates progress
   */
  const setProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress,
      message: message || prev.message,
    }));
  }, []);
  
  /**
   * Updates message
   */
  const setMessage = useCallback((message: string) => {
    setState(prev => ({
      ...prev,
      message,
    }));
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (spinnerTimeoutRef.current !== null) {
        clearTimeout(spinnerTimeoutRef.current);
      }
      if (minDisplayTimeoutRef.current !== null) {
        clearTimeout(minDisplayTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    ...state,
    startLoading,
    stopLoading,
    setProgress,
    setMessage,
  };
}

/**
 * Hook for wrapping async operations with loading state
 * 
 * @param minDisplayTime - Minimum time to show spinner (ms)
 * @param spinnerDelay - Delay before showing spinner (ms)
 * @returns Loading state and wrapper function
 */
export function useAsyncLoading(
  minDisplayTime: number = 500,
  spinnerDelay: number = 500
) {
  const loadingState = useLoadingState(minDisplayTime, spinnerDelay);
  
  /**
   * Wraps an async function with loading state
   */
  const withLoading = useCallback(async <T>(
    fn: () => Promise<T>,
    message?: string
  ): Promise<T> => {
    try {
      loadingState.startLoading(message);
      const result = await fn();
      loadingState.stopLoading();
      return result;
    } catch (error) {
      loadingState.stopLoading();
      throw error;
    }
  }, [loadingState]);
  
  return {
    ...loadingState,
    withLoading,
  };
}

/**
 * Hook for managing multiple loading states
 * 
 * @returns Loading state manager
 */
export function useMultipleLoadingStates() {
  const [states, setStates] = useState<Record<string, LoadingState>>({});
  
  /**
   * Starts loading for a specific key
   */
  const startLoading = useCallback((key: string, message?: string) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        isLoading: true,
        showSpinner: true,
        message,
      },
    }));
  }, []);
  
  /**
   * Stops loading for a specific key
   */
  const stopLoading = useCallback((key: string) => {
    setStates(prev => {
      const newStates = { ...prev };
      delete newStates[key];
      return newStates;
    });
  }, []);
  
  /**
   * Updates progress for a specific key
   */
  const setProgress = useCallback((key: string, progress: number, message?: string) => {
    setStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        progress,
        message: message || prev[key]?.message,
      },
    }));
  }, []);
  
  /**
   * Checks if any loading state is active
   */
  const isAnyLoading = Object.values(states).some(state => state.isLoading);
  
  /**
   * Gets loading state for a specific key
   */
  const getLoadingState = useCallback((key: string): LoadingState => {
    return states[key] || {
      isLoading: false,
      showSpinner: false,
    };
  }, [states]);
  
  return {
    states,
    isAnyLoading,
    startLoading,
    stopLoading,
    setProgress,
    getLoadingState,
  };
}

/**
 * Hook for debounced loading state
 * Prevents flickering for very fast operations
 * 
 * @param delay - Debounce delay in ms
 * @returns Debounced loading state
 */
export function useDebouncedLoading(delay: number = 300) {
  const [isLoading, setIsLoading] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  
  const startLoading = useCallback(() => {
    setIsLoading(true);
    
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = window.setTimeout(() => {
      setShowLoading(true);
    }, delay);
  }, [delay]);
  
  const stopLoading = useCallback(() => {
    setIsLoading(false);
    
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setShowLoading(false);
  }, []);
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return {
    isLoading,
    showLoading,
    startLoading,
    stopLoading,
  };
}
