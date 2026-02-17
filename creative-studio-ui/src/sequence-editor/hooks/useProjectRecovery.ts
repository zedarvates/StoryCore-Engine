/**
 * useProjectRecovery Hook
 * 
 * Manages automatic recovery snapshots and crash detection.
 * Provides recovery UI and snapshot management.
 * 
 * Requirements: 19.2
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { setProject, updateSettings, markSaved } from '../store/slices/projectSlice';
import { reorderShots, reorderTracks, setPlayheadPosition, setZoomLevel, setSelectedElements } from '../store/slices/timelineSlice';
import { loadAssets, setActiveCategory, setSearchQuery } from '../store/slices/assetsSlice';
import { setPanelLayout, setActivePanel, setShotConfigTarget } from '../store/slices/panelsSlice';
import { setActiveTool } from '../store/slices/toolsSlice';
import {
  RecoveryManager,
  checkForCrashedSession,
  clearCrashedSessionFlag,
  getRecoverySnapshots,
  loadRecoverySnapshot,
  deleteRecoverySnapshot,
  clearAllRecoverySnapshots,
  formatSnapshotTimestamp,
  type RecoverySnapshot,
} from '../services/projectRecovery';
import type { Shot, Track, AssetCategory } from '../types';

export interface UseProjectRecoveryResult {
  hasCrashedSession: boolean;
  hasRecovery: boolean;
  recoverySnapshots: RecoverySnapshot[];
  showRecoveryDialog: boolean;
  recoverFromSnapshot: (snapshotId: string) => Promise<void>;
  handleRecover: (snapshotId: string) => Promise<void>;
  dismissCrashRecovery: () => void;
  handleDismiss: () => void;
  deleteSnapshot: (snapshotId: string) => void;
  clearAllSnapshots: () => void;
  formatTimestamp: (timestamp: string) => string;
  isRecovering: boolean;
  error: string | null;
}

/**
 * Hook for project recovery management
 */
export function useProjectRecovery(): UseProjectRecoveryResult {
  const dispatch = useAppDispatch();
  const state = useAppSelector((state) => state);
  const [hasCrashedSession, setHasCrashedSession] = useState(false);
  const [recoverySnapshots, setRecoverySnapshots] = useState<RecoverySnapshot[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recoveryManagerRef = useRef<RecoveryManager | null>(null);
  
  /**
   * Initialize recovery system
   * Requirement 19.2: Detect crashed sessions on startup
   */
  useEffect(() => {
    // Check for crashed session
    const crashed = checkForCrashedSession();
    setHasCrashedSession(crashed);
    
    // Load available snapshots
    const snapshots = getRecoverySnapshots();
    setRecoverySnapshots(snapshots);
    
    // Create recovery manager
    recoveryManagerRef.current = new RecoveryManager(() => state);
    
    // Start automatic snapshots
    recoveryManagerRef.current.start();
    
    // Cleanup on unmount
    return () => {
      if (recoveryManagerRef.current) {
        recoveryManagerRef.current.stop();
      }
    };
  }, []);
  
  /**
   * Recover project from snapshot
   * Requirement 19.2: Offer recovery option with timestamp
   */
  const recoverFromSnapshot = useCallback(async (snapshotId: string) => {
    setIsRecovering(true);
    setError(null);
    
    try {
      // Load snapshot data
      const projectData = loadRecoverySnapshot(snapshotId);
      
      if (!projectData) {
        throw new Error('Recovery snapshot not found');
      }
      
      // Restore project state
      if (projectData.project) {
        if (projectData.project.metadata) {
          dispatch(setProject(projectData.project.metadata));
        }
        if (projectData.project.settings) {
          dispatch(updateSettings(projectData.project.settings));
        }
      }
      
      // Restore timeline state
      if (projectData.timeline) {
        if (projectData.timeline.shots) {
          dispatch(reorderShots(projectData.timeline.shots as Shot[]));
        }
        if (projectData.timeline.tracks) {
          dispatch(reorderTracks(projectData.timeline.tracks as Track[]));
        }
        if (typeof projectData.timeline.playheadPosition === 'number') {
          dispatch(setPlayheadPosition(projectData.timeline.playheadPosition));
        }
        if (typeof projectData.timeline.zoomLevel === 'number') {
          dispatch(setZoomLevel(projectData.timeline.zoomLevel));
        }
        if (projectData.timeline.selectedElements) {
          dispatch(setSelectedElements(projectData.timeline.selectedElements));
        }
      }
      
      // Restore assets state
      if (projectData.assets) {
        if (projectData.assets.categories) {
          dispatch(loadAssets(projectData.assets.categories as AssetCategory[]));
        }
        if (projectData.assets.activeCategory) {
          dispatch(setActiveCategory(projectData.assets.activeCategory));
        }
        if (projectData.assets.searchQuery) {
          dispatch(setSearchQuery(projectData.assets.searchQuery));
        }
      }
      
      // Restore panels state
      if (projectData.panels) {
        if (projectData.panels.layout) {
          dispatch(setPanelLayout(projectData.panels.layout));
        }
        if (projectData.panels.activePanel) {
          dispatch(setActivePanel(projectData.panels.activePanel as 'assetLibrary' | 'preview' | 'shotConfig' | 'timeline' | null));
        }
        if (projectData.panels.shotConfigTarget) {
          dispatch(setShotConfigTarget(projectData.panels.shotConfigTarget));
        }
      }
      
      // Restore tools state
      if (projectData.tools) {
        if (projectData.tools.activeTool) {
          dispatch(setActiveTool(projectData.tools.activeTool as any));
        }
      }
      
      // Mark as saved
      dispatch(markSaved());
      
      // Clear crashed session flag
      clearCrashedSessionFlag();
      setHasCrashedSession(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to recover project';
      setError(errorMessage);
      throw err;
    } finally {
      setIsRecovering(false);
    }
  }, [dispatch]);
  
  /**
   * Dismiss crash recovery dialog
   */
  const dismissCrashRecovery = useCallback(() => {
    clearCrashedSessionFlag();
    setHasCrashedSession(false);
  }, []);
  
  /**
   * Delete a recovery snapshot
   */
  const deleteSnapshot = useCallback((snapshotId: string) => {
    deleteRecoverySnapshot(snapshotId);
    setRecoverySnapshots(getRecoverySnapshots());
  }, []);
  
  /**
   * Clear all recovery snapshots
   */
  const clearAllSnapshots = useCallback(() => {
    clearAllRecoverySnapshots();
    setRecoverySnapshots([]);
  }, []);
  
  /**
   * Format timestamp for display
   */
  const formatTimestamp = useCallback((timestamp: string) => {
    return formatSnapshotTimestamp(timestamp);
  }, []);
  
  // Derived state for compatibility
  const hasRecovery = hasCrashedSession || recoverySnapshots.length > 0;
  const showRecoveryDialog = hasRecovery;
  
  return {
    hasCrashedSession,
    hasRecovery,
    recoverySnapshots,
    showRecoveryDialog,
    recoverFromSnapshot,
    handleRecover: recoverFromSnapshot,
    dismissCrashRecovery,
    handleDismiss: dismissCrashRecovery,
    deleteSnapshot,
    clearAllSnapshots,
    formatTimestamp,
    isRecovering,
    error,
  };
}
