/**
 * useKeyframes Hook
 * 
 * React hook for keyframe-based animations.
 * Provides declarative keyframe animations inspired by Remotion's animation patterns.
 * 
 * Validates: Requirements 11.8 - Animation System
 * 
 * @example
 * ```tsx
 * const { value } = useKeyframes({
 *   from: { opacity: 0, transform: { scale: 0 } },
 *   keyframes: [
 *     { time: 0, value: { opacity: 0.5, scale: 0.5 } },
 *     { time: 0.5, value: { opacity: 1, scale: 1 }, easing: Easing.easeOutBounce },
 *     { time: 1, value: { opacity: 0, scale: 1.5 } }
 *   ],
 *   duration: 1000,
 *   loop: true
 * });
 * ```
 */

import { 
  useCallback, 
  useEffect, 
  useRef, 
  useState 
} from 'react';
import { 
  Keyframe, 
  KeyframeAnimationConfig, 
  AnimationInstance,
  EasingFunction,
  Easing 
} from '../services/animation/AnimationTypes';

/**
 * Keyframe animation hook return type
 */
export interface UseKeyframesReturn<T> {
  value: T;
  progress: number;
  isAnimating: boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (progress: number) => void;
  reset: () => void;
}

/**
 * Interpolate between two values with easing
 */
function interpolateValue(
  from: number,
  to: number,
  progress: number,
  easing?: EasingFunction
): number {
  const easedProgress = easing ? easing(progress) : progress;
  return from + (to - from) * easedProgress;
}

/**
 * Parse keyframe time values (handle both 0-1 percentages and absolute times)
 */
function parseKeyframes<T>(
  keyframes: Array<Keyframe<T>>,
  duration: number,
  fromValue: T extends number ? number : never,
  toValue: T extends number ? number : never
): Array<{ time: number; value: number; easing?: EasingFunction }> {
  return keyframes.map((kf, index) => {
    let time: number;
    
    if (kf.time >= 0 && kf.time <= 1) {
      // Percentage-based time
      time = kf.time * duration;
    } else {
      // Absolute time
      time = kf.time;
    }
    
    // Get value
    const value = typeof kf.value === 'number' ? kf.value : 
      kf.value as unknown as number;
    
    return {
      time,
      value,
      easing: kf.easing
    };
  }).sort((a, b) => a.time - b.time);
}

/**
 * Hook for single value keyframe animation
 */
export function useKeyframes(
  config: {
    from: number;
    to: number;
    keyframes: Array<Keyframe<number>>;
    duration: number;
    easing?: EasingFunction;
    delay?: number;
    loop?: boolean | number;
    direction?: 'normal' | 'reverse' | 'alternate';
    immediate?: boolean;
  }
): UseKeyframesReturn<number> {
  const [value, setValue] = useState(config.from);
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<{
    startTime: number;
    pausedAt: number;
    isPaused: boolean;
    loopCount: number;
    direction: 'normal' | 'reverse';
  } | null>(null);
  const rafRef = useRef<number | null>(null);

  // Parse keyframes
  const parsedKeyframes = useRef(parseKeyframes(config.keyframes, config.duration, config.from, config.to));
  const totalDuration = config.duration;

  // Calculate value at a given progress (0-1)
  const calculateValue = useCallback((prog: number): number => {
    const keyframes = parsedKeyframes.current;
    
    if (keyframes.length === 0) {
      return interpolateValue(config.from, config.to, prog, config.easing);
    }

    // Add start and end keyframes if not present
    const allKeyframes = [
      { time: 0, value: config.from, easing: undefined as EasingFunction | undefined },
      ...keyframes,
      { time: totalDuration, value: config.to, easing: undefined as EasingFunction | undefined }
    ];

    // Find the current keyframe segment
    let startKf = allKeyframes[0];
    let endKf = allKeyframes[1];

    for (let i = 1; i < allKeyframes.length; i++) {
      if (prog * totalDuration >= allKeyframes[i].time) {
        startKf = allKeyframes[i - 1];
        endKf = allKeyframes[i];
      }
    }

    // Calculate progress within this segment
    const segmentDuration = endKf.time - startKf.time;
    const segmentProgress = segmentDuration > 0 
      ? (prog * totalDuration - startKf.time) / segmentDuration 
      : 0;

    return interpolateValue(startKf.value, endKf.value, segmentProgress, endKf.easing || config.easing);
  }, [config.from, config.to, config.easing]);

  // Animation loop
  const animate = useCallback(() => {
    if (!animationRef.current) return;

    const { startTime, isPaused, loopCount, direction } = animationRef.current;

    if (isPaused) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const now = performance.now();
    const elapsed = now - startTime;
    const totalElapsed = elapsed;

    // Calculate progress
    let prog: number;
    let currentLoop = Math.floor(totalElapsed / totalDuration);
    const loopProgress = (totalElapsed % totalDuration) / totalDuration;

    if (config.loop && typeof config.loop === 'number' && currentLoop >= config.loop) {
      // Animation complete
      setProgress(1);
      setValue(config.direction === 'reverse' ? config.from : config.to);
      setIsAnimating(false);
      return;
    }

    if (config.direction === 'alternate' && currentLoop % 2 === 1) {
      prog = 1 - loopProgress;
    } else if (config.direction === 'reverse') {
      prog = 1 - loopProgress;
    } else {
      prog = loopProgress;
    }

    const clampedProgress = Math.min(Math.max(prog, 0), 1);
    const newValue = calculateValue(clampedProgress);

    setProgress(clampedProgress);
    setValue(newValue);

    rafRef.current = requestAnimationFrame(animate);
  }, [config.from, config.to, config.loop, config.direction, totalDuration, calculateValue]);

  // Play animation
  const play = useCallback(() => {
    if (isAnimating) return;

    const now = performance.now();
    animationRef.current = {
      startTime: now - (progress * totalDuration),
      pausedAt: 0,
      isPaused: false,
      loopCount: 0,
      direction: config.direction === 'reverse' ? 'reverse' : 'normal'
    };

    setIsAnimating(true);
    rafRef.current = requestAnimationFrame(animate);
  }, [isAnimating, progress, totalDuration, config.direction, animate]);

  // Pause animation
  const pause = useCallback(() => {
    if (!animationRef.current) return;
    
    animationRef.current.isPaused = true;
    animationRef.current.pausedAt = progress * totalDuration;
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  }, [progress, totalDuration]);

  // Stop animation
  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    animationRef.current = null;
    setIsAnimating(false);
    setProgress(0);
    setValue(config.from);
  }, [config.from]);

  // Seek to a specific progress
  const seek = useCallback((newProgress: number) => {
    const clampedProgress = Math.min(Math.max(newProgress, 0), 1);
    const newValue = calculateValue(clampedProgress);

    setProgress(clampedProgress);
    setValue(newValue);
  }, [calculateValue]);

  // Reset animation
  const reset = useCallback(() => {
    stop();
  }, [stop]);

  // Effect to handle immediate animations
  useEffect(() => {
    if (config.immediate) {
      setValue(config.to);
      setProgress(1);
    }
  }, [config.to, config.immediate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    value,
    progress,
    isAnimating,
    play,
    pause,
    stop,
    seek,
    reset
  };
}

/**
 * Hook for object value keyframe animations
 */
export function useKeyframesObject<T extends object>(
  config: {
    from: T;
    to: T;
    keyframes: Array<Keyframe<T>>;
    duration: number;
    easing?: EasingFunction;
    delay?: number | { [K in keyof T]?: number };
    loop?: boolean | number;
    direction?: 'normal' | 'reverse' | 'alternate';
    immediate?: boolean;
  }
): UseKeyframesReturn<T> {
  const [values, setValues] = useState<T>(config.from);
  const [progress, setProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<{
    startTime: number;
    pausedAt: number;
    isPaused: boolean;
    direction: 'normal' | 'reverse';
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const totalDuration = config.duration;

  // Parse keyframes for each property
  const parsedKeyframes = useRef<Map<keyof T, Array<{ time: number; value: number; easing?: EasingFunction }>>>(
    new Map()
  );

  // Initialize keyframes for each property
  useEffect(() => {
    const keys = Object.keys(config.from) as (keyof T)[];
    
    keys.forEach(key => {
      const keyframesForKey: Array<Keyframe<number>> = [];
      
      config.keyframes.forEach(kf => {
        if (typeof kf.value === 'object' && kf.value !== null) {
          const objValue = kf.value as unknown as { [K in keyof T]: number };
          if (key in objValue) {
            keyframesForKey.push({
              time: kf.time,
              value: objValue[key],
              easing: kf.easing
            });
          }
        }
      });

      parsedKeyframes.current.set(
        key, 
        parseKeyframes(keyframesForKey, totalDuration, config.from[key] as number, config.to[key] as number)
      );
    });
  }, [config.from, config.to, config.keyframes, totalDuration]);

  // Calculate value for a single property
  const calculatePropertyValue = useCallback((
    key: keyof T,
    prog: number,
    fromVal: number,
    toVal: number,
    easing?: EasingFunction
  ): number => {
    const keyframes = parsedKeyframes.current.get(key);
    
    if (!keyframes || keyframes.length === 0) {
      return interpolateValue(fromVal, toVal, prog, easing);
    }

    const allKeyframes = [
      { time: 0, value: fromVal, easing: undefined as EasingFunction | undefined },
      ...keyframes,
      { time: totalDuration, value: toVal, easing: undefined as EasingFunction | undefined }
    ];

    let startKf = allKeyframes[0];
    let endKf = allKeyframes[1];

    for (let i = 1; i < allKeyframes.length; i++) {
      if (prog * totalDuration >= allKeyframes[i].time) {
        startKf = allKeyframes[i - 1];
        endKf = allKeyframes[i];
      }
    }

    const segmentDuration = endKf.time - startKf.time;
    const segmentProgress = segmentDuration > 0 
      ? (prog * totalDuration - startKf.time) / segmentDuration 
      : 0;

    return interpolateValue(startKf.value, endKf.value, segmentProgress, endKf.easing || easing);
  }, [totalDuration]);

  // Animation loop
  const animate = useCallback(() => {
    if (!animationRef.current) return;

    const { startTime, isPaused, direction } = animationRef.current;

    if (isPaused) {
      rafRef.current = requestAnimationFrame(animate);
      return;
    }

    const now = performance.now();
    const elapsed = now - startTime;
    const loopProgress = (elapsed % totalDuration) / totalDuration;

    let prog: number;
    if (direction === 'reverse' || (config.direction === 'reverse' && !config.loop)) {
      prog = 1 - loopProgress;
    } else {
      prog = loopProgress;
    }

    const clampedProgress = Math.min(Math.max(prog, 0), 1);
    const keys = Object.keys(config.from) as (keyof T)[];

    const newValues = {} as T;
    keys.forEach(key => {
      newValues[key] = calculatePropertyValue(
        key,
        clampedProgress,
        config.from[key] as number,
        config.to[key] as number,
        config.easing
      ) as T[keyof T];
    });

    setValues(newValues);
    setProgress(clampedProgress);

    rafRef.current = requestAnimationFrame(animate);
  }, [config.from, config.to, config.direction, config.easing, totalDuration, calculatePropertyValue]);

  // Play
  const play = useCallback(() => {
    if (isAnimating) return;

    const now = performance.now();
    animationRef.current = {
      startTime: now - (progress * totalDuration),
      pausedAt: 0,
      isPaused: false,
      direction: config.direction === 'reverse' ? 'reverse' : 'normal'
    };

    setIsAnimating(true);
    rafRef.current = requestAnimationFrame(animate);
  }, [isAnimating, progress, totalDuration, config.direction, animate]);

  // Pause
  const pause = useCallback(() => {
    if (!animationRef.current) return;
    
    animationRef.current.isPaused = true;
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  }, []);

  // Stop
  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    animationRef.current = null;
    setIsAnimating(false);
    setProgress(0);
    setValues(config.from);
  }, [config.from]);

  // Seek
  const seek = useCallback((newProgress: number) => {
    const clampedProgress = Math.min(Math.max(newProgress, 0), 1);
    const keys = Object.keys(config.from) as (keyof T)[];

    const newValues = {} as T;
    keys.forEach(key => {
      newValues[key] = calculatePropertyValue(
        key,
        clampedProgress,
        config.from[key] as number,
        config.to[key] as number,
        config.easing
      ) as T[keyof T];
    });

    setValues(newValues);
    setProgress(clampedProgress);
  }, [config.from, config.to, config.easing, calculatePropertyValue]);

  // Reset
  const reset = useCallback(() => {
    stop();
  }, [stop]);

  // Effect to handle immediate animations
  useEffect(() => {
    if (config.immediate) {
      setValues(config.to);
      setProgress(1);
    }
  }, [config.to, config.immediate]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return {
    value: values,
    progress,
    isAnimating,
    play,
    pause,
    stop,
    seek,
    reset
  };
}

/**
 * Staggered keyframe animation for lists
 */
export function useKeyframesStagger<T>(
  items: T[],
  config: {
    from: T extends object ? { [K in keyof T]: number } : number;
    to: T extends object ? { [K in keyof T]: number } : number;
    keyframes?: Array<Keyframe<T extends object ? { [K in keyof T]: number } : number>>;
    duration: number;
    stagger: number;
    easing?: EasingFunction;
    loop?: boolean | number;
  }
): {
  values: Array<T extends object ? { [K in keyof T]: number } : number>;
  play: () => void;
  stop: () => void;
} {
  const [values, setValues] = useState<Array<T extends object ? { [K in keyof T]: number } : number>>(
    items.map(() => config.from as any)
  );
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Calculate value for item at index
  const calculateValue = useCallback((index: number, progress: number): unknown => {
    const fromVal = config.from as any;
    const toVal = config.to as any;

    // Apply stagger delay
    const staggerDelay = index * config.stagger;
    const adjustedDuration = config.duration - staggerDelay;
    
    if (progress < 0) {
      return fromVal;
    }

    const itemProgress = adjustedDuration > 0 
      ? Math.min(Math.max((progress - staggerDelay) / adjustedDuration, 0), 1)
      : 1;

    if (typeof fromVal === 'number') {
      return interpolateValue(fromVal, toVal, itemProgress, config.easing);
    }

    const result = {} as any;
    Object.keys(fromVal).forEach(key => {
      result[key] = interpolateValue(
        fromVal[key] as number,
        toVal[key] as number,
        itemProgress,
        config.easing
      );
    });

    return result;
  }, [config.from, config.to, config.duration, config.stagger, config.easing]);

  // Animation loop
  const animate = useCallback(() => {
    if (!startTimeRef.current) {
      startTimeRef.current = performance.now();
    }

    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    const progress = elapsed / config.duration;

    if (progress <= 1) {
      const newValues = items.map((_, index) => calculateValue(index, progress * config.duration));
      setValues(newValues as any);
      rafRef.current = requestAnimationFrame(animate);
    } else if (config.loop) {
      startTimeRef.current = null;
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [items.length, config.duration, config.loop, calculateValue]);

  // Play
  const play = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    startTimeRef.current = null;
    rafRef.current = requestAnimationFrame(animate);
  }, [animate]);

  // Stop
  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startTimeRef.current = null;
    setValues(items.map(() => config.from as any));
  }, [items.length, config.from]);

  return {
    values,
    play,
    stop
  };
}

export { Easing };

