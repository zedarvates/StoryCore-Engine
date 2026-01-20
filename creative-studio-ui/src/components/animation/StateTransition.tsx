/**
 * StateTransition Component
 * 
 * Provides smooth animated transitions for state changes.
 * Uses natural acceleration curves for professional feel.
 * 
 * Validates: Requirements 11.1
 */

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
  fadeVariants,
  slideVariants,
  scaleVariants,
  defaultTransition,
} from '../../config/animations';
import { useAnimationConfig } from './AnimationProvider';

export type TransitionType = 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'scale';

interface StateTransitionProps {
  children: React.ReactNode;
  show: boolean;
  type?: TransitionType;
  className?: string;
  onExitComplete?: () => void;
}

/**
 * Animated state transition wrapper
 * 
 * Validates: Requirements 11.1 - Natural acceleration curves
 * 
 * @example
 * ```tsx
 * <StateTransition show={isVisible} type="fade">
 *   <div>Content that fades in/out</div>
 * </StateTransition>
 * ```
 */
export function StateTransition({
  children,
  show,
  type = 'fade',
  className = '',
  onExitComplete,
}: StateTransitionProps) {
  const { isAnimationEnabled } = useAnimationConfig();

  const getVariants = (): Variants => {
    if (!isAnimationEnabled) {
      return fadeVariants;
    }

    switch (type) {
      case 'fade':
        return fadeVariants;
      case 'slide-up':
        return slideVariants.up;
      case 'slide-down':
        return slideVariants.down;
      case 'slide-left':
        return slideVariants.left;
      case 'slide-right':
        return slideVariants.right;
      case 'scale':
        return scaleVariants;
      default:
        return fadeVariants;
    }
  };

  return (
    <AnimatePresence mode="wait" onExitComplete={onExitComplete}>
      {show && (
        <motion.div
          variants={getVariants()}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Animated content switcher with smooth transitions
 * 
 * Validates: Requirements 11.1
 */
export function ContentSwitcher({
  children,
  contentKey,
  type = 'fade',
  className = '',
}: {
  children: React.ReactNode;
  contentKey: string | number;
  type?: TransitionType;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  const getVariants = (): Variants => {
    if (!isAnimationEnabled) {
      return fadeVariants;
    }

    switch (type) {
      case 'fade':
        return fadeVariants;
      case 'slide-up':
        return slideVariants.up;
      case 'slide-down':
        return slideVariants.down;
      case 'slide-left':
        return slideVariants.left;
      case 'slide-right':
        return slideVariants.right;
      case 'scale':
        return scaleVariants;
      default:
        return fadeVariants;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={contentKey}
        variants={getVariants()}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Animated list with stagger effect
 * 
 * Validates: Requirements 11.1
 */
export function StaggeredList({
  children,
  className = '',
  staggerDelay = 0.1,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: isAnimationEnabled ? staggerDelay : 0,
        delayChildren: isAnimationEnabled ? 0.1 : 0,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: isAnimationEnabled ? defaultTransition : { duration: 0 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * Animated collapse/expand wrapper
 * 
 * Validates: Requirements 11.1
 */
export function CollapseTransition({
  children,
  isOpen,
  className = '',
}: {
  children: React.ReactNode;
  isOpen: boolean;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: 'auto',
            opacity: 1,
            transition: isAnimationEnabled
              ? { duration: 0.25, ease: [0.4, 0.0, 0.2, 1] }
              : { duration: 0 },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: isAnimationEnabled
              ? { duration: 0.2, ease: [0.4, 0.0, 1, 1] }
              : { duration: 0 },
          }}
          className={`overflow-hidden ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
