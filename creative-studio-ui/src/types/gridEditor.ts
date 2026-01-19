/**
 * Advanced Grid Editor - Core Data Structures and Type Definitions
 * 
 * This file contains all TypeScript interfaces, types, and constants
 * for the Advanced Grid Editor feature.
 */

// ============================================================================
// Core Geometry Primitives
// ============================================================================

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Grid Configuration Constants
// ============================================================================

export const GRID_CONSTANTS = {
  ROWS: 3,
  COLS: 3,
  TOTAL_PANELS: 9,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 10.0,
  DEFAULT_ZOOM: 1.0,
  ZOOM_STEP: 0.1,
  ROTATION_SNAP_ANGLE: 15, // degrees
  MAX_UNDO_STACK_SIZE: 50,
  MIN_CROP_SIZE: 0.01, // 1% minimum crop size (normalized)
  MAX_LAYER_OPACITY: 1.0,
  MIN_LAYER_OPACITY: 0.0,
  DEFAULT_LAYER_OPACITY: 1.0,
} as const;

// ============================================================================
// Transform Types
// ============================================================================

export interface Transform {
  position: Point; // pixels from panel origin
  scale: Point; // 1.0 = 100%
  rotation: number; // degrees
  pivot: Point; // 0-1 normalized
}

export const DEFAULT_TRANSFORM: Transform = {
  position: { x: 0, y: 0 },
  scale: { x: 1.0, y: 1.0 },
  rotation: 0,
  pivot: { x: 0.5, y: 0.5 },
};

// ============================================================================
// Crop Region Types
// ============================================================================

export interface CropRegion {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  width: number; // 0-1 normalized
  height: number; // 0-1 normalized
}

export const DEFAULT_CROP_REGION: CropRegion = {
  x: 0,
  y: 0,
  width: 1.0,
  height: 1.0,
};

// ============================================================================
// Layer Types
// ============================================================================

export type BlendMode = 
  | 'normal' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'darken' 
  | 'lighten';

export type LayerType = 'image' | 'annotation' | 'effect';

export interface ImageContent {
  type: 'image';
  url: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface DrawingElement {
  id: string;
  type: 'path' | 'rectangle' | 'ellipse' | 'line';
  points: Point[];
  style: {
    strokeColor: string;
    strokeWidth: number;
    fillColor?: string;
    opacity: number;
  };
}

export interface TextAnnotation {
  id: string;
  text: string;
  position: Point;
  style: {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
  };
}

export interface AnnotationContent {
  type: 'annotation';
  drawings: DrawingElement[];
  textAnnotations: TextAnnotation[];
}

export interface EffectContent {
  type: 'effect';
  effectType: string;
  parameters: Record<string, unknown>;
}

export type LayerContent = ImageContent | AnnotationContent | EffectContent;

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0-1
  blendMode: BlendMode;
  content: LayerContent;
}

// ============================================================================
// Panel Types
// ============================================================================

export interface PanelPosition {
  row: number; // 0-2 for 3x3 grid
  col: number; // 0-2 for 3x3 grid
}

export interface PanelMetadata {
  generatedAt?: string;
  seed?: number;
  qualityScore?: number;
  modified?: boolean;
}

export interface Panel {
  id: string;
  position: PanelPosition;
  layers: Layer[];
  transform: Transform;
  crop: CropRegion | null;
  annotations: Annotation[];
  metadata: PanelMetadata;
}

/**
 * Annotation (visual markers and feedback)
 */
export interface Annotation {
  id: string;
  type: 'drawing' | 'text';
  content: string;
  visible: boolean;
}

// ============================================================================
// Preset Types
// ============================================================================

export interface Preset {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  panelTransforms: Transform[];
  panelCrops: (CropRegion | null)[];
}

// ============================================================================
// Grid Configuration Types
// ============================================================================

export interface GridMetadata {
  createdAt: string;
  modifiedAt: string;
  author?: string;
  description?: string;
}

export interface GridConfiguration {
  version: string; // "1.0"
  projectId: string;
  panels: Panel[];
  presets: Preset[];
  metadata: GridMetadata;
}

// ============================================================================
// Tool and Interaction Types
// ============================================================================

export type Tool = 'select' | 'crop' | 'rotate' | 'scale' | 'pan' | 'annotate';

export type TransformType = 'position' | 'scale' | 'rotation';

export type OperationType = 
  | 'transform'
  | 'crop'
  | 'layer_add'
  | 'layer_remove'
  | 'layer_reorder'
  | 'layer_modify'
  | 'annotation_add'
  | 'annotation_remove'
  | 'batch_generation';

export interface Operation {
  type: OperationType;
  timestamp: number;
  data: {
    panelId: string;
    before: unknown;
    after: unknown;
  };
}

// ============================================================================
// Viewport Types
// ============================================================================

export interface ViewportState {
  zoom: number; // 0.1 to 10.0
  pan: Point;
  bounds: {
    width: number;
    height: number;
  };
}

export const DEFAULT_VIEWPORT_STATE: ViewportState = {
  zoom: GRID_CONSTANTS.DEFAULT_ZOOM,
  pan: { x: 0, y: 0 },
  bounds: { width: 0, height: 0 },
};

// ============================================================================
// Backend Integration Types
// ============================================================================

export interface PanelGenerationConfig {
  panelId: string;
  prompt: string;
  seed: number;
  transform: Transform;
  crop: CropRegion | null;
  styleReference: string; // Master Coherence Sheet reference
}

export interface GeneratedImage {
  panelId: string;
  imageUrl: string;
  metadata: {
    seed: number;
    generationTime: number;
    qualityScore: number;
  };
}

// ============================================================================
// Error Types
// ============================================================================

export type ErrorCategory = 
  | 'user_input'
  | 'file_io'
  | 'backend_communication'
  | 'performance'
  | 'validation'
  | 'unknown';

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface RecoveryOption {
  label: string;
  action: () => void;
  isPrimary: boolean;
}

export interface ErrorReport {
  id: string;
  timestamp: number;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  technicalDetails?: string;
  context: {
    panelId?: string;
    operation?: string;
    userAction?: string;
  };
  recoveryOptions: RecoveryOption[];
}
