/**
 * Animation Types
 * 
 * Core type definitions for the StoryCore animation system.
 * Inspired by Remotion's animation patterns.
 * 
 * Validates: Requirements 11.8 - Animation System
 */

/**
 * Animation priority levels
 */
export type AnimationPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Easing function type
 */
export type EasingFunction = (t: number) => number;

/**
 * Standard easing functions
 */
export const Easing = {
  linear: (t: number): number => t,
  
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => (--t) * t * t + 1,
  easeInOutCubic: (t: number): number => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  easeInQuart: (t: number): number => t * t * t * t,
  easeOutQuart: (t: number): number => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number): number => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  easeInQuint: (t: number): number => t * t * t * t * t,
  easeOutQuint: (t: number): number => 1 + (--t) * t * t * t * t,
  easeInOutQuint: (t: number): number => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
  
  easeInSine: (t: number): number => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: (t: number): number => Math.sin(t * Math.PI / 2),
  easeInOutSine: (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2,
  
  easeInExpo: (t: number): number => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t: number): number => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number): number => {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  
  easeInCirc: (t: number): number => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t: number): number => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: (t: number): number => {
    t *= 2;
    if (t < 1) return -(Math.sqrt(1 - t * t) - 1) / 2;
    return (Math.sqrt(1 - (t -= 2) * t) + 1) / 2;
  },
  
  easeInBack: (t: number): number => {
    const s = 1.70158;
    return t * t * ((s + 1) * t - s);
  },
  easeOutBack: (t: number): number => {
    const s = 1.70158;
    return (--t) * t * ((s + 1) * t + s) + 1;
  },
  easeInOutBack: (t: number): number => {
    const s = 1.70158 * 1.525;
    if ((t *= 2) < 1) return 0.5 * (t * t * ((s + 1) * t - s));
    return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
  },
  
  easeInElastic: (t: number): number => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.075) * (2 * Math.PI) / 0.3);
  },
  easeOutElastic: (t: number): number => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
  },
  easeInOutElastic: (t: number): number => {
    if (t === 0 || t === 1) return t;
    t *= 2;
    if (t < 1) return Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * (2 * Math.PI) / 0.4) * 0.5;
    return Math.pow(2, -10 * (t - 1)) * Math.sin((t - 1.1) * (2 * Math.PI) / 0.4) * 0.5 + 1;
  },
  
  easeInBounce: (t: number): number => 1 - Easing.easeOutBounce(1 - t),
  easeOutBounce: (t: number): number => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeInOutBounce: (t: number): number => {
    if (t < 0.5) return Easing.easeInBounce(t * 2) * 0.5;
    return Easing.easeOutBounce(t * 2 - 1) * 0.5 + 0.5;
  },
};

/**
 * Spring physics configuration
 */
export interface SpringConfig {
  mass: number;
  stiffness: number;
  damping: number;
  velocity?: number;
}

/**
 * Default spring configurations
 */
export const Spring = {
  default: { mass: 1, stiffness: 100, damping: 10 } as SpringConfig,
  gentle: { mass: 1, stiffness: 50, damping: 10 } as SpringConfig,
  wobbly: { mass: 1, stiffness: 180, damping: 12 } as SpringConfig,
  stiff: { mass: 1, stiffness: 260, damping: 20 } as SpringConfig,
  slow: { mass: 1, stiffness: 40, damping: 30 } as SpringConfig,
  rapid: { mass: 1, stiffness: 200, damping: 14 } as SpringConfig,
};

/**
 * Keyframe definition
 */
export interface Keyframe<T = number> {
  time: number; // 0-1 percentage
  value: T;
  easing?: EasingFunction;
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  id: string;
  duration?: number;
  easing?: EasingFunction;
  delay?: number;
  loop?: boolean | number;
  direction?: 'normal' | 'reverse' | 'alternate';
  priority?: AnimationPriority;
}

/**
 * Spring animation configuration
 */
export interface SpringAnimationConfig extends Omit<AnimationConfig, 'duration'> {
  from: number;
  to: number;
  config?: Partial<SpringConfig>;
  velocity?: number;
  duration?: number; // Optional for spring - calculated from physics
}

/**
 * Keyframe animation configuration
 */
export interface KeyframeAnimationConfig<T = number> extends AnimationConfig {
  keyframes: Keyframe<T>[];
  from?: T;
  to?: T;
}

/**
 * Animation state
 */
export interface AnimationState {
  id: string;
  isPlaying: boolean;
  isPaused: boolean;
  progress: number; // 0-1
  currentValue: number;
  velocity: number;
}

/**
 * Animation instance
 */
export interface AnimationInstance<T = number> {
  id: string;
  config: AnimationConfig;
  state: AnimationState;
  start(): void;
  pause(): void;
  stop(): void;
  reset(): void;
  seek(progress: number): void;
  onComplete?: () => void;
  onUpdate?: (value: T) => void;
}

/**
 * Transform properties
 */
export interface TransformProperties {
  x?: number;
  y?: number;
  z?: number;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotate?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  skewX?: number;
  skewY?: number;
  perspective?: number;
}

/**
 * CSS-style animation properties
 */
export interface CSSAnimationProperties {
  opacity?: number;
  transform?: TransformProperties;
  width?: number | string;
  height?: number | string;
  backgroundColor?: string;
  color?: string;
  borderRadius?: number | string;
  boxShadow?: string;
  filter?: string;
}
