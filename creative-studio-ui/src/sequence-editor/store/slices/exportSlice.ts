/**
 * Export Slice - Redux state management for video export jobs
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ExportJob {
  id: string;
  projectId: string;
  presetName: string;
  format: string;
  resolution: string;
  quality: string;
  status: ExportStatus;
  progress: number;
  createdAt: number;
  completedAt?: number;
  downloadUrl?: string;
  error?: string;
}

interface ExportState {
  jobs: ExportJob[];
  isQueueVisible: boolean;
}

const initialState: ExportState = {
  jobs: [],
  isQueueVisible: false,
};

const exportSlice = createSlice({
  name: 'export',
  initialState,
  reducers: {
    addJob: (state, action: PayloadAction<ExportJob>) => {
      state.jobs.unshift(action.payload);
    },
    updateJobProgress: (state, action: PayloadAction<{ id: string; progress: number; status?: ExportStatus }>) => {
      const job = state.jobs.find(j => j.id === action.payload.id);
      if (job) {
        job.progress = action.payload.progress;
        if (action.payload.status) {
          job.status = action.payload.status;
        }
      }
    },
    setJobCompleted: (state, action: PayloadAction<{ id: string; downloadUrl: string }>) => {
      const job = state.jobs.find(j => j.id === action.payload.id);
      if (job) {
        job.status = 'completed';
        job.progress = 100;
        job.downloadUrl = action.payload.downloadUrl;
        job.completedAt = Date.now();
      }
    },
    setJobFailed: (state, action: PayloadAction<{ id: string; error: string }>) => {
      const job = state.jobs.find(j => j.id === action.payload.id);
      if (job) {
        job.status = 'failed';
        job.error = action.payload.error;
        job.completedAt = Date.now();
      }
    },
    removeJob: (state, action: PayloadAction<string>) => {
      state.jobs = state.jobs.filter(j => j.id !== action.payload);
    },
    toggleQueue: (state) => {
      state.isQueueVisible = !state.isQueueVisible;
    },
    clearCompletedJobs: (state) => {
      state.jobs = state.jobs.filter(j => j.status !== 'completed' && j.status !== 'failed');
    }
  }
});

export const { 
  addJob, 
  updateJobProgress, 
  setJobCompleted, 
  setJobFailed, 
  removeJob, 
  toggleQueue,
  clearCompletedJobs 
} = exportSlice.actions;

export default exportSlice.reducer;
