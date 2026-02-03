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
  name: string;
  path: string;
  created: Date;
  modified: Date;
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

export interface MediaLayerData {
  sourceUrl: string;
  trim: { start: number; end: number };
  transform: Transform;
}

export interface AudioLayerData {
  sourceUrl: string;
  volume: number; // 0-1
  fadeIn: number; // Duration in frames
  fadeOut: number;
}

export interface EffectsLayerData {
  effectType: string;
  parameters: Record<string, any>;
}

export interface TransitionLayerData {
  transitionType: 'fade' | 'dissolve' | 'wipe' | 'slide' | 'smooth-cut';
  duration: number;
  easing: string;
}

export interface TextAnimation {
  type: string;
  duration: number;
  parameters: Record<string, any>;
}

export interface TextLayerData {
  content: string;
  font: string;
  size: number;
  color: string;
  position: { x: number; y: number };
  animation?: TextAnimation;
}

export interface Keyframe {
  time: number; // Frame number
  value: any;
  easing?: string;
}

export interface KeyframeLayerData {
  property: string; // Property being animated
  keyframes: Keyframe[];
  interpolation: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export type LayerData =
  | MediaLayerData
  | AudioLayerData
  | EffectsLayerData
  | TransitionLayerData
  | TextLayerData
  | KeyframeLayerData;

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
  appliedAt: Date;
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
  parameters: GenerationParameters;
  generationStatus: 'pending' | 'processing' | 'complete' | 'error';
  outputPath?: string; // Path to generated media
  qaScore?: number; // Quality assessment score
  visualStyle?: StyleApplication; // Applied visual style
  modified?: boolean; // Track if shot has been modified
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

export interface TimelineState {
  shots: Shot[];
  tracks: Track[];
  playheadPosition: number; // Current time in frames
  zoomLevel: number; // Pixels per frame
  selectedElements: string[]; // Array of selected shot/layer IDs
  duration: number; // Total duration in frames
  markers: TimelineMarker[]; // Timeline markers
  regions: TimelineRegion[]; // Timeline regions
  selectedMarkers: string[]; // Selected marker IDs
  selectedRegions: string[]; // Selected region IDs
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
  | 'lighting-rig';

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
  createdAt: Date;
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
  toolSettings: Record<string, any>; // Tool-specific parameters
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
  timestamp: Date;
  action: string; // Action type that created this snapshot
  state: any; // Partial state snapshot
  description: string; // Human-readable description
}

export interface HistoryState {
  undoStack: StateSnapshot[];
  redoStack: StateSnapshot[];
  maxStackSize: number;
}
