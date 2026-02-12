# Correction - Persistance des Portraits de Personnages

## Problèmes Identifiés

### 1. L'image ne persiste pas après génération
**Cause**: L'URL de l'image générée est stockée uniquement dans le state local du composant `CharacterCard` (`generatedImageUrl`), mais n'est jamais sauvegardée dans les données du personnage dans le store.

**Impact**: Quand le composant se démonte ou que la page est rechargée, l'image disparaît.

### 2. L'image n'est pas copiée dans le dossier du projet
**Cause**: L'image reste sur le serveur ComfyUI (http://localhost:8000/view?filename=...) et n'est jamais téléchargée et sauvegardée localement dans le dossier du projet de l'utilisateur.

**Impact**: 
- L'image n'est pas portable avec le projet
- Si ComfyUI est arrêté, l'image n'est plus accessible
- L'image peut être écrasée par de nouvelles générations

## Solution Implémentée

### Étape 1: Télécharger et Sauvegarder l'Image Localement

Créer un service pour télécharger l'image depuis ComfyUI et la sauvegarder dans le dossier du projet :

**Fichier**: `creative-studio-ui/src/services/imageStorageService.ts`

```typescript
/**
 * Downloads an image from ComfyUI and saves it to the project folder
 * @param imageUrl - The ComfyUI image URL (http://localhost:8000/view?...)
 * @param projectPath - The project folder path
 * @param characterId - The character ID for filename
 * @returns The local file path relative to project
 */
export async function downloadAndSaveImage(
  imageUrl: string,
  projectPath: string,
  characterId: string
): Promise<string> {
  // 1. Download image from ComfyUI
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  
  // 2. Convert to buffer
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // 3. Create characters/portraits directory
  const portraitsDir = `${projectPath}/characters/portraits`;
  await window.electronAPI.fs.mkdir(portraitsDir, { recursive: true });
  
  // 4. Generate filename
  const timestamp = Date.now();
  const filename = `${characterId}_${timestamp}.png`;
  const filePath = `${portraitsDir}/${filename}`;
  
  // 5. Save file
  await window.electronAPI.fs.writeFile(filePath, buffer);
  
  // 6. Return relative path
  return `characters/portraits/${filename}`;
}
```

### Étape 2: Mettre à Jour les Données du Personnage

Modifier `CharacterCard.tsx` pour sauvegarder l'image dans les données du personnage :

```typescript
const handleGenerateImage = async (e: React.MouseEvent) => {
  e.stopPropagation();
  setIsGeneratingImage(true);

  try {
    // ... génération de l'image ...
    
    const imageUrl = await comfyuiService.generateImage({...});
    
    // Télécharger et sauvegarder l'image localement
    if (project?.metadata?.path) {
      const localPath = await downloadAndSaveImage(
        imageUrl,
        project.metadata.path,
        character.character_id
      );
      
      // Mettre à jour le personnage avec le chemin local
      if (onImageGenerated) {
        onImageGenerated(localPath);
      }
    }
    
    setGeneratedImageUrl(imageUrl);
  } catch (err) {
    // ... gestion d'erreur ...
  } finally {
    setIsGeneratingImage(false);
  }
};
```

### Étape 3: Persister dans le Store

Modifier le parent qui utilise `CharacterCard` pour sauvegarder l'image dans le store :

```typescript
// Dans CharactersSection.tsx ou CharacterEditor.tsx
const handleImageGenerated = async (characterId: string, imagePath: string) => {
  // Mettre à jour le personnage avec le chemin de l'image
  await updateCharacter(characterId, {
    visual_identity: {
      ...character.visual_identity,
      generated_portrait: imagePath,
    },
  });
};

// Passer le handler au CharacterCard
<CharacterCard
  character={character}
  onImageGenerated={(imagePath) => handleImageGenerated(character.character_id, imagePath)}
/>
```

### Étape 4: Afficher l'Image Sauvegardée

Modifier `CharacterCard.tsx` pour afficher l'image depuis le chemin local :

```typescript
// Get thumbnail URL from visual identity or use placeholder
const getThumbnailUrl = () => {
  // 1. Priorité à l'image générée en local
  if (generatedImageUrl) {
    return generatedImageUrl;
  }
  
  // 2. Utiliser l'image sauvegardée dans les données
  if (character.visual_identity?.generated_portrait) {
    const localPath = character.visual_identity.generated_portrait;
    
    // Si c'est un chemin relatif, construire l'URL complète
    if (localPath.startsWith('characters/')) {
      return `file://${project?.metadata?.path}/${localPath}`;
    }
    
    return localPath;
  }
  
  // 3. Fallback sur thumbnail_url
  if ((character as any).thumbnail_url) {
    return (character as any).thumbnail_url;
  }
  
  return null;
};

const thumbnailUrl = getThumbnailUrl();
```

## Structure de Données

### Ajout dans Character Type

```typescript
interface VisualIdentity {
  // ... autres champs ...
  generated_portrait?: string; // Chemin relatif vers l'image générée
}
```

### Structure des Fichiers du Projet

```
project-folder/
├── project.json
├── characters/
│   ├── portraits/
│   │   ├── char-uuid-1_1234567890.png
│   │   ├── char-uuid-2_1234567891.png
│   │   └── ...
│   ├── character_char-uuid-1.json
│   ├── character_char-uuid-2.json
│   └── ...
├── sequences/
└── shots/
```

## Flux Complet

1. **Génération**:
   - Utilisateur clique sur "Generate Portrait"
   - ComfyUI génère l'image
   - Image disponible sur http://localhost:8000/view?filename=...

2. **Téléchargement**:
   - Service télécharge l'image depuis ComfyUI
   - Crée le dossier `characters/portraits` si nécessaire
   - Sauvegarde l'image avec nom unique: `{characterId}_{timestamp}.png`

3. **Persistance**:
   - Chemin relatif sauvegardé dans `character.visual_identity.generated_portrait`
   - Personnage mis à jour dans le store
   - Store persiste dans localStorage
   - Fichier JSON du personnage mis à jour

4. **Affichage**:
   - Au chargement, lit le chemin depuis `character.visual_identity.generated_portrait`
   - Construit l'URL complète: `file://{projectPath}/{relativePath}`
   - Affiche l'image dans le composant

## Avantages

✅ **Persistance**: L'image est sauvegardée dans les données du personnage
✅ **Portabilité**: L'image fait partie du projet et peut être déplacée avec lui
✅ **Indépendance**: Ne dépend plus de ComfyUI après génération
✅ **Historique**: Chaque génération crée un nouveau fichier (timestamp)
✅ **Performance**: Accès local plus rapide que via ComfyUI

## Gestion des Erreurs

### Cas 1: ComfyUI non disponible
```typescript
if (!await comfyuiService.isAvailable()) {
  throw new Error('ComfyUI is not available. Please start ComfyUI first.');
}
```

### Cas 2: Échec du téléchargement
```typescript
try {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
} catch (error) {
  console.error('Download failed:', error);
  // Garder l'URL ComfyUI comme fallback
  setGeneratedImageUrl(imageUrl);
}
```

### Cas 3: Échec de la sauvegarde
```typescript
try {
  await window.electronAPI.fs.writeFile(filePath, buffer);
} catch (error) {
  console.error('Save failed:', error);
  // Notifier l'utilisateur
  showError('Failed to save image to project folder');
}
```

## Mode Web (Sans Electron)

Pour le mode web sans accès au système de fichiers :

```typescript
// Utiliser IndexedDB pour stocker l'image
async function saveImageToIndexedDB(
  imageUrl: string,
  characterId: string
): Promise<string> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  
  // Stocker dans IndexedDB
  const db = await openDB('storycore-images', 1);
  const key = `portrait_${characterId}_${Date.now()}`;
  await db.put('portraits', blob, key);
  
  // Retourner une clé pour récupérer l'image
  return `indexeddb://${key}`;
}

// Récupérer l'image depuis IndexedDB
async function getImageFromIndexedDB(key: string): Promise<string> {
  const db = await openDB('storycore-images', 1);
  const blob = await db.get('portraits', key.replace('indexeddb://', ''));
  return URL.createObjectURL(blob);
}
```

## Tests

### Test 1: Génération et Sauvegarde
1. Créer un personnage
2. Cliquer sur "Generate Portrait"
3. Vérifier que l'image apparaît
4. Vérifier que le fichier existe dans `project/characters/portraits/`
5. Vérifier que `character.visual_identity.generated_portrait` contient le chemin

### Test 2: Persistance
1. Générer un portrait
2. Recharger la page
3. Vérifier que l'image est toujours affichée

### Test 3: Portabilité
1. Générer un portrait
2. Copier le dossier du projet ailleurs
3. Ouvrir le projet depuis le nouveau dossier
4. Vérifier que l'image est toujours accessible

---

**Status**: 🔧 EN COURS D'IMPLÉMENTATION
**Fichiers à modifier**:
1. `creative-studio-ui/src/services/imageStorageService.ts` (nouveau)
2. `creative-studio-ui/src/components/character/CharacterCard.tsx`
3. `creative-studio-ui/src/components/character/CharactersSection.tsx`
4. `creative-studio-ui/src/types/character.ts`
