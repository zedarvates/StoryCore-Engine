/**
 * Timeline Animations Hook
 * Provides animation utilities for timeline operations.
 */
import { useCallback, useRef } from 'react';

interface AnimationOptions {
  duration?: number;
  easing?: string;
  onComplete?: () => void;
}

export const useTimelineAnimations = () => {
const animationRef = useRef<Animation | null>(null);

  const animate = useCallback((
    element: HTMLElement,
    keyframes: Keyframe[],
    options: AnimationOptions
  ) => {
    element.animate(keyframes, {
      duration: options.duration || 300,
      easing: options.easing || 'ease-out',
      fill: 'forwards',
    });
  }, []);

  const fadeIn = useCallback((element: HTMLElement) => {
    animate(element, [
      { opacity: 0 },
      { opacity: 1 },
    ], { duration: 200 });
  }, [animate]);

  const fadeOut = useCallback((element: HTMLElement) => {
    animate(element, [
      { opacity: 1 },
      { opacity: 0 },
    ], { duration: 200 });
  }, [animate]);

  const slideIn = useCallback((element: HTMLElement, direction: 'left' | 'right' | 'top' | 'bottom') => {
    const transform = direction === 'left' ? 'translateX(-20px)' 
      : direction === 'right' ? 'translateX(20px)'
      : direction === 'top' ? 'translateY(-20px)'
      : 'translateY(20px)';
    
    animate(element, [
      { opacity: 0, transform },
      { opacity: 1, transform: 'translateX(0)' },
    ], { duration: 250 });
  }, [animate]);

  const pulse = useCallback((element: HTMLElement) => {
    element.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.02)' },
      { transform: 'scale(1)' },
    ], { duration: 300, iterations: 2 });
  }, []);

  const ripple = useCallback((element: HTMLElement, x: number, y: number) => {
    const ripple = document.createElement('div');
    ripple.style.cssText = `
      position: absolute;
      width: 20px;
      height: 20px;
      background: rgba(74, 144, 226, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s ease-out;
      pointer-events: none;
      left: ${x}px;
      top: ${y}px;
    `;
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, []);

  return {
    animate,
    fadeIn,
    fadeOut,
    slideIn,
    pulse,
    ripple,
  };
};

export default useTimelineAnimations;
