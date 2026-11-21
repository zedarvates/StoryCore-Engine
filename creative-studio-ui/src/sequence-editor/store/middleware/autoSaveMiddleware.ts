/**
 * Auto-Save Middleware - Automatically saves project state to localStorage
 *
 * This middleware monitors state changes and triggers auto-save every 60 seconds
 * when modifications are detected. It uses debouncing to prevent excessive saves.
 *
 * Requirements: 19.2, 19.3, 19.4, 19.6
 */

import { Middleware, isAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { setSaveStatus, markSaved } from '../slices/projectSlice';

// Auto-save interval: 60 seconds (Requirement 19.2)
const AUTO_SAVE_INTERVAL = 60000;

// Debounce delay for save operations: 500ms
const SAVE_DEBOUNCE_DELAY = 500;

// Local storage key for the persisted project snapshot
const PROJECT_STORAGE_KEY = 'sequence-editor-project';

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

type SnapshotSlices = Pick<RootState, 'project' | 'timeline' | 'assets' | 'panels' | 'tools'>;

type RestoredSnapshot = {
  version: string;
  timestamp: number;
  project: Partial<Pick<RootState['project'], 'metadata' | 'sequences' | 'settings'>>;
  timeline: Partial<Pick<RootState['timeline'], 'shots' | 'tracks'>>;
  assets: Partial<Pick<RootState['assets'], 'categories'>>;
  panels: { layout?: Partial<RootState['panels']['layout']> };
  tools: Partial<Pick<RootState['tools'], 'activeTool'>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEntityList(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.every(
    (entry) => isRecord(entry) && typeof entry.id === 'string',
  ));
}

function hasSnapshotSlices(value: unknown): value is Omit<RestoredSnapshot, 'version' | 'timestamp'> {
  if (!isRecord(value)) return false;
  const { project, timeline, assets, panels, tools } = value;
  return isRecord(project) && isRecord(timeline) && isRecord(assets) &&
    isRecord(panels) && isRecord(tools) &&
    (project.metadata == null || isRecord(project.metadata)) &&
    (project.settings === undefined || isRecord(project.settings)) &&
    isEntityList(project.sequences) &&
    isEntityList(timeline.shots) && isEntityList(timeline.tracks) &&
    isEntityList(assets.categories) &&
    (panels.layout === undefined || isRecord(panels.layout)) &&
    (tools.activeTool === undefined || typeof tools.activeTool === 'string');
}

function normalizeTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return Date.now();
}

function parsePersistedProjectSnapshot(raw: string): RestoredSnapshot | null {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || !hasSnapshotSlices(parsed)) return null;

  return {
    ...parsed,
    version: typeof parsed.version === 'string' ? parsed.version : '1.0',
    timestamp: normalizeTimestamp(parsed.timestamp),
  };
}

/**
 * Save project state to localStorage
 * Requirement 19.6: Save complete project state
 */
function saveToLocalStorage(state: RootState): void {
  try {
    const snapshot: SnapshotSlices & { version: string; timestamp: string } = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      project: state.project,
      timeline: state.timeline,
      assets: state.assets,
      panels: state.panels,
      tools: state.tools,
    };

    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Failed to save project to localStorage:', error);
    throw error;
  }
}

/**
 * Load project state from localStorage
 */
export function loadFromLocalStorage(): RestoredSnapshot | null {
  try {
    const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!saved) {
      return null;
    }

    return parsePersistedProjectSnapshot(saved);
  } catch (error) {
    console.error('Failed to load project from localStorage:', error);
    return null;
  }
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

  return (next) => (action: unknown) => {
    const actionType = isAction(action) ? action.type : undefined;

    // Skip save-related actions to prevent loops
    if (
      actionType === 'project/setSaveStatus' ||
      actionType === 'project/markSaved' ||
      actionType === 'project/markModified'
    ) {
      return next(action);
    }

    // Execute the action
    const result = next(action);

    // Check if this action should trigger save
    if (actionType && SAVE_TRIGGERING_ACTIONS.includes(actionType)) {
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
    localStorage.removeItem(PROJECT_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear auto-save data:', error);
  }
}
