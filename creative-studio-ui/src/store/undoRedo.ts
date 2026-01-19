import { useStore } from './index';
import type { HistoryState, AppState } from '../types';

// ============================================================================
// History Management
// ============================================================================

const MAX_HISTORY_SIZE = 50;

/**
 * Create a snapshot of the current state for history
 */
export function createHistorySnapshot(state: AppState): HistoryState {
  return {
    shots: JSON.parse(JSON.stringify(state.shots)),
    project: state.project ? JSON.parse(JSON.stringify(state.project)) : null,
    assets: JSON.parse(JSON.stringify(state.assets)),
    selectedShotId: state.selectedShotId,
    taskQueue: JSON.parse(JSON.stringify(state.taskQueue)),
  };
}

/**
 * Restore state from a history snapshot
 */
export function restoreFromSnapshot(snapshot: HistoryState): Partial<AppState> {
  return {
    shots: JSON.parse(JSON.stringify(snapshot.shots)),
    project: snapshot.project ? JSON.parse(JSON.stringify(snapshot.project)) : null,
    assets: JSON.parse(JSON.stringify(snapshot.assets)),
    selectedShotId: snapshot.selectedShotId,
    taskQueue: JSON.parse(JSON.stringify(snapshot.taskQueue)),
  };
}

// ============================================================================
// Undo/Redo Implementation
// ============================================================================

/**
 * Push current state to history before making changes
 */
export function pushToHistory(): void {
  const state = useStore.getState();
  const snapshot = createHistorySnapshot(state);
  
  // Remove any future history if we're not at the end
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  
  // Add new snapshot
  newHistory.push(snapshot);
  
  // Keep only last MAX_HISTORY_SIZE states
  if (newHistory.length > MAX_HISTORY_SIZE) {
    newHistory.shift();
  }
  
  useStore.setState({
    history: newHistory,
    historyIndex: newHistory.length - 1,
  });
}

/**
 * Undo the last action
 */
export function undo(): void {
  const state = useStore.getState();
  
  if (state.historyIndex <= 0) {
    console.warn('Nothing to undo');
    return;
  }
  
  // If this is the first undo, save current state
  if (state.historyIndex === state.history.length - 1) {
    const currentSnapshot = createHistorySnapshot(state);
    useStore.setState({
      history: [...state.history, currentSnapshot],
    });
  }
  
  const newIndex = state.historyIndex - 1;
  const previousState = state.history[newIndex];
  
  useStore.setState({
    ...restoreFromSnapshot(previousState),
    historyIndex: newIndex,
  });
}

/**
 * Redo the last undone action
 */
export function redo(): void {
  const state = useStore.getState();
  
  if (state.historyIndex >= state.history.length - 1) {
    console.warn('Nothing to redo');
    return;
  }
  
  const newIndex = state.historyIndex + 1;
  const nextState = state.history[newIndex];
  
  useStore.setState({
    ...restoreFromSnapshot(nextState),
    historyIndex: newIndex,
  });
}

/**
 * Check if undo is available
 */
export function canUndo(): boolean {
  const state = useStore.getState();
  return state.historyIndex > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(): boolean {
  const state = useStore.getState();
  return state.historyIndex < state.history.length - 1;
}

// ============================================================================
// Action Wrapper for Automatic History Tracking
// ============================================================================

/**
 * Wrap an action to automatically save history before execution
 * 
 * @example
 * const addShotWithUndo = useStore.getState().addShot);
 * addShotWithUndo(newShot);
 */
// Using 'any[]' in generic constraint to allow wrapping actions with any parameter types
export function withUndo<T extends (...args: any[]) => void>(
  action: T
): T {
  // Using 'any[]' for args to match the generic constraint
  return ((...args: any[]) => {
    // Save current state to history
    pushToHistory();
    
    // Execute the action
    action(...args);
  }) as T;
}

/**
 * Batch multiple actions into a single undo/redo operation
 * 
 * @example
 * batchActions(() => {
 *   addShot(shot1);
 *   addShot(shot2);
 *   updateShot(shot3.id, updates);
 * });
 */
export function batchActions(actions: () => void): void {
  // Save state once before batch
  pushToHistory();
  
  // Execute all actions
  actions();
}

// ============================================================================
// Keyboard Shortcuts Setup
// ============================================================================

/**
 * Set up keyboard shortcuts for undo/redo
 * Call this in your main App component
 */
export function setupUndoRedoShortcuts(): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Check for Ctrl+Z (Windows/Linux) or Cmd+Z (Mac)
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    if (isCtrlOrCmd && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      undo();
    }
    
    // Check for Ctrl+Y (Windows/Linux) or Cmd+Shift+Z (Mac)
    if (
      (isCtrlOrCmd && event.key === 'y') ||
      (isCtrlOrCmd && event.shiftKey && event.key === 'z')
    ) {
      event.preventDefault();
      redo();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}

// ============================================================================
// Update Store with Undo/Redo Implementation
// ============================================================================

// Update the store's undo/redo methods
useStore.setState({
  undo,
  redo,
  pushHistory: pushToHistory,
  canUndo,
  canRedo,
});

// ============================================================================
// Wrapped Actions for Common Operations
// ============================================================================

/**
 * Pre-wrapped actions that automatically track history
 * Use these instead of the raw store actions for undo/redo support
 */
export const undoableActions = {
  addShot: withUndo(useStore.getState().addShot),
  updateShot: withUndo(useStore.getState().updateShot),
  deleteShot: withUndo(useStore.getState().deleteShot),
  reorderShots: withUndo(useStore.getState().reorderShots),
  
  addAsset: withUndo(useStore.getState().addAsset),
  updateAsset: withUndo(useStore.getState().updateAsset),
  deleteAsset: withUndo(useStore.getState().deleteAsset),
  
  addAudioTrack: withUndo(useStore.getState().addAudioTrack),
  updateAudioTrack: withUndo(useStore.getState().updateAudioTrack),
  deleteAudioTrack: withUndo(useStore.getState().deleteAudioTrack),
  
  addEffect: withUndo(useStore.getState().addEffect),
  updateEffect: withUndo(useStore.getState().updateEffect),
  deleteEffect: withUndo(useStore.getState().deleteEffect),
  reorderEffects: withUndo(useStore.getState().reorderEffects),
  
  addTextLayer: withUndo(useStore.getState().addTextLayer),
  updateTextLayer: withUndo(useStore.getState().updateTextLayer),
  deleteTextLayer: withUndo(useStore.getState().deleteTextLayer),
  
  addAnimation: withUndo(useStore.getState().addAnimation),
  updateAnimation: withUndo(useStore.getState().updateAnimation),
  deleteAnimation: withUndo(useStore.getState().deleteAnimation),
  
  setTransition: withUndo(useStore.getState().setTransition),
  
  addTask: withUndo(useStore.getState().addTask),
  removeTask: withUndo(useStore.getState().removeTask),
  moveTaskUp: withUndo(useStore.getState().moveTaskUp),
  moveTaskDown: withUndo(useStore.getState().moveTaskDown),
  reorderTasks: withUndo(useStore.getState().reorderTasks),
};

// ============================================================================
// React Hook for Undo/Redo State
// ============================================================================

/**
 * Hook to access undo/redo state and actions
 * 
 * @example
 * const { undo, redo, canUndo, canRedo } = useUndoRedo();
 */
export function useUndoRedo() {
  const historyIndex = useStore((state) => state.historyIndex);
  const historyLength = useStore((state) => state.history.length);
  
  return {
    undo,
    redo,
    canUndo: canUndo(),
    canRedo: canRedo(),
    historyIndex,
    historyLength,
  };
}
