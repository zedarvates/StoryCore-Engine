/**
 * useProjectFile Hook
 * 
 * Provides file-based project save/load operations with keyboard shortcuts.
 * Handles manual save (Ctrl/Cmd+S) and project file management.
 * 
 * Requirements: 19.4, 19.6, 19.7
 */

import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { markSaved, setSaveStatus, setProject, updateSettings } from '../store/slices/projectSlice';
import { reorderShots, reorderTracks, setPlayheadPosition, setZoomLevel, setSelectedElements } from '../store/slices/timelineSlice';
import { loadAssets, setActiveCategory, setSearchQuery } from '../store/slices/assetsSlice';
import { setPanelLayout, setActivePanel, setShotConfigTarget } from '../store/slices/panelsSlice';
import { setActiveTool } from '../store/slices/toolsSlice';
import {
  saveProjectToFile,
  loadProjectFromFile,
  validateProjectCompatibility,
} from '../services/projectPersistence';
import type { Shot, Track, AssetCategory } from '../types';

export interface UseProjectFileResult {
  saveToFile: (filename?: string) => Promise<void>;
  loadFromFile: (file: File) => Promise<void>;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  // Dialog state and handlers for SequenceEditor compatibility
  showUnsavedDialog: boolean;
  handleSave: () => void | Promise<void>;
  handleDiscard: () => void;
  handleCancel: () => void;
  setShowUnsavedDialog: (show: boolean) => void;
}

/**
 * Hook for file-based project persistence
 */
export function useProjectFile(): UseProjectFileResult {
  const dispatch = useAppDispatch();
  const state = useAppSelector((state) => state);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Save project to file
   * Requirement 19.4: Manual save option
   */
  const saveToFile = useCallback(async (filename?: string) => {
    setIsSaving(true);
    setError(null);
    
    try {
      // Set saving status
      dispatch(setSaveStatus({ state: 'saving' }));
      
      // Save to file
      saveProjectToFile(state, filename);
      
      // Mark as saved
      dispatch(markSaved());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save project';
      setError(errorMessage);
      dispatch(setSaveStatus({
        state: 'error',
        error: errorMessage,
      }));
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [state, dispatch]);
  
  /**
   * Load project from file
   * Requirement 19.4: Manual save option (load counterpart)
   */
  const loadFromFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load and parse file
      const projectData = await loadProjectFromFile(file);
      
      // Validate compatibility
      const validation = validateProjectCompatibility(projectData);
      if (!validation.compatible) {
        throw new Error(`Incompatible project file: ${validation.errors.join(', ')}`);
      }
      
      // Show warnings if any
      if (validation.warnings.length > 0) {
        console.warn('Project compatibility warnings:', validation.warnings);
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
      setError(errorMessage);
      dispatch(setSaveStatus({
        state: 'error',
        error: errorMessage,
      }));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  /**
   * Keyboard shortcut for save (Ctrl/Cmd+S)
   * Requirement 19.4: Manual save option
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+S (Windows/Linux) or Cmd+S (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveToFile();
      }
    };
    
    globalThis.addEventListener('keydown', handleKeyDown);
    
    return () => {
      globalThis.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveToFile]);
  
  // State for unsaved changes dialog (for SequenceEditor compatibility)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  
  // Handlers for unsaved changes dialog
  const handleSave = useCallback(async () => {
    try {
      await saveToFile();
      setShowUnsavedDialog(false);
    } catch (err) {
      console.error('Failed to save:', err);
    }
  }, [saveToFile]);
  
  const handleDiscard = useCallback(() => {
    dispatch(markSaved());
    setShowUnsavedDialog(false);
  }, [dispatch]);
  
  const handleCancel = useCallback(() => {
    setShowUnsavedDialog(false);
  }, []);
  
  return {
    saveToFile,
    loadFromFile,
    isSaving,
    isLoading,
    error,
    clearError,
    // Dialog state and handlers for SequenceEditor compatibility
    showUnsavedDialog,
    handleSave,
    handleDiscard,
    handleCancel,
    setShowUnsavedDialog,
  };
}
