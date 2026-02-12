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
import type { PlanSequencesManager } from './PlanSequencesManager';

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

// Export the plugin instance
export const planSequencesPlugin: PlanSequencesPlugin = {
  name: 'Plan Sequences Manager',
  version: '1.0.0',
  description: 'Advanced planning and management for sequences and shots',

  initialize: async () => {},
  destroy: async () => {},
  getPlanManager: () => {
    throw new Error('PlanSequencesManager not initialized');
  },
  onProjectLoaded: () => {},
  onProjectSaved: () => {},
  createSequence: () => {
    throw new Error('Not implemented');
  },
  addShot: () => {},
  exportPlan: async () => new Blob(),
};

// Default export
export default planSequencesPlugin;
