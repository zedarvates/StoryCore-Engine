/**
 * useProjectPersistence Hook - Manages project loading and save status
 * 
 * This hook provides utilities for loading saved projects and monitoring
 * save status.
 * 
 * Requirements: 19.2, 19.3, 19.4, 19.5
 */

import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../index';
import { loadFromLocalStorage } from '../middleware/autoSaveMiddleware';
import { setProject, updateSettings, setSaveStatus } from '../slices/projectSlice';
import { reorderShots, reorderTracks } from '../slices/timelineSlice';
import { loadAssets } from '../slices/assetsSlice';
import { setPanelLayout } from '../slices/panelsSlice';
import { setActiveTool } from '../slices/toolsSlice';

/**
 * Hook for project persistence operations
 */
export function useProjectPersistence() {
  const dispatch = useAppDispatch();
  const saveStatus = useAppSelector((state) => state.project.saveStatus);
  const hasModifications = saveStatus.state === 'modified';
  
  /**
   * Load project from localStorage
   * Requirement 19.2: Restore saved project on startup
   */
  const loadProject = useCallback(() => {
    const savedProject = loadFromLocalStorage();
    
    if (!savedProject) {
      return false;
    }
    
    try {
      // Restore project metadata and settings
      if (savedProject.project) {
        if (savedProject.project.metadata) {
          dispatch(setProject(savedProject.project.metadata));
        }
        if (savedProject.project.settings) {
          dispatch(updateSettings(savedProject.project.settings));
        }
      }
      
      // Restore timeline state
      if (savedProject.timeline) {
        if (savedProject.timeline.shots) {
          dispatch(reorderShots(savedProject.timeline.shots));
        }
        if (savedProject.timeline.tracks) {
          dispatch(reorderTracks(savedProject.timeline.tracks));
        }
      }
      
      // Restore assets
      if (savedProject.assets?.categories) {
        dispatch(loadAssets(savedProject.assets.categories));
      }
      
      // Restore panel layout
      if (savedProject.panels?.layout) {
        dispatch(setPanelLayout(savedProject.panels.layout));
      }
      
      // Restore active tool
      if (savedProject.tools?.activeTool) {
        dispatch(setActiveTool(savedProject.tools.activeTool));
      }
      
      // Set save status to saved
      dispatch(setSaveStatus({
        state: 'saved',
        lastSaveTime: savedProject.timestamp || Date.now(), // Use timestamp directly
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to load project:', error);
      dispatch(setSaveStatus({
        state: 'error',
        error: error instanceof Error ? error.message : 'Failed to load project',
      }));
      return false;
    }
  }, [dispatch]);
  
  /**
   * Check for unsaved changes before closing
   * Requirement 19.5: Display confirmation dialog on close with unsaved changes
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasModifications) {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasModifications]);
  
  /**
   * Get formatted last save time
   * Requirement 19.3: Display save timestamp
   */
  const getLastSaveTimeFormatted = useCallback(() => {
    if (!saveStatus.lastSaveTime) {
      return null;
    }
    
    const now = Date.now();
    const diffMs = now - saveStatus.lastSaveTime;
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 1) {
      return 'Saved just now';
    } else if (diffMinutes === 1) {
      return 'Saved 1 minute ago';
    } else if (diffMinutes < 60) {
      return `Saved ${diffMinutes} minutes ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours === 1) {
        return 'Saved 1 hour ago';
      } else {
        return `Saved ${diffHours} hours ago`;
      }
    }
  }, [saveStatus.lastSaveTime]);
  
  return {
    loadProject,
    saveStatus,
    hasModifications,
    lastSaveTimeFormatted: getLastSaveTimeFormatted(),
  };
}
