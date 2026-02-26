/**
 * Sequence Editor Hooks Index
 * 
 * Exports all custom React hooks for the sequence editor.
 */

export {
  useFocusTrap,
  useKeyboardNavigation,
  useAccessibilityInit,
  useAnnounce,
  useReducedMotion,
} from './useAccessibility';
export * from './useAnimations';
export * from './useDragDropAnimations';
export * from './useLoadingState';
export * from './usePerformance';
export * from './useProjectFile';
export * from './useProjectRecovery';
export * from './useTemplates';
export * from './useBatchStyleApplication';
export * from './useToolInteractions';
export {
  useTimelineInteractions,
  getShotLayerType,
  canExtendShot,
  canApplyTTS,
  suggestExtensionDuration,
} from './useTimelineInteractions';
export type {
  ResizeEdge,
  InteractionState,
  VideoExtensionOptions,
  SpeechConfigOptions,
  TimelineInteractionHandlers,
  UseTimelineInteractionsOptions,
  UseTimelineInteractionsResult,
} from './useTimelineInteractions';
