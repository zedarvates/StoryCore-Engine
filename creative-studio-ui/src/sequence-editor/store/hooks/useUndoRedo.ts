import { useCallback, useMemo } from 'react';
import { useProjectStore } from '../../../stores/useProjectStore';

/**
 * Hook for undo/redo operations using the Unified Project Store
 */
export function useUndoRedo() {
  const undo = useProjectStore(state => state.undo);
  const redo = useProjectStore(state => state.redo);
  const history = useProjectStore(state => state.history);
  const historyIndex = useProjectStore(state => state.historyIndex);
  
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
  
  return {
    undo: useCallback(() => undo(), [undo]),
    redo: useCallback(() => redo(), [redo]),
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
  };
}

