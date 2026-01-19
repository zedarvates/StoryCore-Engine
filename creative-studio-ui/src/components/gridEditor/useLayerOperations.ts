/**
 * useLayerOperations Hook - Integration of layer operations with store
 * 
 * Provides a convenient interface for layer management operations
 * that integrates with the GridStore and UndoRedoStore.
 * 
 * Requirements: 5.1, 5.3, 5.4, 5.5, 5.7, 5.8
 */

import { useCallback } from 'react';
import { useGridStore } from '../../stores/gridEditorStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import {
  createImageLayer,
  createAnnotationLayer,
  createEffectLayer,
  duplicateLayer,
  validateLayer,
  canModifyLayer,
  canDeleteLayer,
} from './LayerOperations';
import { Layer } from '../../types/gridEditor';

/**
 * Hook for layer operations with undo/redo support
 */
export const useLayerOperations = (panelId: string | null) => {
  const {
    addLayer,
    removeLayer,
    updateLayer,
    toggleLayerVisibility,
    toggleLayerLock,
    reorderLayers,
    getPanelById,
  } = useGridStore();

  const { pushOperation } = useUndoRedoStore();

  /**
   * Add a new layer to the panel
   */
  const handleAddLayer = useCallback((type: 'image' | 'annotation' | 'effect') => {
    if (!panelId) return;

    let newLayer: Layer;

    switch (type) {
      case 'image':
        // For now, create an empty image layer
        // In a real implementation, this would open a file picker
        newLayer = createImageLayer(
          '/placeholder-image.png',
          800,
          600,
          `Image Layer ${Date.now()}`
        );
        break;
      case 'annotation':
        newLayer = createAnnotationLayer(`Annotation Layer ${Date.now()}`);
        break;
      case 'effect':
        newLayer = createEffectLayer('blur', { radius: 5 }, `Effect Layer ${Date.now()}`);
        break;
      default:
        return;
    }

    // Validate layer
    const validation = validateLayer(newLayer);
    if (!validation.success) {
      console.error('Invalid layer:', validation.error);
      return;
    }

    // Get current state for undo
    const panel = getPanelById(panelId);
    if (!panel) return;

    const beforeState = { layers: panel.layers };

    // Add layer
    addLayer(panelId, newLayer);

    // Record operation for undo
    const afterState = { layers: [...panel.layers, newLayer] };
    pushOperation({
      type: 'layer_add',
      timestamp: Date.now(),
      description: `Add ${type} layer`,
      data: {
        panelId,
        before: beforeState,
        after: afterState,
      },
    });
  }, [panelId, addLayer, getPanelById, pushOperation]);

  /**
   * Delete a layer from the panel
   */
  const handleDeleteLayer = useCallback((layerId: string) => {
    if (!panelId) return;

    const panel = getPanelById(panelId);
    if (!panel) return;

    const layer = panel.layers.find(l => l.id === layerId);
    if (!layer) return;

    // Check if layer can be deleted
    if (!canDeleteLayer(layer, panel.layers.length)) {
      console.warn('Cannot delete locked layer');
      return;
    }

    // Get current state for undo
    const beforeState = { layers: panel.layers };

    // Remove layer
    removeLayer(panelId, layerId);

    // Record operation for undo
    const afterState = { layers: panel.layers.filter(l => l.id !== layerId) };
    pushOperation({
      type: 'layer_remove',
      timestamp: Date.now(),
      description: `Remove layer "${layer.name}"`,
      data: {
        panelId,
        before: beforeState,
        after: afterState,
      },
    });
  }, [panelId, removeLayer, getPanelById, pushOperation]);

  /**
   * Toggle layer visibility
   */
  const handleToggleVisibility = useCallback((layerId: string) => {
    if (!panelId) return;

    const panel = getPanelById(panelId);
    if (!panel) return;

    const layer = panel.layers.find(l => l.id === layerId);
    if (!layer) return;

    // Get current state for undo
    const beforeState = { visible: layer.visible };

    // Toggle visibility
    toggleLayerVisibility(panelId, layerId);

    // Record operation for undo
    const afterState = { visible: !layer.visible };
    pushOperation({
      type: 'layer_modify',
      timestamp: Date.now(),
      description: `Toggle layer visibility`,
      data: {
        panelId,
        before: beforeState,
        after: afterState,
      },
    });
  }, [panelId, toggleLayerVisibility, getPanelById, pushOperation]);

  /**
   * Toggle layer lock
   */
  const handleToggleLock = useCallback((layerId: string) => {
    if (!panelId) return;

    const panel = getPanelById(panelId);
    if (!panel) return;

    const layer = panel.layers.find(l => l.id === layerId);
    if (!layer) return;

    // Get current state for undo
    const beforeState = { locked: layer.locked };

    // Toggle lock
    toggleLayerLock(panelId, layerId);

    // Record operation for undo
    const afterState = { locked: !layer.locked };
    pushOperation({
      type: 'layer_modify',
      timestamp: Date.now(),
      description: `Toggle layer lock`,
      data: {
        panelId,
        before: beforeState,
        after: afterState,
      },
    });
  }, [panelId, toggleLayerLock, getPanelById, pushOperation]);

  /**
   * Update layer opacity
   */
  const handleOpacityChange = useCallback((layerId: string, opacity: number) => {
    if (!panelId) return;

    const panel = getPanelById(panelId);
    if (!panel) return;

    const layer = panel.layers.find(l => l.id === layerId);
    if (!layer) return;

    // Check if layer can be modified
    if (!canModifyLayer(layer)) {
      console.warn('Cannot modify locked layer');
      return;
    }

    // Get current state for undo
    const beforeState = { opacity: layer.opacity };

    // Update opacity
    updateLayer(panelId, layerId, { opacity });

    // Record operation for undo
    const afterState = { opacity };
    pushOperation({
      type: 'layer_modify',
      timestamp: Date.now(),
      description: `Change layer opacity`,
      data: {
        panelId,
        before: beforeState,
        after: afterState,
      },
    });
  }, [panelId, updateLayer, getPanelById, pushOperation]);

  /**
   * Reorder layers
   */
  const handleReorderLayers = useCallback((layerId: string, newIndex: number) => {
    if (!panelId) return;

    const panel = getPanelById(panelId);
    if (!panel) return;

    const currentIndex = panel.layers.findIndex(l => l.id === layerId);
    if (currentIndex === -1) return;

    // Get current state for undo
    const beforeState = { layerOrder: panel.layers.map(l => l.id) };

    // Reorder layers
    reorderLayers(panelId, layerId, newIndex);

    // Record operation for undo
    const newLayers = [...panel.layers];
    const [layer] = newLayers.splice(currentIndex, 1);
    newLayers.splice(newIndex, 0, layer);
    const afterState = { layerOrder: newLayers.map(l => l.id) };

    pushOperation({
      type: 'layer_reorder',
      timestamp: Date.now(),
      description: `Reorder layers`,
      data: {
        panelId,
        before: beforeState,
        after: afterState,
      },
    });
  }, [panelId, reorderLayers, getPanelById, pushOperation]);

  /**
   * Duplicate a layer
   */
  const handleDuplicateLayer = useCallback((layerId: string) => {
    if (!panelId) return;

    const panel = getPanelById(panelId);
    if (!panel) return;

    const layer = panel.layers.find(l => l.id === layerId);
    if (!layer) return;

    // Create duplicate
    const newLayer = duplicateLayer(layer);

    // Validate layer
    const validation = validateLayer(newLayer);
    if (!validation.success) {
      console.error('Invalid layer:', validation.error);
      return;
    }

    // Get current state for undo
    const beforeState = { layers: panel.layers };

    // Add duplicated layer
    addLayer(panelId, newLayer);

    // Record operation for undo
    const afterState = { layers: [...panel.layers, newLayer] };
    pushOperation({
      type: 'layer_add',
      timestamp: Date.now(),
      description: `Duplicate layer "${layer.name}"`,
      data: {
        panelId,
        before: beforeState,
        after: afterState,
      },
    });
  }, [panelId, addLayer, getPanelById, pushOperation]);

  return {
    handleAddLayer,
    handleDeleteLayer,
    handleToggleVisibility,
    handleToggleLock,
    handleOpacityChange,
    handleReorderLayers,
    handleDuplicateLayer,
  };
};
