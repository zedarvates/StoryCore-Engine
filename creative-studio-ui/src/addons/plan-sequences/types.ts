// ============================================================================
// Plan Sequences Manager Types
// ============================================================================

export interface SequencePlan {
  id: string;
  name: string;
  shots: ShotPlan[];
  duration: number; // Total duration in seconds
  createdAt: string;
}

export interface ShotPlan {
  id: string;
  name: string;
  description: string;
  duration: number; // Duration in seconds
  type: 'dialogue' | 'action' | 'establishing' | 'transition';
  characters: string[]; // Character IDs
  location: string;
  notes: string;
}

export interface SequenceProject {
  id: string;
  name: string;
  sequences: SequencePlan[];
  settings: PlanningSettings;
}

export interface PlanningSettings {
  maxShotsPerSequence: number;
  autoCalculateDuration: boolean;
  enableSequenceTemplates: boolean;
  sequenceNamingConvention: 'numbered' | 'descriptive' | 'custom';
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeMetadata: boolean;
  includeNotes: boolean;
  includeCharacters: boolean;
}

export interface PlanningOperation {
  id: string;
  type: 'create' | 'delete' | 'modify' | 'import' | 'export';
  timestamp: string;
  description: string;
  sequenceId?: string;
  shotId?: string;
}

export interface PlanningState {
  project: SequenceProject;
  history: PlanningOperation[];
  version: string;
  lastModified: string;
}