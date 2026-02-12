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
  activePanel: null,
  shotConfigTarget: null,
  showLayerManager: false,
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
  },
});

export const {
  setPanelLayout,
  resetPanelLayout,
  setActivePanel,
  setShotConfigTarget,
  toggleLayerManager,
  setShowLayerManager,
} = panelsSlice.actions;

export default panelsSlice.reducer;
