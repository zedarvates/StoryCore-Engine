/**
 * Color Correction Preset Types
 * MI1: Color Correction Presets - Vintage, Noir, Vibrant, Cinematic
 */

export type ColorCorrectionPresetId = string;

export interface ColorCorrectionPreset {
  id: ColorCorrectionPresetId;
  name: string;
  description: string;
  thumbnail?: string;
  category: PresetCategory;
  adjustments: ColorAdjustments;
  lut?: LUTConfig;
  mood?: string;
  tags: string[];
}

export type PresetCategory =
  | 'vintage'
  | 'noir'
  | 'vibrant'
  | 'cinematic'
  | 'film'
  | 'artistic'
  | 'correction'
  | 'custom';

export interface ColorAdjustments {
  // Primary Corrections (LGG)
  lift: [number, number, number];
  gamma: [number, number, number];
  gain: [number, number, number];
  offset: [number, number, number];
  
  // Basic Adjustments
  exposure: number;
  contrast: number;
  pivot: number;
  saturation: number;
  vibrance: number;
  temperature: number;
  tint: number;
  
  // Secondary / Details
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  clarity: number;
  fade: number;
  grain: number;
  
  // Complex Corrections
  vignette: VignetteSettings;
  colorBalance: ColorBalance;
  hsl: HSLAdjustment[];
  qualifier: HSLQualifierSettings;
  curves: ColorCurves;
}

export interface HSLQualifierSettings {
  enabled: boolean;
  hue: { center: number; width: number; softness: number };
  saturation: { low: number; high: number; softLow: number; softHigh: number };
  luminance: { low: number; high: number; softLow: number; softHigh: number };
  softness: number;
  showMatte: boolean;
}

export interface ColorCurves {
  rgb: CurvePoint[][]; // [r, g, b, luma]
  hueVsHue: CurvePoint[];
  hueVsSat: CurvePoint[];
  hueVsLum: CurvePoint[];
  lumVsSat: CurvePoint[];
}

export interface CurvePoint {
  x: number;
  y: number;
}

export interface ColorBalance {
  shadows: [number, number, number];
  midtones: [number, number, number];
  highlights: [number, number, number];
}

export interface HSLAdjustment {
  hue: number;
  saturation: number;
  luminance: number;
  colorRange: 'red' | 'orange' | 'yellow' | 'green' | 'aqua' | 'blue' | 'purple' | 'magenta' | 'all';
}

export interface VignetteSettings {
  intensity: number;
  midpoint: number;
  roundness: number;
  feather: number;
  color: string;
}

export interface LUTConfig {
  type: '3d' | '1d' | 'cube';
  url?: string;
  size?: number;
  strength: number;
}

export interface ColorCorrectionLayer {
  id: string;
  name: string;
  isEnabled: boolean;
  blendMode: BlendMode;
  opacity: number;
  presetId?: ColorCorrectionPresetId;
  adjustments: ColorAdjustments;
  mask?: ColorCorrectionMask;
  order: number;
}

export interface ColorCorrectionMask {
  type: 'luminance' | 'alpha' | 'color';
  invert: boolean;
  feather: number;
  url?: string;
}

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'hard-light'
  | 'color-dodge'
  | 'color-burn'
  | 'luminosity'
  | 'saturation'
  | 'color'
  | 'hue';

export interface ColorGradingState {
  activePresets: ColorCorrectionLayer[];
  globalAdjustment: ColorAdjustments;
  beforeCorrection: boolean;
  afterCorrection: boolean;
  isEnabled: boolean;
}

export interface ColorCorrectionSettings {
  enableHDR: boolean;
  bitDepth: 8 | 10 | 12 | 16;
  colorSpace: ColorSpace;
  gamma: number;
  gamutMapping: 'perceptual' | 'relative' | 'absolute' | 'saturation';
}

export type ColorSpace =
  | 'sRGB'
  | 'Rec.709'
  | 'Rec.2020'
  | 'P3'
  | 'ACES'
  | 'ACEScc'
  | 'ACEScg'
  | 'ProPhoto RGB';

export interface ColorCorrectionPresetLibrary {
  presets: ColorCorrectionPreset[];
  customPresets: ColorCorrectionPreset[];
  recentlyUsed: string[];
  favorites: string[];
}
