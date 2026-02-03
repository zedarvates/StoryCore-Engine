/**
 * useTemplates Hook
 * 
 * Manages template application and creation.
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import { useCallback, useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { addShot } from '../store/slices/timelineSlice';
import {
  applySceneTemplate,
  applyNarrativePreset,
  createTemplateFromShots,
  createNarrativePreset,
  saveCustomTemplate,
  loadCustomTemplates,
  deleteCustomTemplate,
  saveNarrativePreset,
  loadNarrativePresets,
  deleteNarrativePreset,
  getBuiltInTemplates,
  getBuiltInPresets,
  isSceneTemplate,
  isNarrativePreset,
  type SceneTemplate,
  type NarrativePreset,
} from '../services/templateService';
import type { Asset, Shot } from '../types';

// ============================================================================
// Hook
// ============================================================================

export function useTemplates() {
  const dispatch = useAppDispatch();
  const { shots, playheadPosition } = useAppSelector((state) => state.timeline);
  const { selectedElements } = useAppSelector((state) => state.timeline);
  
  const [customTemplates, setCustomTemplates] = useState<SceneTemplate[]>([]);
  const [customPresets, setCustomPresets] = useState<NarrativePreset[]>([]);

  // Load custom templates and presets on mount
  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
    setCustomPresets(loadNarrativePresets());
  }, []);

  /**
   * Apply a scene template to the timeline
   */
  const applyTemplate = useCallback(
    (asset: Asset, startTime?: number) => {
      if (!isSceneTemplate(asset)) {
        console.error('Asset is not a scene template');
        return;
      }

      // Find the template (built-in or custom)
      const builtInTemplates = getBuiltInTemplates();
      const allTemplates = [...builtInTemplates, ...customTemplates];
      const template = allTemplates.find((t) => t.id === asset.id);

      if (!template) {
        console.error('Template not found');
        return;
      }

      // Use provided start time or current playhead position
      const insertTime = startTime !== undefined ? startTime : playheadPosition;

      // Apply template and create shots
      const newShots = applySceneTemplate(template, insertTime);

      // Add shots to timeline
      newShots.forEach((shot) => {
        dispatch(addShot(shot));
      });

      return newShots;
    },
    [dispatch, playheadPosition, customTemplates]
  );

  /**
   * Apply a narrative preset to selected shots
   */
  const applyPreset = useCallback(
    (asset: Asset, targetShots?: Shot[]) => {
      if (!isNarrativePreset(asset)) {
        console.error('Asset is not a narrative preset');
        return;
      }

      // Find the preset (built-in or custom)
      const builtInPresets = getBuiltInPresets();
      const allPresets = [...builtInPresets, ...customPresets];
      const preset = allPresets.find((p) => p.id === asset.id);

      if (!preset) {
        console.error('Preset not found');
        return;
      }

      // Use provided shots or selected shots
      const shotsToUpdate = targetShots || shots.filter((shot) =>
        selectedElements.includes(shot.id)
      );

      if (shotsToUpdate.length === 0) {
        console.warn('No shots selected to apply preset');
        return;
      }

      // Apply preset to shots
      const updatedShots = applyNarrativePreset(preset, shotsToUpdate);

      // Update shots in timeline (would need updateShot action)
      // For now, we'll just return the updated shots
      return updatedShots;
    },
    [shots, selectedElements, customPresets]
  );

  /**
   * Create a custom template from selected shots
   */
  const createTemplate = useCallback(
    (name: string, description: string, genre: string, tags: string[] = []) => {
      const selectedShots = shots.filter((shot) =>
        selectedElements.includes(shot.id)
      );

      if (selectedShots.length === 0) {
        throw new Error('No shots selected to create template');
      }

      const template = createTemplateFromShots(
        selectedShots,
        name,
        description,
        genre,
        tags
      );

      // Save to local storage
      saveCustomTemplate(template);

      // Update state
      setCustomTemplates((prev) => [...prev, template]);

      return template;
    },
    [shots, selectedElements]
  );

  /**
   * Create a custom narrative preset
   */
  const createPreset = useCallback(
    (
      name: string,
      description: string,
      styleParameters: NarrativePreset['styleParameters'],
      shotDefaults: NarrativePreset['shotDefaults'],
      tags: string[] = []
    ) => {
      const preset = createNarrativePreset(
        name,
        description,
        styleParameters,
        shotDefaults,
        tags
      );

      // Save to local storage
      saveNarrativePreset(preset);

      // Update state
      setCustomPresets((prev) => [...prev, preset]);

      return preset;
    },
    []
  );

  /**
   * Delete a custom template
   */
  const removeTemplate = useCallback((templateId: string) => {
    deleteCustomTemplate(templateId);
    setCustomTemplates((prev) => prev.filter((t) => t.id !== templateId));
  }, []);

  /**
   * Delete a custom preset
   */
  const removePreset = useCallback((presetId: string) => {
    deleteNarrativePreset(presetId);
    setCustomPresets((prev) => prev.filter((p) => p.id !== presetId));
  }, []);

  /**
   * Get all available templates (built-in + custom)
   */
  const getAllTemplates = useCallback(() => {
    return [...getBuiltInTemplates(), ...customTemplates];
  }, [customTemplates]);

  /**
   * Get all available presets (built-in + custom)
   */
  const getAllPresets = useCallback(() => {
    return [...getBuiltInPresets(), ...customPresets];
  }, [customPresets]);

  return {
    // Application
    applyTemplate,
    applyPreset,
    
    // Creation
    createTemplate,
    createPreset,
    
    // Deletion
    removeTemplate,
    removePreset,
    
    // Retrieval
    getAllTemplates,
    getAllPresets,
    customTemplates,
    customPresets,
  };
}

export default useTemplates;
