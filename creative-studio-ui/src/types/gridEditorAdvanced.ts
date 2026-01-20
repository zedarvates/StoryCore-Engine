/**
 * Extended Type Definitions for Advanced Grid Editor Improvements
 * 
 * This file contains types for:
 * - Video visualization and playback
 * - Enhanced drag-and-drop
 * - Grid layout with snap-to-grid
 * - Performance optimization
 * - Thumbnail caching
 * - Batch operations
 * - Undo/Redo system
 */

import { z } from 'zod';
import type { Shot } from './index';
import type { ProductionShot } from './shot';

// ============================================================================
// Video Visualization Types
// ============================================================================

export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: TimeRanges | null;
  error: Error | null;
  playbackRate: number;
  volume: number;
  muted: boolean;
}

export interface VideoPlayerProps {
  shot: Shot | ProductionShot;
  autoPlay?: boolean;
  controls?: boolean;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  playbackRate?: number;
  className?: string;
}

export interface VideoSequencePlayerProps {
  shots: (Shot | ProductionShot)[];
  currentIndex: number;
  onShotChange?: (index: number) => void;
  seamlessTransition?: boolean;
}

export interface VideoThumbnailPreviewProps {
  videoUrl: string;
  time: number;
  width: number;
  height: number;
}

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 1.5 | 2;

export interface TimecodeFormat {
  type: 'frames' | 'seconds' | 'smpte';
  framerate?: number;
}

// ============================================================================
// Drag and Drop Types
// ============================================================================

export type DragItemType = 'shot' | 'panel' | 'group';

export interface DragDropConfig {
  type: DragItemType;
  allowCopy: boolean;
  allowMultiple: boolean;
  snapToGrid: boolean;
  autoScroll: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface DropTarget {
  id: string;
  type: string;
  position: Position;
}

export interface DragState {
  isDragging: boolean;
  draggedItems: ProductionShot[];
  dragPreview: React.ReactNode | null;
  dropTarget: DropTarget | null;
  isValidDrop: boolean;
  isCopyMode: boolean;
}

export interface DraggableShotProps {
  shot: ProductionShot;
  isSelected: boolean;
  onDragStart?: (shot: ProductionShot) => void;
  onDragEnd?: (shot: ProductionShot, position: Position) => void;
}

// ============================================================================
// Grid Layout Types
// ============================================================================

export interface GridLayoutConfig {
  columns: number;
  rows: number;
  gap: number;
  cellSize: { width: number; height: number };
  snapEnabled: boolean;
  snapThreshold: number;
  showGridLines: boolean;
}

export interface GridLayoutProps {
  config: GridLayoutConfig;
  items: GridPanel[];
  onLayoutChange?: (items: GridPanel[]) => void;
}

export interface GridPanel {
  id: string;
  position: Position;
  size: { width: number; height: number };
  content: ProductionShot;
  zIndex: number;
}

export interface AlignmentGuide {
  type: 'vertical' | 'horizontal';
  position: number;
  items: GridPanel[];
}

export type GridSize = 8 | 16 | 24 | 32;

// ============================================================================
// Thumbnail Cache Types
// ============================================================================

export interface ThumbnailCacheConfig {
  maxMemorySize: number; // in MB
  maxDiskSize: number; // in MB
  quality: 'low' | 'medium' | 'high';
  preloadDistance: number; // number of thumbnails to pre-load
}

export interface CacheEntry {
  key: string;
  blob: Blob;
  size: number;
  lastAccessed: number;
  quality: string;
}

export interface ThumbnailCacheStats {
  memoryUsage: number;
  diskUsage: number;
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
}

// ============================================================================
// Performance Monitoring Types
// ============================================================================

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage: number;
  timestamp: number;
}

export interface PerformanceMonitorConfig {
  enabled: boolean;
  sampleInterval: number; // ms
  warningThreshold: {
    fps: number;
    renderTime: number;
    memoryUsage: number;
  };
}

// ============================================================================
// Context Menu Types
// ============================================================================

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  submenu?: ContextMenuItem[];
  action?: () => void;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  position: Position;
  onClose: () => void;
}

// ============================================================================
// Undo/Redo Types
// ============================================================================

export interface HistoryEntry<T = any> {
  id: string;
  timestamp: number;
  description: string;
  state: T;
  inverseAction?: () => void;
}

export interface UndoRedoState<T = any> {
  undoStack: HistoryEntry<T>[];
  redoStack: HistoryEntry<T>[];
  currentState: T;
  savedStateId: string | null;
  maxStackSize: number;
}

// ============================================================================
// Batch Operations Types
// ============================================================================

export type BatchOperationType = 'delete' | 'duplicate' | 'export' | 'transform' | 'tag';

export interface BatchOperation {
  id: string;
  type: BatchOperationType;
  items: ProductionShot[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime?: number;
  endTime?: number;
  error?: Error;
}

export interface BatchOperationResult {
  success: ProductionShot[];
  failed: Array<{ shot: ProductionShot; error: Error }>;
  totalTime: number;
}

export interface BatchOperationsToolbarProps {
  selectedShots: ProductionShot[];
  onOperationComplete?: (result: BatchOperationResult) => void;
}

// ============================================================================
// Web Worker Types
// ============================================================================

export interface WorkerTask {
  id: string;
  type: string;
  data: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
}

export interface WorkerMessage {
  id: string;
  type: string;
  data?: any;
  error?: string;
  progress?: number;
}

export interface WorkerPoolConfig {
  size: number;
  maxQueueSize?: number;
}

// ============================================================================
// Shot Frame Viewer Types
// ============================================================================

export interface ShotFrameViewerProps {
  shot: Shot | ProductionShot;
  onUpdate?: (shot: Shot | ProductionShot) => void;
  onClose?: () => void;
}

export interface FrameNavigationState {
  currentFrame: number;
  totalFrames: number;
  framerate: number;
}

export interface InOutPoint {
  inPoint: number;
  outPoint: number;
  duration: number;
}

// ============================================================================
// Animation Types
// ============================================================================

export interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring';
  delay?: number;
}

export interface AnimationVariants {
  initial: Record<string, any>;
  animate: Record<string, any>;
  exit?: Record<string, any>;
}

// ============================================================================
// Responsive Grid Types
// ============================================================================

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'large';

export interface BreakpointConfig {
  mobile: number; // 320px
  tablet: number; // 768px
  desktop: number; // 1024px
  large: number; // 1920px
}

export interface ResponsiveGridConfig {
  breakpoints: BreakpointConfig;
  columnsPerBreakpoint: Record<Breakpoint, number>;
  currentBreakpoint: Breakpoint;
}

// ============================================================================
// Search and Filter Types
// ============================================================================

export type SearchOperator = 'AND' | 'OR' | 'NOT';

export interface SearchCriteria {
  field: 'name' | 'tags' | 'duration' | 'type' | 'status';
  operator: SearchOperator;
  value: string | number;
}

export interface SearchFilter {
  id: string;
  name: string;
  criteria: SearchCriteria[];
  saved: boolean;
}

export type PredefinedFilter = 'favorites' | 'recent' | 'unused' | 'errors';

// ============================================================================
// Export/Import Configuration Types
// ============================================================================

export interface ExportConfiguration {
  gridLayout: GridLayoutConfig;
  snapSettings: {
    enabled: boolean;
    size: GridSize;
    threshold: number;
  };
  visualPreferences: {
    showGridLines: boolean;
    theme: 'light' | 'dark';
  };
  version: string;
}

export type ExportFormat = 'json' | 'yaml' | 'url';

export interface ImportResult {
  success: boolean;
  configuration?: ExportConfiguration;
  conflicts?: string[];
  errors?: string[];
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const GridLayoutConfigSchema = z.object({
  columns: z.number().positive(),
  rows: z.number().positive(),
  gap: z.number().nonnegative(),
  cellSize: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  snapEnabled: z.boolean(),
  snapThreshold: z.number().positive(),
  showGridLines: z.boolean(),
});

export const ThumbnailCacheConfigSchema = z.object({
  maxMemorySize: z.number().positive(),
  maxDiskSize: z.number().positive(),
  quality: z.enum(['low', 'medium', 'high']),
  preloadDistance: z.number().nonnegative(),
});

export const ExportConfigurationSchema = z.object({
  gridLayout: GridLayoutConfigSchema,
  snapSettings: z.object({
    enabled: z.boolean(),
    size: z.union([z.literal(8), z.literal(16), z.literal(24), z.literal(32)]),
    threshold: z.number().positive(),
  }),
  visualPreferences: z.object({
    showGridLines: z.boolean(),
    theme: z.enum(['light', 'dark']),
  }),
  version: z.string(),
});

// ============================================================================
// Type Guards
// ============================================================================

export function isPosition(value: unknown): value is Position {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'y' in value &&
    typeof (value as Position).x === 'number' &&
    typeof (value as Position).y === 'number'
  );
}

export function isGridLayoutConfig(value: unknown): value is GridLayoutConfig {
  try {
    GridLayoutConfigSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function isThumbnailCacheConfig(value: unknown): value is ThumbnailCacheConfig {
  try {
    ThumbnailCacheConfigSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function isExportConfiguration(value: unknown): value is ExportConfiguration {
  try {
    ExportConfigurationSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}
