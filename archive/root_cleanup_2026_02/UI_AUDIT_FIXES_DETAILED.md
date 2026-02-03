# 🔧 FIXES DÉTAILLÉES - AUDIT UI

---

## FIX #1: Supprimer les Props Non Utilisées

**Fichier**: `creative-studio-ui/src/components/wizard/project-setup/ProjectSetupWizardContainer.tsx`

### ❌ AVANT
```typescript
interface ProjectSetupWizardContainerProps {
  title: string;
  steps: Array<{ id: string; title: string; description?: string }>;
  children: React.ReactNode;
  onCancel: () => void;
  onComplete?: () => void;
  allowJumpToStep?: boolean;        // ❌ JAMAIS UTILISÉ
  showAutoSaveIndicator?: boolean;  // ❌ JAMAIS UTILISÉ
}

export function ProjectSetupWizardContainer({
  title,
  steps,
  children,
  onCancel,
  onComplete,
  allowJumpToStep = false,          // Déclaré mais ignoré
  showAutoSaveIndicator = false,    // Déclaré mais ignoré
}: ProjectSetupWizardContainerProps) {
  // ...
}
```

### ✅ APRÈS
```typescript
interface ProjectSetupWizardContainerProps {
  title: string;
  steps: Array<{ id: string; title: string; description?: string }>;
  children: React.ReactNode;
  onCancel: () => void;
  onComplete?: () => void;
}

export function ProjectSetupWizardContainer({
  title,
  steps,
  children,
  onCancel,
  onComplete,
}: ProjectSetupWizardContainerProps) {
  // ...
}
```

---

## FIX #2: Supprimer les Modales Dupliquées

**Fichier**: `creative-studio-ui/src/App.tsx` (lignes 850-860)

### ❌ AVANT
```typescript
{/* Feedback Panel */}
<FeedbackPanel
  isOpen={showFeedbackPanel}
  onClose={() => setShowFeedbackPanel(false)}
  initialContext={feedbackInitialContext}
  onOpenPendingReports={() => setShowPendingReportsList(true)}
/>

{/* Pending Reports List */}
<PendingReportsList
  isOpen={showPendingReportsList}
  onClose={() => setShowPendingReportsList(false)}
/>

{/* Pending Reports List */}  {/* ❌ DOUBLON! */}
<PendingReportsList
  isOpen={showPendingReportsList}
  onClose={() => setShowPendingReportsList(false)}
/>
```

### ✅ APRÈS
```typescript
{/* Feedback Panel */}
<FeedbackPanel
  isOpen={showFeedbackPanel}
  onClose={() => setShowFeedbackPanel(false)}
  initialContext={feedbackInitialContext}
  onOpenPendingReports={() => setShowPendingReportsList(true)}
/>

{/* Pending Reports List */}
<PendingReportsList
  isOpen={showPendingReportsList}
  onClose={() => setShowPendingReportsList(false)}
/>
```

---

## FIX #3: Standardiser les IDs Characters

**Fichier**: `creative-studio-ui/src/store/index.ts`

### ❌ AVANT
```typescript
// Incohérence: character_id vs id

deleteCharacter: (id) =>
  set((state) => {
    const deletedCharacter = state.characters.find(
      (c) => c.character_id === id  // ← Cherche par character_id
    );
    const filteredCharacters = state.characters.filter(
      (character) => character.character_id !== id  // ← Filtre par character_id
    );
    // ...
  }),

// Mais dans CharactersModal:
onDelete={(character) => deleteCharacter(character.id)}  // ← Passe character.id!
// character.id !== character.character_id → BUG!
```

### ✅ APRÈS
```typescript
// Solution 1: Utiliser character_id partout
deleteCharacter: (id) =>
  set((state) => {
    const deletedCharacter = state.characters.find(
      (c) => c.character_id === id
    );
    const filteredCharacters = state.characters.filter(
      (character) => character.character_id !== id
    );
    
    // Aussi mettre à jour le projet
    const updatedProject = state.project ? {
      ...state.project,
      characters: filteredCharacters
    } : null;
    
    // Émettre l'événement
    if (deletedCharacter) {
      eventEmitter.emit<CharacterDeletedPayload>(
        WizardEventType.CHARACTER_DELETED,
        {
          characterId: id,
          characterName: deletedCharacter.name,
          timestamp: new Date(),
          source: 'store',
        }
      );
    }

    return {
      characters: filteredCharacters,
      project: updatedProject,
    };
  }),

// Et dans CharactersModal:
onDelete={(character) => deleteCharacter(character.character_id)}  // ✅ Correct
```

---

## FIX #4: Ajouter Validation au Wizard Completion

**Fichier**: `creative-studio-ui/src/store/index.ts`

### ❌ AVANT
```typescript
completeWizard: async (output, projectPath) => {
  const wizardService = getWizardService();
  
  try {
    // Aucune validation de output
    // Aucune vérification de projectPath
    
    await wizardService.saveWizardOutput(output, projectPath);
    await wizardService.updateProjectData(projectPath, output);
    
    const state = get();
    
    switch (output.type) {
      case 'character':
        const character: Character = {
          character_id: output.data.id,  // ← Peut être undefined!
          name: output.data.name,        // ← Peut être undefined!
          // ...
        };
        // ...
    }
  }
}
```

### ✅ APRÈS
```typescript
completeWizard: async (output, projectPath) => {
  const wizardService = getWizardService();
  
  try {
    // Validation 1: Vérifier output
    if (!output || !output.type || !output.data) {
      throw new Error('Invalid wizard output: missing required fields');
    }
    
    // Validation 2: Vérifier projectPath
    if (!projectPath || typeof projectPath !== 'string') {
      throw new Error('Invalid project path');
    }
    
    // Validation 3: Vérifier les données spécifiques
    if (output.type === 'character') {
      if (!output.data.id || !output.data.name) {
        throw new Error('Invalid character data: missing id or name');
      }
    }
    
    await wizardService.saveWizardOutput(output, projectPath);
    await wizardService.updateProjectData(projectPath, output);
    
    const state = get();
    
    switch (output.type) {
      case 'character':
        const character: Character = {
          character_id: output.data.id,
          name: output.data.name,
          creation_method: 'wizard' as const,
          creation_timestamp: output.data.created_at || new Date(),
          version: '1.0',
          // ... rest of character data
        };
        
        // Ajouter le caractère
        const newCharacters = [...state.characters, character];
        const updatedProject = state.project ? {
          ...state.project,
          characters: newCharacters
        } : null;
        
        return {
          characters: newCharacters,
          project: updatedProject,
        };
    }
  } catch (error) {
    console.error('Failed to complete wizard:', error);
    
    // Émettre un événement d'erreur
    eventEmitter.emit('wizard:error', {
      type: output?.type,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    });
    
    throw error;
  }
}
```

---

## FIX #5: Implémenter localStorage avec Limite de Taille

**Fichier**: `creative-studio-ui/src/utils/storageManager.ts` (NOUVEAU)

### ✅ CRÉER
```typescript
/**
 * Storage Manager - Gère localStorage avec limite de taille
 * Bascule vers IndexedDB si localStorage est plein
 */

const STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB
const STORAGE_WARNING_THRESHOLD = 0.8; // 80%

interface StorageStats {
  used: number;
  limit: number;
  percentage: number;
  available: number;
}

export class StorageManager {
  private static getStorageSize(): number {
    let size = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage[key].length + key.length;
      }
    }
    return size;
  }

  static getStats(): StorageStats {
    const used = this.getStorageSize();
    const limit = STORAGE_LIMIT;
    const percentage = (used / limit) * 100;
    const available = limit - used;

    return { used, limit, percentage, available };
  }

  static canStore(data: string): boolean {
    const stats = this.getStats();
    const dataSize = data.length;
    return stats.available > dataSize;
  }

  static setItem(key: string, value: string): boolean {
    try {
      const stats = this.getStats();
      
      // Avertissement si proche de la limite
      if (stats.percentage > STORAGE_WARNING_THRESHOLD) {
        console.warn(
          `⚠️ Storage usage at ${stats.percentage.toFixed(1)}%`,
          stats
        );
      }

      // Vérifier si on peut stocker
      if (!this.canStore(value)) {
        console.error(
          `❌ Storage limit exceeded. Need ${value.length} bytes, ` +
          `available ${stats.available} bytes`
        );
        
        // Essayer de nettoyer les données anciennes
        this.cleanup();
        
        // Réessayer
        if (this.canStore(value)) {
          localStorage.setItem(key, value);
          return true;
        }
        
        // Basculer vers IndexedDB
        return this.setItemIndexedDB(key, value);
      }

      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('Failed to set item in localStorage:', error);
      
      // Basculer vers IndexedDB
      return this.setItemIndexedDB(key, value);
    }
  }

  static getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Failed to get item from localStorage:', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove item from localStorage:', error);
    }
  }

  private static cleanup(): void {
    // Supprimer les données les plus anciennes
    const keys = Object.keys(localStorage);
    const timestamps = keys
      .filter(key => key.includes('timestamp'))
      .sort((a, b) => {
        const timeA = parseInt(localStorage.getItem(a) || '0');
        const timeB = parseInt(localStorage.getItem(b) || '0');
        return timeA - timeB;
      });

    // Supprimer les 10% les plus anciens
    const toDelete = Math.ceil(timestamps.length * 0.1);
    for (let i = 0; i < toDelete; i++) {
      localStorage.removeItem(timestamps[i]);
    }
  }

  private static async setItemIndexedDB(key: string, value: string): Promise<boolean> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['data'], 'readwrite');
      const store = transaction.objectStore('data');
      
      await new Promise((resolve, reject) => {
        const request = store.put({ key, value, timestamp: Date.now() });
        request.onsuccess = resolve;
        request.onerror = reject;
      });
      
      console.log(`✅ Stored in IndexedDB: ${key}`);
      return true;
    } catch (error) {
      console.error('Failed to store in IndexedDB:', error);
      return false;
    }
  }

  private static openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('StoryCore', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('data')) {
          db.createObjectStore('data', { keyPath: 'key' });
        }
      };
    });
  }
}
```

### Utilisation dans le store:
```typescript
// ❌ AVANT
localStorage.setItem(
  `project-${updatedProject.project_name}-worlds`,
  JSON.stringify(newWorlds)
);

// ✅ APRÈS
import { StorageManager } from '@/utils/storageManager';

StorageManager.setItem(
  `project-${updatedProject.project_name}-worlds`,
  JSON.stringify(newWorlds)
);
```

---

## FIX #6: Ajouter Error Handling aux Handlers

**Fichier**: `creative-studio-ui/src/App.tsx`

### ❌ AVANT
```typescript
const handleWorldComplete = (world: World) => {
  setShowWorldWizard(false);
};

const handleCharacterComplete = (character: Character) => {
  setShowCharacterWizard(false);
};
```

### ✅ APRÈS
```typescript
const handleWorldComplete = (world: World) => {
  try {
    if (!world || !world.id) {
      throw new Error('Invalid world data');
    }
    
    // Valider que le monde a été ajouté au store
    const state = useAppStore.getState();
    const worldExists = state.worlds?.some(w => w.id === world.id);
    
    if (!worldExists) {
      console.warn('World not found in store after creation');
      toast({
        title: 'Warning',
        description: 'World created but not found in store',
        variant: 'destructive',
      });
    }
    
    setShowWorldWizard(false);
    
    toast({
      title: 'Success',
      description: `World "${world.name}" created successfully`,
    });
  } catch (error) {
    console.error('Failed to complete world wizard:', error);
    
    toast({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to create world',
      variant: 'destructive',
    });
    
    // Garder la modale ouverte pour que l'utilisateur puisse réessayer
  }
};

const handleCharacterComplete = (character: Character) => {
  try {
    if (!character || !character.character_id) {
      throw new Error('Invalid character data');
    }
    
    // Valider que le caractère a été ajouté au store
    const state = useAppStore.getState();
    const characterExists = state.characters?.some(
      c => c.character_id === character.character_id
    );
    
    if (!characterExists) {
      console.warn('Character not found in store after creation');
      toast({
        title: 'Warning',
        description: 'Character created but not found in store',
        variant: 'destructive',
      });
    }
    
    setShowCharacterWizard(false);
    
    toast({
      title: 'Success',
      description: `Character "${character.name}" created successfully`,
    });
  } catch (error) {
    console.error('Failed to complete character wizard:', error);
    
    toast({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Failed to create character',
      variant: 'destructive',
    });
  }
};
```

---

## FIX #7: Synchroniser Project Updates

**Fichier**: `creative-studio-ui/src/store/index.ts`

### ❌ AVANT
```typescript
updateProject: (updates) =>
  set((state) => ({
    project: state.project ? { ...state.project, ...updates } : null,
    // ❌ Ne met pas à jour les arrays associés
  })),
```

### ✅ APRÈS
```typescript
updateProject: (updates) =>
  set((state) => {
    if (!state.project) return { project: null };
    
    const updatedProject = { ...state.project, ...updates };
    
    // Synchroniser les arrays si le projet a changé
    const newState: Partial<AppState> = {
      project: updatedProject,
    };
    
    // Si les caractères ont changé dans le projet
    if (updates.characters) {
      newState.characters = updates.characters as Character[];
    }
    
    // Si les mondes ont changé dans le projet
    if (updates.worlds) {
      newState.worlds = updates.worlds as World[];
    }
    
    // Si les histoires ont changé dans le projet
    if (updates.stories) {
      newState.stories = updates.stories as Story[];
    }
    
    // Si les shots ont changé dans le projet
    if (updates.shots) {
      newState.shots = updates.shots as Shot[];
    }
    
    return newState;
  }),
```

---

## FIX #8: Implémenter React Router

**Fichier**: `creative-studio-ui/src/App.tsx` (REFACTORISATION)

### ✅ CRÉER `src/router.tsx`
```typescript
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { LandingPage } from '@/pages/LandingPage';
import { ProjectDashboard } from '@/pages/ProjectDashboard';
import { Editor } from '@/pages/Editor';
import { Settings } from '@/pages/Settings';
import { NotFound } from '@/pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: 'project/:projectId',
        element: <ProjectDashboard />,
      },
      {
        path: 'project/:projectId/editor/:sequenceId',
        element: <Editor />,
      },
      {
        path: 'settings/:tab',
        element: <Settings />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
```

### ✅ UTILISER dans `src/main.tsx`
```typescript
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
```

---

## FIX #9: Ajouter Memoization aux Callbacks

**Fichier**: `creative-studio-ui/src/App.tsx`

### ❌ AVANT
```typescript
const handleNewProject = () => {};
const handleOpenProject = () => { ... };
const handleSaveProject = () => { ... };
```

### ✅ APRÈS
```typescript
const handleNewProject = useCallback(() => {
  try {
    const newProject = createEmptyProject();
    setProject(newProject);
    setShots([]);
    setCurrentView('dashboard');
    
    toast({
      title: 'New Project',
      description: 'Empty project created',
    });
  } catch (error) {
    console.error('Failed to create new project:', error);
    toast({
      title: 'Error',
      description: 'Failed to create new project',
      variant: 'destructive',
    });
  }
}, [setProject, setShots, toast]);

const handleOpenProject = useCallback(() => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = async (e) => {
    try {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const loadedProject = await loadProjectFromFile(file);
      setProject(loadedProject);
      setShots(loadedProject.shots);

      const recentProject: RecentProject = {
        id: crypto.randomUUID(),
        name: loadedProject.project_name,
        path: file.name,
        lastAccessed: new Date(),
      };
      addRecentProject(recentProject);
      
      toast({
        title: 'Project Loaded',
        description: `"${loadedProject.project_name}" loaded successfully`,
      });
    } catch (error) {
      console.error('Failed to load project:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project. Please check the file format.',
        variant: 'destructive',
      });
    }
  };

  input.click();
}, [setProject, setShots, toast]);

const handleSaveProject = useCallback(() => {
  try {
    if (!project) {
      toast({
        title: 'Error',
        description: 'No project to save',
        variant: 'destructive',
      });
      return;
    }
    
    downloadProject(project);
    
    toast({
      title: 'Success',
      description: 'Project saved successfully',
    });
  } catch (error) {
    console.error('Failed to save project:', error);
    toast({
      title: 'Error',
      description: 'Failed to save project',
      variant: 'destructive',
    });
  }
}, [project, toast]);
```

---

## FIX #10: Ajouter ARIA Labels

**Fichier**: `creative-studio-ui/src/components/wizard/project-setup/ProjectSetupWizardContainer.tsx`

### ❌ AVANT
```typescript
<button
  className="project-setup-wizard-button project-setup-wizard-button--secondary"
  onClick={onCancel}
>
  Cancel
</button>

<button
  className="project-setup-wizard-button project-setup-wizard-button--primary"
  onClick={handleNext}
  disabled={!canGoNext}
>
  {currentStep === steps.length ? (
    <>
      Complete
      <Check className="project-setup-wizard-button__icon" />
    </>
  ) : (
    <>
      Next
      <ChevronRight className="project-setup-wizard-button__icon" />
    </>
  )}
</button>
```

### ✅ APRÈS
```typescript
<button
  className="project-setup-wizard-button project-setup-wizard-button--secondary"
  onClick={onCancel}
  aria-label="Cancel wizard"
  title="Cancel and close the wizard"
>
  Cancel
</button>

<button
  className="project-setup-wizard-button project-setup-wizard-button--primary"
  onClick={handleNext}
  disabled={!canGoNext}
  aria-label={
    currentStep === steps.length
      ? 'Complete wizard'
      : `Go to next step (${currentStep + 1} of ${steps.length})`
  }
  title={
    currentStep === steps.length
      ? 'Complete the wizard'
      : `Go to step ${currentStep + 1}`
  }
>
  {currentStep === steps.length ? (
    <>
      Complete
      <Check className="project-setup-wizard-button__icon" aria-hidden="true" />
    </>
  ) : (
    <>
      Next
      <ChevronRight className="project-setup-wizard-button__icon" aria-hidden="true" />
    </>
  )}
</button>

{/* Step Indicators avec ARIA */}
<div className="project-setup-wizard-steps" role="tablist">
  {steps.map((step, index) => (
    <div
      key={step.id}
      role="tab"
      aria-selected={index + 1 === currentStep}
      aria-label={`Step ${index + 1}: ${step.title}`}
      className={`project-setup-wizard-step ${
        index + 1 === currentStep ? 'project-setup-wizard-step--active' : ''
      } ${index + 1 < currentStep ? 'project-setup-wizard-step--completed' : ''}`}
    >
      <div className="project-setup-wizard-step__indicator">
        {index + 1 < currentStep ? (
          <Check className="project-setup-wizard-step__icon" aria-hidden="true" />
        ) : (
          <span className="project-setup-wizard-step__number">{index + 1}</span>
        )}
      </div>
      <span className="project-setup-wizard-step__label">{step.title}</span>
    </div>
  ))}
</div>
```

---

## 📋 CHECKLIST DE FIXES

- [ ] FIX #1: Supprimer props non utilisées
- [ ] FIX #2: Supprimer modales dupliquées
- [ ] FIX #3: Standardiser les IDs
- [ ] FIX #4: Ajouter validation au wizard
- [ ] FIX #5: Implémenter StorageManager
- [ ] FIX #6: Ajouter error handling
- [ ] FIX #7: Synchroniser project updates
- [ ] FIX #8: Implémenter React Router
- [ ] FIX #9: Ajouter memoization
- [ ] FIX #10: Ajouter ARIA labels

