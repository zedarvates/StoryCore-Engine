// ============================================================================
// Plan Sequences Manager Add-on
// ============================================================================

// Core types
export type {
  SequencePlan,
  ShotPlan,
  SequenceProject,
  PlanningSettings,
  ExportOptions,
} from './types';

// Import types for internal use
import type { SequencePlan, ShotPlan, SequenceProject, PlanningSettings, ExportOptions } from './types';

// Import implementation
export { PlanSequencesManager } from './PlanSequencesManager';

// Plugin interface
export interface PlanSequencesPlugin {
  name: string;
  version: string;
  description: string;

  // Lifecycle methods
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  // Core functionality
  getPlanManager(): PlanSequencesManager;

  // Integration hooks
  onProjectLoaded(projectId: string): void;
  onProjectSaved(projectId: string): void;

  // API for sequence planning
  createSequence(name: string): SequencePlan;
  addShot(sequenceId: string, shot: ShotPlan): void;
  exportPlan(projectId: string, options: ExportOptions): Promise<Blob>;
}

// Placeholder for PlanSequencesManager
export interface PlanSequencesManager {
  // Core methods
  createSequence(name: string): SequencePlan;
  removeSequence(sequenceId: string): void;
  addShot(sequenceId: string, shot: ShotPlan): void;
  removeShot(sequenceId: string, shotId: string): void;
  getSequences(): SequencePlan[];
  getShots(sequenceId: string): ShotPlan[];
  getProject(): SequenceProject;

  // Planning tools
  autoGenerateShots(sequenceId: string, settings: PlanningSettings): void;
  calculateDurations(sequenceId: string): void;
  validatePlan(): string[];

  // Export
  exportPlan(options: ExportOptions): Promise<Blob>;

  // Import
  importPlan(file: File): Promise<SequenceProject>;

  // State management
  serialize(): string;
  deserialize(data: string): void;
}

// Export the plugin instance
let planSequencesManagerInstance: PlanSequencesManager | null = null;

export const planSequencesPlugin: PlanSequencesPlugin = {
  name: 'Plan Sequences Manager',
  version: '1.0.0',
  description: 'Advanced planning and management for sequences and shots',

  initialize: async () => {
    // Initialize plan sequences manager
    planSequencesManagerInstance = {
      createSequence: (name) => ({
        id: crypto.randomUUID(),
        name,
        shots: [],
        duration: 0,
        createdAt: new Date().toISOString(),
      }),
      removeSequence: (sequenceId) => {},
      addShot: (sequenceId, shot) => {},
      removeShot: (sequenceId, shotId) => {},
      getSequences: () => [],
      getShots: (sequenceId) => [],
      getProject: () => ({
        id: crypto.randomUUID(),
        name: 'New Project',
        sequences: [],
        settings: {
          maxShotsPerSequence: 20,
          autoCalculateDuration: true,
          enableSequenceTemplates: true,
          sequenceNamingConvention: 'numbered',
        },
      }),
      autoGenerateShots: (sequenceId, settings) => {},
      calculateDurations: (sequenceId) => {},
      validatePlan: () => [],
      exportPlan: async (options) => new Blob(),
      importPlan: async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        sequences: [],
        settings: {
          maxShotsPerSequence: 20,
          autoCalculateDuration: true,
          enableSequenceTemplates: true,
          sequenceNamingConvention: 'numbered',
        },
      }),
      serialize: () => JSON.stringify({}),
      deserialize: (data) => {},
    };
  },

  destroy: async () => {
    planSequencesManagerInstance = null;
  },

  getPlanManager: () => {
    if (!planSequencesManagerInstance) {
      throw new Error('PlanSequencesManager not initialized. Call initialize() first.');
    }
    return planSequencesManagerInstance;
  },

  onProjectLoaded: (projectId) => {},
  onProjectSaved: (projectId) => {},

  createSequence: (name) => {
    return planSequencesManagerInstance?.createSequence(name) || {
      id: crypto.randomUUID(),
      name,
      shots: [],
      duration: 0,
      createdAt: new Date().toISOString(),
    };
  },

  addShot: (sequenceId, shot) => {
    planSequencesManagerInstance?.addShot(sequenceId, shot);
  },

  exportPlan: async (projectId, options) => {
    return planSequencesManagerInstance?.exportPlan(options) || new Blob();
  },
};

// Default export
export default planSequencesPlugin;