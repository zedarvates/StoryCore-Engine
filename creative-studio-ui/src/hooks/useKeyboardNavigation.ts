/**
 * useKeyboardNavigation Hook
 * 
 * Provides keyboard navigation utilities for wizard components
 * Implements accessibility best practices for keyboard interaction
 * 
 * Requirements: 13.3
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * Options for keyboard navigation
 */
export interface KeyboardNavigationOptions {
  /**
   * Enable arrow key navigation for lists
   */
  enableArrowKeys?: boolean;
  
  /**
   * Enable Enter/Space key activation
   */
  enableActivation?: boolean;
  
  /**
   * Enable Escape key to close/cancel
   */
  enableEscape?: boolean;
  
  /**
   * Callback when Enter or Space is pressed
   */
  onActivate?: () => void;
  
  /**
   * Callback when Escape is pressed
   */
  onEscape?: () => void;
  
  /**
   * Callback when arrow keys are pressed
   */
  onArrowKey?: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

/**
 * Hook for handling keyboard navigation
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    enableArrowKeys = false,
    enableActivation = true,
    enableEscape = false,
    onActivate,
    onEscape,
    onArrowKey,
  } = options;

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      // Handle activation keys (Enter/Space)
      if (enableActivation && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        onActivate?.();
        return;
      }

      // Handle escape key
      if (enableEscape && event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      // Handle arrow keys
      if (enableArrowKeys && onArrowKey) {
        switch (event.key) {
          case 'ArrowUp':
            event.preventDefault();
            onArrowKey('up');
            break;
          case 'ArrowDown':
            event.preventDefault();
            onArrowKey('down');
            break;
          case 'ArrowLeft':
            event.preventDefault();
            onArrowKey('left');
            break;
          case 'ArrowRight':
            event.preventDefault();
            onArrowKey('right');
            break;
        }
      }
    },
    [enableActivation, enableEscape, enableArrowKeys, onActivate, onEscape, onArrowKey]
  );

  return { handleKeyDown };
}

/**
 * Hook for managing focus within a list of items
 */
export function useListKeyboardNavigation<T extends HTMLElement>(
  itemCount: number,
  options: {
    onSelect?: (index: number) => void;
    orientation?: 'vertical' | 'horizontal';
    loop?: boolean;
  } = {}
) {
  const { onSelect, orientation = 'vertical', loop = true } = options;
  const currentIndexRef = useRef<number>(0);
  const itemRefs = useRef<(T | null)[]>([]);

  /**
   * Set ref for an item at a specific index
   */
  const setItemRef = useCallback((index: number) => {
    return (element: T | null) => {
      itemRefs.current[index] = element;
    };
  }, []);

  /**
   * Focus an item at a specific index
   */
  const focusItem = useCallback((index: number) => {
    if (index >= 0 && index < itemCount) {
      currentIndexRef.current = index;
      itemRefs.current[index]?.focus();
    }
  }, [itemCount]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const isVertical = orientation === 'vertical';
      const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
      const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

      let newIndex = currentIndexRef.current;

      switch (event.key) {
        case nextKey:
          event.preventDefault();
          newIndex = currentIndexRef.current + 1;
          if (newIndex >= itemCount) {
            newIndex = loop ? 0 : itemCount - 1;
          }
          focusItem(newIndex);
          break;

        case prevKey:
          event.preventDefault();
          newIndex = currentIndexRef.current - 1;
          if (newIndex < 0) {
            newIndex = loop ? itemCount - 1 : 0;
          }
          focusItem(newIndex);
          break;

        case 'Home':
          event.preventDefault();
          focusItem(0);
          break;

        case 'End':
          event.preventDefault();
          focusItem(itemCount - 1);
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          onSelect?.(currentIndexRef.current);
          break;
      }
    },
    [itemCount, orientation, loop, focusItem, onSelect]
  );

  return {
    handleKeyDown,
    setItemRef,
    focusItem,
    currentIndex: currentIndexRef.current,
  };
}

/**
 * Hook for managing focus trap within a modal or dialog
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements within the container
    const getFocusableElements = () => {
      if (!containerRef.current) return [];
      
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      return Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
      );
    };

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle Tab key to trap focus
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: move focus backwards
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: move focus forwards
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Cleanup: restore focus to previous element
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for announcing changes to screen readers
 */
export function useAriaLiveAnnouncement() {
  const announcementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create announcement element if it doesn't exist
    if (!announcementRef.current) {
      const element = document.createElement('div');
      element.setAttribute('role', 'status');
      element.setAttribute('aria-live', 'polite');
      element.setAttribute('aria-atomic', 'true');
      element.style.position = 'absolute';
      element.style.left = '-10000px';
      element.style.width = '1px';
      element.style.height = '1px';
      element.style.overflow = 'hidden';
      document.body.appendChild(element);
      announcementRef.current = element;
    }

    return () => {
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current);
        announcementRef.current = null;
      }
    };
  }, []);

  const announce = useCallback((message: string) => {
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
    }
  }, []);

  return announce;
}
