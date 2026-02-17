/**
 * Caption Style Types
 * MI2: Caption Styles - Modern, Classic, Dynamic
 */

export type CaptionStyleId =
  | 'modern_clean'
  | 'modern_bold'
  | 'modern_subtle'
  | 'classic_standard'
  | 'classic_cinema'
  | 'classic_subtitle'
  | 'dynamic_wave'
  | 'dynamic_typewriter'
  | 'dynamic_pop'
  | 'dynamic_glitch';

export interface CaptionStyle {
  id: CaptionStyleId;
  name: string;
  description: string;
  category: CaptionCategory;
  font: CaptionFont;
  textAppearance: TextAppearance;
  background: CaptionBackground;
  positioning: CaptionPositioning;
  animations: CaptionAnimation[];
  effects: CaptionEffect[];
  accessibility: AccessibilitySettings;
  preview?: string;
}

export type CaptionCategory =
  | 'modern'
  | 'classic'
  | 'dynamic'
  | 'social'
  | 'broadcast'
  | 'custom';

export interface CaptionFont {
  family: string;
  weight: 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'black';
  style: 'normal' | 'italic';
  size: number;
  sizeUnit: 'px' | 'em' | 'rem' | '%';
  lineHeight: number;
  letterSpacing: number;
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface TextAppearance {
  color: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadow?: TextShadow;
  glow?: TextGlow;
  gradient?: TextGradient;
  outline?: TextOutline;
}

export interface TextShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
}

export interface TextGlow {
  intensity: number;
  radius: number;
  color: string;
}

export interface TextGradient {
  startColor: string;
  endColor: string;
  angle: number;
}

export interface TextOutline {
  color: string;
  width: number;
  position: 'inside' | 'center' | 'outside';
}

export interface CaptionBackground {
  enabled: boolean;
  type: 'solid' | 'gradient' | 'rounded' | 'speech-bubble' | 'karaoke';
  color: string;
  opacity: number;
  cornerRadius?: number;
  padding: number;
  gradient?: {
    startColor: string;
    endColor: string;
    angle: number;
  };
}

export interface CaptionPositioning {
  alignment: 'left' | 'center' | 'right';
  verticalPosition: 'top' | 'center' | 'bottom' | 'custom';
  customYOffset?: number;
  maxWidth?: number;
  margins: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
}

export interface CaptionAnimation {
  id: string;
  type: AnimationType;
  duration: number;
  delay: number;
  easing: string;
  params?: Record<string, unknown>;
}

export type AnimationType =
  | 'fade'
  | 'slide'
  | 'typewriter'
  | 'scale'
  | 'rotate'
  | 'bounce'
  | 'elastic'
  | 'karaoke'
  | 'wave'
  | 'glitch'
  | 'highlight'
  | 'reveal'
  | 'blur'
  | 'zoom';

export interface CaptionEffect {
  id: string;
  type: EffectType;
  intensity: number;
  params?: Record<string, unknown>;
}

export type EffectType =
  | 'blur'
  | 'shake'
  | 'blink'
  | 'pulse'
  | 'rainbow'
  | 'neon'
  | 'metallic'
  | 'emboss'
  | 'neon-glow'
  | 'chromatic-aberration';

export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  forceBackground: boolean;
  minimumSize: boolean;
  colorContrast: number;
}

export interface CaptionStylePreset {
  id: string;
  name: string;
  description: string;
  styleId: CaptionStyleId;
  customizations: Partial<CaptionStyle>;
  createdAt: string;
  updatedAt: string;
  author: string;
  isPublic: boolean;
  tags: string[];
  usageCount: number;
}

export interface CaptionLayer {
  id: string;
  trackId: string;
  styleId: string;
  customStyle?: Partial<CaptionStyle>;
  text: string;
  startTime: number;
  endTime: number;
  speakerId?: string;
  emotion?: string;
  animationOverrides?: CaptionAnimation[];
  effectsOverrides?: CaptionEffect[];
}

export interface CaptionTrack {
  id: string;
  name: string;
  language: string;
  isDefault: boolean;
  layers: CaptionLayer[];
  styleId: string;
  isEnabled: boolean;
  volume: number;
}

export interface CaptionStyleLibrary {
  builtInStyles: CaptionStyle[];
  userStyles: CaptionStylePreset[];
  recentStyles: string[];
  favoriteStyles: string[];
}
