// ============================================================================
// Transitions Manager Implementation
// ============================================================================

import type {
  Transition,
  TransitionPreset,
  TransitionSettings,
  TransitionLibrary,
  TransitionOperation,
  TransitionState,
} from './types';

export class TransitionsManager {
  private library: TransitionLibrary;
  private history: TransitionOperation[] = [];
  private readonly MAX_HISTORY_SIZE = 30;

  constructor() {
    this.library = {
      builtin: [],
      custom: [],
      version: '1.0',
    };
  }

  /**
   * Get all available transitions
   */
  getAvailableTransitions(): TransitionPreset[] {
    return [...this.library.builtin, ...this.library.custom];
  }

  /**
   * Get a specific transition by ID
   */
  getTransition(transitionId: string): TransitionPreset | undefined {
    const allTransitions = this.getAvailableTransitions();
    return allTransitions.find(t => t.id === transitionId);
  }

  /**
   * Apply a transition
   */
  applyTransition(transitionId: string, settings: TransitionSettings): void {
    const transition = this.getTransition(transitionId);
    if (transition) {
      // In a real implementation, this would apply the transition to the timeline
      this.recordOperation('apply', `Applied transition: ${transition.name}`, transitionId);
    }
  }

  /**
   * Preview a transition
   */
  async previewTransition(transitionId: string, settings: TransitionSettings): Promise<Blob> {
    const transition = this.getTransition(transitionId);
    if (transition) {
      // In a real implementation, this would generate a preview
      this.recordOperation('preview', `Previewed transition: ${transition.name}`, transitionId);
    }

    // Return a placeholder preview
    return new Blob([JSON.stringify({ transitionId, settings }, null, 2)], { type: 'application/json' });
  }

  /**
   * Get the transition library
   */
  getLibrary(): TransitionLibrary {
    return { ...this.library };
  }

  /**
   * Add a custom transition
   */
  addCustomTransition(transition: TransitionPreset): void {
    this.library.custom.push(transition);
    this.recordOperation('add', `Added custom transition: ${transition.name}`, transition.id);
  }

  /**
   * Remove a custom transition
   */
  removeCustomTransition(transitionId: string): void {
    const index = this.library.custom.findIndex(t => t.id === transitionId);
    if (index !== -1) {
      const transition = this.library.custom[index];
      this.library.custom.splice(index, 1);
      this.recordOperation('remove', `Removed custom transition: ${transition.name}`, transitionId);
    }
  }

  /**
   * Get custom transitions
   */
  getCustomTransitions(): TransitionPreset[] {
    return [...this.library.custom];
  }

  /**
   * Serialize manager state
   */
  serialize(): string {
    const state: TransitionState = {
      library: this.library,
      history: this.history,
      version: '1.0',
      lastModified: new Date().toISOString(),
    };

    return JSON.stringify(state, null, 2);
  }

  /**
   * Deserialize manager state
   */
  deserialize(data: string): void {
    try {
      const state = JSON.parse(data);
      if (this.isValidTransitionState(state)) {
        this.library = state.library;
        this.history = state.history || [];
      } else {
        console.warn('Invalid transition state format');
      }
    } catch (error) {
      console.error('Failed to deserialize transition state:', error);
    }
  }

  /**
   * Get operation history
   */
  getHistory(): TransitionOperation[] {
    return [...this.history];
  }

  /**
   * Clear operation history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Initialize with built-in transitions
   */
  initializeBuiltinTransitions(): void {
    this.library.builtin = [
      {
        id: 'fade',
        name: 'Fade',
        category: 'basic',
        description: 'Simple fade transition',
        defaultSettings: { duration: 0.5, direction: 'in' },
      },
      {
        id: 'slide-left',
        name: 'Slide Left',
        category: 'basic',
        description: 'Slide transition from left',
        defaultSettings: { duration: 0.5, direction: 'left' },
      },
      {
        id: 'slide-right',
        name: 'Slide Right',
        category: 'basic',
        description: 'Slide transition from right',
        defaultSettings: { duration: 0.5, direction: 'right' },
      },
      {
        id: 'dissolve',
        name: 'Dissolve',
        category: 'professional',
        description: 'Dissolve transition effect',
        defaultSettings: { duration: 0.8, intensity: 0.5 },
      },
      {
        id: 'wipe',
        name: 'Wipe',
        category: 'professional',
        description: 'Wipe transition effect',
        defaultSettings: { duration: 0.6, direction: 'left' },
      },
    ];
  }

  /**
   * Get transitions by category
   */
  getTransitionsByCategory(category: string): TransitionPreset[] {
    return this.getAvailableTransitions().filter(t => t.category === category);
  }

  /**
   * Search transitions by name
   */
  searchTransitions(query: string): TransitionPreset[] {
    const lowerQuery = query.toLowerCase();
    return this.getAvailableTransitions().filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Record an operation for history
   */
  private recordOperation(
    type: TransitionOperation['type'],
    description: string,
    transitionId?: string
  ): void {
    const operation: TransitionOperation = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      description,
      transitionId,
    };

    this.history.push(operation);

    // Maintain maximum history size
    if (this.history.length > this.MAX_HISTORY_SIZE) {
      this.history.shift();
    }
  }

  /**
   * Validate transition state
   */
  private isValidTransitionState(state: unknown): state is TransitionState {
    return (
      state !== null &&
      typeof state === 'object' &&
      (state as any).library &&
      Array.isArray((state as any).library.builtin) &&
      Array.isArray((state as any).library.custom) &&
      typeof (state as any).version === 'string' &&
      typeof (state as any).lastModified === 'string'
    );
  }

  /**
   * Get analytics for the transition library
   */
  getLibraryAnalytics(): {
    totalTransitions: number;
    builtinCount: number;
    customCount: number;
    categories: Record<string, number>;
  } {
    const categories: Record<string, number> = {};

    this.getAvailableTransitions().forEach(transition => {
      categories[transition.category] = (categories[transition.category] || 0) + 1;
    });

    return {
      totalTransitions: this.getAvailableTransitions().length,
      builtinCount: this.library.builtin.length,
      customCount: this.library.custom.length,
      categories,
    };
  }

  /**
   * Get recently used transitions
   */
  getRecentlyUsed(): TransitionPreset[] {
    // Get apply operations
    const applyOperations = this.history.filter(op => op.type === 'apply');

    // Get transition IDs in order of use
    const usedTransitionIds = applyOperations.map(op => op.transitionId).filter((id): id is string => !!id);

    // Get unique transitions in order of use
    const uniqueUsedIds = [...new Set(usedTransitionIds)];

    // Get the actual transitions
    return uniqueUsedIds
      .map(id => this.getTransition(id))
      .filter((transition): transition is TransitionPreset => !!transition);
  }
}
