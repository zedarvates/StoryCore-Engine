/**
 * useSpring Hook
 * 
 * React hook for spring physics animations.
 * Provides declarative spring animations inspired by React Spring and Remotion.
 * 
 * Validates: Requirements 11.8 - Animation System
 * 
 * @example
 * ```tsx
 * const { value } = useSpring({
 *   from: { opacity: 0, transform: { scale: 0 } },
 *   to: { opacity: 1, transform: { scale: 1 } },
 *   config: Spring.gentle
 * });
 * 
 * return <div style={{ opacity: value.opacity, transform: `scale(${value.transform.scale})` }} />;
 * ```
 */

import { 
  useCallback, 
  useEffect, 
  useMemo, 
  useRef, 
  useState 
} from 'react';
import { 
  SpringConfig, 
  SpringAnimationConfig, 
  AnimationInstance,
  EasingFunction,
  Spring 
} from '../services/animation/AnimationTypes';
import { createSpringAnimation } from '../services/animation/SpringEngine';

/**
 * Animated value type - can be single value or object with nested values
 */
export type AnimatedValue<T> = T extends number 
  ? number 
  : T extends object 
    ? { [K in keyof T]: AnimatedValue<T[K]> }
    : T;

/**
 * Spring animation hook return type
 */
export interface UseSpringReturn<T> {
  value: AnimatedValue<T>;
  isAnimating: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Configuration for single spring value
 */
export interface UseSpringSingleConfig {
  from: number;
  to: number;
  config?: Partial<SpringConfig>;
  delay?: number;
  loop?: boolean | number;
  direction?: 'normal' | 'reverse' | 'alternate';
  immediate?: boolean;
}

/**
 * Configuration for object spring values
 */
export interface UseSpringObjectConfig<T extends object> {
  from: T;
  to: T;
  config?: SpringConfig | { [K in keyof T]?: Partial<SpringConfig> };
  delay?: number | { [K in keyof T]?: number };
  loop?: boolean | number;
  direction?: 'normal' | 'reverse' | 'alternate';
  immediate?: boolean;
}

/**
 * Hook for single value spring animation
 */
export function useSpring(
  config: UseSpringSingleConfig
): UseSpringReturn<number> {
  const [value, setValue] = useState(config.from);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<AnimationInstance<number> | null>(null);
  const currentFromRef = useRef(config.from);
  const currentToRef = useRef(config.to);

  // Create animation instance
  const createAnimation = useCallback((from: number, to: number) => {
    return createSpringAnimation({
      id: `spring-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from,
      to,
      config: config.config as Partial<SpringConfig>,
      delay: config.delay,
      loop: config.loop,
      direction: config.direction,
      duration: undefined // Spring animations don't use fixed duration
    });
  }, [config.config, config.delay, config.loop, config.direction]);

  // Start animation
  const start = useCallback(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }

    const animation = createAnimation(currentFromRef.current, currentToRef.current);
    animationRef.current = animation;

    animation.onUpdate = (newValue: number) => {
      setValue(newValue);
    };

    animation.onComplete = () => {
      setIsAnimating(false);
    };

    setIsAnimating(true);
    animation.start();
  }, [createAnimation]);

  // Stop animation
  const stop = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    setIsAnimating(false);
  }, []);

  // Reset animation
  const reset = useCallback(() => {
    stop();
    setValue(config.from);
    currentFromRef.current = config.from;
    currentToRef.current = config.to;
  }, [config.from, config.to, stop]);

  // Effect to handle immediate animations
  useEffect(() => {
    if (config.immediate) {
      setValue(config.to);
      currentFromRef.current = config.to;
      currentToRef.current = config.to;
    }
  }, [config.to, config.immediate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  return {
    value: value as number,
    isAnimating,
    start,
    stop,
    reset
  };
}

/**
 * Hook for object value spring animations
 */
export function useSpringObject<T extends object>(
  config: UseSpringObjectConfig<T>
): UseSpringReturn<T> {
  const [values, setValues] = useState<T>(config.from);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRefs = useRef<Map<keyof T, AnimationInstance<number>>>(new Map());
  const currentFromRef = useRef<T>(config.from);
  const currentToRef = useRef<T>(config.to);

  // Get config for a specific key
  const getConfigForKey = useCallback((key: keyof T): Partial<SpringConfig> => {
    if (!config.config) return {};
    if (config.config instanceof Object && !(config.config as SpringConfig).mass) {
      // config is object with per-key configs
      return (config.config as { [K in keyof T]?: Partial<SpringConfig> })[key] || {};
    }
    // config is a single SpringConfig
    return config.config as Partial<SpringConfig>;
  }, [config.config]);

  // Get delay for a specific key
  const getDelayForKey = useCallback((key: keyof T): number | undefined => {
    if (!config.delay) return undefined;
    if (typeof config.delay === 'number') return config.delay;
    return config.delay[key];
  }, [config.delay]);

  // Create animation for a specific key
  const createAnimationForKey = useCallback((key: keyof T, from: number, to: number) => {
    return createSpringAnimation({
      id: `spring-${String(key)}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from,
      to,
      config: getConfigForKey(key),
      delay: getDelayForKey(key),
      loop: config.loop,
      direction: config.direction
    });
  }, [getConfigForKey, getDelayForKey, config.loop, config.direction]);

  // Start animation for all keys
  const start = useCallback(() => {
    // Stop any existing animations
    animationRefs.current.forEach(anim => anim.stop());
    animationRefs.current.clear();

    const keys = Object.keys(config.to) as (keyof T)[];
    let completedCount = 0;
    const totalCount = keys.length;

    keys.forEach((key) => {
      const fromValue = currentFromRef.current[key] as number;
      const toValue = currentToRef.current[key] as number;

      const animation = createAnimationForKey(key, fromValue, toValue);
      animationRefs.current.set(key, animation);

      animation.onUpdate = (newValue: number) => {
        setValues(prev => ({
          ...prev,
          [key]: newValue
        }));
      };

      animation.onComplete = () => {
        completedCount++;
        if (completedCount === totalCount) {
          setIsAnimating(false);
        }
      };

      setIsAnimating(true);
      animation.start();
    });
  }, [config.to, createAnimationForKey]);

  // Stop all animations
  const stop = useCallback(() => {
    animationRefs.current.forEach(anim => anim.stop());
    animationRefs.current.clear();
    setIsAnimating(false);
  }, []);

  // Reset to initial values
  const reset = useCallback(() => {
    stop();
    setValues(config.from);
    currentFromRef.current = config.from;
    currentToRef.current = config.to;
  }, [config.from, config.to, stop]);

  // Effect to handle immediate animations
  useEffect(() => {
    if (config.immediate) {
      setValues(config.to);
      currentFromRef.current = config.to;
      currentToRef.current = config.to;
    }
  }, [config.to, config.immediate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      animationRefs.current.forEach(anim => anim.stop());
    };
  }, []);

  return {
    value: values,
    isAnimating,
    start,
    stop,
    reset
  };
}

/**
 * Trail animation - stagger animations for multiple children
 */
export function useSpringTrail<T>(
  items: T[],
  config: {
    from: T extends object ? { [K in keyof T]: number } : number;
    to: T extends object ? { [K in keyof T]: number } : number;
    config?: Partial<SpringConfig>;
    delay?: number;
    stagger?: number;
  }
): {
  values: Array<T extends object ? { [K in keyof T]: number } : number>;
  starts: (() => void)[];
  stops: (() => void)[];
} {
  const [values, setValues] = useState<Array<T extends object ? { [K in keyof T]: number } : number>>(
    items.map(() => config.from as any)
  );
  
  const animationRefs = useRef<Map<number, AnimationInstance<number>>>(new Map());
  const startsRef = useRef<Array<() => void>>([]);
  const stopsRef = useRef<Array<() => void>>([]);

  // Create animations for each item
  useMemo(() => {
    startsRef.current = [];
    stopsRef.current = [];

    items.forEach((_, index) => {
      const from = config.from as any;
      const to = config.to as any;
      const delay = (config.delay || 0) + (config.stagger || 0) * index;

      const animation = createSpringAnimation({
        id: `trail-${index}-${Date.now()}`,
        from: typeof from === 'number' ? from : Object.values(from)[0] as number,
        to: typeof to === 'number' ? to : Object.values(to)[0] as number,
        config: config.config,
        delay
      });

      animationRefs.current.set(index, animation);

      startsRef.current.push(() => {
        animation.onUpdate = (newValue: number) => {
          setValues(prev => {
            const newValues = [...prev];
            if (typeof config.from === 'object' && config.from !== null) {
              const keys = Object.keys(config.from) as (keyof typeof config.from)[];
              newValues[index] = { ...newValues[index], [keys[0]]: newValue } as any;
            } else {
              newValues[index] = newValue as any;
            }
            return newValues;
          });
        };

        animation.start();
      });

      stopsRef.current.push(() => {
        animation.stop();
      });
    });
  }, [items.length]);

  return {
    values,
    starts: startsRef.current,
    stops: stopsRef.current
  };
}

/**
 * Transition - animate elements entering/exiting
 */
export interface UseSpringTransitionConfig<T> {
  items: T[];
  keys: (item: T) => string;
  from?: { [K in keyof T]?: number } | number;
  enter?: { [K in keyof T]?: number } | number;
  leave?: { [K in keyof T]?: number } | number;
  config?: Partial<SpringConfig>;
  stagger?: number;
}

export function useSpringTransition<T>(config: UseSpringTransitionConfig<T>) {
  const [mountedItems, setMountedItems] = useState<Map<string, T>>(new Map());
  
  // Add items
  const add = useCallback((item: T) => {
    setMountedItems(prev => new Map(prev).set(config.keys(item), item));
  }, [config.keys]);

  // Remove items
  const remove = useCallback((key: string) => {
    setMountedItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  return {
    mountedItems: Array.from(mountedItems.entries()).map(([key, item]) => ({
      key,
      item,
      add: () => add(item),
      remove: () => remove(key)
    }))
  };
}

export { Spring };
