/**
 * Animation System Index
 * 
 * Central export for all animation hooks and utilities.
 * Inspired by Remotion's animation patterns.
 * 
 * Validates: Requirements 11.8 - Animation System
 */

// Animation hooks
export { useSpring, useSpringObject, useSpringTrail, useSpringTransition, Spring } from './useSpring';
export { useKeyframes, useKeyframesObject, useKeyframesStagger, Easing } from './useKeyframes';
export { useAnimationOrchestrator, useSequentialAnimations, useParallelAnimations, useStaggeredAnimations } from './useAnimationOrchestrator';

// Animation types and utilities
export * from '../services/animation/AnimationTypes';
export { SpringEngine, createSpringAnimation } from '../services/animation/SpringEngine';
export { AnimationOrchestrator, animationOrchestrator, createAnimationTask } from '../services/animation/AnimationOrchestrator';

/**
 * Quick reference for animation system
 * 
 * // Simple spring animation
 * const { value, isAnimating } = useSpring({
 *   from: 0,
 *   to: 100,
 *   config: Spring.gentle
 * });
 * 
 * // Keyframe animation
 * const { value, progress } = useKeyframes({
 *   from: 0,
 *   to: 100,
 *   duration: 1000,
 *   keyframes: [
 *     { time: 0, value: 0 },
 *     { time: 0.5, value: 100, easing: Easing.easeOutBounce },
 *     { time: 1, value: 0 }
 *   ],
 *   loop: true
 * });
 * 
 * // Object spring animation (for transforms, opacity, etc.)
 * const { value } = useSpringObject({
 *   from: { opacity: 0, scale: 0 },
 *   to: { opacity: 1, scale: 1 },
 *   config: { opacity: { stiffness: 50 }, scale: { stiffness: 100 } }
 * });
 */
