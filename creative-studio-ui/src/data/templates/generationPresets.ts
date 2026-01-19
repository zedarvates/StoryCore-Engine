/**
 * Built-in Generation Presets for ComfyUI
 * Pre-configured parameter sets for different quality and style requirements
 */

import { GenerationPreset, ComfyUIParameters } from '../../types';

// ============================================================================
// Quality Presets
// ============================================================================

export const QUALITY_PRESETS: GenerationPreset[] = [
  {
    id: 'quality-maximum',
    name: 'Maximum Quality',
    description: 'Highest quality generation with maximum detail and fidelity. Best for final renders and professional content.',
    category: 'quality',
    isBuiltIn: true,
    parameters: {
      width: 1920,
      height: 1080,
      seed: undefined, // Random seed
      steps: 50,
      cfgScale: 12,
      sampler: 'DPM++ 2M Karras',
      scheduler: 'karras',
      denoisingStrength: 1.0,
    },
    estimatedTime: 180, // 3 minutes
    qualityScore: 10,
  },

  {
    id: 'quality-high',
    name: 'High Quality',
    description: 'Excellent quality with good detail balance. Suitable for most professional productions.',
    category: 'quality',
    isBuiltIn: true,
    parameters: {
      width: 1920,
      height: 1080,
      seed: undefined,
      steps: 30,
      cfgScale: 10,
      sampler: 'DPM++ 2M Karras',
      scheduler: 'karras',
      denoisingStrength: 1.0,
    },
    estimatedTime: 90, // 1.5 minutes
    qualityScore: 8,
  },

  {
    id: 'quality-balanced',
    name: 'Balanced Quality',
    description: 'Good quality with reasonable generation time. Perfect balance for iterative workflows.',
    category: 'quality',
    isBuiltIn: true,
    parameters: {
      width: 1920,
      height: 1080,
      seed: undefined,
      steps: 20,
      cfgScale: 8,
      sampler: 'Euler a',
      scheduler: 'normal',
      denoisingStrength: 1.0,
    },
    estimatedTime: 45, // 45 seconds
    qualityScore: 7,
  },

  // ============================================================================
  // Speed Presets
  // ============================================================================

  {
    id: 'speed-fast',
    name: 'Fast Draft',
    description: 'Quick generation for rapid iteration and testing. Lower quality but very fast.',
    category: 'speed',
    isBuiltIn: true,
    parameters: {
      width: 1280,
      height: 720,
      seed: undefined,
      steps: 10,
      cfgScale: 6,
      sampler: 'Euler',
      scheduler: 'normal',
      denoisingStrength: 1.0,
    },
    estimatedTime: 15, // 15 seconds
    qualityScore: 4,
  },

  {
    id: 'speed-express',
    name: 'Express Mode',
    description: 'Ultra-fast generation for quick previews and concept validation.',
    category: 'speed',
    isBuiltIn: true,
    parameters: {
      width: 1024,
      height: 576,
      seed: undefined,
      steps: 8,
      cfgScale: 5,
      sampler: 'Euler',
      scheduler: 'normal',
      denoisingStrength: 1.0,
    },
    estimatedTime: 8, // 8 seconds
    qualityScore: 3,
  },

  // ============================================================================
  // Style Presets
  // ============================================================================

  {
    id: 'style-cinematic',
    name: 'Cinematic',
    description: 'Film-quality generation with cinematic lighting and composition. Inspired by Hollywood blockbusters.',
    category: 'style',
    isBuiltIn: true,
    parameters: {
      width: 1920,
      height: 1080,
      seed: undefined,
      steps: 25,
      cfgScale: 9,
      sampler: 'DPM++ SDE Karras',
      scheduler: 'karras',
      denoisingStrength: 1.0,
    },
    estimatedTime: 75, // 1.25 minutes
    qualityScore: 8,
  },

  {
    id: 'style-animated',
    name: 'Animated Style',
    description: 'Stylized generation optimized for animation and cartoon aesthetics.',
    category: 'style',
    isBuiltIn: true,
    parameters: {
      width: 1920,
      height: 1080,
      seed: undefined,
      steps: 20,
      cfgScale: 11,
      sampler: 'DPM++ 2M Karras',
      scheduler: 'karras',
      denoisingStrength: 1.0,
    },
    estimatedTime: 60, // 1 minute
    qualityScore: 7,
  },

  {
    id: 'style-realistic',
    name: 'Photorealistic',
    description: 'Maximum realism with photorealistic quality and natural lighting.',
    category: 'style',
    isBuiltIn: true,
    parameters: {
      width: 1920,
      height: 1080,
      seed: undefined,
      steps: 35,
      cfgScale: 11,
      sampler: 'DPM++ 3M SDE Karras',
      scheduler: 'karras',
      denoisingStrength: 1.0,
    },
    estimatedTime: 120, // 2 minutes
    qualityScore: 9,
  },

  {
    id: 'style-concept-art',
    name: 'Concept Art',
    description: 'Artistic and stylized generation perfect for concept art and illustrations.',
    category: 'style',
    isBuiltIn: true,
    parameters: {
      width: 1536,
      height: 1024,
      seed: undefined,
      steps: 30,
      cfgScale: 12,
      sampler: 'DPM++ 2S a Karras',
      scheduler: 'karras',
      denoisingStrength: 1.0,
    },
    estimatedTime: 85, // 1.5 minutes
    qualityScore: 8,
  },

  // ============================================================================
  // Specialized Presets
  // ============================================================================

  {
    id: 'special-upscale',
    name: 'Upscale Ready',
    description: 'Optimized for upscaling workflows. Generate at lower resolution then upscale.',
    category: 'quality',
    isBuiltIn: true,
    parameters: {
      width: 1024,
      height: 576,
      seed: undefined,
      steps: 15,
      cfgScale: 7,
      sampler: 'Euler a',
      scheduler: 'normal',
      denoisingStrength: 1.0,
    },
    estimatedTime: 20, // 20 seconds
    qualityScore: 5,
  },

  {
    id: 'special-consistent',
    name: 'Character Consistency',
    description: 'Optimized for maintaining character consistency across multiple shots.',
    category: 'style',
    isBuiltIn: true,
    parameters: {
      width: 1920,
      height: 1080,
      seed: undefined, // Will be set externally for consistency
      steps: 25,
      cfgScale: 13,
      sampler: 'DPM++ 2M Karras',
      scheduler: 'karras',
      denoisingStrength: 0.8, // Slight denoising for consistency
    },
    estimatedTime: 80, // 1.5 minutes
    qualityScore: 8,
  },
];

// ============================================================================
// Preset Categories and Metadata
// ============================================================================

export const GENERATION_PRESET_CATEGORIES = {
  quality: {
    name: 'Quality',
    description: 'Presets focused on different quality levels',
    icon: '✨',
    presets: QUALITY_PRESETS.filter(p => p.category === 'quality'),
  },
  speed: {
    name: 'Speed',
    description: 'Fast presets for quick iteration',
    icon: '⚡',
    presets: QUALITY_PRESETS.filter(p => p.category === 'speed'),
  },
  style: {
    name: 'Style',
    description: 'Presets for different artistic styles',
    icon: '🎨',
    presets: QUALITY_PRESETS.filter(p => p.category === 'style'),
  },
} as const;

// Export all presets
export const GENERATION_PRESETS = QUALITY_PRESETS;

// ============================================================================
// Utility Functions
// ============================================================================

export const getGenerationPresetById = (id: string): GenerationPreset | undefined => {
  return GENERATION_PRESETS.find(preset => preset.id === id);
};

export const getGenerationPresetsByCategory = (category: string): GenerationPreset[] => {
  return GENERATION_PRESETS.filter(preset => preset.category === category);
};

export const getAllGenerationPresets = (): GenerationPreset[] => {
  return [...GENERATION_PRESETS];
};

export const getRecommendedPresets = (): GenerationPreset[] => {
  // Return most commonly used presets
  return ['quality-balanced', 'speed-fast', 'style-cinematic'].map(id =>
    GENERATION_PRESETS.find(p => p.id === id)
  ).filter(Boolean) as GenerationPreset[];
};

export const getPresetsByQualityScore = (minScore: number, maxScore: number): GenerationPreset[] => {
  return GENERATION_PRESETS.filter(preset =>
    preset.qualityScore >= minScore && preset.qualityScore <= maxScore
  );
};

export const getFastestPresets = (limit: number = 3): GenerationPreset[] => {
  return [...GENERATION_PRESETS]
    .sort((a, b) => a.estimatedTime - b.estimatedTime)
    .slice(0, limit);
};

export const getHighestQualityPresets = (limit: number = 3): GenerationPreset[] => {
  return [...GENERATION_PRESETS]
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, limit);
};