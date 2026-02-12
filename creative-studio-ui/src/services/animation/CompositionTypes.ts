/**
 * Composition Nesting System Types for StoryCore
 * 
 * Defines the core types for composition management including
 * nested compositions, tracks, clips, and parent-child relationships.
 */

import { v4 as uuidv4 } from 'uuid';

/** Type alias for UUID strings */
export type UUID = string;

// ============================================================================
// Core Composition Types
// ============================================================================

/** Duration in milliseconds */
export type Duration = number;

/** Timestamp in milliseconds */
export type TimeStamp = number;

/** Unique identifier for compositions */
export type CompositionId = UUID;

/** Unique identifier for tracks */
export type TrackId = UUID;

/** Unique identifier for clips */
export type ClipId = UUID;

/**
 * Composition interface representing a single timeline/composition
 * Can contain multiple tracks and can be nested within other compositions
 */
export interface Composition {
  /** Unique identifier */
  id: CompositionId;
  /** Display name */
  name: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Duration in milliseconds */
  duration: Duration;
  /** Frame rate (frames per second) */
  fps: number;
  /** Track IDs belonging to this composition */
  trackIds: TrackId[];
  /** ID of parent composition (null if root) */
  parentCompositionId: CompositionId | null;
  /** IDs of nested child compositions */
  nestedCompositionIds: CompositionId[];
  /** Current playhead position */
  currentTime: TimeStamp;
  /** Whether this composition is currently active/rendering */
  isActive: boolean;
  /** Metadata for the composition */
  metadata: CompositionMetadata;
  /** When this composition was created */
  createdAt: Date;
  /** When this composition was last modified */
  updatedAt: Date;
}

/** Additional composition metadata */
export interface CompositionMetadata {
  /** Color indicator for the composition in UI */
  color?: string;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Tags for searching */
  tags?: string[];
  /** Description */
  description?: string;
  /** Custom properties */
  [key: string]: unknown;
}

// ============================================================================
// Track Types
// ============================================================================

/**
 * Track interface representing a single layer in a composition
 * Tracks can contain clips and belong to a single composition
 */
export interface Track {
  /** Unique identifier */
  id: TrackId;
  /** Display name */
  name: string;
  /** Composition ID this track belongs to */
  compositionId: CompositionId;
  /** Clip IDs belonging to this track */
  clipIds: ClipId[];
  /** Track type */
  type: TrackType;
  /** Track visibility */
  isVisible: boolean;
  /** Track locked state */
  isLocked: boolean;
  /** Track height in pixels */
  height: number;
  /** Sort order (lower = higher in UI) */
  sortOrder: number;
  /** Audio volume (0-1) */
  volume: number;
  /** Audio mute state */
  isMuted: boolean;
}

/** Types of tracks supported */
export type TrackType = 
  | 'video' 
  | 'audio' 
  | 'text' 
  | 'image' 
  | 'effect' 
  | 'nested' 
  | 'chapter';

// ============================================================================
// Clip Types
// ============================================================================

/**
 * Clip interface representing a media segment on a track
 */
export interface Clip {
  /** Unique identifier */
  id: ClipId;
  /** Display name */
  name: string;
  /** Track ID this clip belongs to */
  trackId: TrackId;
  /** Composition ID this clip belongs to */
  compositionId: CompositionId;
  /** Start time in composition timeline (ms) */
  startTime: TimeStamp;
  /** End time in composition timeline (ms) */
  endTime: TimeStamp;
  /** Source start time (original media) */
  sourceStartTime: TimeStamp;
  /** Source end time (original media) */
  sourceEndTime: TimeStamp;
  /** Clip type */
  type: ClipType;
  /** Reference to source asset */
  assetId?: string;
  /** Nested composition ID if this is a nested clip */
  nestedCompositionId?: CompositionId;
  /** Visual properties */
  visualProperties: VisualProperties;
  /** Audio properties */
  audioProperties: AudioProperties;
  /** Effects applied to this clip */
  effectIds: string[];
  /** Keyframes for animation */
  keyframes: Keyframe[];
  /** Whether clip is selected */
  isSelected: boolean;
  /** Whether clip is locked */
  isLocked: boolean;
}

/** Types of clips supported */
export type ClipType = 
  | 'video' 
  | 'audio' 
  | 'text' 
  | 'image' 
  | 'shape' 
  | 'nested-composition';

/** Visual properties for clips */
export interface VisualProperties {
  /** Opacity (0-1) */
  opacity: number;
  /** Scale */
  scale: number;
  /** Rotation in degrees */
  rotation: number;
  /** X position offset */
  x: number;
  /** Y position offset */
  y: number;
  /** Blend mode */
  blendMode?: string;
  /** Crop settings */
  crop?: CropProperties;
}

/** Crop properties */
export interface CropProperties {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Audio properties for clips */
export interface AudioProperties {
  /** Volume (0-1) */
  volume: number;
  /** Pan (-1 to 1) */
  pan: number;
  /** Fade in duration (ms) */
  fadeIn: Duration;
  /** Fade out duration (ms) */
  fadeOut: Duration;
}

/** Keyframe for animation */
export interface Keyframe {
  /** Time of keyframe */
  time: TimeStamp;
  /** Property being animated */
  property: string;
  /** Value at keyframe */
  value: number | string;
  /** Easing function */
  easing?: string;
}

// ============================================================================
// Nested Composition Types
// ============================================================================

/**
 * Nested composition reference
 * Links a clip in a parent composition to a child composition
 */
export interface NestedComposition {
  /** The nested (child) composition */
  composition: Composition;
  /** Reference clip in parent */
  referenceClipId: ClipId;
  /** Parent composition ID */
  parentCompositionId: CompositionId;
  /** Nesting depth (0 = direct child of root) */
  nestingDepth: number;
  /** Full path from root to this composition */
  nestingPath: CompositionId[];
}

// ============================================================================
// Timeline Types
// ============================================================================

/**
 * Timeline state for a composition
 */
export interface TimelineState {
  /** Current composition being displayed */
  currentCompositionId: CompositionId;
  /** Current playhead position */
  playhead: TimeStamp;
  /** Zoom level (pixels per second) */
  zoom: number;
  /** Scroll offset in pixels */
  scrollOffset: number;
  /** Whether playback is active */
  isPlaying: boolean;
  /** Playback rate */
  playbackRate: number;
  /** Visible time range start */
  visibleTimeStart: TimeStamp;
  /** Visible time range end */
  visibleTimeEnd: TimeStamp;
  /** Selected clip IDs */
  selectedClipIds: ClipId[];
  /** Selected track IDs */
  selectedTrackIds: TrackId[];
}

// ============================================================================
// Clipboard Types
// ============================================================================

/**
 * Clipboard item for copy/paste operations
 */
export interface ClipboardItem {
  /** Type of item */
  type: 'clip' | 'track' | 'composition';
  /** The item data */
  data: Clip | Track | Composition;
  /** Original source ID */
  sourceId: string;
  /** When it was copied */
  copiedAt: Date;
}

/** Clipboard state */
export interface ClipboardState {
  /** Items in clipboard */
  items: ClipboardItem[];
  /** Whether clipboard has content */
  hasContent: boolean;
}

// ============================================================================
// Undo/Redo Types
// ============================================================================

/**
 * Action types for undo/redo
 */
export type UndoActionType =
  | 'create_composition'
  | 'delete_composition'
  | 'update_composition'
  | 'create_track'
  | 'delete_track'
  | 'update_track'
  | 'create_clip'
  | 'delete_clip'
  | 'update_clip'
  | 'move_clip'
  | 'resize_clip'
  | 'paste_clip'
  | 'add_nested_composition'
  | 'remove_nested_composition';

/** Undo/redo action */
export interface UndoRedoAction {
  /** Action type */
  type: UndoActionType;
  /** Timestamp of action */
  timestamp: Date;
  /** Description for UI */
  description: string;
  /** Previous state (for undo) */
  previousState: unknown;
  /** New state (for redo) */
  newState: unknown;
  /** Affected entity IDs */
  affectedIds: string[];
}

// ============================================================================
// Selection Types
// ============================================================================

/**
 * Selection state for composition editor
 */
export interface SelectionState {
  /** Selected composition IDs */
  selectedCompositionIds: CompositionId[];
  /** Selected track IDs */
  selectedTrackIds: TrackId[];
  /** Selected clip IDs */
  selectedClipIds: ClipId[];
  /** Multi-select mode */
  isMultiSelecting: boolean;
  /** Selection box coordinates */
  selectionBox?: SelectionBox;
}

/** Selection box for marquee selection */
export interface SelectionBox {
  /** Start X position */
  startX: number;
  /** Start Y position */
  startY: number;
  /** End X position */
  endX: number;
  /** End Y position */
  endY: number;
}

// ============================================================================
// History Entry Types
// ============================================================================

/**
 * History entry for timeline operations
 */
export interface HistoryEntry {
  /** Unique entry ID */
  id: string;
  /** Type of operation */
  operation: UndoActionType;
  /** Entity type affected */
  entityType: 'composition' | 'track' | 'clip';
  /** Entity ID */
  entityId: string;
  /** Previous value */
  previousValue: unknown;
  /** New value */
  newValue: unknown;
  /** Parent entity ID (for nesting context) */
  parentId?: string;
  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Performance Types
// ============================================================================

/** Performance monitoring data */
export interface PerformanceMetrics {
  /** Render time in ms */
  renderTime: number;
  /** Number of active compositions */
  activeCompositionCount: number;
  /** Number of visible clips */
  visibleClipCount: number;
  /** Memory usage estimate */
  memoryUsage: number;
  /** Frame drops */
  frameDrops: number;
  /** Last update timestamp */
  lastUpdate: Date;
}
