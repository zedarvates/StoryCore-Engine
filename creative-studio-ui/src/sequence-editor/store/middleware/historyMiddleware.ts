/**
 * History Middleware - Captures undoable actions and manages state snapshots
 * 
 * This middleware intercepts actions that should be undoable and creates
 * state snapshots for the undo/redo system.
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7
 */

import { Middleware } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { pushHistory } from '../slices/historySlice';
import { markModified } from '../slices/projectSlice';

// Actions that should trigger undo history
const UNDOABLE_ACTIONS = [
  // Timeline actions
  'timeline/addShot',
  'timeline/updateShot',
  'timeline/deleteShot',
  'timeline/reorderShots',
  'timeline/addTrack',
  'timeline/updateTrack',
  'timeline/deleteTrack',
  'timeline/reorderTracks',
  
  // Asset actions
  'assets/addAsset',
  'assets/updateAsset',
  'assets/deleteAsset',
  
  // Panel actions
  'panels/setPanelLayout',
  
  // Project actions
  'project/updateMetadata',
  'project/updateSettings',
];

// Human-readable descriptions for actions
const ACTION_DESCRIPTIONS: Record<string, string> = {
  'timeline/addShot': 'Add shot',
  'timeline/updateShot': 'Update shot',
  'timeline/deleteShot': 'Delete shot',
  'timeline/reorderShots': 'Reorder shots',
  'timeline/addTrack': 'Add track',
  'timeline/updateTrack': 'Update track',
  'timeline/deleteTrack': 'Delete track',
  'timeline/reorderTracks': 'Reorder tracks',
  'assets/addAsset': 'Add asset',
  'assets/updateAsset': 'Update asset',
  'assets/deleteAsset': 'Delete asset',
  'panels/setPanelLayout': 'Resize panel',
  'project/updateMetadata': 'Update project metadata',
  'project/updateSettings': 'Update project settings',
};

/**
 * Creates a state snapshot for undo/redo
 */
function createSnapshot(state: RootState, action: unknown): unknown {
  return {
    project: state.project,
    timeline: state.timeline,
    assets: state.assets,
    panels: state.panels,
  };
}

/**
 * History middleware that captures undoable actions
 */
export const historyMiddleware: Middleware<{}, RootState> = (store) => (next) => (action: unknown) => {
  // Check if this action should be captured in history
  const isUndoable = UNDOABLE_ACTIONS.includes(action.type);
  
  // Skip undo/redo actions themselves
  if (action.type === 'history/undo' || action.type === 'history/redo') {
    return next(action);
  }
  
  // Capture state before action
  let previousState: unknown = null;
  if (isUndoable) {
    previousState = createSnapshot(store.getState(), action);
  }
  
  // Execute the action
  const result = next(action);
  
  // After action, create snapshot and push to history
  if (isUndoable && previousState) {
    const description = ACTION_DESCRIPTIONS[action.type] || action.type;
    
    store.dispatch(pushHistory({
      timestamp: new Date(),
      action: action.type,
      state: previousState,
      description,
    }));
    
    // Mark project as modified
    store.dispatch(markModified());
  }
  
  return result;
};



