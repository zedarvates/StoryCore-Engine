# Undo/Redo System

Comprehensive undo/redo system for the Advanced Grid Editor with state management, keyboard shortcuts, UI components, and persistence.

## Features

- ✅ **UndoRedoManager**: Core class for managing undo/redo stacks
- ✅ **useUndoRedo Hook**: React hook for state management with undo/redo
- ✅ **Keyboard Shortcuts**: Ctrl+Z/Cmd+Z for undo, Ctrl+Shift+Z/Cmd+Shift+Z for redo
- ✅ **UI Components**: Toolbar with visual feedback and action descriptions
- ✅ **Persistence**: IndexedDB-based storage for history across sessions
- ✅ **Save Point Tracking**: Track unsaved changes
- ✅ **FIFO Eviction**: Automatic cleanup when stack reaches capacity (50 levels)

## Requirements Satisfied

- **7.1**: Record state before each action
- **7.2**: Undo with Ctrl+Z
- **7.3**: Redo with Ctrl+Shift+Z
- **7.4**: Support minimum 50 levels with FIFO eviction
- **7.6**: Display current state in UI
- **7.7**: Mark save points and track unsaved changes
- **7.8**: Persist history between sessions

## Quick Start

### Basic Usage with Hook

```typescript
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedoShortcuts';

function MyComponent() {
  const {
    state,
    execute,
    undo,
    redo,
    canUndo,
    canRedo,
    undoDescription,
    redoDescription
  } = useUndoRedo({
    shots: [],
    selectedId: null
  });

  // Set up keyboard shortcuts
  useUndoRedoShortcuts({
    onUndo: undo,
    onRedo: redo
  });

  // Execute an action
  const handleAddShot = () => {
    execute('Add shot', {
      ...state,
      shots: [...state.shots, newShot]
    });
  };

  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>
        Undo {undoDescription && `(${undoDescription})`}
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo {redoDescription && `(${redoDescription})`}
      </button>
    </div>
  );
}
```

### Using the Manager Directly

```typescript
import { UndoRedoManager } from '@/services/undoRedo';

// Create manager
const manager = new UndoRedoManager(initialState, {
  maxStackSize: 50,
  enablePersistence: true,
  storageKey: 'myApp-history'
});

// Execute actions
manager.execute('Move shot', newState);

// Undo/Redo
if (manager.canUndo()) {
  const restoredState = manager.undo();
}

if (manager.canRedo()) {
  const restoredState = manager.redo();
}

// Save point tracking
manager.markAsSaved();
if (manager.hasUnsavedChanges()) {
  console.log('There are unsaved changes');
}
```

### Using the UI Toolbar

```typescript
import { UndoRedoToolbar } from '@/components/undoRedo';

function MyEditor() {
  const { undo, redo, canUndo, canRedo, undoDescription, redoDescription } = useUndoRedo(initialState);

  return (
    <UndoRedoToolbar
      canUndo={canUndo}
      canRedo={canRedo}
      undoDescription={undoDescription}
      redoDescription={redoDescription}
      hasUnsavedChanges={hasUnsavedChanges}
      onUndo={undo}
      onRedo={redo}
      onSave={handleSave}
    />
  );
}
```

### Using IndexedDB Persistence

```typescript
import { initializePersistence } from '@/services/undoRedo';

// Initialize persistence
const persistence = await initializePersistence({
  dbName: 'myApp',
  storeName: 'history',
  maxAgeDays: 30
});

// Save history
await persistence.saveHistory(
  'project-1',
  undoStack,
  redoStack,
  savedStateId
);

// Load history
const history = await persistence.loadHistory('project-1');

// Cleanup old entries
const deletedCount = await persistence.cleanupOldHistory();
```

## Architecture

### UndoRedoManager

Core class that manages undo/redo stacks:

```typescript
class UndoRedoManager<T> {
  // Execute a new action
  execute(description: string, newState: T, inverseAction?: () => void): void;
  
  // Undo/Redo
  undo(): T | null;
  redo(): T | null;
  
  // Query methods
  canUndo(): boolean;
  canRedo(): boolean;
  getUndoDescription(): string | null;
  getRedoDescription(): string | null;
  getCurrentState(): T;
  
  // Save point tracking
  markAsSaved(): void;
  hasUnsavedChanges(): boolean;
  
  // History management
  clearHistory(): void;
  getUndoStack(): HistoryEntry<T>[];
  getRedoStack(): HistoryEntry<T>[];
}
```

### useUndoRedo Hook

React hook that wraps UndoRedoManager:

```typescript
function useUndoRedo<T>(
  initialState: T,
  options?: UseUndoRedoOptions
): UseUndoRedoReturn<T>;

interface UseUndoRedoReturn<T> {
  state: T;
  execute: (description: string, newState: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
  markAsSaved: () => void;
  hasUnsavedChanges: boolean;
  clearHistory: () => void;
  undoStackSize: number;
  redoStackSize: number;
}
```

### Keyboard Shortcuts

Hook for setting up keyboard shortcuts:

```typescript
useUndoRedoShortcuts({
  onUndo: () => void,
  onRedo: () => void,
  onShortcutTriggered?: (action: 'undo' | 'redo') => void
}, {
  enabled?: boolean,
  preventDefault?: boolean,
  stopPropagation?: boolean
});
```

Supported shortcuts:
- **Undo**: Ctrl+Z (Windows/Linux) or ⌘Z (Mac)
- **Redo**: Ctrl+Shift+Z or ⌘⇧Z (Mac), Ctrl+Y (Windows/Linux)

### UI Components

#### UndoRedoToolbar

Full-featured toolbar with buttons and descriptions:

```typescript
<UndoRedoToolbar
  canUndo={boolean}
  canRedo={boolean}
  undoDescription={string | null}
  redoDescription={string | null}
  hasUnsavedChanges={boolean}
  onUndo={() => void}
  onRedo={() => void}
  onSave={() => void}
  showSaveButton={boolean}
  showDescriptions={boolean}
/>
```

#### UndoRedoToolbarCompact

Icon-only compact version:

```typescript
<UndoRedoToolbarCompact
  canUndo={boolean}
  canRedo={boolean}
  undoDescription={string | null}
  redoDescription={string | null}
  onUndo={() => void}
  onRedo={() => void}
/>
```

### Persistence

IndexedDB-based persistence service:

```typescript
class UndoRedoPersistence {
  // Initialize database
  async initialize(): Promise<void>;
  
  // Save/Load operations
  async saveHistory<T>(projectId: string, undoStack, redoStack, savedStateId): Promise<void>;
  async loadHistory<T>(projectId: string): Promise<PersistedHistory<T> | null>;
  
  // Delete operations
  async deleteHistory(projectId: string): Promise<void>;
  async deleteAllHistory(): Promise<void>;
  
  // Cleanup
  async cleanupOldHistory(): Promise<number>;
  
  // Utilities
  async getStatistics(): Promise<Statistics>;
  close(): void;
}
```

## Configuration

### UndoRedoManager Options

```typescript
interface UndoRedoConfig {
  maxStackSize?: number;        // Default: 50
  enablePersistence?: boolean;  // Default: false
  storageKey?: string;          // Default: 'undoRedoHistory'
}
```

### Persistence Options

```typescript
interface PersistenceConfig {
  dbName?: string;      // Default: 'undoRedoHistory'
  storeName?: string;   // Default: 'history'
  version?: number;     // Default: 1
  maxAgeDays?: number;  // Default: 30
}
```

## Best Practices

### 1. Use Descriptive Action Names

```typescript
// Good
execute('Move shot to position 5', newState);
execute('Delete shot "Opening Scene"', newState);
execute('Update shot duration to 10s', newState);

// Bad
execute('Update', newState);
execute('Change', newState);
```

### 2. Batch Related Actions

```typescript
// Instead of multiple execute calls
execute('Add shot 1', state1);
execute('Add shot 2', state2);
execute('Add shot 3', state3);

// Use a single execute for batch operations
execute('Add 3 shots', finalState);
```

### 3. Mark Save Points

```typescript
const handleSave = async () => {
  await saveToBackend(state);
  markAsSaved();
};
```

### 4. Clean Up Persistence

```typescript
// Periodically clean up old history
useEffect(() => {
  const cleanup = async () => {
    const persistence = getPersistenceInstance();
    await persistence.cleanupOldHistory();
  };
  
  const interval = setInterval(cleanup, 24 * 60 * 60 * 1000); // Daily
  return () => clearInterval(interval);
}, []);
```

### 5. Handle Errors Gracefully

```typescript
const handleUndo = () => {
  try {
    const restoredState = manager.undo();
    if (restoredState === null) {
      toast.info('Nothing to undo');
    }
  } catch (error) {
    toast.error('Failed to undo action');
    console.error(error);
  }
};
```

## Testing

### Unit Tests

```typescript
import { UndoRedoManager } from '@/services/undoRedo';

describe('UndoRedoManager', () => {
  it('should undo and redo actions', () => {
    const manager = new UndoRedoManager({ count: 0 });
    
    manager.execute('Increment', { count: 1 });
    manager.execute('Increment', { count: 2 });
    
    expect(manager.getCurrentState()).toEqual({ count: 2 });
    
    manager.undo();
    expect(manager.getCurrentState()).toEqual({ count: 1 });
    
    manager.redo();
    expect(manager.getCurrentState()).toEqual({ count: 2 });
  });
  
  it('should enforce max stack size', () => {
    const manager = new UndoRedoManager({ count: 0 }, { maxStackSize: 2 });
    
    manager.execute('Action 1', { count: 1 });
    manager.execute('Action 2', { count: 2 });
    manager.execute('Action 3', { count: 3 });
    
    expect(manager.getUndoStackSize()).toBe(2);
  });
});
```

### Property-Based Tests

```typescript
import fc from 'fast-check';

describe('UndoRedo Properties', () => {
  it('should satisfy round-trip property', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 10 }),
        (actions) => {
          const manager = new UndoRedoManager({ value: 0 });
          
          // Execute all actions
          actions.forEach((value, i) => {
            manager.execute(`Action ${i}`, { value });
          });
          
          // Undo all actions
          for (let i = 0; i < actions.length; i++) {
            manager.undo();
          }
          
          // Should be back to initial state
          expect(manager.getCurrentState()).toEqual({ value: 0 });
        }
      )
    );
  });
});
```

## Examples

See `src/examples/UndoRedoExample.tsx` for a complete working example.

## API Reference

### UndoRedoManager

| Method | Description | Returns |
|--------|-------------|---------|
| `execute(description, newState, inverseAction?)` | Execute a new action | `void` |
| `undo()` | Undo the last action | `T \| null` |
| `redo()` | Redo the last undone action | `T \| null` |
| `canUndo()` | Check if undo is available | `boolean` |
| `canRedo()` | Check if redo is available | `boolean` |
| `getUndoDescription()` | Get description of next undo | `string \| null` |
| `getRedoDescription()` | Get description of next redo | `string \| null` |
| `getCurrentState()` | Get current state | `T` |
| `markAsSaved()` | Mark current state as saved | `void` |
| `hasUnsavedChanges()` | Check for unsaved changes | `boolean` |
| `clearHistory()` | Clear all history | `void` |

### useUndoRedo Hook

Returns an object with:
- `state`: Current state
- `execute`: Execute a new action
- `undo`: Undo function
- `redo`: Redo function
- `canUndo`: Boolean indicating if undo is available
- `canRedo`: Boolean indicating if redo is available
- `undoDescription`: Description of next undo action
- `redoDescription`: Description of next redo action
- `markAsSaved`: Function to mark state as saved
- `hasUnsavedChanges`: Boolean indicating unsaved changes
- `clearHistory`: Function to clear history
- `undoStackSize`: Number of undo operations available
- `redoStackSize`: Number of redo operations available

## Troubleshooting

### History not persisting

Make sure persistence is enabled:

```typescript
const manager = new UndoRedoManager(initialState, {
  enablePersistence: true,
  storageKey: 'unique-key'
});
```

### Keyboard shortcuts not working

Ensure the hook is called in a mounted component:

```typescript
function App() {
  useUndoRedoShortcuts({ onUndo, onRedo });
  return <div>...</div>;
}
```

### Stack size exceeded

Increase the max stack size:

```typescript
const manager = new UndoRedoManager(initialState, {
  maxStackSize: 100 // Increase from default 50
});
```

## License

Part of the Advanced Grid Editor Improvements feature.
