// ============================================================================
// Audio Production Suite Types
// ============================================================================

export interface AudioTrack {
  id: string;
  name: string;
  type: 'voice' | 'music' | 'effect';
  effects: AudioEffect[];
  volume: number;
  pan: number;
}

export interface AudioEffect {
  id: string;
  type: 'normalization' | 'compression' | 'eq' | 'reverb' | 'delay';
  settings: Record<string, number>;
  enabled: boolean;
}

export interface AudioProject {
  id: string;
  name: string;
  tracks: AudioTrack[];
  sampleRate: number;
  bitDepth: number;
}

export interface AudioSettings {
  sampleRate?: number;
  bitDepth?: number;
  volume?: number;
  pan?: number;
  effects?: AudioEffect[];
}

export interface AudioExportOptions {
  format: 'wav' | 'mp3' | 'ogg' | 'aac';
  quality: number; // 0-100
  sampleRate?: number;
  bitDepth?: number;
  includeEffects: boolean;
}

export interface AudioAnalytics {
  trackCount: number;
  effectCount: number;
  totalDuration: number;
  fileSize: number;
}

export interface AudioOperationRecord {
  id: string;
  type: 'create' | 'delete' | 'modify' | 'effect';
  timestamp: string;
  description: string;
  trackId?: string;
  effectId?: string;
}

export interface AudioProjectState {
  project: AudioProject;
  history: AudioOperationRecord[];
  version: string;
  lastModified: string;
}