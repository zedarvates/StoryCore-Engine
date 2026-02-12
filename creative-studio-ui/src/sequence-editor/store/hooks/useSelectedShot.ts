/**
 * useSelectedShot Hook - Access the currently selected shot from the timeline
 * 
 * This hook provides convenient access to the selected shot from the timeline slice,
 * enabling components like SceneView3D to access shot-specific data such as
 * character rigs, camera presets, and lighting configurations.
 * 
 * Requirements: 1.1, 1.2, 3.2, 7.1
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../index';
import { selectElement, deselectElement, setSelectedElements, clearSelection } from '../slices/timelineSlice';
import type { Shot } from '../../types';

/**
 * Hook for accessing the currently selected shot
 * 
 * @returns The currently selected shot or null if no shot is selected
 */
export function useSelectedShot() {
  const dispatch = useAppDispatch();
  
  // Get the selected shot IDs from the timeline state
  const selectedShotIds = useAppSelector((state) => state.timeline.selectedElements);
  const shots = useAppSelector((state) => state.timeline.shots);
  
  /**
   * Get the first selected shot object
   */
  const selectedShot = selectedShotIds.length > 0
    ? shots.find((shot: Shot) => shot.id === selectedShotIds[0]) || null
    : null;
  
  /**
   * Get all selected shot objects
   */
  const getSelectedShots = useCallback((): Shot[] => {
    return shots.filter((shot: Shot) => selectedShotIds.includes(shot.id));
  }, [shots, selectedShotIds]);
  
  /**
   * Check if a specific shot is selected
   */
  const isSelected = useCallback((shotId: string): boolean => {
    return selectedShotIds.includes(shotId);
  }, [selectedShotIds]);
  
  /**
   * Select a single shot (replaces current selection)
   */
  const selectSingleShot = useCallback((shotId: string) => {
    dispatch(selectElement(shotId));
  }, [dispatch]);
  
  /**
   * Add a shot to the current selection
   */
  const addToSelection = useCallback((shotId: string) => {
    if (!selectedShotIds.includes(shotId)) {
      dispatch(setSelectedElements([...selectedShotIds, shotId]));
    }
  }, [dispatch, selectedShotIds]);
  
  /**
   * Remove a shot from the current selection
   */
  const removeFromSelection = useCallback((shotId: string) => {
    dispatch(deselectElement(shotId));
  }, [dispatch]);
  
  /**
   * Clear the selection
   */
  const clear = useCallback(() => {
    dispatch(clearSelection());
  }, [dispatch]);
  
  return {
    // Data
    selectedShotIds,
    selectedShot,
    shots,
    
    // Computed
    getSelectedShots,
    isSelected,
    
    // Actions
    selectSingleShot,
    addToSelection,
    removeFromSelection,
    clear,
  };
}

