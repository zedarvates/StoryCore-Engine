# Redux Store Architecture

This directory contains the Redux store implementation for the Sequence Editor Interface, providing centralized state management with undo/redo and auto-save capabilities.

## Overview

The store is built using Redux Toolkit and follows a modular slice-based architecture. It includes:

- **7 State Slices**: project, timeline, assets, panels, tools, preview, history
- **2 Middleware**: historyMiddleware (undo/redo), autoSaveMiddleware (persistence)
- **2 Custom Hooks**: useUndoRedo, useProjectPersistence

## Architecture

```
store/
├── index.ts                    # Store configuration and exports
├── slices/                     # State slices
│   ├── projectSlice.ts        # Project metadata and settings
│   ├── timelineSlice.ts       # Timeline, shots, and tracks
│   ├── assetsSlice.ts         # Asset library
│   ├── panelsSlice.ts         # Panel layout and focus
│   ├── toolsSlice.ts          # Active tool and settings
│   ├── previewSlice.ts        # Preview frame and playback
│   └── historySlice.ts        # Undo/redo stacks
├── middleware/                 # Custom middleware
│   ├── historyMiddleware.ts   # Captures undoable actions
│   └── autoSaveMiddleware.ts  # Auto-save with debouncing
└── hooks/                      # Custom hooks
    ├── useUndoRedo.ts         # Undo/redo operations
    └── useProjectPersistence.ts # Project loading and save status
```

## State Slices

### 1. Project Slice
Manages project metadata, settings, save status, and generation status.

**State:**
```typescript
{
  metadata: ProjectMetadata | null,
  settings: ProjectSettings,
  saveStatus: SaveStatus,
  generationStatus: GenerationStatus
}
```

**Actions:**
- `setProject(metadata)` - Set project metadata
- `updateMetadata(partial)` - Update metadata fields
- `updateSettings(partial)` - Update project settings
- `setSaveStatus(status)` - Set save status
- `setGenerationStatus(status)` - Set generation status
- `markModified()` - Mark project as modified
- `markSaved()` - Mark project as saved with timestamp

### 2. Timeline Slice
Manages timeline state including shots, tracks, playhead, and selection.

**State:**
```typescript
{
  shots: Shot[],
  tracks: Track[],
  playheadPosition: number,
  zoomLevel: number,
  selectedElements: string[],
  duration: number
}
```

**Actions:**
- `addShot(shot)` - Add shot to timeline
- `updateShot({ id, updates })` - Update shot properties
- `deleteShot(id)` - Remove shot from timeline
- `reorderShots(shots)` - Reorder shots array
- `addTrack(track)` - Add new track
- `updateTrack({ id, updates })` - Update track properties
- `deleteTrack(id)` - Remove track
- `reorderTracks(tracks)` - Reorder tracks array
- `setPlayheadPosition(position)` - Set playhead position
- `setZoomLevel(level)` - Set zoom level
- `selectElement(id)` - Add element to selection
- `deselectElement(id)` - Remove element from selection
- `setSelectedElements(ids)` - Set selection array
- `clearSelection()` - Clear all selections

### 3. Assets Slice
Manages asset library with categories and search.

**State:**
```typescript
{
  categories: AssetCategory[],
  searchQuery: string
}
```

**Actions:**
- `addAsset({ categoryId, asset })` - Add asset to category
- `updateAsset({ categoryId, assetId, updates })` - Update asset
- `deleteAsset({ categoryId, assetId })` - Remove asset
- `setSearchQuery(query)` - Set search query
- `clearSearchQuery()` - Clear search
- `loadAssets(categories)` - Load all assets

### 4. Panels Slice
Manages panel layout, focus, and shot configuration target.

**State:**
```typescript
{
  layout: PanelLayout,
  activePanel: string | null,
  shotConfigTarget: string | null
}
```

**Actions:**
- `setPanelLayout(partial)` - Update panel dimensions
- `resetPanelLayout()` - Reset to default layout
- `setActivePanel(panel)` - Set focused panel
- `setShotConfigTarget(shotId)` - Set shot for configuration

### 5. Tools Slice
Manages active editing tool and tool-specific settings.

**State:**
```typescript
{
  activeTool: ToolType,
  toolSettings: Record<string, any>
}
```

**Actions:**
- `setActiveTool(tool)` - Set active tool
- `setToolSettings(settings)` - Update tool settings
- `clearToolSettings()` - Clear tool settings

### 6. Preview Slice
Manages preview frame rendering and playback state.

**State:**
```typescript
{
  currentFrame: ImageData | null,
  playbackState: PlaybackState,
  playbackSpeed: number
}
```

**Actions:**
- `setCurrentFrame(frame)` - Set current frame data
- `setPlaybackState(state)` - Set playback state
- `play()` - Start playback
- `pause()` - Pause playback
- `stop()` - Stop playback
- `setPlaybackSpeed(speed)` - Set playback speed

### 7. History Slice
Manages undo/redo stacks for state snapshots.

**State:**
```typescript
{
  undoStack: StateSnapshot[],
  redoStack: StateSnapshot[],
  maxStackSize: number
}
```

**Actions:**
- `pushHistory(snapshot)` - Add snapshot to undo stack
- `undo()` - Move snapshot from undo to redo stack
- `redo()` - Move snapshot from redo to undo stack
- `clearHistory()` - Clear all history

## Middleware

### History Middleware
Automatically captures state snapshots for undoable actions.

**Features:**
- Captures state before undoable actions
- Creates snapshots with timestamps and descriptions
- Maintains 50-level undo history
- Automatically marks project as modified

**Undoable Actions:**
- Timeline: add/update/delete/reorder shots and tracks
- Assets: add/update/delete assets
- Panels: resize panels
- Project: update metadata and settings

### Auto-Save Middleware
Automatically saves project state to localStorage.

**Features:**
- Auto-saves every 60 seconds when modifications exist
- Debounces save operations (500ms delay)
- Tracks save status (saved, modified, saving, error)
- Persists complete project state to localStorage

**Save Triggers:**
- All undoable actions trigger auto-save
- Debouncing prevents excessive saves
- Timer ensures periodic saves

## Custom Hooks

### useUndoRedo
Provides undo/redo functionality with state restoration.

**Usage:**
```typescript
const { undo, redo, canUndo, canRedo, undoDescription, redoDescription } = useUndoRedo();

// Perform undo
if (canUndo) {
  undo();
}

// Perform redo
if (canRedo) {
  redo();
}
```

**Features:**
- Restores state from snapshots
- Provides availability flags
- Returns action descriptions
- Handles state restoration logic

### useProjectPersistence
Manages project loading and save status monitoring.

**Usage:**
```typescript
const { loadProject, saveStatus, hasModifications, lastSaveTimeFormatted } = useProjectPersistence();

// Load saved project on startup
useEffect(() => {
  loadProject();
}, []);

// Display save status
console.log(saveStatus.state); // 'saved' | 'modified' | 'saving' | 'error'
console.log(lastSaveTimeFormatted); // 'Saved 2 minutes ago'
```

**Features:**
- Loads project from localStorage
- Monitors save status
- Formats last save time
- Prevents accidental data loss (beforeunload handler)

## Usage Examples

### Basic Store Usage

```typescript
import { useAppDispatch, useAppSelector } from './store';
import { addShot, setPlayheadPosition } from './store/slices/timelineSlice';

function TimelineComponent() {
  const dispatch = useAppDispatch();
  const shots = useAppSelector((state) => state.timeline.shots);
  const playheadPosition = useAppSelector((state) => state.timeline.playheadPosition);
  
  const handleAddShot = () => {
    dispatch(addShot({
      id: 'shot-1',
      name: 'Shot 1',
      startTime: 0,
      duration: 100,
      layers: [],
      referenceImages: [],
      prompt: '',
      parameters: { /* ... */ },
      generationStatus: 'pending',
    }));
  };
  
  return (
    <div>
      <button onClick={handleAddShot}>Add Shot</button>
      <div>Shots: {shots.length}</div>
      <div>Playhead: {playheadPosition}</div>
    </div>
  );
}
```

### Undo/Redo Usage

```typescript
import { useUndoRedo } from './store';

function UndoRedoButtons() {
  const { undo, redo, canUndo, canRedo, undoDescription, redoDescription } = useUndoRedo();
  
  return (
    <div>
      <button onClick={undo} disabled={!canUndo} title={undoDescription || ''}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo} title={redoDescription || ''}>
        Redo
      </button>
    </div>
  );
}
```

### Project Persistence Usage

```typescript
import { useProjectPersistence } from './store';

function StatusBar() {
  const { saveStatus, lastSaveTimeFormatted } = useProjectPersistence();
  
  return (
    <div>
      <span className={`status-${saveStatus.state}`}>
        {saveStatus.state === 'saved' && '✓ Saved'}
        {saveStatus.state === 'modified' && '● Modified'}
        {saveStatus.state === 'saving' && '⟳ Saving...'}
        {saveStatus.state === 'error' && '✗ Error'}
      </span>
      {lastSaveTimeFormatted && <span>{lastSaveTimeFormatted}</span>}
    </div>
  );
}
```

### Keyboard Shortcuts Integration

```typescript
import { useUndoRedo } from './store';

function useKeyboardShortcuts() {
  const { undo, redo } = useUndoRedo();
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      
      // Ctrl/Cmd+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
}
```

## Requirements Coverage

### Task 2.1: Redux Store with Slices
✅ All 7 slices implemented with TypeScript interfaces
✅ Immutable update patterns via Redux Toolkit's Immer
✅ Redux DevTools configured for debugging
✅ Requirements: 19.1, 19.6

### Task 2.2: Undo/Redo System
✅ History middleware captures undoable actions
✅ Undo/redo reducers with 50-level stack management
✅ Action metadata for undo descriptions
✅ State restoration via useUndoRedo hook
✅ Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7

### Task 2.3: Auto-Save System
✅ Auto-save middleware triggers every 60 seconds
✅ localStorage persistence for project state
✅ Save status tracking (saved, modified, saving, error)
✅ Debounced save operations (500ms)
✅ Requirements: 19.2, 19.3, 19.4, 19.6

## Testing

To test the store implementation:

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test -- --coverage
```

## Performance Considerations

1. **Immutability**: Redux Toolkit's Immer ensures efficient immutable updates
2. **Serialization**: Non-serializable data (ImageData, Date) excluded from checks
3. **Debouncing**: Auto-save debounced to prevent excessive localStorage writes
4. **Stack Limits**: Undo history limited to 50 levels to prevent memory issues
5. **Selective Snapshots**: Only relevant state slices captured in snapshots

## Future Enhancements

- [ ] IndexedDB for larger project storage
- [ ] Cloud sync for multi-device access
- [ ] Conflict resolution for concurrent edits
- [ ] Compression for state snapshots
- [ ] Selective undo for specific state slices
