/**
 * Type definitions for ProjectDashboardNew component
 * Data Contract v1 compliant data models for shot-level prompt management,
 * sequence generation, and audio track synchronization
 */

import { z } from 'zod';

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * Shot with extended prompt management capabilities
 * Extends the base Shot type with prompt validation and generation metadata
 */
export interface Shot {
  id: string;
  sequenceId: string;
  startTime: number; // seconds
  duration: number; // seconds
  prompt: string;
  promptValidation?: PromptValidation;
  generatedImageUrl?: string;
  metadata: {
    cameraAngle?: string;
    lighting?: string;
    mood?: string;
  };
}

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
export interface Project {
  id: string;
  name: string;
  schemaVersion: string; // Data Contract v1
  sequences: Sequence[];
  shots: Shot[];
  audioPhrases: DialoguePhrase[];
  masterCoherenceSheet?: {
    url: string;
    generatedAt: number;
  };
  generationHistory: GenerationRecord[];
  capabilities: {
    gridGeneration: boolean;
    promotionEngine: boolean;
    qaEngine: boolean;
    autofixEngine: boolean;
    voiceGeneration: boolean;
  };
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
  id: z.string(),
  sequenceId: z.string(),
  startTime: z.number().nonnegative(),
  duration: z.number().positive(),
  prompt: z.string(),
  promptValidation: PromptValidationSchema.optional(),
  generatedImageUrl: z.string().optional(),
  metadata: z.object({
    cameraAngle: z.string().optional(),
    lighting: z.string().optional(),
    mood: z.string().optional(),
  }),
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
  id: z.string(),
  name: z.string(),
  schemaVersion: z.string(),
  sequences: z.array(SequenceSchema),
  shots: z.array(ShotSchema),
  audioPhrases: z.array(DialoguePhraseSchema),
  masterCoherenceSheet: z.object({
    url: z.string(),
    generatedAt: z.number(),
  }).optional(),
  generationHistory: z.array(GenerationRecordSchema),
  capabilities: z.object({
    gridGeneration: z.boolean(),
    promotionEngine: z.boolean(),
    qaEngine: z.boolean(),
    autofixEngine: z.boolean(),
    voiceGeneration: z.boolean(),
  }),
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
  return shots.every(shot => isValidPrompt(shot.prompt));
}
