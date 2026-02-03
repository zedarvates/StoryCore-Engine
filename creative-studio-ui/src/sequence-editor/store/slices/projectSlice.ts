/**
 * Project Slice - Redux state management for project metadata and settings
 * Requirements: 19.1, 19.6
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  ProjectState,
  ProjectMetadata,
  ProjectSettings,
  SaveStatus,
  GenerationStatus,
} from '../../types';

const initialState: ProjectState = {
  metadata: null,
  settings: {
    resolution: { width: 1920, height: 1080 },
    format: 'mp4',
    fps: 30,
    quality: 'preview',
  },
  saveStatus: {
    state: 'saved',
  },
  generationStatus: {
    state: 'idle',
  },
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setProject: (state, action: PayloadAction<ProjectMetadata | null>) => {
      state.metadata = action.payload;
    },
    updateMetadata: (state, action: PayloadAction<Partial<ProjectMetadata>>) => {
      if (state.metadata) {
        state.metadata = { ...state.metadata, ...action.payload };
      }
    },
    updateSettings: (state, action: PayloadAction<Partial<ProjectSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setSaveStatus: (state, action: PayloadAction<SaveStatus>) => {
      state.saveStatus = action.payload;
    },
    setGenerationStatus: (state, action: PayloadAction<GenerationStatus>) => {
      state.generationStatus = action.payload;
    },
    markModified: (state) => {
      state.saveStatus.state = 'modified';
    },
    markSaved: (state) => {
      state.saveStatus = {
        state: 'saved',
        lastSaveTime: Date.now(), // Store timestamp as number for Redux serialization
      };
    },
  },
});

export const {
  setProject,
  updateMetadata,
  updateSettings,
  setSaveStatus,
  setGenerationStatus,
  markModified,
  markSaved,
} = projectSlice.actions;

export default projectSlice.reducer;
