/**
 * useFocusManagement Hook
 * 
 * Provides focus management utilities for modals and complex UI components.
 * Handles focus trapping, restoration, and initial focus setting.
 * 
 * Requirements: All UI requirements - focus management in modals
 */

import { useEffect, useRef, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseFocusManagementOptions {
  /** Whether focus management is active */
  enabled?: boolean;
  /** Element to focus when enabled */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Element to restore focus to when disabled */
  restoreFocusRef?: React.RefObject<HTMLElement>;
  /** Whether to trap focus within container */
  trapFocus?: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * useFocusManagement Hook
 * 
 * Manages focus for modals and complex UI components.
 * Provides focus trapping and restoration capabilities.
 */
export const useFocusManagement = (
  containerRef: React.RefObject<HTMLElement>,
  options: UseFocusManagementOptions = {}
): void => {
  const {
    enabled = true,
    initialFocusRef,
    restoreFocusRef,
    trapFocus = true,
  } = options;

  const previousActiveElement = useRef<HTMLElement | null>(null);

  /**
   * Get all focusable elements within container
   */
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const elements = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    );

    return elements.filter((el) => {
      // Filter out hidden elements
      return el.offsetParent !== null;
    });
  }, [containerRef]);

  /**
   * Handle Tab key for focus trapping
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !trapFocus || event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [enabled, trapFocus, getFocusableElements]
  );

  /**
   * Set initial focus when enabled
   */
  useEffect(() => {
    if (!enabled) return;

    // Store current active element for restoration
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Set initial focus
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else {
      // Focus first focusable element
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    // Add keyboard event listener for focus trapping
    if (trapFocus) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (trapFocus) {
        document.removeEventListener('keydown', handleKeyDown);
      }

      // Restore focus when disabled
      if (restoreFocusRef?.current) {
        restoreFocusRef.current.focus();
      } else if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [
    enabled,
    initialFocusRef,
    restoreFocusRef,
    trapFocus,
    handleKeyDown,
    getFocusableElements,
  ]);
};

export default useFocusManagement;
