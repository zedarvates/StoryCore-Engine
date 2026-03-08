/**
 * Type definitions for ProjectDashboardNew component
 * Data Contract v1 compliant data models for shot-level prompt management,
 * sequence generation, and audio track synchronization
 */

import { z } from 'zod';

// ============================================================================
// Core Data Models
// ============================================================================

import { Project as BaseProject, Shot as BaseShot, AudioTrack, Effect, TextLayer, Transition } from './index';

// Re-export types to satisfy unused variable lint
export type { AudioTrack, Effect, TextLayer, Transition };

/**
 * Shot with extended prompt management capabilities
 * Extends the base Shot type with prompt validation and generation metadata
 */
export interface Shot extends BaseShot {
  promptValidation?: PromptValidation;
}

// Redundant types removed as they are now imported from ./index

/**
 * Dialogue phrase with precise timing and voice characteristics
 * Represents a single unit of spoken dialogue synchronized with shot timing
 */
export interface DialoguePhrase {
  id: string;
  shotId: string;
  text: string;
  startTime: number; // seconds
  endTime: number; // seconds
  voiceParameters?: VoiceParameters;
  generatedAudioUrl?: string;
  metadata: {
    character?: string;
    emotion?: string;
  };
}

/**
 * Voice generation parameters for text-to-speech
 */
export interface VoiceParameters {
  voiceType: 'male' | 'female' | 'neutral';
  speed: number; // 0.5 - 2.0
  pitch: number; // -12 to +12 semitones
  language: string; // ISO 639-1 code
}

/**
 * Prompt validation result with errors, warnings, and suggestions
 */
export interface PromptValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  type: 'empty' | 'too_short' | 'too_long' | 'invalid_characters';
  message: string;
  field: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  type: 'inconsistent' | 'vague' | 'missing_detail';
  message: string;
  suggestion?: string;
}

/**
 * Generation results from the complete StoryCore pipeline
 */
export interface GenerationResults {
  success: boolean;
  masterCoherenceSheetUrl: string;
  generatedShots: GeneratedShot[];
  qaReport: QAReport;
  exportPackageUrl: string;
  errors?: GenerationError[];
}

/**
 * Individual shot generation result
 */
export interface GeneratedShot {
  shotId: string;
  imageUrl: string;
  qaScore: number;
  processingTime: number;
}

/**
 * QA report for generated sequence
 */
export interface QAReport {
  overallScore: number;
  shotScores: { shotId: string; score: number; issues: string[] }[];
  autofixApplied: boolean;
}

/**
 * Generation error details
 */
export interface GenerationError {
  stage: 'grid' | 'comfyui' | 'promotion' | 'qa' | 'export';
  message: string;
  shotId?: string;
  retryable: boolean;
}

/**
 * Generation status tracking through pipeline stages
 */
export interface GenerationStatus {
  stage: 'idle' | 'grid' | 'comfyui' | 'promotion' | 'qa' | 'export' | 'complete' | 'error';
  progress: number; // 0-100
  currentShot?: number;
  totalShots?: number;
  error?: string;
  startTime?: number;
  estimatedCompletion?: number;
}

/**
 * Extended Project interface with prompt and audio track management
 * Data Contract v1 compliant
 */
export interface Project extends BaseProject {
  sequences: Sequence[];
}

/**
 * Sequence definition
 */
export interface Sequence {
  id: string;
  name: string;
  description: string;
  shotIds: string[];
  duration: number;
}

/**
 * Generation history record
 */
export interface GenerationRecord {
  id: string;
  timestamp: number;
  status: 'success' | 'failed' | 'cancelled';
  results?: GenerationResults;
  error?: string;
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

/**
 * Zod schema for EffectKeyframe
 */
export const EffectKeyframeSchema = z.object({
  id: z.string(),
  time: z.number().nonnegative(),
  value: z.number(),
  interpolation: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out']),
});

/**
 * Zod schema for EffectParameter
 */
export const EffectParameterSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['range', 'color', 'select', 'boolean', 'number']),
  value: z.any(),
  defaultValue: z.any().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  options: z.array(z.object({
    label: z.string(),
    value: z.any(),
  })).optional(),
  unit: z.string().optional(),
  keyframes: z.array(EffectKeyframeSchema).optional(),
});

/**
 * Zod schema for Effect
 */
export const EffectSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['color-correction', 'blur', 'sharpen', 'distortion', 'filter', 'transition', 'custom']).optional(),
  category: z.enum(['color', 'blur', 'stylize', 'distort', 'noise', 'creative', 'transform', 'temporal']),
  enabled: z.boolean().optional(),
  parameters: z.array(EffectParameterSchema),
  intensity: z.number().min(0).max(1).optional(),
  duration: z.number().nonnegative().optional(),
  startTime: z.number().nonnegative().optional(),
  endTime: z.number().nonnegative().optional(),
  icon: z.any().optional(),
  description: z.string().optional(),
  preview: z.string().optional(),
});

/**
 * Zod schema for TextStyle
 */
export const TextStyleSchema = z.object({
  fontFamily: z.string(),
  fontSize: z.number(),
  fontWeight: z.enum(['normal', 'bold', 'lighter', 'bolder']),
  fontStyle: z.enum(['normal', 'italic', 'oblique']),
  textDecoration: z.enum(['none', 'underline', 'line-through']),
  textAlign: z.enum(['left', 'center', 'right', 'justify']),
  color: z.string(),
  backgroundColor: z.string(),
  textShadow: z.string(),
  letterSpacing: z.number(),
  lineHeight: z.number(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']),
});

/**
 * Zod schema for TextAnimation
 */
export const TextAnimationSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  type: z.enum(['fade', 'slide', 'scale', 'rotate', 'bounce', 'typewriter', 'glow', 'fade-in', 'fade-out', 'slide-in', 'slide-out']),
  duration: z.number().nonnegative(),
  delay: z.number().nonnegative(),
  easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out']),
  direction: z.enum(['left', 'right', 'up', 'down']).optional(),
  intensity: z.number().optional(),
});

/**
 * Zod schema for TextLayer
 */
export const TextLayerSchema = z.object({
  id: z.string(),
  text: z.string(),
  content: z.string().optional(), // Legacy compatibility
  style: TextStyleSchema,
  animation: TextAnimationSchema.optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  size: z.object({
    width: z.number(),
    height: z.number(),
  }).optional(),
  startTime: z.number().nonnegative().optional(),
  duration: z.number().positive().optional(),
  // Legacy fields
  font: z.string().optional(),
  fontSize: z.number().optional(),
  color: z.string().optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
});

/**
 * Zod schema for Transition
 */
export const TransitionSchema = z.object({
  type: z.string(),
  duration: z.number().nonnegative(),
  params: z.record(z.string(), z.any()).optional(),
});

export const VoiceParametersSchema = z.object({
  voiceType: z.enum(['male', 'female', 'neutral']),
  speed: z.number().min(0.5).max(2.0),
  pitch: z.number().min(-12).max(12),
  language: z.string().length(2), // ISO 639-1 code
});

export const ValidationErrorSchema = z.object({
  type: z.enum(['empty', 'too_short', 'too_long', 'invalid_characters']),
  message: z.string(),
  field: z.string(),
});

export const ValidationWarningSchema = z.object({
  type: z.enum(['inconsistent', 'vague', 'missing_detail']),
  message: z.string(),
  suggestion: z.string().optional(),
});

export const PromptValidationSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationWarningSchema),
  suggestions: z.array(z.string()),
});

export const ShotSchema = z.object({
  // Core identification
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  
  // Core timing and positioning
  duration: z.number().positive(),
  image: z.string().optional(),
  position: z.number().nonnegative(),
  
  // Data Contract v1 / Dashboard Compatibility (snake_case for persistence)
  sequence_id: z.string().optional(),
  start_time: z.number().optional(),
  prompt: z.string().optional(),
  generated_image_url: z.string().optional(),
  status: z.string().optional(),
  progress: z.number().optional(),
  promoted_panel_path: z.string().optional(),
  
  // CamelCase Aliases (for dashboard/store compatibility)
  sequenceId: z.string().optional(),
  startTime: z.number().optional(),
  generatedImageUrl: z.string().optional(),
  name: z.string().optional(),
  orderIndex: z.number().optional(),
  thumbnailUrl: z.string().optional(),
  
  // Wizard / Production specific
  number: z.number().optional(),
  type: z.string().optional(),
  category: z.enum(['establishing', 'action', 'dialogue', 'reaction', 'insert', 'transition', 'custom']).optional(),
  
  // Timing sub-object
  timing: z.object({
    duration: z.number(),
    inPoint: z.number(),
    outPoint: z.number(),
    transition: z.string(),
    transitionDuration: z.number(),
    trimStart: z.number().optional(),
    trimEnd: z.number().optional(),
  }).optional(),
  
  // Generation metadata
  generation: z.object({
    aiProvider: z.string(),
    model: z.string(),
    prompt: z.string(),
    negativePrompt: z.string(),
    comfyuiPreset: z.string(),
    parameters: z.record(z.string(), z.any()),
    styleReferences: z.array(z.string()),
    seed: z.number().optional(),
    referenceImage: z.string().optional(),
  }).optional(),
  
  // Audio tracks
  audioTracks: z.array(z.any()).optional(),
  
  // Visual effects
  effects: z.array(EffectSchema).optional(),
  
  // Text layers
  textLayers: z.array(TextLayerSchema).optional(),
  
  // Keyframe animations
  animations: z.array(z.any()).optional(),
  
  // Transition to next shot
  transitionOut: TransitionSchema.optional(),
  
  // Metadata and legacy fields
  metadata: z.record(z.any()).optional(),
  referenceImage: z.string().optional(),
  result_url: z.string().optional(),
  
  // Prompt validation (dashboard-specific extension)
  promptValidation: PromptValidationSchema.optional(),
});

export const DialoguePhraseSchema = z.object({
  id: z.string(),
  shotId: z.string(),
  text: z.string().min(1),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  voiceParameters: VoiceParametersSchema.optional(),
  generatedAudioUrl: z.string().optional(),
  metadata: z.object({
    character: z.string().optional(),
    emotion: z.string().optional(),
  }),
}).refine(
  (data) => data.endTime > data.startTime,
  {
    message: 'endTime must be greater than startTime',
    path: ['endTime'],
  }
);

export const GeneratedShotSchema = z.object({
  shotId: z.string(),
  imageUrl: z.string(),
  qaScore: z.number().min(0).max(100),
  processingTime: z.number().nonnegative(),
});

export const QAReportSchema = z.object({
  overallScore: z.number().min(0).max(100),
  shotScores: z.array(z.object({
    shotId: z.string(),
    score: z.number().min(0).max(100),
    issues: z.array(z.string()),
  })),
  autofixApplied: z.boolean(),
});

export const GenerationErrorSchema = z.object({
  stage: z.enum(['grid', 'comfyui', 'promotion', 'qa', 'export']),
  message: z.string(),
  shotId: z.string().optional(),
  retryable: z.boolean(),
});

export const GenerationResultsSchema = z.object({
  success: z.boolean(),
  masterCoherenceSheetUrl: z.string(),
  generatedShots: z.array(GeneratedShotSchema),
  qaReport: QAReportSchema,
  exportPackageUrl: z.string(),
  errors: z.array(GenerationErrorSchema).optional(),
});

export const GenerationStatusSchema = z.object({
  stage: z.enum(['idle', 'grid', 'comfyui', 'promotion', 'qa', 'export', 'complete', 'error']),
  progress: z.number().min(0).max(100),
  currentShot: z.number().optional(),
  totalShots: z.number().optional(),
  error: z.string().optional(),
  startTime: z.number().optional(),
  estimatedCompletion: z.number().optional(),
});

export const SequenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  shotIds: z.array(z.string()),
  duration: z.number().positive(),
});

export const GenerationRecordSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  status: z.enum(['success', 'failed', 'cancelled']),
  results: GenerationResultsSchema.optional(),
  error: z.string().optional(),
});

export const ProjectSchema = z.object({
  // Core identification
  id: z.string(),
  schema_version: z.string(), // Data Contract v1: "1.0"
  project_name: z.string(),
  path: z.string().optional(),
  
  // Core collections
  shots: z.array(ShotSchema),
  assets: z.array(z.any()).optional(),
  
  // Story-related collections
  worlds: z.array(z.any()).optional(),
  selectedWorldId: z.string().nullable().optional(),
  characters: z.array(z.any()).optional(),
  stories: z.array(z.any()).optional(),
  storyVersions: z.array(z.any()).optional(),
  objects: z.array(z.any()).optional(),
  sequencePlans: z.array(z.any()).optional(),
  
  // Project setup
  projectSetup: z.any().optional(),
  
  // Sequences (dashboard-specific extension)
  sequences: z.array(SequenceSchema),
  
  // Audio and dialogue
  audio_phrases: z.array(DialoguePhraseSchema).optional(),
  audioPhrases: z.array(DialoguePhraseSchema).optional(),
  
  // Master coherence sheet
  master_coherence_sheet: z.object({
    url: z.string(),
    generated_at: z.number(),
  }).optional(),
  masterCoherenceSheet: z.object({
    url: z.string(),
    generatedAt: z.number(),
  }).optional(),
  
  // Generation
  generation_history: z.array(GenerationRecordSchema).optional(),
  generationHistory: z.array(GenerationRecordSchema).optional(),
  
  // Capabilities
  capabilities: z.object({
    grid_generation: z.boolean(),
    promotion_engine: z.boolean(),
    qa_engine: z.boolean(),
    autofix_engine: z.boolean(),
    character_casting: z.boolean().optional(),
    voice_generation: z.boolean().optional(),
    gridGeneration: z.boolean().optional(),
    promotionEngine: z.boolean().optional(),
    qaEngine: z.boolean().optional(),
    autofixEngine: z.boolean().optional(),
  }),
  
  // Generation status
  generation_status: z.object({
    grid: z.enum(['pending', 'done', 'failed', 'passed']),
    promotion: z.enum(['pending', 'done', 'failed', 'passed']),
    wizard: z.enum(['pending', 'done', 'failed', 'passed']).optional(),
  }).optional(),
  
  // CamelCase Aliases
  name: z.string().optional(),
  schemaVersion: z.string().optional(),
  
  // Storyboard alias
  storyboard: z.array(ShotSchema).optional(),
  
  // Casting
  casting: z.object({
    version: z.string(),
    assignments: z.array(z.object({
      character_id: z.string(),
      avatar_id: z.string(),
      assigned_at: z.number(),
    })),
    last_modified: z.number(),
  }).optional(),
  
  // Metadata
  metadata: z.record(z.string(), z.any()).optional(),
  global_resume: z.string().optional(),
});

// ============================================================================
// Type Guards
// ============================================================================

export function isValidPrompt(prompt: string): boolean {
  const trimmed = prompt.trim();
  return trimmed.length >= 10 && trimmed.length <= 500;
}

export function isDialoguePhraseValid(phrase: DialoguePhrase): boolean {
  return phrase.endTime > phrase.startTime && phrase.text.trim().length > 0;
}

export function hasValidPrompts(shots: Shot[]): boolean {
  return shots.every(shot => isValidPrompt(shot.prompt || ''));
}
