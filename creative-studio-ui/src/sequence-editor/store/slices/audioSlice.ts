/**
 * Audio Slice - Redux state management for audio mixing
 * 
 * Manages audio tracks including:
 * - Track volume, pan, mute, solo
 * - Master volume
 * - Auto-mix configuration
 * - Audio generation state
 * - Surround sound support (5.1, 7.1)
 * - Surwoofer/LFE channel management
 * 
 * Requirements: Phase 1 - Redux State Enhancement
 * Enhanced: Surround Sound System (5.1, 7.1, Subwoofer)
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// =============================================================================
// Surround Sound Types
// =============================================================================

/**
 * Speaker configuration types
 */
export type SpeakerConfig = 'stereo' | '2.1' | '5.1' | '7.1';

/**
 * Individual speaker channel identifiers
 */
export type SpeakerChannel = 
  | 'frontLeft'      // FL - Front Left
  | 'frontRight'     // FR - Front Right
  | 'center'         // C  - Center (dialogue)
  | 'lfe'            // LFE - Low Frequency Effects (Subwoofer)
  | 'surroundLeft'   // SL - Surround Left (5.1)
  | 'surroundRight'  // SR - Surround Right (5.1)
  | 'backLeft'       // BL - Back Left (7.1 only)
  | 'backRight';     // BR - Back Right (7.1 only)

/**
 * Speaker configuration with channel mapping
 */
export interface SpeakerConfiguration {
  config: SpeakerConfig;
  channels: SpeakerChannel[];
  channelCount: number;
  hasLFE: boolean;
  hasSurround: boolean;
  hasBackSurround: boolean;
}

/**
 * Predefined speaker configurations
 */
export const SPEAKER_CONFIGURATIONS: Record<SpeakerConfig, SpeakerConfiguration> = {
  stereo: {
    config: 'stereo',
    channels: ['frontLeft', 'frontRight'],
    channelCount: 2,
    hasLFE: false,
    hasSurround: false,
    hasBackSurround: false,
  },
  '2.1': {
    config: '2.1',
    channels: ['frontLeft', 'frontRight', 'lfe'],
    channelCount: 3,
    hasLFE: true,
    hasSurround: false,
    hasBackSurround: false,
  },
  '5.1': {
    config: '5.1',
    channels: ['frontLeft', 'frontRight', 'center', 'lfe', 'surroundLeft', 'surroundRight'],
    channelCount: 6,
    hasLFE: true,
    hasSurround: true,
    hasBackSurround: false,
  },
  '7.1': {
    config: '7.1',
    channels: ['frontLeft', 'frontRight', 'center', 'lfe', 'surroundLeft', 'surroundRight', 'backLeft', 'backRight'],
    channelCount: 8,
    hasLFE: true,
    hasSurround: true,
    hasBackSurround: true,
  },
};

/**
 * Individual speaker volume and settings
 */
export interface SpeakerSettings {
  channel: SpeakerChannel;
  volume: number;        // 0-1
  muted: boolean;
  delay: number;         // milliseconds (for speaker distance calibration)
  solo: boolean;
}

/**
 * Subwoofer specific settings
 */
export interface SubwooferSettings {
  enabled: boolean;
  volume: number;           // 0-1
  crossoverFrequency: number; // Hz (typically 80-120Hz)
  phase: number;            // 0-360 degrees
  gain: number;             // dB (-10 to +10)
  lowPassFilter: {
    enabled: boolean;
    frequency: number;      // Hz
    slope: number;          // dB/octave (12, 18, 24)
  };
}

/**
 * Surround panner for positioning sound in 3D space
 */
export interface SurroundPanner {
  // Spherical coordinates for 3D positioning
  azimuth: number;          // -180 to 180 (left to right)
  elevation: number;        // -90 to 90 (below to above)
  distance: number;         // 0 to 1 (center to far)
  
  // Or Cartesian coordinates
  x: number;                // -1 (left) to 1 (right)
  y: number;                // -1 (back) to 1 (front)
  z: number;                // 0 (floor) to 1 (ceiling)
  
  // Spread/focus
  spread: number;           // 0 (point source) to 1 (diffuse)
  
  // LFE send amount
  lfeSend: number;          // 0-1 (how much to send to subwoofer)
}

/**
 * Room acoustic simulation settings
 */
export interface RoomAcoustics {
  enabled: boolean;
  roomSize: 'small' | 'medium' | 'large' | 'hall' | 'stadium';
  reverbTime: number;       // RT60 in seconds
  earlyReflections: boolean;
  distanceModel: 'inverse' | 'linear' | 'exponential';
  listenerPosition: {
    x: number;
    y: number;
    z: number;
  };
}

// =============================================================================
// Audio Track Types
// =============================================================================

export type AudioProfileType = 'music' | 'sfx' | 'voice' | 'ambience' | 'foley';

export interface AudioTrack {
  id: string;
  name: string;
  type: AudioProfileType;
  volume: number;        // 0-1
  pan: number;           // -1 to 1 (stereo pan)
  muted: boolean;
  solo: boolean;
  color: string;
  
  // Surround sound extension
  surroundEnabled: boolean;
  surroundPanner: SurroundPanner;
  
  // Channel routing
  channelRouting: Partial<Record<SpeakerChannel, number>>; // volume send per channel
  
  // LFE/Subwoofer
  lfeSend: number;       // 0-1 amount sent to subwoofer
  
  // Audio analysis
  peakLevel?: number;    // dB
  rmsLevel?: number;     // dB
}

// =============================================================================
// Mix Configuration
// =============================================================================

export interface MixConfiguration {
  masterVolume: number;
  autoMixEnabled: boolean;
  duckingEnabled: boolean;
  duckingLevel: number;
  
  // Surround settings
  speakerConfig: SpeakerConfig;
  downmixEnabled: boolean;    // Convert surround to stereo when needed
  bassManagement: boolean;     // Auto-route low frequencies to LFE
}

// =============================================================================
// Audio Export Options
// =============================================================================

export interface AudioGenerationOptions {
  profileType: AudioProfileType;
  theme?: string;
  location?: string;
  category?: string;
  voiceType?: string;
  style?: string;
  duration: number;
  outputChannels?: SpeakerConfig;
}

export interface AudioExportOptions {
  format: 'wav' | 'mp3' | 'flac' | 'aac' | 'ac3' | 'dts';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  channels: SpeakerConfig;
  sampleRate: 44100 | 48000 | 96000;
  bitDepth: 16 | 24 | 32;
}

// =============================================================================
// Audio Analysis
// =============================================================================

export interface AudioAnalysis {
  peakLevel: number;      // dB
  rmsLevel: number;       // dB
  lufsLevel: number;      // Loudness Units Full Scale
  dynamicRange: number;   // dB
  truePeak: number;       // dBTP
  channelLevels: Record<SpeakerChannel, number>;
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
  
  // Surround sound state
  speakerSettings: Record<SpeakerChannel, SpeakerSettings>;
  subwooferSettings: SubwooferSettings;
  roomAcoustics: RoomAcoustics;
  audioAnalysis: AudioAnalysis | null;
  
  // Calibration
  isCalibrating: boolean;
  calibrationProgress: number;
}

/**
 * Create default speaker settings for a channel
 */
const createDefaultSpeakerSettings = (channel: SpeakerChannel): SpeakerSettings => ({
  channel,
  volume: 1.0,
  muted: false,
  delay: 0,
  solo: false,
});

/**
 * Create default surround panner
 */
const createDefaultSurroundPanner = (): SurroundPanner => ({
  azimuth: 0,
  elevation: 0,
  distance: 0.5,
  x: 0,
  y: 1,
  z: 0.5,
  spread: 0,
  lfeSend: 0,
});

/**
 * Create default audio track
 */
export const createDefaultTrack = (id: string, name: string, type: AudioProfileType): AudioTrack => ({
  id,
  name,
  type,
  volume: 0.8,
  pan: 0,
  muted: false,
  solo: false,
  color: type === 'music' ? '#50C878' : type === 'sfx' ? '#4A90E2' : type === 'voice' ? '#F39C12' : '#9B59B6',
  surroundEnabled: false,
  surroundPanner: createDefaultSurroundPanner(),
  channelRouting: {},
  lfeSend: 0,
});

const initialState: AudioState = {
  tracks: [
    createDefaultTrack('music-1', 'Background Music', 'music'),
    createDefaultTrack('sfx-1', 'Sound Effects', 'sfx'),
    createDefaultTrack('voice-1', 'Voice Over', 'voice'),
  ],
  masterVolume: 0.8,
  mixConfiguration: {
    masterVolume: 0.8,
    autoMixEnabled: true,
    duckingEnabled: true,
    duckingLevel: -20,
    speakerConfig: 'stereo',
    downmixEnabled: true,
    bassManagement: true,
  },
  generationOptions: null,
  isGenerating: false,
  isExporting: false,
  exportProgress: 0,
  lastGeneratedTrack: null,
  error: null,
  
  // Initialize all possible speaker channels
  speakerSettings: {
    frontLeft: createDefaultSpeakerSettings('frontLeft'),
    frontRight: createDefaultSpeakerSettings('frontRight'),
    center: createDefaultSpeakerSettings('center'),
    lfe: createDefaultSpeakerSettings('lfe'),
    surroundLeft: createDefaultSpeakerSettings('surroundLeft'),
    surroundRight: createDefaultSpeakerSettings('surroundRight'),
    backLeft: createDefaultSpeakerSettings('backLeft'),
    backRight: createDefaultSpeakerSettings('backRight'),
  },
  
  subwooferSettings: {
    enabled: true,
    volume: 0.8,
    crossoverFrequency: 80,
    phase: 0,
    gain: 0,
    lowPassFilter: {
      enabled: true,
      frequency: 80,
      slope: 24,
    },
  },
  
  roomAcoustics: {
    enabled: false,
    roomSize: 'medium',
    reverbTime: 0.5,
    earlyReflections: true,
    distanceModel: 'inverse',
    listenerPosition: { x: 0, y: 0.5, z: 0 },
  },
  
  audioAnalysis: null,
  isCalibrating: false,
  calibrationProgress: 0,
};

// =============================================================================
// Slice
// =============================================================================

const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    // =========================================================================
    // Basic Track Operations
    // =========================================================================
    
    setTrackVolume: (state, action: PayloadAction<{ trackId: string; volume: number }>) => {
      const { trackId, volume } = action.payload;
      const track = state.tracks.find(t => t.id === trackId);
      if (track) {
        track.volume = Math.max(0, Math.min(1, volume));
      }
    },
    
    setTrackPan: (state, action: PayloadAction<{ trackId: string; pan: number }>) => {
      const { trackId, pan } = action.payload;
      const track = state.tracks.find(t => t.id === trackId);
      if (track) {
        track.pan = Math.max(-1, Math.min(1, pan));
      }
    },
    
    toggleTrackMute: (state, action: PayloadAction<string>) => {
      const track = state.tracks.find(t => t.id === action.payload);
      if (track) {
        track.muted = !track.muted;
      }
    },
    
    toggleTrackSolo: (state, action: PayloadAction<string>) => {
      const track = state.tracks.find(t => t.id === action.payload);
      if (track) {
        track.solo = !track.solo;
      }
    },
    
    updateTrack: (state, action: PayloadAction<{ trackId: string; updates: Partial<AudioTrack> }>) => {
      const { trackId, updates } = action.payload;
      const trackIndex = state.tracks.findIndex(t => t.id === trackId);
      if (trackIndex !== -1) {
        state.tracks[trackIndex] = { ...state.tracks[trackIndex], ...updates };
      }
    },
    
    addTrack: (state, action: PayloadAction<AudioTrack>) => {
      state.tracks.push(action.payload);
    },
    
    removeTrack: (state, action: PayloadAction<string>) => {
      state.tracks = state.tracks.filter(t => t.id !== action.payload);
    },
    
    reorderTracks: (state, action: PayloadAction<AudioTrack[]>) => {
      state.tracks = action.payload;
    },
    
    // =========================================================================
    // Master & Mix Operations
    // =========================================================================
    
    setMasterVolume: (state, action: PayloadAction<number>) => {
      state.masterVolume = Math.max(0, Math.min(1, action.payload));
      state.mixConfiguration.masterVolume = state.masterVolume;
    },
    
    setMixConfiguration: (state, action: PayloadAction<Partial<MixConfiguration>>) => {
      state.mixConfiguration = { ...state.mixConfiguration, ...action.payload };
    },
    
    setAutoMixEnabled: (state, action: PayloadAction<boolean>) => {
      state.mixConfiguration.autoMixEnabled = action.payload;
    },
    
    setDuckingEnabled: (state, action: PayloadAction<boolean>) => {
      state.mixConfiguration.duckingEnabled = action.payload;
    },
    
    setDuckingLevel: (state, action: PayloadAction<number>) => {
      state.mixConfiguration.duckingLevel = action.payload;
    },
    
    // =========================================================================
    // Surround Sound Operations
    // =========================================================================
    
    setSpeakerConfig: (state, action: PayloadAction<SpeakerConfig>) => {
      state.mixConfiguration.speakerConfig = action.payload;
    },
    
    setSpeakerVolume: (state, action: PayloadAction<{ channel: SpeakerChannel; volume: number }>) => {
      const { channel, volume } = action.payload;
      if (state.speakerSettings[channel]) {
        state.speakerSettings[channel].volume = Math.max(0, Math.min(1, volume));
      }
    },
    
    setSpeakerMuted: (state, action: PayloadAction<{ channel: SpeakerChannel; muted: boolean }>) => {
      const { channel, muted } = action.payload;
      if (state.speakerSettings[channel]) {
        state.speakerSettings[channel].muted = muted;
      }
    },
    
    setSpeakerDelay: (state, action: PayloadAction<{ channel: SpeakerChannel; delay: number }>) => {
      const { channel, delay } = action.payload;
      if (state.speakerSettings[channel]) {
        state.speakerSettings[channel].delay = Math.max(0, Math.min(100, delay));
      }
    },
    
    toggleSpeakerSolo: (state, action: PayloadAction<SpeakerChannel>) => {
      const channel = action.payload;
      if (state.speakerSettings[channel]) {
        // Turn off all other solos first
        Object.keys(state.speakerSettings).forEach(key => {
          state.speakerSettings[key as SpeakerChannel].solo = false;
        });
        state.speakerSettings[channel].solo = !state.speakerSettings[channel].solo;
      }
    },
    
    // =========================================================================
    // Subwoofer/LFE Operations
    // =========================================================================
    
    setSubwooferSettings: (state, action: PayloadAction<Partial<SubwooferSettings>>) => {
      state.subwooferSettings = { ...state.subwooferSettings, ...action.payload };
    },
    
    setSubwooferVolume: (state, action: PayloadAction<number>) => {
      state.subwooferSettings.volume = Math.max(0, Math.min(1, action.payload));
    },
    
    setCrossoverFrequency: (state, action: PayloadAction<number>) => {
      state.subwooferSettings.crossoverFrequency = Math.max(40, Math.min(200, action.payload));
    },
    
    setSubwooferPhase: (state, action: PayloadAction<number>) => {
      state.subwooferSettings.phase = Math.max(0, Math.min(360, action.payload));
    },
    
    setSubwooferGain: (state, action: PayloadAction<number>) => {
      state.subwooferSettings.gain = Math.max(-10, Math.min(10, action.payload));
    },
    
    setLowPassFilter: (state, action: PayloadAction<Partial<SubwooferSettings['lowPassFilter']>>) => {
      state.subwooferSettings.lowPassFilter = {
        ...state.subwooferSettings.lowPassFilter,
        ...action.payload,
      };
    },
    
    // =========================================================================
    // Track Surround Panner Operations
    // =========================================================================
    
    setTrackSurroundEnabled: (state, action: PayloadAction<{ trackId: string; enabled: boolean }>) => {
      const { trackId, enabled } = action.payload;
      const track = state.tracks.find(t => t.id === trackId);
      if (track) {
        track.surroundEnabled = enabled;
      }
    },
    
    setTrackSurroundPanner: (state, action: PayloadAction<{ trackId: string; panner: Partial<SurroundPanner> }>) => {
      const { trackId, panner } = action.payload;
      const track = state.tracks.find(t => t.id === trackId);
      if (track) {
        track.surroundPanner = { ...track.surroundPanner, ...panner };
      }
    },
    
    setTrackLFESend: (state, action: PayloadAction<{ trackId: string; send: number }>) => {
      const { trackId, send } = action.payload;
      const track = state.tracks.find(t => t.id === trackId);
      if (track) {
        track.lfeSend = Math.max(0, Math.min(1, send));
      }
    },
    
    setTrackChannelRouting: (state, action: PayloadAction<{ trackId: string; routing: Partial<Record<SpeakerChannel, number>> }>) => {
      const { trackId, routing } = action.payload;
      const track = state.tracks.find(t => t.id === trackId);
      if (track) {
        track.channelRouting = { ...track.channelRouting, ...routing };
      }
    },
    
    // =========================================================================
    // Room Acoustics Operations
    // =========================================================================
    
    setRoomAcoustics: (state, action: PayloadAction<Partial<RoomAcoustics>>) => {
      state.roomAcoustics = { ...state.roomAcoustics, ...action.payload };
    },
    
    setListenerPosition: (state, action: PayloadAction<{ x: number; y: number; z: number }>) => {
      state.roomAcoustics.listenerPosition = action.payload;
    },
    
    // =========================================================================
    // Audio Analysis
    // =========================================================================
    
    setAudioAnalysis: (state, action: PayloadAction<AudioAnalysis | null>) => {
      state.audioAnalysis = action.payload;
    },
    
    updateChannelLevels: (state, action: PayloadAction<Record<SpeakerChannel, number>>) => {
      if (state.audioAnalysis) {
        state.audioAnalysis.channelLevels = action.payload;
      }
    },
    
    // =========================================================================
    // Calibration
    // =========================================================================
    
    startCalibration: (state) => {
      state.isCalibrating = true;
      state.calibrationProgress = 0;
    },
    
    setCalibrationProgress: (state, action: PayloadAction<number>) => {
      state.calibrationProgress = Math.max(0, Math.min(100, action.payload));
    },
    
    finishCalibration: (state) => {
      state.isCalibrating = false;
      state.calibrationProgress = 100;
    },
    
    // =========================================================================
    // Generation & Export
    // =========================================================================
    
    setGenerationOptions: (state, action: PayloadAction<AudioGenerationOptions | null>) => {
      state.generationOptions = action.payload;
    },
    
    setIsGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },
    
    setIsExporting: (state, action: PayloadAction<boolean>) => {
      state.isExporting = action.payload;
    },
    
    setExportProgress: (state, action: PayloadAction<number>) => {
      state.exportProgress = Math.max(0, Math.min(100, action.payload));
    },
    
    setLastGeneratedTrack: (state, action: PayloadAction<string | null>) => {
      state.lastGeneratedTrack = action.payload;
    },
    
    setAudioError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    resetAudioState: (state) => {
      Object.assign(state, initialState);
    },
    
    applyAutoMixResults: (state, action: PayloadAction<{ trackId: string; volume: number; pan: number }[]>) => {
      action.payload.forEach(result => {
        const track = state.tracks.find(t => t.id === result.trackId);
        if (track) {
          track.volume = result.volume;
          track.pan = result.pan;
        }
      });
    },
    
    // =========================================================================
    // Bass Management
    // =========================================================================
    
    enableBassManagement: (state, action: PayloadAction<boolean>) => {
      state.mixConfiguration.bassManagement = action.payload;
    },
    
    setDownmixEnabled: (state, action: PayloadAction<boolean>) => {
      state.mixConfiguration.downmixEnabled = action.payload;
    },
    
    autoRouteLowFrequencies: (state) => {
      // Automatically set LFE send for tracks with low frequency content
      state.tracks.forEach(track => {
        if (track.type === 'music' || track.type === 'sfx') {
          track.lfeSend = state.mixConfiguration.bassManagement ? 0.3 : 0;
        }
      });
    },
  },
});

// =============================================================================
// Actions
// =============================================================================

export const {
  // Basic track operations
  setTrackVolume,
  setTrackPan,
  toggleTrackMute,
  toggleTrackSolo,
  updateTrack,
  addTrack,
  removeTrack,
  reorderTracks,
  
  // Master & mix
  setMasterVolume,
  setMixConfiguration,
  setAutoMixEnabled,
  setDuckingEnabled,
  setDuckingLevel,
  
  // Surround sound
  setSpeakerConfig,
  setSpeakerVolume,
  setSpeakerMuted,
  setSpeakerDelay,
  toggleSpeakerSolo,
  
  // Subwoofer
  setSubwooferSettings,
  setSubwooferVolume,
  setCrossoverFrequency,
  setSubwooferPhase,
  setSubwooferGain,
  setLowPassFilter,
  
  // Track surround
  setTrackSurroundEnabled,
  setTrackSurroundPanner,
  setTrackLFESend,
  setTrackChannelRouting,
  
  // Room acoustics
  setRoomAcoustics,
  setListenerPosition,
  
  // Audio analysis
  setAudioAnalysis,
  updateChannelLevels,
  
  // Calibration
  startCalibration,
  setCalibrationProgress,
  finishCalibration,
  
  // Generation & export
  setGenerationOptions,
  setIsGenerating,
  setIsExporting,
  setExportProgress,
  setLastGeneratedTrack,
  setAudioError,
  resetAudioState,
  applyAutoMixResults,
  
  // Bass management
  enableBassManagement,
  setDownmixEnabled,
  autoRouteLowFrequencies,
} = audioSlice.actions;

// =============================================================================
// Selectors
// =============================================================================

// Basic selectors
export const selectAllTracks = (state: { audio: AudioState }): AudioTrack[] => 
  state.audio.tracks;

export const selectTrackById = (state: { audio: AudioState }, trackId: string): AudioTrack | undefined =>
  state.audio.tracks.find(t => t.id === trackId);

export const selectMasterVolume = (state: { audio: AudioState }): number => 
  state.audio.masterVolume;

export const selectMixConfiguration = (state: { audio: AudioState }): MixConfiguration => 
  state.audio.mixConfiguration;

export const selectTracksByType = (state: { audio: AudioState }, type: AudioProfileType): AudioTrack[] =>
  state.audio.tracks.filter(t => t.type === type);

// Surround selectors
export const selectSpeakerConfig = (state: { audio: AudioState }): SpeakerConfig =>
  state.audio.mixConfiguration.speakerConfig;

export const selectSpeakerConfiguration = (state: { audio: AudioState }): SpeakerConfiguration =>
  SPEAKER_CONFIGURATIONS[state.audio.mixConfiguration.speakerConfig];

export const selectSpeakerSettings = (state: { audio: AudioState }): Record<SpeakerChannel, SpeakerSettings> =>
  state.audio.speakerSettings;

export const selectSpeakerSettingsByChannel = (state: { audio: AudioState }, channel: SpeakerChannel): SpeakerSettings =>
  state.audio.speakerSettings[channel];

// Subwoofer selectors
export const selectSubwooferSettings = (state: { audio: AudioState }): SubwooferSettings =>
  state.audio.subwooferSettings;

export const selectIsSubwooferEnabled = (state: { audio: AudioState }): boolean =>
  state.audio.subwooferSettings.enabled;

// Room acoustics selectors
export const selectRoomAcoustics = (state: { audio: AudioState }): RoomAcoustics =>
  state.audio.roomAcoustics;

// Analysis selectors
export const selectAudioAnalysis = (state: { audio: AudioState }): AudioAnalysis | null =>
  state.audio.audioAnalysis;

export const selectChannelLevels = (state: { audio: AudioState }): Record<SpeakerChannel, number> | null =>
  state.audio.audioAnalysis?.channelLevels || null;

// Calibration selectors
export const selectIsCalibrating = (state: { audio: AudioState }): boolean =>
  state.audio.isCalibrating;

export const selectCalibrationProgress = (state: { audio: AudioState }): number =>
  state.audio.calibrationProgress;

// Generation & export selectors
export const selectIsGenerating = (state: { audio: AudioState }): boolean =>
  state.audio.isGenerating;

export const selectIsExporting = (state: { audio: AudioState }): boolean =>
  state.audio.isExporting;

export const selectExportProgress = (state: { audio: AudioState }): number =>
  state.audio.exportProgress;

export const selectAudioError = (state: { audio: AudioState }): string | null =>
  state.audio.error;

// Muted/Solo selectors
export const selectMutedTracks = (state: { audio: AudioState }): AudioTrack[] =>
  state.audio.tracks.filter(t => t.muted);

export const selectSoloTracks = (state: { audio: AudioState }): AudioTrack[] =>
  state.audio.tracks.filter(t => t.solo);

// Effective volume (considering mute, solo, master)
export const selectEffectiveVolume = (state: { audio: AudioState }, trackId: string): number => {
  const track = state.audio.tracks.find(t => t.id === trackId);
  if (!track) return 0;
  
  if (track.muted) return 0;
  
  const hasSoloTracks = state.audio.tracks.some(t => t.solo);
  if (hasSoloTracks && !track.solo) return 0;
  
  return track.volume * state.audio.masterVolume;
};

// Active channels based on speaker config
export const selectActiveChannels = (state: { audio: AudioState }): SpeakerChannel[] =>
  SPEAKER_CONFIGURATIONS[state.audio.mixConfiguration.speakerConfig].channels;

// =============================================================================
// Reducer
// =============================================================================

export default audioSlice.reducer;