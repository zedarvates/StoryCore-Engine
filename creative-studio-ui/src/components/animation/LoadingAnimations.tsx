/**
 * LoadingAnimations Component
 * 
 * Provides skeleton loaders and spinners for loading states.
 * All loaders respect prefers-reduced-motion preference.
 * 
 * Validates: Requirements 11.6
 */


import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { pulseVariants, ANIMATION_DURATIONS, EASING } from '../../config/animations';
import { useAnimationConfig } from './AnimationProvider';

/**
 * Spinning loader icon
 * 
 * Validates: Requirements 11.6
 */
export function Spinner({
  size = 24,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  if (!isAnimationEnabled) {
    return <Loader2 size={size} className={className} />;
  }

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      }}
      className={className}
    >
      <Loader2 size={size} />
    </motion.div>
  );
}

/**
 * Pulsing dots loader
 * 
 * Validates: Requirements 11.6
 */
export function DotsLoader({ className = '' }: { className?: string }) {
  const { isAnimationEnabled } = useAnimationConfig();

  const dotVariants = {
    animate: (i: number) => ({
      scale: [1, 1.2, 1],
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1,
        repeat: Infinity,
        delay: i * 0.2,
        ease: EASING.easeInOut,
      },
    }),
  };

  if (!isAnimationEnabled) {
    return (
      <div className={`flex gap-1 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-current opacity-50" />
        <div className="w-2 h-2 rounded-full bg-current opacity-50" />
        <div className="w-2 h-2 rounded-full bg-current opacity-50" />
      </div>
    );
  }

  return (
    <div className={`flex gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          custom={i}
          variants={dotVariants}
          animate="animate"
          className="w-2 h-2 rounded-full bg-current"
        />
      ))}
    </div>
  );
}

/**
 * Skeleton loader for text
 * 
 * Validates: Requirements 11.6
 */
export function SkeletonText({
  lines = 1,
  className = '',
}: {
  lines?: number;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  const skeletonClass = 'h-4 bg-gray-200 rounded';

  if (!isAnimationEnabled) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={skeletonClass} />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          variants={pulseVariants}
          animate="animate"
          className={skeletonClass}
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton loader for images/thumbnails
 * 
 * Validates: Requirements 11.6
 */
export function SkeletonImage({
  width = '100%',
  height = '200px',
  className = '',
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  const skeletonClass = 'bg-gray-200 rounded';

  if (!isAnimationEnabled) {
    return (
      <div
        className={`${skeletonClass} ${className}`}
        style={{ width, height }}
      />
    );
  }

  return (
    <motion.div
      variants={pulseVariants}
      animate="animate"
      className={`${skeletonClass} ${className}`}
      style={{ width, height }}
    />
  );
}

/**
 * Skeleton loader for cards
 * 
 * Validates: Requirements 11.6
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 border rounded-lg ${className}`}>
      <SkeletonImage height="150px" className="mb-4" />
      <SkeletonText lines={2} />
    </div>
  );
}

/**
 * Skeleton loader for list items
 * 
 * Validates: Requirements 11.6
 */
export function SkeletonListItem({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 p-3 ${className}`}>
      <SkeletonImage width="40px" height="40px" className="rounded-full" />
      <div className="flex-1">
        <SkeletonText lines={2} />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for table rows
 * 
 * Validates: Requirements 11.6
 */
export function SkeletonTableRow({
  columns = 4,
  className = '',
}: {
  columns?: number;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  return (
    <div className={`flex gap-4 p-3 ${className}`}>
      {Array.from({ length: columns }).map((_, i) => (
        <motion.div
          key={i}
          variants={isAnimationEnabled ? pulseVariants : undefined}
          animate={isAnimationEnabled ? 'animate' : undefined}
          className="h-4 bg-gray-200 rounded flex-1"
        />
      ))}
    </div>
  );
}

/**
 * Loading overlay with spinner
 * 
 * Validates: Requirements 11.6
 */
export function LoadingOverlay({
  message,
  className = '',
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm ${className}`}
    >
      <Spinner size={32} className="text-blue-600" />
      {message && (
        <p className="mt-4 text-sm text-gray-600 font-medium">{message}</p>
      )}
    </div>
  );
}

/**
 * Progress bar with animation
 * 
 * Validates: Requirements 11.6
 */
export function ProgressBar({
  progress,
  className = '',
  showLabel = false,
}: {
  progress: number;
  className?: string;
  showLabel?: boolean;
}) {
  const { isAnimationEnabled } = useAnimationConfig();

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between mb-1 text-sm text-gray-600">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{
            duration: isAnimationEnabled ? ANIMATION_DURATIONS.standard : 0,
            ease: 'easeOut',
          }}
        />
      </div>
    </div>
  );
}

/**
 * Circular progress indicator
 * 
 * Validates: Requirements 11.6
 */
export function CircularProgress({
  progress,
  size = 48,
  strokeWidth = 4,
  className = '',
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const { isAnimationEnabled } = useAnimationConfig();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: isAnimationEnabled ? ANIMATION_DURATIONS.standard : 0,
            ease: 'easeOut',
          }}
          className="text-blue-600"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
        {Math.round(progress)}%
      </span>
    </div>
  );
}
