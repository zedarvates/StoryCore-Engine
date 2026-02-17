/**
 * Camera Angle Editor Components
 * 
 * Export all camera angle editor components from this index file.
 * This allows for clean imports like:
 * 
 * ```tsx
 * import { ImageHoverButton, CameraAngleEditor, CameraAngleEditorModal } from '@/components/camera-angle-editor';
 * ```
 */

// ============================================================================
// Components
// ============================================================================

export {
  ImageHoverButton,
  ImageHoverButtonOverlay,
  ImageWithHoverButton,
  type ImageHoverButtonProps,
  type ImageHoverButtonOverlayProps,
  type ImageWithHoverButtonProps,
} from './ImageHoverButton';

export {
  AnglePresetSelector,
  type AnglePresetSelectorProps,
} from './AnglePresetSelector';

export {
  ResultsGrid,
  type ResultsGridProps,
} from './ResultsGrid';

export {
  CameraAngleEditor,
  type CameraAngleEditorProps,
} from './CameraAngleEditor';

export {
  CameraAngleEditorModal,
  type CameraAngleEditorModalProps,
} from './CameraAngleEditorModal';

export {
  CameraAngleEditorErrorBoundary,
  type CameraAngleEditorErrorBoundaryProps,
} from './CameraAngleEditorErrorBoundary';

export {
  Skeleton,
  ResultsGridSkeleton,
  ResultCardSkeleton,
  AnglePresetSelectorSkeleton,
  AnglePresetCardSkeleton,
  CameraAngleEditorSkeleton,
  SourceImageSkeleton,
  GenerationOptionsSkeleton,
  type SkeletonProps,
  type ResultsGridSkeletonProps,
  type AnglePresetSkeletonProps,
  type CameraAngleEditorSkeletonProps,
} from './CameraAngleSkeletons';

// Default export for convenience
export { ImageHoverButton as default } from './ImageHoverButton';

// ============================================================================
// Re-export Types
// ============================================================================

// Re-export commonly used types for convenience
export type {
  CameraAnglePreset,
  CameraAngleJobStatus,
  CameraAngleQuality,
  CameraAngleRequest,
  CameraAngleJobResponse,
  CameraAngleResultResponse,
  CameraAnglePresetMetadata,
  CameraAnglePresetsResponse,
  CameraAngleResult,
  CameraAngleCancelResponse,
  CameraAngleApiError,
} from '@/types/cameraAngle';

// ============================================================================
// Re-export Hook
// ============================================================================

export {
  useCameraAngleGeneration,
  useCameraAnglePresets,
  useIsAngleSelected,
  useCameraAnglePreset,
  useCameraAngleProgress,
  useCameraAngleCurrentStep,
} from '@/hooks/useCameraAngleGeneration';

// ============================================================================
// Re-export Store Selectors
// ============================================================================

export {
  useCameraAngleStore,
  useCurrentJob,
  usePresets,
  useSelectedAngles,
  useSourceImage,
  useGenerationOptions,
  useCameraAngleError,
  useIsGenerating,
  useHasResults,
} from '@/stores/cameraAngleStore';

// ============================================================================
// Re-export Service
// ============================================================================

export {
  cameraAngleService,
  CameraAngleService,
  type CameraAngleServiceConfig,
} from '@/services/cameraAngleService';
