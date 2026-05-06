/**
 * Undo/Redo Store
 * 
 * Requirements: 128
 * Level: 🟡 HAUTE
 * 
 * Global undo/redo functionality with action history
 */

import { create } from 'zustand';
import { produce, Patch } from 'immer';

export interface HistoryAction {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  patches: Patch[];
  inversePatches: Patch[];
  state: any;
}

export interface UndoRedoState {
  history: HistoryAction[];
  currentIndex: number;
  maxHistorySize: number;
  isUndoing: boolean;
  isRedoing: boolean;
}

export interface UndoRedoActions {
  // Core actions
  addAction: (action: Omit<HistoryAction, 'id' | 'timestamp'>) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  
  // State queries
  canUndo: () => boolean;
  canRedo: () => boolean;
  getHistory: () => HistoryAction[];
  getCurrentState: () => any;
  
  // Configuration
  setMaxHistorySize: (size: number) => void;
  
  // Batch operations
  batchActions: (actions: Array<Omit<HistoryAction, 'id' | 'timestamp'>>) => void;
}

export interface UndoRedoStore extends UndoRedoState, UndoRedoActions {}

const initialState: UndoRedoState = {
  history: [],
  currentIndex: -1,
  maxHistorySize: 50,
  isUndoing: false,
  isRedoing: false,
};

export const useUndoRedoStore = create<UndoRedoStore>()((set, get) => ({
  ...initialState,

  /**
   * Add a new action to history
   */
  addAction: (action) => {
    set(
      produce((state: UndoRedoState) => {
        // Remove future actions if we're not at the latest state
        if (state.currentIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.currentIndex + 1);
        }

        // Add new action
        const newAction: HistoryAction = {
          ...action,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };

        state.history.push(newAction);
        state.currentIndex = state.history.length - 1;

        // Trim history if it exceeds max size
        if (state.history.length > state.maxHistorySize) {
          const excess = state.history.length - state.maxHistorySize;
          state.history = state.history.slice(excess);
          state.currentIndex -= excess;
        }
      })
    );
  },

  /**
   * Undo the last action
   */
  undo: () => {
    set(
      produce((state: UndoRedoState) => {
        if (state.currentIndex < 0) return;

        state.isUndoing = true;
        const action = state.history[state.currentIndex];
        
        // Apply inverse patches
        if (action.inversePatches && action.inversePatches.length > 0) {
          // Note: In a real implementation, you would apply these patches
          // to your application state using immer's applyPatches
        }
        
        state.currentIndex--;
        state.isUndoing = false;
      })
    );
  },

  /**
   * Redo the last undone action
   */
  redo: () => {
    set(
      produce((state: UndoRedoState) => {
        if (state.currentIndex >= state.history.length - 1) return;

        state.isRedoing = true;
        state.currentIndex++;
        const action = state.history[state.currentIndex];
        
        // Apply patches
        if (action.patches && action.patches.length > 0) {
          // Note: In a real implementation, you would apply these patches
          // to your application state using immer's applyPatches
        }
        
        state.isRedoing = false;
      })
    );
  },

  /**
   * Clear all history
   */
  clear: () => {
    set(initialState);
  },

  /**
   * Check if undo is possible
   */
  canUndo: () => {
    const { currentIndex } = get();
    return currentIndex >= 0;
  },

  /**
   * Check if redo is possible
   */
  canRedo: () => {
    const { currentIndex, history } = get();
    return currentIndex < history.length - 1;
  },

  /**
   * Get full history
   */
  getHistory: () => {
    return get().history;
  },

  /**
   * Get current state
   */
  getCurrentState: () => {
    const { history, currentIndex } = get();
    if (currentIndex < 0) return null;
    return history[currentIndex]?.state || null;
  },

  /**
   * Set maximum history size
   */
  setMaxHistorySize: (size) => {
    set(
      produce((state: UndoRedoState) => {
        state.maxHistorySize = size;
        
        // Trim history if necessary
        if (state.history.length > size) {
          const excess = state.history.length - size;
          state.history = state.history.slice(excess);
          state.currentIndex -= excess;
        }
      })
    );
  },

  /**
   * Batch multiple actions
   */
  batchActions: (actions) => {
    set(
      produce((state: UndoRedoState) => {
        // Remove future actions if we're not at the latest state
        if (state.currentIndex < state.history.length - 1) {
          state.history = state.history.slice(0, state.currentIndex + 1);
        }

        // Add all actions
        const newActions = actions.map((action) => ({
          ...action,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        }));

        state.history.push(...newActions);
        state.currentIndex = state.history.length - 1;

        // Trim history if it exceeds max size
        if (state.history.length > state.maxHistorySize) {
          const excess = state.history.length - state.maxHistorySize;
          state.history = state.history.slice(excess);
          state.currentIndex -= excess;
        }
      })
    );
  },
}));

/**
 * Hook to integrate undo/redo with immer patches
 */
export function useUndoRedo<T>(
  state: T,
  setState: (state: T | ((prev: T) => T)) => void,
  options: { maxSize?: number } = {}
) {
  const { maxSize = 50 } = options;
  const undoRedo = useUndoRedoStore();
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const performAction = useCallback(
    (action: {
      do: (currentState: T) => T;
      undo: (currentState: T) => T;
      description?: string;
    }) => {
      const newState = action.do(stateRef.current);
      
      setState(newState);
      
      undoRedo.addAction({
        type: 'custom',
        description: action.description || 'Action',
        patches: [], // Would be generated by immer
        inversePatches: [], // Would be generated by immer
        state: newState,
      });
    },
    [setState, undoRedo]
  );

  const undo = useCallback(() => {
    undoRedo.undo();
  }, [undoRedo]);

  const redo = useCallback(() => {
    undoRedo.redo();
  }, [undoRedo]);

  const canUndo = undoRedo.canUndo();
  const canRedo = undoRedo.canRedo();

  return {
    performAction,
    undo,
    redo,
    canUndo,
    canRedo,
    history: undoRedo.getHistory(),
  };
}

/**
 * Hook for automatic undo/redo tracking with immer
 */
export function useAutoUndoRedo<T>(
  initialState: T,
  options: { maxSize?: number } = {}
): [T, (fn: (draft: T) => void) => void, ReturnType<typeof useUndoRedo>] {
  const [state, setState] = useState<T>(initialState);
  const undoRedo = useUndoRedo(state, setState, options);

  const updateState = useCallback(
    (fn: (draft: T) => void) => {
      const newState = produce(state, fn);
      
      setState(newState);
      
      undoRedo.addAction({
        type: 'immer-update',
        description: 'State update',
        patches: [], // Would be generated by immer
        inversePatches: [], // Would be generated by immer
        state: newState,
      });
    },
    [state, undoRedo]
  );

  return [state, updateState, undoRedo];
}
