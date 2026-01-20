/**
 * useReducedMotion Hook
 * 
 * Detects the user's prefers-reduced-motion system preference
 * and provides a boolean flag for conditional animation rendering.
 * 
 * Validates: Requirements 11.7
 */

import { useEffect, useState } from 'react';

/**
 * Hook to detect prefers-reduced-motion preference
 * 
 * @returns {boolean} true if user prefers reduced motion, false otherwise
 * 
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 * 
 * <motion.div
 *   animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1.1 }}
 * />
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if matchMedia is supported
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return prefersReducedMotion;
}

/**
 * Get animation duration based on reduced motion preference
 * 
 * @param normalDuration - Duration in seconds for normal motion
 * @param reducedDuration - Duration in seconds for reduced motion (default: 0)
 * @returns Duration to use based on user preference
 */
export function getAnimationDuration(
  normalDuration: number,
  reducedDuration: number = 0
): number {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? reducedDuration : normalDuration;
}

/**
 * Get transition configuration based on reduced motion preference
 * 
 * @param normalTransition - Transition config for normal motion
 * @returns Transition config adjusted for user preference
 */
export function useAccessibleTransition(normalTransition: any): any {
  const prefersReducedMotion = useReducedMotion();
  
  if (prefersReducedMotion) {
    return {
      duration: 0,
      ease: 'linear',
    };
  }
  
  return normalTransition;
}
