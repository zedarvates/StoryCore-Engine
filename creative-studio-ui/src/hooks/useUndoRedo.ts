/**
 * useUndoRedo Hook - React hook for undo/redo functionality
 * 
 * This hook provides:
 * - State management with undo/redo support
 * - Execute, undo, redo actions
 * - canUndo, canRedo status
 * - Action descriptions for UI display
 * 
 * Requirements: 7.6
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { UndoRedoManager } from '../services/undoRedo';
import { useProjectStore } from '../stores/useProjectStore';
import { useShallow } from 'zustand/react/shallow';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Return type for useUndoRedo hook
 */
export interface UseUndoRedoReturn<T> {
  /** Current state */
  state: T;
  
  /** Execute a new action with description */
  execute: (description: string, newState: T, inverseAction?: () => void) => void;
  
  /** Undo the last action */
  undo: () => void;
  
  /** Redo the last undone action */
  redo: () => void;
  
  /** Whether undo is available */
  canUndo: boolean;
  
  /** Whether redo is available */
  canRedo: boolean;
  
  /** Description of the next undo action */
  undoDescription: string | null;
  
  /** Description of the next redo action */
  redoDescription: string | null;
  
  /** Mark current state as saved */
  markAsSaved: () => void;
  
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  
  /** Clear all history */
  clearHistory: () => void;
  
  /** Get undo stack size */
  undoStackSize: number;
  
  /** Get redo stack size */
  redoStackSize: number;
}

/**
 * Configuration options for useUndoRedo hook
 */
export interface UseUndoRedoOptions {
  /** Maximum size of undo/redo stacks (default: 50) */
  maxStackSize?: number;
  
  /** Enable persistence to localStorage (default: false) */
  enablePersistence?: boolean;
  
  /** Storage key for persistence (default: 'undoRedoHistory') */
  storageKey?: string;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * React hook for undo/redo state management
 * 
 * Requirements: 7.6
 * 
 * @template T - The type of state being managed
 * @param initialState - The initial state
 * @param options - Configuration options
 * @returns Undo/redo state and actions
 * 
 * @example
 * const { state, execute, undo, redo, canUndo, canRedo } = useUndoRedo({
 *   shots: [],
 *   selectedId: null
 * });
 * 
 * // Execute an action
 * execute('Add shot', { ...state, shots: [...state.shots, newShot] });
 * 
 * // Undo/Redo
 * if (canUndo) undo();
 * if (canRedo) redo();
 */
export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn<T> {
  // Create manager instance (persists across renders)
  const managerRef = useRef<UndoRedoManager<T>>(
    new UndoRedoManager(initialState, {
      maxStackSize: options.maxStackSize || 50,
      enablePersistence: options.enablePersistence || false,
      storageKey: options.storageKey || 'undoRedoHistory'
    })
  );

  // State for current value
  const [state, setState] = useState<T>(initialState);
  
  // State for UI indicators
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoDescription, setUndoDescription] = useState<string | null>(null);
  const [redoDescription, setRedoDescription] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [undoStackSize, setUndoStackSize] = useState(0);
  const [redoStackSize, setRedoStackSize] = useState(0);

  // Update UI indicators
  const updateIndicators = useCallback(() => {
    const manager = managerRef.current;
    setCanUndo(manager.canUndo());
    setCanRedo(manager.canRedo());
    setUndoDescription(manager.getUndoDescription());
    setRedoDescription(manager.getRedoDescription());
    setHasUnsavedChanges(manager.hasUnsavedChanges());
    setUndoStackSize(manager.getUndoStackSize());
    setRedoStackSize(manager.getRedoStackSize());
  }, []);

  // Execute a new action
  const execute = useCallback((
    description: string,
    newState: T,
    inverseAction?: () => void
  ) => {
    managerRef.current.execute(description, newState, inverseAction);
    setState(newState);
    updateIndicators();
  }, [updateIndicators]);

  // Undo the last action
  const undo = useCallback(() => {
    const restoredState = managerRef.current.undo();
    if (restoredState !== null) {
      setState(restoredState);
      updateIndicators();
    }
  }, [updateIndicators]);

  // Redo the last undone action
  const redo = useCallback(() => {
    const restoredState = managerRef.current.redo();
    if (restoredState !== null) {
      setState(restoredState);
      updateIndicators();
    }
  }, [updateIndicators]);

  // Mark current state as saved
  const markAsSaved = useCallback(() => {
    managerRef.current.markAsSaved();
    updateIndicators();
  }, [updateIndicators]);

  // Clear all history
  const clearHistory = useCallback(() => {
    managerRef.current.clearHistory();
    updateIndicators();
  }, [updateIndicators]);

  // Initialize indicators on mount
  useEffect(() => {
    updateIndicators();
  }, [updateIndicators]);

  return {
    state,
    execute,
    undo,
    redo,
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
    markAsSaved,
    hasUnsavedChanges,
    clearHistory,
    undoStackSize,
    redoStackSize
  };
}

/**
 * Hook for global project undo/redo operations using the Unified Project Store
 * 
 * Fulfills Audit Task 21 (Consolidating State Architecture)
 * 
 * @returns Undo/redo actions and indicators for the entire project
 * 
 * @example
 * const { undo, redo, canUndo, canRedo } = useProjectHistory();
 */
export function useProjectHistory() {
  const { 
    undoAction, 
    redoAction, 
    goToHistoryIndex,
    history, 
    historyIndex, 
    lastSavedIndex,
    clearHistoryAction,
    markAsSavedAction
  } = useProjectStore(useShallow(state => ({
    undoAction: state.undo,
    redoAction: state.redo,
    goToHistoryIndex: state.goToHistoryIndex,
    history: state.history,
    historyIndex: state.historyIndex,
    lastSavedIndex: state.lastSavedIndex,
    clearHistoryAction: state.clearHistory,
    markAsSavedAction: state.markAsSaved
  })));

  /**
   * Check if undo is available
   */
  const canUndo = useMemo(() => historyIndex >= 0, [historyIndex]);
  
  /**
   * Check if redo is available
   */
  const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history.length]);
  
  /**
   * Get description of next undo action
   */
  const undoDescription = useMemo(() => {
    if (canUndo) {
        return history[historyIndex]?.action || 'Undo Last Action';
    }
    return null;
  }, [canUndo, history, historyIndex]);
  
  /**
   * Get description of next redo action
   */
  const redoDescription = useMemo(() => {
    if (canRedo) {
        return history[historyIndex + 1]?.action || 'Redo Action';
    }
    return null;
  }, [canRedo, history, historyIndex]);
  
  /**
   * Check if there are unsaved changes
   */
  const hasUnsavedChanges = useMemo(() => historyIndex !== lastSavedIndex, [historyIndex, lastSavedIndex]);

  return {
    undo: useCallback(() => undoAction(), [undoAction]),
    redo: useCallback(() => redoAction(), [redoAction]),
    goToHistoryIndex: useCallback((index: number) => goToHistoryIndex(index), [goToHistoryIndex]),
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
    history,
    historyIndex,
    undoStackSize: historyIndex + 1,
    redoStackSize: history.length - (historyIndex + 1),
    clearHistory: useCallback(() => clearHistoryAction(), [clearHistoryAction]),
    markAsSaved: useCallback(() => markAsSavedAction(), [markAsSavedAction]),
    hasUnsavedChanges,
  };
}
