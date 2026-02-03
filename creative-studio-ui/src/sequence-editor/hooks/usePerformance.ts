/**
 * usePerformance Hook
 * 
 * React hooks for performance monitoring and optimization.
 * 
 * Requirements: 3.6, 20.1, 22.3
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================================
// useWhyDidYouUpdate Hook
// ============================================================================

/**
 * Hook to debug why a component re-rendered
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, any>): void {
  const previousProps = useRef<Record<string, any> | undefined>(undefined);
  
  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};
      
      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });
      
      if (Object.keys(changedProps).length > 0) {
        console.log('[why-did-you-update]', name, changedProps);
      }
    }
    
    previousProps.current = props;
  });
}

// ============================================================================
// useRenderCount Hook
// ============================================================================

/**
 * Hook to count component renders
 */
export function useRenderCount(componentName: string): number {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current++;
    console.log(`${componentName} rendered ${renderCount.current} times`);
  });
  
  return renderCount.current;
}

// ============================================================================
// useOptimizedCallback Hook
// ============================================================================

/**
 * Hook for creating optimized callbacks with dependency tracking
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef<T>(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback(
    ((...args: any[]) => callbackRef.current(...args)) as T,
    deps
  );
}

// ============================================================================
// useOptimizedMemo Hook
// ============================================================================

/**
 * Hook for optimized memoization with custom equality
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  isEqual: (a: T, b: T) => boolean = Object.is
): T {
  const valueRef = useRef<T | undefined>(undefined);
  const depsRef = useRef<React.DependencyList | undefined>(undefined);
  
  if (
    !depsRef.current ||
    depsRef.current.length !== deps.length ||
    depsRef.current.some((dep, i) => !Object.is(dep, deps[i]))
  ) {
    const newValue = factory();
    
    if (!valueRef.current || !isEqual(valueRef.current, newValue)) {
      valueRef.current = newValue;
    }
    
    depsRef.current = deps;
  }
  
  return valueRef.current!;
}

// ============================================================================
// usePrevious Hook
// ============================================================================

/**
 * Hook to get previous value
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}

// ============================================================================
// useUpdateEffect Hook
// ============================================================================

/**
 * Hook that runs effect only on updates, not on mount
 */
export function useUpdateEffect(effect: React.EffectCallback, deps?: React.DependencyList): void {
  const isFirstMount = useRef(true);
  
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    
    return effect();
  }, deps);
}

// ============================================================================
// useEffectOnce Hook
// ============================================================================

/**
 * Hook that runs effect only once on mount
 */
export function useEffectOnce(effect: React.EffectCallback): void {
  useEffect(effect, []);
}

// ============================================================================
// useIsMounted Hook
// ============================================================================

/**
 * Hook to check if component is mounted
 */
export function useIsMounted(): () => boolean {
  const isMounted = useRef(false);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  return useCallback(() => isMounted.current, []);
}

// ============================================================================
// useConstant Hook
// ============================================================================

/**
 * Hook to create a constant value that never changes
 */
export function useConstant<T>(factory: () => T): T {
  const ref = useRef<{ value: T } | undefined>(undefined);
  
  if (!ref.current) {
    ref.current = { value: factory() };
  }
  
  return ref.current.value;
}

// ============================================================================
// useForceUpdate Hook
// ============================================================================

/**
 * Hook to force component re-render
 */
export function useForceUpdate(): () => void {
  const [, setTick] = React.useState<number>(0);
  
  return useCallback(() => {
    setTick((tick: number) => tick + 1);
  }, []);
}

// ============================================================================
// useLatest Hook
// ============================================================================

/**
 * Hook to always get the latest value without causing re-renders
 */
export function useLatest<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value);
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref;
}

// ============================================================================
// useMountedState Hook
// ============================================================================

/**
 * Hook to get mounted state
 */
export function useMountedState(): () => boolean {
  const mountedRef = useRef<boolean>(false);
  const get = useCallback(() => mountedRef.current, []);
  
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  return get;
}

// ============================================================================
// useUnmount Hook
// ============================================================================

/**
 * Hook to run cleanup on unmount
 */
export function useUnmount(fn: () => void): void {
  const fnRef = useLatest(fn);
  
  useEffect(() => {
    return () => {
      fnRef.current();
    };
  }, []);
}

// ============================================================================
// Export React import
// ============================================================================

import * as React from 'react';
