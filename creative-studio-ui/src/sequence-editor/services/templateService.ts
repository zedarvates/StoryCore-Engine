/**
 * Template Service
 * 
 * Handles template application, creation, and management.
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import type { Asset, Shot, TemplateMetadata } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface TemplateShot {
  name: string;
  duration: number; // in frames
  prompt: string;
  parameters: {
    seed?: number;
    denoising?: number;
    steps?: number;
    guidance?: number;
  };
  referenceImages?: string[];
  cameraPreset?: string;
  lightingRig?: string;
  visualStyle?: string;
}

export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  shots: TemplateShot[];
  metadata: TemplateMetadata;
  tags: string[];
  createdAt: number;
}

export interface NarrativePreset {
  id: string;
  name: string;
  description: string;
  styleParameters: {
    visualStyle?: string;
    colorPalette?: string[];
    mood?: string;
    cinematicStyle?: string;
  };
  shotDefaults: {
    denoising?: number;
    steps?: number;
    guidance?: number;
  };
  tags: string[];
  createdAt: number;
}

// ============================================================================
// Template Application
// ============================================================================

/**
 * Apply a scene template to create multiple shots
 */
export function applySceneTemplate(
  template: SceneTemplate,
  startTime: number,
  fps: number = 24
): Shot[] {
  const shots: Shot[] = [];
  let currentTime = startTime;

  template.shots.forEach((templateShot, index) => {
    const shot: Shot = {
      id: `shot-${Date.now()}-${index}`,
      name: templateShot.name || `Shot ${index + 1}`,
      startTime: currentTime,
      duration: templateShot.duration,
      layers: [
        {
          id: `layer-${Date.now()}-${index}`,
          type: 'media',
          startTime: 0,
          duration: templateShot.duration,
          locked: false,
          hidden: false,
          opacity: 1,
          blendMode: 'normal',
          data: {
            sourceUrl: '',
            trim: { start: 0, end: templateShot.duration },
            transform: {
              position: { x: 0, y: 0 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              anchor: { x: 0.5, y: 0.5 },
            },
          },
        },
      ],
      referenceImages: (templateShot.referenceImages || []).map((url, imgIndex) => ({
        id: `ref-${Date.now()}-${index}-${imgIndex}`,
        url,
        weight: 1,
        source: 'library' as const,
      })),
      prompt: templateShot.prompt,
      parameters: {
        seed: templateShot.parameters.seed || Math.floor(Math.random() * 1000000),
        denoising: templateShot.parameters.denoising || 0.75,
        steps: templateShot.parameters.steps || 20,
        guidance: templateShot.parameters.guidance || 7.5,
        sampler: 'euler_a',
        scheduler: 'normal',
      },
      generationStatus: 'pending',
    };

    shots.push(shot);
    currentTime += templateShot.duration;
  });

  return shots;
}

/**
 * Apply a narrative preset to multiple shots
 */
export function applyNarrativePreset(
  preset: NarrativePreset,
  shots: Shot[]
): Shot[] {
  return shots.map((shot) => ({
    ...shot,
    parameters: {
      ...shot.parameters,
      ...(preset.shotDefaults.denoising !== undefined && { denoising: preset.shotDefaults.denoising }),
      ...(preset.shotDefaults.steps !== undefined && { steps: preset.shotDefaults.steps }),
      ...(preset.shotDefaults.guidance !== undefined && { guidance: preset.shotDefaults.guidance }),
    },
    // Add style information to prompt if available
    prompt: preset.styleParameters.mood
      ? `${shot.prompt}, ${preset.styleParameters.mood} mood`
      : shot.prompt,
  }));
}

/**
 * Extract template metadata from an asset
 */
export function getTemplateMetadata(asset: Asset): TemplateMetadata | null {
  if (asset.type !== 'template' || !asset.metadata.templateMetadata) {
    return null;
  }
  return asset.metadata.templateMetadata;
}

/**
 * Check if an asset is a scene template
 */
export function isSceneTemplate(asset: Asset): boolean {
  return asset.type === 'template' && asset.subcategory === 'scene';
}

/**
 * Check if an asset is a narrative preset
 */
export function isNarrativePreset(asset: Asset): boolean {
  return asset.type === 'template' && asset.subcategory === 'narrative';
}

/**
 * Check if an asset is a shot template
 */
export function isShotTemplate(asset: Asset): boolean {
  return asset.type === 'template' && asset.subcategory === 'shot';
}

// ============================================================================
// Template Creation
// ============================================================================

/**
 * Create a custom template from existing shots
 */
export function createTemplateFromShots(
  shots: Shot[],
  name: string,
  description: string,
  genre: string,
  tags: string[] = []
): SceneTemplate {
  const templateShots: TemplateShot[] = shots.map((shot) => ({
    name: shot.name,
    duration: shot.duration,
    prompt: shot.prompt,
    parameters: {
      seed: shot.parameters.seed,
      denoising: shot.parameters.denoising,
      steps: shot.parameters.steps,
      guidance: shot.parameters.guidance,
    },
    referenceImages: shot.referenceImages.map((ref) => ref.url),
  }));

  const totalDuration = shots.reduce((sum, shot) => sum + shot.duration, 0);

  // Determine complexity based on shot count and parameters
  let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
  if (shots.length > 10) {
    complexity = 'complex';
  } else if (shots.length > 5) {
    complexity = 'moderate';
  }

  return {
    id: `template-${Date.now()}`,
    name,
    description,
    shots: templateShots,
    metadata: {
      shotCount: shots.length,
      totalDuration,
      genre,
      complexity,
    },
    tags,
    createdAt: Date.now(),
  };
}

/**
 * Create a narrative preset from shot parameters
 */
export function createNarrativePreset(
  name: string,
  description: string,
  styleParameters: NarrativePreset['styleParameters'],
  shotDefaults: NarrativePreset['shotDefaults'],
  tags: string[] = []
): NarrativePreset {
  return {
    id: `preset-${Date.now()}`,
    name,
    description,
    styleParameters,
    shotDefaults,
    tags,
    createdAt: Date.now(),
  };
}

// ============================================================================
// Template Storage
// ============================================================================

const TEMPLATE_STORAGE_KEY = 'storycore-custom-templates';
const PRESET_STORAGE_KEY = 'storycore-narrative-presets';

/**
 * Save a custom template to local storage
 */
export function saveCustomTemplate(template: SceneTemplate): void {
  try {
    const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    const templates: SceneTemplate[] = stored ? JSON.parse(stored) : [];

    // Check if template already exists and update it
    const existingIndex = templates.findIndex((t) => t.id === template.id);
    if (existingIndex !== -1) {
      templates[existingIndex] = template;
    } else {
      templates.push(template);
    }

    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Failed to save custom template:', error);
    throw new Error('Failed to save template to local storage');
  }
}

/**
 * Load custom templates from local storage
 */
export function loadCustomTemplates(): SceneTemplate[] {
  try {
    const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load custom templates:', error);
    return [];
  }
}

/**
 * Delete a custom template
 */
export function deleteCustomTemplate(templateId: string): void {
  try {
    const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    const templates: SceneTemplate[] = stored ? JSON.parse(stored) : [];
    const filtered = templates.filter((t) => t.id !== templateId);
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete custom template:', error);
    throw new Error('Failed to delete template from local storage');
  }
}

/**
 * Save a narrative preset to local storage
 */
export function saveNarrativePreset(preset: NarrativePreset): void {
  try {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY);
    const presets: NarrativePreset[] = stored ? JSON.parse(stored) : [];

    // Check if preset already exists and update it
    const existingIndex = presets.findIndex((p) => p.id === preset.id);
    if (existingIndex !== -1) {
      presets[existingIndex] = preset;
    } else {
      presets.push(preset);
    }

    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.error('Failed to save narrative preset:', error);
    throw new Error('Failed to save preset to local storage');
  }
}

/**
 * Load narrative presets from local storage
 */
export function loadNarrativePresets(): NarrativePreset[] {
  try {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load narrative presets:', error);
    return [];
  }
}

/**
 * Delete a narrative preset
 */
export function deleteNarrativePreset(presetId: string): void {
  try {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY);
    const presets: NarrativePreset[] = stored ? JSON.parse(stored) : [];
    const filtered = presets.filter((p) => p.id !== presetId);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete narrative preset:', error);
    throw new Error('Failed to delete preset from local storage');
  }
}

// ============================================================================
// Built-in Templates
// ============================================================================

/**
 * Get built-in scene templates
 */
export function getBuiltInTemplates(): SceneTemplate[] {
  return [
    {
      id: 'template-action-sequence',
      name: 'Action Sequence',
      description: 'High-energy action scene with dynamic camera movements',
      shots: [
        {
          name: 'Establishing Shot',
          duration: 72, // 3 seconds at 24fps
          prompt: 'Wide establishing shot of urban environment, dramatic lighting',
          parameters: { denoising: 0.75, steps: 20, guidance: 7.5 },
        },
        {
          name: 'Character Close-up',
          duration: 48, // 2 seconds
          prompt: 'Close-up of protagonist, determined expression, shallow depth of field',
          parameters: { denoising: 0.75, steps: 20, guidance: 7.5 },
        },
        {
          name: 'Action Beat',
          duration: 96, // 4 seconds
          prompt: 'Dynamic action shot, fast movement, motion blur',
          parameters: { denoising: 0.7, steps: 25, guidance: 8.0 },
        },
        {
          name: 'Impact Shot',
          duration: 24, // 1 second
          prompt: 'Dramatic impact moment, freeze frame effect',
          parameters: { denoising: 0.8, steps: 30, guidance: 8.5 },
        },
      ],
      metadata: {
        shotCount: 4,
        totalDuration: 240,
        genre: 'action',
        complexity: 'moderate',
      },
      tags: ['action', 'dynamic', 'fast-paced'],
      createdAt: new Date('2024-01-01').getTime(),
    },
    {
      id: 'template-dialogue-scene',
      name: 'Dialogue Scene',
      description: 'Classic shot-reverse-shot dialogue sequence',
      shots: [
        {
          name: 'Two-Shot',
          duration: 96, // 4 seconds
          prompt: 'Medium two-shot of characters in conversation, natural lighting',
          parameters: { denoising: 0.75, steps: 20, guidance: 7.0 },
        },
        {
          name: 'Over-Shoulder A',
          duration: 72, // 3 seconds
          prompt: 'Over-shoulder shot of character A speaking',
          parameters: { denoising: 0.75, steps: 20, guidance: 7.0 },
        },
        {
          name: 'Over-Shoulder B',
          duration: 72, // 3 seconds
          prompt: 'Over-shoulder shot of character B responding',
          parameters: { denoising: 0.75, steps: 20, guidance: 7.0 },
        },
        {
          name: 'Reaction Shot',
          duration: 48, // 2 seconds
          prompt: 'Close-up reaction shot, emotional expression',
          parameters: { denoising: 0.75, steps: 20, guidance: 7.5 },
        },
      ],
      metadata: {
        shotCount: 4,
        totalDuration: 288,
        genre: 'drama',
        complexity: 'simple',
      },
      tags: ['dialogue', 'conversation', 'drama'],
      createdAt: new Date('2024-01-01').getTime(),
    },
    {
      id: 'template-montage',
      name: 'Quick Montage',
      description: 'Fast-paced montage sequence with varied shots',
      shots: [
        {
          name: 'Montage 1',
          duration: 36, // 1.5 seconds
          prompt: 'Quick establishing shot',
          parameters: { denoising: 0.7, steps: 20, guidance: 7.0 },
        },
        {
          name: 'Montage 2',
          duration: 36,
          prompt: 'Detail shot, close-up',
          parameters: { denoising: 0.7, steps: 20, guidance: 7.0 },
        },
        {
          name: 'Montage 3',
          duration: 36,
          prompt: 'Action moment',
          parameters: { denoising: 0.7, steps: 20, guidance: 7.0 },
        },
        {
          name: 'Montage 4',
          duration: 36,
          prompt: 'Transition shot',
          parameters: { denoising: 0.7, steps: 20, guidance: 7.0 },
        },
        {
          name: 'Montage 5',
          duration: 36,
          prompt: 'Final beat',
          parameters: { denoising: 0.7, steps: 20, guidance: 7.0 },
        },
      ],
      metadata: {
        shotCount: 5,
        totalDuration: 180,
        genre: 'montage',
        complexity: 'simple',
      },
      tags: ['montage', 'fast-paced', 'quick-cuts'],
      createdAt: new Date('2024-01-01').getTime(),
    },
  ];
}

/**
 * Get built-in narrative presets
 */
export function getBuiltInPresets(): NarrativePreset[] {
  return [
    {
      id: 'preset-cinematic',
      name: 'Cinematic',
      description: 'Professional cinematic look with high production value',
      styleParameters: {
        mood: 'cinematic',
        cinematicStyle: 'hollywood',
      },
      shotDefaults: {
        denoising: 0.75,
        steps: 25,
        guidance: 8.0,
      },
      tags: ['cinematic', 'professional', 'high-quality'],
      createdAt: new Date('2024-01-01').getTime(),
    },
    {
      id: 'preset-noir',
      name: 'Film Noir',
      description: 'Classic noir style with high contrast and dramatic shadows',
      styleParameters: {
        mood: 'dark and moody',
        colorPalette: ['#000000', '#FFFFFF', '#808080'],
        cinematicStyle: 'film noir',
      },
      shotDefaults: {
        denoising: 0.8,
        steps: 30,
        guidance: 8.5,
      },
      tags: ['noir', 'black-and-white', 'dramatic'],
      createdAt: new Date('2024-01-01').getTime(),
    },
    {
      id: 'preset-dreamy',
      name: 'Dreamy',
      description: 'Soft, ethereal look with pastel colors',
      styleParameters: {
        mood: 'dreamy and ethereal',
        colorPalette: ['#FFE5E5', '#E5F5FF', '#F5E5FF'],
      },
      shotDefaults: {
        denoising: 0.7,
        steps: 20,
        guidance: 7.0,
      },
      tags: ['dreamy', 'soft', 'pastel'],
      createdAt: new Date('2024-01-01').getTime(),
    },
    {
      id: 'preset-gritty',
      name: 'Gritty Realism',
      description: 'Raw, realistic look with desaturated colors',
      styleParameters: {
        mood: 'gritty and realistic',
        cinematicStyle: 'documentary',
      },
      shotDefaults: {
        denoising: 0.65,
        steps: 20,
        guidance: 6.5,
      },
      tags: ['gritty', 'realistic', 'documentary'],
      createdAt: new Date('2024-01-01').getTime(),
    },
  ];
}
