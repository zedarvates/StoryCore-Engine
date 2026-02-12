/**
 * Generation Pipeline Types
 * 
 * Type definitions for the Generation Buttons UI feature.
 * Supports prompt, image, video, and audio generation workflows.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

/**
 * Generation progress information
 */
export interface GenerationProgress {
  stage: string;
  stageProgress: number;
  overallProgress: number;
  estimatedTimeRemaining: number;
  message: string;
  cancellable: boolean;
}

/**
 * Generated prompt data
 */
export interface GeneratedPrompt {
  text: string;
  categories: PromptCategories;
  timestamp: number;
  editable: boolean;
}

/**
 * Prompt categories for generation
 */
export interface PromptCategories {
  genre?: string;
  shotType?: string;
  lighting?: string;
  sceneElements?: string[];
  mood?: string;
}

/**
 * Asset metadata
 */
export interface AssetMetadata {
  generationParams: Record<string, unknown>;
  fileSize: number;
  dimensions?: { width: number; height: number };
  duration?: number;
  format: string;
}

/**
 * Generated asset
 */
export interface GeneratedAsset {
  id: string;
  type: 'prompt' | 'image' | 'video' | 'audio';
  url: string;
  metadata: AssetMetadata;
  relatedAssets: string[]; // IDs of related assets in pipeline
  timestamp: number;
}

/**
 * Stage state for pipeline
 */
export interface StageState<T> {
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  result?: T;
  error?: string;
  progress?: GenerationProgress;
  attempts: number;
}

/**
 * Generation pipeline state
 */
export interface GenerationPipelineState {
  id: string;
  currentStage: 'prompt' | 'image' | 'video' | 'audio' | 'complete';
  stages: {
    prompt: StageState<GeneratedPrompt>;
    image: StageState<GeneratedAsset>;
    video: StageState<GeneratedAsset>;
    audio: StageState<GeneratedAsset>;
  };
  createdAt: number;
  updatedAt: number;
}

/**
 * Generation task
 */
export interface GenerationTask {
  id: string;
  type: 'prompt' | 'image' | 'video' | 'audio';
  params: Record<string, unknown>;
  priority: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: GenerationProgress;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: GeneratedAsset;
  error?: string;
}

/**
 * Generation queue
 */
export interface GenerationQueue {
  tasks: GenerationTask[];
  activeTask: string | null;
  maxConcurrent: number;
}

/**
 * History entry
 */
export interface HistoryEntry {
  id: string;
  pipelineId: string;
  type: 'prompt' | 'image' | 'video' | 'audio';
  params: Record<string, unknown>;
  result: GeneratedAsset;
  timestamp: number;
  version: number;
}

/**
 * Generation history
 */
export interface GenerationHistory {
  entries: HistoryEntry[];
  maxEntries: number;
}

/**
 * Image generation parameters
 */
export interface ImageGenerationParams {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  seed: number;
  sampler: string;
  scheduler: string;
}

/**
 * Video generation parameters
 */
export interface VideoGenerationParams {
  inputImagePath: string;
  prompt: string;
  frameCount: number;
  frameRate: number;
  width: number;
  height: number;
  motionStrength: number;
}

/**
 * Audio generation parameters
 */
export interface AudioGenerationParams {
  text: string;
  voiceType: 'male' | 'female' | 'neutral';
  speed: number;
  pitch: number;
  language: string;
  emotion: 'neutral' | 'happy' | 'sad' | 'excited' | 'calm';
}

/**
 * Two-stage progress for video generation
 */
export interface TwoStageProgress {
  stage: 'latent' | 'upscaling';
  stageProgress: number;
  overallProgress: number;
  estimatedTimeRemaining: number;
}

/**
 * Export format options
 */
export type ExportFormat = 'original' | 'mp4' | 'webm' | 'png' | 'jpg' | 'wav' | 'mp3';

/**
 * Batch generation configuration
 * Requirements: 11.1, 11.2
 */
export interface BatchGenerationConfig {
  enabled: boolean;
  batchSize: number;
  variationParams: {
    varySeeds: boolean;
    seedRange?: [number, number];
    varyPrompts: boolean;
    promptVariations?: string[];
    varyParameters: boolean;
    parameterRanges?: Record<string, [number, number]>;
  };
}

/**
 * Batch generation task
 * Requirements: 11.2, 11.3
 */
export interface BatchGenerationTask {
  id: string;
  batchId: string;
  type: 'prompt' | 'image' | 'video' | 'audio';
  params: Record<string, unknown>;
  priority: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: GenerationProgress;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: GeneratedAsset;
  error?: string;
  batchIndex: number;
}

/**
 * Batch generation state
 * Requirements: 11.3, 11.4, 11.5
 */
export interface BatchGenerationState {
  id: string;
  config: BatchGenerationConfig;
  tasks: BatchGenerationTask[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  completedCount: number;
  failedCount: number;
  results: GeneratedAsset[];
  favorites: Set<string>; // Asset IDs marked as favorites
  discarded: Set<string>; // Asset IDs marked as discarded
  createdAt: number;
  completedAt?: number;
}

