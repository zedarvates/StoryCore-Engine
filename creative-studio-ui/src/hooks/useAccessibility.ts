/**
 * Accessibility Hooks
 * 
 * Custom hooks for managing accessibility features in the generation-buttons-ui.
 * Provides focus management, keyboard navigation, and ARIA live region support.
 * 
 * Requirements: 5.3, 5.4
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing focus trap in dialogs
 * Ensures focus stays within the dialog when open
 * 
 * Requirements: 5.4
 */
export function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Store the element that had focus before the dialog opened
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element in the dialog
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle Tab key to trap focus
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Cleanup: restore focus when dialog closes
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  return containerRef;
}

/**
 * Hook for announcing messages to screen readers
 * Uses ARIA live regions for dynamic content updates
 * 
 * Requirements: 5.3, 5.4
 */
export function useAnnouncer() {
  const announcerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create announcer element if it doesn't exist
    if (!announcerRef.current) {
      const announcer = document.createElement('div');
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.style.position = 'absolute';
      announcer.style.left = '-10000px';
      announcer.style.width = '1px';
      announcer.style.height = '1px';
      announcer.style.overflow = 'hidden';
      document.body.appendChild(announcer);
      announcerRef.current = announcer;
    }

    return () => {
      if (announcerRef.current) {
        document.body.removeChild(announcerRef.current);
        announcerRef.current = null;
      }
    };
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcerRef.current) return;

    // Update aria-live attribute based on priority
    announcerRef.current.setAttribute('aria-live', priority);

    // Clear and set new message
    announcerRef.current.textContent = '';
    setTimeout(() => {
      if (announcerRef.current) {
        announcerRef.current.textContent = message;
      }
    }, 100);
  }, []);

  return announce;
}

/**
 * Hook for managing keyboard shortcuts with accessibility
 * Provides proper ARIA labels and keyboard event handling
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    enabled?: boolean;
  } = {}
) {
  const { ctrl = false, shift = false, alt = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const matchesModifiers =
        event.ctrlKey === ctrl &&
        event.shiftKey === shift &&
        event.altKey === alt;

      if (matchesModifiers && event.key === key) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [key, callback, ctrl, shift, alt, enabled]);

  // Return formatted shortcut string for display
  const shortcutString = [
    ctrl && 'Ctrl',
    shift && 'Shift',
    alt && 'Alt',
    key,
  ]
    .filter(Boolean)
    .join('+');

  return shortcutString;
}

/**
 * Hook for managing progress announcements
 * Announces progress updates at appropriate intervals
 * 
 * Requirements: 7.1, 7.3
 */
export function useProgressAnnouncer(
  progress: number,
  message: string,
  isActive: boolean
) {
  const announce = useAnnouncer();
  const lastAnnouncedRef = useRef<number>(0);
  const ANNOUNCEMENT_THRESHOLD = 25; // Announce every 25% progress

  useEffect(() => {
    if (!isActive) return;

    const currentMilestone = Math.floor(progress / ANNOUNCEMENT_THRESHOLD) * ANNOUNCEMENT_THRESHOLD;

    if (currentMilestone > lastAnnouncedRef.current && currentMilestone > 0) {
      announce(`${message}. ${currentMilestone}% complete.`, 'polite');
      lastAnnouncedRef.current = currentMilestone;
    }

    // Announce completion
    if (progress >= 100 && lastAnnouncedRef.current < 100) {
      announce(`${message} complete.`, 'assertive');
      lastAnnouncedRef.current = 100;
    }
  }, [progress, message, isActive, announce]);

  // Reset when inactive
  useEffect(() => {
    if (!isActive) {
      lastAnnouncedRef.current = 0;
    }
  }, [isActive]);
}

/**
 * Hook for managing error announcements
 * Announces errors immediately with assertive priority
 * 
 * Requirements: 8.5
 */
export function useErrorAnnouncer(error: string | null) {
  const announce = useAnnouncer();
  const previousErrorRef = useRef<string | null>(null);

  useEffect(() => {
    if (error && error !== previousErrorRef.current) {
      announce(`Error: ${error}`, 'assertive');
      previousErrorRef.current = error;
    } else if (!error) {
      previousErrorRef.current = null;
    }
  }, [error, announce]);
}

/**
 * Hook for managing button state announcements
 * Announces button state changes to screen readers
 * 
 * Requirements: 5.3, 5.4, 5.5
 */
export function useButtonStateAnnouncer(
  buttonName: string,
  isDisabled: boolean,
  disabledReason?: string
) {
  const announce = useAnnouncer();
  const previousStateRef = useRef<boolean>(isDisabled);

  useEffect(() => {
    if (isDisabled !== previousStateRef.current) {
      if (isDisabled && disabledReason) {
        announce(`${buttonName} disabled: ${disabledReason}`, 'polite');
      } else if (!isDisabled) {
        announce(`${buttonName} enabled`, 'polite');
      }
      previousStateRef.current = isDisabled;
    }
  }, [buttonName, isDisabled, disabledReason, announce]);
}

/**
 * Get ARIA description for generation button state
 * 
 * Requirements: 5.3, 5.4, 5.5
 */
export function getButtonAriaDescription(
  buttonType: 'prompt' | 'image' | 'video' | 'audio',
  isDisabled: boolean,
  isGenerating: boolean,
  isCompleted: boolean,
  isFailed: boolean,
  disabledReason?: string
): string {
  if (disabledReason) {
    return disabledReason;
  }

  if (isGenerating) {
    return `${buttonType} generation in progress`;
  }

  if (isFailed) {
    return `${buttonType} generation failed. Click to retry`;
  }

  if (isCompleted) {
    return `${buttonType} generated successfully. Click to regenerate`;
  }

  if (isDisabled) {
    return `${buttonType} generation not available. Complete previous steps first`;
  }

  return `Generate ${buttonType} content`;
}

/**
 * Get ARIA label for progress value
 * 
 * Requirements: 7.1, 7.3
 */
export function getProgressAriaLabel(
  progress: number,
  stage?: string
): string {
  const percentage = Math.round(progress);
  
  if (stage) {
    return `${stage}: ${percentage}% complete`;
  }
  
  return `${percentage}% complete`;
}

/**
 * Get ARIA label for time remaining
 * 
 * Requirements: 7.3, 7.4
 */
export function getTimeRemainingAriaLabel(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `Estimated ${hours} hour${hours > 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} remaining`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `Estimated ${minutes} minute${minutes > 1 ? 's' : ''} and ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''} remaining`;
  }

  return `Estimated ${seconds} second${seconds !== 1 ? 's' : ''} remaining`;
}

/**
 * Hook for detecting user's reduced motion preference
 * Requirements: 5.3
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  return prefersReducedMotion;
}

// Alias for useAnnouncer for backward compatibility
export const useAnnounce = useAnnouncer;
