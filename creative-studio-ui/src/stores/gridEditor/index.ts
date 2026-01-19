/**
 * Grid Editor Stores - Central export for all grid editor state management
 * 
 * This module exports all Zustand stores for the Advanced Grid Editor feature:
 * - GridStore: Main grid configuration and panel management
 * - UndoRedoStore: Operation history and undo/redo functionality
 * - ViewportStore: Zoom, pan, and viewport state management
 */

// Export stores
export { useGridStore } from '../gridEditorStore';
export { useUndoRedoStore } from '../undoRedoStore';
export { useViewportStore } from '../viewportStore';

// Export types from GridStore
export type {
  Point,
  Rectangle,
  Transform,
  CropRegion,
  BlendMode,
  ImageContent,
  AnnotationContent,
  EffectContent,
  LayerContent,
  DrawingElement,
  TextAnnotation,
  Layer,
  Panel,
  Annotation,
  GridConfiguration,
  Preset,
  Tool,
  GridStore,
} from '../gridEditorStore';

// Export helper functions from GridStore
export {
  createDefaultTransform,
  createDefaultPanel,
  createDefaultGridConfiguration,
} from '../gridEditorStore';

// Export types from UndoRedoStore
export type {
  OperationType,
  Operation,
  UndoRedoStore,
} from '../undoRedoStore';

// Export helper functions from UndoRedoStore
export {
  createOperation,
  formatOperation,
} from '../undoRedoStore';

// Export types from ViewportStore
export type {
  Bounds,
  ViewportState,
  ViewportStore,
} from '../viewportStore';

// Export helper functions from ViewportStore
export {
  getVisiblePanels,
} from '../viewportStore';
