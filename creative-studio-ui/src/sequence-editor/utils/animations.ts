/**
 * Animation Utilities for Sequence Editor Interface
 * 
 * Provides reusable animation functions and helpers for consistent
 * visual feedback across the application.
 * 
 * Requirements: 20.1, 20.3, 20.5, 20.6, 20.7
 */

/**
 * Animation timing constants (in milliseconds)
 * Requirement 20.1: 16ms response time for 60 FPS
 */
export const ANIMATION_TIMING = {
  INSTANT: 0,
  FAST: 100,
  NORMAL: 200,
  SLOW: 300,
  SLOWER: 500,
  TARGET_FPS: 60,
  FRAME_TIME: 16, // 1000ms / 60fps ≈ 16ms
} as const;

/**
 * Easing functions for natural motion
 * Requirement 20.7: Use ease-in-out for all animations
 */
export const EASING = {
  LINEAR: 'linear',
  EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
  EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  BOUNCE: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
} as const;

/**
 * Animation state types
 */
export type AnimationState = 'idle' | 'hover' | 'active' | 'disabled' | 'loading';

/**
 * Transition configuration
 */
export interface TransitionConfig {
  duration: number;
  easing: string;
  delay?: number;
  properties?: string[];
}

/**
 * Creates a CSS transition string from configuration
 * 
 * @param config - Transition configuration
 * @returns CSS transition string
 */
export function createTransition(config: TransitionConfig): string {
  const { duration, easing, delay = 0, properties = ['all'] } = config;
  
  return properties
    .map(prop => `${prop} ${duration}ms ${easing}${delay > 0 ? ` ${delay}ms` : ''}`)
    .join(', ');
}

/**
 * Default transition configurations for common use cases
 * Requirement 20.2: 200ms transitions for panel resizing
 */
export const TRANSITIONS = {
  FAST: createTransition({ duration: ANIMATION_TIMING.FAST, easing: EASING.EASE_IN_OUT }),
  NORMAL: createTransition({ duration: ANIMATION_TIMING.NORMAL, easing: EASING.EASE_IN_OUT }),
  SLOW: createTransition({ duration: ANIMATION_TIMING.SLOW, easing: EASING.EASE_IN_OUT }),
  
  // Specific transitions
  PANEL_RESIZE: createTransition({ 
    duration: ANIMATION_TIMING.NORMAL, 
    easing: EASING.EASE_IN_OUT,
    properties: ['width', 'height']
  }),
  
  COLOR: createTransition({ 
    duration: ANIMATION_TIMING.FAST, 
    easing: EASING.EASE_IN_OUT,
    properties: ['background-color', 'color', 'border-color']
  }),
  
  OPACITY: createTransition({ 
    duration: ANIMATION_TIMING.NORMAL, 
    easing: EASING.EASE_IN_OUT,
    properties: ['opacity']
  }),
  
  TRANSFORM: createTransition({ 
    duration: ANIMATION_TIMING.FAST, 
    easing: EASING.EASE_IN_OUT,
    properties: ['transform']
  }),
  
  TOOL_SELECTION: createTransition({ 
    duration: ANIMATION_TIMING.NORMAL, 
    easing: EASING.EASE_IN_OUT,
    properties: ['background-color', 'border-color', 'box-shadow']
  }),
} as const;

/**
 * Applies hover state animation to an element
 * Requirement 20.5: Color transitions for state changes
 * 
 * @param element - Target element
 * @param hoverColor - Background color on hover
 */
export function applyHoverAnimation(
  element: HTMLElement,
  hoverColor: string = 'var(--bg-hover)'
): void {
  element.style.transition = TRANSITIONS.COLOR;
  
  element.addEventListener('mouseenter', () => {
    element.style.backgroundColor = hoverColor;
  });
  
  element.addEventListener('mouseleave', () => {
    element.style.backgroundColor = '';
  });
}

/**
 * Applies active/pressed state animation to an element
 * Requirement 20.1: Visual feedback within 16ms
 * 
 * @param element - Target element
 * @param activeColor - Background color when active
 */
export function applyActiveAnimation(
  element: HTMLElement,
  activeColor: string = 'var(--bg-active)'
): void {
  element.style.transition = TRANSITIONS.COLOR;
  
  element.addEventListener('mousedown', () => {
    element.style.backgroundColor = activeColor;
  });
  
  element.addEventListener('mouseup', () => {
    element.style.backgroundColor = '';
  });
  
  element.addEventListener('mouseleave', () => {
    element.style.backgroundColor = '';
  });
}

/**
 * Applies button press animation with scale effect
 * Requirement 20.1: Visual feedback within 16ms
 * 
 * @param element - Target button element
 */
export function applyButtonPressAnimation(element: HTMLElement): void {
  element.style.transition = createTransition({
    duration: ANIMATION_TIMING.FAST,
    easing: EASING.EASE_IN_OUT,
    properties: ['transform', 'box-shadow']
  });
  
  element.addEventListener('mousedown', () => {
    element.style.transform = 'scale(0.95)';
  });
  
  element.addEventListener('mouseup', () => {
    element.style.transform = 'scale(1)';
  });
  
  element.addEventListener('mouseleave', () => {
    element.style.transform = 'scale(1)';
  });
}

/**
 * Applies tool selection highlight animation
 * Requirement 20.3: Animate tool selection with highlight transition
 * 
 * @param element - Tool button element
 * @param isSelected - Whether the tool is selected
 */
export function applyToolSelectionAnimation(
  element: HTMLElement,
  isSelected: boolean
): void {
  element.style.transition = TRANSITIONS.TOOL_SELECTION;
  
  if (isSelected) {
    element.style.backgroundColor = 'var(--accent-color)';
    element.style.borderColor = 'var(--accent-color)';
    element.style.boxShadow = '0 0 8px var(--accent-color)';
  } else {
    element.style.backgroundColor = '';
    element.style.borderColor = '';
    element.style.boxShadow = '';
  }
}

/**
 * Creates a ripple effect animation on click
 * Requirement 20.1: Visual feedback within 16ms
 * 
 * @param element - Target element
 * @param event - Mouse event
 */
export function createRippleEffect(element: HTMLElement, event: MouseEvent): void {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.position = 'absolute';
  ripple.style.borderRadius = '50%';
  ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  ripple.style.pointerEvents = 'none';
  ripple.style.transform = 'scale(0)';
  ripple.style.opacity = '1';
  ripple.style.transition = createTransition({
    duration: 600,
    easing: EASING.EASE_OUT,
    properties: ['transform', 'opacity']
  });
  
  element.style.position = element.style.position || 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(ripple);
  
  // Trigger animation
  requestAnimationFrame(() => {
    ripple.style.transform = 'scale(2)';
    ripple.style.opacity = '0';
  });
  
  // Remove ripple after animation
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

/**
 * Applies fade-in animation to an element
 * 
 * @param element - Target element
 * @param duration - Animation duration in ms
 */
export function fadeIn(element: HTMLElement, duration: number = ANIMATION_TIMING.NORMAL): void {
  element.style.opacity = '0';
  element.style.transition = createTransition({
    duration,
    easing: EASING.EASE_IN_OUT,
    properties: ['opacity']
  });
  
  requestAnimationFrame(() => {
    element.style.opacity = '1';
  });
}

/**
 * Applies fade-out animation to an element
 * 
 * @param element - Target element
 * @param duration - Animation duration in ms
 * @returns Promise that resolves when animation completes
 */
export function fadeOut(
  element: HTMLElement,
  duration: number = ANIMATION_TIMING.NORMAL
): Promise<void> {
  return new Promise((resolve) => {
    element.style.transition = createTransition({
      duration,
      easing: EASING.EASE_IN_OUT,
      properties: ['opacity']
    });
    
    element.style.opacity = '0';
    
    setTimeout(() => {
      resolve();
    }, duration);
  });
}

/**
 * Applies slide-in animation to an element
 * 
 * @param element - Target element
 * @param direction - Slide direction
 * @param duration - Animation duration in ms
 */
export function slideIn(
  element: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  duration: number = ANIMATION_TIMING.NORMAL
): void {
  const transforms = {
    up: 'translateY(20px)',
    down: 'translateY(-20px)',
    left: 'translateX(20px)',
    right: 'translateX(-20px)',
  };
  
  element.style.opacity = '0';
  element.style.transform = transforms[direction];
  element.style.transition = createTransition({
    duration,
    easing: EASING.EASE_OUT,
    properties: ['opacity', 'transform']
  });
  
  requestAnimationFrame(() => {
    element.style.opacity = '1';
    element.style.transform = 'translate(0, 0)';
  });
}

/**
 * Applies pulse animation to an element
 * 
 * @param element - Target element
 * @param iterations - Number of pulses (0 for infinite)
 */
export function pulse(element: HTMLElement, iterations: number = 1): void {
  const keyframes = [
    { transform: 'scale(1)', opacity: '1' },
    { transform: 'scale(1.05)', opacity: '0.8' },
    { transform: 'scale(1)', opacity: '1' },
  ];
  
  const options: KeyframeAnimationOptions = {
    duration: 600,
    easing: EASING.EASE_IN_OUT,
    iterations: iterations === 0 ? Infinity : iterations,
  };
  
  element.animate(keyframes, options);
}

/**
 * Applies shake animation to an element (for errors)
 * 
 * @param element - Target element
 */
export function shake(element: HTMLElement): void {
  const keyframes = [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(-10px)' },
    { transform: 'translateX(10px)' },
    { transform: 'translateX(0)' },
  ];
  
  const options: KeyframeAnimationOptions = {
    duration: 400,
    easing: EASING.EASE_IN_OUT,
  };
  
  element.animate(keyframes, options);
}

/**
 * Checks if animations should be reduced based on user preferences
 * 
 * @returns True if animations should be reduced
 */
export function shouldReduceMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Applies animation with respect to user motion preferences
 * 
 * @param element - Target element
 * @param animationFn - Animation function to apply
 */
export function applyAccessibleAnimation(
  element: HTMLElement,
  animationFn: (el: HTMLElement) => void
): void {
  if (shouldReduceMotion()) {
    // Skip animation or use instant transition
    element.style.transition = 'none';
  } else {
    animationFn(element);
  }
}

/**
 * Performance monitoring for animations
 * Requirement 20.1: Ensure 60 FPS (16ms per frame)
 */
export class AnimationPerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  
  /**
   * Starts monitoring animation performance
   */
  start(): void {
    this.measure();
  }
  
  private measure(): void {
    const currentTime = performance.now();
    this.frameCount++;
    
    if (currentTime >= this.lastTime + 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.frameCount = 0;
      this.lastTime = currentTime;
      
      // Warn if FPS drops below target
      if (this.fps < ANIMATION_TIMING.TARGET_FPS - 10) {
        console.warn(`Animation performance warning: ${this.fps} FPS (target: ${ANIMATION_TIMING.TARGET_FPS})`);
      }
    }
    
    requestAnimationFrame(() => this.measure());
  }
  
  /**
   * Gets current FPS
   */
  getFPS(): number {
    return this.fps;
  }
}

/**
 * Debounces animation updates to prevent excessive re-renders
 * 
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounceAnimation<T extends (...args: any[]) => void>(
  fn: T,
  delay: number = ANIMATION_TIMING.FRAME_TIME
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null;
  let rafId: number | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    
    rafId = requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        fn(...args);
      }, delay);
    });
  };
}

/**
 * Throttles animation updates to maintain consistent frame rate
 * 
 * @param fn - Function to throttle
 * @param delay - Minimum delay between calls in milliseconds
 * @returns Throttled function
 */
export function throttleAnimation<T extends (...args: any[]) => void>(
  fn: T,
  delay: number = ANIMATION_TIMING.FRAME_TIME
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let rafId: number | null = null;
  
  return (...args: Parameters<T>) => {
    const now = performance.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(() => {
        fn(...args);
      });
    }
  };
}
