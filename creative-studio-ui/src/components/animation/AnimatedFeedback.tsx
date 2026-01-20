/**
 * AnimatedFeedback Component
 * 
 * Provides animated visual feedback for success and error states.
 * Includes checkmark animations, highlight effects, and shake animations.
 * 
 * Validates: Requirements 11.1, 11.2, 11.3
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle, Info } from 'lucide-react';
import { successVariants, errorVariants, fadeVariants } from '../../config/animations';
import { useAnimationConfig } from './AnimationProvider';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface AnimatedFeedbackProps {
  type: FeedbackType;
  message?: string;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

/**
 * Animated feedback component with icon and message
 * 
 * Validates: Requirements 11.2 (success), 11.3 (error)
 */
export function AnimatedFeedback({
  type,
  message,
  duration = 3000,
  onComplete,
  className = '',
}: AnimatedFeedbackProps) {
  const { isAnimationEnabled } = useAnimationConfig();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onComplete]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="w-5 h-5" />;
      case 'error':
        return <X className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  const getVariants = () => {
    if (!isAnimationEnabled) {
      return fadeVariants;
    }
    return type === 'error' ? errorVariants : successVariants;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={getVariants()}
          initial="initial"
          animate="animate"
          exit="exit"
          className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${getColorClasses()} ${className}`}
        >
          <span className="flex-shrink-0">{getIcon()}</span>
          {message && <span className="text-sm font-medium">{message}</span>}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Success highlight animation wrapper
 * Wraps content with a subtle success highlight animation
 * 
 * Validates: Requirements 11.2
 */
export function SuccessHighlight({
  children,
  trigger,
  className = '',
}: {
  children: React.ReactNode;
  trigger: boolean;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (trigger) {
      setKey((prev) => prev + 1);
    }
  }, [trigger]);

  if (!isAnimationEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={key}
      variants={successVariants}
      initial="initial"
      animate={trigger ? 'animate' : 'initial'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Error shake animation wrapper
 * Wraps content with a shake animation for errors
 * 
 * Validates: Requirements 11.3
 */
export function ErrorShake({
  children,
  trigger,
  className = '',
}: {
  children: React.ReactNode;
  trigger: boolean;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (trigger) {
      setKey((prev) => prev + 1);
    }
  }, [trigger]);

  if (!isAnimationEnabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={key}
      variants={errorVariants}
      initial="initial"
      animate={trigger ? 'animate' : 'initial'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Inline success checkmark animation
 * 
 * Validates: Requirements 11.2
 */
export function SuccessCheckmark({ className = '' }: { className?: string }) {
  const { isAnimationEnabled } = useAnimationConfig();

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration: isAnimationEnabled ? 0.3 : 0,
        ease: 'easeOut',
      }}
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white ${className}`}
    >
      <Check className="w-4 h-4" />
    </motion.div>
  );
}

/**
 * Inline error icon animation
 * 
 * Validates: Requirements 11.3
 */
export function ErrorIcon({ className = '' }: { className?: string }) {
  const { isAnimationEnabled } = useAnimationConfig();

  return (
    <motion.div
      variants={errorVariants}
      initial="initial"
      animate="animate"
      className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white ${className}`}
    >
      <X className="w-4 h-4" />
    </motion.div>
  );
}
