/**
 * Audio Mixing Types for StoryCore
 * 
 * Provides TypeScript types for audio mixing capabilities including:
 * - Multi-track audio composition
 * - Effects chain
 * - Ducking and crossfade
 * - Audio synchronization
 */

import { EventEmitter } from 'events';

// ============================================================================
// Audio Track Types
// ============================================================================

export interface AudioTrack {
  /** Unique identifier for the track */
  id: string;
  /** Display name of the track */
  name: string;
  /** Type of audio (voice, music, sfx, ambient) */
  type: 'voice' | 'music' | 'sfx' | 'ambient' | 'narration';
  /** Path to the audio file */
  src: string;
  /** Volume level (0-1) */
  volume: number;
  /** Pan position (-1 to 1) */
  pan: number;
  /** Whether the track is muted */
  muted: boolean;
  /** Whether the track is solo */
  solo: boolean;
  /** Whether the track is locked */
  locked: boolean;
  /** Start time in seconds */
  startTime: number;
  /** Duration in seconds */
  duration: number;
  /** Fade in duration in seconds */
  fadeIn: number;
  /** Fade out duration in seconds */
  fadeOut: number;
  /** Audio effects chain */
  effects: AudioEffect[];
  /** Color for the track in the UI */
  color: string;
  /** Track order index */
  order: number;
}

export interface AudioTrackState {
  /** Current playback position in seconds */
  currentTime: number;
  /** Whether the track is currently playing */
  isPlaying: boolean;
  /** Current volume level */
  currentVolume: number;
  /** Current pan position */
  currentPan: number;
  /** Peak level for visualization */
  peakLevel: number;
  /** RMS level for visualization */
  rmsLevel: number;
}

// ============================================================================
// Audio Effect Types
// ============================================================================

export interface AudioEffect {
  /** Unique identifier for the effect */
  id: string;
  /** Type of the effect */
  type: AudioEffectType;
  /** Whether the effect is enabled */
  enabled: boolean;
  /** Effect parameters */
  parameters: AudioEffectParameters;
  /** Order in the effects chain */
  order: number;
}

export type AudioEffectType = 
  | 'gain'
  | 'compressor'
  | 'reverb'
  | 'delay'
  | 'eq'
  | 'filter'
  | 'distortion'
  | 'chorus'
  | 'phaser'
  | 'tremolo'
  | 'pitch-shift'
  | 'time-stretch';

export interface AudioEffectParameters {
  // Gain parameters
  gain?: number;
  
  // Compressor parameters
  threshold?: number;
  ratio?: number;
  attack?: number;
  release?: number;
  knee?: number;
  
  // Reverb parameters
  reverbMix?: number;
  reverbDecay?: number;
  reverbPreDelay?: number;
  reverbHighFreq?: number;
  
  // Delay parameters
  delayTime?: number;
  delayFeedback?: number;
  delayMix?: number;
  
  // EQ parameters (3-band)
  eqLow?: number;
  eqMid?: number;
  eqHigh?: number;
  eqLowFreq?: number;
  eqHighFreq?: number;
  
  // Filter parameters
  filterType?: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  filterFreq?: number;
  filterQ?: number;
  
  // Distortion parameters
  distortionAmount?: number;
  
  // Pitch shift parameters
  pitchShift?: number;
  
  // Time stretch parameters
  timeStretch?: number;
}

// ============================================================================
// Audio Ducking Types
// ============================================================================

export interface DuckingConfig {
  /** Whether ducking is enabled */
  enabled: boolean;
  /** The track to apply ducking to */
  targetTrackId: string;
  /** The track that triggers ducking */
  triggerTrackId: string;
  /** Ducking threshold in dB */
  threshold: number;
  /** Ducking amount in dB */
  duckAmount: number;
  /** Attack time in seconds */
  attack: number;
  /** Release time in seconds */
  release: number;
  /** Hold time in seconds */
  hold: number;
  /** Range of ducking in dB */
  range: number;
}

export interface DuckingState {
  /** Current ducking level */
  currentDuckLevel: number;
  /** Whether ducking is currently active */
  isActive: boolean;
  /** Time until ducking releases */
  releaseTime: number;
}

// ============================================================================
// Audio Crossfade Types
// ============================================================================

export interface CrossfadeConfig {
  /** Type of crossfade */
  type: 'linear' | 'equal_power' | 'equal_gain' | 'custom';
  /** Crossfade curve points for custom type */
  curvePoints?: { input: number; output: number }[];
  /** Crossfade duration in seconds */
  duration: number;
  /** Enable auto-crossfade */
  autoCrossfade: boolean;
}

export interface CrossfadeState {
  /** Current crossfade progress (0-1) */
  progress: number;
  /** Current A track volume */
  volumeA: number;
  /** Current B track volume */
  volumeB: number;
}

// ============================================================================
// Audio Synchronization Types
// ============================================================================

export interface SyncConfig {
  /** Master tempo in BPM */
  masterTempo: number;
  /** Quantize to grid (beat, bar, measure) */
  quantizeTo: 'beat' | 'bar' | 'measure';
  /** Time signature numerator */
  timeSignatureNumerator: number;
  /** Time signature denominator */
  timeSignatureDenominator: number;
  /** Offset in frames */
  frameOffset: number;
  /** Whether to sync to external clock */
  syncToExternal: boolean;
  /** External clock URL */
  externalClockUrl?: string;
}

export interface SyncState {
  /** Current beat position */
  currentBeat: number;
  /** Current bar position */
  currentBar: number;
  /** Current position in seconds */
  currentPosition: number;
  /** Whether synced */
  isSynced: boolean;
  /** Drift amount */
  drift: number;
}

// ============================================================================
// Audio Mixing Service Types
// ============================================================================

export interface AudioMixingState {
  /** All tracks in the mix */
  tracks: Map<string, AudioTrack>;
  /** Master track settings */
  masterVolume: number;
  masterMuted: boolean;
  /** Whether currently playing */
  isPlaying: boolean;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration of the mix */
  totalDuration: number;
  /** Audio context state */
  audioContextState: 'running' | 'suspended' | 'closed';
  /** Current sample rate */
  sampleRate: number;
  /** Whether recording is active */
  isRecording: boolean;
  /** Recording duration */
  recordingDuration: number;
  /** Error state */
  error: string | null;
}

export interface AudioMixingActions {
  // Track Management
  addTrack: (track: Omit<AudioTrack, 'id' | 'order'>) => string;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, updates: Partial<AudioTrack>) => void;
  reorderTracks: (trackIds: string[]) => void;
  duplicateTrack: (id: string) => string;
  
  // Playback Control
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setMasterVolume: (volume: number) => void;
  setMasterMuted: (muted: boolean) => void;
  
  // Track Control
  setTrackVolume: (id: string, volume: number) => void;
  setTrackPan: (id: string, pan: number) => void;
  setTrackMuted: (id: string, muted: boolean) => void;
  setTrackSolo: (id: string, solo: boolean) => void;
  setTrackFadeIn: (id: string, duration: number) => void;
  setTrackFadeOut: (id: string, duration: number) => void;
  
  // Effects Management
  addEffect: (trackId: string, effect: Omit<AudioEffect, 'id' | 'order'>) => void;
  removeEffect: (trackId: string, effectId: string) => void;
  updateEffect: (trackId: string, effectId: string, updates: Partial<AudioEffect>) => void;
  reorderEffects: (trackId: string, effectIds: string[]) => void;
  
  // Ducking
  setDucking: (config: DuckingConfig) => void;
  disableDucking: () => void;
  
  // Crossfade
  setCrossfade: (config: CrossfadeConfig) => void;
  setCrossfadeProgress: (progress: number) => void;
  
  // Synchronization
  setSync: (config: SyncConfig) => void;
  
  // Recording
  startRecording: () => void;
  stopRecording: () => void;
  
  // Export
  exportMix: (format: 'wav' | 'mp3' | 'ogg', options?: ExportOptions) => Promise<Blob>;
}

// ============================================================================
// Export Options
// ============================================================================

export interface ExportOptions {
  /** Sample rate */
  sampleRate?: 44100 | 48000 | 96000;
  /** Bit depth */
  bitDepth?: 16 | 24 | 32;
  /** Number of channels */
  channels?: 1 | 2;
  /** Export format specific options */
  formatOptions?: {
    mp3?: { bitrate: number };
    ogg?: { quality: number };
  };
}

// ============================================================================
// Audio Event Types
// ============================================================================

export interface AudioEventMap {
  'track:added': [trackId: string];
  'track:removed': [trackId: string];
  'track:updated': [trackId: string, updates: Partial<AudioTrack>];
  'track:playing': [trackId: string];
  'track:paused': [trackId: string];
  'effect:added': [trackId: string, effectId: string];
  'effect:removed': [trackId: string, effectId: string];
  'effect:updated': [trackId: string, effectId: string, updates: Partial<AudioEffect>];
  'playback:started': [];
  'playback:paused': [];
  'playback:stopped': [];
  'playback:seeked': [time: number];
  'timeupdate': [currentTime: number];
  'levelupdate': [trackId: string, peak: number, rms: number];
  'recording:started': [];
  'recording:stopped': [blob: Blob];
  'export:started': [];
  'export:progress': [progress: number];
  'export:completed': [blob: Blob];
  'error': [error: string];
}

// ============================================================================
// Utility Types
// ============================================================================

export type Decibel = number;
export type Seconds = number;
export type Frames = number;
export type Beats = number;
export type BPM = number;

export interface TimeRange {
  start: Seconds;
  end: Seconds;
}

export interface LevelMeter {
  peak: number;
  rms: number;
  peakHold: number;
}

export { EventEmitter };
