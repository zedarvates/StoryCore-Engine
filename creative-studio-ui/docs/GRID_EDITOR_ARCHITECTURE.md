# Architecture de l'Éditeur de Grille Avancé

## Vue d'Ensemble

Ce document décrit l'architecture technique de l'éditeur de grille avancé, incluant les composants, services, flux de données et patterns de conception utilisés.

## Architecture en Couches

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Components  │  │  Animations  │  │     UI       │      │
│  │   (React)    │  │   (Framer)   │  │  (Tailwind)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Services   │  │   Managers   │  │    Hooks     │      │
│  │  (Classes)   │  │  (Classes)   │  │  (Custom)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    State     │  │    Cache     │  │   Storage    │      │
│  │  (Zustand)   │  │   (Memory)   │  │ (IndexedDB)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Composants Principaux

### 1. Visualisation Vidéo

```
VideoPlayer
    ├── VideoControls
    │   ├── PlayPauseButton
    │   ├── SeekBar
    │   ├── VolumeControl
    │   └── PlaybackRateSelector
    ├── VideoCanvas
    └── TimecodeDisplay

VideoSequencePlayer
    ├── VideoPlayer (multiple)
    └── TransitionManager

VideoThumbnailPreview
    ├── ThumbnailImage
    └── TimecodeOverlay
```

### 2. Système de Grille

```
GridLayout
    ├── GridLines
    ├── GridItem (multiple)
    │   └── DraggableShot
    ├── AlignmentGuides
    └── SnapIndicators

ResponsiveGridLayout
    ├── GridLayout
    └── BreakpointManager
```

### 3. Timeline

```
Timeline
    ├── TimelineHeader
    ├── TimelineTrack
    │   └── DraggableShot (multiple)
    ├── TimelineRuler
    └── PlayheadIndicator
```

### 4. Édition

```
ShotFrameViewer
    ├── VideoPlayer
    ├── MetadataEditor
    │   ├── TextField
    │   ├── TagInput
    │   └── NotesArea
    ├── InOutPointMarkers
    └── FrameComparison
```

## Services et Gestionnaires

### Architecture des Services

```
Service Layer
    ├── DragDropManager
    │   ├── DragState
    │   ├── DropZoneManager
    │   └── AutoScrollHandler
    │
    ├── UndoRedoManager
    │   ├── UndoStack
    │   ├── RedoStack
    │   └── StateSerializer
    │
    ├── BatchOperationsManager
    │   ├── WorkerPool
    │   ├── TaskQueue
    │   └── ProgressTracker
    │
    ├── ThumbnailCache
    │   ├── MemoryCache (LRU)
    │   ├── IndexedDBCache
    │   └── PreloadManager
    │
    ├── SearchService
    │   ├── QueryParser
    │   ├── FilterEngine
    │   └── ResultRanker
    │
    └── ClipboardManager
        ├── ClipboardState
        └── MetadataSerializer
```

## Flux de Données

### 1. Flux de Glisser-Déposer

```
User Action (Mouse Down)
    ↓
DragDropManager.startDrag()
    ↓
Update Drag State
    ↓
Render Drag Preview
    ↓
User Action (Mouse Move)
    ↓
DragDropManager.updateDrag()
    ↓
Calculate Drop Position
    ↓
Show Drop Indicators
    ↓
User Action (Mouse Up)
    ↓
DragDropManager.endDrag()
    ↓
Execute Drop Action
    ↓
UndoRedoManager.execute()
    ↓
Update State
    ↓
Re-render Components
```

### 2. Flux d'Annuler/Refaire

```
User Action (Modify State)
    ↓
UndoRedoManager.execute()
    ├── Save Current State to Undo Stack
    ├── Clear Redo Stack
    └── Apply New State
    ↓
Update UI
    ↓
User Action (Ctrl+Z)
    ↓
UndoRedoManager.undo()
    ├── Pop from Undo Stack
    ├── Push Current State to Redo Stack
    └── Restore Previous State
    ↓
Update UI
```

### 3. Flux de Cache de Thumbnails

```
Request Thumbnail
    ↓
ThumbnailCache.get()
    ├── Check Memory Cache
    │   └── [Hit] Return Blob
    │
    └── [Miss] Check IndexedDB
        ├── [Hit] 
        │   ├── Load to Memory
        │   └── Return Blob
        │
        └── [Miss]
            ├── Generate Thumbnail (Worker)
            ├── Save to IndexedDB
            ├── Save to Memory
            └── Return Blob
```

## Patterns de Conception

### 1. Observer Pattern (State Management)

```typescript
// Zustand store observe les changements
const useGridStore = create((set) => ({
  items: [],
  updateItems: (items) => set({ items }),
}));

// Les composants s'abonnent aux changements
const GridLayout = () => {
  const items = useGridStore((state) => state.items);
  // Re-render automatique quand items change
};
```

### 2. Command Pattern (Undo/Redo)

```typescript
interface Command {
  execute(): void;
  undo(): void;
  description: string;
}

class MoveItemCommand implements Command {
  execute() { /* move item */ }
  undo() { /* restore position */ }
  description = 'Move item';
}

// UndoRedoManager gère la pile de commandes
manager.execute(new MoveItemCommand());
```

### 3. Strategy Pattern (Search Filters)

```typescript
interface FilterStrategy {
  filter(shots: Shot[], query: string): Shot[];
}

class NameFilterStrategy implements FilterStrategy {
  filter(shots, query) {
    return shots.filter(s => s.name.includes(query));
  }
}

class TagFilterStrategy implements FilterStrategy {
  filter(shots, query) {
    return shots.filter(s => s.tags.includes(query));
  }
}

// SearchService utilise la stratégie appropriée
searchService.setStrategy(new NameFilterStrategy());
```

### 4. Factory Pattern (Context Menu)

```typescript
class ContextMenuFactory {
  static createMenu(context: MenuContext): ContextMenuItem[] {
    switch (context.type) {
      case 'single-shot':
        return this.createSingleShotMenu(context);
      case 'multiple-shots':
        return this.createMultipleShotsMenu(context);
      case 'empty':
        return this.createEmptyMenu(context);
    }
  }
}
```

### 5. Singleton Pattern (Cache, Managers)

```typescript
class ThumbnailCache {
  private static instance: ThumbnailCache;
  
  static getInstance(): ThumbnailCache {
    if (!this.instance) {
      this.instance = new ThumbnailCache();
    }
    return this.instance;
  }
  
  private constructor() { /* ... */ }
}
```

## Optimisations de Performance

### 1. Rendu Optimisé

```
Component Tree
    ├── React.memo (évite re-render si props identiques)
    ├── useMemo (mémorise calculs coûteux)
    └── useCallback (mémorise fonctions)
```

### 2. Chargement Asynchrone

```
Initial Load
    ├── Load Critical Components (sync)
    └── Load Non-Critical Components (lazy)
        ├── React.lazy()
        └── Suspense boundary
```

### 3. Web Workers

```
Main Thread
    ├── UI Rendering
    └── User Interactions
    
Worker Thread
    ├── Thumbnail Generation
    ├── Video Processing
    └── Batch Operations
```

### 4. Cache Strategy

```
Cache Hierarchy
    ├── L1: Memory Cache (LRU, fast)
    ├── L2: IndexedDB (persistent, medium)
    └── L3: Network/Generation (slow)
```

## Gestion d'État

### State Structure

```typescript
interface GridEditorState {
  // Layout
  layout: {
    config: GridLayoutConfig;
    items: Panel[];
  };
  
  // Selection
  selection: {
    selectedIds: string[];
    lastSelectedId: string | null;
  };
  
  // History
  history: {
    undoStack: HistoryEntry[];
    redoStack: HistoryEntry[];
    currentIndex: number;
  };
  
  // UI
  ui: {
    isDragging: boolean;
    draggedItems: Panel[];
    contextMenu: ContextMenuState | null;
    searchQuery: string;
  };
  
  // Cache
  cache: {
    thumbnails: Map<string, Blob>;
    metadata: Map<string, ShotMetadata>;
  };
}
```

## Sécurité et Validation

### Input Validation

```
User Input
    ↓
Validation Layer
    ├── Type Checking (TypeScript)
    ├── Schema Validation (Zod)
    └── Business Rules
    ↓
Sanitization
    ↓
Processing
```

### Error Handling

```
Try-Catch Blocks
    ↓
Error Boundary (React)
    ↓
Error Logger
    ├── Console (dev)
    └── Monitoring Service (prod)
    ↓
User Notification
```

## Extensibilité

### Plugin Architecture

```
Core System
    ├── Plugin Registry
    ├── Plugin Loader
    └── Plugin API
    
Plugins
    ├── Custom Filters
    ├── Custom Operations
    ├── Custom Animations
    └── Custom Themes
```

---

**Version** : 1.0.0  
**Dernière mise à jour** : Janvier 2026
