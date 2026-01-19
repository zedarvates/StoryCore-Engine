# Grid Editor Stores

This directory contains the Zustand state management stores for the Advanced Grid Editor feature.

## Overview

The Advanced Grid Editor uses three separate Zustand stores to manage different aspects of the application state:

1. **GridStore** - Main grid configuration and panel management
2. **UndoRedoStore** - Operation history and undo/redo functionality
3. **ViewportStore** - Zoom, pan, and viewport state management

## Store Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Grid Editor Stores                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  GridStore   │  │UndoRedoStore │  │ViewportStore │      │
│  │              │  │              │  │              │      │
│  │ - Panels     │  │ - Undo Stack │  │ - Zoom       │      │
│  │ - Layers     │  │ - Redo Stack │  │ - Pan        │      │
│  │ - Transforms │  │ - Operations │  │ - Focus      │      │
│  │ - Crops      │  │              │  │              │      │
│  │ - Selection  │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## GridStore

**File:** `gridEditorStore.ts`

Manages the complete state of the 3x3 Master Coherence Sheet editor.

### State

- `config: GridConfiguration` - Complete grid configuration including all panels
- `selectedPanelIds: string[]` - Currently selected panel IDs
- `activeTool: Tool` - Currently active editing tool
- `clipboard: Panel | null` - Clipboard for copy/paste operations

### Key Actions

#### Selection
- `selectPanel(panelId, addToSelection)` - Select panel(s)
- `deselectAll()` - Clear selection
- `getSelectedPanels()` - Get selected panel objects

#### Transforms
- `updatePanelTransform(panelId, transform)` - Update single panel transform
- `updateMultiplePanelTransforms(panelIds, transform)` - Update multiple panels

#### Crops
- `updatePanelCrop(panelId, crop)` - Update panel crop region

#### Layers
- `addLayer(panelId, layer)` - Add layer to panel
- `removeLayer(panelId, layerId)` - Remove layer from panel
- `reorderLayers(panelId, layerId, newIndex)` - Reorder layers
- `updateLayer(panelId, layerId, updates)` - Update layer properties
- `toggleLayerVisibility(panelId, layerId)` - Toggle layer visibility
- `toggleLayerLock(panelId, layerId)` - Toggle layer lock

#### Tools
- `setActiveTool(tool)` - Set active editing tool

#### Clipboard
- `copyPanel(panelId)` - Copy panel to clipboard
- `pastePanel(targetPanelId)` - Paste clipboard to panel
- `duplicatePanel(panelId, targetPanelId)` - Duplicate panel

#### Persistence
- `loadConfiguration(config)` - Load grid configuration
- `exportConfiguration()` - Export current configuration
- `resetConfiguration(projectId)` - Reset to default

### Usage Example

```typescript
import { useGridStore } from '@/stores/gridEditor';

function GridEditorComponent() {
  const { 
    config, 
    selectedPanelIds, 
    selectPanel, 
    updatePanelTransform 
  } = useGridStore();

  const handlePanelClick = (panelId: string, shiftKey: boolean) => {
    selectPanel(panelId, shiftKey);
  };

  const handleTransform = (panelId: string, newTransform: Transform) => {
    updatePanelTransform(panelId, newTransform);
  };

  return (
    <div>
      {config.panels.map(panel => (
        <Panel 
          key={panel.id}
          panel={panel}
          selected={selectedPanelIds.includes(panel.id)}
          onClick={handlePanelClick}
          onTransform={handleTransform}
        />
      ))}
    </div>
  );
}
```

## UndoRedoStore

**File:** `undoRedoStore.ts`

Manages operation history for undo/redo functionality.

### State

- `undoStack: Operation[]` - Stack of operations that can be undone
- `redoStack: Operation[]` - Stack of operations that can be redone
- `maxStackSize: number` - Maximum number of operations to keep

### Key Actions

- `pushOperation(operation)` - Add operation to undo stack
- `undo()` - Undo last operation
- `redo()` - Redo last undone operation
- `canUndo()` - Check if undo is available
- `canRedo()` - Check if redo is available
- `clearHistory()` - Clear all history

### Usage Example

```typescript
import { useUndoRedoStore, createOperation } from '@/stores/gridEditor';
import { useGridStore } from '@/stores/gridEditor';

function EditorWithUndo() {
  const { updatePanelTransform } = useGridStore();
  const { pushOperation, undo, redo, canUndo, canRedo } = useUndoRedoStore();

  const handleTransform = (panelId: string, newTransform: Transform) => {
    const panel = useGridStore.getState().getPanelById(panelId);
    
    if (panel) {
      // Record operation for undo
      const operation = createOperation(
        'transform',
        'Transform panel',
        panelId,
        panel.transform,
        newTransform
      );
      pushOperation(operation);
      
      // Apply transform
      updatePanelTransform(panelId, newTransform);
    }
  };

  const handleUndo = () => {
    const operation = undo();
    if (operation) {
      // Restore previous state
      updatePanelTransform(
        operation.data.panelId,
        operation.data.before
      );
    }
  };

  const handleRedo = () => {
    const operation = redo();
    if (operation) {
      // Reapply operation
      updatePanelTransform(
        operation.data.panelId,
        operation.data.after
      );
    }
  };

  return (
    <div>
      <button onClick={handleUndo} disabled={!canUndo()}>Undo</button>
      <button onClick={handleRedo} disabled={!canRedo()}>Redo</button>
    </div>
  );
}
```

## ViewportStore

**File:** `viewportStore.ts`

Manages viewport state including zoom, pan, and focus mode.

### State

- `zoom: number` - Current zoom level (0.1 to 10.0)
- `pan: Point` - Current pan offset
- `bounds: Bounds` - Viewport dimensions
- `focusedPanelId: string | null` - Currently focused panel (focus mode)
- `minZoom: number` - Minimum zoom level
- `maxZoom: number` - Maximum zoom level

### Key Actions

#### Zoom
- `setZoom(zoom)` - Set zoom level
- `zoomIn()` - Zoom in by step
- `zoomOut()` - Zoom out by step
- `zoomToActual()` - Zoom to 1:1 (100%)
- `zoomToPoint(zoom, point)` - Zoom centered on point
- `fitToView(gridBounds)` - Fit entire grid in viewport

#### Pan
- `setPan(pan)` - Set pan offset
- `panBy(delta)` - Pan by delta amount

#### Focus Mode
- `focusPanel(panelId, panelBounds)` - Enter focus mode on panel
- `exitFocusMode()` - Exit focus mode
- `isFocused(panelId)` - Check if panel is focused

#### Coordinate Transforms
- `screenToCanvas(screenPoint)` - Convert screen to canvas coordinates
- `canvasToScreen(canvasPoint)` - Convert canvas to screen coordinates

### Usage Example

```typescript
import { useViewportStore } from '@/stores/gridEditor';

function ViewportControls() {
  const { 
    zoom, 
    zoomIn, 
    zoomOut, 
    fitToView, 
    zoomToActual,
    focusPanel 
  } = useViewportStore();

  const handleFitToView = () => {
    const gridBounds = { width: 1920, height: 1080 };
    fitToView(gridBounds);
  };

  const handleFocusPanel = (panelId: string) => {
    const panelBounds = { width: 640, height: 360 };
    focusPanel(panelId, panelBounds);
  };

  return (
    <div>
      <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
      <button onClick={zoomIn}>+</button>
      <button onClick={zoomOut}>-</button>
      <button onClick={zoomToActual}>100%</button>
      <button onClick={handleFitToView}>Fit</button>
    </div>
  );
}
```

## Integration Pattern

The three stores work together to provide complete state management:

```typescript
import { 
  useGridStore, 
  useUndoRedoStore, 
  useViewportStore,
  createOperation 
} from '@/stores/gridEditor';

function AdvancedGridEditor() {
  // Grid state
  const { 
    config, 
    selectedPanelIds, 
    selectPanel,
    updatePanelTransform 
  } = useGridStore();

  // Undo/redo
  const { pushOperation, undo, redo } = useUndoRedoStore();

  // Viewport
  const { 
    zoom, 
    pan, 
    zoomToPoint,
    screenToCanvas 
  } = useViewportStore();

  const handlePanelTransform = (panelId: string, newTransform: Transform) => {
    const panel = useGridStore.getState().getPanelById(panelId);
    
    if (panel) {
      // Record for undo
      pushOperation(createOperation(
        'transform',
        'Transform panel',
        panelId,
        panel.transform,
        newTransform
      ));
      
      // Apply transform
      updatePanelTransform(panelId, newTransform);
    }
  };

  const handleMouseWheel = (e: WheelEvent, cursorPos: Point) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = zoom + delta;
    zoomToPoint(newZoom, cursorPos);
  };

  return (
    <div>
      {/* Grid editor UI */}
    </div>
  );
}
```

## Type Definitions

All type definitions are exported from the stores and can be imported from the index:

```typescript
import type {
  // Grid types
  Panel,
  Layer,
  Transform,
  CropRegion,
  GridConfiguration,
  
  // Undo/redo types
  Operation,
  OperationType,
  
  // Viewport types
  ViewportState,
  Bounds,
  Point
} from '@/stores/gridEditor';
```

## Helper Functions

Each store exports helper functions for common operations:

```typescript
import {
  // Grid helpers
  createDefaultTransform,
  createDefaultPanel,
  createDefaultGridConfiguration,
  
  // Undo/redo helpers
  createOperation,
  formatOperation,
  
  // Viewport helpers
  getVisiblePanels
} from '@/stores/gridEditor';
```

## Testing

The stores are designed to be easily testable:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useGridStore } from '@/stores/gridEditor';

describe('GridStore', () => {
  it('should select panel', () => {
    const { result } = renderHook(() => useGridStore());
    
    act(() => {
      result.current.selectPanel('panel-0-0', false);
    });
    
    expect(result.current.selectedPanelIds).toEqual(['panel-0-0']);
  });
  
  it('should add to selection with shift', () => {
    const { result } = renderHook(() => useGridStore());
    
    act(() => {
      result.current.selectPanel('panel-0-0', false);
      result.current.selectPanel('panel-0-1', true);
    });
    
    expect(result.current.selectedPanelIds).toEqual(['panel-0-0', 'panel-0-1']);
  });
});
```

## Requirements Coverage

### GridStore
- ✅ Requirement 1.5: Panel selection and interaction
- ✅ Requirement 2.1: Single panel selection
- ✅ Requirement 2.2: Selection indicators
- ✅ Requirement 2.3: Multi-select with Shift
- ✅ Requirement 3.2: Transform updates
- ✅ Requirement 4.6: Crop confirmation
- ✅ Requirement 5.1: Layer creation
- ✅ Requirement 5.2: Layer reordering
- ✅ Requirement 5.5: Layer deletion
- ✅ Requirement 10.1: Configuration export
- ✅ Requirement 10.2: Configuration import

### UndoRedoStore
- ✅ Requirement 9.1: Operation recording
- ✅ Requirement 9.2: Undo functionality
- ✅ Requirement 9.3: Redo functionality
- ✅ Requirement 9.4: Redo stack clearing
- ✅ Requirement 9.5: Undo availability check
- ✅ Requirement 9.6: Redo availability check

### ViewportStore
- ✅ Requirement 7.1: Mouse wheel zoom
- ✅ Requirement 7.2: Pan with Space+drag
- ✅ Requirement 7.3: Fit to view
- ✅ Requirement 7.4: Zoom controls
- ✅ Requirement 2.5: Focus mode entry
- ✅ Requirement 2.6: Focus mode display
