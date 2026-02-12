/**
 * useAccessibility Hook
 * 
 * React hook for managing accessibility features including
 * keyboard navigation, focus management, and screen reader announcements.
 * 
 * Requirements: 20.1, 22.2
 * 
 * Note: Consolidated hooks are imported from src/hooks/useAccessibility.ts
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAnnounce, useReducedMotion, useFocusTrap as useBaseFocusTrap } from '../../hooks/useAccessibility';

// ============================================================================
// useFocusTrap Hook - delegates to base implementation with enhanced features
// ============================================================================

/**
 * Hook for trapping focus within a container (for modals/dialogs)
 */
export const useFocusTrap = (active: boolean = false) => {
  const containerRef = useRef<HTMLElement>(null);
  const focusTrapRef = useRef<ReturnType<typeof useBaseFocusTrap> | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (active) {
      focusTrapRef.current = useBaseFocusTrap(active);
      // @ts-ignore - FocusTrap methods
      if (focusTrapRef.current?.current) {
        // @ts-ignore - FocusTrap methods
        focusTrapRef.current.current = containerRef.current;
      }
    }
    
    return () => {
      focusTrapRef.current = null;
    };
  }, [active]);
  
  return containerRef;
};

// ============================================================================
// useKeyboardNavigation Hook
// ============================================================================

export interface KeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  onTab?: (shiftKey: boolean) => void;
}

/**
 * Hook for handling keyboard navigation
 */
export const useKeyboardNavigation = (
  options: KeyboardNavigationOptions,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      
      switch (event.key) {
        case 'Escape':
          if (options.onEscape) {
            event.preventDefault();
            options.onEscape();
          }
          break;
        case 'Enter':
          if (options.onEnter) {
            event.preventDefault();
            options.onEnter();
          }
          break;
        case 'ArrowUp':
          if (options.onArrowUp) {
            event.preventDefault();
            options.onArrowUp();
          }
          break;
        case 'ArrowDown':
          if (options.onArrowDown) {
            event.preventDefault();
            options.onArrowDown();
          }
          break;
        case 'ArrowLeft':
          if (options.onArrowLeft) {
            event.preventDefault();
            options.onArrowLeft();
          }
          break;
        case 'ArrowRight':
          if (options.onArrowRight) {
            event.preventDefault();
            options.onArrowRight();
          }
          break;
        case 'Home':
          if (options.onHome) {
            event.preventDefault();
            options.onHome();
          }
          break;
        case 'End':
          if (options.onEnd) {
            event.preventDefault();
            options.onEnd();
          }
          break;
        case 'Tab':
          if (options.onTab) {
            options.onTab(event.shiftKey);
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, enabled]);
};

// ============================================================================
// useHighContrast Hook
// ============================================================================

/**
 * Hook for detecting high contrast mode
 */
export const useHighContrast = () => {
  const [highContrast, setHighContrast] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(mediaQuery.matches);
    
    const handleChange = () => {
      setHighContrast(mediaQuery.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return highContrast;
};

// ============================================================================
// useAriaLive Hook
// ============================================================================

/**
 * Hook for managing ARIA live regions
 */
export const useAriaLive = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const announce = useAnnounce();
  
  useEffect(() => {
    if (message) {
      announce(message, priority);
    }
  }, [message, priority, announce]);
};

// ============================================================================
// useAccessibilityInit Hook
// ============================================================================

/**
 * Hook for initializing accessibility features on mount
 */
export const useAccessibilityInit = () => {
  useEffect(() => {
    // Initialize any accessibility features here
  }, []);
};

// Re-export consolidated hooks for convenience
export { useAnnounce, useReducedMotion };
