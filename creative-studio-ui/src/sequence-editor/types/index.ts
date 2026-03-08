/**
 * Type definitions for Sequence Editor Interface
 * 
 * These types define the data structures used throughout the sequence editor,
 * matching the design document specifications.
 */

// ============================================================================
// Project Types
// ============================================================================

export interface ProjectMetadata {
  id?: string;
  name: string;
  path: string;
  created: number;
  modified: number;
  author: string;
  description: string;
}

export interface ProjectSettings {
  resolution: { width: number; height: number };
  format: 'mp4' | 'mov' | 'webm';
  fps: number;
  quality: 'draft' | 'preview' | 'final';
}

export interface SaveStatus {
  state: 'saved' | 'modified' | 'saving' | 'error';
  lastSaveTime?: number; // Timestamp in milliseconds for Redux serialization
  error?: string;
}

export interface GenerationStatus {
  state: 'idle' | 'processing' | 'complete' | 'error';
  stage?: 'grid' | 'promotion' | 'qa' | 'export';
  progress?: number; // 0-100
  error?: string;
}

export interface ProjectState {
  metadata: ProjectMetadata | null;
  settings: ProjectSettings;
  saveStatus: SaveStatus;
  generationStatus: GenerationStatus;
}

// ============================================================================
// Timeline Types
// ============================================================================

export type LayerType = 'media' | 'audio' | 'effects' | 'transitions' | 'text' | 'keyframes';

export interface Transform {
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  anchor: { x: number; y: number };
}


export interface VideoMask {
  type: 'shape' | 'image' | 'alpha';
  source?: string;
  invert?: boolean;
}

export interface VideoEffects {
  chromaKey?: { color: string; similarity: number };
  colorCorrection?: {
    brightness: number;
    contrast: number;
    saturation: number;
    hue: number;
  };
  blur?: number;
  vignette?: {
    intensity: number;  // 0-100
    roundness: number;  // 0-100
    softness: number;   // 0-100
  };
}

export interface MediaLayerData {
  sourceUrl: string;
  trim: { start: number; end: number };
  transform: Transform;
  mask?: VideoMask;
  effects?: VideoEffects;
}

export interface AudioLayerData {
  sourceUrl: string;
  volume: number; // 0-1
  fadeIn: number; // Duration in frames
  fadeOut: number;
}

export interface EffectsLayerData {
  effectType: string;
  parameters: Record<string, unknown>;
}

export interface TransitionLayerData {
  transitionType: 'fade' | 'dissolve' | 'wipe' | 'slide' | 'smooth-cut';
  duration: number;
  easing: string;
}

export interface TextAnimation {
  type: string;
  duration: number;
  parameters: Record<string, unknown>;
}

export interface RichTextStyle {
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  fillColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  backgroundColor?: string;
  padding?: number;
  textAlign?: 'left' | 'center' | 'right';
}

export interface TextLayerData {
  content: string;
  style: RichTextStyle;
  transform: Transform; // Position is now part of transform
  animation?: TextAnimation;
  // Legacy fields for backward compatibility (optional)
  font?: string;
  size?: number;
  color?: string;
  position?: { x: number; y: number };
}

export interface TimelineKeyframe {
  id: string; // Unique identifier
  time: number; // Frame number
  value: number; // Numeric value for interpolation
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';
  controlPoints?: {
    cp1: { x: number; y: number }; // Relative to keyframe [0,1]
    cp2: { x: number; y: number };
  };
}

export interface KeyframeLayerData {
  property: string; // Property being animated
  keyframes: TimelineKeyframe[];
  interpolation: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

// ============================================================================
// TTS and Speech Types
// ============================================================================

export interface TTSCharacter {
  id: string;
  name: string;
  voiceId?: string;
  language?: string;
  gender?: 'male' | 'female' | 'neutral';
  preview?: string; // URL to voice preview
}

export interface TTSMethod {
  id: string;
  name: string;
  provider: 'elevenlabs' | 'openai' | 'coqui' | 'sapi' | 'local';
  requiresApiKey?: boolean;
  supportedLanguages?: string[];
  voiceCount?: number;
}

export interface SpeechLayerData {
  text: string;
  characterId?: string;
  characterName?: string;
  ttsMethod?: string;
  voiceId?: string;
  speed: number; // 0.5 - 2.0
  pitch: number; // -10 to +10
  volume: number; // 0-1
  emotion?: string;
  // Generated audio
  audioUrl?: string;
  audioDuration?: number; // in frames
  generatedAt?: number;
}

export type LayerData =
  | MediaLayerData
  | AudioLayerData
  | EffectsLayerData
  | TransitionLayerData
  | TextLayerData
  | KeyframeLayerData
  | SpeechLayerData;

export interface Layer {
  id: string;
  type: LayerType;
  startTime: number; // Relative to shot start
  duration: number;
  locked: boolean;
  hidden: boolean;
  opacity: number; // 0-1
  blendMode: string;
  data: LayerData;
  animations?: Record<string, TimelineKeyframe[]>; // Property name -> keyframes
}

export interface GenerationParameters {
  seed: number;
  denoising: number;
  steps: number;
  guidance: number;
  sampler: string;
  scheduler: string;
}

export interface ReferenceImage {
  id: string;
  url: string;
  weight: number; // 0-1, influence on generation
  source: 'library' | 'upload' | 'generated';
}

export interface StyleApplication {
  shotId: string;
  styleId: string;
  styleName: string;
  intensity: number; // 0-100
  parameters: StyleParameters;
  appliedAt: number;
}

export interface StyleParameters {
  colorPalette?: string[];
  artisticStyle?: string;
  filterType?: string;
  blendMode?: string;
  saturation?: number;
  contrast?: number;
  brightness?: number;
  temperature?: number;
  tint?: number;
  vignette?: number;
  grain?: number;
  sharpness?: number;
}

export interface Shot {
  id: string;
  name: string;
  startTime: number; // Frame number
  duration: number; // Frame count
  layers: Layer[];
  referenceImages: ReferenceImage[];
  prompt: string;
  animationPrompt?: string;
  parameters: GenerationParameters;
  generationStatus: 'pending' | 'processing' | 'complete' | 'error';
  outputPath?: string; // Path to generated media
  qaScore?: number; // Quality assessment score
  visualStyle?: StyleApplication; // Applied visual style
  modified?: boolean; // Track if shot has been modified
  // Transitions (Phase 1 - R&D)
  transitions?: {
    in?: {
      type: string;
      duration: number;
      appliedAt: number;
    };
    out?: {
      type: string;
      duration: number;
      appliedAt: number;
    };
  };
  rigPath?: string;
  boneCount?: number;
  hash?: string;

  gltfPath?: string;
  referenceImage?: string;
  sheet?: unknown;
}

export interface Track {
  id: string;
  type: LayerType;
  height: number;
  locked: boolean;
  hidden: boolean;
  color: string;
  icon: string;
}

// ============================================================================
// Marker and Region Types
// ============================================================================

export type MarkerType =
  | 'info'        // Information marker
  | 'warning'     // Warning marker
  | 'error'       // Error marker
  | 'important'   // Important frame marker
  | 'bookmark'    // Bookmark marker
  | 'custom';     // Custom user marker

export interface TimelineMarker {
  id: string;
  type: MarkerType;
  position: number;        // Frame number
  color: string;           // Custom color override
  label: string;           // Short label for marker
  description?: string;    // Detailed description
  trackId?: string;        // Optional track association
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export type RegionType =
  | 'work'        // Work area
  | 'selection'   // Selection range
  | 'gap'         // Gap between clips
  | 'loop'        // Loop region
  | 'highlight'   // Highlighted area
  | 'comment';    // Comment region

export interface TimelineRegion {
  id: string;
  type: RegionType;
  start: number;           // Start frame
  end: number;             // End frame
  color: string;
  label?: string;
  description?: string;
  trackId?: string;        // Optional track association
  isLocked?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export type AnnotationTargetType = 'marker' | 'region' | 'shot' | 'frame' | 'track';

export interface AnnotationReply {
  id: string;
  content: string;
  author?: string;
  createdAt: number;
}

export interface Annotation {
  id: string;
  targetId: string;        // ID of the target (marker, region, shot, etc.)
  targetType: AnnotationTargetType;
  content: string;         // Annotation text
  author?: string;
  color?: string;
  isResolved?: boolean;
  replies?: AnnotationReply[];
  createdAt: number;
  updatedAt: number;
}


export interface TimelineState {
  projectId: string;
  shots: Shot[];
  tracks: Track[];
  playheadPosition: number; // Current time in frames
  zoomLevel: number; // Pixels per frame
  selectedElements: string[]; // Array of selected shot/layer IDs
  duration: number; // Total duration in frames
  markers: TimelineMarker[]; // Timeline markers
  regions: TimelineRegion[]; // Timeline regions
  annotations: Annotation[]; // Timeline annotations
  selectedMarkers: string[]; // Selected marker IDs

  selectedRegions: string[]; // Selected region IDs
  sequences?: unknown[];
  currentSequenceId?: string;
  activeKeyframeEditor?: {
    shotId: string;
    layerId: string;
    property: string;
  };
}

// ============================================================================
// Asset Types
// ============================================================================

export type AssetType =
  | 'character'
  | 'environment'
  | 'prop'
  | 'visual-style'
  | 'template'
  | 'camera-preset'
  | 'lighting-rig'
  | 'custom-preset';

// ============================================================================
// Preset Types
// ============================================================================

export type PresetType = 'effects' | 'export' | 'audio';

export interface CustomPreset {
  id: string;
  name: string;
  type: PresetType;
  data: unknown;
  createdAt: number;
  tags?: string[];
}

export interface PresetsState {
  presets: CustomPreset[];
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Service Asset Types (Bridge between backend and frontend)
// ============================================================================

export type ServiceAssetType = 'image' | 'audio' | 'video' | 'template';

export interface ServiceAssetMetadata {
  description?: string;
  author?: string;
  license?: string;
  source?: string;
  category?: string;
  tags?: string[];
  duration?: number;
  [key: string]: unknown;
}

export interface ServiceAsset {
  id: string;
  name: string;
  type: ServiceAssetType;
  url?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  metadata?: ServiceAssetMetadata;
  category?: string;
  subcategory?: string;
  tags?: string[];
  source?: 'builtin' | 'user' | 'ai-generated';
  createdAt?: number;
}

export interface CharacterMetadata {
  age: string;
  gender: string;
  appearance: string;
  personality: string;
}

export interface EnvironmentMetadata {
  setting: string;
  timeOfDay: string;
  weather: string;
  mood: string;
}

export interface StyleMetadata {
  intensity: number; // 0-100
  colorPalette: string[];
  artisticStyle: string;
}

export interface CameraMetadata {
  movementType: string;
  duration: number;
  focalLength: number;
  trajectory: string;
}

export interface LightingMetadata {
  mood: string;
  lightCount: number;
  intensity: number;
  colorTemperature: number;
}

export interface TemplateMetadata {
  shotCount: number;
  totalDuration: number;
  genre: string;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface AssetMetadata {
  description: string;
  author?: string;
  license?: string;
  tags?: string[]; // Searchable tags for the asset
  characterMetadata?: CharacterMetadata;
  environmentMetadata?: EnvironmentMetadata;
  styleMetadata?: StyleMetadata;
  cameraMetadata?: CameraMetadata;
  lightingMetadata?: LightingMetadata;
  templateMetadata?: TemplateMetadata;
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  category: string;
  subcategory?: string;
  thumbnailUrl: string;
  previewUrl?: string; // For animated previews
  metadata: AssetMetadata;
  tags: string[];
  source: 'builtin' | 'user' | 'ai-generated';
  createdAt: number;
}

export interface AssetCategory {
  id: string;
  name: string;
  icon: string;
  assets: Asset[];
}

export interface AssetsState {
  categories: AssetCategory[];
  searchQuery: string;
  activeCategory: string;
}

// ============================================================================
// Panel Types
// ============================================================================

export interface PanelLayout {
  assetLibrary: { width: number }; // percentage
  preview: { width: number; height: number }; // percentage
  shotConfig: { width: number }; // percentage
  timeline: { height: number }; // percentage
}

export interface PanelsState {
  layout: PanelLayout;
  activePanel: 'assetLibrary' | 'preview' | 'shotConfig' | 'timeline' | null;
  shotConfigTarget: string | null; // Currently selected shot for configuration
  showLayerManager: boolean; // Toggle between shot config and layer manager
  compactMode: boolean; // Toggle for compact director dashboard
}

// ============================================================================
// Tool Types
// ============================================================================

export type ToolType =
  // Primary tools
  | 'select'
  | 'cut'
  | 'move'
  | 'zoom'
  // Media tools
  | 'add-image'
  | 'add-video'
  | 'add-audio'
  // Editing tools
  | 'trim'
  | 'ripple'
  | 'roll'
  | 'slip'
  | 'slide'
  | 'split'
  // Effects tools
  | 'transition'
  | 'text'
  | 'keyframe';

export interface Tool {
  id: ToolType;
  name: string;
  icon: string;
  shortcut: string;
  cursor: string;
  description: string;
}

export interface ToolsState {
  activeTool: ToolType;
  toolSettings: Record<string, unknown>; // Tool-specific parameters
}

// ============================================================================
// Preview Types
// ============================================================================

export type PlaybackState = 'playing' | 'paused' | 'stopped';

export interface PreviewState {
  currentFrame: ImageData | null;
  playbackState: PlaybackState;
  playbackSpeed: number; // 1x, 2x, 0.5x
}

// ============================================================================
// History Types
// ============================================================================

export interface StateSnapshot {
  timestamp: number;
  action: string; // Action type that created this snapshot
  state: unknown; // Partial state snapshot
  description: string; // Human-readable description
}

export interface HistoryState {
  undoStack: StateSnapshot[];
  redoStack: StateSnapshot[];
  maxStackSize: number;
}


