/**
 * Auto-Save Middleware - Automatically saves project state to localStorage
 * 
 * This middleware monitors state changes and triggers auto-save every 60 seconds
 * when modifications are detected. It uses debouncing to prevent excessive saves.
 * 
 * Requirements: 19.2, 19.3, 19.4, 19.6
 */

import { Middleware } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { setSaveStatus, markSaved } from '../slices/projectSlice';

// Auto-save interval: 60 seconds (Requirement 19.2)
const AUTO_SAVE_INTERVAL = 60000;

// Debounce delay for save operations: 500ms
const SAVE_DEBOUNCE_DELAY = 500;

// Actions that should trigger auto-save
const SAVE_TRIGGERING_ACTIONS = [
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

/**
 * Save project state to localStorage
 * Requirement 19.6: Save complete project state
 */
function saveToLocalStorage(state: RootState): void {
  try {
    const projectState = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      project: state.project,
      timeline: state.timeline,
      assets: state.assets,
      panels: state.panels,
      tools: state.tools,
    };
    
    localStorage.setItem('sequence-editor-project', JSON.stringify(projectState));
  } catch (error) {
    console.error('Failed to save project to localStorage:', error);
    throw error;
  }
}

/**
 * Load project state from localStorage
 */
export function loadFromLocalStorage(): any | null {
  try {
    const saved = localStorage.getItem('sequence-editor-project');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load project from localStorage:', error);
  }
  return null;
}

/**
 * Auto-save middleware that triggers periodic saves
 */
export const autoSaveMiddleware: Middleware<{}, RootState> = (store) => {
  let autoSaveTimer: NodeJS.Timeout | null = null;
  let debounceTimer: NodeJS.Timeout | null = null;
  let hasModifications = false;
  
  /**
   * Perform the actual save operation
   * Requirement 19.3: Update save timestamp on completion
   */
  const performSave = () => {
    const state = store.getState();
    
    // Only save if there are modifications
    if (!hasModifications || state.project.saveStatus.state !== 'modified') {
      return;
    }
    
    // Set saving status
    store.dispatch(setSaveStatus({
      state: 'saving',
    }));
    
    try {
      // Save to localStorage
      saveToLocalStorage(state);
      
      // Mark as saved with timestamp (Requirement 19.3)
      store.dispatch(markSaved());
      
      hasModifications = false;
    } catch (error) {
      // Set error status
      store.dispatch(setSaveStatus({
        state: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };
  
  /**
   * Debounced save function
   */
  const debouncedSave = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
      performSave();
    }, SAVE_DEBOUNCE_DELAY);
  };
  
  /**
   * Start auto-save timer
   * Requirement 19.2: Auto-save every 60 seconds when modifications exist
   */
  const startAutoSaveTimer = () => {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
    }
    
    autoSaveTimer = setInterval(() => {
      if (hasModifications) {
        performSave();
      }
    }, AUTO_SAVE_INTERVAL);
  };
  
  // Start the auto-save timer
  startAutoSaveTimer();
  
  return (next) => (action: any) => {
    // Skip save-related actions to prevent loops
    if (
      action.type === 'project/setSaveStatus' ||
      action.type === 'project/markSaved' ||
      action.type === 'project/markModified'
    ) {
      return next(action);
    }
    
    // Execute the action
    const result = next(action);
    
    // Check if this action should trigger save
    if (SAVE_TRIGGERING_ACTIONS.includes(action.type)) {
      hasModifications = true;
      
      // Trigger debounced save
      debouncedSave();
    }
    
    return result;
  };
};

/**
 * Clear auto-save data from localStorage
 */
export function clearAutoSave(): void {
  try {
    localStorage.removeItem('sequence-editor-project');
  } catch (error) {
    console.error('Failed to clear auto-save data:', error);
  }
}
