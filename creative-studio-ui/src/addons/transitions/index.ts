// ============================================================================
// Advanced Transitions Add-on
// ============================================================================

// Core types
export type {
  Transition,
  TransitionPreset,
  TransitionSettings,
  TransitionLibrary,
} from './types';

// Import types for internal use
import type { Transition, TransitionPreset, TransitionSettings, TransitionLibrary } from './types';
import type { TransitionsManager } from './TransitionsManager';

// Import implementation
export { TransitionsManager } from './TransitionsManager';

// Plugin interface
export interface TransitionsPlugin {
  name: string;
  version: string;
  description: string;

  // Lifecycle methods
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  // Core functionality
  getTransitionsManager(): TransitionsManager;

  // Integration hooks
  onProjectLoaded(projectId: string): void;
  onProjectSaved(projectId: string): void;

  // API for transition management
  getAvailableTransitions(): TransitionPreset[];
  applyTransition(transitionId: string, settings: TransitionSettings): void;
  previewTransition(transitionId: string, settings: TransitionSettings): Promise<Blob>;
}

// Export the plugin instance
export const transitionsPlugin: TransitionsPlugin = {
  name: 'Advanced Transitions',
  version: '1.0.0',
  description: 'Extended library of professional transition effects',

  initialize: async () => {},
  destroy: async () => {},
  getTransitionsManager: () => {
    throw new Error('TransitionsManager not initialized');
  },
  onProjectLoaded: () => {},
  onProjectSaved: () => {},
  getAvailableTransitions: () => [],
  applyTransition: () => {},
  previewTransition: async () => new Blob(),
};

// Default export
export default transitionsPlugin;
