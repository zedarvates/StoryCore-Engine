/**
 * Timeline Marker and Region Types
 * 
 * Type definitions for markers, regions, chapter points, and annotations.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9
 */

// ============================================================================
// Marker Types
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

// ============================================================================
// Region Types
// ============================================================================

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

// ============================================================================
// Chapter Point Types
// ============================================================================

export interface ChapterPoint {
  id: string;
  position: number;        // Frame number
  title: string;
  description?: string;
  thumbnail?: string;      // Base64 or URL
  duration?: number;       // Chapter duration
  metadata?: Record<string, unknown>;
  createdAt: number;
}

// ============================================================================
// Annotation Types
// ============================================================================

export type AnnotationTargetType = 'marker' | 'region' | 'shot' | 'frame' | 'track';

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

export interface AnnotationReply {
  id: string;
  content: string;
  author?: string;
  createdAt: number;
}

// ============================================================================
// Marker Color Palette
// ============================================================================

export const MARKER_COLORS = {
  info: '#4A90E2',         // Blue
  warning: '#F1C40F',      // Yellow
  error: '#E74C3C',        // Red
  important: '#9B59B6',    // Purple
  bookmark: '#2ECC71',     // Green
  custom: '#95A5A6',       // Gray
};

export const REGION_COLORS = {
  work: 'rgba(74, 144, 226, 0.2)',
  selection: 'rgba(74, 144, 226, 0.3)',
  gap: 'rgba(150, 150, 150, 0.2)',
  loop: 'rgba(46, 204, 113, 0.2)',
  highlight: 'rgba(155, 89, 182, 0.2)',
  comment: 'rgba(241, 196, 15, 0.2)',
};

// ============================================================================
// Utility Functions
// ============================================================================

export function formatMarkerLabel(type: MarkerType): string {
  const labels: Record<MarkerType, string> = {
    info: 'Info',
    warning: 'Warning',
    error: 'Error',
    important: 'Important',
    bookmark: 'Bookmark',
    custom: 'Custom',
  };
  return labels[type] || 'Marker';
}

export function getMarkerColor(type: MarkerType, customColor?: string): string {
  if (customColor) return customColor;
  return MARKER_COLORS[type] || MARKER_COLORS.custom;
}

export function getRegionColor(type: RegionType, customColor?: string): string {
  if (customColor) return customColor;
  return REGION_COLORS[type] || REGION_COLORS.work;
}

export function createMarkerId(): string {
  return `marker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createRegionId(): string {
  return `region-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createChapterId(): string {
  return `chapter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createAnnotationId(): string {
  return `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function positionToTimecode(position: number, fps: number = 24): string {
  const totalSeconds = Math.floor(position / fps);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  const frames = position % fps;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

export function timecodeToPosition(timecode: string, fps: number = 24): number {
  const match = timecode.match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (!match) return 0;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const frames = parseInt(match[3], 10);
  return (minutes * 60 + seconds) * fps + frames;
}

export function getRegionDuration(region: TimelineRegion): number {
  return region.end - region.start;
}

export function isPositionInRegion(position: number, region: TimelineRegion): boolean {
  return position >= region.start && position <= region.end;
}

export function getMarkersInRegion(
  markers: TimelineMarker[],
  region: TimelineRegion
): TimelineMarker[] {
  return markers.filter(m => isPositionInRegion(m.position, region));
}

// ============================================================================
// Export all types
// ============================================================================

export type {
  TimelineMarker,
  TimelineRegion,
  ChapterPoint,
  Annotation,
  AnnotationReply,
  AnnotationTargetType,
};

