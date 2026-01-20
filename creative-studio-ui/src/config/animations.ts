/**
 * Animation Configuration
 * 
 * Centralized animation variants and configuration for Framer Motion.
 * All animations follow consistent timing (200-300ms) and easing curves.
 * 
 * Validates: Requirements 11.4
 */

import { Variants, Transition } from 'framer-motion';

/**
 * Standard animation durations (in seconds)
 */
export const ANIMATION_DURATIONS = {
  fast: 0.15,      // 150ms - Quick interactions
  standard: 0.25,  // 250ms - Default for most animations
  slow: 0.35,      // 350ms - Emphasized transitions
} as const;

/**
 * Standard easing curves
 */
export const EASING = {
  // Natural acceleration/deceleration
  easeInOut: [0.4, 0.0, 0.2, 1],
  // Quick start, slow end
  easeOut: [0.0, 0.0, 0.2, 1],
  // Slow start, quick end
  easeIn: [0.4, 0.0, 1, 1],
  // Bouncy effect
  spring: { type: 'spring', stiffness: 300, damping: 30 },
} as const;

/**
 * Default transition configuration
 */
export const defaultTransition: Transition = {
  duration: ANIMATION_DURATIONS.standard,
  ease: EASING.easeInOut,
};

/**
 * Fade animation variants
 */
export const fadeVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: defaultTransition,
  },
  exit: {
    opacity: 0,
    transition: { duration: ANIMATION_DURATIONS.fast },
  },
};

/**
 * Slide animation variants
 */
export const slideVariants = {
  up: {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: defaultTransition,
    },
    exit: {
      y: -20,
      opacity: 0,
      transition: { duration: ANIMATION_DURATIONS.fast },
    },
  },
  down: {
    hidden: { y: -20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: defaultTransition,
    },
    exit: {
      y: 20,
      opacity: 0,
      transition: { duration: ANIMATION_DURATIONS.fast },
    },
  },
  left: {
    hidden: { x: 20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: defaultTransition,
    },
    exit: {
      x: -20,
      opacity: 0,
      transition: { duration: ANIMATION_DURATIONS.fast },
    },
  },
  right: {
    hidden: { x: -20, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: defaultTransition,
    },
    exit: {
      x: 20,
      opacity: 0,
      transition: { duration: ANIMATION_DURATIONS.fast },
    },
  },
} as const;

/**
 * Scale animation variants
 */
export const scaleVariants: Variants = {
  hidden: {
    scale: 0.95,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: defaultTransition,
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: { duration: ANIMATION_DURATIONS.fast },
  },
};

/**
 * Success animation variants (checkmark, highlight)
 * Validates: Requirements 11.2
 */
export const successVariants: Variants = {
  initial: {
    scale: 1,
    backgroundColor: 'transparent',
  },
  animate: {
    scale: [1, 1.05, 1],
    backgroundColor: ['transparent', 'rgba(34, 197, 94, 0.1)', 'transparent'],
    transition: {
      duration: 0.6,
      times: [0, 0.5, 1],
      ease: EASING.easeOut,
    },
  },
};

/**
 * Error animation variants (shake)
 * Validates: Requirements 11.3
 */
export const errorVariants: Variants = {
  initial: {
    x: 0,
  },
  animate: {
    x: [-10, 10, -10, 10, -5, 5, 0],
    transition: {
      duration: 0.5,
      times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1],
      ease: 'easeInOut',
    },
  },
};

/**
 * Hover animation variants
 * Validates: Requirements 11.5
 */
export const hoverVariants: Variants = {
  rest: {
    scale: 1,
    transition: { duration: ANIMATION_DURATIONS.fast },
  },
  hover: {
    scale: 1.02,
    transition: { duration: ANIMATION_DURATIONS.fast },
  },
  tap: {
    scale: 0.98,
    transition: { duration: ANIMATION_DURATIONS.fast },
  },
};

/**
 * Stagger children animation
 */
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

/**
 * Stagger child item animation
 */
export const staggerItemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: defaultTransition,
  },
};

/**
 * Loading pulse animation
 */
export const pulseVariants: Variants = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Collapse/Expand animation
 */
export const collapseVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: ANIMATION_DURATIONS.standard },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { duration: ANIMATION_DURATIONS.standard },
  },
};

/**
 * Drag animation variants
 */
export const dragVariants: Variants = {
  idle: {
    scale: 1,
    boxShadow: '0 0 0 rgba(0, 0, 0, 0)',
  },
  dragging: {
    scale: 1.05,
    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
    opacity: 0.8,
    transition: { duration: ANIMATION_DURATIONS.fast },
  },
};

/**
 * Modal/Dialog animation variants
 */
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATIONS.standard,
      ease: EASING.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: ANIMATION_DURATIONS.fast,
      ease: EASING.easeIn,
    },
  },
};

/**
 * Backdrop animation variants
 */
export const backdropVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: { duration: ANIMATION_DURATIONS.standard },
  },
  exit: {
    opacity: 0,
    transition: { duration: ANIMATION_DURATIONS.fast },
  },
};

/**
 * Notification/Toast animation variants
 */
export const toastVariants: Variants = {
  hidden: {
    x: 400,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: ANIMATION_DURATIONS.standard,
      ease: EASING.easeOut,
    },
  },
  exit: {
    x: 400,
    opacity: 0,
    transition: {
      duration: ANIMATION_DURATIONS.fast,
      ease: EASING.easeIn,
    },
  },
};
