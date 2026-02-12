/**
 * Preset Style Extractor
 * 
 * Extracts and converts preset configurations into backend-compatible style parameters
 * Validates Requirement 14.7
 */

import { Preset, CropRegion, Transform } from '@/types/gridEditor';

/**
 * Preset style parameters for backend generation
 */
export interface PresetStyleParams {
  aspectRatio?: string;
  compositionStyle?: string;
  cropStyle?: string;
  transformStyle?: string;
  [key: string]: unknown;
}

/**
 * Analyze crop region to determine crop style
 */
function analyzeCropStyle(crop: CropRegion | null): string {
  if (!crop) {
    return 'none';
  }

  const { x, y, width, height } = crop;

  // Letterbox (horizontal crop)
  if (y > 0.1 && height < 0.8 && x < 0.05 && width > 0.9) {
    return 'letterbox';
  }

  // Pillarbox (vertical crop)
  if (x > 0.1 && width < 0.8 && y < 0.05 && height > 0.9) {
    return 'pillarbox';
  }

  // Centered crop
  if (x > 0.05 && y > 0.05 && width < 0.9 && height < 0.9) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    if (Math.abs(centerX - 0.5) < 0.1 && Math.abs(centerY - 0.5) < 0.1) {
      return 'centered';
    }
  }

  // Dynamic/asymmetric crop
  return 'dynamic';
}

/**
 * Analyze transform to determine transform style
 */
function analyzeTransformStyle(transform: Transform): string {
  const { scale, rotation } = transform;

  // Dramatic (large scale or rotation)
  if (scale.x > 1.15 || scale.y > 1.15 || Math.abs(rotation) > 5) {
    return 'dramatic';
  }

  // Subtle (small scale or rotation)
  if (scale.x !== 1.0 || scale.y !== 1.0 || rotation !== 0) {
    return 'subtle';
  }

  // Stable (no transforms)
  return 'stable';
}

/**
 * Calculate aspect ratio from crop region
 */
function calculateAspectRatio(crop: CropRegion | null): string {
  if (!crop) {
    return '1:1';
  }

  const ratio = crop.width / crop.height;

  // Common aspect ratios
  if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
  if (Math.abs(ratio - 4 / 3) < 0.1) return '4:3';
  if (Math.abs(ratio - 3 / 2) < 0.1) return '3:2';
  if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
  if (Math.abs(ratio - 1) < 0.1) return '1:1';

  // Custom ratio
  return `${crop.width.toFixed(2)}:${crop.height.toFixed(2)}`;
}

/**
 * Determine composition style from preset name and characteristics
 */
function determineCompositionStyle(preset: Preset): string {
  const name = preset.name.toLowerCase();

  if (name.includes('cinematic')) return 'cinematic';
  if (name.includes('comic')) return 'comic';
  if (name.includes('portrait')) return 'portrait';
  if (name.includes('landscape')) return 'landscape';
  if (name.includes('default')) return 'standard';

  // Analyze transforms to infer style
  const hasRotation = preset.panelTransforms.some(t => t.rotation !== 0);
  const hasScale = preset.panelTransforms.some(t => t.scale.x !== 1.0 || t.scale.y !== 1.0);

  if (hasRotation && hasScale) return 'dynamic';
  if (hasScale) return 'dramatic';

  return 'standard';
}

/**
 * Extract style parameters from preset
 * 
 * Analyzes preset configuration and generates backend-compatible style parameters
 * 
 * @param preset - Preset to analyze
 * @returns Style parameters for backend generation
 */
export function extractPresetStyleParams(preset: Preset): PresetStyleParams {
  // Analyze first panel as representative (or average across all panels)
  const firstCrop = preset.panelCrops[0];

  // Calculate average crop style across all panels
  const cropStyles = preset.panelCrops.map(analyzeCropStyle);
  const dominantCropStyle = getMostCommon(cropStyles);

  // Calculate average transform style
  const transformStyles = preset.panelTransforms.map(analyzeTransformStyle);
  const dominantTransformStyle = getMostCommon(transformStyles);

  // Determine composition style
  const compositionStyle = determineCompositionStyle(preset);

  // Calculate aspect ratio
  const aspectRatio = calculateAspectRatio(firstCrop);

  return {
    aspectRatio,
    compositionStyle,
    cropStyle: dominantCropStyle,
    transformStyle: dominantTransformStyle,
    presetName: preset.name,
    presetDescription: preset.description,
  };
}

/**
 * Extract style parameters for a specific panel index
 * 
 * @param preset - Preset to analyze
 * @param panelIndex - Panel index (0-8)
 * @returns Style parameters for specific panel
 */
export function extractPanelStyleParams(
  preset: Preset,
  panelIndex: number
): PresetStyleParams {
  if (panelIndex < 0 || panelIndex >= 9) {
    throw new Error('Panel index must be between 0 and 8');
  }

  const crop = preset.panelCrops[panelIndex];
  const transform = preset.panelTransforms[panelIndex];

  return {
    aspectRatio: calculateAspectRatio(crop),
    compositionStyle: determineCompositionStyle(preset),
    cropStyle: analyzeCropStyle(crop),
    transformStyle: analyzeTransformStyle(transform),
    panelIndex,
    presetName: preset.name,
  };
}

/**
 * Get most common value in array
 */
function getMostCommon<T>(arr: T[]): T {
  const counts = new Map<T, number>();

  for (const item of arr) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  let maxCount = 0;
  let mostCommon = arr[0];

  for (const [item, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = item;
    }
  }

  return mostCommon;
}

/**
 * Create generation config with preset parameters
 * 
 * Helper to create a complete generation config with preset style parameters
 * 
 * @param panelId - Panel ID
 * @param prompt - Generation prompt
 * @param seed - Random seed
 * @param transform - Panel transform
 * @param crop - Panel crop region
 * @param styleReference - Master Coherence Sheet reference
 * @param preset - Preset to apply
 * @param panelIndex - Panel index in grid
 * @returns Complete panel generation config
 */
export function createGenerationConfigWithPreset(
  panelId: string,
  prompt: string,
  seed: number,
  transform: Transform,
  crop: CropRegion | null,
  styleReference: string,
  preset: Preset,
  panelIndex: number
) {
  const presetStyleParams = extractPanelStyleParams(preset, panelIndex);

  return {
    panelId,
    prompt,
    seed,
    transform,
    crop,
    styleReference,
    presetId: preset.id,
    presetName: preset.name,
    presetStyleParams,
  };
}

