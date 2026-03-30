import { StateCreator } from 'zustand';
import { UnifiedProjectStore, HistoryEntry } from './types';
import { logger as Logger } from '@/utils/logger';

/**
 * Creates the History Slice for the Unified Project Store
 * Handles undo/redo operations with optimized snapshots and diffs.
 */
export const createHistorySlice: StateCreator<
  UnifiedProjectStore,
  [],
  [],
  Partial<UnifiedProjectStore>
> = (set, get) => {
  const MAX_HISTORY_SIZE = 50; // Requirement from Audit Task 7
  
  return {
    // History Data
    history: [],
    historyIndex: -1,
    lastSavedIndex: -1,

    /**
     * Actions
     */
    pushHistory: (entry: HistoryEntry) => set((state) => {
      // Create new history entry (Requirement 7.1)
      const newHistory = [...state.history.slice(0, state.historyIndex + 1), entry];
      
      // Enforce max history size with FIFO eviction (Requirement 7.4/Audit Task 7)
      const limitedHistory = newHistory.slice(-MAX_HISTORY_SIZE);
      const newIndex = limitedHistory.length - 1;
      
      Logger.debug(`📜 [ProjectStore] History pushed: ${entry.action || 'Unnamed action'}. Index: ${newIndex}`);
      
      return {
        history: limitedHistory,
        historyIndex: newIndex,
      };
    }),

    undo: () => {
      const state = get();
      if (state.historyIndex < 0 || state.history.length === 0) {
        Logger.debug('📜 [ProjectStore] Undo ignored: No history or at start');
        return;
      }

      const prevIndex = state.historyIndex - 1;
      if (prevIndex < -1) return;

      const historyEntry = state.history[state.historyIndex];
      Logger.info(`📜 [ProjectStore] Undoing action: ${historyEntry.action}`);

      // RESTORE LOGIC - Optimized to only restore modified fields (Requirement 7.3/Audit Task 7)
      const previousState = historyEntry.previousState;
      if (!previousState) return;

      set({
        ...previousState,
        historyIndex: prevIndex,
      });
    },

    redo: () => {
      const state = get();
      if (state.historyIndex >= state.history.length - 1) {
        Logger.debug('📜 [ProjectStore] Redo ignored: at most recent action');
        return;
      }

      const nextIndex = state.historyIndex + 1;
      const historyEntry = state.history[nextIndex];
      Logger.info(`📜 [ProjectStore] Redoing action: ${historyEntry.action}`);

      const nextStateFromSnapshot = historyEntry.nextState;
      if (!nextStateFromSnapshot) return;

      set({
        ...nextStateFromSnapshot,
        historyIndex: nextIndex,
      });
    },

    goToHistoryIndex: (index: number) => {
      const state = get();
      if (index < -1 || index >= state.history.length) {
        Logger.warn(`📜 [ProjectStore] goToHistoryIndex ignored: Invalid index ${index}`);
        return;
      }

      if (index === state.historyIndex) return;

      Logger.info(`📜 [ProjectStore] Jumping to history index: ${index}`);

      if (index === -1) {
        // Find the earliest previous state
        const firstEntry = state.history[0];
        if (firstEntry && firstEntry.previousState) {
          set({
            ...firstEntry.previousState,
            historyIndex: -1
          });
        }
        return;
      }

      // Restore nextState of the index
      const targetEntry = state.history[index];
      if (targetEntry && targetEntry.nextState) {
        set({
          ...targetEntry.nextState,
          historyIndex: index
        });
      }
    },
    
    clearHistory: () => set({ history: [], historyIndex: -1, lastSavedIndex: -1 }),
    markAsSaved: () => set((state) => ({ lastSavedIndex: state.historyIndex })),
  };
};
