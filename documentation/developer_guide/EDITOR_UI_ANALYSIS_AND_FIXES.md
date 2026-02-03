# Analyse et Corrections de l'UI de l'Éditeur

## Problèmes Identifiés

### 1. ❌ Erreur: `currentProject is not defined` (Ligne 197)
**Status**: ✅ DÉJÀ CORRIGÉ (voir EDITOR_PAGE_CURRENTPROJECT_FIX.md)

### 2. ❌ Erreur: `Received NaN for the children attribute`
**Cause**: Valeur `NaN` passée comme enfant d'un composant React
**Localisation**: Probablement dans l'affichage de `shot.duration` ou `shot.position`

### 3. ❌ Données Manquantes dans les Cartes de Shot
**Problème**: Les cartes de shot n'affichent pas:
- Prompt de génération
- Negative prompt
- Paramètres ComfyUI
- Image générée
- Animation settings

**Cause**: Le type `Shot` de base ne contient pas ces propriétés. Elles sont dans `ProductionShot`.

### 4. ❌ Assets Limités au Projet Utilisateur
**Problème**: L'éditeur ne charge que les assets du projet utilisateur
**Solution Attendue**: Charger aussi les assets de base de StoryCore

### 5. ❌ Grid Editor - Problèmes Non Spécifiés
**À Analyser**: Problèmes dans le Grid Editor

### 6. ❌ Création de Shot - Problèmes Non Spécifiés
**À Analyser**: Problèmes lors de la création de shots

## Solutions Proposées

### Solution 1: Corriger l'Erreur NaN

**Fichier**: `creative-studio-ui/src/pages/EditorPage.tsx`

**Problème**: Ligne ~790
```typescript
<span className="text-muted-foreground">Durée: {shot.duration}s</span>
```

Si `shot.duration` est `undefined` ou `NaN`, cela cause l'erreur.

**Correction**:
```typescript
<span className="text-muted-foreground">
  Durée: {shot.duration ? `${shot.duration}s` : 'N/A'}
</span>
```

Et pour la position:
```typescript
<div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs">
  {(shot.position ?? 0) + 1}
</div>
```

### Solution 2: Enrichir l'Affichage des Shots

**Objectif**: Afficher les données de génération (prompt, negative prompt, etc.)

**Approche 1 - Type Guard**:
```typescript
// Vérifier si le shot a des données de génération
function isProductionShot(shot: Shot | ProductionShot): shot is ProductionShot {
  return 'generation' in shot && shot.generation !== undefined;
}

// Dans le rendu
{isProductionShot(shot) && (
  <div className="mt-2 pt-2 border-t border-border">
    <div className="text-xs space-y-1">
      <div className="font-medium text-primary">Génération:</div>
      <div className="text-muted-foreground truncate" title={shot.generation.prompt}>
        Prompt: {shot.generation.prompt}
      </div>
      {shot.generation.negativePrompt && (
        <div className="text-muted-foreground truncate" title={shot.generation.negativePrompt}>
          Negative: {shot.generation.negativePrompt}
        </div>
      )}
      <div className="text-muted-foreground">
        Model: {shot.generation.model}
      </div>
    </div>
  </div>
)}
```

**Approche 2 - Étendre le Type Shot**:
```typescript
// Dans types/index.ts
export interface Shot {
  id: string;
  title: string;
  description: string;
  duration: number;
  image?: string;
  
  // ... existing properties
  
  // Optional generation data (from ProductionShot)
  generation?: {
    prompt?: string;
    negativePrompt?: string;
    model?: string;
    parameters?: ComfyUIParameters;
    seed?: number;
  };
  
  position: number;
  metadata?: Record<string, any>;
}
```

### Solution 3: Panneau de Propriétés Enrichi

**Fichier**: `creative-studio-ui/src/pages/EditorPage.tsx` (ligne ~920)

**Ajout de sections pour les données de génération**:

```typescript
{selectedShot ? (
  <div>
    <h3 className="text-sm font-semibold mb-4">Propriétés du plan</h3>
    <div className="space-y-4">
      {/* Existing fields: Title, Description, Duration */}
      
      {/* NEW: Generation Settings Section */}
      {isProductionShot(selectedShot) && (
        <>
          <div className="pt-4 border-t border-border">
            <h4 className="text-xs font-semibold mb-2">Paramètres de Génération</h4>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground">Prompt</label>
              <textarea
                value={selectedShot.generation.prompt}
                onChange={(e) => handleUpdateShot({ 
                  generation: { 
                    ...selectedShot.generation, 
                    prompt: e.target.value 
                  } 
                })}
                className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
                placeholder="Prompt de génération..."
              />
            </div>
            
            <div className="mt-2">
              <label className="text-xs font-medium text-muted-foreground">Negative Prompt</label>
              <textarea
                value={selectedShot.generation.negativePrompt}
                onChange={(e) => handleUpdateShot({ 
                  generation: { 
                    ...selectedShot.generation, 
                    negativePrompt: e.target.value 
                  } 
                })}
                className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={2}
                placeholder="Negative prompt..."
              />
            </div>
            
            <div className="mt-2">
              <label className="text-xs font-medium text-muted-foreground">Model</label>
              <input
                type="text"
                value={selectedShot.generation.model}
                onChange={(e) => handleUpdateShot({ 
                  generation: { 
                    ...selectedShot.generation, 
                    model: e.target.value 
                  } 
                })}
                className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Model name..."
              />
            </div>
            
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Steps</label>
                <input
                  type="number"
                  value={selectedShot.generation.parameters.steps}
                  onChange={(e) => handleUpdateShot({ 
                    generation: { 
                      ...selectedShot.generation, 
                      parameters: {
                        ...selectedShot.generation.parameters,
                        steps: parseInt(e.target.value) || 20
                      }
                    } 
                  })}
                  className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  min="1"
                  max="150"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">CFG Scale</label>
                <input
                  type="number"
                  value={selectedShot.generation.parameters.cfgScale}
                  onChange={(e) => handleUpdateShot({ 
                    generation: { 
                      ...selectedShot.generation, 
                      parameters: {
                        ...selectedShot.generation.parameters,
                        cfgScale: parseFloat(e.target.value) || 7
                      }
                    } 
                  })}
                  className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  min="1"
                  max="30"
                  step="0.5"
                />
              </div>
            </div>
            
            <div className="mt-2">
              <label className="text-xs font-medium text-muted-foreground">Seed</label>
              <input
                type="number"
                value={selectedShot.generation.seed || ''}
                onChange={(e) => handleUpdateShot({ 
                  generation: { 
                    ...selectedShot.generation, 
                    seed: parseInt(e.target.value) || undefined
                  } 
                })}
                className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Random (leave empty)"
              />
            </div>
          </div>
          
          {/* Camera Settings */}
          <div className="pt-4 border-t border-border">
            <h4 className="text-xs font-semibold mb-2">Caméra</h4>
            
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type de Plan</label>
              <select
                value={selectedShot.type}
                onChange={(e) => handleUpdateShot({ type: e.target.value as ShotType })}
                className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="extreme-wide">Extreme Wide</option>
                <option value="wide">Wide</option>
                <option value="medium">Medium</option>
                <option value="close-up">Close-up</option>
                <option value="extreme-close-up">Extreme Close-up</option>
                <option value="over-the-shoulder">Over-the-shoulder</option>
                <option value="pov">POV</option>
              </select>
            </div>
            
            <div className="mt-2">
              <label className="text-xs font-medium text-muted-foreground">Mouvement</label>
              <select
                value={selectedShot.camera.movement.type}
                onChange={(e) => handleUpdateShot({ 
                  camera: { 
                    ...selectedShot.camera, 
                    movement: {
                      ...selectedShot.camera.movement,
                      type: e.target.value as CameraMovement['type']
                    }
                  } 
                })}
                className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="static">Static</option>
                <option value="pan">Pan</option>
                <option value="tilt">Tilt</option>
                <option value="dolly">Dolly</option>
                <option value="tracking">Tracking</option>
                <option value="crane">Crane</option>
                <option value="handheld">Handheld</option>
                <option value="zoom">Zoom</option>
              </select>
            </div>
          </div>
        </>
      )}
      
      {/* Existing metadata section */}
    </div>
  </div>
) : (
  // No shot selected message
)}
```

### Solution 4: Charger les Assets de Base StoryCore

**Fichier**: `creative-studio-ui/src/stores/editorStore.ts`

**Problème**: Les assets ne sont chargés que depuis le projet utilisateur

**Solution**: Créer un service d'assets qui combine:
1. Assets du projet utilisateur
2. Assets de base StoryCore (bibliothèque globale)

**Nouveau fichier**: `creative-studio-ui/src/services/assetLibraryService.ts`

```typescript
/**
 * Asset Library Service
 * 
 * Manages assets from multiple sources:
 * - User project assets
 * - StoryCore base library
 */

import type { Asset } from '@/types';

export interface AssetSource {
  id: string;
  name: string;
  type: 'project' | 'library' | 'template';
  assets: Asset[];
}

export class AssetLibraryService {
  private static instance: AssetLibraryService;
  
  private constructor() {}
  
  static getInstance(): AssetLibraryService {
    if (!AssetLibraryService.instance) {
      AssetLibraryService.instance = new AssetLibraryService();
    }
    return AssetLibraryService.instance;
  }
  
  /**
   * Get all available assets from all sources
   */
  async getAllAssets(projectPath?: string): Promise<AssetSource[]> {
    const sources: AssetSource[] = [];
    
    // 1. Load project assets
    if (projectPath) {
      const projectAssets = await this.loadProjectAssets(projectPath);
      sources.push({
        id: 'project',
        name: 'Project Assets',
        type: 'project',
        assets: projectAssets,
      });
    }
    
    // 2. Load StoryCore base library
    const libraryAssets = await this.loadLibraryAssets();
    sources.push({
      id: 'library',
      name: 'StoryCore Library',
      type: 'library',
      assets: libraryAssets,
    });
    
    // 3. Load templates
    const templateAssets = await this.loadTemplateAssets();
    sources.push({
      id: 'templates',
      name: 'Templates',
      type: 'template',
      assets: templateAssets,
    });
    
    return sources;
  }
  
  /**
   * Load assets from user project
   */
  private async loadProjectAssets(projectPath: string): Promise<Asset[]> {
    try {
      if (window.electronAPI?.project?.getAssets) {
        return await window.electronAPI.project.getAssets(projectPath);
      }
      return [];
    } catch (error) {
      console.error('Failed to load project assets:', error);
      return [];
    }
  }
  
  /**
   * Load assets from StoryCore base library
   */
  private async loadLibraryAssets(): Promise<Asset[]> {
    // TODO: Load from assets/ folder in StoryCore root
    // For now, return mock data
    return [
      {
        id: 'lib-1',
        name: 'Camera_shot_example.jpg',
        type: 'image',
        url: '/assets/demo/camera_shot.jpg',
        thumbnail: '/assets/demo/camera_shot_thumb.jpg',
        metadata: { source: 'library' },
      },
      {
        id: 'lib-2',
        name: 'Background_music.mp3',
        type: 'audio',
        url: '/assets/audio/background.mp3',
        metadata: { source: 'library' },
      },
      // Add more base assets
    ];
  }
  
  /**
   * Load template assets
   */
  private async loadTemplateAssets(): Promise<Asset[]> {
    // TODO: Load from templates folder
    return [];
  }
  
  /**
   * Search assets across all sources
   */
  async searchAssets(query: string, sources?: AssetSource[]): Promise<Asset[]> {
    if (!sources) {
      const allSources = await this.getAllAssets();
      sources = allSources;
    }
    
    const allAssets = sources.flatMap(source => source.assets);
    
    return allAssets.filter(asset =>
      asset.name.toLowerCase().includes(query.toLowerCase()) ||
      asset.type.toLowerCase().includes(query.toLowerCase())
    );
  }
}
```

**Intégration dans EditorPage**:

```typescript
// Dans EditorPage.tsx
import { AssetLibraryService } from '@/services/assetLibraryService';

// State pour les sources d'assets
const [assetSources, setAssetSources] = useState<AssetSource[]>([]);
const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
const [assetSearchQuery, setAssetSearchQuery] = useState('');

// Charger les assets au montage
useEffect(() => {
  const loadAssets = async () => {
    const service = AssetLibraryService.getInstance();
    const sources = await service.getAllAssets(projectPath || undefined);
    setAssetSources(sources);
    
    // Flatten all assets for display
    const allAssets = sources.flatMap(s => s.assets);
    setFilteredAssets(allAssets);
  };
  
  loadAssets();
}, [projectPath]);

// Recherche d'assets
const handleAssetSearch = async (query: string) => {
  setAssetSearchQuery(query);
  
  if (!query.trim()) {
    const allAssets = assetSources.flatMap(s => s.assets);
    setFilteredAssets(allAssets);
    return;
  }
  
  const service = AssetLibraryService.getInstance();
  const results = await service.searchAssets(query, assetSources);
  setFilteredAssets(results);
};

// Dans le rendu du panneau gauche
<input
  type="text"
  placeholder="Rechercher..."
  value={assetSearchQuery}
  onChange={(e) => handleAssetSearch(e.target.value)}
  className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
/>

// Afficher les assets par source
{assetSources.map(source => (
  <div key={source.id} className="mb-4">
    <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2">
      {source.name}
    </h3>
    <div className="space-y-2">
      {source.assets
        .filter(asset => 
          !assetSearchQuery || 
          filteredAssets.some(fa => fa.id === asset.id)
        )
        .map(asset => (
          <div key={asset.id} className="...">
            {/* Asset card */}
          </div>
        ))
      }
    </div>
  </div>
))}
```

### Solution 5: Sauvegarder les Données dans sequence_XXX.json

**Problème**: Les données de génération (prompt, negative prompt, etc.) doivent être sauvegardées dans les fichiers JSON des séquences.

**Fichier**: `electron/ProjectService.ts`

**Méthode à ajouter**:

```typescript
/**
 * Update a shot in a sequence file
 */
async updateShotInSequence(
  projectPath: string,
  sequenceId: string,
  shotId: string,
  updates: Partial<ProductionShot>
): Promise<void> {
  try {
    const sequencesDir = path.join(projectPath, 'sequences');
    
    // Find the sequence file
    const files = fs.readdirSync(sequencesDir);
    const sequenceFile = files.find(f => {
      const content = fs.readFileSync(path.join(sequencesDir, f), 'utf-8');
      const data = JSON.parse(content);
      return data.id === sequenceId;
    });
    
    if (!sequenceFile) {
      throw new Error(`Sequence ${sequenceId} not found`);
    }
    
    const sequenceFilePath = path.join(sequencesDir, sequenceFile);
    const sequenceData = JSON.parse(fs.readFileSync(sequenceFilePath, 'utf-8'));
    
    // Update the shot
    const shotIndex = sequenceData.shots.findIndex((s: any) => s.id === shotId);
    if (shotIndex === -1) {
      throw new Error(`Shot ${shotId} not found in sequence`);
    }
    
    sequenceData.shots[shotIndex] = {
      ...sequenceData.shots[shotIndex],
      ...updates,
    };
    
    sequenceData.metadata.updated_at = new Date().toISOString();
    
    // Save back to file
    fs.writeFileSync(sequenceFilePath, JSON.stringify(sequenceData, null, 2), 'utf-8');
    
    console.log(`Shot ${shotId} updated in sequence ${sequenceId}`);
  } catch (error) {
    console.error('Failed to update shot in sequence:', error);
    throw error;
  }
}
```

**Intégration dans editorStore**:

```typescript
// Dans editorStore.ts
updateShot: async (shotId: string, updates: Partial<Shot>) => {
  try {
    const { projectService, projectPath, currentProject } = get();
    
    if (!currentProject) {
      throw new Error('No project loaded');
    }
    
    if (projectPath) {
      // Update in file system
      const shot = currentProject.storyboard?.find(s => s.id === shotId);
      if (shot && (shot as any).sequence_id) {
        // Update in sequence file
        await projectService.updateShotInSequence(
          projectPath,
          (shot as any).sequence_id,
          shotId,
          updates
        );
      }
    }
    
    // Update in memory
    const updatedStoryboard = (currentProject.storyboard || []).map(shot =>
      shot.id === shotId ? { ...shot, ...updates } : shot
    );
    
    const updatedProject = {
      ...currentProject,
      storyboard: updatedStoryboard,
    };
    
    set({
      currentProject: updatedProject,
      shots: updatedStoryboard,
    });
    
    console.log('Shot updated successfully');
  } catch (error) {
    console.error('Failed to update shot:', error);
    throw error;
  }
},
```

## Corrections Immédiates à Appliquer

### 1. Corriger l'Erreur NaN

```typescript
// EditorPage.tsx ligne ~790
<span className="text-muted-foreground">
  Durée: {shot.duration != null ? `${shot.duration}s` : 'N/A'}
</span>

// Ligne ~770
<div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs">
  {(shot.position != null ? shot.position : 0) + 1}
</div>
```

### 2. Ajouter Type Guard pour ProductionShot

```typescript
// EditorPage.tsx au début du fichier
function isProductionShot(shot: any): shot is ProductionShot {
  return shot && 'generation' in shot && shot.generation !== undefined;
}
```

### 3. Afficher les Données de Génération dans les Cartes

```typescript
// Dans le rendu des cartes de shot, après la description
{isProductionShot(shot) && shot.generation.prompt && (
  <div className="mt-1 text-xs text-primary truncate" title={shot.generation.prompt}>
    📝 {shot.generation.prompt}
  </div>
)}
```

## Résumé des Fichiers à Modifier

1. ✅ `creative-studio-ui/src/pages/EditorPage.tsx`
   - Corriger NaN errors
   - Ajouter type guard
   - Enrichir affichage des cartes
   - Enrichir panneau de propriétés

2. 🆕 `creative-studio-ui/src/services/assetLibraryService.ts`
   - Créer service pour gérer assets multi-sources

3. ✅ `electron/ProjectService.ts`
   - Ajouter méthode `updateShotInSequence()`

4. ✅ `creative-studio-ui/src/stores/editorStore.ts`
   - Mettre à jour `updateShot()` pour sauvegarder dans sequence files

5. ✅ `creative-studio-ui/src/types/index.ts`
   - Optionnel: Étendre type `Shot` avec propriétés de génération

## Priorités

1. **URGENT**: Corriger erreur NaN (empêche l'utilisation)
2. **HIGH**: Afficher données de génération dans cartes
3. **HIGH**: Enrichir panneau de propriétés
4. **MEDIUM**: Charger assets de base StoryCore
5. **MEDIUM**: Sauvegarder dans sequence files
6. **LOW**: Analyser problèmes Grid Editor et création de shot

---

**Status**: 📋 ANALYSE COMPLETE - CORRECTIONS EN ATTENTE  
**Date**: 20 janvier 2026  
**Version**: 1.0.0
