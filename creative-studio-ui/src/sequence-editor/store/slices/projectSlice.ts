/**
 * Project Slice - Redux state management for project metadata and settings
 * Requirements: 19.1, 19.6
 */
import { LegacyAny } from '@/types/legacy';


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
  sequences: [],
  activeSequenceId: undefined,
};

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    setProject: (state, action: PayloadAction<LegacyAny>) => {
      if (!action.payload) {
        state.metadata = null;
        state.sequences = [];
        return;
      }
      
      const p = action.payload;
      state.metadata = {
        id: p.id || p.metadata?.id,
        name: p.project_name || p.metadata?.name || 'Untitled',
        path: p.path || p.metadata?.path || '',
        created: p.created || Date.now(),
        modified: p.modified || Date.now(),
        author: p.author || 'User',
        description: p.description || ''
      };
      
      state.sequences = p.sequences || p.sequencePlans || p.metadata?.sequences || [];
    },
    setActiveSequence: (state, action: PayloadAction<string>) => {
      state.activeSequenceId = action.payload;
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
  setActiveSequence,
  updateMetadata,
  updateSettings,
  setSaveStatus,
  setGenerationStatus,
  markModified,
  markSaved,
} = projectSlice.actions;

export default projectSlice.reducer;
