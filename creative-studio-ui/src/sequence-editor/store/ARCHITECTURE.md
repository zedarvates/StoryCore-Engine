# Redux Store Architecture Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Sequence Editor UI                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Timeline   │  │ Asset Library│  │   Preview    │        │
│  │  Component   │  │  Component   │  │  Component   │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                │
│                            │                                    │
│                            ▼                                    │
│         ┌──────────────────────────────────────┐              │
│         │      Redux Store (Centralized)       │              │
│         │                                       │              │
│         │  ┌────────────────────────────────┐  │              │
│         │  │   State Slices (7 total)      │  │              │
│         │  │                                │  │              │
│         │  │  • project    • tools          │  │              │
│         │  │  • timeline   • preview        │  │              │
│         │  │  • assets     • history        │  │              │
│         │  │  • panels                      │  │              │
│         │  └────────────────────────────────┘  │              │
│         │                                       │              │
│         │  ┌────────────────────────────────┐  │              │
│         │  │   Middleware (2 total)         │  │              │
│         │  │                                │  │              │
│         │  │  • historyMiddleware           │  │              │
│         │  │    (Undo/Redo)                 │  │              │
│         │  │                                │  │              │
│         │  │  • autoSaveMiddleware          │  │              │
│         │  │    (Persistence)               │  │              │
│         │  └────────────────────────────────┘  │              │
│         │                                       │              │
│         │  ┌────────────────────────────────┐  │              │
│         │  │   Custom Hooks (2 total)       │  │              │
│         │  │                                │  │              │
│         │  │  • useUndoRedo                 │  │              │
│         │  │  • useProjectPersistence       │  │              │
│         │  └────────────────────────────────┘  │              │
│         └──────────────────────────────────────┘              │
│                            │                                    │
│                            ▼                                    │
│         ┌──────────────────────────────────────┐              │
│         │      localStorage (Persistence)       │              │
│         └──────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Action Flow
```
User Interaction
    ↓
Component dispatches action
    ↓
Action passes through middleware
    ↓
historyMiddleware captures snapshot (if undoable)
    ↓
autoSaveMiddleware marks as modified
    ↓
Reducer updates state
    ↓
Components re-render with new state
```

### 2. Undo/Redo Flow
```
User triggers undo/redo
    ↓
useUndoRedo hook called
    ↓
Snapshot retrieved from stack
    ↓
State restored from snapshot
    ↓
Components re-render with restored state
```

### 3. Auto-Save Flow
```
User makes changes
    ↓
Actions trigger autoSaveMiddleware
    ↓
Debounce timer starts (500ms)
    ↓
Timer expires or 60s interval reached
    ↓
State saved to localStorage
    ↓
Save status updated
```

## State Slice Details

### Project Slice
```
project: {
  metadata: {
    name, path, created, modified, author, description
  },
  settings: {
    resolution, format, fps, quality
  },
  saveStatus: {
    state, lastSaveTime, error
  },
  generationStatus: {
    state, stage, progress, error
  }
}
```

### Timeline Slice
```
timeline: {
  shots: Shot[],
  tracks: Track[],
  playheadPosition: number,
  zoomLevel: number,
  selectedElements: string[],
  duration: number
}
```

### Assets Slice
```
assets: {
  categories: [
    { id, name, icon, assets: Asset[] }
  ],
  searchQuery: string
}
```

### Panels Slice
```
panels: {
  layout: {
    assetLibrary: { width },
    preview: { width, height },
    shotConfig: { width },
    timeline: { height }
  },
  activePanel: string | null,
  shotConfigTarget: string | null
}
```

### Tools Slice
```
tools: {
  activeTool: ToolType,
  toolSettings: Record<string, any>
}
```

### Preview Slice
```
preview: {
  currentFrame: ImageData | null,
  playbackState: PlaybackState,
  playbackSpeed: number
}
```

### History Slice
```
history: {
  undoStack: StateSnapshot[],
  redoStack: StateSnapshot[],
  maxStackSize: 50
}
```

## Middleware Pipeline

```
Action Dispatched
    ↓
┌─────────────────────────────────────┐
│   historyMiddleware                 │
│   • Check if action is undoable     │
│   • Capture state snapshot          │
│   • Push to undo stack              │
│   • Clear redo stack                │
│   • Mark project as modified        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│   autoSaveMiddleware                │
│   • Check if action triggers save   │
│   • Start debounce timer (500ms)    │
│   • Mark as modified                │
│   • Schedule auto-save (60s)        │
└─────────────────────────────────────┘
    ↓
Reducer Updates State
    ↓
Components Re-render
```

## Hook Integration

### useUndoRedo Hook
```typescript
const {
  undo,              // Function to undo last action
  redo,              // Function to redo last undone action
  canUndo,           // Boolean: can undo?
  canRedo,           // Boolean: can redo?
  undoDescription,   // String: description of next undo
  redoDescription    // String: description of next redo
} = useUndoRedo();
```

### useProjectPersistence Hook
```typescript
const {
  loadProject,           // Function to load from localStorage
  saveStatus,            // Current save status object
  hasModifications,      // Boolean: has unsaved changes?
  lastSaveTimeFormatted  // String: formatted last save time
} = useProjectPersistence();
```

## Performance Optimizations

1. **Immutable Updates**: Redux Toolkit's Immer prevents unnecessary re-renders
2. **Selective Snapshots**: Only relevant state slices captured in history
3. **Debounced Saves**: Prevents excessive localStorage writes
4. **Stack Limits**: Undo history capped at 50 levels
5. **Serialization Checks**: Non-serializable data excluded from checks

## Error Handling

```
┌─────────────────────────────────────┐
│   Save Operation                    │
└─────────────────────────────────────┘
    ↓
Try to save to localStorage
    ↓
    ├─ Success ──→ Mark as saved with timestamp
    │
    └─ Error ────→ Set error status with message
                   ↓
                   Display error to user
```

## Integration Points

### Component Integration
```typescript
// In any component
import { useAppDispatch, useAppSelector } from './store';
import { addShot } from './store/slices/timelineSlice';

const dispatch = useAppDispatch();
const shots = useAppSelector(state => state.timeline.shots);

dispatch(addShot(newShot));
```

### Keyboard Shortcuts Integration
```typescript
// In keyboard handler
import { useUndoRedo } from './store';

const { undo, redo } = useUndoRedo();

// Ctrl+Z
if (e.ctrlKey && e.key === 'z') {
  undo();
}

// Ctrl+Shift+Z
if (e.ctrlKey && e.shiftKey && e.key === 'z') {
  redo();
}
```

### Status Bar Integration
```typescript
// In status bar component
import { useProjectPersistence } from './store';

const { saveStatus, lastSaveTimeFormatted } = useProjectPersistence();

return (
  <div>
    <StatusIndicator status={saveStatus.state} />
    <span>{lastSaveTimeFormatted}</span>
  </div>
);
```

## Testing Strategy

```
Unit Tests
    ↓
Test each slice independently
    ↓
Test middleware behavior
    ↓
Test hook functionality
    ↓
Integration Tests
    ↓
Test complete workflows
    ↓
Test undo/redo scenarios
    ↓
Test auto-save behavior
```

## Future Enhancements

1. **IndexedDB**: For larger project storage
2. **Cloud Sync**: Multi-device synchronization
3. **Conflict Resolution**: Handle concurrent edits
4. **Compression**: Compress state snapshots
5. **Selective Undo**: Undo specific state slices
6. **Undo Branching**: Support multiple undo branches
7. **Performance Monitoring**: Track middleware performance
8. **State Persistence**: Persist to file system
