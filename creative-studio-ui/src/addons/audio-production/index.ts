// ============================================================================
// Audio Production Suite Add-on
// ============================================================================

// Core types
export type {
  AudioTrack,
  AudioEffect,
  AudioProject,
  AudioSettings,
  AudioExportOptions,
} from './types';

// Import types for internal use
import type { AudioTrack, AudioEffect, AudioProject, AudioSettings, AudioExportOptions } from './types';

// Import implementation
export { AudioProductionManager } from './AudioProductionManager';

// Plugin interface
export interface AudioProductionPlugin {
  name: string;
  version: string;
  description: string;

  // Lifecycle methods
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  // Core functionality
  getAudioManager(): AudioProductionManager;

  // Integration hooks
  onProjectLoaded(projectId: string): void;
  onProjectSaved(projectId: string): void;

  // API for audio processing
  createTrack(name: string, type: 'voice' | 'music' | 'effect'): AudioTrack;
  addEffect(trackId: string, effect: AudioEffect): void;
  exportAudio(options: AudioExportOptions): Promise<Blob>;
}

// Placeholder for AudioProductionManager
export interface AudioProductionManager {
  // Core methods
  createTrack(name: string, type: 'voice' | 'music' | 'effect'): AudioTrack;
  removeTrack(trackId: string): void;
  addEffect(trackId: string, effect: AudioEffect): void;
  removeEffect(trackId: string, effectId: string): void;
  getTracks(): AudioTrack[];
  getEffects(trackId: string): AudioEffect[];
  getProject(): AudioProject;

  // Audio processing
  applyNormalization(trackId: string): void;
  applyCompression(trackId: string): void;
  applyEQ(trackId: string, settings: AudioSettings): void;

  // Export
  exportAudio(options: AudioExportOptions): Promise<Blob>;

  // Import
  importAudio(file: File): Promise<AudioTrack>;

  // State management
  serialize(): string;
  deserialize(data: string): void;
}

// Export the plugin instance
let audioProductionManagerInstance: AudioProductionManager | null = null;

export const audioProductionPlugin: AudioProductionPlugin = {
  name: 'Audio Production Suite',
  version: '1.0.0',
  description: 'Complete audio production and sound effects suite',

  initialize: async () => {
    // Initialize audio production manager
    audioProductionManagerInstance = {
      createTrack: (name, type) => ({
        id: crypto.randomUUID(),
        name,
        type,
        effects: [],
        volume: 1.0,
        pan: 0.0,
      }),
      removeTrack: (trackId) => {},
      addEffect: (trackId, effect) => {},
      removeEffect: (trackId, effectId) => {},
      getTracks: () => [],
      getEffects: (trackId) => [],
      getProject: () => ({
        id: crypto.randomUUID(),
        name: 'New Project',
        tracks: [],
        sampleRate: 44100,
        bitDepth: 16,
      }),
      applyNormalization: (trackId) => {},
      applyCompression: (trackId) => {},
      applyEQ: (trackId, settings) => {},
      exportAudio: async (options) => new Blob(),
      importAudio: async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: 'music',
        effects: [],
        volume: 1.0,
        pan: 0.0,
      }),
      serialize: () => JSON.stringify({}),
      deserialize: (data) => {},
    };
  },

  destroy: async () => {
    audioProductionManagerInstance = null;
  },

  getAudioManager: () => {
    if (!audioProductionManagerInstance) {
      throw new Error('AudioProductionManager not initialized. Call initialize() first.');
    }
    return audioProductionManagerInstance;
  },

  onProjectLoaded: (projectId) => {},
  onProjectSaved: (projectId) => {},

  createTrack: (name, type) => {
    return audioProductionManagerInstance?.createTrack(name, type) || {
      id: crypto.randomUUID(),
      name,
      type,
      effects: [],
      volume: 1.0,
      pan: 0.0,
    };
  },

  addEffect: (trackId, effect) => {
    audioProductionManagerInstance?.addEffect(trackId, effect);
  },

  exportAudio: async (options) => {
    return audioProductionManagerInstance?.exportAudio(options) || new Blob();
  },
};

// Default export
export default audioProductionPlugin;