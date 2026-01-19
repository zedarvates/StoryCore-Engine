/**
 * Undo/Redo Store - Zustand store for operation history management
 * 
 * This store manages:
 * - Undo stack (history of operations)
 * - Redo stack (undone operations that can be reapplied)
 * - Operation recording and playback
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { create } from 'zustand';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Operation types that can be undone/redone
 */
export type OperationType =
  | 'transform'
  | 'crop'
  | 'layer_add'
  | 'layer_remove'
  | 'layer_reorder'
  | 'layer_modify'
  | 'annotation_add'
  | 'annotation_remove'
  | 'panel_paste'
  | 'panel_duplicate'
  | 'batch_generation';

/**
 * Operation record with before/after state
 */
export interface Operation {
  type: OperationType;
  timestamp: number;
  description: string;
  data: {
    panelId: string;
    // Using 'any' for before/after state to support flexible operation data
    // that varies by operation type (transform, crop, layer operations, etc.)
    before: any;
    after: any;
  };
}

// ============================================================================
// Store Interface
// ============================================================================

export interface UndoRedoStore {
  // ============================================================================
  // State
  // ============================================================================
  
  undoStack: Operation[];
  redoStack: Operation[];
  maxStackSize: number;

  // ============================================================================
  // Actions
  // ============================================================================
  
  /**
   * Push a new operation onto the undo stack
   * Requirements: 9.1
   */
  pushOperation: (operation: Operation) => void;

  /**
   * Undo the most recent operation
   * Requirements: 9.2
   */
  undo: () => Operation | null;

  /**
   * Redo the most recently undone operation
   * Requirements: 9.3
   */
  redo: () => Operation | null;

  /**
   * Check if undo is available
   * Requirements: 9.5
   */
  canUndo: () => boolean;

  /**
   * Check if redo is available
   * Requirements: 9.6
   */
  canRedo: () => boolean;

  /**
   * Clear all history
   * Requirements: 9.8
   */
  clearHistory: () => void;

  /**
   * Get undo stack for display
   */
  getUndoStack: () => Operation[];

  /**
   * Get redo stack for display
   */
  getRedoStack: () => Operation[];

  /**
   * Set maximum stack size
   */
  setMaxStackSize: (size: number) => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

/**
 * Create Undo/Redo Store with Zustand
 */
export const useUndoRedoStore = create<UndoRedoStore>((set, get) => ({
  // ============================================================================
  // Initial State
  // ============================================================================
  
  undoStack: [],
  redoStack: [],
  maxStackSize: 100, // Default maximum of 100 operations

  // ============================================================================
  // Actions
  // ============================================================================
  
  pushOperation: (operation: Operation) => {
    set((state) => {
      const newUndoStack = [...state.undoStack, operation];

      // Enforce max stack size by removing oldest operations
      if (newUndoStack.length > state.maxStackSize) {
        newUndoStack.shift();
      }

      return {
        undoStack: newUndoStack,
        // Clear redo stack when new operation is performed (Requirement 9.4)
        redoStack: [],
      };
    });
  },

  undo: () => {
    const { undoStack, redoStack } = get();

    if (undoStack.length === 0) {
      return null;
    }

    // Pop the most recent operation from undo stack
    const operation = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    // Push to redo stack
    const newRedoStack = [...redoStack, operation];

    set({
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    });

    return operation;
  },

  redo: () => {
    const { undoStack, redoStack } = get();

    if (redoStack.length === 0) {
      return null;
    }

    // Pop the most recent operation from redo stack
    const operation = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    // Push back to undo stack
    const newUndoStack = [...undoStack, operation];

    // Enforce max stack size
    if (newUndoStack.length > get().maxStackSize) {
      newUndoStack.shift();
    }

    set({
      undoStack: newUndoStack,
      redoStack: newRedoStack,
    });

    return operation;
  },

  canUndo: () => {
    return get().undoStack.length > 0;
  },

  canRedo: () => {
    return get().redoStack.length > 0;
  },

  clearHistory: () => {
    set({
      undoStack: [],
      redoStack: [],
    });
  },

  getUndoStack: () => {
    return get().undoStack;
  },

  getRedoStack: () => {
    return get().redoStack;
  },

  setMaxStackSize: (size: number) => {
    set((state) => {
      const newUndoStack = [...state.undoStack];

      // Trim undo stack if it exceeds new max size
      while (newUndoStack.length > size) {
        newUndoStack.shift();
      }

      return {
        maxStackSize: size,
        undoStack: newUndoStack,
      };
    });
  },
}));

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an operation record
 */
export const createOperation = (
  type: OperationType,
  description: string,
  panelId: string,
  // Using 'any' for before/after parameters to support any operation state type
  before: any,
  after: any
): Operation => ({
  type,
  timestamp: Date.now(),
  description,
  data: {
    panelId,
    before,
    after,
  },
});

/**
 * Format operation for display
 */
export const formatOperation = (operation: Operation): string => {
  const date = new Date(operation.timestamp);
  const timeStr = date.toLocaleTimeString();
  return `${timeStr} - ${operation.description}`;
};
