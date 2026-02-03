/**
 * useAccessibility Hook
 * 
 * React hook for managing accessibility features including
 * keyboard navigation, focus management, and screen reader announcements.
 * 
 * Requirements: 20.1, 22.2
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  announce,
  FocusTrap,
  prefersReducedMotion,
  isHighContrastMode,
  initializeAccessibility,
} from '../utils/accessibility';

// ============================================================================
// useAnnounce Hook
// ============================================================================

/**
 * Hook for announcing messages to screen readers
 */
export const useAnnounce = () => {
  return useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announce(message, priority);
  }, []);
};

// ============================================================================
// useFocusTrap Hook
// ============================================================================

/**
 * Hook for trapping focus within a container (for modals/dialogs)
 */
export const useFocusTrap = (active: boolean = false) => {
  const containerRef = useRef<HTMLElement>(null);
  const focusTrapRef = useRef<FocusTrap | null>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (active) {
      focusTrapRef.current = new FocusTrap(containerRef.current);
      focusTrapRef.current.activate();
    }
    
    return () => {
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate();
        focusTrapRef.current = null;
      }
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
// useReducedMotion Hook
// ============================================================================

/**
 * Hook for detecting user's reduced motion preference
 */
export const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = React.useState(() => prefersReducedMotion());
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = () => {
      setReducedMotion(mediaQuery.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return reducedMotion;
};

// ============================================================================
// useHighContrast Hook
// ============================================================================

/**
 * Hook for detecting high contrast mode
 */
export const useHighContrast = () => {
  const [highContrast, setHighContrast] = React.useState(() => isHighContrastMode());
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
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
    initializeAccessibility();
  }, []);
};

// ============================================================================
// Export React import for hooks that use useState
// ============================================================================

import * as React from 'react';
