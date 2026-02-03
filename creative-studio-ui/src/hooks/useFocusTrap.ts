/**
 * useFocusTrap Hook
 * 
 * Manages focus trapping for modals and dialogs.
 * Ensures keyboard navigation stays within the modal and restores focus when closed.
 */

import { useEffect, useRef, useCallback } from 'react';

interface UseFocusTrapOptions {
  isActive?: boolean;
  onEscape?: () => void;
}

/**
 * Hook to trap focus within a container element
 * Useful for modals, dialogs, and other overlay components
 */
export function useFocusTrap(options: UseFocusTrapOptions = {}) {
  const { isActive = true, onEscape } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input[type="text"]:not([disabled])',
      'input[type="radio"]:not([disabled])',
      'input[type="checkbox"]:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    return Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];
  }, []);

  // Handle Tab key navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive) return;

      // Handle Escape key
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      // Handle Tab key
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const activeElement = document.activeElement as HTMLElement;
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift + Tab: move focus to previous element
      if (event.shiftKey) {
        if (activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      }
      // Tab: move focus to next element
      else {
        if (activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [isActive, onEscape, getFocusableElements]
  );

  // Initialize focus trap
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to the previously focused element
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, handleKeyDown, getFocusableElements]);

  return containerRef;
}

/**
 * Hook to manage focus restoration
 * Useful for components that need to restore focus after closing
 */
export function useFocusRestoration() {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousActiveElement.current && previousActiveElement.current.focus) {
      previousActiveElement.current.focus();
    }
  }, []);

  return { saveFocus, restoreFocus };
}
