/**
 * StoryCore Audio Multitrack Types
 * 
 * TypeScript definitions for multi-track audio generation based on:
 * AUDIO & SFX STORYCORE ENGINE (VERSION MULTIPISTE)
 */

// =============================================================================
// NORMALIZED INPUT ENUMS (Section 3)
// =============================================================================

export type FilmGenre = 
  | 'adventure'
  | 'drama'
  | 'horror'
  | 'documentary'
  | 'comedy'
  | 'sci-fi'
  | 'fantasy'
  | 'action';

export type Ambiance = 
  | 'dark'
  | 'bright'
  | 'mystical'
  | 'epic'
  | 'intimate'
  | 'chaotic';

export type Tempo = 'slow' | 'medium' | 'fast';

export type Intensity = 'low' | 'medium' | 'high' | 'evolving';

export type Culture = 
  | 'european'
  | 'asian'
  | 'african'
  | 'middle-eastern'
  | 'american'
  | 'mixed';

export type Epoque = 'modern' | 'medieval' | 'futuristic' | 'timeless';

// =============================================================================
// ACTION TYPES (Section 4.2)
// =============================================================================

export type ActionType = 
  | 'explosion'
  | 'bullet_time'
  | 'fight'
  | 'chase'
  | 'infiltration'
  | 'dialogue'
  | 'revelation'
  | 'tension'
  | 'calm'
  | 'emotional';

export type VisualRhythm = 'slow' | 'normal' | 'fast' | 'hyper' | 'slow_motion';

// =============================================================================
// MUSIC TRACK TYPES (Section 5)
// =============================================================================

export type MusicTrackType = 
  | 'base'       // Piste 1: base musicale (fondation)
  | 'melody'     // Piste 2: mélodie principale
  | 'percussion' // Piste 3: percussions / rythme
  | 'bass'       // Piste 4: basse (mono, phase-locked)
  | 'fx'         // Piste 5: FX musicaux
  | 'drones';    // Piste 6: drones / pads

// =============================================================================
// SFX TYPES (Section 6.1)
// =============================================================================

export type SFXType = 
  | 'action'       // tirs, impacts, explosions, whooshes, ricochets
  | 'environment'   // vent, pluie, ville, jungle
  | 'stylized'    // glitch, bass drops, résonances
  | 'bullet_time'; // time stretch, pitch down, étouffement

export type SFXTrackType = 'action' | 'environment' | 'stylized' | 'bullet_time';

export type MufflingType = 
  | 'low_pass_dynamic'
  | 'band_pass'
  | 'high_cut'
  | 'reverb_muffled'
  | 'ducking';

// =============================================================================
// VOICE TYPES (Section 8)
// =============================================================================

export type VoiceType = 'raw' | 'sung' | 'whisper' | 'styled';

export type VoiceStyle = 'radio' | 'robot' | 'telephone' | 'deep_space' | 'corrupted';

export type VoiceFilterType = 
  | 'eq'
  | 'compressor'
  | 'reverb'
  | 'distortion'
  | 'band_pass'
  | 'pitch_shift'
  | 'vibrato'
  | 'chorus'
  | 'phaser';

// =============================================================================
// FILTER TYPES (Section 9)
// =============================================================================

export type FilterType = 
  | 'low_pass'
  | 'high_pass'
  | 'band_pass'
  | 'eq_dynamic'
  | 'compression'
  | 'limiter'
  | 'transient_shaper'
  | 'stereo_width'
  | 'reverb'
  | 'delay'
  | 'pitch_shift'
  | 'time_stretch';

// =============================================================================
// TRACK PRIORITY (Section 10)
// =============================================================================

export type TrackPriority = 1 | 2 | 3 | 4 | 5;

export type TrackCategory = 'dialogue' | 'sfx' | 'music' | 'ambient';

// =============================================================================
// DATA INTERFACES
// =============================================================================

// --- Bass Rules (Section 4.2) ---
export interface BassRules {
  mono: boolean;           // Mono obligatoire
  phaseLocked: boolean;    // Phase verrouillée
  subShort: boolean;       // Sub court
  sidechainLight: boolean; // Sidechain léger
  noPitch: boolean;        // Pas de pitch sur la basse
}

// --- Gain Rules (Section 4.2) ---
export interface GainRules {
  dynamic: boolean;
  bulletTimeDrop: boolean;
  explosionPeak: boolean;
}

// --- Pitch Rules (Section 4.2) ---
export interface PitchRules {
  pitchUpMount: boolean;
  pitchDownImpact: boolean;
  stylizedModulation: boolean;
}

// --- Tempo Rules (Section 4.2) ---
export interface TempoRules {
  actionBpm: [number, number];      // 130-160
  stylizedBpm: [number, number];    // 100-120
  bulletTimeBpm: [number, number]; // 60-80
  tensionBpm: [number, number];     // 70-100
}

// --- Action Context ---
export interface ActionContext {
  type: ActionType;
  intensity: Intensity;
  visualRhythm: VisualRhythm;
  bass: BassRules;
  gain: GainRules;
  pitch: PitchRules;
  transitions: string[];
}

// --- Muffling Settings (Section 6.2) ---
export interface MufflingSettings {
  enabled: boolean;
  mufflingType: MufflingType;
  cutoffFrequency: number;  // Hz
  resonance: number;
  envelopeAttack: number;   // seconds
  envelopeRelease: number;   // seconds
  context?: string;
}

// --- Sync Settings (Section 6.2) ---
export interface SyncSettings {
  alignWithMusic: boolean;
  alignWithAction: boolean;
  duckingEnabled: boolean;
  duckingThreshold: number;  // dB
  duckingRelease: number;    // seconds
}

// --- Filter Parameters ---
export interface FilterParameters {
  [key: string]: number | string | boolean;
}

// --- Voice Filter ---
export interface VoiceFilter {
  filterType: VoiceFilterType;
  enabled: boolean;
  parameters: FilterParameters;
}

// --- Audio Track (Generic) ---
export interface AudioTrack {
  id: string;
  name: string;
  trackType: string;
  prompt: string;
  parameters: Record<string, unknown>;
  enabled: boolean;
  volume: number;      // dB
  pan: number;         // -1 to 1
  muted: boolean;
  solo: boolean;
  effects: AudioEffect[];
  automation: AudioAutomation[];
}

// --- Audio Effect ---
export interface AudioEffect {
  id: string;
  type: string;
  enabled: boolean;
  parameters: FilterParameters;
}

// --- Audio Automation ---
export interface AudioAutomation {
  type: 'volume' | 'pan' | 'filter';
  curve: 'linear' | 'exponential' | 's_curve' | 'keyframe';
  points: [number, number][];  // [time, value]
}

// --- Music Track (Section 5) ---
export interface MusicTrack extends AudioTrack {
  trackType: MusicTrackType;
  role: 'foundation' | 'lead_melody' | 'rhythm' | 'effects' | 'texture';
}

// --- SFX Track (Section 7) ---
export interface SFXTrack extends AudioTrack {
  trackType: SFXTrackType;
  muffling: MufflingSettings;
}

// --- Voice Track (Section 8) ---
export interface VoiceTrack extends AudioTrack {
  voiceType: VoiceType;
  filters: VoiceFilter[];
}

// =============================================================================
// PROFILE INTERFACES (Section 11)
// =============================================================================

// --- Music Profile ---
export interface MusicProfile {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  
  // Normalized inputs (Section 3)
  projectType: FilmGenre;
  location: string;
  themes: string[];
  visualStyle: string;
  emotionalIntensity: Intensity;
  
  // Action context (Section 4.2)
  action: ActionContext | null;
  
  // Track configuration (Section 5)
  tracks: MusicTrack[];
  
  // Constraints
  durationSeconds: number | null;
  transitions: string[];
  loops: boolean;
  
  // References
  styleReferences: string[];
  instrumentConstraints: {
    allowed: string[];
    forbidden: string[];
  };
  voiceTags: string[];
}

// --- SFX Profile ---
export interface SFXProfile {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  
  // SFX Configuration
  actionType: string;
  intensity: string;
  environment: string;
  
  // Muffling (Section 6.2)
  muffling: MufflingSettings;
  
  // Post-filters (Section 9)
  postFilters: Record<string, FilterParameters>;
  
  // Sync (Section 6.2)
  sync: SyncSettings;
  
  // Track configuration (Section 7)
  tracks: SFXTrack[];
}

// --- Voice Profile ---
export interface VoiceProfile {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  
  // Voice Configuration
  voiceType: VoiceType;
  voiceStyle: VoiceStyle | null;
  textContent: string;
  
  // Filters (Section 8)
  filters: VoiceFilter[];
  
  // Track Configuration
  tracks: VoiceTrack[];
  
  // Constraints
  durationSeconds: number | null;
  language: string;
}

// =============================================================================
// MIX INTERFACES
// =============================================================================

// --- Volume Level (Section 10) ---
export interface VolumeLevel {
  baseVolume: number;  // dB
  minVolume: number;   // dB
  maxVolume: number;   // dB
  fadeIn: number;      // seconds
  fadeOut: number;    // seconds
}

// --- Mix Node ---
export interface MixNode {
  id: string;
  name: string;
  category: TrackCategory;
  priority: TrackPriority;
  volume: number;  // dB
  pan: number;     // -1 to 1
  muted: boolean;
  solo: boolean;
  effects: AudioEffect[];
  automation: AudioAutomation[];
  phase: 'mono' | 'stereo';
}

// --- Mix Configuration ---
export interface MixConfiguration {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  
  // Master settings
  masterVolume: number;  // dB
  masterLimit: boolean;
  masterLimiterThreshold: number;  // dB
  
  // Tracks
  tracks: MixNode[];
  
  // Mix settings
  autoMixEnabled: boolean;
  duckingEnabled: boolean;
  duckingThreshold: number;  // dB
  duckingRelease: number;    // seconds
  
  // Export settings
  outputFormat: 'wav' | 'mp3' | 'flac';
  sampleRate: number;
  channels: number;
}

// --- Mix Result ---
export interface MixResult {
  success: boolean;
  configuration: MixConfiguration | null;
  warnings: string[];
  errors: string[];
  renderedAt: string | null;
}

// =============================================================================
// GENERATION REQUEST/RESPONSE INTERFACES
// =============================================================================

// --- Multi-track Generation Request ---
export interface MultitrackGenerationRequest {
  projectId: string;
  musicProfile: MusicProfile | null;
  sfxProfile: SFXProfile | null;
  voiceProfile: VoiceProfile | null;
  options: {
    regenerateTrack?: string;
    applyAutoMix?: boolean;
    outputFormat?: 'wav' | 'mp3';
  };
}

// --- Generated Prompt ---
export interface GeneratedPrompt {
  trackName: string;
  trackType: string;
  prompt: string;
  parameters: Record<string, unknown>;
  estimatedDuration: number;
}

// --- Prompt Export ---
export interface PromptExport {
  musicPrompts: GeneratedPrompt[];
  sfxPrompts: GeneratedPrompt[];
  voicePrompts: GeneratedPrompt[];
  totalTracks: number;
  exportedAt: string;
}

// =============================================================================
// API RESPONSE INTERFACES
// =============================================================================

export interface ProfileBuildResponse {
  success: boolean;
  profile: MusicProfile | SFXProfile | VoiceProfile;
  errors: string[];
}

export interface MultitrackGenerationResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  tracks: {
    music: string[];
    sfx: string[];
    voice: string[];
  };
  estimatedTime: number;
}

export interface MixRenderResponse {
  success: boolean;
  outputPath: string;
  fileSize: number;
  duration: number;
  warnings: string[];
}

// =============================================================================
// STANDARD VOLUMES (Section 10)
// =============================================================================

export const STANDARD_VOLUMES: Record<string, VolumeLevel> = {
  impact: { baseVolume: 4.0, minVolume: -6.0, maxVolume: 6.0, fadeIn: 0.01, fadeOut: 0.1 },
  tir: { baseVolume: 3.0, minVolume: -6.0, maxVolume: 4.0, fadeIn: 0.005, fadeOut: 0.05 },
  ambiance: { baseVolume: -16.0, minVolume: -20.0, maxVolume: -12.0, fadeIn: 1.0, fadeOut: 1.0 },
  musique_action: { baseVolume: -6.0, minVolume: -12.0, maxVolume: 0.0, fadeIn: 0.5, fadeOut: 0.5 },
  musique_tension: { baseVolume: -3.0, minVolume: -9.0, maxVolume: 0.0, fadeIn: 0.5, fadeOut: 0.5 },
  musique_emotion: { baseVolume: 0.0, minVolume: -6.0, maxVolume: 3.0, fadeIn: 1.0, fadeOut: 1.0 },
  dialogue: { baseVolume: 0.0, minVolume: -12.0, maxVolume: 3.0, fadeIn: 0.05, fadeOut: 0.05 },
  default: { baseVolume: -6.0, minVolume: -60.0, maxVolume: 6.0, fadeIn: 0.1, fadeOut: 0.1 }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getTrackPriority(category: TrackCategory): TrackPriority {
  const priorityMap: Record<TrackCategory, TrackPriority> = {
    dialogue: 5,
    sfx: 4,
    music: 3,
    ambient: 1
  };
  return priorityMap[category];
}

export function getVolumeForCategory(
  category: string,
  context: string = 'default'
): VolumeLevel {
  if (context === 'action' && category === 'music') {
    return STANDARD_VOLUMES.musique_action;
  } else if (context === 'tension' && category === 'music') {
    return STANDARD_VOLUMES.musique_tension;
  } else if (context === 'emotion' && category === 'music') {
    return STANDARD_VOLUMES.musique_emotion;
  } else if (category === 'ambient') {
    return STANDARD_VOLUMES.ambiance;
  } else if (category === 'impact') {
    return STANDARD_VOLUMES.impact;
  } else if (category === 'tir') {
    return STANDARD_VOLUMES.tir;
  } else if (category === 'dialogue') {
    return STANDARD_VOLUMES.dialogue;
  }
  return STANDARD_VOLUMES.default;
}

export function isLowFrequencyTrack(name: string): boolean {
  const lowFreqTerms = ['bass', 'basse', 'sub', 'kick', 'boom'];
  return lowFreqTerms.some(term => name.toLowerCase().includes(term));
}

