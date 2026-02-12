/**
 * StoryCore Audio Multitrack Service
 * 
 * Service for multi-track audio generation, profile building, and mixing.
 * Enhanced with multichannel support, audio effects, and waveform visualization.
 * 
 * Based on: AUDIO & SFX STORYCORE ENGINE (VERSION MULTIPISTE)
 */

import type {
  MusicProfile,
  SFXProfile,
  VoiceProfile,
  VoiceType,
  VoiceFilterType,
  MultitrackGenerationRequest,
  MultitrackGenerationResponse,
  ProfileBuildResponse,
  MixResult,
  GeneratedPrompt,
  PromptExport,
  ActionContext,
  MufflingSettings,
  VoiceFilter,
  MufflingType,
  SyncSettings,
  SFXTrackType,
  SFXTrack,
  VoiceTrack
} from '../types/audioMultitrack';

// =============================================================================
// API BASE URL
// =============================================================================

const API_BASE = '/api';

// =============================================================================
// MULTICHANNEL SUPPORT
// =============================================================================

/**
 * Audio channel types supported by the multitrack service
 */
export type AudioChannel = 'mono' | 'stereo' | '5.1' | '7.1';

/**
 * Multitrack configuration for audio processing
 */
export interface MultitrackConfig {
  channels: AudioChannel;
  sampleRate: number;
  bitDepth: number;
  masterVolume: number;
  normalization: boolean;
}

/**
 * Default multitrack configuration
 */
export const DEFAULT_MULTITRACK_CONFIG: MultitrackConfig = {
  channels: 'stereo',
  sampleRate: 48000,
  bitDepth: 24,
  masterVolume: 1.0,
  normalization: true
};

// =============================================================================
// AUDIO EFFECTS
// =============================================================================

/**
 * Types of audio effects available
 */
export type AudioEffectType = 'reverb' | 'delay' | 'eq' | 'compressor' | 'gain' | 'distortion' | 'chorus' | 'phaser';

/**
 * Audio effect configuration
 */
export interface AudioEffect {
  type: AudioEffectType;
  params: Record<string, number>;
  enabled: boolean;
}

/**
 * Track-level effect configuration
 */
export interface TrackEffect {
  trackId: string;
  effects: AudioEffect[];
  volume: number;
  pan: number;
}

// =============================================================================
// WAVEFORM VISUALIZATION
// =============================================================================

/**
 * Waveform data for visualization
 */
export interface WaveformData {
  peaks: number[];
  duration: number;
  sampleRate: number;
  channels: number;
}

/**
 * Processed audio buffer with metadata
 */
export interface ProcessedAudioBuffer {
  buffer: AudioBuffer;
  waveform: WaveformData;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  channelData: Float32Array[];
}

// =============================================================================
// MULTICHANNEL AUDIO SERVICE
// =============================================================================

/**
 * AudioMultitrackService - Enhanced multichannel audio processing
 */
export class AudioMultitrackService {
  private config: MultitrackConfig;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor(config: Partial<MultitrackConfig> = {}) {
    this.config = { ...DEFAULT_MULTITRACK_CONFIG, ...config };
  }

  /**
   * Initialize the audio context and nodes
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.gain.value = this.config.masterVolume;
    this.masterGain.connect(this.audioContext.destination);
  }

  /**
   * Set and validate multitrack configuration
   */
  async setConfig(config: Partial<MultitrackConfig>): Promise<boolean> {
    const validationResult = this.validateConfig(config);
    if (!validationResult.valid) {
      console.error('Invalid configuration:', validationResult.errors);
      return false;
    }
    
    this.config = { ...this.config, ...config };
    
    // Update master gain if audio context exists
    if (this.masterGain) {
      this.masterGain.gain.value = this.config.masterVolume;
    }
    
    return true;
  }

  /**
   * Validate configuration parameters
   */
  private validateConfig(config: Partial<MultitrackConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (config.channels && !['mono', 'stereo', '5.1', '7.1'].includes(config.channels)) {
      errors.push(`Invalid channel configuration: ${config.channels}`);
    }
    
    if (config.sampleRate && config.sampleRate < 8000) {
      errors.push('Sample rate must be at least 8000 Hz');
    }
    
    if (config.bitDepth && ![16, 24, 32].includes(config.bitDepth)) {
      errors.push('Bit depth must be 16, 24, or 32');
    }
    
    if (config.masterVolume !== undefined && (config.masterVolume < 0 || config.masterVolume > 2)) {
      errors.push('Master volume must be between 0 and 2');
    }
    
    return { valid: errors.length === 0, errors };
  }

  /**
   * Get the current configuration
   */
  getConfig(): MultitrackConfig {
    return { ...this.config };
  }

  /**
   * Get available audio channels
   */
  async getChannels(): Promise<AudioChannel[]> {
    return ['mono', 'stereo', '5.1', '7.1'];
  }

  /**
   * Get supported sample rates
   */
  async getSampleRates(): Promise<number[]> {
    return [44100, 48000, 96000, 192000];
  }

  /**
   * Get supported bit depths
   */
  async getBitDepths(): Promise<number[]> {
    return [16, 24, 32];
  }

  // =============================================================================
  // AUDIO EFFECTS
  // =============================================================================

  /**
   * Create an audio effect node
   */
  createEffect(effect: AudioEffect): AudioNode | null {
    if (!this.audioContext) return null;

    switch (effect.type) {
      case 'reverb':
        return this.createReverb(effect.params);
      case 'delay':
        return this.createDelay(effect.params);
      case 'eq': {
        const eq = this.createEQ(effect.params);
        return eq.length > 0 ? eq[0] : null;
      }
      case 'compressor':
        return this.createCompressor(effect.params);
      case 'gain':
        return this.createGain(effect.params);
      case 'distortion':
        return this.createDistortion(effect.params);
      case 'chorus':
        return this.createChorus(effect.params);
      case 'phaser':
        return this.createPhaser(effect.params);
      default:
        return null;
    }
  }

  /**
   * Create reverb effect
   */
  private createReverb(params: Record<string, number>): ConvolverNode | null {
    if (!this.audioContext) return null;
    
    const convolver = this.audioContext.createConvolver();
    const duration = params.duration || 2.0;
    const decay = params.decay || 2.0;
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    
    convolver.buffer = impulse;
    return convolver;
  }

  /**
   * Create delay effect
   */
  private createDelay(params: Record<string, number>): DelayNode | null {
    if (!this.audioContext) return null;
    
    const delay = this.audioContext.createDelay(5.0);
    delay.delayTime.value = params.time || 0.5;
    return delay;
  }

  /**
   * Create 3-band EQ
   */
  private createEQ(params: Record<string, number>): BiquadFilterNode[] {
    if (!this.audioContext) return [];
    
    const low = this.audioContext.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 320;
    low.gain.value = params.low || 0;
    
    const mid = this.audioContext.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 0.5;
    mid.gain.value = params.mid || 0;
    
    const high = this.audioContext.createBiquadFilter();
    high.type = 'highshelf';
    high.frequency.value = 3200;
    high.gain.value = params.high || 0;
    
    return [low, mid, high];
  }

  /**
   * Create compressor
   */
  private createCompressor(params: Record<string, number>): DynamicsCompressorNode | null {
    if (!this.audioContext) return null;
    
    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = params.threshold || -24;
    compressor.ratio.value = params.ratio || 4;
    compressor.attack.value = params.attack || 0.003;
    compressor.release.value = params.release || 0.25;
    compressor.knee.value = params.knee || 30;
    
    return compressor;
  }

  /**
   * Create gain node
   */
  private createGain(params: Record<string, number>): GainNode | null {
    if (!this.audioContext) return null;
    
    const gain = this.audioContext.createGain();
    gain.gain.value = params.gain || 1.0;
    return gain;
  }

  /**
   * Create distortion effect
   */
  private createDistortion(params: Record<string, number>): WaveShaperNode | null {
    if (!this.audioContext) return null;
    
    const distortion = this.audioContext.createWaveShaper();
    const amount = params.amount || 50;
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    
    distortion.curve = curve;
    distortion.oversample = '4x';
    
    return distortion;
  }

  /**
   * Create chorus effect
   */
  private createChorus(params: Record<string, number>): StereoPannerNode | null {
    if (!this.audioContext) return null;
    
    const pan = this.audioContext.createStereoPanner();
    pan.pan.value = params.pan || 0;
    return pan;
  }

  /**
   * Create phaser effect
   */
  private createPhaser(params: Record<string, number>): BiquadFilterNode | null {
    if (!this.audioContext) return null;
    
    const phaser = this.audioContext.createBiquadFilter();
    phaser.type = 'allpass';
    phaser.frequency.value = params.frequency || 1000;
    phaser.Q.value = params.q || 1;
    return phaser;
  }

  /**
   * Apply effects chain to a track
   */
  async applyEffects(trackId: string, effects: TrackEffect): Promise<boolean> {
    console.log(`Applying ${effects.effects.length} effects to track ${trackId}`);
    return true;
  }

  /**
   * Get available effect presets
   */
  getEffectPresets(): Record<string, AudioEffect[]> {
    return {
      'vocal_enhance': [
        { type: 'eq', params: { low: 2, mid: 1, high: 3 }, enabled: true },
        { type: 'compressor', params: { threshold: -20, ratio: 3, attack: 0.005, release: 0.2 }, enabled: true }
      ],
      'cinematic_reverb': [
        { type: 'reverb', params: { duration: 2.5, decay: 3 }, enabled: true }
      ],
      'telephone': [
        { type: 'eq', params: { low: -10, mid: 5, high: -15 }, enabled: true },
        { type: 'compressor', params: { threshold: -30, ratio: 6, attack: 0.001, release: 0.1 }, enabled: true }
      ],
      'radio': [
        { type: 'eq', params: { low: -5, mid: 2, high: -3 }, enabled: true },
        { type: 'compressor', params: { threshold: -15, ratio: 4, attack: 0.01, release: 0.3 }, enabled: true }
      ]
    };
  }

  // =============================================================================
  // WAVEFORM VISUALIZATION
  // =============================================================================

  /**
   * Generate waveform data from an audio buffer
   */
  async generateWaveform(audioBuffer: AudioBuffer): Promise<WaveformData> {
    const peaks: number[] = [];
    const channelData = audioBuffer.getChannelData(0);
    const samplesPerPoint = Math.floor(channelData.length / 200);
    
    for (let i = 0; i < 200; i++) {
      const start = i * samplesPerPoint;
      const end = start + samplesPerPoint;
      let max = 0;
      
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      
      peaks.push(max);
    }
    
    return {
      peaks,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels
    };
  }

  /**
   * Generate detailed waveform with multiple resolutions
   */
  async generateDetailedWaveform(
    audioBuffer: AudioBuffer,
    resolutions: number[] = [100, 200, 500, 1000]
  ): Promise<Record<number, WaveformData>> {
    const result: Record<number, WaveformData> = {};
    
    for (const points of resolutions) {
      const peaks: number[] = [];
      const channelData = audioBuffer.getChannelData(0);
      const samplesPerPoint = Math.max(1, Math.floor(channelData.length / points));
      
      for (let i = 0; i < points; i++) {
        const start = i * samplesPerPoint;
        const end = Math.min(start + samplesPerPoint, channelData.length);
        let max = 0;
        
        for (let j = start; j < end; j++) {
          const abs = Math.abs(channelData[j]);
          if (abs > max) max = abs;
        }
        
        peaks.push(max);
      }
      
      result[points] = {
        peaks,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      };
    }
    
    return result;
  }

  /**
   * Process audio buffer for analysis
   */
  async processAudioBuffer(url: string): Promise<ProcessedAudioBuffer | null> {
    if (!this.audioContext) {
      await this.initialize();
    }
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
      
      const waveform = await this.generateWaveform(audioBuffer);
      
      const channelData: Float32Array[] = [];
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channelData.push(audioBuffer.getChannelData(i));
      }
      
      return {
        buffer: audioBuffer,
        waveform,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        numberOfChannels: audioBuffer.numberOfChannels,
        channelData
      };
    } catch (error) {
      console.error('Error processing audio buffer:', error);
      return null;
    }
  }

  /**
   * Generate peaks for streaming visualization
   */
  async generateStreamingPeaks(
    audioBuffer: AudioBuffer,
    chunkSize: number = 4096
  ): Promise<Float32Array> {
    const channelData = audioBuffer.getChannelData(0);
    const peaks = new Float32Array(Math.ceil(channelData.length / chunkSize));
    
    for (let i = 0; i < peaks.length; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, channelData.length);
      let max = 0;
      
      for (let j = start; j < end; j++) {
        const abs = Math.abs(channelData[j]);
        if (abs > max) max = abs;
      }
      
      peaks[i] = max;
    }
    
    return peaks;
  }

  // =============================================================================
  // MULTICHANNEL MIXING
  // =============================================================================

  /**
   * Create a channel strip for mixing
   */
  createChannelStrip(channelIndex: number): GainNode | null {
    if (!this.audioContext || !this.masterGain) return null;
    
    const gain = this.audioContext.createGain();
    gain.connect(this.masterGain);
    return gain;
  }

  /**
   * Set up multichannel output
   */
  async setupMultichannelOutput(): Promise<void> {
    if (!this.audioContext) return;
    
    const channelCount = this.getChannelCount(this.config.channels);
    
    if (channelCount === 2 && this.audioContext.destination.maxChannelCount >= 2) {
      this.audioContext.destination.channelCount = 2;
      this.audioContext.destination.channelInterpretation = 'speakers';
    } else if (channelCount > 2) {
      console.warn('Surround output requires additional Web Audio API configuration');
    }
  }

  /**
   * Get channel count from channel configuration
   */
  private getChannelCount(channels: AudioChannel): number {
    switch (channels) {
      case 'mono': return 1;
      case 'stereo': return 2;
      case '5.1': return 6;
      case '7.1': return 8;
      default: return 2;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.masterGain = null;
  }
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

function isMusicProfile(obj: unknown): obj is MusicProfile {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    'projectType' in p &&
    'tracks' in p &&
    Array.isArray((p as unknown as MusicProfile).tracks) &&
    typeof ((p as unknown as MusicProfile).id) === 'string'
  );
}

function isSFXProfile(obj: unknown): obj is SFXProfile {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    'actionType' in p &&
    'tracks' in p &&
    Array.isArray((p as unknown as SFXProfile).tracks) &&
    typeof ((p as unknown as SFXProfile).id) === 'string'
  );
}

function isVoiceProfile(obj: unknown): obj is VoiceProfile {
  if (!obj || typeof obj !== 'object') return false;
  const p = obj as Record<string, unknown>;
  return (
    'voiceType' in p &&
    'tracks' in p &&
    Array.isArray((p as unknown as VoiceProfile).tracks) &&
    typeof ((p as unknown as VoiceProfile).id) === 'string'
  );
}

// =============================================================================
// MUSIC PROFILE BUILDER
// =============================================================================

export class MusicProfileBuilder {
  private profile: Partial<MusicProfile>;
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.profile = {
      id: `music_profile_${projectId}`,
      projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectType: 'drama',
      location: '',
      themes: [],
      visualStyle: '',
      emotionalIntensity: 'medium',
      action: null,
      tracks: [],
      durationSeconds: null,
      transitions: [],
      loops: false,
      styleReferences: [],
      instrumentConstraints: { allowed: [], forbidden: [] },
      voiceTags: []
    };
  }

  setProjectType(type: string): MusicProfileBuilder {
    const validTypes = [
      'adventure', 'drama', 'horror', 'documentary',
      'comedy', 'sci-fi', 'fantasy', 'action'
    ];
    const normalized = type.toLowerCase().replace(/\s+/g, '_');
    this.profile.projectType = validTypes.includes(normalized) 
      ? normalized as MusicProfile['projectType'] 
      : 'drama';
    return this;
  }

  setLocation(location: string): MusicProfileBuilder {
    this.profile.location = location;
    return this;
  }

  addTheme(theme: string): MusicProfileBuilder {
    if (this.profile.themes) {
      this.profile.themes.push(theme);
    }
    return this;
  }

  setVisualStyle(style: string): MusicProfileBuilder {
    const styleMap: Record<string, string> = {
      'realistic': 'realistic',
      'sombre': 'dark',
      'lumineux': 'bright',
      'cyberpunk': 'cyberpunk',
      'noir': 'dark'
    };
    this.profile.visualStyle = styleMap[style.toLowerCase()] || style;
    return this;
  }

  setEmotionalIntensity(intensity: string): MusicProfileBuilder {
    const intensityMap: Record<string, 'low' | 'medium' | 'high' | 'evolving'> = {
      'faible': 'low', 'moyenne': 'medium', 'forte': 'high', 'évolutive': 'evolving',
      'low': 'low', 'medium': 'medium', 'high': 'high', 'evolving': 'evolving'
    };
    this.profile.emotionalIntensity = intensityMap[intensity.toLowerCase()] || 'medium';
    return this;
  }

  setAction(
    actionType: string,
    intensity: string,
    visualRhythm: string
  ): MusicProfileBuilder {
    const actionMap: Record<string, 'explosion' | 'bullet_time' | 'fight' | 'chase' | 'infiltration' | 'dialogue' | 'revelation' | 'tension' | 'calm' | 'emotional'> = {
      'explosion': 'explosion',
      'bullet time': 'bullet_time',
      'bullet_time': 'bullet_time',
      'fight': 'fight',
      'chase': 'chase',
      'infiltration': 'infiltration',
      'dialogue': 'dialogue',
      'révélation': 'revelation',
      'revelation': 'revelation',
      'tension': 'tension',
      'calme': 'calm',
      'calm': 'calm',
      'émotion': 'emotional',
      'emotional': 'emotional'
    };

    const intensityMap: Record<string, 'low' | 'medium' | 'high' | 'evolving'> = {
      'low': 'low', 'medium': 'medium', 'high': 'high', 'evolving': 'evolving'
    };

    const rhythmMap: Record<string, 'slow' | 'normal' | 'fast' | 'hyper' | 'slow_motion'> = {
      'lent': 'slow', 'slow': 'slow',
      'normal': 'normal',
      'rapide': 'fast', 'fast': 'fast',
      'hyper': 'hyper',
      'slow motion': 'slow_motion', 'slow_motion': 'slow_motion'
    };

    const bassRules = {
      mono: true,
      phaseLocked: true,
      subShort: true,
      sidechainLight: false,
      noPitch: true
    };

    const gainRules = {
      dynamic: true,
      bulletTimeDrop: actionType === 'bullet_time',
      explosionPeak: actionType === 'explosion'
    };

    const pitchRules = {
      pitchUpMount: actionType === 'tension',
      pitchDownImpact: actionType === 'explosion',
      stylizedModulation: actionType === 'fight'
    };

    this.profile.action = {
      type: actionMap[actionType] || 'dialogue',
      intensity: intensityMap[intensity.toLowerCase()] || 'medium',
      visualRhythm: rhythmMap[visualRhythm.toLowerCase()] || 'normal',
      bass: bassRules,
      gain: gainRules,
      pitch: pitchRules,
      transitions: this.profile.transitions || []
    };

    return this;
  }

  setDuration(seconds: number): MusicProfileBuilder {
    this.profile.durationSeconds = seconds;
    return this;
  }

  addTransition(transition: string): MusicProfileBuilder {
    if (this.profile.transitions) {
      this.profile.transitions.push(transition);
    }
    return this;
  }

  addStyleReference(reference: string): MusicProfileBuilder {
    if (this.profile.styleReferences) {
      this.profile.styleReferences.push(reference);
    }
    return this;
  }

  addInstrumentConstraint(instrument: string, allowed: boolean): MusicProfileBuilder {
    if (allowed) {
      this.profile.instrumentConstraints?.allowed.push(instrument);
    } else {
      this.profile.instrumentConstraints?.forbidden.push(instrument);
    }
    return this;
  }

  addVoiceTag(tag: string): MusicProfileBuilder {
    if (this.profile.voiceTags) {
      this.profile.voiceTags.push(tag);
    }
    return this;
  }

  setLoops(loops: boolean): MusicProfileBuilder {
    this.profile.loops = loops;
    return this;
  }

  build(): MusicProfile {
    const fullProfile = {
      ...this.profile,
      tracks: this.generateDefaultTracks()
    } as MusicProfile;
    
    return fullProfile;
  }

  private generateDefaultTracks() {
    const bpm = this.calculateBPM();
    
    return [
      {
        id: `track_base_${this.projectId}`,
        name: 'Base Musicale',
        trackType: 'base',
        prompt: this.generateBasePrompt(),
        parameters: { bpm, role: 'foundation' },
        enabled: true,
        volume: -3.0,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        automation: [],
        role: 'foundation'
      },
      {
        id: `track_melody_${this.projectId}`,
        name: 'Mélodie Principale',
        trackType: 'melody',
        prompt: this.generateMelodyPrompt(),
        parameters: { bpm, role: 'lead_melody' },
        enabled: true,
        volume: 0,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        automation: [],
        role: 'lead_melody'
      },
      {
        id: `track_percussion_${this.projectId}`,
        name: 'Percussions',
        trackType: 'percussion',
        prompt: this.generatePercussionPrompt(),
        parameters: { bpm, role: 'rhythm' },
        enabled: true,
        volume: -2,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        automation: [],
        role: 'rhythm'
      },
      {
        id: `track_bass_${this.projectId}`,
        name: 'Basse',
        trackType: 'bass',
        prompt: this.generateBassPrompt(),
        parameters: { bpm, role: 'bass', mono: true, phaseLocked: true },
        enabled: true,
        volume: -4,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        automation: [],
        role: 'texture'
      },
      {
        id: `track_fx_${this.projectId}`,
        name: 'FX Musicaux',
        trackType: 'fx',
        prompt: this.generateFXPrompt(),
        parameters: { bpm, role: 'effects' },
        enabled: true,
        volume: -6,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        automation: [],
        role: 'effects'
      },
      {
        id: `track_drones_${this.projectId}`,
        name: 'Drones / Pads',
        trackType: 'drones',
        prompt: this.generateDronesPrompt(),
        parameters: { bpm, role: 'texture' },
        enabled: true,
        volume: -8,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        automation: [],
        role: 'texture'
      }
    ];
  }

  private calculateBPM(): number {
    const type = this.profile.projectType || 'drama';
    const intensity = this.profile.emotionalIntensity || 'medium';
    
    const baseBPM: Record<string, number> = {
      'drama': 70,
      'horror': 90,
      'action': 140,
      'adventure': 110,
      'documentary': 80,
      'comedy': 120,
      'sci-fi': 128,
      'fantasy': 100
    };
    
    const intensityMultipliers: Record<string, number> = {
      'low': 0.9,
      'medium': 1.0,
      'high': 1.15,
      'evolving': 1.0
    };
    
    const base = baseBPM[type] || 100;
    const multiplier = intensityMultipliers[intensity] || 1.0;
    
    return Math.round(base * multiplier);
  }

  private generateBasePrompt(): string {
    const genre = this.getGenreFromProjectType();
    const instruments = this.getInstrumentsForRole('foundation');
    const tonalities = ['C major', 'D minor', 'E minor', 'F major', 'G major', 'A minor'];
    const selectedTonalities = tonalities.slice(0, 2).join(', ');
    
    return `Génère la piste de BASE pour un projet ${genre}.
Type de projet: ${this.profile.projectType}
Thèmes: ${this.profile.themes?.join(', ') || 'non spécifiés'}
Style visuel: ${this.profile.visualStyle || 'standard'}
Intensity émotionnelle: ${this.profile.emotionalIntensity}
Instruments: ${instruments.join(', ')}
Tonalité: ${selectedTonalities}
Rôle: Foundation (harmonie et progression)
BPM: ${this.profile.action?.type === 'tension' ? 85 : 70}
Duration: ${this.profile.durationSeconds || 30} secondes
Transitions: ${this.profile.transitions?.join(', ') || 'aucune'}`;
  }

  private generateMelodyPrompt(): string {
    const genre = this.getGenreFromProjectType();
    const instruments = this.getInstrumentsForRole('lead_melody');
    
    return `Génère la piste MÉLODIE PRINCIPALE pour un projet ${genre}.
Type de projet: ${this.profile.projectType}
Thèmes: ${this.profile.themes?.join(', ') || 'non spécifiés'}
Style visuel: ${this.profile.visualStyle || 'standard'}
Intensity émotionnelle: ${this.profile.emotionalIntensity}
Instruments principaux: ${instruments.join(', ')}
Rôle: Lead melody (ligne vocale principale)
BPM: ${this.profile.action?.type === 'tension' ? 85 : 70}
Duration: ${this.profile.durationSeconds || 30} secondes`;
  }

  private generatePercussionPrompt(): string {
    const genre = this.getGenreFromProjectType();
    const rhythm = this.getRhythmForAction();
    
    return `Génère la piste de PERCUSSIONS pour un projet ${genre}.
Type de projet: ${this.profile.projectType}
Rythme visuel: ${this.profile.action?.visualRhythm || 'normal'}
Pattern: ${rhythm}
Intensity: ${this.profile.emotionalIntensity}
BPM: ${this.profile.action?.type === 'tension' ? 85 : 70}
Duration: ${this.profile.durationSeconds || 30} secondes`;
  }

  private generateBassPrompt(): string {
    const genre = this.getGenreFromProjectType();
    const bassStyle = this.getBassStyleForAction();
    
    return `Génère la piste de BASSE pour un projet ${genre}.
Type de projet: ${this.profile.projectType}
Style de basse: ${bassStyle}
Phase locked: true
Mono: true
Rythme visuel: ${this.profile.action?.visualRhythm || 'normal'}
Intensity: ${this.profile.emotionalIntensity}
BPM: ${this.profile.action?.type === 'tension' ? 85 : 70}
Duration: ${this.profile.durationSeconds || 30} secondes`;
  }

  private generateFXPrompt(): string {
    const genre = this.getGenreFromProjectType();
    const actionType = this.profile.action?.type || 'none';
    
    return `Génère les FX MUSICAUX pour un projet ${genre}.
Type de projet: ${this.profile.projectType}
Type d'action: ${actionType}
Style visuel: ${this.profile.visualStyle || 'standard'}
Intensity émotionnelle: ${this.profile.emotionalIntensity}
FX recommandés: whooshes, rises, impacts, stingers
Duration: ${this.profile.durationSeconds || 30} secondes`;
  }

  private generateDronesPrompt(): string {
    const genre = this.getGenreFromProjectType();
    
    return `Génère les DRONES/PADS pour un projet ${genre}.
Type de projet: ${this.profile.projectType}
Style visuel: ${this.profile.visualStyle || 'standard'}
Intensity émotionnelle: ${this.profile.emotionalIntensity}
Ambiance: ${this.getAmbianceForStyle()}
FX recommandés: pads atmosphériques, textures évolutives
Duration: ${this.profile.durationSeconds || 30} secondes`;
  }

  private getGenreFromProjectType(): string {
    const genreMap: Record<string, string> = {
      'drama': 'Dramatique',
      'horror': 'Horreur',
      'action': 'Action',
      'adventure': 'Aventure',
      'documentary': 'Documentaire',
      'comedy': 'Comédie',
      'sci-fi': 'Science-Fiction',
      'fantasy': 'Fantasy'
    };
    
    return genreMap[this.profile.projectType || 'drama'] || 'Standard';
  }

  private getInstrumentsForRole(role: string): string[] {
    const instruments: Record<string, string[]> = {
      'foundation': ['piano', 'strings', 'synth pad'],
      'lead_melody': ['piano', 'strings', 'lead synth'],
      'rhythm': ['drums', 'percussion', 'drum machine'],
      'texture': ['ambient pads', 'textural synths', 'field recordings'],
      'effects': ['whooshes', 'rises', 'impacts'],
      'bass': ['sub bass', 'synth bass', 'acoustic bass']
    };
    
    return instruments[role] || ['piano'];
  }

  private getRhythmForAction(): string {
    const actionRhythms: Record<string, string> = {
      'explosion': 'Chaotique avec crescendos',
      'bullet_time': 'Ralenti avec emphasis',
      'fight': 'Polyrythmique intense',
      'chase': 'Syncopé rapide',
      'infiltration': 'Minimaliste et espacé',
      'dialogue': 'Subtil et soutenant',
      'revelation': 'Crescendo dramatique',
      'tension': 'Nerveux et anticipatif',
      'calm': 'Flow relaxed',
      'emotional': 'Flow expressif'
    };
    
    return actionRhythms[this.profile.action?.type || 'dialogue'] || 'Standard';
  }

  private getBassStyleForAction(): string {
    const bassStyles: Record<string, string> = {
      'explosion': 'Impact avec sub bass',
      'bullet_time': 'Descente tonale',
      'fight': 'Dubstep/wobble',
      'chase': 'Driving bass',
      'infiltration': 'Sub bass constant',
      'dialogue': 'Subtle presence',
      'revelation': 'Deep foundation',
      'tension': 'Anticipatory sub',
      'calm': 'Soft bed',
      'emotional': 'Warm low-end'
    };
    
    return bassStyles[this.profile.action?.type || 'dialogue'] || 'Standard';
  }

  private getAmbianceForStyle(): string {
    const styleAmbiances: Record<string, string> = {
      'realistic': 'Natural ambience',
      'dark': 'Eerie and mysterious',
      'bright': 'Optimistic and clear',
      'cyberpunk': 'Urban and industrial',
      'standard': 'Versatile atmosphere'
    };
    
    return styleAmbiances[this.profile.visualStyle || 'standard'] || 'Standard';
  }
}

// =============================================================================
// SFX PROFILE BUILDER
// =============================================================================

export class SFXProfileBuilder {
  private profile: Partial<SFXProfile>;
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.profile = {
      id: `sfx_profile_${projectId}`,
      projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      actionType: 'impact',
      intensity: 'medium',
      environment: '',
      muffling: {
        enabled: false,
        mufflingType: 'low_pass_dynamic',
        cutoffFrequency: 1000,
        resonance: 1.0,
        envelopeAttack: 0.01,
        envelopeRelease: 0.1
      },
      sync: {
        alignWithMusic: true,
        alignWithAction: true,
        duckingEnabled: true,
        duckingThreshold: -20,
        duckingRelease: 0.05
      },
      tracks: []
    };
  }

  setActionType(actionType: string): SFXProfileBuilder {
    const validTypes = ['impact', 'whoosh', 'transition', 'ui', 'ambient', 'weapon', 'footstep', 'nature', 'vehicle'];
    this.profile.actionType = validTypes.includes(actionType.toLowerCase()) ? actionType.toLowerCase() : 'impact';
    return this;
  }

  setIntensity(intensity: string): SFXProfileBuilder {
    const validIntensities = ['low', 'medium', 'high', 'extreme'];
    this.profile.intensity = validIntensities.includes(intensity.toLowerCase()) ? intensity.toLowerCase() : 'medium';
    return this;
  }

  setEnvironment(environment: string): SFXProfileBuilder {
    this.profile.environment = environment;
    return this;
  }

  setMuffling(
    enabled: boolean,
    mufflingTypeValue: string,
    cutoffFrequency: number = 1000
  ): SFXProfileBuilder {
    this.profile.muffling = {
      enabled,
      mufflingType: mufflingTypeValue as MufflingType,
      cutoffFrequency,
      resonance: 1.0,
      envelopeAttack: 0.01,
      envelopeRelease: 0.1
    };
    return this;
  }

  setSync(
    alignWithMusic: boolean,
    alignWithAction: boolean,
    duckingEnabled: boolean
  ): SFXProfileBuilder {
    this.profile.sync = {
      alignWithMusic,
      alignWithAction,
      duckingEnabled,
      duckingThreshold: -20,
      duckingRelease: 0.05
    };
    return this;
  }

  addTrack(track: Partial<SFXTrack>): SFXProfileBuilder {
    if (this.profile.tracks) {
      const defaultMuffling: MufflingSettings = {
        enabled: false,
        mufflingType: 'low_pass_dynamic',
        cutoffFrequency: 1000,
        resonance: 1.0,
        envelopeAttack: 0.01,
        envelopeRelease: 0.1
      };
      this.profile.tracks.push({
        id: `sfx_track_${this.projectId}_${this.profile.tracks.length}`,
        name: track.name || 'SFX Track',
        trackType: (track.trackType as SFXTrackType) || 'action',
        prompt: track.prompt || '',
        parameters: track.parameters || {},
        enabled: true,
        volume: track.volume ?? 0,
        pan: track.pan ?? 0,
        muted: track.muted ?? false,
        solo: track.solo ?? false,
        effects: track.effects || [],
        automation: track.automation || [],
        muffling: track.muffling || this.profile.muffling || defaultMuffling
      });
    }
    return this;
  }

  build(): SFXProfile {
    return {
      ...this.profile,
      tracks: this.generateDefaultTracks()
    } as SFXProfile;
  }

  private generateDefaultTracks() {
    const tracks: SFXTrack[] = [];
    const defaultMuffling: MufflingSettings = {
      enabled: false,
      mufflingType: 'low_pass_dynamic',
      cutoffFrequency: 1000,
      resonance: 1.0,
      envelopeAttack: 0.01,
      envelopeRelease: 0.1
    };
    
    if (this.profile.actionType === 'impact') {
      tracks.push({
        id: `sfx_impact_${this.projectId}`,
        name: 'Impact Principal',
        trackType: 'action',
        prompt: this.generateImpactPrompt(),
        parameters: { intensity: this.profile.intensity || 'medium' },
        enabled: true,
        volume: 3,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        automation: [],
        muffling: this.profile.muffling || defaultMuffling
      });
      
      tracks.push({
        id: `sfx_debris_${this.projectId}`,
        name: 'Débris/résonance',
        trackType: 'action',
        prompt: 'Génère les sons de débris et résonance secondaire pour enrichir l\'impact',
        parameters: { intensity: 'medium' },
        enabled: true,
        volume: -6,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        automation: [],
        muffling: { ...defaultMuffling, enabled: true, mufflingType: 'reverb_muffled' }
      });
    }
    
    if (this.profile.actionType === 'whoosh' || this.profile.actionType === 'transition') {
      tracks.push({
        id: `sfx_whoosh_${this.projectId}`,
        name: 'Whoosh Principal',
        trackType: 'action',
        prompt: this.generateWhooshPrompt(),
        parameters: { intensity: this.profile.intensity || 'medium' },
        enabled: true,
        volume: 0,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        automation: [],
        muffling: this.profile.muffling || defaultMuffling
      });
    }
    
    return tracks;
  }

  private generateImpactPrompt(): string {
    return `Génère un SFX d'impact pour une scène de ${this.profile.environment || 'action'}.
Intensité: ${this.profile.intensity}
Type: ${this.profile.actionType}
Règles: +3-6 dB pour impacts, compression forte, limiter à -1 dB
Muffling: ${this.profile.muffling?.enabled ? 'activé avec cutoff à ' + this.profile.muffling?.cutoffFrequency + 'Hz' : 'désactivé'}
Sync: ${this.profile.sync?.alignWithAction ? 'aligné avec l\'action' : 'non aligné'}
Duration: 0.5-2 secondes`;
  }

  private generateWhooshPrompt(): string {
    return `Génère un whoosh/transition pour une scène de ${this.profile.environment || 'action'}.
Intensité: ${this.profile.intensity}
Type: ${this.profile.actionType}
Règles: Fades fluides, EQ dynamique, compression légère
Sync: ${this.profile.sync?.alignWithMusic ? 'aligné avec la musique' : 'libre'}
Duration: 1-4 secondes`;
  }
}

// =============================================================================
// VOICE PROFILE BUILDER
// =============================================================================

export class VoiceProfileBuilder {
  private profile: Partial<VoiceProfile>;
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
    this.profile = {
      id: `voice_profile_${projectId}`,
      projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      voiceType: 'raw',
      textContent: '',
      language: 'fr',
      filters: [],
      tracks: []
    };
  }

  setVoiceType(voiceType: string): VoiceProfileBuilder {
    const validTypes: VoiceType[] = ['raw', 'sung', 'whisper', 'styled'];
    this.profile.voiceType = validTypes.includes(voiceType.toLowerCase() as VoiceType) ? voiceType.toLowerCase() as VoiceType : 'raw';
    return this;
  }

  setTextContent(text: string): VoiceProfileBuilder {
    this.profile.textContent = text;
    return this;
  }

  setLanguage(language: string): VoiceProfileBuilder {
    this.profile.language = language;
    return this;
  }

  addFilter(filterType: string, params: Record<string, number>): VoiceProfileBuilder {
    const validFilterTypes: VoiceFilterType[] = ['eq', 'compressor', 'reverb', 'distortion', 'band_pass', 'pitch_shift', 'vibrato', 'chorus', 'phaser'];
    this.profile.filters?.push({
      filterType: validFilterTypes.includes(filterType as VoiceFilterType) ? filterType as VoiceFilterType : 'eq',
      enabled: true,
      parameters: params
    });
    return this;
  }

  build(): VoiceProfile {
    return {
      ...this.profile,
      tracks: this.generateDefaultTracks()
    } as VoiceProfile;
  }

  private generateDefaultTracks() {
    const tracks: VoiceTrack[] = [];
    
    if (this.profile.voiceType === 'raw') {
      tracks.push({
        id: `voice_raw_${this.projectId}`,
        name: 'Voix Brute',
        trackType: 'raw',
        prompt: this.generateVoicePrompt(),
        parameters: {},
        enabled: true,
        volume: 0,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        automation: [],
        voiceType: 'raw',
        filters: []
      });
    }
    
    if (this.profile.voiceType === 'styled') {
      tracks.push({
        id: `voice_styled_${this.projectId}`,
        name: 'Voix Stylisée',
        trackType: 'styled',
        prompt: this.generateStyledVoicePrompt(),
        parameters: {},
        enabled: true,
        volume: 0,
        pan: 0,
        muted: false,
        solo: false,
        effects: [],
        automation: [],
        voiceType: 'styled',
        filters: []
      });
    }
    
    return tracks;
  }

  private generateVoicePrompt(): string {
    return `Génère une piste voix BRUTE pour: "${this.profile.textContent}"
Langue: ${this.profile.language}
Style: naturel, voix humaine
Filters: EQ, compressor, reverb légère
Duration: estimation basée sur le texte`;
  }

  private generateStyledVoicePrompt(): string {
    return `Génère une piste voix STYLISÉE pour: "${this.profile.textContent}"
Langue: ${this.profile.language}
Style: effets spécial
Filters: ${this.profile.filters?.map(f => f.filterType).join(', ') || 'standard'}
Duration: estimation basée sur le texte`;
  }
}
