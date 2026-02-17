/**
 * Project Recovery Service
 * 
 * Handles automatic recovery snapshots and crash detection.
 * Saves recovery snapshots every 5 minutes and detects crashed sessions.
 * 
 * Requirements: 19.2
 */

import type { RootState } from '../store';
import { exportProjectToJSON, type ProjectFile } from './projectPersistence';

// Recovery snapshot interval: 5 minutes
const RECOVERY_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Maximum number of recovery snapshots to keep
const MAX_RECOVERY_SNAPSHOTS = 10;

// LocalStorage keys
const RECOVERY_KEY_PREFIX = 'sequence-editor-recovery-';
const RECOVERY_INDEX_KEY = 'sequence-editor-recovery-index';
const SESSION_ACTIVE_KEY = 'sequence-editor-session-active';

/**
 * Recovery snapshot metadata
 */
export interface RecoverySnapshot {
  id: string;
  timestamp: string;
  projectName: string;
  shotCount: number;
  duration: number;
}

/**
 * Recovery index stored in localStorage
 */
interface RecoveryIndex {
  snapshots: RecoverySnapshot[];
  lastSessionCrashed: boolean;
}

/**
 * Get recovery index from localStorage
 */
function getRecoveryIndex(): RecoveryIndex {
  try {
    const indexJson = localStorage.getItem(RECOVERY_INDEX_KEY);
    if (indexJson) {
      return JSON.parse(indexJson);
    }
  } catch (error) {
    console.error('Failed to load recovery index:', error);
  }

  return {
    snapshots: [],
    lastSessionCrashed: false,
  };
}

/**
 * Save recovery index to localStorage
 */
function saveRecoveryIndex(index: RecoveryIndex): void {
  try {
    localStorage.setItem(RECOVERY_INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    console.error('Failed to save recovery index:', error);
  }
}

/**
 * Generate unique snapshot ID
 */
function generateSnapshotId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save recovery snapshot
 * Requirement 19.2: Save recovery snapshots every 5 minutes
 */
export function saveRecoverySnapshot(state: RootState): void {
  try {
    // Export project data
    const projectData = exportProjectToJSON(state);

    // Create snapshot metadata
    const snapshot: RecoverySnapshot = {
      id: generateSnapshotId(),
      timestamp: new Date().toISOString(),
      projectName: state.project.metadata?.name || 'Untitled Project',
      shotCount: state.timeline.shots.length,
      duration: state.timeline.duration,
    };

    // Save snapshot data
    const snapshotKey = `${RECOVERY_KEY_PREFIX}${snapshot.id}`;
    localStorage.setItem(snapshotKey, JSON.stringify(projectData));

    // Update recovery index
    const index = getRecoveryIndex();
    index.snapshots.push(snapshot);

    // Keep only the most recent snapshots
    if (index.snapshots.length > MAX_RECOVERY_SNAPSHOTS) {
      const removed = index.snapshots.shift();
      if (removed) {
        // Delete old snapshot data
        localStorage.removeItem(`${RECOVERY_KEY_PREFIX}${removed.id}`);
      }
    }

    saveRecoveryIndex(index);
  } catch (error) {
    console.error('Failed to save recovery snapshot:', error);
  }
}

/**
 * Load recovery snapshot by ID
 */
export function loadRecoverySnapshot(snapshotId: string): ProjectFile | null {
  try {
    const snapshotKey = `${RECOVERY_KEY_PREFIX}${snapshotId}`;
    const snapshotJson = localStorage.getItem(snapshotKey);

    if (snapshotJson) {
      return JSON.parse(snapshotJson);
    }
  } catch (error) {
    console.error('Failed to load recovery snapshot:', error);
  }

  return null;
}

/**
 * Get all available recovery snapshots
 */
export function getRecoverySnapshots(): RecoverySnapshot[] {
  const index = getRecoveryIndex();
  return index.snapshots;
}

/**
 * Delete recovery snapshot
 */
export function deleteRecoverySnapshot(snapshotId: string): void {
  try {
    // Delete snapshot data
    const snapshotKey = `${RECOVERY_KEY_PREFIX}${snapshotId}`;
    localStorage.removeItem(snapshotKey);

    // Update recovery index
    const index = getRecoveryIndex();
    index.snapshots = index.snapshots.filter((s) => s.id !== snapshotId);
    saveRecoveryIndex(index);
  } catch (error) {
    console.error('Failed to delete recovery snapshot:', error);
  }
}

/**
 * Clear all recovery snapshots
 */
export function clearAllRecoverySnapshots(): void {
  try {
    const index = getRecoveryIndex();

    // Delete all snapshot data
    index.snapshots.forEach((snapshot) => {
      const snapshotKey = `${RECOVERY_KEY_PREFIX}${snapshot.id}`;
      localStorage.removeItem(snapshotKey);
    });

    // Clear recovery index
    saveRecoveryIndex({
      snapshots: [],
      lastSessionCrashed: false,
    });
  } catch (error) {
    console.error('Failed to clear recovery snapshots:', error);
  }
}

/**
 * Mark session as active
 * Used to detect crashes on next startup
 */
export function markSessionActive(): void {
  try {
    localStorage.setItem(SESSION_ACTIVE_KEY, 'true');
  } catch (error) {
    console.error('Failed to mark session as active:', error);
  }
}

/**
 * Mark session as closed normally
 */
export function markSessionClosed(): void {
  try {
    localStorage.removeItem(SESSION_ACTIVE_KEY);
  } catch (error) {
    console.error('Failed to mark session as closed:', error);
  }
}

/**
 * Check if last session crashed
 * Requirement 19.2: Detect crashed sessions on startup
 */
export function checkForCrashedSession(): boolean {
  try {
    const wasActive = localStorage.getItem(SESSION_ACTIVE_KEY) === 'true';

    if (wasActive) {
      // Last session didn't close properly - mark as crashed
      // Clear the active key so we don't detect it again on next mount
      localStorage.removeItem(SESSION_ACTIVE_KEY);

      const index = getRecoveryIndex();
      index.lastSessionCrashed = true;
      saveRecoveryIndex(index);

      return true;
    }

    // Also check the flag in the index in case it was set but not cleared
    const index = getRecoveryIndex();
    return index.lastSessionCrashed;
  } catch (error) {
    console.error('Failed to check for crashed session:', error);
    return false;
  }
}

/**
 * Clear crashed session flag
 */
export function clearCrashedSessionFlag(): void {
  try {
    const index = getRecoveryIndex();
    index.lastSessionCrashed = false;
    saveRecoveryIndex(index);
  } catch (error) {
    console.error('Failed to clear crashed session flag:', error);
  }
}

/**
 * Get formatted timestamp for display
 */
export function formatSnapshotTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      } else {
        return date.toLocaleString();
      }
    }
  } catch (error) {
    return timestamp;
  }
}

/**
 * Recovery manager class for automatic snapshots
 */
export class RecoveryManager {
  private intervalId: NodeJS.Timeout | null = null;
  private getState: () => RootState;

  constructor(getState: () => RootState) {
    this.getState = getState;
  }

  /**
   * Start automatic recovery snapshots
   * Requirement 19.2: Save recovery snapshots every 5 minutes
   */
  start(): void {
    if (this.intervalId) {
      return; // Already started
    }

    // Mark session as active
    markSessionActive();

    // Save initial snapshot
    this.saveSnapshot();

    // Start periodic snapshots
    this.intervalId = setInterval(() => {
      this.saveSnapshot();
    }, RECOVERY_INTERVAL);
  }

  /**
   * Stop automatic recovery snapshots
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Mark session as closed normally
    markSessionClosed();
  }

  /**
   * Save a recovery snapshot
   */
  private saveSnapshot(): void {
    try {
      const state = this.getState();
      saveRecoverySnapshot(state);
    } catch (error) {
      console.error('Failed to save recovery snapshot:', error);
    }
  }
}
