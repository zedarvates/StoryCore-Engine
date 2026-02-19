// Core Data Models for Creative Studio UI

// Import World types
import type { World } from './world';
// Import Generation types
export type {
  GenerationTask as CoreGenerationTask,
  GenerationPipelineState,
  StageState,
  GeneratedAsset,
  GeneratedPrompt
} from './generation';

// Import Character types
import type { Character } from './character';
// Import Story types
import type { Story, StoryVersion } from './story';
// Import Asset types
import type { AssetMetadata } from './asset';
// Import StoryObject types
import type { StoryObject } from './object';
// Import Shot and Production types
import type { ShotType, TransitionType, ComfyUIParameters } from './shot';
import type { SequencePlan, Act, Scene } from './sequencePlan';
// Import Location Logic Loop types
import type {
  LocationFunctionType,
  LocationSubFunction,
  ConstraintType,
  ConstraintSeverity,
  LocationConstraint,
  LocationConstraints,
  LocationCulture,
  LocationReputation,
  EmergentDetails,
  LocationLogicLoop,
  LogicLoopGenerationRequest,
  LogicLoopLocationResponse,
  FunctionOption,
  FrameworkInfo,
  ExampleLocation,
  getFunctionOptions,
  getConstraintTypes,
  createEmptyLogicLoop
} from './locationLogicLoop';

// ============================================================================
// Shot and Related Types
// ============================================================================

export interface Shot {
  id: string;
  title?: string;
  description?: string;
  duration: number; // in seconds
  image?: string; // URL or base64
  position: number; // order in sequence

  // Data Contract v1 / Dashboard Compatibility (snake_case for persistence)
  sequence_id?: string;
  start_time?: number;
  prompt?: string;
  generated_image_url?: string;
  status?: string;
  progress?: number;
  promoted_panel_path?: string;

  // CamelCase Aliases (for dashboard/store compatibility)
  sequenceId?: string;
  startTime?: number;
  generatedImageUrl?: string;
  name?: string; // alias for title
  orderIndex?: number; // alias for position
  thumbnailUrl?: string; // alias for image

  // Wizard / Production specific
  number?: number; // Alias for position
  type?: ShotType;
  category?: 'establishing' | 'action' | 'dialogue' | 'reaction' | 'insert' | 'transition' | 'custom';
  timing?: {
    duration: number;
    inPoint: number;
    outPoint: number;
    transition: TransitionType;
    transitionDuration: number;
    trimStart?: number;
    trimEnd?: number;
  };

  // Generation metadata
  generation?: {
    aiProvider: string;
    model: string;
    prompt: string;
    negativePrompt: string;
    comfyuiPreset: string;
    parameters: ComfyUIParameters;
    styleReferences: string[];
    seed?: number;
    referenceImage?: string;
  };

  // Audio tracks
  audioTracks?: AudioTrack[];

  // Visual effects
  effects?: Effect[];

  // Text layers
  textLayers?: TextLayer[];

  // Keyframe animations
  animations?: Animation[];

  // Transition to next shot
  transitionOut?: Transition;

  metadata?: Record<string, unknown>;
  referenceImage?: string; // Legacy/AI
  result_url?: string;

  // Dashboard compatibility
  promptValidation?: {
    isValid: boolean;
    errors: Array<{
      type: 'empty' | 'too_short' | 'too_long' | 'invalid_characters';
      message: string;
      field: string;
    }>;
    warnings: Array<{
      type: 'inconsistent' | 'vague' | 'missing_detail';
      message: string;
      suggestion?: string;
    }>;
    suggestions: string[];
  };
}

// ============================================================================
// Audio Types
// ============================================================================

export interface AudioTrack {
  id: string;
  name: string;
  type?: 'music' | 'sfx' | 'dialogue' | 'voiceover' | 'ambient'; // Made optional
  url: string; // audio file URL

  // Timing
  startTime?: number; // seconds from shot start
  duration?: number; // seconds
  offset?: number; // trim start of audio file

  // Volume and pan
  volume: number; // 0-100
  fadeIn?: number; // seconds
  fadeOut?: number; // seconds
  pan?: number; // -100 (left) to 100 (right) for stereo

  // Surround sound configuration
  surroundConfig?: SurroundConfig;

  // State
  muted?: boolean;
  solo?: boolean;

  // Effects
  effects?: AudioEffect[];

  // Waveform data (for visualization)
  waveformData?: number[]; // amplitude values

  // Metadata for dialogue tracks and others
  metadata?: {
    speaker?: string;
    emotion?: string;
    [key: string]: unknown;
  };
}

export interface SurroundConfig {
  mode: 'stereo' | '5.1' | '7.1';

  // Channel levels (0-100) for surround modes
  channels: {
    // Stereo
    left?: number;
    right?: number;

    // 5.1 Surround
    frontLeft?: number;
    frontRight?: number;
    center?: number;
    lfe?: number; // Low Frequency Effects (subwoofer)
    surroundLeft?: number;
    surroundRight?: number;

    // 7.1 Surround (adds side channels)
    sideLeft?: number;
    sideRight?: number;
  };

  // Spatial positioning (for automatic panning)
  spatialPosition?: {
    x: number; // -1 (left) to 1 (right)
    y: number; // -1 (back) to 1 (front)
    z: number; // 0 (ground) to 1 (height)
  };

  // LLM-suggested preset based on scene
  aiSuggestedPreset?: string; // e.g., "dialogue-center", "ambient-surround", "action-full"
}

export interface AudioEffect {
  id: string;
  type: 'limiter' | 'eq' | 'compressor' | 'voice-clarity' | 'noise-reduction' | 'reverb' | 'distortion' | 'bass-boost' | 'treble-boost' | 'gain';
  enabled: boolean;
  preset?: 'podcast' | 'music-video' | 'cinematic' | 'dialogue' | 'custom';
  parameters: AudioEffectParameters;

  // Automation curve (like Houdini)
  automationCurve?: AutomationCurve;
}

export interface AutomationCurve {
  id: string;
  parameter: string; // which parameter to automate (e.g., 'gain', 'distortion', 'bass')
  keyframes: AudioKeyframe[];
  interpolation: 'linear' | 'smooth' | 'step' | 'bezier';
}

export interface AudioKeyframe {
  id: string;
  time: number; // seconds from track start
  value: number; // parameter value at this time
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  bezierControlPoints?: { cp1: Point; cp2: Point };
}

export interface AudioEffectParameters {
  // Limiter
  threshold?: number; // dB
  ceiling?: number; // dB
  release?: number; // ms

  // EQ
  lowGain?: number; // dB
  midGain?: number; // dB
  highGain?: number; // dB

  // Compressor
  ratio?: number; // 1:1 to 20:1
  attack?: number; // ms

  // Voice Clarity (auto mode)
  intensity?: number; // 0-100

  // Noise Reduction
  noiseFloor?: number; // dB

  // Gain
  gain?: number; // dB (-60 to +60)

  // Distortion
  distortion?: number; // 0-100 (amount of distortion)
  distortionType?: 'soft' | 'hard' | 'tube' | 'fuzz';

  // Bass Boost
  bassFrequency?: number; // Hz (default 100)
  bassGain?: number; // dB (-12 to +12)
  bassQ?: number; // Quality factor (0.1 to 10)

  // Treble Boost
  trebleFrequency?: number; // Hz (default 8000)
  trebleGain?: number; // dB (-12 to +12)
  trebleQ?: number; // Quality factor (0.1 to 10)

  // Reverb
  roomSize?: number; // 0-1 (size of the room)
  damping?: number; // 0-1 (high frequency absorption)
  wetLevel?: number; // 0-1 (reverb signal level)
  dryLevel?: number; // 0-1 (original signal level)
  preDelay?: number; // ms (delay before reverb starts)
  decay?: number; // seconds (reverb tail length)
}

export interface VoiceOver {
  id: string;
  text: string;
  voice: 'male' | 'female' | 'neutral' | string; // voice ID
  language: string; // 'en-US', 'fr-FR', etc.
  speed: number; // 0.5 to 2.0
  pitch: number; // -10 to 10
  emotion?: 'neutral' | 'happy' | 'sad' | 'excited' | 'calm';
  generatedAudioUrl?: string;
}

// ============================================================================
// Visual Effects and Transitions
// ============================================================================

export interface Transition {
  id: string;
  type: 'fade' | 'dissolve' | 'wipe' | 'slide' | 'zoom' | 'custom';
  duration: number; // in seconds
  direction?: 'left' | 'right' | 'up' | 'down'; // for directional transitions
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  parameters?: Record<string, unknown>;
}

export interface Effect {
  id: string;
  type: string; // 'filter' | 'adjustment' | 'overlay' or custom
  name: string; // e.g., "vintage", "blur", "brightness"
  enabled?: boolean;
  intensity?: number; // 0-100
  parameters?: Record<string, unknown>; // effect-specific parameters
}

// ============================================================================
// Text and Animation Types
// ============================================================================

export interface TextLayer {
  id: string;
  content: string;
  text?: string; // Alias for content, for compatibility
  font: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  position: { x: number; y: number }; // percentage of shot dimensions
  alignment: 'left' | 'center' | 'right';
  startTime: number; // seconds from shot start
  duration: number; // seconds
  animation?: TextAnimation;
  style: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    stroke?: { color: string; width: number };
    shadow?: { x: number; y: number; blur: number; color: string };
  };
}

export interface TextAnimation {
  type: 'fade-in' | 'fade-out' | 'slide-in' | 'slide-out' | 'typewriter' | 'bounce';
  duration: number; // seconds
  delay: number; // seconds
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface Animation {
  id: string;
  property: 'position' | 'scale' | 'rotation' | 'opacity';
  keyframes: Keyframe[];
}

export interface Keyframe {
  id: string;
  time: number; // seconds from shot start
  value: number | { x: number; y: number }; // depends on property
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';
  bezierControlPoints?: { cp1: Point; cp2: Point }; // for bezier curves
}

export interface Point {
  x: number;
  y: number;
}

// ============================================================================
// Project and Asset Types
// ============================================================================

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'video' | 'template';
  url: string;
  thumbnail?: string;
  metadata?: AssetMetadata;
  // Extended properties for sequence editor compatibility
  category?: string;
  subcategory?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  tags?: string[];
  source?: 'builtin' | 'user' | 'ai-generated';
  createdAt?: number; // timestamp
  path?: string; // Local file path if available
}

export interface Project {
  id: string;
  schema_version: string; // "1.0" for Data Contract v1
  project_name: string;
  path?: string;
  shots: Shot[];
  assets: Asset[];
  worlds?: World[];
  selectedWorldId?: string | null;
  characters?: Character[];
  stories?: Story[];
  storyVersions?: StoryVersion[];
  objects?: StoryObject[];

  // Dashboard / Generation metadata
  audio_phrases?: any[]; // For DialoguePhrase
  master_coherence_sheet?: {
    url: string;
    generated_at: number;
  };
  generation_history?: any[];

  capabilities: {
    grid_generation: boolean;
    promotion_engine: boolean;
    qa_engine: boolean;
    autofix_engine: boolean;
    character_casting?: boolean;
    voice_generation?: boolean;
  };
  generation_status: {
    grid: 'pending' | 'done' | 'failed' | 'passed';
    promotion: 'pending' | 'done' | 'failed' | 'passed';
    wizard?: 'pending' | 'done' | 'failed' | 'passed';
  };

  // CamelCase Aliases (for dashboard compatibility)
  name?: string; // alias for project_name
  schemaVersion?: string; // alias for schema_version
  audioPhrases?: any[]; // alias for audio_phrases
  generationHistory?: any[]; // alias for generation_history

  storyboard?: Shot[]; // Data Contract v1 alias for shots
  casting?: {
    version: string;
    assignments: Array<{
      character_id: string;
      avatar_id: string;
      assigned_at: number;
    }>;
    last_modified: number;
  };
  metadata?: Record<string, unknown>;
  global_resume?: string;
}

// Import World type from world.ts
export type { World, Location, WorldRule, CulturalElements } from './world';

// Import Character types from character.ts
export type { Character, CharacterRelationship, VisualIdentity, Personality, Background, Role } from './character';

// Import Story types from story.ts
export type {
  Story,
  CharacterReference,
  LocationReference,
  AutoGeneratedElement,
  StoryDraft,
  StoryVersion,
  StoryGenerationParams,
  WorldContext,
  CharacterCreationRequest,
  LocationCreationRequest,
  GenerationProgress,
  ExportOptions,
  StorySetupData,
  CharacterSelectionData,
  LocationSelectionData
} from './story';

// Import Production Wizards types
export type { SequencePlan, Act, Scene } from './sequencePlan';
export type {
  ProductionShot,
  ShotType,
  TransitionType,
  ComfyUIParameters,
  CameraMovement
} from './shot';
export type {
  SequenceTemplate,
  ShotTemplate,
  GenerationPreset,
  ActTemplate,
  AssetTemplate
} from './template';
export type {
  WizardStep
} from './wizard';

// Import Asset types from asset.ts
export type {
  AssetType,
  AssetMetadata,
  ValidationResult as AssetValidationResult,
  ImportResult as AssetImportResult,
  AssetValidationRules,
} from './asset';
export { ASSET_VALIDATION_RULES } from './asset';

// Import Grid Editor types from gridEditor.ts
export type {
  Point as GridPoint,
  Rectangle as GridRectangle,
  Transform,
  CropRegion,
  BlendMode,
  LayerType,
  ImageContent,
  DrawingElement,
  TextAnnotation,
  AnnotationContent,
  EffectContent,
  LayerContent,
  Layer,
  PanelPosition,
  PanelMetadata,
  Panel,
  Preset,
  GridMetadata,
  GridConfiguration,
  Tool,
  TransformType,
  OperationType,
  Operation,
  ViewportState,
  PanelGenerationConfig,
  GeneratedImage,
  ErrorCategory,
  ErrorSeverity,
  RecoveryOption,
  ErrorReport,
} from './gridEditor';
export { GRID_CONSTANTS, DEFAULT_TRANSFORM, DEFAULT_CROP_REGION, DEFAULT_VIEWPORT_STATE } from './gridEditor';

// Import Advanced Grid Editor types from gridEditorAdvanced.ts
export type {
  VideoPlayerState,
  VideoPlayerProps,
  VideoSequencePlayerProps,
  VideoThumbnailPreviewProps,
  PlaybackSpeed,
  TimecodeFormat,
  DragItemType,
  DragDropConfig,
  Position,
  DropTarget,
  DragState,
  DraggableShotProps,
  GridLayoutConfig,
  GridLayoutProps,
  GridPanel,
  AlignmentGuide,
  GridSize,
  ThumbnailCacheConfig,
  CacheEntry,
  ThumbnailCacheStats,
  PerformanceMetrics,
  PerformanceMonitorConfig,
  ContextMenuItem,
  ContextMenuProps,
  HistoryEntry,
  UndoRedoState,
  BatchOperationType,
  BatchOperation,
  BatchOperationResult,
  BatchOperationsToolbarProps,
  WorkerTask,
  WorkerMessage,
  WorkerPoolConfig,
  ShotFrameViewerProps,
  FrameNavigationState,
  InOutPoint,
  AnimationConfig,
  AnimationVariants,
  Breakpoint,
  BreakpointConfig,
  ResponsiveGridConfig,
  SearchOperator,
  SearchCriteria,
  SearchFilter,
  PredefinedFilter,
  ExportConfiguration,
  ExportFormat,
  ImportResult as GridEditorImportResult,
} from './gridEditorAdvanced';
export {
  PositionSchema,
  GridLayoutConfigSchema,
  ThumbnailCacheConfigSchema,
  ExportConfigurationSchema,
  isPosition,
  isGridLayoutConfig,
  isThumbnailCacheConfig,
  isExportConfiguration,
} from './gridEditorAdvanced';

// Import Grid Editor validation utilities
export {
  PointSchema,
  RectangleSchema,
  TransformSchema,
  CropRegionSchema,
  LayerSchema,
  PanelSchema,
  GridConfigurationSchema,
  isPoint,
  isRectangle,
  isTransform,
  isCropRegion,
  isLayer,
  isPanel,
  isGridConfiguration,
  isImageContent,
  isAnnotationContent,
  isEffectContent,
  isBlendMode,
  isLayerType,
  isTool,
  isTransformType,
  isOperationType,
  isErrorCategory,
  isErrorSeverity,
  validateGridConfiguration,
  validatePanel,
  validateTransform,
  validateCropRegion,
  validateLayer,
  clamp,
  constrainCropRegion,
  constrainTransform,
  constrainZoom,
  constrainOpacity,
  snapRotation,
  isValidPanelPosition,
  generatePanelId,
  parsePanelId,
} from './gridEditor.validation';

// Import Grid Editor factory functions
export {
  createPoint,
  createTransform,
  createIdentityTransform,
  createCropRegion,
  createFullCropRegion,
  createImageContent,
  createAnnotationContent,
  createEffectContent,
  generateLayerId,
  createImageLayer,
  createAnnotationLayer,
  createEffectLayer,
  createEmptyPanel,
  createPanelWithImage,
  createEmptyGridConfiguration,
  generatePresetId,
  createPreset,
  createDefaultPreset,
  createViewportState,
  createOperation,
  createCinematicPreset,
  createComicBookPreset,
  createPortraitPreset,
  createLandscapePreset,
  getPredefinedPresets,
} from './gridEditor.factories';

// Import Project types from project.ts
export type {
  ProjectData,
  ProjectCapabilities,
  GenerationStatus as ProjectGenerationStatus,
  SceneReference,
  WorldDefinition,
  Location as ProjectLocation,
  WorldMetadata,
  ShotInput,
  ValidationResult as ProjectValidationResult,
} from './project';

// Import Project Discovery types from projectDiscovery.ts
export type {
  DiscoveredProject,
  DiscoveryResult,
  ScanProjectsOptions,
  IPCResponse,
  ScanProjectsResponse,
  MergedProject,
  MergedProjectsResponse,
  RefreshProjectsResponse,
} from './projectDiscovery';
export { ProjectDiscoveryErrorCode } from './projectDiscovery';

// Import ProjectDashboard types from projectDashboard.ts
export type {
  Shot as DashboardShot,
  DialoguePhrase,
  VoiceParameters,
  PromptValidation,
  ValidationError as PromptValidationError,
  ValidationWarning,
  GenerationResults,
  GeneratedShot,
  QAReport,
  GenerationError,
  GenerationStatus as DashboardGenerationStatus,
  Project as DashboardProject,
  Sequence,
  GenerationRecord,
} from './projectDashboard';

// Import Menu Configuration types from menuConfig.ts
export type {
  MenuItemType,
  ActionContext,
  MenuItemConfig,
  MenuConfig,
  MenuBarConfig,
} from './menuConfig';
export {
  isEnabledFunction,
  isVisibleFunction,
  isCheckedFunction,
  evaluateEnabled,
  evaluateVisible,
  evaluateChecked,
  MenuConfigError,
} from './menuConfig';
export {
  VoiceParametersSchema,
  ValidationErrorSchema,
  ValidationWarningSchema,
  PromptValidationSchema,
  ShotSchema as DashboardShotSchema,
  DialoguePhraseSchema,
  GeneratedShotSchema,
  QAReportSchema,
  GenerationErrorSchema,
  GenerationResultsSchema,
  GenerationStatusSchema as DashboardGenerationStatusSchema,
  SequenceSchema,
  GenerationRecordSchema,
  ProjectSchema as DashboardProjectSchema,
  isValidPrompt,
  isDialoguePhraseValid,
  hasValidPrompts,
} from './projectDashboard';

// Import Electron types
export type { StoryCoreElectronAPI as ElectronAPI, Project as ElectronProject, ProjectData as ElectronProjectData } from './electron';

// ============================================================================
// Task Queue Types
// ============================================================================

export interface GenerationTask {
  id: string;
  shotId: string;
  type: 'grid' | 'promotion' | 'refine' | 'qa' | 'image' | 'video' | 'upscale' | 'inpaint';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number; // lower number = higher priority
  createdAt: number; // timestamp
  startedAt?: number; // timestamp
  completedAt?: number; // timestamp
  error?: string;

  // ComfyUI workflow parameters
  prompt?: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  scheduler?: string;
}

/**
 * Task queue item from backend API
 */
export interface TaskQueueItem {
  job_id: string;
  project_id: string;
  prompt: string;
  shot_count: number;
  style?: string;
  mood?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  current_step?: string;
  priority: number; // 1 = highest, 10 = lowest
  estimated_time?: number;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

/**
 * Task queue response from backend API
 */
export interface TaskQueueResponse {
  tasks: TaskQueueItem[];
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
}

/**
 * Priority update response from backend API
 */
export interface PriorityUpdateResponse {
  job_id: string;
  old_priority: number;
  new_priority: number;
  message: string;
}

/**
 * Retry response from backend API
 */
export interface RetryResponse {
  job_id: string;
  old_status: string;
  new_status: string;
  message: string;
}

/**
 * Queue statistics response from backend API
 */
export interface QueueStatsResponse {
  total_jobs: number;
  pending_jobs: number;
  processing_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  cancelled_jobs: number;
  average_wait_time: number;
  estimated_completion_time?: number;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface PanelSizes {
  assetLibrary: number; // percentage
  canvas: number;
  propertiesOrChat: number;
}

export interface AppState {
  // Project data
  project: Project | null;
  shots: Shot[];
  assets: Asset[];
  worlds: World[]; // Story worlds for the project
  selectedWorldId: string | null; // Currently active world
  characters: Character[]; // Characters for the project
  stories: Story[]; // Stories for the project
  storyVersions: StoryVersion[]; // Version history for stories
  objects: StoryObject[]; // Story objects, props, and artifacts

  // UI state
  selectedShotId: string | null;
  currentTime: number;
  showChat: boolean;
  showTaskQueue: boolean;
  panelSizes: PanelSizes;

  // Task queue
  taskQueue: GenerationTask[];

  // Backend communication
  generationStatus: GenerationStatus;

  // Playback state
  isPlaying: boolean;
  playbackSpeed: number; // 0.25, 0.5, 1, 1.5, 2

  // Undo/Redo
  history: HistoryState[];
  historyIndex: number;

  // Selection state
  selectedEffectId: string | null;
  selectedTextLayerId: string | null;
  selectedKeyframeId: string | null;
}

export interface GenerationStatus {
  isGenerating: boolean;
  currentTask?: GenerationTask;
  progress: number; // 0-100
  message?: string;
}

export interface HistoryState {
  shots: Shot[];
  project: Project | null;
  assets: Asset[];
  selectedShotId: string | null;
  taskQueue: GenerationTask[];
}

// ============================================================================
// Surround Sound Preset Type
// ============================================================================

export interface SurroundPreset {
  name: string;
  mode: '5.1' | '7.1';
  channels: SurroundConfig['channels'];
  description: string;
}

// ============================================================================
// Voice Type for TTS
// ============================================================================

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  preview_url?: string;
}

// ============================================================================
// Voice Recording Types
// ============================================================================

/**
 * Voice recording data for upload to backend
 */
export interface VoiceRecording {
  audioBlob: Blob;
  filename: string;
  userId: string;
  sessionId: string;
  timestamp: string;
  duration: number;
  sampleRate: number;
}

/**
 * Phrase data for synchronization with backend
 */
export interface PhraseData {
  id: string;
  text: string;
  startTime?: number;
  endTime?: number;
  speakerId?: string;
  emotion?: string;
  recordingId?: string;
}

// ============================================================================
// Chat Assistant Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[]; // Suggested follow-up actions
}

export interface ChatSuggestion {
  id: string;
  text: string;
  action?: () => void;
}


