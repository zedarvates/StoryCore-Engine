# State Management Documentation

This directory contains the Zustand store implementation for the Creative Studio UI, including comprehensive undo/redo functionality.

## Overview

The state management system consists of:

1. **Main Store** (`index.ts`) - Core application state and actions
2. **Undo/Redo System** (`undoRedo.ts`) - History tracking and time-travel functionality
3. **Hooks** (`../hooks/useUndoRedoShortcuts.ts`) - React integration

## Basic Usage

### Accessing State

```typescript
import { useStore } from './store';

function MyComponent() {
  // Access specific state
  const shots = useStore((state) => state.shots);
  const selectedShotId = useStore((state) => state.selectedShotId);
  
  // Access actions
  const addShot = useStore((state) => state.addShot);
  const updateShot = useStore((state) => state.updateShot);
  
  return <div>...</div>;
}
```

### Using Optimized Selectors

```typescript
import { useShots, useSelectedShot, useAssets } from './store';

function MyComponent() {
  const shots = useShots();
  const selectedShot = useSelectedShot();
  const assets = useAssets();
  
  return <div>...</div>;
}
```

## Undo/Redo System

### Setup

In your main App component, set up keyboard shortcuts:

```typescript
import { useUndoRedoShortcuts } from './hooks/useUndoRedoShortcuts';

function App() {
  useUndoRedoShortcuts(); // Enables Ctrl+Z / Ctrl+Y
  
  return <div>...</div>;
}
```

### Using Undoable Actions

**Option 1: Use pre-wrapped actions**

```typescript
import { undoableActions } from './store/undoRedo';

function MyComponent() {
  const handleAddShot = () => {
    const newShot = {
      id: generateId(),
      title: 'New Shot',
      // ... other properties
    };
    
    // This automatically saves history before adding
    undoableActions.addShot(newShot);
  };
  
  return <button onClick={handleAddShot}>Add Shot</button>;
}
```

**Option 2: Wrap actions manually**

```typescript
import { useStore } from './store';
import { withUndo } from './store/undoRedo';

function MyComponent() {
  const addShot = useStore((state) => state.addShot);
  
  const handleAddShot = () => {
    const newShot = { /* ... */ };
    
    // Wrap the action to make it undoable
    withUndo(addShot)(newShot);
  };
  
  return <button onClick={handleAddShot}>Add Shot</button>;
}
```

**Option 3: Batch multiple actions**

```typescript
import { batchActions, undoableActions } from './store/undoRedo';

function MyComponent() {
  const handleBulkOperation = () => {
    // All these actions will be undone/redone together
    batchActions(() => {
      undoableActions.addShot(shot1);
      undoableActions.addShot(shot2);
      undoableActions.updateShot(shot3.id, updates);
    });
  };
  
  return <button onClick={handleBulkOperation}>Bulk Add</button>;
}
```

### Undo/Redo UI Controls

```typescript
import { useUndoRedo } from './store/undoRedo';

function UndoRedoButtons() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  
  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>
        Undo (Ctrl+Z)
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo (Ctrl+Y)
      </button>
    </div>
  );
}
```

## Available Actions

### Shot Actions

```typescript
// Add a new shot
addShot(shot: Shot): void

// Update an existing shot
updateShot(id: string, updates: Partial<Shot>): void

// Delete a shot
deleteShot(id: string): void

// Reorder shots
reorderShots(shots: Shot[]): void

// Select a shot
selectShot(id: string | null): void
```

### Asset Actions

```typescript
// Add a new asset
addAsset(asset: Asset): void

// Update an existing asset
updateAsset(id: string, updates: Partial<Asset>): void

// Delete an asset
deleteAsset(id: string): void
```

### Audio Track Actions

```typescript
// Add audio track to a shot
addAudioTrack(shotId: string, track: AudioTrack): void

// Update audio track
updateAudioTrack(shotId: string, trackId: string, updates: Partial<AudioTrack>): void

// Delete audio track
deleteAudioTrack(shotId: string, trackId: string): void
```

### Effect Actions

```typescript
// Add effect to a shot
addEffect(shotId: string, effect: Effect): void

// Update effect
updateEffect(shotId: string, effectId: string, updates: Partial<Effect>): void

// Delete effect
deleteEffect(shotId: string, effectId: string): void

// Reorder effects
reorderEffects(shotId: string, effects: Effect[]): void
```

### Text Layer Actions

```typescript
// Add text layer to a shot
addTextLayer(shotId: string, layer: TextLayer): void

// Update text layer
updateTextLayer(shotId: string, layerId: string, updates: Partial<TextLayer>): void

// Delete text layer
deleteTextLayer(shotId: string, layerId: string): void
```

### Animation Actions

```typescript
// Add animation to a shot
addAnimation(shotId: string, animation: Animation): void

// Update animation
updateAnimation(shotId: string, animationId: string, updates: Partial<Animation>): void

// Delete animation
deleteAnimation(shotId: string, animationId: string): void
```

### Transition Actions

```typescript
// Set transition for a shot
setTransition(shotId: string, transition: Transition | undefined): void
```

### Task Queue Actions

```typescript
// Add task to queue
addTask(task: GenerationTask): void

// Update task
updateTask(taskId: string, updates: Partial<GenerationTask>): void

// Remove task from queue
removeTask(taskId: string): void

// Move task up in priority
moveTaskUp(taskId: string): void

// Move task down in priority
moveTaskDown(taskId: string): void

// Reorder entire queue
reorderTasks(tasks: GenerationTask[]): void
```

### UI State Actions

```typescript
// Toggle chat panel
setShowChat(show: boolean): void

// Toggle task queue modal
setShowTaskQueue(show: boolean): void

// Update panel sizes
setPanelSizes(sizes: PanelSizes): void

// Update current playback time
setCurrentTime(time: number): void
```

### Playback Actions

```typescript
// Start playback
play(): void

// Pause playback
pause(): void

// Stop playback and reset time
stop(): void

// Set playback speed
setPlaybackSpeed(speed: number): void
```

### Selection Actions

```typescript
// Select an effect
selectEffect(id: string | null): void

// Select a text layer
selectTextLayer(id: string | null): void

// Select a keyframe
selectKeyframe(id: string | null): void
```

## Keyboard Shortcuts

The following keyboard shortcuts are automatically set up when you use `useUndoRedoShortcuts()`:

- **Ctrl+Z** (Windows/Linux) or **Cmd+Z** (Mac): Undo
- **Ctrl+Y** (Windows/Linux) or **Cmd+Shift+Z** (Mac): Redo

## State Persistence

The store automatically persists the following UI preferences to localStorage:

- Panel sizes
- Chat visibility
- Playback speed

Project data (shots, assets, etc.) is NOT persisted automatically. Use the project save/load functionality for that.

## Best Practices

1. **Use undoable actions for user-initiated changes**: Wrap actions that modify project data with `withUndo()` or use `undoableActions`.

2. **Don't use undo for UI state changes**: Actions like `setShowChat`, `setCurrentTime`, etc. should NOT be undoable.

3. **Batch related operations**: Use `batchActions()` when performing multiple related changes that should be undone together.

4. **Limit history size**: The system automatically keeps only the last 50 states to prevent memory issues.

5. **Use optimized selectors**: Use the provided selector hooks (`useShots`, `useSelectedShot`, etc.) to prevent unnecessary re-renders.

## Example: Complete Component

```typescript
import React from 'react';
import { useStore, useShots, useSelectedShot } from './store';
import { undoableActions, useUndoRedo } from './store/undoRedo';
import { useUndoRedoShortcuts } from './hooks/useUndoRedoShortcuts';

function ShotEditor() {
  // Set up keyboard shortcuts
  useUndoRedoShortcuts();
  
  // Access state
  const shots = useShots();
  const selectedShot = useSelectedShot();
  
  // Access undo/redo
  const { undo, redo, canUndo, canRedo } = useUndoRedo();
  
  // Handlers
  const handleAddShot = () => {
    const newShot = {
      id: `shot-${Date.now()}`,
      title: 'New Shot',
      description: '',
      duration: 5,
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: [],
      position: shots.length,
    };
    
    undoableActions.addShot(newShot);
  };
  
  const handleUpdateShot = (id: string, title: string) => {
    undoableActions.updateShot(id, { title });
  };
  
  const handleDeleteShot = (id: string) => {
    undoableActions.deleteShot(id);
  };
  
  return (
    <div>
      <div className="toolbar">
        <button onClick={handleAddShot}>Add Shot</button>
        <button onClick={undo} disabled={!canUndo}>Undo</button>
        <button onClick={redo} disabled={!canRedo}>Redo</button>
      </div>
      
      <div className="shots">
        {shots.map((shot) => (
          <div key={shot.id} className={shot.id === selectedShot?.id ? 'selected' : ''}>
            <input
              value={shot.title}
              onChange={(e) => handleUpdateShot(shot.id, e.target.value)}
            />
            <button onClick={() => handleDeleteShot(shot.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ShotEditor;
```

## Testing

When testing components that use the store:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useStore } from './store';
import { undoableActions } from './store/undoRedo';

describe('Undo/Redo', () => {
  beforeEach(() => {
    // Reset store before each test
    useStore.setState({
      shots: [],
      history: [],
      historyIndex: -1,
    });
  });
  
  it('should undo shot addition', () => {
    const shot = { id: '1', title: 'Test', /* ... */ };
    
    act(() => {
      undoableActions.addShot(shot);
    });
    
    expect(useStore.getState().shots).toHaveLength(1);
    
    act(() => {
      useStore.getState().undo();
    });
    
    expect(useStore.getState().shots).toHaveLength(0);
  });
});
```
