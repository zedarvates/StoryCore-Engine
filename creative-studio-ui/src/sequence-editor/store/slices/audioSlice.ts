/**
 * Audio Slice - Redux state management for audio mixing
 * 
 * Manages audio tracks including:
 * - Track volume, pan, mute, solo
 * - Master volume
 * - Auto-mix configuration
 * - Audio generation state
 * 
 * Requirements: Phase 1 - Redux State Enhancement
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// =============================================================================
// Types
// =============================================================================

export type AudioProfileType = 'music' | 'sfx' | 'voice';

export interface AudioTrack {
  id: string;
  name: string;
  type: AudioProfileType;
  volume: number;        // 0-1
  pan: number;           // -1 to 1
  muted: boolean;
  solo: boolean;
  color: string;
}

export interface MixConfiguration {
  masterVolume: number;
  autoMixEnabled: boolean;
  duckingEnabled: boolean;
  duckingLevel: number;
}

export interface AudioGenerationOptions {
  profileType: AudioProfileType;
  theme?: string;
  location?: string;
  category?: string;
  voiceType?: string;
  style?: string;
  duration: number;
}

export interface AudioExportOptions {
  format: 'wav' | 'mp3' | 'flac' | 'aac';
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

// =============================================================================
// Initial State
// =============================================================================

export interface AudioState {
  tracks: AudioTrack[];
  masterVolume: number;
  mixConfiguration: MixConfiguration;
  generationOptions: AudioGenerationOptions | null;
  isGenerating: boolean;
  isExporting: boolean;
  exportProgress: number;
  lastGeneratedTrack: string | null;
  error: string | null;
}

const initialState: AudioState = {
  tracks: [
    { id: 'music-1', name: 'Background Music', type: 'music', volume: 0.8, pan: 0, muted: false, solo: false, color: '#50C878' },
    { id: 'sfx-1', name: 'Sound Effects', type: 'sfx', volume: 0.7, pan: 0, muted: false, solo: false, color: '#4A90E2' },
    { id: 'voice-1', name: 'Voice Over', type: 'voice', volume: 1.0, pan: 0, muted: false, solo: false, color: '#F39C12' },
  ],
  masterVolume: 0.8,
  mixConfiguration: {
    masterVolume: 0.8,
    autoMixEnabled: true,
    duckingEnabled: true,
    duckingLevel: -20,
  },
  generationOptions: null,
  isGenerating: false,
  isExporting: false,
  exportProgress: 0,
  lastGeneratedTrack: null,
  error: null,
};

// =============================================================================
// Slice
// =============================================================================

const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    // Track volume
    setTrackVolume: (state, action: PayloadAction<{ trackId: string; volume: number }>) => {
      const { trackId, volume } = action.payload;
      const track = state.tracks.find(t => t.id === trackId);
      if (track) {
        track.volume = Math.max(0, Math.min(1, volume));
      }
    },
    
    // Track pan
    setTrackPan: (state, action: PayloadAction<{ trackId: string; pan: number }>) => {
      const { trackId, pan } = action.payload;
      const track = state.tracks.find(t => t.id === trackId);
      if (track) {
        track.pan = Math.max(-1, Math.min(1, pan));
      }
    },
    
    // Toggle mute
    toggleTrackMute: (state, action: PayloadAction<string>) => {
      const track = state.tracks.find(t => t.id === action.payload);
      if (track) {
        track.muted = !track.muted;
      }
    },
    
    // Toggle solo
    toggleTrackSolo: (state, action: PayloadAction<string>) => {
      const track = state.tracks.find(t => t.id === action.payload);
      if (track) {
        track.solo = !track.solo;
      }
    },
    
    // Update entire track
    updateTrack: (state, action: PayloadAction<{ trackId: string; updates: Partial<AudioTrack> }>) => {
      const { trackId, updates } = action.payload;
      const trackIndex = state.tracks.findIndex(t => t.id === trackId);
      if (trackIndex !== -1) {
        state.tracks[trackIndex] = { ...state.tracks[trackIndex], ...updates };
      }
    },
    
    // Add track
    addTrack: (state, action: PayloadAction<AudioTrack>) => {
      state.tracks.push(action.payload);
    },
    
    // Remove track
    removeTrack: (state, action: PayloadAction<string>) => {
      state.tracks = state.tracks.filter(t => t.id !== action.payload);
    },
    
    // Reorder tracks
    reorderTracks: (state, action: PayloadAction<AudioTrack[]>) => {
      state.tracks = action.payload;
    },
    
    // Master volume
    setMasterVolume: (state, action: PayloadAction<number>) => {
      state.masterVolume = Math.max(0, Math.min(1, action.payload));
      state.mixConfiguration.masterVolume = state.masterVolume;
    },
    
    // Mix configuration
    setMixConfiguration: (state, action: PayloadAction<Partial<MixConfiguration>>) => {
      state.mixConfiguration = { ...state.mixConfiguration, ...action.payload };
    },
    
    // Auto-mix
    setAutoMixEnabled: (state, action: PayloadAction<boolean>) => {
      state.mixConfiguration.autoMixEnabled = action.payload;
    },
    
    // Ducking
    setDuckingEnabled: (state, action: PayloadAction<boolean>) => {
      state.mixConfiguration.duckingEnabled = action.payload;
    },
    
    // Ducking level
    setDuckingLevel: (state, action: PayloadAction<number>) => {
      state.mixConfiguration.duckingLevel = action.payload;
    },
    
    // Generation options
    setGenerationOptions: (state, action: PayloadAction<AudioGenerationOptions | null>) => {
      state.generationOptions = action.payload;
    },
    
    // Generating state
    setIsGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },
    
    // Exporting state
    setIsExporting: (state, action: PayloadAction<boolean>) => {
      state.isExporting = action.payload;
    },
    
    // Export progress
    setExportProgress: (state, action: PayloadAction<number>) => {
      state.exportProgress = Math.max(0, Math.min(100, action.payload));
    },
    
    // Last generated track
    setLastGeneratedTrack: (state, action: PayloadAction<string | null>) => {
      state.lastGeneratedTrack = action.payload;
    },
    
    // Error
    setAudioError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Reset to defaults
    resetAudioState: (state) => {
      state.tracks = initialState.tracks;
      state.masterVolume = initialState.masterVolume;
      state.mixConfiguration = initialState.mixConfiguration;
      state.generationOptions = null;
      state.isGenerating = false;
      state.isExporting = false;
      state.exportProgress = 0;
      state.lastGeneratedTrack = null;
      state.error = null;
    },
    
    // Apply auto-mix results
    applyAutoMixResults: (state, action: PayloadAction<{ trackId: string; volume: number; pan: number }[]>) => {
      action.payload.forEach(result => {
        const track = state.tracks.find(t => t.id === result.trackId);
        if (track) {
          track.volume = result.volume;
          track.pan = result.pan;
        }
      });
    },
  },
});

// =============================================================================
// Actions
// =============================================================================

export const {
  setTrackVolume,
  setTrackPan,
  toggleTrackMute,
  toggleTrackSolo,
  updateTrack,
  addTrack,
  removeTrack,
  reorderTracks,
  setMasterVolume,
  setMixConfiguration,
  setAutoMixEnabled,
  setDuckingEnabled,
  setDuckingLevel,
  setGenerationOptions,
  setIsGenerating,
  setIsExporting,
  setExportProgress,
  setLastGeneratedTrack,
  setAudioError,
  resetAudioState,
  applyAutoMixResults,
} = audioSlice.actions;

// =============================================================================
// Selectors
// =============================================================================

// Get all tracks
export const selectAllTracks = (state: { audio: AudioState }): AudioTrack[] => 
  state.audio.tracks;

// Get track by ID
export const selectTrackById = (state: { audio: AudioState }, trackId: string): AudioTrack | undefined =>
  state.audio.tracks.find(t => t.id === trackId);

// Get master volume
export const selectMasterVolume = (state: { audio: AudioState }): number => 
  state.audio.masterVolume;

// Get mix configuration
export const selectMixConfiguration = (state: { audio: AudioState }): MixConfiguration => 
  state.audio.mixConfiguration;

// Get tracks by type
export const selectTracksByType = (state: { audio: AudioState }, type: AudioProfileType): AudioTrack[] =>
  state.audio.tracks.filter(t => t.type === type);

// Get is generating
export const selectIsGenerating = (state: { audio: AudioState }): boolean =>
  state.audio.isGenerating;

// Get is exporting
export const selectIsExporting = (state: { audio: AudioState }): boolean =>
  state.audio.isExporting;

// Get export progress
export const selectExportProgress = (state: { audio: AudioState }): number =>
  state.audio.exportProgress;

// Get error
export const selectAudioError = (state: { audio: AudioState }): string | null =>
  state.audio.error;

// Get muted tracks
export const selectMutedTracks = (state: { audio: AudioState }): AudioTrack[] =>
  state.audio.tracks.filter(t => t.muted);

// Get solo tracks
export const selectSoloTracks = (state: { audio: AudioState }): AudioTrack[] =>
  state.audio.tracks.filter(t => t.solo);

// Get effective volume for a track (considering mute and solo)
export const selectEffectiveVolume = (state: { audio: AudioState }, trackId: string): number => {
  const track = state.audio.tracks.find(t => t.id === trackId);
  if (!track) return 0;
  
  // If track is muted, volume is 0
  if (track.muted) return 0;
  
  // If there are solo tracks, only solo tracks are audible
  const hasSoloTracks = state.audio.tracks.some(t => t.solo);
  if (hasSoloTracks && !track.solo) return 0;
  
  return track.volume * state.audio.masterVolume;
};

// =============================================================================
// Reducer
// =============================================================================

export default audioSlice.reducer;

