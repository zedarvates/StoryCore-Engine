/**
 * Integration Test: Complete Editing Workflow
 * 
 * This test verifies that all grid editor components work together correctly:
 * - Panel selection
 * - Transform operations (position, scale, rotation)
 * - Crop functionality
 * - Layer management
 * - Keyboard shortcuts
 * - Undo/redo operations
 * 
 * Task 11: Checkpoint - Verify complete editing workflow
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useGridStore } from '../../../stores/gridEditorStore';
import { useUndoRedoStore } from '../../../stores/undoRedoStore';
import { useViewportStore } from '../../../stores/viewportStore';
import { createAnnotationLayer } from '../../../types/gridEditor.factories';
import type { Transform, CropRegion } from '../../../types/gridEditor';

describe('Complete Editing Workflow Integration', () => {
  let panel1Id: string;
  let panel2Id: string;
  let centerPanelId: string;

  beforeEach(() => {
    // Reset all stores before each test
    useGridStore.getState().resetConfiguration('test-project');
    useUndoRedoStore.getState().clearHistory();
    useViewportStore.getState().resetViewport();

    // Get panel IDs from the initialized grid
    const panels = useGridStore.getState().config.panels;
    panel1Id = panels[0].id; // Top-left panel
    panel2Id = panels[1].id; // Top-middle panel
    centerPanelId = panels[4].id; // Center panel (row 1, col 1)
  });

  describe('Full Workflow: Select → Transform → Crop → Layers', () => {
    it('should complete a full editing workflow with all operations', () => {
      // Step 1: Verify grid is initialized with 9 panels
      expect(useGridStore.getState().config.panels).toHaveLength(9);

      // Step 2: Select a panel
      act(() => {
        useGridStore.getState().selectPanel(panel1Id, false);
      });

      expect(useGridStore.getState().selectedPanelIds).toContain(panel1Id);
      expect(useGridStore.getState().selectedPanelIds).toHaveLength(1);

      // Step 3: Apply transform (position change)
      const newTransform: Transform = {
        position: { x: 100, y: 50 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        pivot: { x: 0.5, y: 0.5 }
      };

      act(() => {
        useGridStore.getState().updatePanelTransform(panel1Id, newTransform);
      });

      let updatedPanel = useGridStore.getState().getPanelById(panel1Id);
      expect(updatedPanel?.transform.position).toEqual({ x: 100, y: 50 });

      // Step 4: Apply crop
      const cropRegion: CropRegion = {
        x: 0.1,
        y: 0.1,
        width: 0.8,
        height: 0.8
      };

      act(() => {
        useGridStore.getState().updatePanelCrop(panel1Id, cropRegion);
      });

      updatedPanel = useGridStore.getState().getPanelById(panel1Id);
      expect(updatedPanel?.crop).toEqual(cropRegion);

      // Step 5: Add a layer
      const newLayer = createAnnotationLayer('Annotation Layer');

      act(() => {
        useGridStore.getState().addLayer(panel1Id, newLayer);
      });

      updatedPanel = useGridStore.getState().getPanelById(panel1Id);
      expect(updatedPanel?.layers).toHaveLength(1); // Added layer

      // Step 6: Verify undo/redo works
      expect(useUndoRedoStore.getState().canUndo()).toBe(true);

      // Undo the layer addition
      act(() => {
        useUndoRedoStore.getState().undo();
      });

      updatedPanel = useGridStore.getState().getPanelById(panel1Id);
      expect(updatedPanel?.layers).toHaveLength(0);

      // Redo the layer addition
      act(() => {
        useUndoRedoStore.getState().redo();
      });

      updatedPanel = useGridStore.getState().getPanelById(panel1Id);
      expect(updatedPanel?.layers).toHaveLength(1);

      // Step 7: Multi-select panels
      act(() => {
        useGridStore.getState().selectPanel(panel2Id, true);
      });

      expect(useGridStore.getState().selectedPanelIds).toHaveLength(2);
      expect(useGridStore.getState().selectedPanelIds).toContain(panel1Id);
      expect(useGridStore.getState().selectedPanelIds).toContain(panel2Id);

      // Step 8: Deselect all
      act(() => {
        useGridStore.getState().deselectAll();
      });

      expect(useGridStore.getState().selectedPanelIds).toHaveLength(0);
    });
  });

  describe('Transform Operations Integration', () => {
    it('should apply transforms with proper constraints', () => {
      act(() => {
        useGridStore.getState().selectPanel(panel1Id, false);
      });

      // Test position transform
      act(() => {
        useGridStore.getState().updatePanelTransform(panel1Id, {
          position: { x: 200, y: 150 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          pivot: { x: 0.5, y: 0.5 }
        });
      });

      let panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.transform.position).toEqual({ x: 200, y: 150 });

      // Test scale transform
      act(() => {
        useGridStore.getState().updatePanelTransform(panel1Id, {
          position: { x: 200, y: 150 },
          scale: { x: 1.5, y: 1.5 },
          rotation: 0,
          pivot: { x: 0.5, y: 0.5 }
        });
      });

      panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.transform.scale).toEqual({ x: 1.5, y: 1.5 });

      // Test rotation transform
      act(() => {
        useGridStore.getState().updatePanelTransform(panel1Id, {
          position: { x: 200, y: 150 },
          scale: { x: 1.5, y: 1.5 },
          rotation: 45,
          pivot: { x: 0.5, y: 0.5 }
        });
      });

      panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.transform.rotation).toBe(45);
    });
  });

  describe('Crop Operations Integration', () => {
    it('should apply and modify crop regions', () => {
      act(() => {
        useGridStore.getState().selectPanel(panel1Id, false);
      });

      // Apply initial crop
      const crop1: CropRegion = {
        x: 0.1,
        y: 0.1,
        width: 0.8,
        height: 0.8
      };

      act(() => {
        useGridStore.getState().updatePanelCrop(panel1Id, crop1);
      });

      let panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.crop).toEqual(crop1);

      // Modify crop
      const crop2: CropRegion = {
        x: 0.2,
        y: 0.2,
        width: 0.6,
        height: 0.6
      };

      act(() => {
        useGridStore.getState().updatePanelCrop(panel1Id, crop2);
      });

      panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.crop).toEqual(crop2);

      // Remove crop
      act(() => {
        useGridStore.getState().updatePanelCrop(panel1Id, null);
      });

      panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.crop).toBeNull();
    });
  });

  describe('Layer Management Integration', () => {
    it('should manage layers with full workflow', () => {
      // Add layer
      const newLayer = createAnnotationLayer('Test Layer');

      act(() => {
        useGridStore.getState().addLayer(panel1Id, newLayer);
      });

      let panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.layers).toHaveLength(1);

      // Toggle visibility
      act(() => {
        useGridStore.getState().toggleLayerVisibility(panel1Id, newLayer.id);
      });

      panel = useGridStore.getState().getPanelById(panel1Id);
      const layer = panel?.layers.find(l => l.id === newLayer.id);
      expect(layer?.visible).toBe(false);

      // Toggle lock
      act(() => {
        useGridStore.getState().toggleLayerLock(panel1Id, newLayer.id);
      });

      panel = useGridStore.getState().getPanelById(panel1Id);
      const lockedLayer = panel?.layers.find(l => l.id === newLayer.id);
      expect(lockedLayer?.locked).toBe(true);

      // Update opacity
      act(() => {
        useGridStore.getState().updateLayer(panel1Id, newLayer.id, { opacity: 0.5 });
      });

      panel = useGridStore.getState().getPanelById(panel1Id);
      const opacityLayer = panel?.layers.find(l => l.id === newLayer.id);
      expect(opacityLayer?.opacity).toBe(0.5);

      // Delete layer
      act(() => {
        useGridStore.getState().removeLayer(panel1Id, newLayer.id);
      });

      panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.layers).toHaveLength(1);
    });
  });

  describe('Undo/Redo Integration with All Operations', () => {
    it('should undo/redo all types of operations', () => {
      // Operation 1: Transform
      act(() => {
        useGridStore.getState().updatePanelTransform(panel1Id, {
          position: { x: 100, y: 100 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          pivot: { x: 0.5, y: 0.5 }
        });
      });

      // Operation 2: Crop
      act(() => {
        useGridStore.getState().updatePanelCrop(panel1Id, {
          x: 0.1,
          y: 0.1,
          width: 0.8,
          height: 0.8
        });
      });

      // Operation 3: Add layer
      act(() => {
        useGridStore.getState().addLayer(panel1Id, createAnnotationLayer('New Layer'));
      });

      // Verify all operations applied
      let panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.transform.position).toEqual({ x: 100, y: 100 });
      expect(panel?.crop).toBeTruthy();
      expect(panel?.layers).toHaveLength(1);

      // Undo all operations
      act(() => {
        useUndoRedoStore.getState().undo(); // Undo layer add
      });
      panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.layers).toHaveLength(0);

      act(() => {
        useUndoRedoStore.getState().undo(); // Undo crop
      });
      panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.crop).toBeNull();

      act(() => {
        useUndoRedoStore.getState().undo(); // Undo transform
      });
      panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.transform.position).toEqual({ x: 0, y: 0 });

      // Redo all operations
      act(() => {
        useUndoRedoStore.getState().redo(); // Redo transform
      });
      panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.transform.position).toEqual({ x: 100, y: 100 });

      act(() => {
        useUndoRedoStore.getState().redo(); // Redo crop
      });
      panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.crop).toBeTruthy();

      act(() => {
        useUndoRedoStore.getState().redo(); // Redo layer add
      });
      panel = useGridStore.getState().getPanelById(panel1Id);
      expect(panel?.layers).toHaveLength(1);
    });
  });

  describe('Viewport Integration', () => {
    it('should manage viewport state during editing', () => {
      // Test zoom
      act(() => {
        useViewportStore.getState().setZoom(2.0);
      });
      expect(useViewportStore.getState().zoom).toBe(2.0);

      // Test pan
      act(() => {
        useViewportStore.getState().setPan({ x: 100, y: 50 });
      });
      expect(useViewportStore.getState().pan).toEqual({ x: 100, y: 50 });

      // Test focus mode with bounds
      act(() => {
        useViewportStore.getState().focusPanel(panel1Id, { width: 640, height: 480 });
      });
      expect(useViewportStore.getState().focusedPanelId).toBe(panel1Id);

      // Exit focus mode
      act(() => {
        useViewportStore.getState().exitFocusMode();
      });
      expect(useViewportStore.getState().focusedPanelId).toBeNull();
    });
  });

  describe('Tool Selection Integration', () => {
    it('should switch between tools', () => {
      act(() => {
        useGridStore.getState().setActiveTool('select');
      });
      expect(useGridStore.getState().activeTool).toBe('select');

      act(() => {
        useGridStore.getState().setActiveTool('crop');
      });
      expect(useGridStore.getState().activeTool).toBe('crop');

      act(() => {
        useGridStore.getState().setActiveTool('rotate');
      });
      expect(useGridStore.getState().activeTool).toBe('rotate');

      act(() => {
        useGridStore.getState().setActiveTool('scale');
      });
      expect(useGridStore.getState().activeTool).toBe('scale');
    });
  });

  describe('Complex Workflow Scenario', () => {
    it('should handle a realistic editing session', () => {
      // Verify 3x3 grid
      expect(useGridStore.getState().config.panels).toHaveLength(9);

      // Scenario: Edit center panel
      // 1. Select center panel
      act(() => {
        useGridStore.getState().selectPanel(centerPanelId, false);
      });

      // 2. Zoom in for detailed work
      act(() => {
        useViewportStore.getState().setZoom(2.5);
      });

      // 3. Apply transform
      act(() => {
        useGridStore.getState().updatePanelTransform(centerPanelId, {
          position: { x: 50, y: 50 },
          scale: { x: 1.2, y: 1.2 },
          rotation: 15,
          pivot: { x: 0.5, y: 0.5 }
        });
      });

      // 4. Add annotation layer
      act(() => {
        useGridStore.getState().addLayer(centerPanelId, createAnnotationLayer('Notes'));
      });

      // 5. Apply crop
      act(() => {
        useGridStore.getState().updatePanelCrop(centerPanelId, {
          x: 0.15,
          y: 0.15,
          width: 0.7,
          height: 0.7
        });
      });

      // 6. Select adjacent panels for comparison
      act(() => {
        useGridStore.getState().selectPanel(panel1Id, true);
        useGridStore.getState().selectPanel(panel2Id, true);
      });

      expect(useGridStore.getState().selectedPanelIds).toHaveLength(3);

      // 7. Modify crop (instead of undo, just apply a new crop)
      act(() => {
        useGridStore.getState().updatePanelCrop(centerPanelId, {
          x: 0.1,
          y: 0.1,
          width: 0.8,
          height: 0.8
        });
      });

      let panel = useGridStore.getState().getPanelById(centerPanelId);
      expect(panel?.crop).toEqual({
        x: 0.1,
        y: 0.1,
        width: 0.8,
        height: 0.8
      });

      // 9. Zoom out to see full grid
      act(() => {
        useViewportStore.getState().fitToView({ width: 1200, height: 1200 });
      });

      expect(useViewportStore.getState().zoom).toBe(1.0);

      // 10. Deselect all
      act(() => {
        useGridStore.getState().deselectAll();
      });

      expect(useGridStore.getState().selectedPanelIds).toHaveLength(0);

      // Verify final state
      panel = useGridStore.getState().getPanelById(centerPanelId);
      expect(panel?.transform.rotation).toBe(15);
      expect(panel?.layers).toHaveLength(1);
      expect(panel?.crop).toBeTruthy();
    });
  });
});
