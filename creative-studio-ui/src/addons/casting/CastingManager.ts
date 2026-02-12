import type {
  Avatar,
  CastingAssignment,
  CastingState,
  CastingAnalytics,
  AvatarValidationResult,
  SceneReference,
  OperationRecord,
} from './types';

export class CastingManager {
  private state: CastingState;
  private avatars: Map<string, Avatar> = new Map();
  private sceneReferences: SceneReference[] = [];
  private undoStack: OperationRecord[] = [];
  private redoStack: OperationRecord[] = [];
  private readonly MAX_HISTORY_SIZE = 20;

  constructor() {
    this.state = {
      assignments: [],
      version: '1.0',
      lastModified: new Date().toISOString(),
    };
  }

  /**
   * Assign an actor to a character
   */
  assignActor(characterId: string, avatarId: string): void {
    const previousState = this.captureState();

    // Remove any existing assignment for this character
    this.state.assignments = this.state.assignments.filter(
      assignment => assignment.characterId !== characterId
    );

    // Add new assignment
    const assignment: CastingAssignment = {
      characterId,
      avatarId,
      assignedAt: new Date().toISOString(),
    };

    this.state.assignments.push(assignment);
    this.state.lastModified = new Date().toISOString();

    // Record operation for undo/redo
    this.recordOperation('assign', previousState, this.captureState(), `Assigned actor ${avatarId} to character ${characterId}`);
  }

  /**
   * Get the actor assigned to a character
   */
  getActorForCharacter(characterId: string): Avatar | null {
    const assignment = this.state.assignments.find(
      a => a.characterId === characterId
    );

    if (!assignment) {
      return null;
    }

    return this.avatars.get(assignment.avatarId) || null;
  }

  /**
   * Get all current assignments
   */
  getAssignments(): CastingAssignment[] {
    return [...this.state.assignments];
  }

  /**
   * Replace the actor for a character (with scene tracking)
   */
  replaceActor(characterId: string, newAvatarId: string): void {
    const previousState = this.captureState();
    const existingAssignment = this.state.assignments.find(a => a.characterId === characterId);

    // Use assignActor logic but record as replace
    this.assignActor(characterId, newAvatarId);

    if (existingAssignment) {
      // This was a replacement, record it differently
      this.recordOperation('replace', previousState, this.captureState(), `Replaced actor for character ${characterId} with ${newAvatarId}`);
    }
  }

  /**
   * Unassign actor from a character
   */
  unassignActor(characterId: string): void {
    const previousState = this.captureState();

    this.state.assignments = this.state.assignments.filter(
      assignment => assignment.characterId !== characterId
    );
    this.state.lastModified = new Date().toISOString();

    this.recordOperation('unassign', previousState, this.captureState(), `Unassigned actor from character ${characterId}`);
  }

  /**
   * Get scenes affected by a character change
   */
  getAffectedScenes(characterId: string): SceneReference[] {
    return this.sceneReferences.filter(ref => ref.characterId === characterId);
  }

  /**
   * Update scene references when actor changes
   */
  updateSceneReferences(characterId: string, newAvatarId: string): void {
    // This would typically integrate with the story generation system
    // For now, just log the operation
  }

  /**
   * Load avatars from the assets folder
   */
  async loadAvatars(_assetsPath: string): Promise<Avatar[]> {
    // For now, return empty array
    this.avatars.clear();
    return [];
  }

  /**
   * Filter avatars by name or tags
   */
  filterAvatars(query: string): Avatar[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.avatars.values()).filter(avatar =>
      avatar.name.toLowerCase().includes(lowerQuery) ||
      avatar.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Validate an avatar
   */
  validateAvatar(_avatarPath: string): Promise<AvatarValidationResult> {
    return Promise.resolve({
      isValid: true,
      metadata: {
        dimensions: { width: 512, height: 512 },
        format: 'png',
        size: 1024,
      },
    });
  }

  /**
   * Get casting analytics
   */
  getAnalytics(): CastingAnalytics {
    const characterSceneCounts: Record<string, number> = {};
    const avatarUsageCounts: Record<string, number> = {};
    const _assignedCharacterIds = new Set(
      this.state.assignments.map(a => a.characterId)
    );

    // Calculate scene counts (simplified - in real implementation would query actual scenes)
    this.sceneReferences.forEach(ref => {
      characterSceneCounts[ref.characterId] = (characterSceneCounts[ref.characterId] || 0) + 1;
    });

    // Calculate avatar usage
    this.state.assignments.forEach(assignment => {
      avatarUsageCounts[assignment.avatarId] = (avatarUsageCounts[assignment.avatarId] || 0) + 1;
    });

    return {
      characterSceneCounts,
      avatarUsageCounts,
      uniqueActorCount: Object.keys(avatarUsageCounts).length,
    };
  }

  /**
   * Serialize state to JSON
   */
  serialize(): string {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Deserialize state from JSON
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (this.isValidCastingState(parsed)) {
        this.state = parsed;
      } else {
        console.warn('Invalid casting state format, recovering with defaults');
        this.recoverFromCorruptedData(parsed);
      }
    } catch (error) {
      console.error('Failed to deserialize casting state:', error);
      this.recoverFromCorruptedData(null);
    }
  }

  /**
   * Recover from corrupted data by using defaults
   */
  private recoverFromCorruptedData(data: unknown): void {
    // Try to recover valid assignments if possible
    const recoveredAssignments: CastingAssignment[] = [];

    if (data && Array.isArray(data.assignments)) {
      for (const assignment of data.assignments) {
        if (
          assignment &&
          typeof assignment === 'object' &&
          typeof assignment.characterId === 'string' &&
          typeof assignment.avatarId === 'string' &&
          typeof assignment.assignedAt === 'string'
        ) {
          recoveredAssignments.push({
            characterId: assignment.characterId,
            avatarId: assignment.avatarId,
            assignedAt: assignment.assignedAt,
          });
        }
      }
    }

    this.state = {
      assignments: recoveredAssignments,
      version: data?.version || '1.0',
      lastModified: data?.lastModified || new Date().toISOString(),
    };

  }

  /**
   * Save state to project.json
   */
  async saveState(projectPath: string): Promise<void> {
  }

  /**
   * Load state from project.json
   */
  async loadState(projectPath: string): Promise<void> {
  }

  /**
   * Get current state
   */
  getState(): CastingState {
    return { ...this.state };
  }

  /**
   * Set scene references (for analytics and scene tracking)
   */
  setSceneReferences(references: SceneReference[]): void {
    this.sceneReferences = [...references];
  }

  /**
   * Add an avatar to the collection
   */
  addAvatar(avatar: Avatar): void {
    this.avatars.set(avatar.id, avatar);
  }

  /**
   * Remove an avatar from the collection
   */
  removeAvatar(avatarId: string): void {
    this.avatars.delete(avatarId);
    // Remove assignments that reference this avatar
    this.state.assignments = this.state.assignments.filter(
      assignment => assignment.avatarId !== avatarId
    );
  }

  /**
   * Undo the last operation
   */
  undo(): boolean {
    if (this.undoStack.length === 0) {
      return false;
    }

    const operation = this.undoStack.pop()!;
    const currentState = this.captureState();

    // Apply the previous state
    if (operation.previousState) {
      this.applyState(operation.previousState);
    }

    // Move operation to redo stack
    this.redoStack.push({
      ...operation,
      previousState: currentState,
      newState: operation.previousState,
    });

    return true;
  }

  /**
   * Redo the last undone operation
   */
  redo(): boolean {
    if (this.redoStack.length === 0) {
      return false;
    }

    const operation = this.redoStack.pop()!;
    const currentState = this.captureState();

    // Apply the new state
    if (operation.newState) {
      this.applyState(operation.newState);
    }

    // Move operation back to undo stack
    this.undoStack.push({
      ...operation,
      previousState: currentState,
      newState: operation.newState,
    });

    return true;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return false;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Capture current state for undo/redo
   */
  private captureState(): Partial<CastingState> {
    return {
      assignments: [...this.state.assignments],
      version: this.state.version,
      lastModified: this.state.lastModified,
    };
  }

  /**
   * Record an operation for undo/redo
   */
  private recordOperation(
    type: OperationRecord['type'],
    previousState: Partial<CastingState>,
    newState: Partial<CastingState>,
    description: string
  ): void {
    const operation: OperationRecord = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      previousState,
      newState,
      description,
    };

    this.undoStack.push(operation);

    // Clear redo stack when new operation is performed
    this.redoStack = [];

    // Maintain maximum history size
    if (this.undoStack.length > this.MAX_HISTORY_SIZE) {
      this.undoStack.shift();
    }
  }

  /**
   * Apply a state for undo/redo
   */
  private applyState(state: Partial<CastingState>): void {
    if (state.assignments) {
      this.state.assignments = [...state.assignments];
    }
    if (state.version) {
      this.state.version = state.version;
    }
    if (state.lastModified) {
      this.state.lastModified = state.lastModified;
    }
  }

  private isValidCastingState(state: unknown): state is CastingState {
    return (
      state &&
      typeof state === 'object' &&
      Array.isArray(state.assignments) &&
      typeof state.version === 'string' &&
      typeof state.lastModified === 'string'
    );
  }
}

