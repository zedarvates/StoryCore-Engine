// Core Data Models for Creative Studio UI

// Import World types
import type { World } from './world';
// Import Character types
import type { Character } from './character';

// ============================================================================
// Shot and Related Types
// ============================================================================

export interface Shot {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  image?: string; // URL or base64
  
  // Audio tracks (enhanced)
  audioTracks: AudioTrack[];
  
  // Visual effects
  effects: Effect[];
  
  // Text layers
  textLayers: TextLayer[];
  
  // Keyframe animations
  animations: Animation[];
  
  // Transition to next shot
  transitionOut?: Transition;
  
  position: number; // order in sequence
  metadata?: Record<string, any>;
}

// ============================================================================
// Audio Types
// ============================================================================

export interface AudioTrack {
  id: string;
  name: string;
  type: 'music' | 'sfx' | 'dialogue' | 'voiceover' | 'ambient';
  url: string; // audio file URL
  
  // Timing
  startTime: number; // seconds from shot start
  duration: number; // seconds
  offset: number; // trim start of audio file
  
  // Volume and pan
  volume: number; // 0-100
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  pan: number; // -100 (left) to 100 (right) for stereo
  
  // Surround sound configuration
  surroundConfig?: SurroundConfig;
  
  // State
  muted: boolean;
  solo: boolean;
  
  // Effects
  effects: AudioEffect[];
  
  // Waveform data (for visualization)
  waveformData?: number[]; // amplitude values
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
  parameters?: Record<string, any>;
}

export interface Effect {
  id: string;
  type: 'filter' | 'adjustment' | 'overlay';
  name: string; // e.g., "vintage", "blur", "brightness"
  enabled: boolean;
  intensity: number; // 0-100
  parameters: Record<string, number>; // effect-specific parameters
}

// ============================================================================
// Text and Animation Types
// ============================================================================

export interface TextLayer {
  id: string;
  content: string;
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
  type: 'image' | 'audio' | 'template';
  url: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

export interface Project {
  schema_version: string; // "1.0" for Data Contract v1
  project_name: string;
  shots: Shot[];
  assets: Asset[];
  worlds?: World[]; // Story worlds created via wizard
  selectedWorldId?: string | null; // Currently active world for generation
  characters?: Character[]; // Characters for the project
  capabilities: {
    grid_generation: boolean;
    promotion_engine: boolean;
    qa_engine: boolean;
    autofix_engine: boolean;
    character_casting?: boolean; // Character casting add-on capability
  };
  generation_status: {
    grid: 'pending' | 'done' | 'failed' | 'passed';
    promotion: 'pending' | 'done' | 'failed' | 'passed';
  };
  // Character casting data (added for Data Contract v1 extension)
  casting?: {
    version: string;
    assignments: Array<{
      character_id: string;
      avatar_id: string;
      assigned_at: string;
    }>;
    last_modified: string;
  };
  metadata?: Record<string, any>;
}

// Import World type from world.ts
export type { World, Location, WorldRule, CulturalElements } from './world';

// Import Character types from character.ts
export type { Character, CharacterRelationship, VisualIdentity, Personality, Background, Role } from './character';

// Import Production Wizards types
export type { SequencePlan, Act, Scene } from './sequencePlan';
export type {
  ProductionShot,
  ShotType,
  TransitionType,
  ComfyUIParameters,
  CameraMovement,
  CharacterPosition
} from './shot';
export type {
  SequenceTemplate,
  ShotTemplate,
  GenerationPreset,
  ActTemplate,
  AssetTemplate
} from './template';
export type {
  WizardStep,
  ShotPreview,
  SequencePlanWizardState,
  ShotWizardState
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
  CharacterReference,
  SceneReference,
  WorldDefinition,
  Location as ProjectLocation,
  WorldMetadata,
  ShotInput,
  ValidationResult as ProjectValidationResult,
} from './project';

// ============================================================================
// Task Queue Types
// ============================================================================

export interface GenerationTask {
  id: string;
  shotId: string;
  type: 'grid' | 'promotion' | 'refine' | 'qa' | 'image' | 'video' | 'upscale' | 'inpaint';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number; // lower number = higher priority
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
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
