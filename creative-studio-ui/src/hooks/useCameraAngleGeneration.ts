/**
 * useCameraAngleGeneration Hook
 * 
 * Custom hook for camera angle generation functionality.
 * Wraps the camera angle store and service for convenient component usage.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
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
import { cameraAngleService, CameraAngleService } from '@/services/cameraAngleService';
import type {
  CameraAnglePreset,
  CameraAngleQuality,
  CameraAngleResult,
  CameraAnglePresetMetadata,
} from '@/types/cameraAngle';

// ============================================================================
// Hook Options
// ============================================================================

interface UseCameraAngleGenerationOptions {
  /** Auto-fetch presets on mount */
  autoFetchPresets?: boolean;
  /** Callback when generation starts */
  onGenerationStart?: (jobId: string) => void;
  /** Callback when generation completes */
  onGenerationComplete?: (results: CameraAngleResult[]) => void;
  /** Callback when generation fails */
  onGenerationError?: (error: string) => void;
  /** Callback when job is cancelled */
  onGenerationCancel?: () => void;
}

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseCameraAngleGenerationReturn {
  // State
  /** Current job state */
  job: ReturnType<typeof useCurrentJob>;
  /** Available presets */
  presets: CameraAnglePresetMetadata[];
  /** Selected angles for generation */
  selectedAngles: CameraAnglePreset[];
  /** Source image (base64) */
  sourceImage: string | null;
  /** Generation options */
  options: ReturnType<typeof useGenerationOptions>;
  /** Current error */
  error: string | null;
  /** Is generation in progress */
  isGenerating: boolean;
  /** Has completed results */
  hasResults: boolean;

  // Actions
  /** Start generation with current settings */
  startGeneration: () => Promise<string | null>;
  /** Cancel current generation */
  cancelGeneration: () => Promise<void>;
  /** Reset job state */
  reset: () => void;
  /** Set source image from file */
  setSourceImageFromFile: (file: File) => Promise<void>;
  /** Set source image from URL */
  setSourceImageFromUrl: (url: string) => Promise<void>;
  /** Set source image from base64 */
  setSourceImage: (base64: string | null) => void;
  /** Toggle angle selection */
  toggleAngle: (angle: CameraAnglePreset) => void;
  /** Set selected angles */
  setSelectedAngles: (angles: CameraAnglePreset[]) => void;
  /** Select all angles */
  selectAllAngles: () => void;
  /** Clear angle selection */
  clearAngleSelection: () => void;
  /** Update generation options */
  setOptions: (options: {
    preserveStyle?: boolean;
    quality?: CameraAngleQuality;
    seed?: number | null;
    customPrompt?: string | null;
  }) => void;
  /** Clear error */
  clearError: () => void;
  /** Download a result image */
  downloadResult: (result: CameraAngleResult, filename?: string) => void;
  /** Download all results */
  downloadAllResults: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for camera angle generation functionality
 */
export function useCameraAngleGeneration(
  options: UseCameraAngleGenerationOptions = {}
): UseCameraAngleGenerationReturn {
  const {
    autoFetchPresets = true,
    onGenerationStart,
    onGenerationComplete,
    onGenerationError,
    onGenerationCancel,
  } = options;

  // Store state
  const job = useCurrentJob();
  const presets = usePresets();
  const selectedAngles = useSelectedAngles();
  const sourceImage = useSourceImage();
  const generationOptions = useGenerationOptions();
  const error = useCameraAngleError();
  const isGenerating = useIsGenerating();
  const hasResults = useHasResults();

  // Store actions
  const {
    startGeneration: storeStartGeneration,
    cancelJob,
    resetJob,
    fetchPresets,
    setSourceImage,
    toggleAngle,
    setSelectedAngles,
    selectAllAngles,
    clearAngleSelection,
    setOptions,
    clearError,
  } = useCameraAngleStore();

  // Track if we've already fetched presets
  const presetsFetchedRef = useRef(false);

  // Fetch presets on mount if enabled
  useEffect(() => {
    if (autoFetchPresets && !presetsFetchedRef.current) {
      presetsFetchedRef.current = true;
      fetchPresets().catch((err) => {
        console.error('Failed to fetch presets:', err);
      });
    }
  }, [autoFetchPresets, fetchPresets]);

  // ==========================================================================
  // Action Wrappers
  // ==========================================================================

  /**
   * Start generation with current settings
   */
  const startGeneration = useCallback(async (): Promise<string | null> => {
    try {
      const jobId = await storeStartGeneration();
      onGenerationStart?.(jobId);
      return jobId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      onGenerationError?.(errorMessage);
      return null;
    }
  }, [storeStartGeneration, onGenerationStart, onGenerationError]);

  /**
   * Cancel current generation
   */
  const cancelGeneration = useCallback(async (): Promise<void> => {
    try {
      await cancelJob();
      onGenerationCancel?.();
    } catch (err) {
      console.error('Failed to cancel generation:', err);
    }
  }, [cancelJob, onGenerationCancel]);

  /**
   * Reset job state
   */
  const reset = useCallback(() => {
    resetJob();
  }, [resetJob]);

  /**
   * Set source image from file
   */
  const setSourceImageFromFile = useCallback(async (file: File): Promise<void> => {
    try {
      const base64 = await CameraAngleService.fileToBase64(file);
      setSourceImage(base64);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to read file';
      throw new Error(errorMessage);
    }
  }, [setSourceImage]);

  /**
   * Set source image from URL
   */
  const setSourceImageFromUrl = useCallback(async (url: string): Promise<void> => {
    try {
      const base64 = await CameraAngleService.urlToBase64(url);
      setSourceImage(base64);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load image from URL';
      throw new Error(errorMessage);
    }
  }, [setSourceImage]);

  /**
   * Download a result image
   */
  const downloadResult = useCallback(
    (result: CameraAngleResult, filename?: string) => {
      const name =
        filename || `camera-angle-${result.angleId}-${result.id}.png`;
      CameraAngleService.downloadBase64Image(result.generatedImageBase64, name);
    },
    []
  );

  /**
   * Download all results
   */
  const downloadAllResults = useCallback(() => {
    job.results.forEach((result, index) => {
      const filename = `camera-angle-${result.angleId}-${index + 1}.png`;
      // Use setTimeout to prevent browser blocking multiple downloads
      setTimeout(() => {
        CameraAngleService.downloadBase64Image(
          result.generatedImageBase64,
          filename
        );
      }, index * 100);
    });
  }, [job.results]);

  // ==========================================================================
  // Return Value
  // ==========================================================================

  return {
    // State
    job,
    presets,
    selectedAngles,
    sourceImage,
    options: generationOptions,
    error,
    isGenerating,
    hasResults,

    // Actions
    startGeneration,
    cancelGeneration,
    reset,
    setSourceImageFromFile,
    setSourceImageFromUrl,
    setSourceImage,
    toggleAngle,
    setSelectedAngles,
    selectAllAngles,
    clearAngleSelection,
    setOptions,
    clearError,
    downloadResult,
    downloadAllResults,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for just the presets data
 */
export function useCameraAnglePresets() {
  const presets = usePresets();
  const presetsLoaded = useCameraAngleStore((state) => state.presetsLoaded);
  const fetchPresets = useCameraAngleStore((state) => state.fetchPresets);

  useEffect(() => {
    if (!presetsLoaded) {
      fetchPresets().catch(console.error);
    }
  }, [presetsLoaded, fetchPresets]);

  return {
    presets,
    isLoading: !presetsLoaded,
    refetch: fetchPresets,
  };
}

/**
 * Hook for checking if a specific angle is selected
 */
export function useIsAngleSelected(angle: CameraAnglePreset): boolean {
  return useCameraAngleStore(
    (state) => state.selectedAngles.includes(angle)
  );
}

/**
 * Hook for getting a specific preset by ID
 */
export function useCameraAnglePreset(
  angleId: CameraAnglePreset
): CameraAnglePresetMetadata | undefined {
  return useCameraAngleStore((state) =>
    state.presets.find((p) => p.id === angleId)
  );
}

/**
 * Hook for generation progress percentage
 */
export function useCameraAngleProgress(): number {
  return useCameraAngleStore((state) => state.currentJob.progress);
}

/**
 * Hook for current generation step description
 */
export function useCameraAngleCurrentStep(): string | null {
  return useCameraAngleStore((state) => state.currentJob.currentStep);
}

// ============================================================================
// Default Export
// ============================================================================

export default useCameraAngleGeneration;
