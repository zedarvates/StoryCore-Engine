
/**
 * Lip Sync Store
 * 
 * Zustand store for managing Lip Sync state.
 */

import { create } from 'zustand';
import {
  LipSyncStatus,
  LipSyncRequest,
  LipSyncStatusResponse,
  LipSyncOptions,
  DEFAULT_LIP_SYNC_OPTIONS
} from '../types/lipSync';
import { lipSyncService } from '../services/lipSyncService';

// Use actual string values for comparison
const LIP_SYNC_STATUS_COMPLETED = 'completed';
const LIP_SYNC_STATUS_FAILED = 'failed';

interface LipSyncState {
  // Current job
  currentJob: LipSyncStatusResponse | null;

  // Selected assets
  characterFaceImage: string | null;
  faceImageFile: File | null;
  audioFile: string | null;
  audioFileObject: File | null;

  // Options
  options: LipSyncOptions;

  // Status
  isGenerating: boolean;
  progress: number;
  error: string | null;

  // Jobs list
  jobs: LipSyncStatusResponse[];

  // Actions
  setCharacterFaceImage: (image: string | null, file?: File | null) => void;
  setAudioFile: (audio: string | null, file?: File | null) => void;
  setOptions: (options: Partial<LipSyncOptions>) => void;
  generateLipSync: (projectId: string) => Promise<void>;
  checkStatus: (jobId: string) => Promise<void>;
  loadJobs: (projectId?: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  currentJob: null,
  characterFaceImage: null,
  faceImageFile: null,
  audioFile: null,
  audioFileObject: null,
  options: DEFAULT_LIP_SYNC_OPTIONS,
  isGenerating: false,
  progress: 0,
  error: null,
  jobs: [],
};

export const useLipSyncStore = create<LipSyncState>((set, get) => ({
  ...initialState,

  setCharacterFaceImage: (image, file = null) => {
    set({ characterFaceImage: image, faceImageFile: file });
  },

  setAudioFile: (audio, file = null) => {
    set({ audioFile: audio, audioFileObject: file });
  },

  setOptions: (newOptions) => {
    set((state) => ({
      options: { ...state.options, ...newOptions }
    }));
  },

  generateLipSync: async (projectId) => {
    const { characterFaceImage, audioFile, options } = get();

    if (!characterFaceImage) {
      set({ error: 'Please select a character face image' });
      return;
    }

    if (!audioFile) {
      set({ error: 'Please select an audio file' });
      return;
    }

    set({ isGenerating: true, progress: 0, error: null });

    try {
      // Step 0: Upload assets if they are File objects
      let faceImagePath = get().characterFaceImage || '';
      let audioPath = get().audioFile || '';

      const { faceImageFile, audioFileObject } = get();

      if (faceImageFile) {
        set({ progress: 5 }); // Indicate upload started
        const upload = await lipSyncService.uploadAsset(faceImageFile);
        faceImagePath = upload.filename; // Use the filename on the backend
      }

      if (audioFileObject) {
        set({ progress: 10 });
        const upload = await lipSyncService.uploadAsset(audioFileObject);
        audioPath = upload.filename;
      }

      const request: LipSyncRequest = {
        projectId,
        characterFaceImage: faceImagePath,
        audioFile: audioPath,
        model: options.model,
        enhancer: options.enhancer,
        pads: options.pads,
        nosmooth: options.nosmooth,
        style: options.style,
      };

      const response = await lipSyncService.generateLipSync(request);

      set({
        currentJob: {
          job_id: response.job_id,
          status: response.status as LipSyncStatus,
          progress: response.progress,
          created_at: Date.now(),
        },
        isGenerating: true,
        progress: 0,
      });

      // Poll for completion
      await lipSyncService.waitForCompletion(
        response.job_id,
        (status) => {
          set({
            currentJob: status,
            progress: status.progress,
            isGenerating: status.status !== LIP_SYNC_STATUS_COMPLETED && status.status !== LIP_SYNC_STATUS_FAILED,
          });
        },
        120,
        2000
      );

      // Refresh jobs list
      get().loadJobs(projectId);

    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Lip sync generation failed',
        isGenerating: false,
      });
    }
  },

  checkStatus: async (jobId) => {
    try {
      const status = await lipSyncService.checkStatus(jobId);
      set({ currentJob: status, progress: status.progress });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to check status'
      });
    }
  },

  loadJobs: async (projectId) => {
    try {
      const jobs = await lipSyncService.listJobs(projectId);
      set({ jobs });
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));

