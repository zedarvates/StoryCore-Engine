/**
 * useUndoRedo Hook - Provides undo/redo functionality with state restoration
 * 
 * This hook handles the complex logic of restoring state from snapshots
 * when undo/redo operations are performed.
 * 
 * Requirements: 18.1, 18.3, 18.4, 18.6
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../index';
import { undo as undoAction, redo as redoAction } from '../slices/historySlice';
import { setProject, updateSettings } from '../slices/projectSlice';
import { reorderShots, reorderTracks } from '../slices/timelineSlice';
import { loadAssets } from '../slices/assetsSlice';
import { setPanelLayout } from '../slices/panelsSlice';

/**
 * Hook for undo/redo operations with state restoration
 */
export function useUndoRedo() {
  const dispatch = useAppDispatch();
  const { undoStack, redoStack } = useAppSelector((state) => state.history);
  
  /**
   * Restore state from a snapshot
   */
  const restoreState = useCallback((snapshot: unknown) => {
    if (!snapshot) return;
    
    // Restore project state
    if (snapshot.project) {
      if (snapshot.project.metadata) {
        dispatch(setProject(snapshot.project.metadata));
      }
      if (snapshot.project.settings) {
        dispatch(updateSettings(snapshot.project.settings));
      }
    }
    
    // Restore timeline state
    if (snapshot.timeline) {
      if (snapshot.timeline.shots) {
        dispatch(reorderShots(snapshot.timeline.shots));
      }
      if (snapshot.timeline.tracks) {
        dispatch(reorderTracks(snapshot.timeline.tracks));
      }
    }
    
    // Restore assets state
    if (snapshot.assets?.categories) {
      dispatch(loadAssets(snapshot.assets.categories));
    }
    
    // Restore panels state
    if (snapshot.panels?.layout) {
      dispatch(setPanelLayout(snapshot.panels.layout));
    }
  }, [dispatch]);
  
  /**
   * Perform undo operation
   * Requirement 18.3: Revert last action and update interface state
   */
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    // Get the snapshot to restore
    const snapshot = undoStack[undoStack.length - 1];
    
    // Dispatch undo action (moves snapshot to redo stack)
    dispatch(undoAction());
    
    // Restore the state
    if (snapshot?.state) {
      restoreState(snapshot.state);
    }
  }, [dispatch, undoStack, restoreState]);
  
  /**
   * Perform redo operation
   * Requirement 18.4: Reapply last undone action
   */
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    // Get the snapshot to restore
    const snapshot = redoStack[redoStack.length - 1];
    
    // Dispatch redo action (moves snapshot back to undo stack)
    dispatch(redoAction());
    
    // Note: For redo, we don't restore the snapshot state because
    // the action will be re-executed naturally
  }, [dispatch, redoStack]);
  
  /**
   * Check if undo is available
   * Requirement 18.6: Display current undo/redo state
   */
  const canUndo = undoStack.length > 0;
  
  /**
   * Check if redo is available
   * Requirement 18.6: Display current undo/redo state
   */
  const canRedo = redoStack.length > 0;
  
  /**
   * Get description of next undo action
   */
  const undoDescription = undoStack.length > 0
    ? undoStack[undoStack.length - 1].description
    : null;
  
  /**
   * Get description of next redo action
   */
  const redoDescription = redoStack.length > 0
    ? redoStack[redoStack.length - 1].description
    : null;
  
  return {
    undo,
    redo,
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
  };
}

