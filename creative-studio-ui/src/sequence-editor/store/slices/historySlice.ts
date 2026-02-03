/**
 * History Slice - Redux state management for undo/redo functionality
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 19.1
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { HistoryState, StateSnapshot } from '../../types';

const initialState: HistoryState = {
  undoStack: [],
  redoStack: [],
  maxStackSize: 50, // Support minimum 50 undo levels (Requirement 18.5)
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    /**
     * Push a new state snapshot to the undo stack
     * Requirement 18.2: Add action to undo stack
     */
    pushHistory: (state, action: PayloadAction<StateSnapshot>) => {
      // Add to undo stack
      state.undoStack.push(action.payload);
      
      // Limit stack size (Requirement 18.5: minimum 50 levels)
      if (state.undoStack.length > state.maxStackSize) {
        state.undoStack.shift();
      }
      
      // Clear redo stack when new action is performed (Requirement 18.7)
      state.redoStack = [];
    },
    
    /**
     * Perform undo operation
     * Requirement 18.3: Revert last action and update interface state
     */
    undo: (state) => {
      if (state.undoStack.length > 0) {
        const snapshot = state.undoStack.pop();
        if (snapshot) {
          state.redoStack.push(snapshot);
        }
      }
    },
    
    /**
     * Perform redo operation
     * Requirement 18.4: Reapply last undone action
     */
    redo: (state) => {
      if (state.redoStack.length > 0) {
        const snapshot = state.redoStack.pop();
        if (snapshot) {
          state.undoStack.push(snapshot);
        }
      }
    },
    
    /**
     * Clear all history
     */
    clearHistory: (state) => {
      state.undoStack = [];
      state.redoStack = [];
    },
  },
});

export const {
  pushHistory,
  undo,
  redo,
  clearHistory,
} = historySlice.actions;

export default historySlice.reducer;
