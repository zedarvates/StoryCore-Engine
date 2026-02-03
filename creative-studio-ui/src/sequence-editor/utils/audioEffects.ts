/**
 * Audio Effects Utility
 * 
 * Handles comprehensive audio editing tools including waveform display,
 * normalization, fade controls, EQ, compression, and advanced audio processing.
 * 
 * Requirements: 1.3, 9.1
 */

import type { Shot, Layer, AudioLayerData } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface WaveformData {
  samples: number[]; // Amplitude values (-1 to 1)
  sampleRate: number;
  duration: number;
  channels: number;
  peaks: number[]; // Peak values for visualization
  rms: number[]; // RMS values for volume metering
}

export interface WaveformDisplayOptions {
  zoom: number; // 1 to 10
  colorCoding: boolean;
  detailLevel: 'low' | 'medium' | 'high';
}

export interface AudioNormalizationData {
  enabled: boolean;
  targetLevel: number; // -24 to 0 dB
  method: 'peak' | 'rms' | 'lufs';
}

export interface AudioGainData {
  gain: number; // -60 to 60 dB
  mute: boolean;
  solo: boolean;
}

export interface AudioFadeData {
  fadeIn: {
    enabled: boolean;
    duration: number; // Frames
    curve: FadeCurve;
  };
  fadeOut: {
    enabled: boolean;
    duration: number; // Frames
    curve: FadeCurve;
  };
}

export type FadeCurve = 'linear' | 'exponential' | 'logarithmic' | 'scurve';

export interface CrossfadeData {
  duration: number; // Frames
  curve: FadeCurve;
  type: 'equal-power' | 'equal-gain';
}

export interface EQData {
  enabled: boolean;
  bands: EQBand[];
  preset?: string;
}

export interface EQBand {
  frequency: number; // Hz
  gain: number; // -24 to 24 dB
  q: number; // 0.1 to 10
  type: 'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'peak' | 'lowshelf' | 'highshelf';
}

export interface CompressionData {
  enabled: boolean;
  threshold: number; // -60 to 0 dB
  ratio: number; // 1 to 20
  attack: number; // 0 to 100 ms
  release: number; // 0 to 1000 ms
  knee: number; // 0 to 12 dB
  makeupGain: number; // 0 to 24 dB
}

export interface LimiterData {
  enabled: boolean;
  threshold: number; // -24 to 0 dB
  release: number; // 0 to 1000 ms
  ceiling: number; // -12 to 0 dB
}

export interface NoiseReductionData {
  enabled: boolean;
  strength: number; // 0 to 100
  sensitivity: number; // 0 to 100
  method: 'spectral' | 'gate' | 'adaptive';
}

export interface TimeStretchData {
  enabled: boolean;
  factor: number; // 0.5 to 2.0
  preservePitch: boolean;
  quality: 'low' | 'medium' | 'high';
}

export interface PitchShiftData {
  enabled: boolean;
  semitones: number; // -12 to 12
  cents: number; // -100 to 100
  preserveDuration: boolean;
  quality: 'low' | 'medium' | 'high';
}

export interface SpectralAnalysisData {
  fftSize: number; // 256, 512, 1024, 2048, 4096
  windowFunction: 'hann' | 'hamming' | 'blackman' | 'rectangular';
  smoothing: number; // 0 to 1
}

export interface AudioMarker {
  id: string;
  time: number; // Frame number
  label: string;
  color: string;
  type: 'cue' | 'beat' | 'region-start' | 'region-end';
}

export interface BeatDetectionData {
  enabled: boolean;
  sensitivity: number; // 0 to 100
  minBPM: number;
  maxBPM: number;
  snapTolerance: number; // Frames
}

// ============================================================================
// Waveform Display (10B.1)
// ============================================================================

/**
 * Generate waveform data from audio layer
 */
export function generateWaveformData(
  audioLayer: Layer,
  options: WaveformDisplayOptions
): WaveformData | null {
  if (audioLayer.type !== 'audio') return null;
  
  const audioData = audioLayer.data as AudioLayerData;
  
  // In a real implementation, this would analyze the audio file
  // For now, return mock waveform data
  const sampleCount = Math.floor(audioLayer.duration * options.zoom);
  const samples: number[] = [];
  const peaks: number[] = [];
  const rms: number[] = [];
  
  // Generate mock waveform (sine wave with random variation)
  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    const amplitude = Math.sin(t * Math.PI * 10) * (0.5 + Math.random() * 0.5);
    samples.push(amplitude);
    peaks.push(Math.abs(amplitude));
    rms.push(Math.sqrt(amplitude * amplitude));
  }
  
  return {
    samples,
    sampleRate: 48000,
    duration: audioLayer.duration,
    channels: 2,
    peaks,
    rms,
  };
}

/**
 * Get waveform color based on volume level
 */
export function getWaveformColor(amplitude: number): string {
  const absAmplitude = Math.abs(amplitude);
  
  if (absAmplitude > 0.9) {
    return '#FF0000'; // Red for clipping
  } else if (absAmplitude > 0.7) {
    return '#FFA500'; // Orange for high volume
  } else if (absAmplitude > 0.4) {
    return '#FFFF00'; // Yellow for medium volume
  } else {
    return '#00FF00'; // Green for normal volume
  }
}

// ============================================================================
// Audio Normalization and Gain (10B.2)
// ============================================================================

/**
 * Apply audio normalization to layer
 */
export function applyNormalization(
  shotId: string,
  layerId: string,
  normalizationData: AudioNormalizationData,
  shots: Shot[]
): { shotId: string; layerId: string; effectLayer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const layer = shot.layers.find((l) => l.id === layerId && l.type === 'audio');
  if (!layer) return null;
  
  const effectLayer: Layer = {
    id: `normalization-${Date.now()}`,
    type: 'effects',
    startTime: layer.startTime,
    duration: layer.duration,
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      effectType: 'audio-normalization',
      parameters: normalizationData,
    },
  };
  
  return {
    shotId,
    layerId,
    effectLayer,
  };
}

/**
 * Apply gain adjustment to audio layer
 */
export function applyGain(
  layerId: string,
  gainData: AudioGainData,
  shot: Shot
): Layer | null {
  const layer = shot.layers.find((l) => l.id === layerId && l.type === 'audio');
  if (!layer) return null;
  
  const audioData = layer.data as AudioLayerData;
  
  return {
    ...layer,
    data: {
      ...audioData,
      volume: gainData.mute ? 0 : Math.pow(10, gainData.gain / 20), // Convert dB to linear
    },
  };
}

/**
 * Batch normalize multiple audio layers
 */
export function batchNormalize(
  layerIds: string[],
  normalizationData: AudioNormalizationData,
  shot: Shot
): Layer[] {
  return layerIds
    .map((layerId) => {
      const layer = shot.layers.find((l) => l.id === layerId && l.type === 'audio');
      if (!layer) return null;
      
      // Apply normalization effect
      return {
        ...layer,
        data: {
          ...(layer.data as AudioLayerData),
          // Normalization would be applied here
        },
      };
    })
    .filter((layer): layer is Layer => layer !== null);
}

// ============================================================================
// Audio Fade Controls (10B.3)
// ============================================================================

/**
 * Apply fade in/out to audio layer
 */
export function applyFade(
  layerId: string,
  fadeData: AudioFadeData,
  shot: Shot
): Layer | null {
  const layer = shot.layers.find((l) => l.id === layerId && l.type === 'audio');
  if (!layer) return null;
  
  const audioData = layer.data as AudioLayerData;
  
  return {
    ...layer,
    data: {
      ...audioData,
      fadeIn: fadeData.fadeIn.enabled ? fadeData.fadeIn.duration : 0,
      fadeOut: fadeData.fadeOut.enabled ? fadeData.fadeOut.duration : 0,
    },
  };
}

/**
 * Create crossfade between two audio layers
 */
export function createCrossfade(
  leftLayerId: string,
  rightLayerId: string,
  crossfadeData: CrossfadeData,
  shot: Shot
): { leftLayer: Layer; rightLayer: Layer } | null {
  const leftLayer = shot.layers.find((l) => l.id === leftLayerId && l.type === 'audio');
  const rightLayer = shot.layers.find((l) => l.id === rightLayerId && l.type === 'audio');
  
  if (!leftLayer || !rightLayer) return null;
  
  // Apply fade out to left layer
  const leftAudioData = leftLayer.data as AudioLayerData;
  const updatedLeftLayer: Layer = {
    ...leftLayer,
    data: {
      ...leftAudioData,
      fadeOut: crossfadeData.duration,
    },
  };
  
  // Apply fade in to right layer
  const rightAudioData = rightLayer.data as AudioLayerData;
  const updatedRightLayer: Layer = {
    ...rightLayer,
    data: {
      ...rightAudioData,
      fadeIn: crossfadeData.duration,
    },
  };
  
  return {
    leftLayer: updatedLeftLayer,
    rightLayer: updatedRightLayer,
  };
}

/**
 * Get fade curve function
 */
export function getFadeCurveFunction(curve: FadeCurve): (t: number) => number {
  switch (curve) {
    case 'linear':
      return (t: number) => t;
    case 'exponential':
      return (t: number) => Math.pow(t, 2);
    case 'logarithmic':
      return (t: number) => Math.sqrt(t);
    case 'scurve':
      return (t: number) => (Math.sin((t - 0.5) * Math.PI) + 1) / 2;
    default:
      return (t: number) => t;
  }
}

// ============================================================================
// Audio Effects System (10B.4)
// ============================================================================

/**
 * Apply EQ to audio layer
 */
export function applyEQ(
  shotId: string,
  layerId: string,
  eqData: EQData,
  shots: Shot[]
): { shotId: string; layerId: string; effectLayer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const layer = shot.layers.find((l) => l.id === layerId && l.type === 'audio');
  if (!layer) return null;
  
  const effectLayer: Layer = {
    id: `eq-${Date.now()}`,
    type: 'effects',
    startTime: layer.startTime,
    duration: layer.duration,
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      effectType: 'audio-eq',
      parameters: eqData,
    },
  };
  
  return {
    shotId,
    layerId,
    effectLayer,
  };
}

/**
 * Create EQ preset
 */
export function createEQPreset(presetName: string): EQData {
  const presets: Record<string, EQData> = {
    'voice-enhance': {
      enabled: true,
      bands: [
        { frequency: 100, gain: -6, q: 1, type: 'highpass' },
        { frequency: 3000, gain: 3, q: 1.5, type: 'peak' },
        { frequency: 8000, gain: 2, q: 1, type: 'highshelf' },
      ],
      preset: 'voice-enhance',
    },
    'bass-boost': {
      enabled: true,
      bands: [
        { frequency: 60, gain: 6, q: 1, type: 'lowshelf' },
        { frequency: 200, gain: 3, q: 1.5, type: 'peak' },
      ],
      preset: 'bass-boost',
    },
    'treble-boost': {
      enabled: true,
      bands: [
        { frequency: 5000, gain: 4, q: 1, type: 'highshelf' },
        { frequency: 10000, gain: 2, q: 1.5, type: 'peak' },
      ],
      preset: 'treble-boost',
    },
    'flat': {
      enabled: false,
      bands: [],
      preset: 'flat',
    },
  };
  
  return presets[presetName] || presets['flat'];
}

/**
 * Apply compression to audio layer
 */
export function applyCompression(
  shotId: string,
  layerId: string,
  compressionData: CompressionData,
  shots: Shot[]
): { shotId: string; layerId: string; effectLayer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const layer = shot.layers.find((l) => l.id === layerId && l.type === 'audio');
  if (!layer) return null;
  
  const effectLayer: Layer = {
    id: `compression-${Date.now()}`,
    type: 'effects',
    startTime: layer.startTime,
    duration: layer.duration,
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      effectType: 'audio-compression',
      parameters: compressionData,
    },
  };
  
  return {
    shotId,
    layerId,
    effectLayer,
  };
}

/**
 * Apply limiter to audio layer
 */
export function applyLimiter(
  shotId: string,
  layerId: string,
  limiterData: LimiterData,
  shots: Shot[]
): { shotId: string; layerId: string; effectLayer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const layer = shot.layers.find((l) => l.id === layerId && l.type === 'audio');
  if (!layer) return null;
  
  const effectLayer: Layer = {
    id: `limiter-${Date.now()}`,
    type: 'effects',
    startTime: layer.startTime,
    duration: layer.duration,
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      effectType: 'audio-limiter',
      parameters: limiterData,
    },
  };
  
  return {
    shotId,
    layerId,
    effectLayer,
  };
}

/**
 * Apply noise reduction to audio layer
 */
export function applyNoiseReduction(
  shotId: string,
  layerId: string,
  noiseReductionData: NoiseReductionData,
  shots: Shot[]
): { shotId: string; layerId: string; effectLayer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const layer = shot.layers.find((l) => l.id === layerId && l.type === 'audio');
  if (!layer) return null;
  
  const effectLayer: Layer = {
    id: `noise-reduction-${Date.now()}`,
    type: 'effects',
    startTime: layer.startTime,
    duration: layer.duration,
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      effectType: 'audio-noise-reduction',
      parameters: noiseReductionData,
    },
  };
  
  return {
    shotId,
    layerId,
    effectLayer,
  };
}

// ============================================================================
// Advanced Audio Tools (10B.5)
// ============================================================================

/**
 * Apply time-stretch to audio layer
 */
export function applyTimeStretch(
  shotId: string,
  layerId: string,
  timeStretchData: TimeStretchData,
  shots: Shot[]
): { shotId: string; layerId: string; newDuration: number; effectLayer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const layer = shot.layers.find((l) => l.id === layerId && l.type === 'audio');
  if (!layer) return null;
  
  const newDuration = Math.round(layer.duration * timeStretchData.factor);
  
  const effectLayer: Layer = {
    id: `time-stretch-${Date.now()}`,
    type: 'effects',
    startTime: layer.startTime,
    duration: newDuration,
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      effectType: 'audio-time-stretch',
      parameters: timeStretchData,
    },
  };
  
  return {
    shotId,
    layerId,
    newDuration,
    effectLayer,
  };
}

/**
 * Apply pitch-shift to audio layer
 */
export function applyPitchShift(
  shotId: string,
  layerId: string,
  pitchShiftData: PitchShiftData,
  shots: Shot[]
): { shotId: string; layerId: string; effectLayer: Layer } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  const layer = shot.layers.find((l) => l.id === layerId && l.type === 'audio');
  if (!layer) return null;
  
  const effectLayer: Layer = {
    id: `pitch-shift-${Date.now()}`,
    type: 'effects',
    startTime: layer.startTime,
    duration: layer.duration,
    locked: false,
    hidden: false,
    opacity: 1,
    blendMode: 'normal',
    data: {
      effectType: 'audio-pitch-shift',
      parameters: pitchShiftData,
    },
  };
  
  return {
    shotId,
    layerId,
    effectLayer,
  };
}

/**
 * Generate spectral analysis data
 */
export function generateSpectralAnalysis(
  audioLayer: Layer,
  analysisData: SpectralAnalysisData
): number[][] {
  if (audioLayer.type !== 'audio') return [];
  
  // In a real implementation, this would perform FFT analysis
  // For now, return mock spectral data
  const timeSteps = Math.floor(audioLayer.duration / 10);
  const frequencyBins = analysisData.fftSize / 2;
  
  const spectralData: number[][] = [];
  
  for (let t = 0; t < timeSteps; t++) {
    const spectrum: number[] = [];
    for (let f = 0; f < frequencyBins; f++) {
      // Mock spectral magnitude
      const magnitude = Math.random() * Math.exp(-f / frequencyBins);
      spectrum.push(magnitude);
    }
    spectralData.push(spectrum);
  }
  
  return spectralData;
}

/**
 * Add audio marker
 */
export function addAudioMarker(
  shotId: string,
  marker: AudioMarker,
  shots: Shot[]
): { shotId: string; marker: AudioMarker } | null {
  const shot = shots.find((s) => s.id === shotId);
  if (!shot) return null;
  
  return {
    shotId,
    marker,
  };
}

/**
 * Detect beats in audio layer
 */
export function detectBeats(
  audioLayer: Layer,
  beatDetectionData: BeatDetectionData
): AudioMarker[] {
  if (audioLayer.type !== 'audio') return [];
  
  // In a real implementation, this would analyze audio for beats
  // For now, return mock beat markers
  const markers: AudioMarker[] = [];
  const estimatedBPM = (beatDetectionData.minBPM + beatDetectionData.maxBPM) / 2;
  const framesPerBeat = (60 / estimatedBPM) * 30; // Assuming 30 FPS
  
  for (let i = 0; i < audioLayer.duration; i += framesPerBeat) {
    markers.push({
      id: `beat-${i}`,
      time: Math.round(i),
      label: 'Beat',
      color: '#FF00FF',
      type: 'beat',
    });
  }
  
  return markers;
}

/**
 * Snap to nearest beat
 */
export function snapToBeat(
  frame: number,
  beatMarkers: AudioMarker[],
  tolerance: number
): number {
  const beats = beatMarkers.filter((m) => m.type === 'beat');
  
  // Find nearest beat within tolerance
  let nearestBeat: AudioMarker | null = null;
  let minDistance = Infinity;
  
  for (const beat of beats) {
    const distance = Math.abs(beat.time - frame);
    if (distance < minDistance && distance <= tolerance) {
      minDistance = distance;
      nearestBeat = beat;
    }
  }
  
  return nearestBeat ? nearestBeat.time : frame;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert dB to linear gain
 */
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Convert linear gain to dB
 */
export function linearToDb(linear: number): number {
  return 20 * Math.log10(linear);
}

/**
 * Calculate RMS (Root Mean Square) of audio samples
 */
export function calculateRMS(samples: number[]): number {
  const sumSquares = samples.reduce((sum, sample) => sum + sample * sample, 0);
  return Math.sqrt(sumSquares / samples.length);
}

/**
 * Calculate peak amplitude of audio samples
 */
export function calculatePeak(samples: number[]): number {
  return Math.max(...samples.map(Math.abs));
}

/**
 * Get volume meter color based on dB level
 */
export function getVolumeMeterColor(db: number): string {
  if (db > -3) {
    return '#FF0000'; // Red for clipping
  } else if (db > -6) {
    return '#FFA500'; // Orange for high
  } else if (db > -12) {
    return '#FFFF00'; // Yellow for medium-high
  } else if (db > -18) {
    return '#00FF00'; // Green for good
  } else {
    return '#008000'; // Dark green for low
  }
}
