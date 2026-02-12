/**
 * Style Transfer Types
 * Type definitions for the Style Transfer Wizard
 */

// ============================================================================
// Enums
// ============================================================================

export const StyleTransferMode = {
  WORKFLOW: 'workflow',
  PROMPT: 'prompt',
  VIDEO: 'video'
} as const;

export type StyleTransferMode = typeof StyleTransferMode[keyof typeof StyleTransferMode];

export const MediaType = {
  IMAGE: 'image',
  VIDEO: 'video'
} as const;

export type MediaType = typeof MediaType[keyof typeof MediaType];

export const StylePresetName = {
  PHOTOREALISTIC: 'photorealistic',
  CINEMATIC: 'cinematic',
  ANIME: 'anime',
  OIL_PAINTING: 'oil_painting',
  CYBERPUNK: 'cyberpunk',
  WATERCOLOR: 'watercolor',
  SKETCH: 'sketch',
  VINTAGE: 'vintage',
  NOIR: 'noir',
  FANTASY: 'fantasy'
} as const;

export type StylePresetName = typeof StylePresetName[keyof typeof StylePresetName];


// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface WorkflowConfig {
  /** The ComfyUI workflow JSON (optional - uses default if not provided) */
  workflowJson?: Record<string, unknown>;
  /** Path to source image */
  sourceImagePath?: string;
  /** Path to style reference image */
  styleImagePath?: string;
  /** Output filename prefix */
  outputPrefix: string;
  /** Random seed (-1 for random) */
  seed: number;
  /** Number of inference steps */
  steps: number;
  /** CFG scale value */
  cfgScale: number;
  /** Output width */
  width: number;
  /** Output height */
  height: number;
  /** Model filename */
  modelName: string;
  /** CLIP model filename */
  clipName: string;
  /** VAE model filename */
  vaeName: string;
}


export interface PromptConfig {
  /** Path to source image */
  sourceImagePath: string;
  /** Style transfer prompt */
  prompt: string;
  /** Negative prompt */
  negativePrompt: string;
  /** Output filename prefix */
  outputPrefix: string;
  /** Random seed (-1 for random) */
  seed: number;
  /** Number of inference steps */
  steps: number;
  /** CFG scale value */
  cfgScale: number;
  /** Output width */
  width: number;
  /** Output height */
  height: number;
  /** Model filename */
  modelName: string;
  /** CLIP model filename */
  clipName: string;
  /** VAE model filename */
  vaeName: string;
}

export interface VideoConfig {
  /** Path to source video */
  videoPath: string;
  /** Path to reference style image */
  referenceImagePath: string;
  /** Output filename prefix */
  outputPrefix: string;
  /** Target frame rate */
  frameRate: number;
  /** Video duration in seconds */
  durationSeconds: number;
  /** Number of inference steps */
  steps: number;
  /** CFG scale value */
  cfgScale: number;
}

// ============================================================================
// Result Interfaces
// ============================================================================

export interface StyleTransferResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Path to output file (single) */
  outputPath?: string;
  /** Paths to output files (multiple) */
  outputPaths: string[];
  /** Prompt used for generation */
  promptUsed?: string;
  /** Workflow used for generation */
  workflowUsed?: Record<string, unknown>;
  /** Generation time in seconds */
  generationTime: number;
  /** Error message if failed */
  errorMessage?: string;
  /** Error details */
  error?: string;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}


export interface StyleTransferProgress {
  /** Progress message */
  message: string;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Current status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Current step description */
  currentStep?: string;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}


// ============================================================================
// Style Preset Interfaces
// ============================================================================

export interface StylePreset {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Style prompt */
  prompt: string;
  /** Description of the style */
  description: string;
  /** Preview image URL */
  thumbnail?: string;
  /** Category */
  category: string;
}

export interface StyleFeatures {
  /** Color palette as hex codes */
  colorPalette: string[];
  /** Lighting style description */
  lightingStyle: string;
  /** Composition style */
  compositionStyle: string;
  /** Art style */
  artStyle: string;
  /** Mood/atmosphere */
  mood: string;
  /** Texture style */
  textureStyle: string;
  /** Contrast level */
  contrast: 'low' | 'medium' | 'high';
  /** Saturation level */
  saturation: 'low' | 'medium' | 'high';
  /** Color temperature */
  temperature: 'cool' | 'neutral' | 'warm';
  /** Dominant colors with percentages */
  dominantColors: Array<{
    color: string;
    percentage: number;
  }>;
}

// ============================================================================
// Wizard State Interfaces
// ============================================================================

export interface StyleTransferWizardState {
  /** Current step in the wizard */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Selected mode */
  mode: StyleTransferMode;
  /** Media type being processed */
  mediaType: MediaType;
  /** Workflow configuration */
  workflowConfig?: WorkflowConfig;
  /** Prompt configuration */
  promptConfig?: PromptConfig;
  /** Video configuration */
  videoConfig?: VideoConfig;
  /** Selected style preset */
  selectedPreset?: StylePresetName;
  /** Custom prompt (if not using preset) */
  customPrompt?: string;
  /** Source file (image or video) */
  sourceFile?: File;
  /** Style reference file */
  styleReferenceFile?: File;
  /** Generation result */
  result?: StyleTransferResult;
  /** Whether operation is in progress */
  isProcessing: boolean;
  /** Progress information */
  progress?: StyleTransferProgress;
  /** Error message */
  error?: string;
}

// ============================================================================
// API Request/Response Interfaces
// ============================================================================

export interface StyleTransferRequest {
  /** Mode of operation */
  mode: StyleTransferMode;
  /** Configuration based on mode */
  config: WorkflowConfig | PromptConfig | VideoConfig;
  /** Project path for saving outputs */
  projectPath?: string;
}

export interface StyleTransferResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Result data */
  result?: StyleTransferResult;
  /** Error message if failed */
  error?: string;
}

export interface ModelInfo {
  /** Model identifier */
  id: string;
  /** Model name */
  name: string;
  /** Model filename */
  filename: string;
  /** Description */
  description: string;
  /** Required VRAM (GB) */
  vramRequired: number;
  /** Whether model is available */
  isAvailable: boolean;
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface StyleTransferWizardProps {
  /** Project path for saving outputs */
  projectPath?: string;
  /** Initial mode */
  initialMode?: StyleTransferMode;
  /** Callback when wizard completes */
  onComplete?: (result: StyleTransferResult) => void;
  /** Callback when wizard is cancelled */
  onCancel?: () => void;
  /** Callback when error occurs */
  onError?: (error: string) => void;
}

export interface ModeSelectorProps {
  /** Currently selected mode */
  selectedMode: StyleTransferMode;
  /** Callback when mode changes */
  onModeChange: (mode: StyleTransferMode) => void;
  /** Whether selector is disabled */
  disabled?: boolean;
}

export interface WorkflowStyleTransferProps {
  /** Configuration */
  config: WorkflowConfig;
  /** Callback when configuration changes */
  onConfigChange: (config: WorkflowConfig) => void;
  /** Source file */
  sourceFile?: File;
  /** Style reference file */
  styleFile?: File;
  /** Callback when source file changes */
  onSourceFileChange: (file: File) => void;
  /** Callback when style file changes */
  onStyleFileChange: (file: File) => void;
}

export interface PromptStyleTransferProps {
  /** Configuration */
  config: PromptConfig;
  /** Callback when configuration changes */
  onConfigChange: (config: PromptConfig) => void;
  /** Source file */
  sourceFile?: File;
  /** Callback when source file changes */
  onSourceFileChange: (file: File) => void;
  /** Selected preset */
  selectedPreset?: StylePresetName;
  /** Callback when preset changes */
  onPresetChange: (preset: StylePresetName) => void;
  /** Custom prompt */
  customPrompt?: string;
  /** Callback when custom prompt changes */
  onCustomPromptChange: (prompt: string) => void;
}

export interface StylePreviewProps {
  /** Source image URL */
  sourceUrl?: string;
  /** Style reference URL */
  styleUrl?: string;
  /** Result image URL */
  resultUrl?: string;
  /** Whether processing is in progress */
  isProcessing: boolean;
  /** Progress information */
  progress?: StyleTransferProgress;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface IStyleTransferService {
  /** Execute style transfer in workflow mode */
  executeWorkflowMode(config: WorkflowConfig, onProgress?: (progress: StyleTransferProgress) => void): Promise<StyleTransferResult>;
  /** Execute style transfer in prompt mode */
  executePromptMode(config: PromptConfig, onProgress?: (progress: StyleTransferProgress) => void): Promise<StyleTransferResult>;
  /** Execute video style transfer */
  executeVideoMode(config: VideoConfig, onProgress?: (progress: StyleTransferProgress) => void): Promise<StyleTransferResult>;
  /** Get available models */
  getAvailableModels(): Promise<ModelInfo[]>;
  /** Get available style presets */
  getAvailablePresets(): Promise<StylePreset[]>;
  /** Upload file to server */
  uploadFile(file: File): Promise<string>;
  /** Cancel ongoing operation */
  cancelOperation(): Promise<void>;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  outputPrefix: 'style_transfer',
  seed: -1,
  steps: 10,
  cfgScale: 1.0,
  width: 1024,
  height: 1024,
  modelName: 'flux-2-klein-9b-fp8.safetensors',
  clipName: 'qwen_3_8b_fp8mixed.safetensors',
  vaeName: 'flux2-vae.safetensors'
};


export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  sourceImagePath: '',
  prompt: '',
  negativePrompt: '',
  outputPrefix: 'prompt_style',
  seed: -1,
  steps: 10,
  cfgScale: 1.0,
  width: 1024,
  height: 1024,
  modelName: 'flux-2-klein-9b-fp8.safetensors',
  clipName: 'qwen_3_8b_fp8mixed.safetensors',
  vaeName: 'flux2-vae.safetensors'
};

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  videoPath: '',
  referenceImagePath: '',
  outputPrefix: 'video_style',
  frameRate: 30,
  durationSeconds: 5,
  steps: 10,
  cfgScale: 1.0
};

// ============================================================================
// Style Presets Data
// ============================================================================

export const STYLE_PRESETS: Record<StylePresetName, StylePreset> = {
  [StylePresetName.PHOTOREALISTIC]: {
    id: 'photorealistic',
    name: 'Photorealistic',
    prompt: 'change the style to photorealistic style, preserve image 1 details',
    description: 'Convert to photorealistic style while preserving details',
    category: 'Realistic'
  },
  [StylePresetName.CINEMATIC]: {
    id: 'cinematic',
    name: 'Cinematic',
    prompt: 'cinematic lighting, film still, professional cinematography, dramatic shadows, rich colors, high contrast, movie production quality, theatrical composition',
    description: 'Apply cinematic film look with dramatic lighting',
    category: 'Cinematic'
  },
  [StylePresetName.ANIME]: {
    id: 'anime',
    name: 'Anime',
    prompt: 'anime art style, stylized character design, vibrant colors, clean line work, Japanese animation style, detailed anime illustration',
    description: 'Convert to anime/manga style',
    category: 'Stylized'
  },
  [StylePresetName.OIL_PAINTING]: {
    id: 'oil_painting',
    name: 'Oil Painting',
    prompt: 'oil painting style, thick brushstrokes, classical art, textured canvas, rich pigments, artistic masterpiece, impasto technique',
    description: 'Apply oil painting effect with textured brushstrokes',
    category: 'Artistic'
  },
  [StylePresetName.CYBERPUNK]: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    prompt: 'cyberpunk aesthetic, neon lights, futuristic, high tech, dystopian atmosphere, glowing accents, dark moody, rain-slicked surfaces, neon reflections',
    description: 'Apply cyberpunk style with neon and futuristic elements',
    category: 'Sci-Fi'
  },
  [StylePresetName.WATERCOLOR]: {
    id: 'watercolor',
    name: 'Watercolor',
    prompt: 'watercolor painting style, soft washes, flowing colors, artistic watercolor illustration, wet-on-wet technique, delicate transparency',
    description: 'Apply soft watercolor painting effect',
    category: 'Artistic'
  },
  [StylePresetName.SKETCH]: {
    id: 'sketch',
    name: 'Sketch',
    prompt: 'pencil sketch style, line art, cross-hatching, graphite drawing, hand-drawn illustration, detailed sketch work',
    description: 'Convert to pencil sketch style',
    category: 'Drawing'
  },
  [StylePresetName.VINTAGE]: {
    id: 'vintage',
    name: 'Vintage',
    prompt: 'vintage aesthetic, retro style, faded colors, film grain, old photograph look, nostalgic atmosphere, sepia tones',
    description: 'Apply vintage retro look with film grain',
    category: 'Retro'
  },
  [StylePresetName.NOIR]: {
    id: 'noir',
    name: 'Film Noir',
    prompt: 'film noir style, black and white, high contrast, dramatic shadows, 1940s cinema aesthetic, chiaroscuro lighting, mysterious atmosphere',
    description: 'Apply classic film noir black and white style',
    category: 'Cinematic'
  },
  [StylePresetName.FANTASY]: {
    id: 'fantasy',
    name: 'Fantasy',
    prompt: 'fantasy art style, magical atmosphere, ethereal lighting, enchanted scene, mystical elements, dreamlike quality, fantasy illustration',
    description: 'Apply magical fantasy art style',
    category: 'Fantasy'
  }
};

