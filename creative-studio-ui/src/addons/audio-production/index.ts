// ============================================================================
// Audio Production Suite Add-on
// ============================================================================

// Core types - Import first, then re-export
import type { AudioTrack, AudioEffect, AudioProject, AudioSettings, AudioExportOptions } from './types';
export type {
  AudioTrack,
  AudioEffect,
  AudioProject,
  AudioSettings,
  AudioExportOptions,
} from './types';

// Import implementation
import { AudioProductionManager } from './AudioProductionManager';
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

// Export the plugin instance
export const audioProductionPlugin: AudioProductionPlugin = {
  name: 'Audio Production Suite',
  version: '1.0.0',
  description: 'Complete audio production and sound effects suite',

  initialize: async () => {},
  destroy: async () => {},
  getAudioManager: () => {
    throw new Error('AudioProductionManager not initialized');
  },
  onProjectLoaded: () => {},
  onProjectSaved: () => {},
  createTrack: () => {
    throw new Error('Not implemented');
  },
  addEffect: () => {},
  exportAudio: async () => new Blob(),
};

// Default export
export default audioProductionPlugin;
