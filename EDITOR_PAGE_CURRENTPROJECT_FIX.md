# Correction EditorPage - currentProject Non Défini ✅

## Problème Identifié

**Erreur**: `EditorPage.tsx:241 Uncaught ReferenceError: currentProject is not defined`

**Contexte**: L'erreur se produisait lors de l'entrée dans l'éditeur par un plan de séquence depuis le dashboard.

## Cause

À la ligne 218 du fichier `EditorPage.tsx`, le code utilisait la variable `currentProject` dans un `useEffect`:

```typescript
useEffect(() => {
  if (project && !currentProject) {  // ❌ currentProject n'était pas défini
    // ...
  }
}, [project, currentProject, loadProject, toast]);
```

Cependant, `currentProject` n'était pas extrait du `useEditorStore`, ce qui causait l'erreur `ReferenceError`.

## Solution Appliquée

Ajout de `currentProject` à la liste des variables extraites de `useEditorStore`:

```typescript
// Avant (ligne 48-59)
const {
  shots,
  selectedShotId,
  selectShot,
  createShot,
  updateShot,
  importAssets,
  openWizard,
  closeWizard,
  activeWizard,
  projectPath,
  loadProject,
} = useEditorStore();

// Après (avec currentProject ajouté)
const {
  shots,
  selectedShotId,
  selectShot,
  createShot,
  updateShot,
  importAssets,
  openWizard,
  closeWizard,
  activeWizard,
  projectPath,
  loadProject,
  currentProject,  // ✅ Ajouté
} = useEditorStore();
```

## Vérification

`currentProject` est bien défini dans `editorStore.ts`:

```typescript
interface EditorStore {
  // Project state
  currentProject: ProjectData | null;
  projectPath: string | null;
  // ...
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  currentProject: null,
  projectPath: null,
  // ...
}));
```

## Logique de Chargement du Projet

Le `useEffect` à la ligne 215-241 gère le chargement du projet:

1. **Si projet dans appStore mais pas dans editorStore**:
   - Vérifie si un chemin de fichier existe
   - Si oui → charge depuis le système de fichiers
   - Si non → initialise directement avec les données du projet

2. **Initialisation directe** (pour projets chargés depuis JSON):
   ```typescript
   useEditorStore.setState({
     currentProject: project as any,
     projectPath: null,
     shots: project.storyboard || [],
     assets: project.assets || [],
   });
   ```

## Test de Validation

### Scénario: Ouvrir l'éditeur depuis un plan de séquence

1. **Créer un projet** avec format (ex: Court-métrage)
2. **Ouvrir le dashboard** du projet
3. **Cliquer sur une carte de séquence** dans "Plan Sequences"
4. ✅ **L'éditeur s'ouvre** sans erreur
5. ✅ **Les shots de la séquence** sont affichés
6. ✅ **Aucune erreur** dans la console

### Scénario: Ouvrir l'éditeur depuis le bouton "Open Editor"

1. **Ouvrir un projet**
2. **Cliquer sur "Open Editor"** dans le dashboard
3. ✅ **L'éditeur s'ouvre** sans erreur
4. ✅ **Tous les shots** sont affichés
5. ✅ **Aucune erreur** dans la console

## Fichiers Modifiés

- `creative-studio-ui/src/pages/EditorPage.tsx`
  - Ligne 59: Ajout de `currentProject` à l'extraction du store

## Impact

✅ **Correction immédiate**: L'erreur `ReferenceError` est éliminée  
✅ **Navigation fluide**: Passage du dashboard à l'éditeur fonctionne  
✅ **Chargement correct**: Le projet est correctement chargé dans l'éditeur  
✅ **Pas de régression**: Toutes les autres fonctionnalités restent intactes  

## Contexte Technique

### useEditorStore vs useAppStore

- **useAppStore**: Store global de l'application
  - Contient `project` (données du projet actuel)
  - Utilisé pour la navigation et l'état global

- **useEditorStore**: Store spécifique à l'éditeur
  - Contient `currentProject` (copie locale pour l'édition)
  - Contient `shots`, `assets`, etc.
  - Gère les opérations d'édition

### Flux de Données

```
Dashboard (useAppStore.project)
    ↓
EditorPage (vérifie project vs currentProject)
    ↓
useEditorStore.loadProject() ou setState()
    ↓
EditorPage (utilise currentProject pour l'édition)
```

## Conclusion

L'erreur était causée par une simple omission: `currentProject` était utilisé mais pas extrait du store. La correction est minime mais critique pour le bon fonctionnement de la navigation entre le dashboard et l'éditeur.

---

**Status**: ✅ CORRIGÉ  
**Date**: 20 janvier 2026  
**Version**: 1.0.2
