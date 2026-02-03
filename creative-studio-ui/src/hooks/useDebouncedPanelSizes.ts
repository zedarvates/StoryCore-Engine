/**
 * useDebouncedPanelSizes Hook
 * 
 * Provides a debounced version of setPanelSizes to prevent excessive re-renders
 * during panel resizing operations.
 */

import { useCallback, useRef } from 'react';
import { useStore } from '@/store';
import { debounce } from '@/utils/debounce';
import type { PanelSizes } from '@/types';

/**
 * Hook that returns a debounced setPanelSizes function
 * Useful for resize handlers that fire frequently
 */
export function useDebouncedPanelSizes(wait: number = 100) {
  const setPanelSizes = useStore((state) => state.setPanelSizes);
  const debouncedSetPanelSizes = useRef(
    debounce((sizes: PanelSizes) => {
      setPanelSizes(sizes);
    }, wait)
  ).current;

  return useCallback(
    (sizes: PanelSizes) => {
      debouncedSetPanelSizes(sizes);
    },
    [debouncedSetPanelSizes]
  );
}

/**
 * Hook that returns both immediate and debounced setPanelSizes
 * Useful when you want immediate visual feedback but debounced state updates
 */
export function usePanelSizesWithDebounce(wait: number = 100) {
  const setPanelSizes = useStore((state) => state.setPanelSizes);
  const debouncedSetPanelSizes = useRef(
    debounce((sizes: PanelSizes) => {
      setPanelSizes(sizes);
    }, wait)
  ).current;

  return {
    // Immediate update for UI feedback
    setImmediate: useCallback(
      (sizes: PanelSizes) => {
        // Update UI immediately (if you have local state)
        // This is handled by the component's local state
      },
      []
    ),
    // Debounced update for store
    setDebounced: useCallback(
      (sizes: PanelSizes) => {
        debouncedSetPanelSizes(sizes);
      },
      [debouncedSetPanelSizes]
    ),
  };
}
