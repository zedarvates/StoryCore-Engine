/**
 * HoverAnimations Component
 * 
 * Provides smooth hover state animations with consistent durations.
 * All hover transitions use fast duration (150ms) for immediate feedback.
 * 
 * Validates: Requirements 11.5
 */

import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { hoverVariants, ANIMATION_DURATIONS } from '../../config/animations';
import { useAnimationConfig } from './AnimationProvider';

interface HoverScaleProps extends Omit<MotionProps, 'whileHover' | 'whileTap'> {
  children: React.ReactNode;
  scaleAmount?: number;
  className?: string;
}

/**
 * Animated hover scale effect
 * Scales element slightly on hover for interactive feedback
 * 
 * Validates: Requirements 11.5
 * 
 * @example
 * ```tsx
 * <HoverScale>
 *   <button>Click me</button>
 * </HoverScale>
 * ```
 */
export function HoverScale({
  children,
  scaleAmount = 1.02,
  className = '',
  ...motionProps
}: HoverScaleProps) {
  const { isAnimationEnabled } = useAnimationConfig();

  if (!isAnimationEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{ scale: scaleAmount }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: ANIMATION_DURATIONS.fast }}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated hover lift effect
 * Lifts element with shadow on hover
 * 
 * Validates: Requirements 11.5
 */
export function HoverLift({
  children,
  liftAmount = -4,
  className = '',
}: {
  children: React.ReactNode;
  liftAmount?: number;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  if (!isAnimationEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{
        y: liftAmount,
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
      }}
      transition={{ duration: ANIMATION_DURATIONS.fast }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated hover brightness effect
 * Increases brightness on hover
 * 
 * Validates: Requirements 11.5
 */
export function HoverBrightness({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  if (!isAnimationEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{ filter: 'brightness(1.1)' }}
      transition={{ duration: ANIMATION_DURATIONS.fast }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated hover glow effect
 * Adds a subtle glow on hover
 * 
 * Validates: Requirements 11.5
 */
export function HoverGlow({
  children,
  glowColor = 'rgba(59, 130, 246, 0.5)',
  className = '',
}: {
  children: React.ReactNode;
  glowColor?: string;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  if (!isAnimationEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{
        boxShadow: `0 0 20px ${glowColor}`,
      }}
      transition={{ duration: ANIMATION_DURATIONS.fast }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated hover underline effect
 * Animates an underline on hover
 * 
 * Validates: Requirements 11.5
 */
export function HoverUnderline({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  if (!isAnimationEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={`relative inline-block ${className}`}>
      {children}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 bg-current"
        initial={{ width: 0 }}
        whileHover={{ width: '100%' }}
        transition={{ duration: ANIMATION_DURATIONS.fast }}
      />
    </motion.div>
  );
}

/**
 * Interactive button with hover and tap animations
 * Combines scale and opacity effects
 * 
 * Validates: Requirements 11.5
 */
export function InteractiveButton({
  children,
  onClick,
  disabled = false,
  className = '',
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'danger';
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  const getVariantClasses = () => {
    const base = 'px-4 py-2 rounded-lg font-medium transition-colors';
    switch (variant) {
      case 'primary':
        return `${base} bg-blue-600 text-white hover:bg-blue-700`;
      case 'secondary':
        return `${base} bg-gray-200 text-gray-900 hover:bg-gray-300`;
      case 'danger':
        return `${base} bg-red-600 text-white hover:bg-red-700`;
      default:
        return `${base} bg-gray-100 text-gray-900 hover:bg-gray-200`;
    }
  };

  if (!isAnimationEnabled || disabled) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`${getVariantClasses()} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`${getVariantClasses()} ${className}`}
      variants={hoverVariants}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
    >
      {children}
    </motion.button>
  );
}

/**
 * Card with hover animation
 * Lifts and adds shadow on hover
 * 
 * Validates: Requirements 11.5
 */
export function HoverCard({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  if (!isAnimationEnabled) {
    return (
      <div onClick={onClick} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      onClick={onClick}
      className={`cursor-pointer ${className}`}
      whileHover={{
        y: -4,
        boxShadow: '0 12px 24px rgba(0, 0, 0, 0.1)',
      }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: ANIMATION_DURATIONS.fast }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Icon button with hover animation
 * Rotates slightly on hover
 * 
 * Validates: Requirements 11.5
 */
export function HoverIconButton({
  children,
  onClick,
  className = '',
  rotateAmount = 15,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  rotateAmount?: number;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  if (!isAnimationEnabled) {
    return (
      <button onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      className={className}
      whileHover={{ rotate: rotateAmount, scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: ANIMATION_DURATIONS.fast }}
    >
      {children}
    </motion.button>
  );
}
