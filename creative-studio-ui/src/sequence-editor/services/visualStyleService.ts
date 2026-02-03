/**
 * Visual Style Service
 * 
 * Handles application of visual styles, filters, and artistic renders to shots.
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import type { Asset, Shot, StyleMetadata } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface StyleApplication {
  shotId: string;
  styleId: string;
  styleName: string;
  intensity: number; // 0-100
  parameters: StyleParameters;
  appliedAt: Date;
}

export interface StyleParameters {
  colorPalette?: string[];
  artisticStyle?: string;
  filterType?: string;
  blendMode?: string;
  saturation?: number;
  contrast?: number;
  brightness?: number;
  temperature?: number;
  tint?: number;
  vignette?: number;
  grain?: number;
  sharpness?: number;
}

export interface BatchStyleApplication {
  shotIds: string[];
  styleId: string;
  intensity: number;
  parameters: StyleParameters;
}

// ============================================================================
// Style Application Functions
// ============================================================================

/**
 * Apply a visual style to a shot
 * Requirements: 11.2
 */
export function applyStyleToShot(
  shot: Shot,
  style: Asset,
  intensity: number = 100
): Shot {
  if (style.type !== 'visual-style') {
    throw new Error('Asset must be of type visual-style');
  }

  const styleMetadata = style.metadata.styleMetadata;
  if (!styleMetadata) {
    throw new Error('Style asset missing styleMetadata');
  }

  // Create style parameters from asset metadata
  const parameters: StyleParameters = {
    colorPalette: styleMetadata.colorPalette,
    artisticStyle: styleMetadata.artisticStyle,
    // Apply intensity scaling to numeric parameters
    saturation: scaleParameter(styleMetadata.intensity, intensity),
    contrast: scaleParameter(styleMetadata.intensity, intensity),
    brightness: scaleParameter(styleMetadata.intensity, intensity),
  };

  // Create style application record
  const styleApplication: StyleApplication = {
    shotId: shot.id,
    styleId: style.id,
    styleName: style.name,
    intensity,
    parameters,
    appliedAt: new Date(),
  };

  // Update shot with style application
  return {
    ...shot,
    visualStyle: styleApplication,
    // Mark shot as modified
    modified: true,
  };
}

/**
 * Apply a visual style to multiple shots (batch operation)
 * Requirements: 11.6
 */
export function applyStyleToMultipleShots(
  shots: Shot[],
  style: Asset,
  intensity: number = 100
): Shot[] {
  return shots.map((shot) => applyStyleToShot(shot, style, intensity));
}

/**
 * Remove visual style from a shot
 */
export function removeStyleFromShot(shot: Shot): Shot {
  return {
    ...shot,
    visualStyle: undefined,
    modified: true,
  };
}

/**
 * Update style intensity for a shot
 * Requirements: 11.5
 */
export function updateStyleIntensity(
  shot: Shot,
  intensity: number
): Shot {
  if (!shot.visualStyle) {
    throw new Error('Shot does not have a visual style applied');
  }

  // Clamp intensity to 0-100 range
  const clampedIntensity = Math.max(0, Math.min(100, intensity));

  // Recalculate parameters with new intensity
  const updatedParameters: StyleParameters = {
    ...shot.visualStyle.parameters,
    saturation: scaleParameter(
      shot.visualStyle.parameters.saturation || 0,
      clampedIntensity
    ),
    contrast: scaleParameter(
      shot.visualStyle.parameters.contrast || 0,
      clampedIntensity
    ),
    brightness: scaleParameter(
      shot.visualStyle.parameters.brightness || 0,
      clampedIntensity
    ),
  };

  return {
    ...shot,
    visualStyle: {
      ...shot.visualStyle,
      intensity: clampedIntensity,
      parameters: updatedParameters,
    },
    modified: true,
  };
}

/**
 * Update style parameters for a shot
 */
export function updateStyleParameters(
  shot: Shot,
  parameters: Partial<StyleParameters>
): Shot {
  if (!shot.visualStyle) {
    throw new Error('Shot does not have a visual style applied');
  }

  return {
    ...shot,
    visualStyle: {
      ...shot.visualStyle,
      parameters: {
        ...shot.visualStyle.parameters,
        ...parameters,
      },
    },
    modified: true,
  };
}

/**
 * Check if shots have consistent style parameters
 * Requirements: 11.6
 */
export function haveShotsConsistentStyle(shots: Shot[]): boolean {
  if (shots.length === 0) return true;
  if (shots.length === 1) return true;

  const firstStyle = shots[0].visualStyle;
  if (!firstStyle) return shots.every((shot) => !shot.visualStyle);

  return shots.every((shot) => {
    if (!shot.visualStyle) return false;
    return (
      shot.visualStyle.styleId === firstStyle.styleId &&
      shot.visualStyle.intensity === firstStyle.intensity &&
      JSON.stringify(shot.visualStyle.parameters) ===
        JSON.stringify(firstStyle.parameters)
    );
  });
}

/**
 * Get style preview data for rendering
 * Requirements: 11.3, 11.4
 */
export function getStylePreviewData(style: Asset): {
  thumbnailUrl: string;
  previewUrl?: string;
  description: string;
  colorPalette?: string[];
  artisticStyle?: string;
} {
  if (style.type !== 'visual-style') {
    throw new Error('Asset must be of type visual-style');
  }

  const styleMetadata = style.metadata.styleMetadata;

  return {
    thumbnailUrl: style.thumbnailUrl,
    previewUrl: style.previewUrl,
    description: style.metadata.description,
    colorPalette: styleMetadata?.colorPalette,
    artisticStyle: styleMetadata?.artisticStyle,
  };
}

/**
 * Generate style thumbnail with sample effect
 * Requirements: 11.4
 */
export function generateStyleThumbnail(
  style: Asset,
  sampleImageUrl: string
): Promise<string> {
  // In a real implementation, this would apply the style to the sample image
  // and return a data URL or blob URL of the styled result
  // For now, we return the style's thumbnail
  return Promise.resolve(style.thumbnailUrl);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Scale a parameter value based on intensity (0-100)
 */
function scaleParameter(baseValue: number, intensity: number): number {
  return (baseValue * intensity) / 100;
}

/**
 * Validate style parameters
 */
export function validateStyleParameters(
  parameters: StyleParameters
): boolean {
  // Check that numeric parameters are within valid ranges
  const numericParams = [
    'saturation',
    'contrast',
    'brightness',
    'temperature',
    'tint',
    'vignette',
    'grain',
    'sharpness',
  ] as const;

  for (const param of numericParams) {
    const value = parameters[param];
    if (value !== undefined && (value < 0 || value > 100)) {
      return false;
    }
  }

  return true;
}

/**
 * Create default style parameters
 */
export function createDefaultStyleParameters(): StyleParameters {
  return {
    saturation: 50,
    contrast: 50,
    brightness: 50,
    temperature: 50,
    tint: 50,
    vignette: 0,
    grain: 0,
    sharpness: 50,
  };
}

/**
 * Merge style parameters with defaults
 */
export function mergeStyleParameters(
  parameters: Partial<StyleParameters>
): StyleParameters {
  return {
    ...createDefaultStyleParameters(),
    ...parameters,
  };
}

// ============================================================================
// Export
// ============================================================================

export const visualStyleService = {
  applyStyleToShot,
  applyStyleToMultipleShots,
  removeStyleFromShot,
  updateStyleIntensity,
  updateStyleParameters,
  haveShotsConsistentStyle,
  getStylePreviewData,
  generateStyleThumbnail,
  validateStyleParameters,
  createDefaultStyleParameters,
  mergeStyleParameters,
};

export default visualStyleService;
