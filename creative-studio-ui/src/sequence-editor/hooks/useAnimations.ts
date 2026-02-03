/**
 * React Hook for Animation Utilities
 * 
 * Provides easy-to-use animation functions for React components.
 * 
 * Requirements: 20.1, 20.3, 20.5
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  applyHoverAnimation,
  applyActiveAnimation,
  applyButtonPressAnimation,
  applyToolSelectionAnimation,
  createRippleEffect,
  fadeIn,
  fadeOut,
  slideIn,
  pulse,
  shake,
  shouldReduceMotion,
  applyAccessibleAnimation,
} from '../utils/animations';

/**
 * Hook for applying hover animation to an element
 * 
 * @param hoverColor - Background color on hover
 * @returns Ref to attach to element
 */
export function useHoverAnimation(hoverColor?: string) {
  const ref = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      applyHoverAnimation(ref.current, hoverColor);
    }
  }, [hoverColor]);
  
  return ref;
}

/**
 * Hook for applying active/pressed animation to an element
 * 
 * @param activeColor - Background color when active
 * @returns Ref to attach to element
 */
export function useActiveAnimation(activeColor?: string) {
  const ref = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      applyActiveAnimation(ref.current, activeColor);
    }
  }, [activeColor]);
  
  return ref;
}

/**
 * Hook for applying button press animation to an element
 * 
 * @returns Ref to attach to button element
 */
export function useButtonPressAnimation() {
  const ref = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      applyButtonPressAnimation(ref.current);
    }
  }, []);
  
  return ref;
}

/**
 * Hook for applying tool selection animation
 * 
 * @param isSelected - Whether the tool is selected
 * @returns Ref to attach to tool button
 */
export function useToolSelectionAnimation(isSelected: boolean) {
  const ref = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      applyToolSelectionAnimation(ref.current, isSelected);
    }
  }, [isSelected]);
  
  return ref;
}

/**
 * Hook for creating ripple effect on click
 * 
 * @returns Ref and click handler
 */
export function useRippleEffect() {
  const ref = useRef<HTMLElement>(null);
  
  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (ref.current && !shouldReduceMotion()) {
      createRippleEffect(ref.current, event.nativeEvent);
    }
  }, []);
  
  return { ref, onClick: handleClick };
}

/**
 * Hook for fade-in animation on mount
 * 
 * @param duration - Animation duration in ms
 * @returns Ref to attach to element
 */
export function useFadeIn(duration?: number) {
  const ref = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      applyAccessibleAnimation(ref.current, (el) => fadeIn(el, duration));
    }
  }, [duration]);
  
  return ref;
}

/**
 * Hook for slide-in animation on mount
 * 
 * @param direction - Slide direction
 * @param duration - Animation duration in ms
 * @returns Ref to attach to element
 */
export function useSlideIn(
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  duration?: number
) {
  const ref = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      applyAccessibleAnimation(ref.current, (el) => slideIn(el, direction, duration));
    }
  }, [direction, duration]);
  
  return ref;
}

/**
 * Hook for pulse animation
 * 
 * @param iterations - Number of pulses (0 for infinite)
 * @returns Ref and trigger function
 */
export function usePulse(iterations: number = 1) {
  const ref = useRef<HTMLElement>(null);
  
  const trigger = useCallback(() => {
    if (ref.current && !shouldReduceMotion()) {
      pulse(ref.current, iterations);
    }
  }, [iterations]);
  
  return { ref, trigger };
}

/**
 * Hook for shake animation (for errors)
 * 
 * @returns Ref and trigger function
 */
export function useShake() {
  const ref = useRef<HTMLElement>(null);
  
  const trigger = useCallback(() => {
    if (ref.current && !shouldReduceMotion()) {
      shake(ref.current);
    }
  }, []);
  
  return { ref, trigger };
}

/**
 * Hook for fade-out animation with cleanup
 * 
 * @param duration - Animation duration in ms
 * @returns Ref and trigger function
 */
export function useFadeOut(duration?: number) {
  const ref = useRef<HTMLElement>(null);
  
  const trigger = useCallback(async () => {
    if (ref.current) {
      if (shouldReduceMotion()) {
        ref.current.style.opacity = '0';
      } else {
        await fadeOut(ref.current, duration);
      }
    }
  }, [duration]);
  
  return { ref, trigger };
}

/**
 * Hook to check if animations should be reduced
 * 
 * @returns True if animations should be reduced
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = React.useState(shouldReduceMotion());
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = () => {
      setReducedMotion(mediaQuery.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  
  return reducedMotion;
}

// Fix React import
import * as React from 'react';
