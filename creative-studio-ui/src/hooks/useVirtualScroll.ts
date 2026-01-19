/**
 * Virtual scrolling hook for large lists
 * Optimizes rendering by only displaying visible items
 */

import { useState, useEffect, useRef, useMemo } from 'react';

interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside viewport
}

interface VirtualScrollResult<T> {
  virtualItems: Array<{
    index: number;
    item: T;
    offsetTop: number;
  }>;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
}

/**
 * Hook for virtual scrolling large lists
 * Only renders items that are visible in the viewport
 */
export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
): VirtualScrollResult<T> {
  const { itemHeight, containerHeight, overscan = 3 } = options;
  const [scrollTop, _setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Calculate visible range
  const { startIndex, endIndex, totalHeight } = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(
      items.length - 1,
      startIndex + visibleCount + overscan * 2
    );

    return { startIndex, endIndex, totalHeight };
  }, [items.length, itemHeight, scrollTop, containerHeight, overscan]);

  // Create virtual items
  const virtualItems = useMemo(() => {
    const result = [];
    for (let i = startIndex; i <= endIndex; i++) {
      result.push({
        index: i,
        item: items[i],
        offsetTop: i * itemHeight,
      });
    }
    return result;
  }, [items, startIndex, endIndex, itemHeight]);

  // Scroll to specific index
  const scrollToIndex = (index: number) => {
    if (containerRef.current) {
      const offsetTop = index * itemHeight;
      containerRef.current.scrollTop = offsetTop;
    }
  };

  return {
    virtualItems,
    totalHeight,
    scrollToIndex,
  };
}

/**
 * Hook to track scroll position
 */
export function useScrollPosition(
  ref: React.RefObject<HTMLElement | null>,
  callback: (scrollTop: number) => void
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      callback(element.scrollTop);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [ref, callback]);
}
