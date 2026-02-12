/**
 * Text Typography Service for StoryCore
 * 
 * Centralized typography engine that provides:
 * - Text animation presets
 * - Easing functions
 * - Animation utilities
 * - Text masking effects
 */

import {
  TextAnimationConfig,
  TextAnimationType,
  TextMaskConfig,
  MaskType,
  MaskDirection,
  TextPreset,
  TextPresetCollection,
  TextTypographyState,
  TextTypographyActions,
  EasingType,
  TextStyle
} from './TextTypographyTypes';

// ============================================================================
// Easing Functions
// ============================================================================

const easingFunctions: Record<EasingType, (t: number) => number> = {
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

// ============================================================================
// Text Typography Service Implementation
// ============================================================================

class TextTypographyService implements TextTypographyActions {
  private state: TextTypographyState;
  private animationFrameId: number | null = null;
  private animationStartTime: number = 0;

  constructor() {
    this.state = {
      presets: new Map(),
      collections: new Map(),
      activeAnimation: null,
      animationProgress: 0,
      isComplete: false,
      currentText: ''
    };

    // Register default presets
    this.registerDefaultPresets();
  }

  // ==========================================================================
  // Preset Management
  // ==========================================================================

  registerPreset(id: string, preset: TextPreset): void {
    this.state.presets.set(id, preset);
  }

  unregisterPreset(id: string): void {
    this.state.presets.delete(id);
  }

  getPreset(id: string): TextPreset | undefined {
    return this.state.presets.get(id);
  }

  getAllPresets(): TextPreset[] {
    return Array.from(this.state.presets.values());
  }

  // ==========================================================================
  // Collection Management
  // ==========================================================================

  registerCollection(id: string, collection: TextPresetCollection): void {
    this.state.collections.set(id, collection);
  }

  getCollection(id: string): TextPresetCollection | undefined {
    return this.state.collections.get(id);
  }

  // ==========================================================================
  // Animation Control
  // ==========================================================================

  playAnimation(text: string, config: TextAnimationConfig): void {
    this.state.currentText = text;
    this.state.activeAnimation = config.type;
    this.state.animationProgress = 0;
    this.state.isComplete = false;
    this.animationStartTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - this.animationStartTime;
      const progress = Math.min(elapsed / config.duration, 1);

      this.state.animationProgress = progress;

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.state.isComplete = true;
        this.state.animationProgress = 1;
      }
    };

    if (config.delay > 0) {
      setTimeout(() => {
        this.animationFrameId = requestAnimationFrame(animate);
      }, config.delay);
    } else {
      this.animationFrameId = requestAnimationFrame(animate);
    }
  }

  pauseAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resumeAnimation(): void {
    if (this.state.activeAnimation && !this.state.isComplete) {
      this.playAnimation(
        this.state.currentText,
        this.getAnimationConfig(this.state.activeAnimation as TextAnimationType)
      );
    }
  }

  stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.state.activeAnimation = null;
    this.state.animationProgress = 0;
    this.state.isComplete = false;
  }

  setAnimationProgress(progress: number): void {
    this.state.animationProgress = Math.max(0, Math.min(1, progress));
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  getAnimationConfig(type: TextAnimationType): TextAnimationConfig {
    const defaults: Record<TextAnimationType, Partial<TextAnimationConfig>> = {
      fadeIn: { duration: 1000, easing: 'easeOut', fillMode: 'forwards' },
      fadeOut: { duration: 1000, easing: 'easeIn', fillMode: 'forwards' },
      slideUp: { duration: 800, easing: 'easeOut', fillMode: 'forwards' },
      slideDown: { duration: 800, easing: 'easeOut', fillMode: 'forwards' },
      slideLeft: { duration: 800, easing: 'easeOut', fillMode: 'forwards' },
      slideRight: { duration: 800, easing: 'easeOut', fillMode: 'forwards' },
      scaleIn: { duration: 600, easing: 'easeOut', fillMode: 'forwards' },
      scaleOut: { duration: 600, easing: 'easeIn', fillMode: 'forwards' },
      rotateIn: { duration: 800, easing: 'easeOut', fillMode: 'forwards' },
      blurIn: { duration: 1000, easing: 'easeOut', fillMode: 'forwards' },
      typewriter: { duration: 2000, easing: 'linear', fillMode: 'forwards' },
      elastic: { duration: 1200, easing: 'elastic', fillMode: 'forwards' },
      bounce: { duration: 1000, easing: 'bounce', fillMode: 'forwards' },
      glitch: { duration: 500, easing: 'linear', fillMode: 'forwards' },
      wave: { duration: 2000, easing: 'easeInOut', fillMode: 'forwards' },
      letterByLetter: { duration: 500, easing: 'easeOut', fillMode: 'forwards' },
      wordByWord: { duration: 800, easing: 'easeOut', fillMode: 'forwards' }
    };

    return {
      type,
      duration: 1000,
      delay: 0,
      easing: 'easeOut',
      direction: 'normal',
      fillMode: 'both',
      iterations: 1,
      trigger: 'auto',
      ...defaults[type]
    };
  }

  getAnimationCSS(config: TextAnimationConfig, text: string): string {
    const { type, duration, easing, delay, direction, fillMode, iterations } = config;
    const easeFn = easingFunctions[easing] || easingFunctions.linear;

    let keyframes = '';
    
    switch (type) {
      case 'fadeIn':
        keyframes = `
          from { opacity: 0; }
          to { opacity: 1; }
        `;
        break;
      case 'fadeOut':
        keyframes = `
          from { opacity: 1; }
          to { opacity: 0; }
        `;
        break;
      case 'slideUp':
        keyframes = `
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        `;
        break;
      case 'slideDown':
        keyframes = `
          from { opacity: 0; transform: translateY(-50px); }
          to { opacity: 1; transform: translateY(0); }
        `;
        break;
      case 'slideLeft':
        keyframes = `
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        `;
        break;
      case 'slideRight':
        keyframes = `
          from { opacity: 0; transform: translateX(-50px); }
          to { opacity: 1; transform: translateX(0); }
        `;
        break;
      case 'scaleIn':
        keyframes = `
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        `;
        break;
      case 'scaleOut':
        keyframes = `
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(1.5); }
        `;
        break;
      case 'blurIn':
        keyframes = `
          from { opacity: 0; filter: blur(10px); }
          to { opacity: 1; filter: blur(0); }
        `;
        break;
      case 'elastic':
        keyframes = `
          from { opacity: 0; transform: scale(0); }
          to { opacity: 1; transform: scale(1); }
        `;
        break;
      case 'bounce':
        keyframes = `
          0% { opacity: 0; transform: translateY(-50px); }
          60% { opacity: 1; transform: translateY(10px); }
          80% { transform: translateY(-5px); }
          100% { transform: translateY(0); }
        `;
        break;
      default:
        keyframes = `
          from { opacity: 0; }
          to { opacity: 1; }
        `;
    }

    return `
      @keyframes ${type}-animation {
        ${keyframes}
      }
      
      .animated-text {
        animation: ${type}-animation ${duration}ms ${easing} ${delay}ms ${iterations} ${direction} ${fillMode};
      }
    `.trim();
  }

  applyPreset(text: string, presetId: string): TextStyle & TextAnimationConfig {
    const preset = this.state.presets.get(presetId);
    if (!preset) {
      throw new Error(`Preset ${presetId} not found`);
    }

    return {
      ...this.getAnimationConfig(preset.animation.type || 'fadeIn'),
      ...preset.style,
      ...preset.animation
    } as TextStyle & TextAnimationConfig;
  }

  // ==========================================================================
  // Default Presets
  // ==========================================================================

  private registerDefaultPresets(): void {
    // Fade Up
    this.registerPreset('fadeUp', {
      name: 'Fade Up',
      description: 'Text fades in while sliding up',
      tags: ['fade', 'slide', 'entrance'],
      animation: {
        type: 'slideUp',
        duration: 800,
        easing: 'easeOut',
        fillMode: 'forwards'
      },
      style: {
        opacity: 0,
        transform: 'translateY(20px)'
      }
    });

    // Scale Reveal
    this.registerPreset('scaleReveal', {
      name: 'Scale Reveal',
      description: 'Text scales in with a subtle bounce',
      tags: ['scale', 'bounce', 'entrance'],
      animation: {
        type: 'scaleIn',
        duration: 600,
        easing: 'easeOut',
        fillMode: 'forwards'
      },
      style: {
        opacity: 0,
        transform: 'scale(0.9)'
      }
    });

    // Blur In
    this.registerPreset('blurIn', {
      name: 'Blur In',
      description: 'Text blurs in from a blurry state',
      tags: ['blur', 'fade', 'entrance'],
      animation: {
        type: 'blurIn',
        duration: 1000,
        easing: 'easeOut',
        fillMode: 'forwards'
      },
      style: {
        opacity: 0,
        filter: 'blur(10px)'
      }
    });

    // Typewriter
    this.registerPreset('typewriter', {
      name: 'Typewriter',
      description: 'Text types out character by character',
      tags: ['typewriter', 'typing', 'text'],
      animation: {
        type: 'typewriter',
        duration: 2000,
        easing: 'linear',
        fillMode: 'forwards'
      },
      style: {
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }
    });

    // Elastic
    this.registerPreset('elastic', {
      name: 'Elastic',
      description: 'Text pops in with an elastic effect',
      tags: ['elastic', 'bounce', 'pop', 'entrance'],
      animation: {
        type: 'elastic',
        duration: 1200,
        easing: 'elastic',
        fillMode: 'forwards'
      },
      style: {
        opacity: 0,
        transform: 'scale(0)'
      }
    });

    // Letter by Letter
    this.registerPreset('letterByLetter', {
      name: 'Letter by Letter',
      description: 'Each letter animates in sequence',
      tags: ['letter', 'stagger', 'sequence'],
      animation: {
        type: 'letterByLetter',
        duration: 500,
        easing: 'easeOut',
        fillMode: 'forwards'
      },
      style: {
        opacity: 0,
        display: 'inline-block'
      }
    });

    // Glitch
    this.registerPreset('glitch', {
      name: 'Glitch',
      description: 'Text with a glitchy cyber effect',
      tags: ['glitch', 'cyber', 'tech', 'effect'],
      animation: {
        type: 'glitch',
        duration: 500,
        easing: 'linear',
        fillMode: 'forwards'
      },
      style: {
        position: 'relative'
      }
    });

    // Wave
    this.registerPreset('wave', {
      name: 'Wave',
      description: 'Text waves like water',
      tags: ['wave', 'animate', 'effect'],
      animation: {
        type: 'wave',
        duration: 2000,
        easing: 'easeInOut',
        fillMode: 'forwards'
      },
      style: {
        display: 'inline-block'
      }
    });

    // Slide Reveal (Word by Word)
    this.registerPreset('slideReveal', {
      name: 'Slide Reveal',
      description: 'Words slide in from the right',
      tags: ['word', 'slide', 'reveal'],
      animation: {
        type: 'wordByWord',
        duration: 800,
        easing: 'easeOut',
        fillMode: 'forwards'
      },
      style: {
        opacity: 0,
        clipPath: 'inset(0 100% 0 0)'
      }
    });

    // Bounce
    this.registerPreset('bounce', {
      name: 'Bounce',
      description: 'Text bounces in from above',
      tags: ['bounce', 'jump', 'entrance'],
      animation: {
        type: 'bounce',
        duration: 1000,
        easing: 'bounce',
        fillMode: 'forwards'
      },
      style: {
        opacity: 0,
        transform: 'translateY(-50px)'
      }
    });
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  getState(): TextTypographyState {
    return { ...this.state, presets: new Map(this.state.presets), collections: new Map(this.state.collections) };
  }

  getAnimationProgress(): number {
    return this.state.animationProgress;
  }

  isAnimationComplete(): boolean {
    return this.state.isComplete;
  }

  getCurrentText(): string {
    return this.state.currentText;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const textTypographyService = new TextTypographyService();

// ============================================================================
// Default Configurations
// ============================================================================

export const defaultTextAnimationConfig: TextAnimationConfig = {
  type: 'fadeIn',
  duration: 1000,
  delay: 0,
  easing: 'easeOut',
  direction: 'normal',
  fillMode: 'forwards',
  iterations: 1,
  trigger: 'auto'
};

export const defaultMaskConfig: TextMaskConfig = {
  type: 'reveal',
  shape: 'rectangle',
  direction: 'left',
  progress: 0,
  softness: 0,
  pixelSize: 4
};

export { easingFunctions };
