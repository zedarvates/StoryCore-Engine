/**
 * AnimationProvider Component
 * 
 * Provides animation configuration context to the entire application.
 * Handles prefers-reduced-motion and allows for global animation control.
 * 
 * Validates: Requirements 11.4, 11.7
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { ANIMATION_DURATIONS } from '../../config/animations';

interface AnimationConfig {
  prefersReducedMotion: boolean;
  durations: typeof ANIMATION_DURATIONS;
  isAnimationEnabled: boolean;
}

const AnimationContext = createContext<AnimationConfig | undefined>(undefined);

interface AnimationProviderProps {
  children: ReactNode;
  disableAnimations?: boolean;
}

/**
 * Provider component for animation configuration
 */
export function AnimationProvider({ 
  children, 
  disableAnimations = false 
}: AnimationProviderProps) {
  const prefersReducedMotion = useReducedMotion();
  
  const config: AnimationConfig = {
    prefersReducedMotion,
    durations: ANIMATION_DURATIONS,
    isAnimationEnabled: !disableAnimations && !prefersReducedMotion,
  };

  return (
    <AnimationContext.Provider value={config}>
      {children}
    </AnimationContext.Provider>
  );
}

/**
 * Hook to access animation configuration
 * 
 * @returns Animation configuration object
 * 
 * @example
 * ```tsx
 * const { isAnimationEnabled, prefersReducedMotion } = useAnimationConfig();
 * 
 * if (!isAnimationEnabled) {
 *   return <div>Static content</div>;
 * }
 * ```
 */
export function useAnimationConfig(): AnimationConfig {
  const context = useContext(AnimationContext);
  
  if (context === undefined) {
    throw new Error('useAnimationConfig must be used within AnimationProvider');
  }
  
  return context;
}

/**
 * HOC to wrap components with animation configuration
 */
export function withAnimation<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function AnimatedComponent(props: P) {
    return (
      <AnimationProvider>
        <Component {...props} />
      </AnimationProvider>
    );
  };
}
