# Guide Développeur - Éditeur de Grille Avancé

## Table des Matières

1. [Architecture](#architecture)
2. [Structure du Code](#structure-du-code)
3. [Composants Principaux](#composants-principaux)
4. [Services et Gestionnaires](#services-et-gestionnaires)
5. [Hooks Personnalisés](#hooks-personnalisés)
6. [Patterns de Conception](#patterns-de-conception)
7. [Optimisations de Performance](#optimisations-de-performance)
8. [Tests](#tests)
9. [Extension et Personnalisation](#extension-et-personnalisation)
10. [Débogage](#débogage)

## Architecture

### Vue d'Ensemble

L'éditeur de grille suit une architecture en couches :

```
┌─────────────────────────────────────┐
│     Presentation Layer              │
│  (Components, UI, Animations)       │
├─────────────────────────────────────┤
│     Business Logic Layer            │
│  (Services, Managers, Hooks)        │
├─────────────────────────────────────┤
│     Data Layer                      │
│  (State Management, Cache, Storage) │
└─────────────────────────────────────┘
```

### Technologies Clés

- **React 18+** : Concurrent rendering, Suspense
- **TypeScript 5+** : Type safety strict
- **Framer Motion** : Animations déclaratives
- **Zustand** : State management léger
- **React DnD** : Drag and drop
- **IndexedDB** : Cache persistant
- **Web Workers** : Traitement asynchrone

### Principes de Conception

1. **Séparation des préoccupations** : UI, logique métier, données
2. **Composition** : Composants réutilisables et composables
3. **Performance** : Optimisations React (memo, useMemo, useCallback)
4. **Accessibilité** : Support ARIA et navigation clavier
5. **Testabilité** : Code modulaire et testable



## Structure du Code

### Organisation des Fichiers

```
src/
├── components/
│   ├── gridEditor/          # Composants de grille
│   │   ├── GridLayout.tsx
│   │   ├── ResponsiveGridLayout.tsx
│   │   └── ConfigurationExportImport.tsx
│   ├── timeline/            # Composants de timeline
│   │   ├── Timeline.tsx
│   │   └── DraggableShot.tsx
│   ├── video/               # Composants vidéo
│   │   ├── VideoPlayer.tsx
│   │   └── VideoThumbnailPreview.tsx
│   ├── contextMenu/         # Menu contextuel
│   │   └── ContextMenu.tsx
│   ├── batchOperations/     # Opérations par lots
│   │   ├── BatchOperationsToolbar.tsx
│   │   └── BulkMetadataEditor.tsx
│   ├── search/              # Recherche et filtrage
│   │   ├── SearchBar.tsx
│   │   └── AdvancedSearch.tsx
│   ├── animation/           # Animations
│   │   ├── StateTransition.tsx
│   │   └── LoadingAnimations.tsx
│   └── undoRedo/            # Annuler/Refaire
│       └── UndoRedoToolbar.tsx
├── services/
│   ├── dragDrop/            # Glisser-déposer
│   │   └── DragDropManager.ts
│   ├── undoRedo/            # Historique
│   │   ├── UndoRedoManager.ts
│   │   └── UndoRedoPersistence.ts
│   ├── batchOperations/     # Opérations par lots
│   │   ├── BatchOperationsManager.ts
│   │   └── WorkerPool.ts
│   ├── cache/               # Cache
│   │   └── ThumbnailCache.ts
│   ├── contextMenu/         # Menu contextuel
│   │   ├── ContextMenuBuilder.ts
│   │   └── ContextMenuActions.ts
│   ├── clipboard/           # Presse-papiers
│   │   └── ClipboardManager.ts
│   ├── search/              # Recherche
│   │   └── SearchService.ts
│   ├── gridEditor/          # Configuration
│   │   └── ConfigurationExportImport.ts
│   └── animation/           # Orchestration
│       └── AnimationOrchestrator.ts
├── hooks/
│   ├── useUndoRedo.ts
│   ├── useResponsiveGrid.ts
│   ├── useThumbnailCache.ts
│   └── useUndoRedoShortcuts.ts
├── workers/
│   └── processing.worker.ts
├── config/
│   └── animations.ts
└── examples/
    ├── GridEditorExample.tsx
    ├── VideoPlayerExample.tsx
    └── ...
```

### Conventions de Nommage

- **Composants** : PascalCase (ex: `GridLayout.tsx`)
- **Services** : PascalCase (ex: `DragDropManager.ts`)
- **Hooks** : camelCase avec préfixe `use` (ex: `useUndoRedo.ts`)
- **Types** : PascalCase avec suffixe (ex: `GridLayoutProps`)
- **Constantes** : UPPER_SNAKE_CASE (ex: `MAX_UNDO_LEVELS`)



## Composants Principaux

### GridLayout

Composant principal pour la disposition en grille avec snap-to-grid.

```typescript
interface GridLayoutProps {
  config: GridLayoutConfig;
  items: Panel[];
  onLayoutChange?: (items: Panel[]) => void;
}

interface GridLayoutConfig {
  columns: number;
  rows: number;
  gap: number;
  cellSize: { width: number; height: number };
  snapEnabled: boolean;
  snapThreshold: number;
  showGridLines: boolean;
}
```

**Utilisation** :

```typescript
<GridLayout
  config={{
    columns: 4,
    rows: 3,
    gap: 16,
    cellSize: { width: 200, height: 150 },
    snapEnabled: true,
    snapThreshold: 10,
    showGridLines: true
  }}
  items={panels}
  onLayoutChange={handleLayoutChange}
/>
```

### VideoPlayer

Lecteur vidéo avec contrôles et navigation frame-accurate.

```typescript
interface VideoPlayerProps {
  shot: Shot;
  autoPlay?: boolean;
  controls?: boolean;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  playbackRate?: number;
}
```

**Fonctionnalités** :

- Lecture/pause
- Navigation frame par frame
- Vitesses de lecture (0.25x à 2x)
- Timecode précis
- Gestion d'erreurs

### DraggableShot

Composant de plan avec support drag-and-drop.

```typescript
interface DraggableShotProps {
  shot: Shot;
  isSelected: boolean;
  onDragStart?: (shot: Shot) => void;
  onDragEnd?: (shot: Shot, position: Position) => void;
}
```

**Intégration** :

```typescript
<DraggableShot
  shot={shot}
  isSelected={selectedShots.includes(shot.id)}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
/>
```

### ContextMenu

Menu contextuel adaptatif avec sous-menus.

```typescript
interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  submenu?: ContextMenuItem[];
  action?: () => void;
}
```



## Services et Gestionnaires

### DragDropManager

Gère les opérations de glisser-déposer.

```typescript
class DragDropManager {
  startDrag(items: Shot[], event: DragEvent): void;
  updateDrag(event: DragEvent): void;
  endDrag(event: DragEvent): void;
  cancelDrag(): void;
  calculateDropPosition(x: number, y: number): Position;
  handleAutoScroll(event: DragEvent): void;
}
```

**Exemple** :

```typescript
const manager = new DragDropManager({
  type: 'shot',
  allowCopy: true,
  allowMultiple: true,
  snapToGrid: true,
  autoScroll: true
});

manager.startDrag([shot], event);
```

### UndoRedoManager

Gère l'historique des actions avec pile d'annulation.

```typescript
class UndoRedoManager<T> {
  execute(description: string, newState: T): void;
  undo(): T | null;
  redo(): T | null;
  canUndo(): boolean;
  canRedo(): boolean;
  markAsSaved(): void;
  hasUnsavedChanges(): boolean;
}
```

**Utilisation** :

```typescript
const manager = new UndoRedoManager(initialState);

// Exécuter une action
manager.execute('Move shot', newState);

// Annuler
const previousState = manager.undo();

// Refaire
const nextState = manager.redo();
```

### BatchOperationsManager

Gère les opérations par lots avec traitement parallèle.

```typescript
class BatchOperationsManager {
  async execute(
    type: 'delete' | 'duplicate' | 'export' | 'transform' | 'tag',
    items: Shot[],
    options?: any
  ): Promise<BatchOperationResult>;
  
  cancel(operationId: string): void;
  getOperation(operationId: string): BatchOperation | undefined;
}
```

**Exemple** :

```typescript
const manager = new BatchOperationsManager(4); // 4 workers

const result = await manager.execute('duplicate', selectedShots);

console.log(`${result.success.length} plans dupliqués`);
console.log(`${result.failed.length} échecs`);
```

### ThumbnailCache

Cache LRU pour les thumbnails avec persistance IndexedDB.

```typescript
class ThumbnailCache {
  async get(videoUrl: string, time: number): Promise<Blob | null>;
  async set(videoUrl: string, time: number, blob: Blob): Promise<void>;
  async preload(videoUrl: string, times: number[]): Promise<void>;
  clear(): void;
}
```



## Hooks Personnalisés

### useUndoRedo

Hook pour gérer l'historique avec état React.

```typescript
const useUndoRedo = <T>(initialState: T) => {
  const { state, execute, undo, redo, canUndo, canRedo } = useUndoRedo(initialState);
  
  return {
    state,
    execute,
    undo,
    redo,
    canUndo,
    canRedo,
    undoDescription: string | null,
    redoDescription: string | null
  };
};
```

**Exemple** :

```typescript
const { state, execute, undo, redo, canUndo, canRedo } = useUndoRedo({
  shots: [],
  layout: defaultLayout
});

// Modifier l'état
execute('Add shot', { ...state, shots: [...state.shots, newShot] });

// Annuler
if (canUndo) undo();
```

### useResponsiveGrid

Hook pour gérer la disposition responsive.

```typescript
const useResponsiveGrid = (config: ResponsiveGridConfig) => {
  const { breakpoint, columns, isMobile, isTablet, isDesktop } = useResponsiveGrid(config);
  
  return {
    breakpoint,
    columns,
    isMobile,
    isTablet,
    isDesktop,
    gridConfig: GridLayoutConfig
  };
};
```

### useThumbnailCache

Hook pour charger les thumbnails avec cache.

```typescript
const useThumbnailCache = (videoUrl: string, time: number) => {
  const { thumbnailUrl, isLoading, error } = useThumbnailCache(videoUrl, time);
  
  return { thumbnailUrl, isLoading, error };
};
```

**Utilisation** :

```typescript
const { thumbnailUrl, isLoading } = useThumbnailCache(shot.videoUrl, currentTime);

return (
  <div>
    {isLoading ? <Spinner /> : <img src={thumbnailUrl} />}
  </div>
);
```

### useUndoRedoShortcuts

Hook pour gérer les raccourcis clavier.

```typescript
const useUndoRedoShortcuts = (
  onUndo: () => void,
  onRedo: () => void,
  enabled: boolean = true
) => {
  // Écoute Ctrl+Z et Ctrl+Shift+Z
};
```



## Patterns de Conception

### 1. Composition de Composants

Privilégiez la composition à l'héritage :

```typescript
// ✅ Bon : Composition
<GridLayout config={config}>
  <DraggableShot shot={shot} />
  <AlignmentGuides guides={guides} />
</GridLayout>

// ❌ Éviter : Héritage
class ExtendedGridLayout extends GridLayout {
  // ...
}
```

### 2. Render Props

Pour partager la logique entre composants :

```typescript
<DragDropContext>
  {({ isDragging, draggedItem }) => (
    <div className={isDragging ? 'dragging' : ''}>
      {draggedItem && <DragPreview item={draggedItem} />}
    </div>
  )}
</DragDropContext>
```

### 3. Higher-Order Components (HOC)

Pour ajouter des fonctionnalités :

```typescript
const withUndoRedo = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return (props: P) => {
    const undoRedo = useUndoRedo(initialState);
    return <Component {...props} undoRedo={undoRedo} />;
  };
};

const EnhancedEditor = withUndoRedo(GridEditor);
```

### 4. Custom Hooks

Encapsulez la logique réutilisable :

```typescript
const useGridEditor = (initialConfig: GridLayoutConfig) => {
  const [config, setConfig] = useState(initialConfig);
  const [items, setItems] = useState<Panel[]>([]);
  const undoRedo = useUndoRedo({ config, items });
  
  const updateLayout = useCallback((newItems: Panel[]) => {
    undoRedo.execute('Update layout', { config, items: newItems });
  }, [config, undoRedo]);
  
  return {
    config,
    items,
    updateLayout,
    undo: undoRedo.undo,
    redo: undoRedo.redo
  };
};
```

### 5. Service Layer

Séparez la logique métier des composants :

```typescript
// Service
class GridEditorService {
  static calculateSnapPosition(
    position: Position,
    gridConfig: GridLayoutConfig
  ): Position {
    // Logique de snap
  }
  
  static validateLayout(items: Panel[]): ValidationResult {
    // Validation
  }
}

// Composant
const GridEditor = () => {
  const handleDrop = (position: Position) => {
    const snappedPosition = GridEditorService.calculateSnapPosition(
      position,
      config
    );
    // ...
  };
};
```



## Optimisations de Performance

### 1. React.memo

Évitez les re-rendus inutiles :

```typescript
const ShotItem = React.memo<ShotItemProps>(({ shot, isSelected }) => {
  return (
    <div className={isSelected ? 'selected' : ''}>
      {shot.name}
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparaison personnalisée
  return prevProps.shot.id === nextProps.shot.id &&
         prevProps.isSelected === nextProps.isSelected;
});
```

### 2. useMemo

Mémorisez les calculs coûteux :

```typescript
const GridLayout = ({ items, config }) => {
  const gridPositions = useMemo(() => {
    return items.map(item => 
      calculateGridPosition(item, config)
    );
  }, [items, config]);
  
  return <div>{/* Rendu */}</div>;
};
```

### 3. useCallback

Mémorisez les fonctions de callback :

```typescript
const GridEditor = () => {
  const handleDrop = useCallback((item: Panel, position: Position) => {
    setItems(prev => updateItemPosition(prev, item.id, position));
  }, []); // Dépendances vides si setItems est stable
  
  return <DraggableShot onDrop={handleDrop} />;
};
```

### 4. Lazy Loading

Chargez les composants à la demande :

```typescript
const VideoPlayer = React.lazy(() => import('./VideoPlayer'));

const GridEditor = () => {
  return (
    <Suspense fallback={<Spinner />}>
      <VideoPlayer shot={currentShot} />
    </Suspense>
  );
};
```

### 5. Web Workers

Déléguez le traitement lourd :

```typescript
// worker.ts
self.onmessage = (event) => {
  const { type, data } = event.data;
  
  if (type === 'generateThumbnail') {
    const thumbnail = generateThumbnail(data);
    self.postMessage({ type: 'thumbnail', data: thumbnail });
  }
};

// Component
const useThumbnailWorker = () => {
  const workerRef = useRef<Worker>();
  
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/thumbnail.worker.ts', import.meta.url)
    );
    
    return () => workerRef.current?.terminate();
  }, []);
  
  const generateThumbnail = useCallback((videoUrl: string) => {
    workerRef.current?.postMessage({
      type: 'generateThumbnail',
      data: videoUrl
    });
  }, []);
  
  return { generateThumbnail };
};
```

### 6. Debouncing et Throttling

Limitez la fréquence des appels :

```typescript
import { debounce } from 'lodash';

const SearchBar = () => {
  const handleSearch = useMemo(
    () => debounce((query: string) => {
      performSearch(query);
    }, 300),
    []
  );
  
  return <input onChange={(e) => handleSearch(e.target.value)} />;
};
```



## Tests

### Tests Unitaires

Testez les composants isolément :

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { GridLayout } from './GridLayout';

describe('GridLayout', () => {
  it('renders items correctly', () => {
    const items = [{ id: '1', name: 'Shot 1' }];
    render(<GridLayout items={items} config={defaultConfig} />);
    
    expect(screen.getByText('Shot 1')).toBeInTheDocument();
  });
  
  it('calls onLayoutChange when item is moved', () => {
    const onLayoutChange = vi.fn();
    render(
      <GridLayout
        items={items}
        config={config}
        onLayoutChange={onLayoutChange}
      />
    );
    
    // Simuler un drag-and-drop
    const item = screen.getByTestId('shot-1');
    fireEvent.dragStart(item);
    fireEvent.drop(screen.getByTestId('drop-zone'));
    
    expect(onLayoutChange).toHaveBeenCalled();
  });
});
```

### Tests d'Intégration

Testez les interactions entre composants :

```typescript
describe('Grid Editor Integration', () => {
  it('supports undo/redo workflow', async () => {
    const { user } = render(<GridEditor />);
    
    // Ajouter un plan
    await user.click(screen.getByText('Add Shot'));
    expect(screen.getByText('Shot 1')).toBeInTheDocument();
    
    // Annuler
    await user.keyboard('{Control>}z{/Control}');
    expect(screen.queryByText('Shot 1')).not.toBeInTheDocument();
    
    // Refaire
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(screen.getByText('Shot 1')).toBeInTheDocument();
  });
});
```

### Tests de Services

Testez la logique métier :

```typescript
describe('UndoRedoManager', () => {
  it('maintains history correctly', () => {
    const manager = new UndoRedoManager({ count: 0 });
    
    manager.execute('Increment', { count: 1 });
    manager.execute('Increment', { count: 2 });
    
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
    
    const state = manager.undo();
    expect(state?.count).toBe(1);
    expect(manager.canRedo()).toBe(true);
  });
  
  it('respects max stack size', () => {
    const manager = new UndoRedoManager({ count: 0 });
    
    // Ajouter 51 actions (limite = 50)
    for (let i = 1; i <= 51; i++) {
      manager.execute(`Action ${i}`, { count: i });
    }
    
    // Annuler 50 fois devrait fonctionner
    for (let i = 0; i < 50; i++) {
      manager.undo();
    }
    
    // La 51ème annulation devrait échouer
    expect(manager.canUndo()).toBe(false);
  });
});
```

### Tests de Performance

Mesurez les performances :

```typescript
describe('Performance', () => {
  it('renders 50 shots in under 100ms', () => {
    const shots = Array.from({ length: 50 }, (_, i) => ({
      id: `shot-${i}`,
      name: `Shot ${i}`
    }));
    
    const start = performance.now();
    render(<GridLayout items={shots} config={config} />);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(100);
  });
});
```



## Extension et Personnalisation

### Ajouter un Nouveau Type d'Opération par Lots

1. Étendre l'interface `BatchOperation` :

```typescript
type BatchOperationType = 
  | 'delete' 
  | 'duplicate' 
  | 'export' 
  | 'transform' 
  | 'tag'
  | 'custom'; // Nouveau type
```

2. Implémenter le traitement :

```typescript
class BatchOperationsManager {
  private async processItem(
    type: BatchOperation['type'],
    shot: Shot,
    options?: any
  ): Promise<Shot> {
    switch (type) {
      case 'custom':
        return this.customOperation(shot, options);
      // ... autres cas
    }
  }
  
  private async customOperation(shot: Shot, options: any): Promise<Shot> {
    // Votre logique personnalisée
    return modifiedShot;
  }
}
```

### Créer un Plugin d'Animation

```typescript
// plugins/customAnimation.ts
export const customAnimation = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.8 },
  transition: { duration: 0.3, ease: 'easeOut' }
};

// Utilisation
import { customAnimation } from './plugins/customAnimation';

<motion.div {...customAnimation}>
  {content}
</motion.div>
```

### Ajouter un Filtre Personnalisé

```typescript
// services/search/customFilters.ts
export const customFilters = {
  myCustomFilter: (shots: Shot[], params: any) => {
    return shots.filter(shot => {
      // Votre logique de filtrage
      return shot.customProperty === params.value;
    });
  }
};

// Enregistrer le filtre
SearchService.registerFilter('myCustomFilter', customFilters.myCustomFilter);
```

### Personnaliser le Thème

```typescript
// config/theme.ts
export const customTheme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500
    }
  }
};
```



## Débogage

### React DevTools

Utilisez React DevTools pour inspecter les composants :

1. Installer l'extension React DevTools
2. Ouvrir les DevTools (F12)
3. Onglet "Components" pour voir la hiérarchie
4. Onglet "Profiler" pour analyser les performances

### Console Logging

Ajoutez des logs stratégiques :

```typescript
const GridLayout = ({ items, config }) => {
  useEffect(() => {
    console.log('[GridLayout] Items changed:', items.length);
  }, [items]);
  
  useEffect(() => {
    console.log('[GridLayout] Config changed:', config);
  }, [config]);
  
  return <div>{/* ... */}</div>;
};
```

### Performance Monitoring

Utilisez le Performance Monitor intégré :

```typescript
import { PerformanceMonitor } from '@/services/performance';

const monitor = PerformanceMonitor.getInstance();

// Mesurer une opération
monitor.startMeasure('render-grid');
// ... opération
monitor.endMeasure('render-grid');

// Obtenir les métriques
const metrics = monitor.getMetrics();
console.log('FPS:', metrics.fps);
console.log('Memory:', metrics.memory);
```

### Debugging Web Workers

```typescript
// worker.ts
self.addEventListener('message', (event) => {
  console.log('[Worker] Received:', event.data);
  
  try {
    const result = processData(event.data);
    self.postMessage({ success: true, result });
  } catch (error) {
    console.error('[Worker] Error:', error);
    self.postMessage({ success: false, error: error.message });
  }
});
```

### Breakpoints Conditionnels

Utilisez des breakpoints conditionnels dans le code :

```typescript
const handleDrop = (item: Panel, position: Position) => {
  // Breakpoint si l'item a un ID spécifique
  if (item.id === 'problematic-id') {
    debugger; // Le débogueur s'arrêtera ici
  }
  
  updateLayout(item, position);
};
```

### Error Boundaries

Capturez les erreurs React :

```typescript
class GridEditorErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GridEditor] Error:', error, errorInfo);
    // Envoyer à un service de monitoring
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Une erreur est survenue</h2>
          <pre>{this.state.error?.message}</pre>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

## Ressources

### Documentation

- **Guide utilisateur** : `GRID_EDITOR_USER_GUIDE.md`
- **Référence rapide** : `GRID_EDITOR_QUICK_REFERENCE.md`
- **Spécifications** : `.kiro/specs/advanced-grid-editor-improvements/`

### Exemples

Consultez les exemples dans `src/examples/` :

- `GridEditorExample.tsx` : Exemple complet d'éditeur
- `VideoPlayerExample.tsx` : Lecteur vidéo
- `DragDropExample.tsx` : Glisser-déposer
- `UndoRedoExample.tsx` : Annuler/Refaire
- `BatchOperationsExample.tsx` : Opérations par lots

### Tests

Voir les tests dans `src/__tests__/` et `src/components/**/__tests__/`

### API Reference

Consultez les fichiers TypeScript pour la documentation inline des types et interfaces.

---

**Version** : 1.0.0  
**Dernière mise à jour** : Janvier 2026  
**Auteur** : StoryCore Creative Studio Team
