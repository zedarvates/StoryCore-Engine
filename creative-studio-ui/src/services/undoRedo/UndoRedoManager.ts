/**
 * UndoRedoManager - Advanced Undo/Redo System
 * 
 * This class implements a comprehensive undo/redo system with:
 * - Undo/Redo stacks with configurable capacity
 * - FIFO eviction when capacity is reached
 * - Save point marking for tracking unsaved changes
 * - State cloning for immutability
 * - Action descriptions for UI display
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.7
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * History entry containing state snapshot and metadata
 */
export interface HistoryEntry<T = any> {
  id: string;
  timestamp: number;
  description: string;
  state: T;
  inverseAction?: () => void;
}

/**
 * Configuration options for UndoRedoManager
 */
export interface UndoRedoConfig {
  maxStackSize?: number;
  enablePersistence?: boolean;
  storageKey?: string;
}

// ============================================================================
// UndoRedoManager Class
// ============================================================================

/**
 * Generic Undo/Redo Manager
 * 
 * @template T - The type of state being managed
 * 
 * @example
 * const manager = new UndoRedoManager(initialState, { maxStackSize: 50 });
 * manager.execute('Move shot', newState);
 * manager.undo();
 * manager.redo();
 */
export class UndoRedoManager<T = any> {
  private undoStack: HistoryEntry<T>[] = [];
  private redoStack: HistoryEntry<T>[] = [];
  private currentState: T;
  private maxStackSize: number;
  private savedStateId: string | null = null;
  private enablePersistence: boolean;
  private storageKey: string;

  /**
   * Create a new UndoRedoManager
   * 
   * @param initialState - The initial state to manage
   * @param config - Configuration options
   */
  constructor(initialState: T, config: UndoRedoConfig = {}) {
    this.currentState = this.cloneState(initialState);
    this.maxStackSize = config.maxStackSize || 50;
    this.enablePersistence = config.enablePersistence || false;
    this.storageKey = config.storageKey || 'undoRedoHistory';

    // Load persisted history if enabled
    if (this.enablePersistence) {
      this.loadHistory();
    }
  }

  // ============================================================================
  // Core Operations
  // ============================================================================

  /**
   * Execute a new action and save the previous state
   * 
   * Requirements: 7.1
   * 
   * @param description - Human-readable description of the action
   * @param newState - The new state after the action
   * @param inverseAction - Optional function to reverse the action
   */
  execute(description: string, newState: T, inverseAction?: () => void): void {
    // Create history entry with current state (before the change)
    const entry: HistoryEntry<T> = {
      id: this.generateId(),
      timestamp: Date.now(),
      description,
      state: this.cloneState(this.currentState),
      inverseAction
    };

    // Add to undo stack
    this.undoStack.push(entry);

    // Enforce max stack size with FIFO eviction (Requirement 7.4)
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    // Clear redo stack when new action is executed (Requirement 7.5)
    this.redoStack = [];

    // Update current state
    this.currentState = this.cloneState(newState);

    // Persist if enabled
    if (this.enablePersistence) {
      this.saveHistory();
    }
  }

  /**
   * Undo the last action
   * 
   * Requirements: 7.2
   * 
   * @returns The restored state, or null if nothing to undo
   */
  undo(): T | null {
    if (this.undoStack.length === 0) {
      return null;
    }

    // Save current state to redo stack
    const redoEntry: HistoryEntry<T> = {
      id: this.generateId(),
      timestamp: Date.now(),
      description: `Redo: ${this.undoStack[this.undoStack.length - 1].description}`,
      state: this.cloneState(this.currentState)
    };
    this.redoStack.push(redoEntry);

    // Pop from undo stack
    const entry = this.undoStack.pop()!;

    // Execute inverse action if provided
    if (entry.inverseAction) {
      entry.inverseAction();
    }

    // Restore state
    this.currentState = this.cloneState(entry.state);

    // Persist if enabled
    if (this.enablePersistence) {
      this.saveHistory();
    }

    return this.currentState;
  }

  /**
   * Redo the last undone action
   * 
   * Requirements: 7.3
   * 
   * @returns The restored state, or null if nothing to redo
   */
  redo(): T | null {
    if (this.redoStack.length === 0) {
      return null;
    }

    // Save current state to undo stack
    const undoEntry: HistoryEntry<T> = {
      id: this.generateId(),
      timestamp: Date.now(),
      description: `Undo: ${this.redoStack[this.redoStack.length - 1].description}`,
      state: this.cloneState(this.currentState)
    };
    this.undoStack.push(undoEntry);

    // Enforce max stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift();
    }

    // Pop from redo stack
    const entry = this.redoStack.pop()!;

    // Restore state
    this.currentState = this.cloneState(entry.state);

    // Persist if enabled
    if (this.enablePersistence) {
      this.saveHistory();
    }

    return this.currentState;
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Check if undo is available
   * 
   * @returns True if there are actions to undo
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   * 
   * @returns True if there are actions to redo
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get the description of the next undo action
   * 
   * @returns Description string or null if nothing to undo
   */
  getUndoDescription(): string | null {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1].description;
  }

  /**
   * Get the description of the next redo action
   * 
   * @returns Description string or null if nothing to redo
   */
  getRedoDescription(): string | null {
    if (this.redoStack.length === 0) return null;
    return this.redoStack[this.redoStack.length - 1].description;
  }

  /**
   * Get the current state
   * 
   * @returns A clone of the current state
   */
  getCurrentState(): T {
    return this.cloneState(this.currentState);
  }

  /**
   * Get the size of the undo stack
   * 
   * @returns Number of undo operations available
   */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * Get the size of the redo stack
   * 
   * @returns Number of redo operations available
   */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  // ============================================================================
  // Save Point Management
  // ============================================================================

  /**
   * Mark the current state as saved
   * 
   * Requirements: 7.7
   * 
   * This allows tracking whether there are unsaved changes
   */
  markAsSaved(): void {
    this.savedStateId = this.undoStack.length > 0
      ? this.undoStack[this.undoStack.length - 1].id
      : null;

    if (this.enablePersistence) {
      this.saveHistory();
    }
  }

  /**
   * Check if there are unsaved changes
   * 
   * Requirements: 7.7
   * 
   * @returns True if the current state differs from the last saved state
   */
  hasUnsavedChanges(): boolean {
    if (this.undoStack.length === 0) {
      return this.savedStateId !== null;
    }
    return this.undoStack[this.undoStack.length - 1].id !== this.savedStateId;
  }

  // ============================================================================
  // History Management
  // ============================================================================

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.savedStateId = null;

    if (this.enablePersistence) {
      this.saveHistory();
    }
  }

  /**
   * Get the complete undo stack (for debugging/display)
   * 
   * @returns Array of history entries
   */
  getUndoStack(): HistoryEntry<T>[] {
    return [...this.undoStack];
  }

  /**
   * Get the complete redo stack (for debugging/display)
   * 
   * @returns Array of history entries
   */
  getRedoStack(): HistoryEntry<T>[] {
    return [...this.redoStack];
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Clone state to ensure immutability
   * 
   * @param state - State to clone
   * @returns Deep clone of the state
   */
  private cloneState(state: T): T {
    return JSON.parse(JSON.stringify(state));
  }

  /**
   * Generate a unique ID for history entries
   * 
   * @returns Unique identifier string
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save history to localStorage
   * 
   * Requirements: 7.8 (persistence support)
   */
  private saveHistory(): void {
    try {
      const historyData = {
        undoStack: this.undoStack.map(entry => ({
          ...entry,
          inverseAction: undefined // Don't persist functions
        })),
        redoStack: this.redoStack.map(entry => ({
          ...entry,
          inverseAction: undefined
        })),
        savedStateId: this.savedStateId
      };

      localStorage.setItem(this.storageKey, JSON.stringify(historyData));
    } catch (error) {
      console.error('Failed to save undo/redo history:', error);
    }
  }

  /**
   * Load history from localStorage
   * 
   * Requirements: 7.8 (persistence support)
   */
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const historyData = JSON.parse(stored);
        this.undoStack = historyData.undoStack || [];
        this.redoStack = historyData.redoStack || [];
        this.savedStateId = historyData.savedStateId || null;
      }
    } catch (error) {
      console.error('Failed to load undo/redo history:', error);
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a new UndoRedoManager instance
 * 
 * @param initialState - The initial state
 * @param config - Configuration options
 * @returns New UndoRedoManager instance
 */
export function createUndoRedoManager<T>(
  initialState: T,
  config?: UndoRedoConfig
): UndoRedoManager<T> {
  return new UndoRedoManager(initialState, config);
}
