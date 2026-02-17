/**
 * Camera Angle Store - Zustand store for camera angle editor feature
 * 
 * This store manages:
 * - Current generation job state
 * - Available presets
 * - Selected angles for generation
 * - Source image
 * - Generation options
 * - Error handling
 */

import { create } from 'zustand';
import { cameraAngleService } from '@/services/cameraAngleService';
import type {
  CameraAnglePreset,
  CameraAngleJobStatus,
  CameraAnglePresetMetadata,
  CameraAngleRequest,
  CameraAngleJobResponse,
  CameraAngleResult,
  CameraAngleQuality,
  CameraAngleResultResponse,
  CameraAngleApiError,
} from '@/types/cameraAngle';

// ============================================================================
// Store State Interface
// ============================================================================

interface CameraAngleStoreState {
  // Current job state
  currentJob: {
    jobId: string | null;
    status: CameraAngleJobStatus;
    progress: number;
    currentStep: string | null;
    completedAngles: CameraAnglePreset[];
    remainingAngles: CameraAnglePreset[];
    error: string | null;
    results: CameraAngleResult[];
    isLoading: boolean;
  };

  // Available presets
  presets: CameraAnglePresetMetadata[];
  presetsLoaded: boolean;

  // Selected angles for generation
  selectedAngles: CameraAnglePreset[];

  // Source image (base64)
  sourceImage: string | null;

  // Generation options
  options: {
    preserveStyle: boolean;
    quality: CameraAngleQuality;
    seed: number | null;
    customPrompt: string | null;
  };

  // Error state
  error: string | null;

  // Polling cleanup function
  _pollingCleanup: (() => void) | null;
}

// ============================================================================
// Store Actions Interface
// ============================================================================

interface CameraAngleStoreActions {
  // Job actions
  startGeneration: () => Promise<string>;
  fetchJobStatus: (jobId: string) => Promise<void>;
  fetchJobResult: (jobId: string) => Promise<CameraAngleResultResponse>;
  cancelJob: () => Promise<void>;
  resetJob: () => void;

  // Preset actions
  fetchPresets: () => Promise<void>;

  // Selection actions
  setSelectedAngles: (angles: CameraAnglePreset[]) => void;
  toggleAngle: (angle: CameraAnglePreset) => void;
  selectAllAngles: () => void;
  clearAngleSelection: () => void;

  // Source image actions
  setSourceImage: (imageBase64: string | null) => void;

  // Options actions
  setOptions: (options: Partial<CameraAngleStoreState['options']>) => void;
  setPreserveStyle: (preserveStyle: boolean) => void;
  setQuality: (quality: CameraAngleQuality) => void;
  setSeed: (seed: number | null) => void;
  setCustomPrompt: (prompt: string | null) => void;

  // Error actions
  setError: (error: string | null) => void;
  clearError: () => void;

  // Internal actions
  _setPollingCleanup: (cleanup: (() => void) | null) => void;
  _updateJobStatus: (status: CameraAngleJobResponse) => void;
  _setJobLoading: (isLoading: boolean) => void;
  _setJobResults: (results: CameraAngleResult[]) => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialJobState: CameraAngleStoreState['currentJob'] = {
  jobId: null,
  status: 'pending',
  progress: 0,
  currentStep: null,
  completedAngles: [],
  remainingAngles: [],
  error: null,
  results: [],
  isLoading: false,
};

const initialOptions: CameraAngleStoreState['options'] = {
  preserveStyle: true,
  quality: 'standard',
  seed: null,
  customPrompt: null,
};

// ============================================================================
// Store Creation
// ============================================================================

export const useCameraAngleStore = create<
  CameraAngleStoreState & CameraAngleStoreActions
>((set, get) => ({
  // Initial state
  currentJob: { ...initialJobState },
  presets: [],
  presetsLoaded: false,
  selectedAngles: [],
  sourceImage: null,
  options: { ...initialOptions },
  error: null,
  _pollingCleanup: null,

  // ==========================================================================
  // Job Actions
  // ==========================================================================

  startGeneration: async () => {
    const state = get();

    // Validate state
    if (!state.sourceImage) {
      throw new Error('No source image provided');
    }

    if (state.selectedAngles.length === 0) {
      throw new Error('No angles selected');
    }

    // Set loading state
    set({
      currentJob: {
        ...initialJobState,
        isLoading: true,
        status: 'pending',
        remainingAngles: state.selectedAngles,
      },
      error: null,
    });

    try {
      // Build request
      const request: CameraAngleRequest = {
        imageBase64: state.sourceImage,
        angleIds: state.selectedAngles,
        preserveStyle: state.options.preserveStyle,
        quality: state.options.quality,
        seed: state.options.seed,
        customPrompt: state.options.customPrompt,
      };

      // Start generation
      const response = await cameraAngleService.generate(request);

      // Update job state
      set({
        currentJob: {
          ...get().currentJob,
          jobId: response.jobId,
          status: response.status,
          progress: response.progress,
          currentStep: response.currentStep,
          completedAngles: response.completedAngles as CameraAnglePreset[],
          remainingAngles: response.remainingAngles as CameraAnglePreset[],
          isLoading: false,
        },
      });

      // Start polling for status updates
      const cleanup = cameraAngleService.pollJobStatus(
        response.jobId,
        // onProgress
        (status) => {
          get()._updateJobStatus(status);
        },
        // onComplete
        (result) => {
          set({
            currentJob: {
              ...get().currentJob,
              status: 'completed',
              progress: 100,
              results: result.results,
              isLoading: false,
            },
          });
        },
        // onError
        (error) => {
          set({
            currentJob: {
              ...get().currentJob,
              status: 'failed',
              error: error.message,
              isLoading: false,
            },
            error: error.message,
          });
        }
      );

      get()._setPollingCleanup(cleanup);

      return response.jobId;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start generation';

      set({
        currentJob: {
          ...get().currentJob,
          status: 'failed',
          error: errorMessage,
          isLoading: false,
        },
        error: errorMessage,
      });

      throw error;
    }
  },

  fetchJobStatus: async (jobId: string) => {
    try {
      const status = await cameraAngleService.getStatus(jobId);
      get()._updateJobStatus(status);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch job status';
      set({
        error: errorMessage,
      });
      throw error;
    }
  },

  fetchJobResult: async (jobId: string) => {
    try {
      const result = await cameraAngleService.getResult(jobId);
      get()._setJobResults(result.results);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch job result';
      set({
        error: errorMessage,
      });
      throw error;
    }
  },

  cancelJob: async () => {
    const state = get();
    const jobId = state.currentJob.jobId;

    if (!jobId) {
      return;
    }

    // Stop polling
    if (state._pollingCleanup) {
      state._pollingCleanup();
      get()._setPollingCleanup(null);
    }

    try {
      await cameraAngleService.cancelJob(jobId);

      set({
        currentJob: {
          ...get().currentJob,
          status: 'cancelled',
          isLoading: false,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to cancel job';
      set({
        error: errorMessage,
      });
      throw error;
    }
  },

  resetJob: () => {
    // Stop polling if active
    const state = get();
    if (state._pollingCleanup) {
      state._pollingCleanup();
    }

    set({
      currentJob: { ...initialJobState },
      error: null,
      _pollingCleanup: null,
    });
  },

  // ==========================================================================
  // Preset Actions
  // ==========================================================================

  fetchPresets: async () => {
    // Skip if already loaded
    if (get().presetsLoaded) {
      return;
    }

    try {
      const response = await cameraAngleService.getPresets();

      set({
        presets: response.presets,
        presetsLoaded: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch presets';
      set({
        error: errorMessage,
      });
      throw error;
    }
  },

  // ==========================================================================
  // Selection Actions
  // ==========================================================================

  setSelectedAngles: (angles: CameraAnglePreset[]) => {
    set({ selectedAngles: angles });
  },

  toggleAngle: (angle: CameraAnglePreset) => {
    const state = get();
    const isSelected = state.selectedAngles.includes(angle);

    if (isSelected) {
      set({
        selectedAngles: state.selectedAngles.filter((a) => a !== angle),
      });
    } else {
      set({
        selectedAngles: [...state.selectedAngles, angle],
      });
    }
  },

  selectAllAngles: () => {
    const state = get();
    set({
      selectedAngles: state.presets.map((p) => p.id),
    });
  },

  clearAngleSelection: () => {
    set({ selectedAngles: [] });
  },

  // ==========================================================================
  // Source Image Actions
  // ==========================================================================

  setSourceImage: (imageBase64: string | null) => {
    set({ sourceImage: imageBase64 });
  },

  // ==========================================================================
  // Options Actions
  // ==========================================================================

  setOptions: (options: Partial<CameraAngleStoreState['options']>) => {
    set({
      options: {
        ...get().options,
        ...options,
      },
    });
  },

  setPreserveStyle: (preserveStyle: boolean) => {
    set({
      options: {
        ...get().options,
        preserveStyle,
      },
    });
  },

  setQuality: (quality: CameraAngleQuality) => {
    set({
      options: {
        ...get().options,
        quality,
      },
    });
  },

  setSeed: (seed: number | null) => {
    set({
      options: {
        ...get().options,
        seed,
      },
    });
  },

  setCustomPrompt: (prompt: string | null) => {
    set({
      options: {
        ...get().options,
        customPrompt: prompt,
      },
    });
  },

  // ==========================================================================
  // Error Actions
  // ==========================================================================

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  // ==========================================================================
  // Internal Actions
  // ==========================================================================

  _setPollingCleanup: (cleanup: (() => void) | null) => {
    set({ _pollingCleanup: cleanup });
  },

  _updateJobStatus: (status: CameraAngleJobResponse) => {
    set({
      currentJob: {
        ...get().currentJob,
        jobId: status.jobId,
        status: status.status,
        progress: status.progress,
        currentStep: status.currentStep,
        completedAngles: status.completedAngles as CameraAnglePreset[],
        remainingAngles: status.remainingAngles as CameraAnglePreset[],
        error: status.error,
      },
    });
  },

  _setJobLoading: (isLoading: boolean) => {
    set({
      currentJob: {
        ...get().currentJob,
        isLoading,
      },
    });
  },

  _setJobResults: (results: CameraAngleResult[]) => {
    set({
      currentJob: {
        ...get().currentJob,
        results,
      },
    });
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select current job state
 */
export const useCurrentJob = () =>
  useCameraAngleStore((state) => state.currentJob);

/**
 * Select available presets
 */
export const usePresets = () =>
  useCameraAngleStore((state) => state.presets);

/**
 * Select selected angles
 */
export const useSelectedAngles = () =>
  useCameraAngleStore((state) => state.selectedAngles);

/**
 * Select source image
 */
export const useSourceImage = () =>
  useCameraAngleStore((state) => state.sourceImage);

/**
 * Select generation options
 */
export const useGenerationOptions = () =>
  useCameraAngleStore((state) => state.options);

/**
 * Select error state
 */
export const useCameraAngleError = () =>
  useCameraAngleStore((state) => state.error);

/**
 * Check if generation is in progress
 */
export const useIsGenerating = () =>
  useCameraAngleStore(
    (state) =>
      state.currentJob.isLoading ||
      state.currentJob.status === 'pending' ||
      state.currentJob.status === 'processing'
  );

/**
 * Check if job has completed with results
 */
export const useHasResults = () =>
  useCameraAngleStore(
    (state) =>
      state.currentJob.status === 'completed' &&
      state.currentJob.results.length > 0
  );
