# Intégration de la Bibliothèque d'Assets

## Vue d'Ensemble

La bibliothèque d'assets contient **93 prompts** organisés en **14 catégories** couvrant tous les aspects de la production vidéo. Ces assets sont maintenant accessibles via des composants React réutilisables.

## Bibliothèque d'Assets Disponibles

### 📁 Catégories (14 au total)

1. **🎨 Master Coherence** (01-master-coherence)
   - character-grid.json
   - coherence-grid.json
   - environment-grid.json

2. **🎬 Genres** (02-genres) - 15 assets
   - Action, Adventure, Animation, Comedy, Documentary
   - Drama, Fantasy, Historical, Horror, Musical
   - Mystery, Romance, Sci-Fi, Thriller, Western

3. **📹 Shot Types** (03-shot-types) - 7 assets
   - Close-up, Establishing Shot, Extreme Close-up
   - Medium Shot, Over-Shoulder, POV, Wide Shot

4. **💡 Lighting** (04-lighting) - 4 assets
   - Blue Hour, Golden Hour
   - Night Artificial, Night Moonlight

5. **🏗️ Scene Elements** (05-scene-elements) - 4 assets
   - Exterior Nature, Hero Character
   - Interior Residential, Villain Character

6. **🖼️ Visual Styles** (06-visual-styles) - 11 assets
   - Anime, Comic Book, Futuristic, Minimalist
   - Noir, Oil Painting, Realistic, Stylized
   - Surreal, Vintage, Watercolor

7. **📐 Camera Angles** (07-camera-angles) - 6 assets
   - Birds-Eye, Dutch Angle, Eye-Level
   - High Angle, Low Angle, Worms-Eye

8. **🎥 Camera Movements** (08-camera-movements) - 8 assets
   - Crane, Dolly, Handheld, Pan
   - Static, Tilt, Track, Zoom

9. **🌟 Mood & Atmosphere** (09-mood-atmosphere) - 10 assets
   - Calm, Dark, Energetic, Hopeful, Light
   - Melancholic, Mysterious, Playful, Serious, Tense

10. **🌅 Time of Day** (10-time-of-day) - 6 assets
    - Afternoon, Dawn, Evening
    - Morning, Night, Unspecified

11. **🔄 Transitions** (11-transitions) - 5 assets
    - Cut, Dissolve, Fade, Match-Cut, Wipe

12. **🎨 Color Palettes** (12-color-palettes) - 6 assets
    - Cool Ocean, Fire Red, Forest Green
    - Monochrome, Royal Purple, Warm Sunset

13. **🌍 Universe Types** (13-universe-types) - 5 assets
    - Alternate, Fantasy, Historical, Realistic, Sci-Fi

14. **👤 Character Archetypes** (14-character-archetypes) - 3 assets
    - Background, Ensemble, Supporting

## Services et Hooks

### PromptLibraryService

Service singleton pour accéder à la bibliothèque :

```typescript
import { promptLibrary } from '@/library/PromptLibraryService';

// Charger l'index
const index = await promptLibrary.loadIndex();

// Charger un prompt spécifique
const shotType = await promptLibrary.loadPrompt('03-shot-types/close-up.json');

// Rechercher
const results = await promptLibrary.search('dramatic');

// Méthodes par catégorie
const shotTypes = await promptLibrary.getShotTypePrompts();
const cameraAngles = await promptLibrary.getCameraAnglePrompts();
const moods = await promptLibrary.getMoodPrompts();
// ... etc
```

### usePromptLibrary Hook

Hook React pour accès facile :

```typescript
import { usePromptLibrary } from '@/hooks/usePromptLibrary';

function MyComponent() {
  const {
    isLoading,
    totalPrompts,
    categories,
    getShotTypePrompts,
    search,
  } = usePromptLibrary();

  // Utiliser les méthodes...
}
```

### useCategoryPrompts Hook

Hook pour charger une catégorie spécifique :

```typescript
import { useCategoryPrompts } from '@/hooks/usePromptLibrary';

function MyComponent() {
  const { prompts, isLoading, error } = useCategoryPrompts('03-shot-types');
  
  // prompts contient tous les shot types
}
```

## Composants UI

### 1. AssetBrowser

Navigateur complet avec recherche et filtrage :

```typescript
import { AssetBrowser } from '@/components/assets/AssetBrowser';

<AssetBrowser
  onSelectAsset={(asset) => console.log(asset)}
  selectedAssetId="close-up"
  filterCategories={['03-shot-types', '07-camera-angles']}
/>
```

**Fonctionnalités :**
- Liste des catégories avec compteurs
- Recherche en temps réel
- Affichage des tags
- Sélection visuelle
- Support du mode sombre

### 2. AssetSelector

Sélecteur dropdown pour formulaires :

```typescript
import { AssetSelector } from '@/components/assets/AssetSelector';

<AssetSelector
  categoryId="03-shot-types"
  selectedAssetId={selectedId}
  onSelect={(asset) => setSelectedId(asset.id)}
  label="Shot Type"
  placeholder="Choose a shot type..."
/>
```

**Fonctionnalités :**
- Dropdown avec recherche intégrée
- Affichage des détails au survol
- États de chargement et d'erreur
- Fermeture automatique au clic extérieur

### 3. Sélecteurs Spécialisés

Composants pré-configurés pour chaque catégorie :

```typescript
import {
  ShotTypeSelector,
  CameraAngleSelector,
  CameraMovementSelector,
  LightingSelector,
  MoodSelector,
  TimeOfDaySelector,
  VisualStyleSelector,
  GenreSelector,
  TransitionSelector,
  ColorPaletteSelector,
} from '@/components/assets/AssetSelector';

// Utilisation simple
<ShotTypeSelector
  selectedAssetId={shotType}
  onSelect={(asset) => setShotType(asset.id)}
/>
```

## Intégration dans les Wizards

### Exemple : Shot Wizard

```typescript
import { ShotTypeSelector, CameraAngleSelector } from '@/components/assets/AssetSelector';

function ShotWizardStep2() {
  const [shotType, setShotType] = useState<string>();
  const [cameraAngle, setCameraAngle] = useState<string>();

  return (
    <div className="space-y-6">
      <ShotTypeSelector
        selectedAssetId={shotType}
        onSelect={(asset) => {
          setShotType(asset.id);
          // Utiliser asset.prompt pour la génération
        }}
      />
      
      <CameraAngleSelector
        selectedAssetId={cameraAngle}
        onSelect={(asset) => {
          setCameraAngle(asset.id);
        }}
      />
    </div>
  );
}
```

### Exemple : Génération de Prompt

```typescript
import { promptLibrary } from '@/library/PromptLibraryService';

async function generateScenePrompt(sceneData: any) {
  // Charger les templates
  const shotType = await promptLibrary.loadPrompt(
    `03-shot-types/${sceneData.shotType}.json`
  );
  
  const lighting = await promptLibrary.loadPrompt(
    `04-lighting/${sceneData.lighting}.json`
  );
  
  const mood = await promptLibrary.loadPrompt(
    `09-mood-atmosphere/${sceneData.mood}.json`
  );

  // Remplir les variables
  const shotPrompt = promptLibrary.fillPrompt(shotType, {
    subject: sceneData.subject,
    environment: sceneData.environment,
  });

  // Combiner les prompts
  const finalPrompt = `${shotPrompt}, ${lighting.prompt}, ${mood.prompt}`;
  
  return finalPrompt;
}
```

## Structure des Assets

Chaque asset JSON contient :

```json
{
  "category": "03-shot-types",
  "subcategory": "framing",
  "id": "close-up",
  "name": "Close-Up Shot",
  "description": "Frames the subject tightly, focusing on facial expressions or important details",
  "tags": ["close", "detail", "emotion", "face"],
  "prompt": "close-up shot of {subject}, detailed view, {emotion} expression",
  "variables": {
    "subject": {
      "type": "string",
      "required": true,
      "description": "The subject being filmed"
    },
    "emotion": {
      "type": "enum",
      "required": false,
      "options": ["happy", "sad", "angry", "surprised"],
      "default": "neutral"
    }
  },
  "examples": [
    {
      "subject": "protagonist",
      "emotion": "determined"
    }
  ]
}
```

## Cas d'Usage

### 1. Wizard de Shot

```typescript
// Étape 1 : Sélection du type
<ShotTypeSelector onSelect={handleShotTypeSelect} />

// Étape 2 : Configuration caméra
<CameraAngleSelector onSelect={handleAngleSelect} />
<CameraMovementSelector onSelect={handleMovementSelect} />

// Étape 3 : Ambiance
<LightingSelector onSelect={handleLightingSelect} />
<MoodSelector onSelect={handleMoodSelect} />
<TimeOfDaySelector onSelect={handleTimeSelect} />
```

### 2. Wizard de Séquence

```typescript
// Sélection du genre et style
<GenreSelector onSelect={handleGenreSelect} />
<VisualStyleSelector onSelect={handleStyleSelect} />
<ColorPaletteSelector onSelect={handlePaletteSelect} />
```

### 3. Éditeur de Scène

```typescript
// Panneau latéral avec navigateur complet
<AssetBrowser
  onSelectAsset={handleAssetSelect}
  filterCategories={relevantCategories}
/>
```

### 4. Génération de Prompt AI

```typescript
async function buildPrompt(selections: any) {
  const templates = await Promise.all([
    promptLibrary.loadPrompt(`03-shot-types/${selections.shotType}.json`),
    promptLibrary.loadPrompt(`07-camera-angles/${selections.angle}.json`),
    promptLibrary.loadPrompt(`04-lighting/${selections.lighting}.json`),
  ]);

  const prompts = templates.map(t => 
    promptLibrary.fillPrompt(t, selections.variables)
  );

  return prompts.join(', ');
}
```

## Avantages

### Pour les Développeurs

✅ **API Simple** : Hooks React et service TypeScript  
✅ **Type-Safe** : Interfaces TypeScript complètes  
✅ **Composants Réutilisables** : Plug-and-play dans n'importe quel wizard  
✅ **Cache Intégré** : Performances optimisées  
✅ **Recherche Puissante** : Par nom, description, tags  

### Pour les Utilisateurs

✅ **93 Assets Prêts** : Couvre tous les besoins de production  
✅ **Interface Intuitive** : Recherche et navigation faciles  
✅ **Descriptions Claires** : Comprendre chaque asset  
✅ **Exemples Fournis** : Voir comment utiliser chaque asset  
✅ **Cohérence Visuelle** : Design uniforme  

### Pour la Production

✅ **Prompts Optimisés** : Testés et validés  
✅ **Variables Flexibles** : Personnalisation facile  
✅ **Combinaisons Infinies** : Mix & match des assets  
✅ **Qualité Garantie** : Assets professionnels  

## Fichiers Créés

1. **`library/PromptLibraryService.ts`** (mis à jour)
   - Ajout des méthodes par catégorie
   - getTotalPromptCount()
   - getShotTypePrompts(), etc.

2. **`creative-studio-ui/src/components/assets/AssetBrowser.tsx`**
   - Navigateur complet d'assets
   - Recherche et filtrage
   - Affichage par catégorie

3. **`creative-studio-ui/src/components/assets/AssetSelector.tsx`**
   - Sélecteur dropdown
   - 10 sélecteurs spécialisés
   - Recherche intégrée

4. **`creative-studio-ui/src/hooks/usePromptLibrary.ts`** (déjà existant)
   - Hook principal
   - useCategoryPrompts
   - usePrompt

## Prochaines Étapes

### Intégration Immédiate

1. **Shot Wizard** : Remplacer les placeholders par les sélecteurs
2. **Sequence Wizard** : Ajouter les sélecteurs de genre et style
3. **Scene Editor** : Intégrer l'AssetBrowser dans le panneau latéral

### Améliorations Futures

1. **Prévisualisation** : Afficher des images d'exemple pour chaque asset
2. **Favoris** : Permettre de marquer des assets favoris
3. **Historique** : Garder trace des assets récemment utilisés
4. **Collections** : Créer des collections personnalisées d'assets
5. **Import/Export** : Partager des collections entre projets
6. **Assets Personnalisés** : Permettre aux utilisateurs d'ajouter leurs propres assets

## Exemples de Code Complets

### Wizard Complet avec Assets

```typescript
import { useState } from 'react';
import {
  ShotTypeSelector,
  CameraAngleSelector,
  LightingSelector,
  MoodSelector,
} from '@/components/assets/AssetSelector';
import { promptLibrary } from '@/library/PromptLibraryService';

function CompleteWizard() {
  const [selections, setSelections] = useState({
    shotType: undefined,
    cameraAngle: undefined,
    lighting: undefined,
    mood: undefined,
  });

  const generatePrompt = async () => {
    const templates = await Promise.all([
      promptLibrary.loadPrompt(`03-shot-types/${selections.shotType}.json`),
      promptLibrary.loadPrompt(`07-camera-angles/${selections.cameraAngle}.json`),
      promptLibrary.loadPrompt(`04-lighting/${selections.lighting}.json`),
      promptLibrary.loadPrompt(`09-mood-atmosphere/${selections.mood}.json`),
    ]);

    const prompts = templates.map(t => t.prompt);
    return prompts.join(', ');
  };

  return (
    <div className="space-y-6">
      <ShotTypeSelector
        selectedAssetId={selections.shotType}
        onSelect={(asset) => setSelections(s => ({ ...s, shotType: asset.id }))}
      />
      
      <CameraAngleSelector
        selectedAssetId={selections.cameraAngle}
        onSelect={(asset) => setSelections(s => ({ ...s, cameraAngle: asset.id }))}
      />
      
      <LightingSelector
        selectedAssetId={selections.lighting}
        onSelect={(asset) => setSelections(s => ({ ...s, lighting: asset.id }))}
      />
      
      <MoodSelector
        selectedAssetId={selections.mood}
        onSelect={(asset) => setSelections(s => ({ ...s, mood: asset.id }))}
      />

      <button onClick={generatePrompt}>
        Generate Prompt
      </button>
    </div>
  );
}
```

## Support et Documentation

- **Service Documentation** : Voir `library/README.md`
- **Integration Guide** : Voir `library/STORYCORE_UI_INTEGRATION.md`
- **Examples** : Voir `library/example-integration.ts`
- **Structure** : Voir `library/STRUCTURE.md`
