
/**
 * Lip Sync Store
 * 
 * Zustand store for managing Lip Sync state.
 */

import { create } from 'zustand';
import {
  LipSyncModel,
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
  audioFile: string | null;
  
  // Options
  options: LipSyncOptions;
  
  // Status
  isGenerating: boolean;
  progress: number;
  error: string | null;
  
  // Jobs list
  jobs: LipSyncStatusResponse[];
  
  // Actions
  setCharacterFaceImage: (image: string | null) => void;
  setAudioFile: (audio: string | null) => void;
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
  audioFile: null,
  options: DEFAULT_LIP_SYNC_OPTIONS,
  isGenerating: false,
  progress: 0,
  error: null,
  jobs: [],
};

export const useLipSyncStore = create<LipSyncState>((set, get) => ({
  ...initialState,
  
  setCharacterFaceImage: (image) => {
    set({ characterFaceImage: image });
  },
  
  setAudioFile: (audio) => {
    set({ audioFile: audio });
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
      const request: LipSyncRequest = {
        projectId,
        characterFaceImage,
        audioFile,
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
          created_at: new Date().toISOString(),
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

