/**
 * useAnimationOrchestrator Hook
 * 
 * React hook for using the animation orchestrator.
 * Provides a simple API for orchestrating animations in components.
 * 
 * Validates: Requirements 11.8
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  animationOrchestrator,
  createAnimationTask,
  AnimationOrchestrator,
} from '../services/animation/AnimationOrchestrator';

type AnimationPriority = 'low' | 'normal' | 'high' | 'critical';

interface UseAnimationOrchestratorOptions {
  priority?: AnimationPriority;
  canInterrupt?: boolean;
  conflictsWith?: string[];
}

/**
 * Hook to orchestrate animations
 * 
 * Validates: Requirements 11.8
 * 
 * @example
 * ```tsx
 * const { executeAnimation } = useAnimationOrchestrator();
 * 
 * const handleClick = async () => {
 *   await executeAnimation('my-animation', async () => {
 *     // Animation logic
 *   });
 * };
 * ```
 */
export function useAnimationOrchestrator(
  options: UseAnimationOrchestratorOptions = {}
) {
  const orchestratorRef = useRef<AnimationOrchestrator>(animationOrchestrator);
  const activeAnimationsRef = useRef<Set<string>>(new Set());

  /**
   * Execute an animation through the orchestrator
   */
  const executeAnimation = useCallback(
    async (
      id: string,
      execute: () => Promise<void> | void,
      overrideOptions?: UseAnimationOrchestratorOptions
    ) => {
      const finalOptions = { ...options, ...overrideOptions };

      const task = createAnimationTask(id, execute, {
        priority: finalOptions.priority,
        canInterrupt: finalOptions.canInterrupt,
        conflictsWith: finalOptions.conflictsWith,
      });

      activeAnimationsRef.current.add(id);

      try {
        await orchestratorRef.current.execute(task);
      } finally {
        activeAnimationsRef.current.delete(id);
      }
    },
    [options]
  );

  /**
   * Cancel a specific animation
   */
  const cancelAnimation = useCallback(async (id: string) => {
    if (activeAnimationsRef.current.has(id)) {
      // In a real implementation, we'd cancel the specific animation
      // For now, we just remove it from tracking
      activeAnimationsRef.current.delete(id);
    }
  }, []);

  /**
   * Cancel all animations from this component
   */
  const cancelAll = useCallback(async () => {
    const ids = Array.from(activeAnimationsRef.current);
    for (const id of ids) {
      await cancelAnimation(id);
    }
  }, [cancelAnimation]);

  /**
   * Get orchestrator status
   */
  const getStatus = useCallback(() => {
    return orchestratorRef.current.getStatus();
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cancelAll();
    };
  }, [cancelAll]);

  return {
    executeAnimation,
    cancelAnimation,
    cancelAll,
    getStatus,
  };
}

/**
 * Hook for sequential animations
 * Ensures animations run one after another
 * 
 * Validates: Requirements 11.8
 */
export function useSequentialAnimations() {
  const { executeAnimation } = useAnimationOrchestrator({
    priority: 'normal',
    canInterrupt: false,
  });

  const sequenceRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);

  const executeSequence = useCallback(
    async (
      animations: Array<{
        id: string;
        execute: () => Promise<void> | void;
      }>
    ) => {
      sequenceRef.current = animations.map((a) => a.id);
      currentIndexRef.current = 0;

      for (const animation of animations) {
        await executeAnimation(animation.id, animation.execute, {
          conflictsWith: sequenceRef.current.filter(
            (id) => id !== animation.id
          ),
        });
        currentIndexRef.current++;
      }
    },
    [executeAnimation]
  );

  return {
    executeSequence,
    currentIndex: currentIndexRef.current,
    totalAnimations: sequenceRef.current.length,
  };
}

/**
 * Hook for parallel animations with coordination
 * Ensures animations don't conflict visually
 * 
 * Validates: Requirements 11.8
 */
export function useParallelAnimations() {
  const { executeAnimation } = useAnimationOrchestrator({
    priority: 'normal',
  });

  const executeParallel = useCallback(
    async (
      animations: Array<{
        id: string;
        execute: () => Promise<void> | void;
        conflictsWith?: string[];
      }>
    ) => {
      const promises = animations.map((animation) =>
        executeAnimation(animation.id, animation.execute, {
          conflictsWith: animation.conflictsWith,
        })
      );

      await Promise.all(promises);
    },
    [executeAnimation]
  );

  return {
    executeParallel,
  };
}

/**
 * Hook for staggered animations
 * Executes animations with a delay between each
 * 
 * Validates: Requirements 11.8
 */
export function useStaggeredAnimations(delayMs: number = 100) {
  const { executeAnimation } = useAnimationOrchestrator();

  const executeStaggered = useCallback(
    async (
      animations: Array<{
        id: string;
        execute: () => Promise<void> | void;
      }>
    ) => {
      for (let i = 0; i < animations.length; i++) {
        const animation = animations[i];

        // Start animation
        executeAnimation(animation.id, animation.execute);

        // Wait for stagger delay before starting next
        if (i < animations.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    },
    [executeAnimation, delayMs]
  );

  return {
    executeStaggered,
  };
}
