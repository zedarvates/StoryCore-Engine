import { useEffect, useCallback } from 'react';

// ============================================================================
// Keyboard Navigation Hook
// ============================================================================

export interface KeyboardNavigationOptions {
  onNext?: () => void;
  onPrevious?: () => void;
  onCancel?: () => void;
  onSubmit?: () => void;
  enabled?: boolean;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  isLastStep?: boolean;
}

/**
 * Custom hook for keyboard navigation in wizards
 * 
 * Keyboard shortcuts:
 * - Enter: Advance to next step (or submit on last step)
 * - Escape: Cancel wizard
 * - Alt+Left: Go to previous step
 * - Alt+Right: Go to next step
 * 
 * @param options - Configuration options for keyboard navigation
 */
export function useKeyboardNavigation({
  onNext,
  onPrevious,
  onCancel,
  onSubmit,
  enabled = true,
  canGoNext = true,
  canGoPrevious = true,
  isLastStep = false,
}: KeyboardNavigationOptions) {
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    const isInputField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
    
    // Enter key - advance or submit
    if (event.key === 'Enter' && !isInputField) {
      event.preventDefault();
      if (isLastStep && onSubmit) {
        onSubmit();
      } else if (canGoNext && onNext) {
        onNext();
      }
      return;
    }

    // Escape key - cancel
    if (event.key === 'Escape') {
      event.preventDefault();
      if (onCancel) {
        onCancel();
      }
      return;
    }

    // Alt+Left - previous step
    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      if (canGoPrevious && onPrevious) {
        onPrevious();
      }
      return;
    }

    // Alt+Right - next step
    if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault();
      if (canGoNext && onNext) {
        onNext();
      }
      return;
    }
  }, [enabled, onNext, onPrevious, onCancel, onSubmit, canGoNext, canGoPrevious, isLastStep]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

// ============================================================================
// Focus Management Hook
// ============================================================================

export interface FocusManagementOptions {
  enabled?: boolean;
  focusOnMount?: boolean;
  focusOnStepChange?: boolean;
}

/**
 * Custom hook for managing focus in wizards
 * Ensures proper focus management when navigating between steps
 * 
 * @param currentStep - The current step number
 * @param options - Configuration options for focus management
 */
export function useFocusManagement(
  currentStep: number,
  options: FocusManagementOptions = {}
) {
  const {
    enabled = true,
    focusOnMount = true,
    focusOnStepChange = true,
  } = options;

  useEffect(() => {
    if (!enabled || !focusOnStepChange) return;

    // Focus the first focusable element in the step
    const focusFirstElement = () => {
      // Wait for DOM to update
      setTimeout(() => {
        const focusableElements = document.querySelectorAll<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }, 100);
    };

    focusFirstElement();
  }, [currentStep, enabled, focusOnStepChange]);

  useEffect(() => {
    if (!enabled || !focusOnMount) return;

    // Focus the first focusable element on mount
    const focusableElements = document.querySelectorAll<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [enabled, focusOnMount]);
}

// ============================================================================
// Tab Order Management Hook
// ============================================================================

/**
 * Custom hook for managing tab order in complex forms
 * Ensures logical tab navigation through form elements
 * 
 * @param containerRef - Reference to the container element
 * @param enabled - Whether tab order management is enabled
 */
export function useTabOrder(
  containerRef: React.RefObject<HTMLElement | null>,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    
    // Get all focusable elements
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    // Set explicit tab indices if needed
    focusableElements.forEach((element) => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '0');
      }
    });

    // Handle Tab key navigation
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableArray = Array.from(focusableElements);
      const currentIndex = focusableArray.indexOf(document.activeElement as HTMLElement);

      if (currentIndex === -1) return;

      if (event.shiftKey) {
        // Shift+Tab - go backwards
        if (currentIndex === 0) {
          event.preventDefault();
          focusableArray[focusableArray.length - 1].focus();
        }
      } else {
        // Tab - go forwards
        if (currentIndex === focusableArray.length - 1) {
          event.preventDefault();
          focusableArray[0].focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [containerRef, enabled]);
}
