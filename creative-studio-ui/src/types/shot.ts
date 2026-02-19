/**
 * Type definitions for Shot data models used in Production Wizards
 */

import { z } from 'zod';

export type ShotType =
  | 'extreme-wide'
  | 'wide'
  | 'medium'
  | 'close-up'
  | 'extreme-close-up'
  | 'over-the-shoulder'
  | 'pov';

export type TransitionType = 'cut' | 'fade' | 'dissolve' | 'wipe' | 'match-cut';

export interface ComfyUIParameters {
  width: number;
  height: number;
  seed?: number;
  steps: number;
  cfgScale: number;
  sampler: string;
  scheduler: string;
  denoisingStrength?: number;
  [key: string]: unknown;
}

export interface CameraMovement {
  type: 'static' | 'pan' | 'tilt' | 'dolly' | 'tracking' | 'crane' | 'handheld' | 'zoom';
  direction?: 'left' | 'right' | 'up' | 'down' | 'in' | 'out' | 'forward' | 'backward';
  speed?: 'slow' | 'medium' | 'fast';
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface DialogueLine {
  id: string;
  characterId: string;
  text: string;
  timing: {
    startTime: number; // seconds from shot start
    duration: number; // seconds
    emotionalTone: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'calm' | 'surprised';
  };
  audio: {
    voiceId: string;
    pitch: number; // 0-2, 1 = normal
    speed: number; // 0.5-2, 1 = normal
    volume: number; // 0-1
    spatialization: {
      enabled: boolean;
      speakerAssignment: 'auto' | 'front-left' | 'front-center' | 'front-right' | 'surround-left' | 'surround-right' | 'back-left' | 'back-right' | 'lfe';
      reverb: number; // 0-1
      delay: number; // ms
    };
  };
  sapiGenerated: boolean;
  sapiParameters?: {
    voice: string;
    rate: number;
    volume: number;
    emphasis: string[];
  };
}

export interface Shot {
  id: string;
  number: number;
  type: ShotType;
  timing: {
    duration: number;
    inPoint: number;
    outPoint: number;
    transition: TransitionType;
    transitionDuration: number;
    // Trimming support for video editing
    trimStart?: number; // Start point within the source media (seconds)
    trimEnd?: number;   // End point within the source media (seconds)
  };
  thumbnailUrl?: string;
  promoted_panel_path?: string; // Path to promoted panel image
  title?: string;
  duration?: number;
  status: string;
  tags: string[];
  sequencePlanId?: string;
  sceneId?: string;
  position: number;
  // New rig metadata fields
  rigPath?: string; // Path to the generated rig asset
  boneCount?: number; // Number of bones in the rig
  hash?: string; // Content hash of the rig
  gltfPath?: string; // Path to exported GLTF file
  referenceImage?: string; // Base64 or URL of the reference image for AI
}

export interface ProductionShot {
  id: string;
  sequencePlanId: string;
  sceneId: string;
  number: number;

  // Shot classification
  type: ShotType;
  category: 'establishing' | 'action' | 'dialogue' | 'reaction' | 'insert' | 'transition' | 'custom';

  // Composition
  composition: {
    characterIds: string[];
    characterPositions: CharacterPosition[];
    environmentId: string; // World location
    props: string[];
    lightingMood: string;
    timeOfDay: string;
  };

  // Camera configuration
  camera: {
    framing: 'extreme-wide' | 'wide' | 'medium' | 'close-up' | 'extreme-close-up';
    angle: 'eye-level' | 'high' | 'low' | 'dutch' | 'birds-eye' | 'worms-eye';
    azimuth?: number; // 0-360 degrees (0: front, 180: back)
    elevation?: number; // -90 to 90 degrees (90: birds-eye, -90: worms-eye)
    distance?: 'closeup' | 'medium' | 'wide';
    movement: CameraMovement;
  };

  // Timing
  timing: {
    duration: number; // frames
    inPoint: number;
    outPoint: number;
    transition: TransitionType;
    transitionDuration: number;
  };

  // Generation settings
  generation: {
    aiProvider: string;
    model: string;
    prompt: string;
    negativePrompt: string;
    comfyuiPreset: string;
    parameters: ComfyUIParameters;
    styleReferences: string[];
    seed?: number;
    referenceImage?: string; // Reference image for ComfyUI generation
  };

  // Dialogue and audio
  dialogues: DialogueLine[];
  backgroundAudio?: {
    type: 'music' | 'ambience' | 'sound-effect';
    assetId: string;
    volume: number;
    fadeIn: number;
    fadeOut: number;
    loop: boolean;
  };

  // Added for compatibility with UI usage
  title?: string;
  status: 'planned' | 'generating' | 'generated' | 'approved' | 'rejected';
  thumbnailUrl?: string;
  generatedAssetUrl?: string;
  notes?: string;
  tags?: string[];
  templates?: string[];
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const ComfyUIParametersSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  seed: z.number().optional(),
  steps: z.number().positive(),
  cfgScale: z.number().positive(),
  sampler: z.string(),
  scheduler: z.string(),
}).catchall(z.any());

export const CameraMovementSchema = z.object({
  type: z.enum(['static', 'pan', 'tilt', 'dolly', 'tracking', 'crane', 'handheld', 'zoom']),
  direction: z.enum(['left', 'right', 'up', 'down', 'in', 'out', 'forward', 'backward']).optional(),
  speed: z.enum(['slow', 'medium', 'fast']).optional(),
  easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out']).optional(),
});

export const CharacterPositionSchema = z.object({
  characterId: z.string(),
  position: z.enum(['left', 'center', 'right', 'foreground', 'background']),
  pose: z.string().optional(),
  expression: z.string().optional(),
});

export type CharacterPosition = z.infer<typeof CharacterPositionSchema>;

export const ShotSchema = z.object({
  id: z.string(),
  sequencePlanId: z.string(),
  sceneId: z.string(),
  number: z.number().int().positive(),
  type: z.enum(['extreme-wide', 'wide', 'medium', 'close-up', 'extreme-close-up', 'over-the-shoulder', 'pov']),
  category: z.enum(['establishing', 'action', 'dialogue', 'reaction', 'insert', 'transition', 'custom']),
  composition: z.object({
    characterIds: z.array(z.string()),
    characterPositions: z.array(CharacterPositionSchema),
    environmentId: z.string(),
    props: z.array(z.string()),
    lightingMood: z.string(),
    timeOfDay: z.string(),
  }),
  camera: z.object({
    framing: z.enum(['extreme-wide', 'wide', 'medium', 'close-up', 'extreme-close-up']),
    angle: z.enum(['eye-level', 'high', 'low', 'dutch', 'birds-eye', 'worms-eye']),
    movement: CameraMovementSchema,
  }),
  timing: z.object({
    duration: z.number().positive(),
    inPoint: z.number().nonnegative(),
    outPoint: z.number().positive(),
    transition: z.enum(['cut', 'fade', 'dissolve', 'wipe', 'match-cut']),
    transitionDuration: z.number().nonnegative(),
  }),
  generation: z.object({
    aiProvider: z.string(),
    model: z.string(),
    prompt: z.string().min(1),
    negativePrompt: z.string(),
    comfyuiPreset: z.string(),
    parameters: ComfyUIParametersSchema,
    styleReferences: z.array(z.string()),
    seed: z.number().optional(),
  }),
  status: z.enum(['planned', 'generating', 'generated', 'approved', 'rejected']),
  thumbnailUrl: z.string().optional(),
  generatedAssetUrl: z.string().optional(),
  notes: z.string(),
  tags: z.array(z.string()),
  templates: z.array(z.string()),
});

