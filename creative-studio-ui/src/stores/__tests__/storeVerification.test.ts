/**
 * Store Verification Tests - Task 3 Checkpoint
 * 
 * This test suite verifies that all stores are properly initialized
 * and their actions work correctly.
 * 
 * Requirements: Task 3 - Checkpoint - Verify state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGridStore, createDefaultGridConfiguration } from '../gridEditorStore';
import { useViewportStore } from '../viewportStore';
import { useUndoRedoStore, createOperation } from '../undoRedoStore';

describe('Store Verification - Task 3 Checkpoint', () => {
  describe('GridStore Initialization and Actions', () => {
    beforeEach(() => {
      // Reset store to default state
      useGridStore.getState().resetConfiguration('test-project');
    });

    it('should initialize with default configuration', () => {
      const state = useGridStore.getState();
      
      expect(state.config).toBeDefined();
      expect(state.config.version).toBe('1.0');
      expect(state.config.projectId).toBe('test-project');
      expect(state.config.panels).toHaveLength(9); // 3x3 grid
      expect(state.selectedPanelIds).toEqual([]);
      expect(state.activeTool).toBe('select');
      expect(state.clipboard).toBeNull();
    });

    it('should have all 9 panels in correct positions', () => {
      const state = useGridStore.getState();
      const panels = state.config.panels;

      // Verify we have panels at all positions
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const panel = panels.find(
            (p) => p.position.row === row && p.position.col === col
          );
          expect(panel).toBeDefined();
          expect(panel?.id).toBe(`panel-${row}-${col}`);
        }
      }
    });

    it('should select a panel correctly', () => {
      const { selectPanel, selectedPanelIds } = useGridStore.getState();
      
      selectPanel('panel-0-0', false);
      
      const state = useGridStore.getState();
      expect(state.selectedPanelIds).toEqual(['panel-0-0']);
    });

    it('should support multi-selection with addToSelection flag', () => {
      const { selectPanel } = useGridStore.getState();
      
      selectPanel('panel-0-0', false);
      selectPanel('panel-0-1', true);
      selectPanel('panel-0-2', true);
      
      const state = useGridStore.getState();
      expect(state.selectedPanelIds).toHaveLength(3);
      expect(state.selectedPanelIds).toContain('panel-0-0');
      expect(state.selectedPanelIds).toContain('panel-0-1');
      expect(state.selectedPanelIds).toContain('panel-0-2');
    });

    it('should deselect all panels', () => {
      const { selectPanel, deselectAll } = useGridStore.getState();
      
      selectPanel('panel-0-0', false);
      selectPanel('panel-0-1', true);
      
      expect(useGridStore.getState().selectedPanelIds).toHaveLength(2);
      
      deselectAll();
      
      expect(useGridStore.getState().selectedPanelIds).toEqual([]);
    });

    it('should update panel transform', () => {
      const { updatePanelTransform, getPanelById } = useGridStore.getState();
      
      const newTransform = {
        position: { x: 100, y: 200 },
        scale: { x: 1.5, y: 1.5 },
        rotation: 45,
        pivot: { x: 0.5, y: 0.5 },
      };
      
      updatePanelTransform('panel-0-0', newTransform);
      
      const panel = getPanelById('panel-0-0');
      expect(panel?.transform).toEqual(newTransform);
    });

    it('should update panel crop', () => {
      const { updatePanelCrop, getPanelById } = useGridStore.getState();
      
      const newCrop = {
        x: 0.1,
        y: 0.1,
        width: 0.8,
        height: 0.8,
      };
      
      updatePanelCrop('panel-0-0', newCrop);
      
      const panel = getPanelById('panel-0-0');
      expect(panel?.crop).toEqual(newCrop);
    });

    it('should add layer to panel', () => {
      const { addLayer, getPanelById } = useGridStore.getState();
      
      const newLayer = {
        id: 'layer-1',
        name: 'Test Layer',
        type: 'image' as const,
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'normal' as const,
        content: {
          type: 'image' as const,
          url: 'test.jpg',
          naturalWidth: 1920,
          naturalHeight: 1080,
        },
      };
      
      addLayer('panel-0-0', newLayer);
      
      const panel = getPanelById('panel-0-0');
      expect(panel?.layers).toHaveLength(1);
      expect(panel?.layers[0]).toEqual(newLayer);
    });

    it('should remove layer from panel', () => {
      const { addLayer, removeLayer, getPanelById } = useGridStore.getState();
      
      const layer = {
        id: 'layer-1',
        name: 'Test Layer',
        type: 'image' as const,
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'normal' as const,
        content: {
          type: 'image' as const,
          url: 'test.jpg',
          naturalWidth: 1920,
          naturalHeight: 1080,
        },
      };
      
      addLayer('panel-0-0', layer);
      expect(getPanelById('panel-0-0')?.layers).toHaveLength(1);
      
      removeLayer('panel-0-0', 'layer-1');
      expect(getPanelById('panel-0-0')?.layers).toHaveLength(0);
    });

    it('should reorder layers correctly', () => {
      const { addLayer, reorderLayers, getPanelById } = useGridStore.getState();
      
      // Add three layers
      const layers = [
        { id: 'layer-1', name: 'Layer 1' },
        { id: 'layer-2', name: 'Layer 2' },
        { id: 'layer-3', name: 'Layer 3' },
      ].map((l) => ({
        ...l,
        type: 'image' as const,
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'normal' as const,
        content: {
          type: 'image' as const,
          url: 'test.jpg',
          naturalWidth: 1920,
          naturalHeight: 1080,
        },
      }));
      
      layers.forEach((layer) => addLayer('panel-0-0', layer));
      
      // Move layer-1 to position 2 (last)
      reorderLayers('panel-0-0', 'layer-1', 2);
      
      const panel = getPanelById('panel-0-0');
      expect(panel?.layers[0].id).toBe('layer-2');
      expect(panel?.layers[1].id).toBe('layer-3');
      expect(panel?.layers[2].id).toBe('layer-1');
    });

    it('should toggle layer visibility', () => {
      const { addLayer, toggleLayerVisibility, getPanelById } = useGridStore.getState();
      
      const layer = {
        id: 'layer-1',
        name: 'Test Layer',
        type: 'image' as const,
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'normal' as const,
        content: {
          type: 'image' as const,
          url: 'test.jpg',
          naturalWidth: 1920,
          naturalHeight: 1080,
        },
      };
      
      addLayer('panel-0-0', layer);
      
      toggleLayerVisibility('panel-0-0', 'layer-1');
      expect(getPanelById('panel-0-0')?.layers[0].visible).toBe(false);
      
      toggleLayerVisibility('panel-0-0', 'layer-1');
      expect(getPanelById('panel-0-0')?.layers[0].visible).toBe(true);
    });

    it('should set active tool', () => {
      const { setActiveTool } = useGridStore.getState();
      
      setActiveTool('crop');
      expect(useGridStore.getState().activeTool).toBe('crop');
      
      setActiveTool('rotate');
      expect(useGridStore.getState().activeTool).toBe('rotate');
    });

    it('should copy and paste panel', () => {
      const { addLayer, copyPanel, pastePanel, getPanelById } = useGridStore.getState();
      
      // Add a layer to source panel
      const layer = {
        id: 'layer-1',
        name: 'Test Layer',
        type: 'image' as const,
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'normal' as const,
        content: {
          type: 'image' as const,
          url: 'test.jpg',
          naturalWidth: 1920,
          naturalHeight: 1080,
        },
      };
      
      addLayer('panel-0-0', layer);
      
      // Copy panel
      copyPanel('panel-0-0');
      expect(useGridStore.getState().clipboard).not.toBeNull();
      
      // Paste to another panel
      pastePanel('panel-0-1');
      
      const targetPanel = getPanelById('panel-0-1');
      expect(targetPanel?.layers).toHaveLength(1);
      expect(targetPanel?.layers[0].name).toBe('Test Layer');
    });

    it('should export and load configuration', () => {
      const { exportConfiguration, loadConfiguration, selectPanel } = useGridStore.getState();
      
      // Make some changes
      selectPanel('panel-0-0', false);
      
      // Export
      const exported = exportConfiguration();
      expect(exported.version).toBe('1.0');
      expect(exported.panels).toHaveLength(9);
      
      // Reset and load
      useGridStore.getState().resetConfiguration('new-project');
      expect(useGridStore.getState().config.projectId).toBe('new-project');
      
      loadConfiguration(exported);
      expect(useGridStore.getState().config.projectId).toBe('test-project');
    });
  });

  describe('ViewportStore Initialization and Actions', () => {
    beforeEach(() => {
      // Reset viewport to default state
      useViewportStore.getState().resetViewport();
    });

    it('should initialize with default values', () => {
      const state = useViewportStore.getState();
      
      expect(state.zoom).toBe(1.0);
      expect(state.pan).toEqual({ x: 0, y: 0 });
      expect(state.focusedPanelId).toBeNull();
      expect(state.minZoom).toBe(0.1);
      expect(state.maxZoom).toBe(10.0);
    });

    it('should set zoom within bounds', () => {
      const { setZoom } = useViewportStore.getState();
      
      setZoom(2.0);
      expect(useViewportStore.getState().zoom).toBe(2.0);
      
      // Test clamping to max
      setZoom(15.0);
      expect(useViewportStore.getState().zoom).toBe(10.0);
      
      // Test clamping to min
      setZoom(0.05);
      expect(useViewportStore.getState().zoom).toBe(0.1);
    });

    it('should set pan offset', () => {
      const { setPan } = useViewportStore.getState();
      
      setPan({ x: 100, y: 200 });
      
      const state = useViewportStore.getState();
      expect(state.pan).toEqual({ x: 100, y: 200 });
    });

    it('should zoom in and out', () => {
      const { zoomIn, zoomOut } = useViewportStore.getState();
      
      const initialZoom = useViewportStore.getState().zoom;
      
      zoomIn();
      const zoomedIn = useViewportStore.getState().zoom;
      expect(zoomedIn).toBeGreaterThan(initialZoom);
      
      zoomOut();
      const zoomedOut = useViewportStore.getState().zoom;
      expect(zoomedOut).toBeLessThan(zoomedIn);
    });

    it('should zoom to actual size', () => {
      const { setZoom, zoomToActual } = useViewportStore.getState();
      
      setZoom(2.5);
      expect(useViewportStore.getState().zoom).toBe(2.5);
      
      zoomToActual();
      expect(useViewportStore.getState().zoom).toBe(1.0);
    });

    it('should pan by delta', () => {
      const { panBy } = useViewportStore.getState();
      
      panBy({ x: 50, y: 100 });
      expect(useViewportStore.getState().pan).toEqual({ x: 50, y: 100 });
      
      panBy({ x: 25, y: -50 });
      expect(useViewportStore.getState().pan).toEqual({ x: 75, y: 50 });
    });

    it('should focus and exit focus mode', () => {
      const { focusPanel, exitFocusMode, isFocused } = useViewportStore.getState();
      
      focusPanel('panel-0-0', { width: 640, height: 480 });
      
      expect(useViewportStore.getState().focusedPanelId).toBe('panel-0-0');
      expect(isFocused('panel-0-0')).toBe(true);
      expect(isFocused('panel-0-1')).toBe(false);
      
      exitFocusMode();
      expect(useViewportStore.getState().focusedPanelId).toBeNull();
      expect(isFocused('panel-0-0')).toBe(false);
    });

    it('should fit to view', () => {
      const { fitToView, setBounds } = useViewportStore.getState();
      
      setBounds({ width: 1920, height: 1080 });
      
      fitToView({ width: 3840, height: 2160 });
      
      const state = useViewportStore.getState();
      expect(state.zoom).toBeLessThan(1.0); // Should zoom out to fit
      expect(state.focusedPanelId).toBeNull();
    });

    it('should transform coordinates between screen and canvas', () => {
      const { screenToCanvas, canvasToScreen, setZoom, setPan } = useViewportStore.getState();
      
      setZoom(2.0);
      setPan({ x: 100, y: 50 });
      
      // Test screen to canvas
      const canvasPoint = screenToCanvas({ x: 300, y: 250 });
      expect(canvasPoint.x).toBe(100); // (300 - 100) / 2
      expect(canvasPoint.y).toBe(100); // (250 - 50) / 2
      
      // Test canvas to screen (round trip)
      const screenPoint = canvasToScreen(canvasPoint);
      expect(screenPoint.x).toBe(300);
      expect(screenPoint.y).toBe(250);
    });

    it('should get viewport state', () => {
      const { getViewportState, setZoom, setPan, setBounds } = useViewportStore.getState();
      
      setZoom(1.5);
      setPan({ x: 50, y: 75 });
      setBounds({ width: 1920, height: 1080 });
      
      const state = getViewportState();
      expect(state.zoom).toBe(1.5);
      expect(state.pan).toEqual({ x: 50, y: 75 });
      expect(state.bounds).toEqual({ width: 1920, height: 1080 });
    });
  });

  describe('UndoRedoStore Initialization and Actions', () => {
    beforeEach(() => {
      // Clear history
      useUndoRedoStore.getState().clearHistory();
    });

    it('should initialize with empty stacks', () => {
      const state = useUndoRedoStore.getState();
      
      expect(state.undoStack).toEqual([]);
      expect(state.redoStack).toEqual([]);
      expect(state.maxStackSize).toBe(100);
      expect(state.canUndo()).toBe(false);
      expect(state.canRedo()).toBe(false);
    });

    it('should push operations to undo stack', () => {
      const { pushOperation } = useUndoRedoStore.getState();
      
      const operation = createOperation(
        'transform',
        'Move panel',
        'panel-0-0',
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      );
      
      pushOperation(operation);
      
      const state = useUndoRedoStore.getState();
      expect(state.undoStack).toHaveLength(1);
      expect(state.undoStack[0]).toEqual(operation);
      expect(state.canUndo()).toBe(true);
    });

    it('should undo operation', () => {
      const { pushOperation, undo } = useUndoRedoStore.getState();
      
      const operation = createOperation(
        'transform',
        'Move panel',
        'panel-0-0',
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      );
      
      pushOperation(operation);
      
      const undoneOp = undo();
      
      expect(undoneOp).toEqual(operation);
      expect(useUndoRedoStore.getState().undoStack).toHaveLength(0);
      expect(useUndoRedoStore.getState().redoStack).toHaveLength(1);
      expect(useUndoRedoStore.getState().canRedo()).toBe(true);
    });

    it('should redo operation', () => {
      const { pushOperation, undo, redo } = useUndoRedoStore.getState();
      
      const operation = createOperation(
        'transform',
        'Move panel',
        'panel-0-0',
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      );
      
      pushOperation(operation);
      undo();
      
      const redoneOp = redo();
      
      expect(redoneOp).toEqual(operation);
      expect(useUndoRedoStore.getState().undoStack).toHaveLength(1);
      expect(useUndoRedoStore.getState().redoStack).toHaveLength(0);
      expect(useUndoRedoStore.getState().canUndo()).toBe(true);
      expect(useUndoRedoStore.getState().canRedo()).toBe(false);
    });

    it('should clear redo stack when new operation is pushed', () => {
      const { pushOperation, undo } = useUndoRedoStore.getState();
      
      const op1 = createOperation('transform', 'Op 1', 'panel-0-0', {}, {});
      const op2 = createOperation('crop', 'Op 2', 'panel-0-0', {}, {});
      const op3 = createOperation('layer_add', 'Op 3', 'panel-0-0', {}, {});
      
      pushOperation(op1);
      pushOperation(op2);
      undo();
      
      expect(useUndoRedoStore.getState().redoStack).toHaveLength(1);
      
      // Push new operation should clear redo stack
      pushOperation(op3);
      
      expect(useUndoRedoStore.getState().redoStack).toHaveLength(0);
      expect(useUndoRedoStore.getState().undoStack).toHaveLength(2);
    });

    it('should enforce max stack size', () => {
      const { pushOperation, setMaxStackSize } = useUndoRedoStore.getState();
      
      setMaxStackSize(3);
      
      // Push 5 operations
      for (let i = 0; i < 5; i++) {
        pushOperation(createOperation('transform', `Op ${i}`, 'panel-0-0', {}, {}));
      }
      
      const state = useUndoRedoStore.getState();
      expect(state.undoStack).toHaveLength(3);
      // Should keep the most recent 3 operations
      expect(state.undoStack[0].description).toBe('Op 2');
      expect(state.undoStack[1].description).toBe('Op 3');
      expect(state.undoStack[2].description).toBe('Op 4');
    });

    it('should return null when undo/redo on empty stack', () => {
      const { undo, redo } = useUndoRedoStore.getState();
      
      expect(undo()).toBeNull();
      expect(redo()).toBeNull();
    });

    it('should clear history', () => {
      const { pushOperation, clearHistory } = useUndoRedoStore.getState();
      
      pushOperation(createOperation('transform', 'Op 1', 'panel-0-0', {}, {}));
      pushOperation(createOperation('crop', 'Op 2', 'panel-0-0', {}, {}));
      
      expect(useUndoRedoStore.getState().undoStack).toHaveLength(2);
      
      clearHistory();
      
      expect(useUndoRedoStore.getState().undoStack).toHaveLength(0);
      expect(useUndoRedoStore.getState().redoStack).toHaveLength(0);
    });

    it('should get undo and redo stacks', () => {
      const { pushOperation, undo, getUndoStack, getRedoStack } = useUndoRedoStore.getState();
      
      const op1 = createOperation('transform', 'Op 1', 'panel-0-0', {}, {});
      const op2 = createOperation('crop', 'Op 2', 'panel-0-0', {}, {});
      
      pushOperation(op1);
      pushOperation(op2);
      undo();
      
      const undoStack = getUndoStack();
      const redoStack = getRedoStack();
      
      expect(undoStack).toHaveLength(1);
      expect(undoStack[0]).toEqual(op1);
      expect(redoStack).toHaveLength(1);
      expect(redoStack[0]).toEqual(op2);
    });
  });

  describe('Store Integration', () => {
    beforeEach(() => {
      useGridStore.getState().resetConfiguration('test-project');
      useViewportStore.getState().resetViewport();
      useUndoRedoStore.getState().clearHistory();
    });

    it('should work together for a complete workflow', () => {
      // Select a panel
      useGridStore.getState().selectPanel('panel-0-0', false);
      expect(useGridStore.getState().selectedPanelIds).toEqual(['panel-0-0']);
      
      // Update transform and record operation
      const oldTransform = useGridStore.getState().getPanelById('panel-0-0')?.transform;
      const newTransform = {
        position: { x: 100, y: 100 },
        scale: { x: 1.5, y: 1.5 },
        rotation: 45,
        pivot: { x: 0.5, y: 0.5 },
      };
      
      useGridStore.getState().updatePanelTransform('panel-0-0', newTransform);
      
      const operation = createOperation(
        'transform',
        'Transform panel',
        'panel-0-0',
        oldTransform,
        newTransform
      );
      useUndoRedoStore.getState().pushOperation(operation);
      
      // Verify transform was applied
      expect(useGridStore.getState().getPanelById('panel-0-0')?.transform).toEqual(newTransform);
      
      // Verify operation was recorded
      expect(useUndoRedoStore.getState().canUndo()).toBe(true);
      
      // Zoom viewport
      useViewportStore.getState().setZoom(2.0);
      expect(useViewportStore.getState().zoom).toBe(2.0);
      
      // Undo transform
      const undoneOp = useUndoRedoStore.getState().undo();
      expect(undoneOp).not.toBeNull();
      
      // In a real implementation, we would apply the undo here
      // For this test, we just verify the operation was undone from the stack
      expect(useUndoRedoStore.getState().canRedo()).toBe(true);
    });
  });
});
