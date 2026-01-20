/**
 * AccessibleAnimation Component
 * 
 * Wrapper component that automatically respects prefers-reduced-motion.
 * Provides a simple API for creating accessible animations.
 * 
 * Validates: Requirements 11.7
 */

import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface AccessibleAnimationProps extends MotionProps {
  children: React.ReactNode;
  reducedMotionFallback?: MotionProps;
  className?: string;
}

/**
 * Motion component that respects prefers-reduced-motion
 * 
 * Validates: Requirements 11.7
 * 
 * @example
 * ```tsx
 * <AccessibleAnimation
 *   animate={{ opacity: 1, scale: 1 }}
 *   initial={{ opacity: 0, scale: 0.9 }}
 *   reducedMotionFallback={{ animate: { opacity: 1 } }}
 * >
 *   <div>Content</div>
 * </AccessibleAnimation>
 * ```
 */
export function AccessibleAnimation({
  children,
  reducedMotionFallback,
  className = '',
  ...motionProps
}: AccessibleAnimationProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    // Use fallback props if provided, otherwise just show content without animation
    const fallbackProps = reducedMotionFallback || {
      initial: false,
      animate: {},
      transition: { duration: 0 },
    };

    return (
      <motion.div className={className} {...fallbackProps}>
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div className={className} {...motionProps}>
      {children}
    </motion.div>
  );
}

/**
 * HOC to make any component respect prefers-reduced-motion
 * 
 * Validates: Requirements 11.7
 */
export function withAccessibleAnimation<P extends object>(
  Component: React.ComponentType<P>,
  animationProps: MotionProps,
  reducedMotionFallback?: MotionProps
) {
  return function AccessibleComponent(props: P) {
    const prefersReducedMotion = useReducedMotion();

    if (prefersReducedMotion) {
      const fallbackProps = reducedMotionFallback || {
        initial: false,
        animate: {},
        transition: { duration: 0 },
      };

      return (
        <motion.div {...fallbackProps}>
          <Component {...props} />
        </motion.div>
      );
    }

    return (
      <motion.div {...animationProps}>
        <Component {...props} />
      </motion.div>
    );
  };
}

/**
 * Utility to get animation props based on reduced motion preference
 * 
 * Validates: Requirements 11.7
 */
export function useAccessibleAnimationProps<T extends MotionProps>(
  normalProps: T,
  reducedProps?: Partial<T>
): T {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return {
      ...normalProps,
      ...reducedProps,
      transition: { duration: 0 },
    } as T;
  }

  return normalProps;
}

/**
 * Debug component to show current reduced motion preference
 * Useful for testing and development
 */
export function ReducedMotionIndicator() {
  const prefersReducedMotion = useReducedMotion();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            prefersReducedMotion ? 'bg-yellow-400' : 'bg-green-400'
          }`}
        />
        <span>
          {prefersReducedMotion
            ? 'Reduced Motion: ON'
            : 'Reduced Motion: OFF'}
        </span>
      </div>
    </div>
  );
}

/**
 * Test component to demonstrate reduced motion behavior
 */
export function ReducedMotionDemo() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Reduced Motion Demo</h2>
        <p className="text-gray-600">
          Current preference:{' '}
          <strong>
            {prefersReducedMotion ? 'Reduced Motion' : 'Full Animations'}
          </strong>
        </p>
        <p className="text-sm text-gray-500">
          To test: Open your system settings and toggle "Reduce motion" or
          "Prefers reduced motion"
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="font-semibold">With Reduced Motion Support</h3>
          <AccessibleAnimation
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-4 bg-blue-100 rounded-lg"
          >
            This respects your motion preference
          </AccessibleAnimation>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Without Support (Always Animates)</h3>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-4 bg-red-100 rounded-lg"
          >
            This always animates regardless of preference
          </motion.div>
        </div>
      </div>

      <div className="p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Implementation Note</h3>
        <p className="text-sm text-gray-700">
          When reduced motion is preferred, animations are either disabled
          entirely or reduced to instant transitions (duration: 0). This ensures
          accessibility for users with vestibular disorders or motion
          sensitivity.
        </p>
      </div>
    </div>
  );
}
