/**
 * Type definitions for Template data models used in Production Wizards
 */

import { z } from 'zod';
import type { ProductionShot } from './shot';
import type { ComfyUIParameters } from './shot';

export interface ActTemplate {
  number: number;
  title: string;
  description: string;
  targetDuration: number;
  narrativePurpose: string;
}

export interface SequenceTemplate {
  id: string;
  name: string;
  description: string;
  category: 'narrative' | 'commercial' | 'music-video' | 'tutorial' | 'documentary' | 'adventure-film' | 'animated-series' | 'sitcom' | 'wedding-video' | 'commercial-presentation' | 'anime-styles' | 'superhero-saga' | 'mystery-thriller' | 'biography' | 'sports-story' | 'custom';
  isBuiltIn: boolean;

  structure: {
    acts: ActTemplate[];
    defaultSceneCount: number;
    defaultShotCount: number;
  };

  defaults: {
    frameRate: number;
    resolution: { width: number; height: number };
    targetDuration: number;
  };

  previewImage?: string;
  tags: string[];
}

export interface ShotTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  isBuiltIn: boolean;

  configuration: Partial<ProductionShot>;
  previewImage?: string;
  tags: string[];
}

export interface GenerationPreset {
  id: string;
  name: string;
  description: string;
  category: 'quality' | 'speed' | 'style';
  isBuiltIn: boolean;

  parameters: ComfyUIParameters;
  estimatedTime: number; // seconds
  qualityScore: number; // 1-10
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const ActTemplateSchema = z.object({
  number: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string(),
  targetDuration: z.number().positive(),
  narrativePurpose: z.string(),
});

export const SequenceTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(['narrative', 'commercial', 'music-video', 'tutorial', 'documentary', 'adventure-film', 'animated-series', 'sitcom', 'wedding-video', 'commercial-presentation', 'anime-styles', 'superhero-saga', 'mystery-thriller', 'biography', 'sports-story', 'custom']),
  isBuiltIn: z.boolean(),
  structure: z.object({
    acts: z.array(ActTemplateSchema),
    defaultSceneCount: z.number().int().nonnegative(),
    defaultShotCount: z.number().int().nonnegative(),
  }),
  defaults: z.object({
    frameRate: z.number().positive(),
    resolution: z.object({
      width: z.number().positive(),
      height: z.number().positive(),
    }),
    targetDuration: z.number().positive(),
  }),
  previewImage: z.string().optional(),
  tags: z.array(z.string()),
});

export const ShotTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  category: z.string(),
  isBuiltIn: z.boolean(),
  configuration: z.any(), // Partial<Shot> - flexible
  previewImage: z.string().optional(),
  tags: z.array(z.string()),
});

export const GenerationPresetSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(['quality', 'speed', 'style']),
  isBuiltIn: z.boolean(),
  parameters: z.any(), // ComfyUIParameters - flexible
  estimatedTime: z.number().positive(),
  qualityScore: z.number().min(1).max(10),
});

// ============================================================================
// Asset Template Types
// ============================================================================

export type Genre =
  | 'action'
  | 'adventure'
  | 'animation'
  | 'biography'
  | 'comedy'
  | 'crime'
  | 'documentary'
  | 'drama'
  | 'family'
  | 'fantasy'
  | 'history'
  | 'horror'
  | 'music'
  | 'musical'
  | 'mystery'
  | 'romance'
  | 'sci-fi'
  | 'sport'
  | 'thriller'
  | 'war'
  | 'western';

export type VisualStyle =
  | 'photorealistic'
  | 'cinematic'
  | 'anime'
  | 'cartoon'
  | 'sketch'
  | 'oil-painting'
  | 'watercolor'
  | 'digital-art'
  | 'comic-book'
  | 'noir'
  | 'vintage'
  | 'modern'
  | 'minimalist';

export type Lighting =
  | 'natural'
  | 'studio'
  | 'dramatic'
  | 'soft'
  | 'hard'
  | 'backlit'
  | 'side-lit'
  | 'top-lit'
  | 'bottom-lit'
  | 'rim-lit'
  | 'volumetric'
  | 'practical';

export type MoodAtmosphere =
  | 'cheerful'
  | 'melancholic'
  | 'tense'
  | 'peaceful'
  | 'mysterious'
  | 'romantic'
  | 'dramatic'
  | 'comedic'
  | 'epic'
  | 'intimate'
  | 'chaotic'
  | 'serene';

export type ColorPalette =
  | 'warm'
  | 'cool'
  | 'monochromatic'
  | 'pastel'
  | 'vibrant'
  | 'muted'
  | 'high-contrast'
  | 'low-contrast'
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic';

export type TimeOfDay =
  | 'dawn'
  | 'morning'
  | 'noon'
  | 'afternoon'
  | 'dusk'
  | 'evening'
  | 'night'
  | 'midnight';

export type UniverseType =
  | 'real-world'
  | 'fantasy'
  | 'sci-fi'
  | 'historical'
  | 'alternate-history'
  | 'post-apocalyptic'
  | 'cyberpunk'
  | 'steampunk'
  | 'medieval'
  | 'futuristic'
  | 'parallel-universe'
  | 'dream-world';

export type AssetShotType =
  | 'establishing'
  | 'wide'
  | 'medium'
  | 'close-up'
  | 'extreme-close-up'
  | 'over-the-shoulder'
  | 'pov'
  | 'insert'
  | 'cutaway'
  | 'montage';

export type CameraAngle =
  | 'eye-level'
  | 'high-angle'
  | 'low-angle'
  | 'dutch-angle'
  | 'birds-eye'
  | 'worms-eye'
  | 'overhead'
  | 'underwater'
  | 'aerial';

export type AssetCameraMovement =
  | 'static'
  | 'pan-left'
  | 'pan-right'
  | 'tilt-up'
  | 'tilt-down'
  | 'dolly-in'
  | 'dolly-out'
  | 'tracking'
  | 'crane-up'
  | 'crane-down'
  | 'handheld'
  | 'zoom-in'
  | 'zoom-out'
  | 'rack-focus';

export interface AssetTemplate {
  id: string;
  name: string;
  description: string;
  genre: Genre;
  visualStyle: VisualStyle;
  lighting: Lighting;
  moodAtmosphere: MoodAtmosphere;
  colorPalette: ColorPalette;
  timeOfDay: TimeOfDay;
  universeType: UniverseType;
  shotTypes: AssetShotType[];
  cameraAngles: CameraAngle[];
  cameraMovements: AssetCameraMovement[];
  isBuiltIn: boolean;
  previewImage?: string;
  tags: string[];
}

export const AssetTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  genre: z.enum(['action', 'adventure', 'animation', 'biography', 'comedy', 'crime', 'documentary', 'drama', 'family', 'fantasy', 'history', 'horror', 'music', 'musical', 'mystery', 'romance', 'sci-fi', 'sport', 'thriller', 'war', 'western']),
  visualStyle: z.enum(['photorealistic', 'cinematic', 'anime', 'cartoon', 'sketch', 'oil-painting', 'watercolor', 'digital-art', 'comic-book', 'noir', 'vintage', 'modern', 'minimalist']),
  lighting: z.enum(['natural', 'studio', 'dramatic', 'soft', 'hard', 'backlit', 'side-lit', 'top-lit', 'bottom-lit', 'rim-lit', 'volumetric', 'practical']),
  moodAtmosphere: z.enum(['cheerful', 'melancholic', 'tense', 'peaceful', 'mysterious', 'romantic', 'dramatic', 'comedic', 'epic', 'intimate', 'chaotic', 'serene']),
  colorPalette: z.enum(['warm', 'cool', 'monochromatic', 'pastel', 'vibrant', 'muted', 'high-contrast', 'low-contrast', 'complementary', 'analogous', 'triadic', 'tetradic']),
  timeOfDay: z.enum(['dawn', 'morning', 'noon', 'afternoon', 'dusk', 'evening', 'night', 'midnight']),
  universeType: z.enum(['real-world', 'fantasy', 'sci-fi', 'historical', 'alternate-history', 'post-apocalyptic', 'cyberpunk', 'steampunk', 'medieval', 'futuristic', 'parallel-universe', 'dream-world']),
  shotTypes: z.array(z.enum(['establishing', 'wide', 'medium', 'close-up', 'extreme-close-up', 'over-the-shoulder', 'pov', 'insert', 'cutaway', 'montage'])),
  cameraAngles: z.array(z.enum(['eye-level', 'high-angle', 'low-angle', 'dutch-angle', 'birds-eye', 'worms-eye', 'overhead', 'underwater', 'aerial'])),
  cameraMovements: z.array(z.enum(['static', 'pan-left', 'pan-right', 'tilt-up', 'tilt-down', 'dolly-in', 'dolly-out', 'tracking', 'crane-up', 'crane-down', 'handheld', 'zoom-in', 'zoom-out', 'rack-focus'])),
  isBuiltIn: z.boolean(),
  previewImage: z.string().optional(),
  tags: z.array(z.string()),
});
