/**
 * Camera Angle Editor Types
 * 
 * TypeScript interfaces for the AI-powered camera angle editor feature.
 * Matches backend types from backend/camera_angle_types.py
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Camera angle preset identifiers
 */
export type CameraAnglePreset =
  | 'front'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'isometric'
  | 'back'
  | 'close_up'
  | 'wide_shot'
  | 'bird_eye'
  | 'worm_eye';

/**
 * Camera angle generation job status
 */
export type CameraAngleJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Generation quality levels
 */
export type CameraAngleQuality = 'draft' | 'standard' | 'high';

// ============================================================================
// Camera Angle Preset Metadata
// ============================================================================

/**
 * Metadata for a camera angle preset
 */
export interface CameraAnglePresetMetadata {
  id: CameraAnglePreset;
  displayName: string;
  description: string;
  icon: string;
  promptSuffix: string;
}

/**
 * Response from the presets endpoint
 */
export interface CameraAnglePresetsResponse {
  presets: CameraAnglePresetMetadata[];
  total: number;
}

// ============================================================================
// Request Models
// ============================================================================

/**
 * Request model for camera angle generation
 */
export interface CameraAngleRequest {
  /** Base64 encoded source image (with or without data URI prefix) */
  imageBase64: string;
  /** List of camera angle presets to generate */
  angleIds: CameraAnglePreset[];
  /** Maintain original image style in generated variations */
  preserveStyle?: boolean;
  /** Generation quality: draft, standard, or high */
  quality?: CameraAngleQuality;
  /** Random seed for reproducible generation */
  seed?: number | null;
  /** Additional custom prompt to append to angle prompts */
  customPrompt?: string | null;
}

// ============================================================================
// Job Models
// ============================================================================

/**
 * Camera angle generation job model
 */
export interface CameraAngleJob {
  /** Unique job identifier */
  id: string;
  /** User who created the job */
  userId: string;
  /** Source image (base64) */
  imageBase64: string;
  /** Angles to generate */
  angleIds: CameraAnglePreset[];
  /** Style preservation flag */
  preserveStyle: boolean;
  /** Generation quality */
  quality: CameraAngleQuality;
  /** Random seed */
  seed: number | null;
  /** Custom prompt */
  customPrompt: string | null;
  /** Current job status */
  status: CameraAngleJobStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current processing step description */
  currentStep: string | null;
  /** Completed angle generations */
  completedAngles: CameraAnglePreset[];
  /** Remaining angle generations */
  remainingAngles: CameraAnglePreset[];
  /** Error message if failed */
  error: string | null;
  /** Job creation timestamp (ISO format) */
  createdAt: string;
  /** Processing start timestamp (ISO format) */
  startedAt: string | null;
  /** Completion timestamp (ISO format) */
  completedAt: string | null;
  /** Job priority (1=highest, 10=lowest) */
  priority: number;
}

/**
 * Response model for job status queries
 */
export interface CameraAngleJobResponse {
  /** Job identifier */
  jobId: string;
  /** Current status */
  status: CameraAngleJobStatus;
  /** Progress percentage */
  progress: number;
  /** Current step description */
  currentStep: string | null;
  /** Completed angle IDs */
  completedAngles: string[];
  /** Remaining angle IDs */
  remainingAngles: string[];
  /** Error message if failed */
  error: string | null;
  /** Creation timestamp (ISO format) */
  createdAt: string;
  /** Start timestamp (ISO format) */
  startedAt: string | null;
  /** Completion timestamp (ISO format) */
  completedAt: string | null;
}

// ============================================================================
// Result Models
// ============================================================================

/**
 * Single camera angle generation result
 */
export interface CameraAngleResult {
  /** Unique result identifier */
  id: string;
  /** Camera angle preset used */
  angleId: CameraAnglePreset;
  /** Original source image */
  originalImageBase64: string;
  /** Generated image (base64) */
  generatedImageBase64: string;
  /** Full prompt used for generation */
  promptUsed: string;
  /** Generation time in seconds */
  generationTimeSeconds: number;
  /** Additional metadata (model, steps, cfg_scale, etc.) */
  metadata: Record<string, unknown>;
}

/**
 * Response model for camera angle results
 */
export interface CameraAngleResultResponse {
  /** Job identifier */
  jobId: string;
  /** Job status */
  status: CameraAngleJobStatus;
  /** List of generated results */
  results: CameraAngleResult[];
  /** Total generation time in seconds */
  totalGenerationTime: number;
}

// ============================================================================
// Cancel Response Model
// ============================================================================

/**
 * Response model for job cancellation
 */
export interface CameraAngleCancelResponse {
  /** Job identifier */
  jobId: string;
  /** Current job status */
  status: CameraAngleJobStatus;
  /** Cancellation result message */
  message: string;
}

// ============================================================================
// API Error Response
// ============================================================================

/**
 * Standard API error response
 */
export interface CameraAngleApiError {
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** Additional details */
  details?: Record<string, unknown>;
}

// ============================================================================
// Store Types
// ============================================================================

/**
 * State for a single generation job in the store
 */
export interface CameraAngleJobState {
  jobId: string | null;
  status: CameraAngleJobStatus;
  progress: number;
  currentStep: string | null;
  completedAngles: CameraAnglePreset[];
  remainingAngles: CameraAnglePreset[];
  error: string | null;
  results: CameraAngleResult[];
  isLoading: boolean;
}

/**
 * Store state for camera angle editor
 */
export interface CameraAngleStoreState {
  // Current job state
  currentJob: CameraAngleJobState;
  
  // Available presets
  presets: CameraAnglePresetMetadata[];
  presetsLoaded: boolean;
  
  // Selected angles for generation
  selectedAngles: CameraAnglePreset[];
  
  // Source image
  sourceImage: string | null;
  
  // Generation options
  options: {
    preserveStyle: boolean;
    quality: CameraAngleQuality;
    seed: number | null;
    customPrompt: string | null;
  };
  
  // Error state
  error: string | null;
}

/**
 * Store actions for camera angle editor
 */
export interface CameraAngleStoreActions {
  // Job actions
  startGeneration: (request: CameraAngleRequest) => Promise<string>;
  fetchJobStatus: (jobId: string) => Promise<void>;
  fetchJobResult: (jobId: string) => Promise<CameraAngleResultResponse>;
  cancelJob: (jobId: string) => Promise<void>;
  resetJob: () => void;
  
  // Preset actions
  fetchPresets: () => Promise<void>;
  
  // Selection actions
  setSelectedAngles: (angles: CameraAnglePreset[]) => void;
  toggleAngle: (angle: CameraAnglePreset) => void;
  
  // Source image actions
  setSourceImage: (imageBase64: string | null) => void;
  
  // Options actions
  setOptions: (options: Partial<CameraAngleStoreState['options']>) => void;
  
  // Error actions
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * Complete store type combining state and actions
 */
export type CameraAngleStore = CameraAngleStoreState & CameraAngleStoreActions;
