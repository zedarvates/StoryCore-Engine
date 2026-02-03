/**
 * Video Effects Utility
 * 
 * Handles video effects and processing tools including speed control,
 * stabilization, color grading, blend modes, and resolution management.
 * 
 * Requirements: 9.1, 11.1, 9.2, 3.7, 3.6
 */

import type { Shot, Layer, EffectsLayerData } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface SpeedControlData {
  speed: number; // 0.1 to 10.0
  timeRemapping?: TimeRemappingCurve;
}

export interface TimeRemappingCurve {
  points: TimeRemappingPoint[];
  interpolation: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface TimeRemappingPoint {
  inputTime: number; // Frame number in original
  outputTime: number; // Frame number in output
}

export interface StabilizationData {
  enabled: boolean;
  strength: number; // 0 to 100
  smoothness: number; // 0 to 100
  cropRatio: number; // 0 to 1 (percentage of frame to crop)
  method: 'automatic' | 'manual';
}

export interface ColorGradingData {
  lut?: string; // Path to LUT file
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  brightness: number; // -100 to 100
  colorWheels: {
    shadows: ColorWheel;
    midtones: ColorWheel;
    highlights: ColorWheel;
  };
  curves?: ColorCurves;
  preset?: string;
}

export interface ColorWheel {
  hue: number; // 0 to 360
  saturation: number; // 0 to 100
  luminance: number; // -100 to 100
}

export interface ColorCurves {
  master: CurvePoints[];
  red: CurvePoints[];
  green: CurvePoints[];
  blue: CurvePoints[];
}

export interface CurvePoints {
  x: number; // 0 to 1
  y: number; // 0 to 1
}

export interface BlendModeData {
  mode: BlendMode;
  opacity: number; // 0 to 1
}

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface MaskData {
  type: 'rectangle' | 'ellipse' | 'polygon' | 'bezier';
  points: { x: number; y: number }[];
  feather: number; // 0 to 100
  invert: boolean;
  opacity: number; // 0 to 1
}

export interface ChromaKeyData {
  enabled: boolean;
  keyColor: string; // Hex color
  tolerance: number; // 0 to 100
  softness: number; // 0 to 100
  spillSuppression: number; // 0 to 100
}

export interface ResolutionData {
  width: number;
  height: number;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '21:9' | 'custom';
  scaleMode: 'fit' | 'fill' | 'stretch' | 'crop';
  safeAreas: {
    action: boolean; // 90% safe area
    title: boolean; // 80% safe area
  };
}

export interface PreviewQualityData {
  quality: 'high' | 'medium' | 'low' | 'proxy';
  adaptiveQuality: boolean;
  proxyScale: number; // 0.25, 0.5, 0.75
}

// ============================================================================
// Speed Control (10A.1)
// ============================================================================

/**
 * Apply speed adjustment to shot
 */
export function applySpeedControl(
  shotId: string,
  speed: number,
  shots: Shot[]
): { shotId: string; newDuration: number; effectLayer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  // Clamp speed to valid range
  const clampedSpeed = Math.max(0.1, Math.min(10.0, speed));
  
  // Calculate new duration based on speed
  const newDuration = Math.round(shot.duration / clampedSpeed);
  
  // Create speed effect layer
  const effectLayer: Layer = {
    id: `speed-${Date.now()}`,
    type: 'effects',
    startTime: 0,
    duration: newDuration,
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      effectType: 'speed',
      parameters: {
        speed: clampedSpeed,
      } as SpeedControlData,
    } as EffectsLayerData,
  };
  
  return {
    shotId,
    newDuration,
    effectLayer,
  };
}

/**
 * Create time remapping curve for variable speed
 */
export function createTimeRemappingCurve(
  points: TimeRemappingPoint[],
  interpolation: TimeRemappingCurve['interpolation'] = 'ease-in-out'
): TimeRemappingCurve {
  // Sort points by input time
  const sortedPoints = [...points].sort((a, b) => a.inputTime - b.inputTime);
  
  return {
    points: sortedPoints,
    interpolation,
  };
}

/**
 * Apply time remapping to shot
 */
export function applyTimeRemapping(
  shotId: string,
  curve: TimeRemappingCurve,
  shots: Shot[]
): { shotId: string; effectLayer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const effectLayer: Layer = {
    id: `time-remap-${Date.now()}`,
    type: 'effects',
    startTime: 0,
    duration: shot.duration,
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      effectType: 'time-remapping',
      parameters: {
        timeRemapping: curve,
      } as SpeedControlData,
    } as EffectsLayerData,
  };
  
  return {
    shotId,
    effectLayer,
  };
}

// ============================================================================
// Video Stabilization (10A.2)
// ============================================================================

/**
 * Apply video stabilization to shot
 */
export function applyStabilization(
  shotId: string,
  stabilizationData: StabilizationData,
  shots: Shot[]
): { shotId: string; effectLayer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const effectLayer: Layer = {
    id: `stabilization-${Date.now()}`,
    type: 'effects',
    startTime: 0,
    duration: shot.duration,
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      effectType: 'stabilization',
      parameters: stabilizationData,
    } as EffectsLayerData,
  };
  
  return {
    shotId,
    effectLayer,
  };
}

/**
 * Analyze shot for stabilization (returns recommended settings)
 */
export function analyzeStabilization(
  shot: Shot
): StabilizationData {
  // In a real implementation, this would analyze the video
  // For now, return default recommended settings
  return {
    enabled: true,
    strength: 75,
    smoothness: 50,
    cropRatio: 0.1, // 10% crop
    method: 'automatic',
  };
}

// ============================================================================
// Color Grading (10A.3)
// ============================================================================

/**
 * Apply color grading to shot
 */
export function applyColorGrading(
  shotId: string,
  colorGradingData: ColorGradingData,
  shots: Shot[]
): { shotId: string; effectLayer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const effectLayer: Layer = {
    id: `color-grading-${Date.now()}`,
    type: 'effects',
    startTime: 0,
    duration: shot.duration,
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      effectType: 'color-grading',
      parameters: colorGradingData,
    } as EffectsLayerData,
  };
  
  return {
    shotId,
    effectLayer,
  };
}

/**
 * Create default color grading preset
 */
export function createColorGradingPreset(
  presetName: string
): ColorGradingData {
  const presets: Record<string, ColorGradingData> = {
    'cinematic': {
      contrast: 20,
      saturation: -10,
      brightness: -5,
      colorWheels: {
        shadows: { hue: 200, saturation: 20, luminance: -10 },
        midtones: { hue: 0, saturation: 0, luminance: 0 },
        highlights: { hue: 30, saturation: 10, luminance: 5 },
      },
      preset: 'cinematic',
    },
    'vibrant': {
      contrast: 15,
      saturation: 30,
      brightness: 5,
      colorWheels: {
        shadows: { hue: 0, saturation: 0, luminance: 0 },
        midtones: { hue: 0, saturation: 20, luminance: 0 },
        highlights: { hue: 0, saturation: 10, luminance: 10 },
      },
      preset: 'vibrant',
    },
    'vintage': {
      contrast: -10,
      saturation: -20,
      brightness: 10,
      colorWheels: {
        shadows: { hue: 30, saturation: 15, luminance: 5 },
        midtones: { hue: 40, saturation: 10, luminance: 0 },
        highlights: { hue: 50, saturation: 5, luminance: 15 },
      },
      preset: 'vintage',
    },
    'neutral': {
      contrast: 0,
      saturation: 0,
      brightness: 0,
      colorWheels: {
        shadows: { hue: 0, saturation: 0, luminance: 0 },
        midtones: { hue: 0, saturation: 0, luminance: 0 },
        highlights: { hue: 0, saturation: 0, luminance: 0 },
      },
      preset: 'neutral',
    },
  };
  
  return presets[presetName] || presets['neutral'];
}

// ============================================================================
// Blend Modes and Compositing (10A.4)
// ============================================================================

/**
 * Apply blend mode to layer
 */
export function applyBlendMode(
  layerId: string,
  blendMode: BlendMode,
  opacity: number,
  shot: Shot
): Layer | null {
  const layer = shot.layers.find((l) => l.id === layerId);
  if (!layer) return null;
  
  return {
    ...layer,
    blendMode,
    opacity: Math.max(0, Math.min(1, opacity)),
  };
}

/**
 * Add mask to layer
 */
export function addMask(
  shotId: string,
  layerId: string,
  maskData: MaskData,
  shots: Shot[]
): { shotId: string; layerId: string; mask: MaskData } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const layer = shot.layers.find((l) => l.id === layerId);
  if (!layer) return null;
  
  return {
    shotId,
    layerId,
    mask: maskData,
  };
}

/**
 * Apply chroma key (green screen) effect
 */
export function applyChromaKey(
  shotId: string,
  chromaKeyData: ChromaKeyData,
  shots: Shot[]
): { shotId: string; effectLayer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const effectLayer: Layer = {
    id: `chroma-key-${Date.now()}`,
    type: 'effects',
    startTime: 0,
    duration: shot.duration,
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      effectType: 'chroma-key',
      parameters: chromaKeyData,
    } as EffectsLayerData,
  };
  
  return {
    shotId,
    effectLayer,
  };
}

// ============================================================================
// Resolution and Aspect Ratio (10A.5)
// ============================================================================

/**
 * Apply resolution and aspect ratio settings
 */
export function applyResolutionSettings(
  resolutionData: ResolutionData
): ResolutionData {
  // Calculate dimensions based on aspect ratio
  const aspectRatios: Record<string, { width: number; height: number }> = {
    '16:9': { width: 1920, height: 1080 },
    '9:16': { width: 1080, height: 1920 },
    '1:1': { width: 1080, height: 1080 },
    '4:3': { width: 1440, height: 1080 },
    '21:9': { width: 2560, height: 1080 },
  };
  
  if (resolutionData.aspectRatio !== 'custom') {
    const dimensions = aspectRatios[resolutionData.aspectRatio];
    return {
      ...resolutionData,
      width: dimensions.width,
      height: dimensions.height,
    };
  }
  
  return resolutionData;
}

/**
 * Get safe area guides for resolution
 */
export function getSafeAreaGuides(
  width: number,
  height: number,
  safeAreas: ResolutionData['safeAreas']
): { action: { x: number; y: number; width: number; height: number }; title: { x: number; y: number; width: number; height: number } } {
  const actionSafe = 0.9; // 90%
  const titleSafe = 0.8; // 80%
  
  return {
    action: {
      x: width * (1 - actionSafe) / 2,
      y: height * (1 - actionSafe) / 2,
      width: width * actionSafe,
      height: height * actionSafe,
    },
    title: {
      x: width * (1 - titleSafe) / 2,
      y: height * (1 - titleSafe) / 2,
      width: width * titleSafe,
      height: height * titleSafe,
    },
  };
}

// ============================================================================
// Preview Quality (10A.6)
// ============================================================================

/**
 * Apply preview quality settings
 */
export function applyPreviewQuality(
  qualityData: PreviewQualityData
): PreviewQualityData {
  // Set proxy scale based on quality
  const proxyScales: Record<PreviewQualityData['quality'], number> = {
    high: 1.0,
    medium: 0.75,
    low: 0.5,
    proxy: 0.25,
  };
  
  return {
    ...qualityData,
    proxyScale: proxyScales[qualityData.quality],
  };
}

/**
 * Determine adaptive quality based on playback state
 */
export function getAdaptiveQuality(
  isPlaying: boolean,
  currentQuality: PreviewQualityData['quality']
): PreviewQualityData['quality'] {
  if (!isPlaying) {
    return 'high'; // Full quality when paused
  }
  
  // Reduce quality during playback
  const qualityMap: Record<PreviewQualityData['quality'], PreviewQualityData['quality']> = {
    high: 'medium',
    medium: 'low',
    low: 'proxy',
    proxy: 'proxy',
  };
  
  return qualityMap[currentQuality];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all effects layers for a shot
 */
export function getEffectsLayers(shot: Shot): Layer[] {
  return shot.layers.filter((layer) => layer.type === 'effects');
}

/**
 * Remove effect layer from shot
 */
export function removeEffectLayer(
  shotId: string,
  layerId: string,
  shots: Shot[]
): Shot | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  return {
    ...shot,
    layers: shot.layers.filter((layer) => layer.id !== layerId),
  };
}

/**
 * Update effect parameters
 */
export function updateEffectParameters(
  layerId: string,
  parameters: any,
  shot: Shot
): Layer | null {
  const layer = shot.layers.find((l) => l.id === layerId && l.type === 'effects');
  if (!layer) return null;
  
  const effectData = layer.data as EffectsLayerData;
  
  return {
    ...layer,
    data: {
      ...effectData,
      parameters: {
        ...effectData.parameters,
        ...parameters,
      },
    },
  };
}
