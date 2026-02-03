/**
 * Batch Style Application Hook
 * 
 * Provides functionality for applying visual styles to multiple shots simultaneously
 * Requirements: 11.6
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { applyStyleToMultipleShots } from '../store/slices/timelineSlice';
import { visualStyleService } from '../services/visualStyleService';
import type { Asset, Shot } from '../types';

// ============================================================================
// Hook
// ============================================================================

export function useBatchStyleApplication() {
  const dispatch = useAppDispatch();
  const { shots, selectedElements } = useAppSelector((state) => state.timeline);

  /**
   * Apply a style to all selected shots
   */
  const applyStyleToSelectedShots = useCallback(
    (style: Asset, intensity: number = 100) => {
      if (selectedElements.length === 0) {
        console.warn('No shots selected for batch style application');
        return;
      }

      // Get selected shots
      const selectedShots = shots.filter((shot: Shot) =>
        selectedElements.includes(shot.id)
      );

      if (selectedShots.length === 0) {
        console.warn('No valid shots found in selection');
        return;
      }

      // Apply style using service
      const styledShots = visualStyleService.applyStyleToMultipleShots(
        selectedShots,
        style,
        intensity
      );

      // Create style application object
      const styleApplication = styledShots[0].visualStyle;

      if (!styleApplication) {
        console.error('Failed to create style application');
        return;
      }

      // Dispatch batch update
      dispatch(
        applyStyleToMultipleShots({
          shotIds: selectedElements,
          styleApplication,
        })
      );

      return styledShots.length;
    },
    [dispatch, shots, selectedElements]
  );

  /**
   * Check if selected shots have consistent style
   */
  const checkStyleConsistency = useCallback(() => {
    if (selectedElements.length === 0) {
      return { consistent: true, count: 0 };
    }

    const selectedShots = shots.filter((shot: Shot) =>
      selectedElements.includes(shot.id)
    );

    const consistent = visualStyleService.haveShotsConsistentStyle(selectedShots);

    return {
      consistent,
      count: selectedShots.length,
      hasStyle: selectedShots.some((shot: Shot) => shot.visualStyle !== undefined),
    };
  }, [shots, selectedElements]);

  /**
   * Get common style from selected shots (if consistent)
   */
  const getCommonStyle = useCallback(() => {
    if (selectedElements.length === 0) {
      return null;
    }

    const selectedShots = shots.filter((shot: Shot) =>
      selectedElements.includes(shot.id)
    );

    if (selectedShots.length === 0) {
      return null;
    }

    const firstShot = selectedShots[0];
    if (!firstShot.visualStyle) {
      return null;
    }

    // Check if all shots have the same style
    const consistent = visualStyleService.haveShotsConsistentStyle(selectedShots);

    if (!consistent) {
      return null;
    }

    return firstShot.visualStyle;
  }, [shots, selectedElements]);

  /**
   * Apply style to specific shot IDs
   */
  const applyStyleToShotIds = useCallback(
    (shotIds: string[], style: Asset, intensity: number = 100) => {
      if (shotIds.length === 0) {
        console.warn('No shot IDs provided for batch style application');
        return;
      }

      // Get shots by IDs
      const targetShots = shots.filter((shot: Shot) => shotIds.includes(shot.id));

      if (targetShots.length === 0) {
        console.warn('No valid shots found for provided IDs');
        return;
      }

      // Apply style using service
      const styledShots = visualStyleService.applyStyleToMultipleShots(
        targetShots,
        style,
        intensity
      );

      // Create style application object
      const styleApplication = styledShots[0].visualStyle;

      if (!styleApplication) {
        console.error('Failed to create style application');
        return;
      }

      // Dispatch batch update
      dispatch(
        applyStyleToMultipleShots({
          shotIds,
          styleApplication,
        })
      );

      return styledShots.length;
    },
    [dispatch, shots]
  );

  return {
    applyStyleToSelectedShots,
    applyStyleToShotIds,
    checkStyleConsistency,
    getCommonStyle,
    selectedCount: selectedElements.length,
  };
}

export default useBatchStyleApplication;
