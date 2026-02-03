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

// Placeholder for TransitionsManager
export interface TransitionsManager {
  // Core methods
  getAvailableTransitions(): TransitionPreset[];
  getTransition(transitionId: string): TransitionPreset | undefined;
  applyTransition(transitionId: string, settings: TransitionSettings): void;
  previewTransition(transitionId: string, settings: TransitionSettings): Promise<Blob>;
  getLibrary(): TransitionLibrary;

  // Library management
  addCustomTransition(transition: TransitionPreset): void;
  removeCustomTransition(transitionId: string): void;
  getCustomTransitions(): TransitionPreset[];

  // State management
  serialize(): string;
  deserialize(data: string): void;
}

// Export the plugin instance
let transitionsManagerInstance: TransitionsManager | null = null;

export const transitionsPlugin: TransitionsPlugin = {
  name: 'Advanced Transitions',
  version: '1.0.0',
  description: 'Extended library of professional transition effects',

  initialize: async () => {
    // Initialize transitions manager
    transitionsManagerInstance = {
      getAvailableTransitions: () => [
        {
          id: 'fade',
          name: 'Fade',
          category: 'basic',
          description: 'Simple fade transition',
          defaultSettings: { duration: 0.5, direction: 'in' },
        },
        {
          id: 'slide',
          name: 'Slide',
          category: 'basic',
          description: 'Slide transition',
          defaultSettings: { duration: 0.5, direction: 'left' },
        },
      ],
      getTransition: (transitionId) => {
        const transitions = transitionsManagerInstance?.getAvailableTransitions() || [];
        return transitions.find(t => t.id === transitionId);
      },
      applyTransition: (transitionId, settings) => {},
      previewTransition: async (transitionId, settings) => new Blob(),
      getLibrary: () => ({
        builtin: [],
        custom: [],
        version: '1.0',
      }),
      addCustomTransition: (transition) => {},
      removeCustomTransition: (transitionId) => {},
      getCustomTransitions: () => [],
      serialize: () => JSON.stringify({}),
      deserialize: (data) => {},
    };
  },

  destroy: async () => {
    transitionsManagerInstance = null;
  },

  getTransitionsManager: () => {
    if (!transitionsManagerInstance) {
      throw new Error('TransitionsManager not initialized. Call initialize() first.');
    }
    return transitionsManagerInstance;
  },

  onProjectLoaded: (projectId) => {},
  onProjectSaved: (projectId) => {},

  getAvailableTransitions: () => {
    return transitionsManagerInstance?.getAvailableTransitions() || [];
  },

  applyTransition: (transitionId, settings) => {
    transitionsManagerInstance?.applyTransition(transitionId, settings);
  },

  previewTransition: async (transitionId, settings) => {
    return transitionsManagerInstance?.previewTransition(transitionId, settings) || new Blob();
  },
};

// Default export
export default transitionsPlugin;