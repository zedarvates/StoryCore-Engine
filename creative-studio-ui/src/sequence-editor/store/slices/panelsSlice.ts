/**
 * Panels Slice - Redux state management for panel layout and focus
 * Requirements: 4.1, 4.5, 4.6, 19.1
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PanelsState, PanelLayout } from '../../types';

// Default panel layout (percentages)
const DEFAULT_LAYOUT: PanelLayout = {
  assetLibrary: { width: 10 },
  preview: { width: 50, height: 60 },
  shotConfig: { width: 30 },
  timeline: { height: 40 },
};

const initialState: PanelsState = {
  layout: DEFAULT_LAYOUT,
  activePanel: 'assetLibrary',
  activeAssetCategory: 'environments', // Default to environments
  shotConfigTarget: null,
  showLayerManager: false,
  compactMode: false,
  libraryVisible: true,
  inspectorVisible: true,
  mixerVisible: false,
  metadataVisible: false,
  gridVisible: true,
  markersVisible: true,
  promptsVisible: true,
  showAlignmentDashboard: false,
  productionStudioMode: false,
};

const panelsSlice = createSlice({
  name: 'panels',
  initialState,
  reducers: {
    setPanelLayout: (state, action: PayloadAction<Partial<PanelLayout>>) => {
      state.layout = { ...state.layout, ...action.payload };
    },
    resetPanelLayout: (state) => {
      state.layout = DEFAULT_LAYOUT;
    },
    setActivePanel: (
      state,
      action: PayloadAction<'assetLibrary' | 'preview' | 'shotConfig' | 'timeline' | null>
    ) => {
      state.activePanel = action.payload;
    },
    setShotConfigTarget: (state, action: PayloadAction<string | null>) => {
      state.shotConfigTarget = action.payload;
    },
    toggleLayerManager: (state) => {
      state.showLayerManager = !state.showLayerManager;
    },
    setShowLayerManager: (state, action: PayloadAction<boolean>) => {
      state.showLayerManager = action.payload;
    },
    toggleCompactMode: (state) => {
      state.compactMode = !state.compactMode;
    },
    setCompactMode: (state, action: PayloadAction<boolean>) => {
      state.compactMode = action.payload;
    },
    setAssetCategory: (state, action: PayloadAction<string>) => {
      state.activeAssetCategory = action.payload;
    },
    setLibraryVisible: (state, action: PayloadAction<boolean>) => {
      state.libraryVisible = action.payload;
    },
    setInspectorVisible: (state, action: PayloadAction<boolean>) => {
      state.inspectorVisible = action.payload;
    },
    toggleLibrary: (state) => {
      state.libraryVisible = !state.libraryVisible;
    },
    toggleInspector: (state) => {
      state.inspectorVisible = !state.inspectorVisible;
    },
    toggleMixer: (state) => {
      state.mixerVisible = !state.mixerVisible;
    },
    toggleMetadata: (state) => {
      state.metadataVisible = !state.metadataVisible;
    },
    toggleGrid: (state) => {
      state.gridVisible = !state.gridVisible;
    },
    toggleMarkers: (state) => {
      state.markersVisible = !state.markersVisible;
    },
    togglePrompts: (state) => {
      state.promptsVisible = !state.promptsVisible;
    },
    toggleAlignmentDashboard: (state) => {
      state.showAlignmentDashboard = !state.showAlignmentDashboard;
    },
    toggleProductionStudioMode: (state) => {
      state.productionStudioMode = !state.productionStudioMode;
      // When entering studio mode, collapse standard panels for focus
      if (state.productionStudioMode) {
        state.libraryVisible = false;
        state.inspectorVisible = false;
      } else {
        state.libraryVisible = true;
        state.inspectorVisible = true;
      }
    },
  },
});

export const {
  setPanelLayout,
  resetPanelLayout,
  setActivePanel,
  setShotConfigTarget,
  toggleLayerManager,
  setShowLayerManager,
  toggleCompactMode,
  setCompactMode,
  setAssetCategory,
  setLibraryVisible,
  setInspectorVisible,
  toggleLibrary,
  toggleInspector,
  toggleMixer,
  toggleMetadata,
  toggleGrid,
  toggleMarkers,
  togglePrompts,
  toggleAlignmentDashboard,
  toggleProductionStudioMode,
} = panelsSlice.actions;

export default panelsSlice.reducer;
