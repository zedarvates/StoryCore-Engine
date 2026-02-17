// ============================================================================
// Plan Sequences Manager Implementation
// ============================================================================

import type {
  SequencePlan,
  ShotPlan,
  SequenceProject,
  PlanningSettings,
  ExportOptions,
  PlanningOperation,
  PlanningState,
} from './types';

export class PlanSequencesManager {
  private project: SequenceProject;
  private history: PlanningOperation[] = [];
  private readonly MAX_HISTORY_SIZE = 50;

  constructor() {
    this.project = {
      id: crypto.randomUUID(),
      name: 'New Sequence Project',
      sequences: [],
      settings: {
        maxShotsPerSequence: 20,
        autoCalculateDuration: true,
        enableSequenceTemplates: true,
        sequenceNamingConvention: 'numbered',
      },
    };
  }

  /**
   * Create a new sequence
   */
  createSequence(name: string): SequencePlan {
    const sequence: SequencePlan = {
      id: crypto.randomUUID(),
      name,
      shots: [],
      duration: 0,
      createdAt: new Date().toISOString(),
    };

    this.project.sequences.push(sequence);
    this.recordOperation('create', `Created sequence: ${name}`, sequence.id);

    return sequence;
  }

  /**
   * Remove a sequence by ID
   */
  removeSequence(sequenceId: string): void {
    const index = this.project.sequences.findIndex(s => s.id === sequenceId);
    if (index !== -1) {
      const sequence = this.project.sequences[index];
      this.project.sequences.splice(index, 1);
      this.recordOperation('delete', `Deleted sequence: ${sequence.name}`, sequenceId);
    }
  }

  /**
   * Add a shot to a sequence
   */
  addShot(sequenceId: string, shot: ShotPlan): void {
    const sequence = this.project.sequences.find(s => s.id === sequenceId);
    if (sequence) {
      sequence.shots.push(shot);
      this.recordOperation('create', `Added shot to sequence: ${sequence.name}`, sequenceId, shot.id);

      // Recalculate duration if auto-calculate is enabled
      if (this.project.settings.autoCalculateDuration) {
        this.calculateSequenceDuration(sequence);
      }
    }
  }

  /**
   * Remove a shot from a sequence
   */
  removeShot(sequenceId: string, shotId: string): void {
    const sequence = this.project.sequences.find(s => s.id === sequenceId);
    if (sequence) {
      const shotIndex = sequence.shots.findIndex(s => s.id === shotId);
      if (shotIndex !== -1) {
        const shot = sequence.shots[shotIndex];
        sequence.shots.splice(shotIndex, 1);
        this.recordOperation('delete', `Removed shot from sequence: ${sequence.name}`, sequenceId, shotId);

        // Recalculate duration if auto-calculate is enabled
        if (this.project.settings.autoCalculateDuration) {
          this.calculateSequenceDuration(sequence);
        }
      }
    }
  }

  /**
   * Get all sequences
   */
  getSequences(): SequencePlan[] {
    return [...this.project.sequences];
  }

  /**
   * Get shots for a specific sequence
   */
  getShots(sequenceId: string): ShotPlan[] {
    const sequence = this.project.sequences.find(s => s.id === sequenceId);
    return sequence ? [...sequence.shots] : [];
  }

  /**
   * Get the current project
   */
  getProject(): SequenceProject {
    return { ...this.project };
  }

  /**
   * Auto-generate shots for a sequence
   */
  autoGenerateShots(sequenceId: string, settings: PlanningSettings): void {
    const sequence = this.project.sequences.find(s => s.id === sequenceId);
    if (sequence) {
      // In a real implementation, this would use AI or templates to generate shots
      this.recordOperation('modify', `Auto-generated shots for sequence: ${sequence.name}`, sequenceId);
    }
  }

  /**
   * Calculate durations for a sequence
   */
  calculateDurations(sequenceId: string): void {
    const sequence = this.project.sequences.find(s => s.id === sequenceId);
    if (sequence) {
      this.calculateSequenceDuration(sequence);
      this.recordOperation('modify', `Recalculated durations for sequence: ${sequence.name}`, sequenceId);
    }
  }

  /**
   * Validate the current plan
   */
  validatePlan(): string[] {
    const errors: string[] = [];

    // Check sequence limits
    this.project.sequences.forEach(sequence => {
      if (sequence.shots.length > this.project.settings.maxShotsPerSequence) {
        errors.push(`Sequence "${sequence.name}" exceeds maximum shot limit`);
      }
    });

    return errors;
  }

  /**
   * Export the plan
   */
  async exportPlan(options: ExportOptions): Promise<Blob> {
    // In a real implementation, this would export to the specified format
    return new Blob([JSON.stringify(this.project, null, 2)], { type: 'application/json' });
  }

  /**
   * Import a plan from file
   */
  async importPlan(file: File): Promise<SequenceProject> {
    // In a real implementation, this would parse the file
    const project: SequenceProject = {
      id: crypto.randomUUID(),
      name: file.name,
      sequences: [],
      settings: {
        maxShotsPerSequence: 20,
        autoCalculateDuration: true,
        enableSequenceTemplates: true,
        sequenceNamingConvention: 'numbered',
      },
    };

    this.project = project;
    this.recordOperation('import', `Imported plan: ${file.name}`);

    return project;
  }

  /**
   * Serialize project state
   */
  serialize(): string {
    const state: PlanningState = {
      project: this.project,
      history: this.history,
      version: '1.0',
      lastModified: new Date().toISOString(),
    };

    return JSON.stringify(state, null, 2);
  }

  /**
   * Deserialize project state
   */
  deserialize(data: string): void {
    try {
      const state = JSON.parse(data);
      if (this.isValidPlanningState(state)) {
        this.project = state.project;
        this.history = state.history || [];
      } else {
        console.warn('Invalid planning state format');
      }
    } catch (error) {
      console.error('Failed to deserialize planning state:', error);
    }
  }

  /**
   * Get operation history
   */
  getHistory(): PlanningOperation[] {
    return [...this.history];
  }

  /**
   * Clear operation history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Set project name
   */
  setProjectName(name: string): void {
    this.project.name = name;
    this.recordOperation('modify', `Project renamed to: ${name}`);
  }

  /**
   * Set project settings
   */
  setProjectSettings(settings: Partial<PlanningSettings>): void {
    this.project.settings = { ...this.project.settings, ...settings };
    this.recordOperation('modify', 'Updated project settings');
  }

  /**
   * Get project analytics
   */
  getProjectAnalytics(): {
    sequenceCount: number;
    shotCount: number;
    totalDuration: number;
    averageShotsPerSequence: number;
  } {
    const shotCount = this.project.sequences.reduce((sum, seq) => sum + seq.shots.length, 0);
    const totalDuration = this.project.sequences.reduce((sum, seq) => sum + seq.duration, 0);

    return {
      sequenceCount: this.project.sequences.length,
      shotCount,
      totalDuration,
      averageShotsPerSequence: this.project.sequences.length > 0
        ? shotCount / this.project.sequences.length
        : 0,
    };
  }

  /**
   * Record an operation for history
   */
  private recordOperation(
    type: PlanningOperation['type'],
    description: string,
    sequenceId?: string,
    shotId?: string
  ): void {
    const operation: PlanningOperation = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      description,
      sequenceId,
      shotId,
    };

    this.history.push(operation);

    // Maintain maximum history size
    if (this.history.length > this.MAX_HISTORY_SIZE) {
      this.history.shift();
    }
  }

  /**
   * Validate planning state
   */
  private isValidPlanningState(state: unknown): state is PlanningState {
    return (
      state !== null &&
      typeof state === 'object' &&
      (state as any).project &&
      Array.isArray((state as any).project.sequences) &&
      typeof (state as any).version === 'string' &&
      typeof (state as any).lastModified === 'string'
    );
  }

  /**
   * Calculate duration for a sequence
   */
  private calculateSequenceDuration(sequence: SequencePlan): void {
    sequence.duration = sequence.shots.reduce((sum, shot) => sum + shot.duration, 0);
  }

  /**
   * Get sequence by ID
   */
  getSequence(sequenceId: string): SequencePlan | undefined {
    return this.project.sequences.find(s => s.id === sequenceId);
  }

  /**
   * Get shot by ID from a sequence
   */
  getShot(sequenceId: string, shotId: string): ShotPlan | undefined {
    const sequence = this.project.sequences.find(s => s.id === sequenceId);
    return sequence?.shots.find(s => s.id === shotId);
  }

  /**
   * Update a sequence
   */
  updateSequence(sequenceId: string, updates: Partial<SequencePlan>): void {
    const sequence = this.project.sequences.find(s => s.id === sequenceId);
    if (sequence) {
      Object.assign(sequence, updates);
      this.recordOperation('modify', `Updated sequence: ${sequence.name}`, sequenceId);
    }
  }

  /**
   * Update a shot
   */
  updateShot(sequenceId: string, shotId: string, updates: Partial<ShotPlan>): void {
    const shot = this.getShot(sequenceId, shotId);
    if (shot) {
      Object.assign(shot, updates);
      this.recordOperation('modify', `Updated shot in sequence: ${sequenceId}`, sequenceId, shotId);

      // Recalculate duration if auto-calculate is enabled
      const sequence = this.project.sequences.find(s => s.id === sequenceId);
      if (sequence && this.project.settings.autoCalculateDuration) {
        this.calculateSequenceDuration(sequence);
      }
    }
  }
}
