/**
 * Sequence Editor - Public API
 * 
 * This file exports all public components, hooks, and types
 * for use in other parts of the application.
 */

// Main component
export { SequenceEditor } from './SequenceEditor';

// Redux store and hooks
export { store, useAppDispatch, useAppSelector } from './store';
export type { RootState, AppDispatch } from './store';

// Redux actions
export * from './store/slices/projectSlice';
export * from './store/slices/timelineSlice';
export * from './store/slices/assetsSlice';
export * from './store/slices/panelsSlice';
export * from './store/slices/toolsSlice';
export * from './store/slices/previewSlice';
export * from './store/slices/historySlice';

// Types
export type {
  // Project types
  ProjectMetadata,
  ProjectSettings,
  SaveStatus,
  GenerationStatus,
  ProjectState,
  
  // Timeline types
  LayerType,
  Transform,
  MediaLayerData,
  AudioLayerData,
  EffectsLayerData,
  TransitionLayerData,
  TextLayerData,
  KeyframeLayerData,
  LayerData,
  Layer,
  GenerationParameters,
  ReferenceImage,
  Shot,
  Track,
  TimelineState,
  
  // Asset types
  AssetType,
  CharacterMetadata,
  EnvironmentMetadata,
  StyleMetadata,
  CameraMetadata,
  LightingMetadata,
  TemplateMetadata,
  AssetMetadata,
  Asset,
  AssetCategory,
  AssetsState,
  
  // Panel types
  PanelLayout,
  PanelsState,
  
  // Tool types
  ToolType,
  Tool,
  ToolsState,
  
  // Preview types
  PlaybackState,
  PreviewState,
  
  // History types
  StateSnapshot,
  HistoryState,
} from './types';
