# State Management Architecture

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Components                         │
│  (StoryboardCanvas, Timeline, PropertiesPanel, ChatBox, etc.)  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ useStore, useShots, useSelectedShot
                         │ undoableActions, useUndoRedo
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      Zustand Store                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Application State                      │  │
│  │  • shots: Shot[]                                         │  │
│  │  • assets: Asset[]                                       │  │
│  │  • project: Project | null                               │  │
│  │  • selectedShotId: string | null                         │  │
│  │  • taskQueue: GenerationTask[]                           │  │
│  │  • history: HistoryState[]                               │  │
│  │  • historyIndex: number                                  │  │
│  │  • UI state (panelSizes, showChat, isPlaying, etc.)     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                        Actions                            │  │
│  │  • Shot CRUD (add, update, delete, reorder)             │  │
│  │  • Asset CRUD                                            │  │
│  │  • Audio Track CRUD                                      │  │
│  │  • Effect CRUD                                           │  │
│  │  • Text Layer CRUD                                       │  │
│  │  • Animation CRUD                                        │  │
│  │  • Task Queue Management                                 │  │
│  │  • Undo/Redo (undo, redo, pushHistory)                  │  │
│  │  • Playback Control (play, pause, stop)                 │  │
│  │  • UI State Management                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ Middleware
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
  ┌──────────┐    ┌──────────────┐   ┌──────────┐
  │ DevTools │    │   Persist    │   │  Undo/   │
  │          │    │ (localStorage)│   │  Redo    │
  └──────────┘    └──────────────┘   └──────────┘
```

## Data Flow

### 1. User Action Flow

```
User Interaction
      │
      ▼
React Component
      │
      ▼
undoableActions.addShot(shot)
      │
      ├─────────────────────┐
      │                     │
      ▼                     ▼
pushHistory()         store.addShot(shot)
      │                     │
      ▼                     ▼
Save snapshot         Update state
      │                     │
      └─────────┬───────────┘
                │
                ▼
        State Updated
                │
                ▼
    Components Re-render
```

### 2. Undo Flow

```
User presses Ctrl+Z
      │
      ▼
Keyboard Event Handler
      │
      ▼
undo()
      │
      ▼
Get previous state from history[historyIndex - 1]
      │
      ▼
Restore state (shots, project, assets, etc.)
      │
      ▼
Update historyIndex
      │
      ▼
Components Re-render with previous state
```

### 3. Redo Flow

```
User presses Ctrl+Y
      │
      ▼
Keyboard Event Handler
      │
      ▼
redo()
      │
      ▼
Get next state from history[historyIndex + 1]
      │
      ▼
Restore state
      │
      ▼
Update historyIndex
      │
      ▼
Components Re-render with next state
```

## State Structure

```typescript
{
  // Project Data
  project: {
    schema_version: "1.0",
    project_name: "My Project",
    shots: [...],
    assets: [...],
    capabilities: {...},
    generation_status: {...}
  },
  
  shots: [
    {
      id: "shot-1",
      title: "Opening Scene",
      duration: 5,
      audioTracks: [...],
      effects: [...],
      textLayers: [...],
      animations: [...],
      transitionOut: {...}
    }
  ],
  
  assets: [
    {
      id: "asset-1",
      name: "Background Music",
      type: "audio",
      url: "/assets/music.mp3"
    }
  ],
  
  // UI State
  selectedShotId: "shot-1",
  currentTime: 2.5,
  showChat: false,
  showTaskQueue: false,
  panelSizes: {
    assetLibrary: 20,
    canvas: 55,
    propertiesOrChat: 25
  },
  
  // Task Queue
  taskQueue: [
    {
      id: "task-1",
      shotId: "shot-1",
      type: "grid",
      status: "pending",
      priority: 1
    }
  ],
  
  // Playback
  isPlaying: false,
  playbackSpeed: 1,
  
  // History (Undo/Redo)
  history: [
    {
      shots: [...],
      project: {...},
      assets: [...],
      selectedShotId: "shot-1",
      taskQueue: [...]
    }
  ],
  historyIndex: 0,
  
  // Selection
  selectedEffectId: null,
  selectedTextLayerId: null,
  selectedKeyframeId: null
}
```

## Component Integration Patterns

### Pattern 1: Direct Store Access

```typescript
import { useStore } from './store';

function MyComponent() {
  const shots = useStore((state) => state.shots);
  const addShot = useStore((state) => state.addShot);
  
  return <div>...</div>;
}
```

### Pattern 2: Optimized Selectors

```typescript
import { useShots, useSelectedShot } from './store';

function MyComponent() {
  const shots = useShots();
  const selectedShot = useSelectedShot();
  
  return <div>...</div>;
}
```

### Pattern 3: Undoable Actions

```typescript
import { undoableActions } from './store/undoRedo';

function MyComponent() {
  const handleAddShot = () => {
    undoableActions.addShot(newShot);
  };
  
  return <button onClick={handleAddShot}>Add</button>;
}
```

### Pattern 4: Batch Operations

```typescript
import { batchActions, undoableActions } from './store/undoRedo';

function MyComponent() {
  const handleBulkAdd = () => {
    batchActions(() => {
      undoableActions.addShot(shot1);
      undoableActions.addShot(shot2);
      undoableActions.addShot(shot3);
    });
  };
  
  return <button onClick={handleBulkAdd}>Bulk Add</button>;
}
```

## Performance Optimizations

### 1. Selector Memoization

```typescript
// ❌ Bad - Creates new selector on every render
const shots = useStore((state) => state.shots.filter(s => s.duration > 5));

// ✅ Good - Use useMemo
const shots = useStore((state) => state.shots);
const longShots = useMemo(() => shots.filter(s => s.duration > 5), [shots]);
```

### 2. Shallow Equality

```typescript
// ❌ Bad - Deep comparison on every render
const state = useStore();

// ✅ Good - Only subscribe to what you need
const shots = useStore((state) => state.shots);
const isPlaying = useStore((state) => state.isPlaying);
```

### 3. Action Batching

```typescript
// ❌ Bad - Multiple history snapshots
undoableActions.addShot(shot1);
undoableActions.addShot(shot2);
undoableActions.addShot(shot3);

// ✅ Good - Single history snapshot
batchActions(() => {
  undoableActions.addShot(shot1);
  undoableActions.addShot(shot2);
  undoableActions.addShot(shot3);
});
```

## Memory Management

### History Size Limit

The undo/redo system automatically limits history to 50 states:

```typescript
const MAX_HISTORY_SIZE = 50;

// When pushing new history
if (newHistory.length > MAX_HISTORY_SIZE) {
  newHistory.shift(); // Remove oldest state
}
```

### Deep Cloning Strategy

History snapshots use JSON serialization for deep cloning:

```typescript
// Pros:
// - Simple and reliable
// - No reference issues
// - Works with nested objects

// Cons:
// - Slower than shallow copy
// - Loses functions and special objects
// - Acceptable for our use case (data-only state)

const snapshot = {
  shots: JSON.parse(JSON.stringify(state.shots)),
  project: state.project ? JSON.parse(JSON.stringify(state.project)) : null,
  // ...
};
```

## Persistence Strategy

### What Gets Persisted

```typescript
{
  name: 'creative-studio-storage',
  partialize: (state) => ({
    // Only UI preferences
    panelSizes: state.panelSizes,
    showChat: state.showChat,
    playbackSpeed: state.playbackSpeed,
  }),
}
```

### What Doesn't Get Persisted

- Project data (shots, assets) - Use project save/load
- Task queue - Cleared on reload
- History - Cleared on reload
- Selection state - Reset on reload
- Playback state - Reset on reload

## Testing Strategy

### Unit Tests

```typescript
describe('Store Actions', () => {
  it('should add shot', () => {
    const shot = { id: '1', title: 'Test', /* ... */ };
    useStore.getState().addShot(shot);
    expect(useStore.getState().shots).toContain(shot);
  });
});
```

### Undo/Redo Tests

```typescript
describe('Undo/Redo', () => {
  it('should undo and redo', () => {
    const shot = { id: '1', title: 'Test', /* ... */ };
    
    undoableActions.addShot(shot);
    expect(useStore.getState().shots).toHaveLength(1);
    
    undo();
    expect(useStore.getState().shots).toHaveLength(0);
    
    redo();
    expect(useStore.getState().shots).toHaveLength(1);
  });
});
```

## Best Practices

1. ✅ Use `undoableActions` for user-initiated changes
2. ✅ Use `batchActions` for related operations
3. ✅ Use optimized selectors to prevent re-renders
4. ✅ Keep history size limited (50 states)
5. ✅ Don't make UI state changes undoable
6. ✅ Use TypeScript for type safety
7. ✅ Test undo/redo symmetry
8. ✅ Document complex state transformations

## Common Pitfalls

1. ❌ Making every action undoable (including UI state)
2. ❌ Not batching related operations
3. ❌ Subscribing to entire state instead of specific slices
4. ❌ Forgetting to set up keyboard shortcuts
5. ❌ Not limiting history size
6. ❌ Mutating state directly instead of using actions
7. ❌ Not using TypeScript types properly
