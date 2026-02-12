/**
 * Text Typography Types for StoryCore
 * 
 * Provides TypeScript types for text typography animations including:
 * - Animated text components
 * - Text masking effects
 * - Text animation presets
 */

import { CSSProperties } from 'react';

// ============================================================================
// Text Animation Types
// ============================================================================

export type TextAnimationType =
  | 'fadeIn'
  | 'fadeOut'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleIn'
  | 'scaleOut'
  | 'rotateIn'
  | 'blurIn'
  | 'typewriter'
  | 'elastic'
  | 'bounce'
  | 'glitch'
  | 'wave'
  | 'letterByLetter'
  | 'wordByWord';

export type AnimationDirection = 'normal' | 'reverse' | 'alternate';
export type AnimationFillMode = 'none' | 'forwards' | 'backwards' | 'both';
export type AnimationTrigger = 'auto' | 'onMount' | 'onVisible' | 'onClick' | 'onHover' | 'manual';

// ============================================================================
// Text Animation Configuration
// ============================================================================

export interface TextAnimationConfig {
  /** Type of animation */
  type: TextAnimationType;
  /** Animation duration in milliseconds */
  duration: number;
  /** Delay before animation starts in milliseconds */
  delay: number;
  /** Animation easing function */
  easing: EasingType;
  /** Animation direction */
  direction: AnimationDirection;
  /** Fill mode */
  fillMode: AnimationFillMode;
  /** Iteration count (number or 'infinite') */
  iterations: number | 'infinite';
  /** Trigger for the animation */
  trigger: AnimationTrigger;
}

export type EasingType =
  | 'linear'
  | 'ease'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'easeInOutQuart'
  | 'elastic'
  | 'bounce'
  | 'smoothstep'
  | 'smootherstep';

// ============================================================================
// Mask Types
// ============================================================================

export type MaskType =
  | 'reveal'
  | 'conceal'
  | 'slide'
  | 'scale'
  | 'blur'
  | 'pixelate'
  | 'wipe'
  | 'circle'
  | 'wave';

export type MaskDirection = 'left' | 'right' | 'top' | 'bottom' | 'center';
export type MaskShape = 'rectangle' | 'circle' | 'ellipse' | 'custom';

export interface TextMaskConfig {
  /** Type of mask */
  type: MaskType;
  /** Mask shape */
  shape: MaskShape;
  /** Direction of mask movement */
  direction: MaskDirection;
  /** Custom path data for SVG masks */
  customPath?: string;
  /** Gradient colors for mask */
  gradientColors?: [string, string];
  /** Animation progress (0-1) */
  progress: number;
  /** Mask softness/blur amount */
  softness: number;
  /** Pixelation size for pixel mask */
  pixelSize: number;
}

// ============================================================================
// Text Preset Types
// ============================================================================

export interface TextPreset {
  /** Preset name */
  name: string;
  /** Description of the preset */
  description: string;
  /** Preview thumbnail URL */
  thumbnail?: string;
  /** Animation configuration */
  animation: Partial<TextAnimationConfig>;
  /** Mask configuration (optional) */
  mask?: Partial<TextMaskConfig>;
  /** Default text style */
  style?: Partial<CSSProperties>;
  /** Tags for categorization */
  tags: string[];
}

export interface TextPresetCollection {
  /** Collection name */
  name: string;
  /** Description */
  description: string;
  /** Presets in this collection */
  presets: TextPreset[];
}

// ============================================================================
// Text Style Types
// ============================================================================

export interface TextStyle {
  /** Font family */
  fontFamily: string;
  /** Font size in pixels or CSS units */
  fontSize: string | number;
  /** Font weight */
  fontWeight: number | string;
  /** Font style (normal, italic) */
  fontStyle: 'normal' | 'italic';
  /** Text alignment */
  textAlign: 'left' | 'center' | 'right' | 'justify';
  /** Line height */
  lineHeight: string | number;
  /** Letter spacing */
  letterSpacing: string | number;
  /** Text transform */
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  /** Text decoration */
  textDecoration: 'none' | 'underline' | 'overline' | 'line-through';
  /** Text shadow */
  textShadow?: string;
  /** Color */
  color: string;
  /** Background color */
  backgroundColor?: string;
  /** Gradient text */
  backgroundImage?: string;
  /** Webkit background clip */
  WebkitBackgroundClip?: 'text';
  /** Text fill color (for gradient text) */
  WebkitTextFillColor?: string;
}

// ============================================================================
// Typography Service State
// ============================================================================

export interface TextTypographyState {
  /** All registered presets */
  presets: Map<string, TextPreset>;
  /** All registered collections */
  collections: Map<string, TextPresetCollection>;
  /** Currently active animation */
  activeAnimation: string | null;
  /** Animation progress (0-1) */
  animationProgress: number;
  /** Whether animation is complete */
  isComplete: boolean;
  /** Current text being animated */
  currentText: string;
}

// ============================================================================
// Typography Service Actions
// ============================================================================

export interface TextTypographyActions {
  // Preset Management
  registerPreset: (id: string, preset: TextPreset) => void;
  unregisterPreset: (id: string) => void;
  getPreset: (id: string) => TextPreset | undefined;
  getAllPresets: () => TextPreset[];
  
  // Collection Management
  registerCollection: (id: string, collection: TextPresetCollection) => void;
  getCollection: (id: string) => TextPresetCollection | undefined;
  
  // Animation Control
  playAnimation: (text: string, config: TextAnimationConfig) => void;
  pauseAnimation: () => void;
  resumeAnimation: () => void;
  stopAnimation: () => void;
  setAnimationProgress: (progress: number) => void;
  
  // Utility
  getAnimationCSS: (config: TextAnimationConfig, text: string) => string;
  applyPreset: (text: string, presetId: string) => TextStyle & TextAnimationConfig;
}

// ============================================================================
// Animated Text Props
// ============================================================================

export interface AnimatedTextProps {
  /** Text content to animate */
  text: string;
  /** Animation type */
  animation?: TextAnimationType;
  /** Animation configuration overrides */
  animationConfig?: Partial<TextAnimationConfig>;
  /** Mask configuration */
  maskConfig?: Partial<TextMaskConfig>;
  /** Text style overrides */
  style?: React.CSSProperties;
  /** Container class name */
  className?: string;
  /** Container style */
  containerStyle?: React.CSSProperties;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Callback on animation progress update */
  onProgress?: (progress: number) => void;
  /** Whether to loop the animation */
  loop?: boolean;
  /** Delay before starting animation */
  delay?: number;
}

// ============================================================================
// Text Reveal Props
// ============================================================================

export interface TextRevealProps {
  /** Text content */
  text: string;
  /** Reveal direction */
  direction?: MaskDirection;
  /** Reveal type */
  type?: MaskType;
  /** Reveal duration in milliseconds */
  duration?: number;
  /** Custom reveal path for SVG-based reveals */
  revealPath?: string;
  /** Text style */
  style?: React.CSSProperties;
  /** Reveal color */
  revealColor?: string;
  /** Callback when reveal completes */
  onRevealComplete?: () => void;
}

// ============================================================================
// Typewriter Props
// ============================================================================

export interface TypewriterProps {
  /** Text content to type */
  text: string;
  /** Typing speed in milliseconds per character */
  speed?: number;
  /** Cursor character */
  cursor?: string;
  /** Cursor blink speed in milliseconds */
  cursorBlinkSpeed?: number;
  /** Whether to show cursor */
  showCursor?: boolean;
  /** Text style */
  style?: React.CSSProperties;
  /** Callback when typing completes */
  onComplete?: () => void;
  /** Loop the animation */
  loop?: boolean;
  /** Random variation in typing speed */
  variance?: number;
}

// ============================================================================
// Text Wave Props
// ============================================================================

export interface TextWaveProps {
  /** Text content */
  text: string;
  /** Wave amplitude in pixels */
  amplitude?: number;
  /** Wave frequency (number of waves) */
  frequency?: number;
  /** Wave speed in Hz */
  speed?: number;
  /** Text style */
  style?: React.CSSProperties;
  /** Individual letter style */
  letterStyle?: React.CSSProperties;
}

// ============================================================================
// Glitch Text Props
// ============================================================================

export interface GlitchTextProps {
  /** Text content */
  text: string;
  /** Glitch intensity (0-1) */
  intensity?: number;
  /** Glitch duration in milliseconds */
  duration?: number;
  /** Number of glitch layers */
  layers?: number;
  /** Text style */
  style?: React.CSSProperties;
  /** Primary color */
  primaryColor?: string;
  /** Secondary glitch color */
  secondaryColor?: string;
  /** Callback when glitch effect starts */
  onGlitchStart?: () => void;
  /** Callback when glitch effect ends */
  onGlitchEnd?: () => void;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface CharacterData {
  /** The character */
  char: string;
  /** Character index */
  index: number;
  /** Word index */
  wordIndex: number;
  /** Whether this is whitespace */
  isWhitespace: boolean;
  /** Original CSS transform */
  originalTransform: string;
}

export interface WordData {
  /** The word */
  word: string;
  /** Word index */
  index: number;
  /** Start character index */
  startIndex: number;
  /** End character index */
  endIndex: number;
  /** Characters in the word */
  characters: CharacterData[];
}
