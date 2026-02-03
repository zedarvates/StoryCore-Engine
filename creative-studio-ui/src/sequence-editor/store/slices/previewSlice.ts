/**
 * Preview Slice - Redux state management for preview frame and playback
 * Requirements: 3.1, 3.4, 3.6, 19.1
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PreviewState, PlaybackState } from '../../types';

const initialState: PreviewState = {
  currentFrame: null,
  playbackState: 'stopped',
  playbackSpeed: 1, // 1x normal speed
};

const previewSlice = createSlice({
  name: 'preview',
  initialState,
  reducers: {
    setCurrentFrame: (state, action: PayloadAction<ImageData | null>) => {
      state.currentFrame = action.payload;
    },
    setPlaybackState: (state, action: PayloadAction<PlaybackState>) => {
      state.playbackState = action.payload;
    },
    play: (state) => {
      state.playbackState = 'playing';
    },
    pause: (state) => {
      state.playbackState = 'paused';
    },
    stop: (state) => {
      state.playbackState = 'stopped';
    },
    setPlaybackSpeed: (state, action: PayloadAction<number>) => {
      state.playbackSpeed = action.payload;
    },
  },
});

export const {
  setCurrentFrame,
  setPlaybackState,
  play,
  pause,
  stop,
  setPlaybackSpeed,
} = previewSlice.actions;

export default previewSlice.reducer;
