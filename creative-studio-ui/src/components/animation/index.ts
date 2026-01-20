/**
 * Animation Components Index
 * 
 * Central export point for all animation-related components and utilities.
 */

// Provider and configuration
export {
  AnimationProvider,
  useAnimationConfig,
  withAnimation,
} from './AnimationProvider';

// Feedback animations
export {
  AnimatedFeedback,
  SuccessHighlight,
  ErrorShake,
  SuccessCheckmark,
  ErrorIcon,
} from './AnimatedFeedback';

// State transitions
export {
  StateTransition,
  ContentSwitcher,
  StaggeredList,
  CollapseTransition,
} from './StateTransition';

// Hover animations
export {
  HoverScale,
  HoverLift,
  HoverBrightness,
  HoverGlow,
  HoverUnderline,
  InteractiveButton,
  HoverCard,
  HoverIconButton,
} from './HoverAnimations';

// Loading animations
export {
  Spinner,
  DotsLoader,
  SkeletonText,
  SkeletonImage,
  SkeletonCard,
  SkeletonListItem,
  SkeletonTableRow,
  LoadingOverlay,
  ProgressBar,
  CircularProgress,
} from './LoadingAnimations';

// Accessible animations
export {
  AccessibleAnimation,
  withAccessibleAnimation,
  useAccessibleAnimationProps,
  ReducedMotionIndicator,
  ReducedMotionDemo,
} from './AccessibleAnimation';

// Types
export type { FeedbackType } from './AnimatedFeedback';
export type { TransitionType } from './StateTransition';
