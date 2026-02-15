/**
 * React Hook for Text Typography
 * 
 * Provides a convenient React hook for integrating text typography
 * animations into StoryCore components.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TextAnimationConfig,
  TextAnimationType,
  TextPreset,
  TextTypographyState,
  EasingType
} from '../services/text-typography/TextTypographyTypes';
import {
  textTypographyService,
  defaultTextAnimationConfig
} from '../services/text-typography/TextTypographyService';

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseTextTypographyReturn {
  // State
  state: TextTypographyState;
  presets: TextPreset[];
  animationProgress: number;
  isComplete: boolean;
  
  // Preset Management
  getPreset: (id: string) => TextPreset | undefined;
  applyPreset: (text: string, presetId: string) => { style: React.CSSProperties; config: TextAnimationConfig };
  
  // Animation Control
  playAnimation: (text: string, config?: Partial<TextAnimationConfig>) => void;
  playWithPreset: (text: string, presetId: string) => void;
  pauseAnimation: () => void;
  resumeAnimation: () => void;
  stopAnimation: () => void;
  setAnimationProgress: (progress: number) => void;
  
  // Utility
  getAnimationCSS: (config: TextAnimationConfig) => string;
  getAnimationStyle: (config: TextAnimationConfig, text: string) => React.CSSProperties;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useTextTypography(): UseTextTypographyReturn {
  // State
  const [state, setState] = useState<TextTypographyState>(textTypographyService.getState());
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // ==========================================================================
  // Sync State
  // ==========================================================================

  useEffect(() => {
    const interval = setInterval(() => {
      setState(textTypographyService.getState());
      setAnimationProgress(textTypographyService.getAnimationProgress());
      setIsComplete(textTypographyService.isAnimationComplete());
    }, 50);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Intentionally run only on mount - state sync interval should start once
  }, []);

  // ==========================================================================
  // Preset Management
  // ==========================================================================

  const getPreset = useCallback((id: string) => {
    return textTypographyService.getPreset(id);
  }, []);

  const presets = useMemo(() => {
    return textTypographyService.getAllPresets();
  }, []);

  const applyPreset = useCallback((text: string, presetId: string) => {
    try {
      const result = textTypographyService.applyPreset(text, presetId);
      return {
        style: result as unknown as React.CSSProperties,
        config: result as unknown as TextAnimationConfig
      };
    } catch {
      // Return default if preset not found
      return {
        style: {},
        config: defaultTextAnimationConfig
      };
    }
  }, []);

  // ==========================================================================
  // Animation Control
  // ==========================================================================

  const playAnimation = useCallback((text: string, config?: Partial<TextAnimationConfig>) => {
    const fullConfig: TextAnimationConfig = {
      ...defaultTextAnimationConfig,
      ...config,
      type: config?.type || 'fadeIn'
    };
    textTypographyService.playAnimation(text, fullConfig);
  }, []);

  const playWithPreset = useCallback((text: string, presetId: string) => {
    const preset = textTypographyService.getPreset(presetId);
    if (!preset) return;

    const config: TextAnimationConfig = {
      ...defaultTextAnimationConfig,
      ...preset.animation,
      type: preset.animation.type || 'fadeIn'
    };
    textTypographyService.playAnimation(text, config);
  }, []);

  const pauseAnimation = useCallback(() => {
    textTypographyService.pauseAnimation();
  }, []);

  const resumeAnimation = useCallback(() => {
    textTypographyService.resumeAnimation();
  }, []);

  const stopAnimation = useCallback(() => {
    textTypographyService.stopAnimation();
    setAnimationProgress(0);
    setIsComplete(false);
  }, []);

  const setAnimationProgressCallback = useCallback((progress: number) => {
    textTypographyService.setAnimationProgress(progress);
    setAnimationProgress(progress);
  }, []);

  // ==========================================================================
  // Utility
  // ==========================================================================

  const getAnimationCSS = useCallback((config: TextAnimationConfig) => {
    return textTypographyService.getAnimationCSS(config, '');
  }, []);

  const getAnimationStyle = useCallback((config: TextAnimationConfig, text: string): React.CSSProperties => {
    const progress = animationProgress;
    const easing = getEasingFunction(config.easing);
    const easedProgress = easing(progress);

    const styles: React.CSSProperties = {};

    switch (config.type) {
      case 'fadeIn':
        styles.opacity = easedProgress;
        break;
      case 'fadeOut':
        styles.opacity = 1 - easedProgress;
        break;
      case 'slideUp':
        styles.opacity = easedProgress;
        styles.transform = `translateY(${(1 - easedProgress) * 50}px)`;
        break;
      case 'slideDown':
        styles.opacity = easedProgress;
        styles.transform = `translateY(${(1 - easedProgress) * -50}px)`;
        break;
      case 'slideLeft':
        styles.opacity = easedProgress;
        styles.transform = `translateX(${(1 - easedProgress) * 50}px)`;
        break;
      case 'slideRight':
        styles.opacity = easedProgress;
        styles.transform = `translateX(${(1 - easedProgress) * -50}px)`;
        break;
      case 'scaleIn':
        styles.opacity = easedProgress;
        styles.transform = `scale(${0.5 + easedProgress * 0.5})`;
        break;
      case 'scaleOut':
        styles.opacity = 1 - easedProgress;
        styles.transform = `scale(${1 + easedProgress * 0.5})`;
        break;
      case 'blurIn':
        styles.opacity = easedProgress;
        styles.filter = `blur(${(1 - easedProgress) * 10}px)`;
        break;
      case 'bounce':
        if (progress < 0.6) {
          styles.opacity = progress / 0.6;
          styles.transform = `translateY(${(1 - progress / 0.6) * -50}px)`;
        } else if (progress < 0.8) {
          styles.transform = `translateY(${(progress - 0.6) * 50}px)`;
        } else if (progress < 1) {
          styles.transform = `translateY(${(1 - progress) * -5}px)`;
        } else {
          styles.transform = 'translateY(0)';
        }
        styles.opacity = Math.min(1, progress * 1.67);
        break;
      default:
        styles.opacity = easedProgress;
    }

    if (config.fillMode === 'forwards' && isComplete) {
      // Apply final state
      switch (config.type) {
        case 'slideUp':
        case 'slideDown':
        case 'slideLeft':
        case 'slideRight':
          styles.transform = 'translateX(0) translateY(0)';
          break;
        case 'scaleIn':
          styles.transform = 'scale(1)';
          break;
        case 'scaleOut':
          styles.transform = 'scale(1)';
          styles.opacity = 0;
          break;
        case 'blurIn':
          styles.filter = 'blur(0)';
          break;
      }
    }

    return styles;
  }, [animationProgress, isComplete]);

  // ==========================================================================
  // Return
  // ==========================================================================

  return {
    state,
    presets,
    animationProgress,
    isComplete,
    getPreset,
    applyPreset,
    playAnimation,
    playWithPreset,
    pauseAnimation,
    resumeAnimation,
    stopAnimation,
    setAnimationProgress: setAnimationProgressCallback,
    getAnimationCSS,
    getAnimationStyle
  };
}

// ============================================================================
// Easing Function Helper
// ============================================================================

function getEasingFunction(easing: EasingType): (t: number) => number {
  const functions: Record<EasingType, (t: number) => number> = {
    linear: (t: number) => t,
    ease: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeIn: (t: number) => t * t,
    easeOut: (t: number) => t * (2 - t),
    easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInQuad: (t: number) => t * t,
    easeOutQuad: (t: number) => t * (2 - t),
    easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeInCubic: (t: number) => t * t * t,
    easeOutCubic: (t: number) => (--t) * t * t + 1,
    easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    easeInQuart: (t: number) => t * t * t * t,
    easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
    easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
    elastic: (t: number) => {
      const c4 = (2 * Math.PI) / 3;
      return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
    bounce: (t: number) => {
      const n1 = 7.5625;
      const d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
    smoothstep: (t: number) => t * t * (3 - 2 * t),
    smootherstep: (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  };

  return functions[easing] || functions.linear;
}

// ============================================================================
// Hook for Animated Text
// ============================================================================

export function useAnimatedText(
  text: string,
  animationType: TextAnimationType = 'fadeIn',
  duration: number = 1000
) {
  const {
    animationProgress,
    isComplete,
    playAnimation,
    stopAnimation,
    getAnimationStyle
  } = useTextTypography();

  useEffect(() => {
    playAnimation(text, {
      type: animationType,
      duration
    });
    return stopAnimation;
  }, [text, animationType, duration, playAnimation, stopAnimation]);

  const displayedText = text;
  
  const style = useMemo(() => {
    const config: TextAnimationConfig = {
      type: animationType,
      duration,
      delay: 0,
      easing: 'easeOut',
      direction: 'normal',
      fillMode: 'forwards',
      iterations: 1,
      trigger: 'auto'
    };
    return getAnimationStyle(config, text);
  }, [animationType, duration, text, getAnimationStyle]);

  return {
    displayedText,
    progress: animationProgress,
    isComplete,
    style
  };
}

// ============================================================================
// Default Export
// ============================================================================

export { defaultTextAnimationConfig };
export default useTextTypography;
