/**
 * useTransition Hook
 * React hook for managing component transitions with GPU acceleration
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TransitionConfig,
  TransitionState,
  TransitionMetrics,
  TransitionPreset,
  TransitionEngine,
  WebGLRenderer,
  FadeTransitionConfig,
  SlideTransitionConfig,
  ZoomTransitionConfig,
  WipeTransitionConfig,
  GlitchTransitionConfig,
  GPUMode,
  PerformanceTier,
  TransitionCategory,
} from '../services/transitions';

// ============================================
// Easing Functions
// ============================================

const easingFunctions: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  bezier: (t) => t, // Custom bezier applied separately
  elastic: (t) => {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  },
  bounce: (t) => {
    let n1 = 7.5625;
    let d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// ============================================
// Default Configurations
// ============================================

const DEFAULT_FADE_CONFIG: FadeTransitionConfig = {
  type: 'fade',
  duration: 500,
  easing: 'easeInOut',
  gpuMode: 'auto',
  performanceTier: 'high',
  fadeType: 'cross',
};

const DEFAULT_SLIDE_CONFIG: SlideTransitionConfig = {
  type: 'slide',
  duration: 400,
  easing: 'easeOut',
  gpuMode: 'auto',
  performanceTier: 'high',
  direction: 'left',
  overlap: 0.2,
};

const DEFAULT_ZOOM_CONFIG: ZoomTransitionConfig = {
  type: 'zoom',
  duration: 500,
  easing: 'easeInOut',
  gpuMode: 'auto',
  performanceTier: 'high',
  zoomType: 'in',
  intensity: 1.5,
};

// ============================================
// Hook Return Type
// ============================================

export interface UseTransitionReturn {
  // State
  state: TransitionState;
  progress: number;
  isActive: boolean;
  isComplete: boolean;
  
  // Control methods
  start: (config?: Partial<TransitionConfig>) => void;
  cancel: () => void;
  reset: () => void;
  
  // Preset methods
  applyPreset: (presetId: string) => void;
  getPreset: (presetId: string) => TransitionPreset | undefined;
  getPresets: () => TransitionPreset[];
  getPresetsByCategory: (category: TransitionCategory) => TransitionPreset[];
  
  // Metrics
  metrics: TransitionMetrics | null;
  
  // Engine reference
  engine: TransitionEngine | null;
}

// ============================================
// Main Hook
// ============================================

export function useTransition(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  initialConfig?: Partial<TransitionConfig>
): UseTransitionReturn {
  const engineRef = useRef<TransitionEngine | null>(null);
  const [state, setState] = useState<TransitionState>({
    progress: 0,
    phase: 'idle',
    elapsed: 0,
    remaining: 0,
    isActive: false,
    currentFrame: 0,
    fps: 60,
  });
  const [metrics, setMetrics] = useState<TransitionMetrics | null>(null);

  // Initialize engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    engineRef.current = new TransitionEngine(canvas, {
      width: canvas.width,
      height: canvas.height,
    });

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [canvasRef]);

  // State updater
  const updateState = useCallback((newState: Partial<TransitionState>) => {
    setState((prev) => ({ ...prev, ...newState }));
  }, []);

  // Start transition
  const start = useCallback((config?: Partial<TransitionConfig>) => {
    if (!engineRef.current) return;

    const engine = engineRef.current;
    const mergedConfig = { ...initialConfig, ...config } as TransitionConfig;

    // Prepare and start
    engine.prepare(mergedConfig);
    engine.start();

    // Poll for state updates
    const pollInterval = setInterval(() => {
      const currentState = engine.getState();
      updateState({
        progress: currentState.progress,
        phase: currentState.phase,
        elapsed: currentState.elapsed,
        remaining: currentState.remaining,
        isActive: currentState.isActive,
        currentFrame: currentState.currentFrame,
        fps: currentState.fps,
      });

      if (currentState.phase === 'complete' || !currentState.isActive) {
        clearInterval(pollInterval);
        if (currentState.phase === 'complete') {
          setMetrics(engine.getMetrics());
        }
      }
    }, 16); // ~60fps polling

    // Store interval for cleanup
    (engine as any)._pollInterval = pollInterval;
  }, [initialConfig, updateState]);

  // Cancel transition
  const cancel = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.cancel();
    
    const pollInterval = (engineRef.current as any)._pollInterval;
    if (pollInterval) {
      clearInterval(pollInterval);
    }
    
    updateState({
      progress: 0,
      phase: 'idle',
      isActive: false,
    });
  }, [updateState]);

  // Reset transition
  const reset = useCallback(() => {
    cancel();
    updateState({
      progress: 0,
      elapsed: 0,
      remaining: 0,
      currentFrame: 0,
    });
    setMetrics(null);
  }, [cancel, updateState]);

  // Apply preset
  const applyPreset = useCallback((presetId: string) => {
    if (!engineRef.current) return;
    
    const preset = engineRef.current.getPreset(presetId);
    if (preset) {
      start(preset.defaultConfig);
    }
  }, [start]);

  // Get preset
  const getPreset = useCallback((presetId: string) => {
    if (!engineRef.current) return undefined;
    return engineRef.current.getPreset(presetId);
  }, []);

  // Get all presets
  const getPresets = useCallback(() => {
    if (!engineRef.current) return [];
    return engineRef.current.getAllPresets();
  }, []);

  // Get presets by category
  const getPresetsByCategory = useCallback((category: TransitionCategory) => {
    if (!engineRef.current) return [];
    return engineRef.current.getPresetsByCategory(category);
  }, []);

  // Derived state
  const progress = state.progress;
  const isActive = state.isActive;
  const isComplete = state.phase === 'complete';

  return {
    state,
    progress,
    isActive,
    isComplete,
    start,
    cancel,
    reset,
    applyPreset,
    getPreset,
    getPresets,
    getPresetsByCategory,
    metrics,
    engine: engineRef.current,
  };
}

// ============================================
// Convenience Hooks
// ============================================

export function useFadeTransition(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options?: Partial<FadeTransitionConfig>
): UseTransitionReturn {
  const defaultConfig = useMemo(() => ({ ...DEFAULT_FADE_CONFIG, ...options }), [options]);
  return useTransition(canvasRef, defaultConfig);
}

export function useSlideTransition(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options?: Partial<SlideTransitionConfig>
): UseTransitionReturn {
  const defaultConfig = useMemo(() => ({ ...DEFAULT_SLIDE_CONFIG, ...options }), [options]);
  return useTransition(canvasRef, defaultConfig);
}

export function useZoomTransition(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  options?: Partial<ZoomTransitionConfig>
): UseTransitionReturn {
  const defaultConfig = useMemo(() => ({ ...DEFAULT_ZOOM_CONFIG, ...options }), [options]);
  return useTransition(canvasRef, defaultConfig);
}

// ============================================
// CSS Transition Helper
// ============================================

export interface CSSTransitionOptions {
  duration: number;
  easing?: string;
  delay?: number;
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

export function useCSSTransition(
  elementRef: React.RefObject<HTMLElement | null>,
  options?: CSSTransitionOptions
) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const transitionTimeoutRef = useRef<number | null>(null);

  const applyTransition = useCallback((fromClass: string, toClass: string) => {
    if (!elementRef.current) return;

    const element = elementRef.current;
    element.classList.add(fromClass);

    // Force reflow
    void element.offsetWidth;

    // Start transition
    element.classList.remove(fromClass);
    element.classList.add(toClass);
    setIsTransitioning(true);

    // Clean up after transition
    const duration = options?.duration || 300;
    const delay = options?.delay || 0;

    transitionTimeoutRef.current = window.setTimeout(() => {
      element.classList.remove(toClass);
      setIsTransitioning(false);
    }, duration + delay);
  }, [elementRef, options?.duration, options?.delay]);

  const fadeOut = useCallback(() => {
    setIsVisible(false);
    applyTransition('transition-fade-in', 'transition-fade-out');
  }, [applyTransition]);

  const fadeIn = useCallback(() => {
    setIsVisible(true);
    applyTransition('transition-fade-out', 'transition-fade-in');
  }, [applyTransition]);

  const slideLeft = useCallback(() => {
    applyTransition('transition-slide-enter', 'transition-slide-exit');
  }, [applyTransition]);

  const slideRight = useCallback(() => {
    applyTransition('transition-slide-enter-right', 'transition-slide-exit-right');
  }, [applyTransition]);

  const zoomIn = useCallback(() => {
    applyTransition('transition-zoom-enter', 'transition-zoom-exit');
  }, [applyTransition]);

  const zoomOut = useCallback(() => {
    applyTransition('transition-zoom-enter-out', 'transition-zoom-exit-out');
  }, [applyTransition]);

  const cleanup = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isTransitioning,
    isVisible,
    fadeOut,
    fadeIn,
    slideLeft,
    slideRight,
    zoomIn,
    zoomOut,
    cleanup,
  };
}

// ============================================
// Animation Frame Helper
// ============================================

export function useTransitionAnimation(
  callback: (progress: number) => void,
  duration: number,
  easing: string = 'easeInOut'
) {
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easingFunctions[easing]?.(progress) || progress;

    callback(easedProgress);

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [callback, duration, easing]);

  const start = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    startTimeRef.current = null;
    animationRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const cancel = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const reset = useCallback(() => {
    cancel();
    callback(0);
  }, [cancel, callback]);

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return { start, cancel, reset };
}

// ============================================
// CSS Classes (to be added to global styles)
// ============================================

export const TRANSITION_CSS_CLASSES = `
  .transition-fade-in {
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  }
  .transition-fade-out {
    opacity: 1;
    transition: opacity 0.3s ease-in-out;
  }
  .transition-slide-exit {
    transform: translateX(0);
    transition: transform 0.4s ease-out;
  }
  .transition-slide-enter {
    transform: translateX(100%);
    transition: transform 0.4s ease-out;
  }
  .transition-slide-exit-right {
    transform: translateX(0);
    transition: transform 0.4s ease-out;
  }
  .transition-slide-enter-right {
    transform: translateX(-100%);
    transition: transform 0.4s ease-out;
  }
  .transition-zoom-exit {
    transform: scale(1);
    opacity: 1;
    transition: all 0.5s ease-in-out;
  }
  .transition-zoom-enter {
    transform: scale(0.5);
    opacity: 0;
    transition: all 0.5s ease-in-out;
  }
  .transition-zoom-exit-out {
    transform: scale(1);
    opacity: 1;
    transition: all 0.5s ease-in-out;
  }
  .transition-zoom-enter-out {
    transform: scale(2);
    opacity: 0;
    transition: all 0.5s ease-in-out;
  }
`;
