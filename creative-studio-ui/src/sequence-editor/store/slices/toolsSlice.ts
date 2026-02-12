/**
 * Tools Slice - Redux state management for editing tools
 * Requirements: 2.1, 2.3, 2.4, 19.1
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ToolsState, ToolType } from '../../types';

const initialState: ToolsState = {
  activeTool: 'select', // Default to Select tool
  toolSettings: {},
};

const toolsSlice = createSlice({
  name: 'tools',
  initialState,
  reducers: {
    setActiveTool: (state, action: PayloadAction<ToolType>) => {
      state.activeTool = action.payload;
    },
    setToolSettings: (state, action: PayloadAction<Record<string, unknown>>) => {
      state.toolSettings = { ...state.toolSettings, ...action.payload };
    },
    clearToolSettings: (state) => {
      state.toolSettings = {};
    },
  },
});

export const {
  setActiveTool,
  setToolSettings,
  clearToolSettings,
} = toolsSlice.actions;

export default toolsSlice.reducer;

