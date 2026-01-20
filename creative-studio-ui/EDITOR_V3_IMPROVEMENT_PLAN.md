# Plan d'Amélioration : Éditeur Vidéo V3

## 📋 Problèmes Identifiés

### 🔴 Critiques (P0)
1. **Double menu en haut** : Le menu "File, Create, Edit, View, Settings, Documentation, Help" apparaît deux fois
2. **Prompts des shots non chargés** : Les prompts des shots depuis les JSON ne sont pas affichés correctement
3. **Timeline incomplète** : Manque le cadre/zone de dépôt pour images, textes, sons, vidéos

### 🟡 Importantes (P1)
4. **Génération de grille manquante** : Pas de fonction pour générer la grille avec les prompts de chaque shot
5. **Édition des prompts** : Impossible de modifier les prompts des shots directement
6. **Sauvegarde des modifications** : Les changements ne sont pas persistés

## 🎯 Objectifs de la V3

### Phase 1 : Corrections Critiques (P0)
**Durée estimée : 2-3 heures**

#### 1.1 Supprimer le Double Menu
**Problème** : Le menu apparaît dans VideoEditorPage ET dans App.tsx (MenuBar)

**Solution** :
- Supprimer le header dans VideoEditorPage.tsx
- Garder uniquement le MenuBar de App.tsx
- Ajouter un bouton "← Back to Dashboard" dans la barre d'outils de l'éditeur

**Fichiers à modifier** :
- `src/components/editor/VideoEditorPage.tsx` (supprimer le header)
- `src/components/editor/VideoEditorPage.css` (supprimer les styles du header)

#### 1.2 Charger les Prompts depuis les JSON
**Problème** : Les prompts des shots ne sont pas récupérés correctement depuis les données

**Solution** :
- Vérifier la structure des données dans `initialShots`
- Mapper correctement `shot.description` ou `shot.prompt` vers le champ prompt
- Afficher le prompt dans la zone de texte de chaque carte de shot

**Fichiers à modifier** :
- `src/components/editor/VideoEditorPage.tsx` (fonction de conversion des shots)
- `src/pages/EditorPageSimple.tsx` (chargement des données)

#### 1.3 Ajouter la Zone de Dépôt dans la Timeline
**Problème** : La timeline n'a pas de zone pour déposer les médias

**Solution** :
```
┌─────────────────────────────────────────────────────┐
│ Timeline Controls [◄] [▶] [▶▶]                     │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ SHOT SEGMENTS (violet)                          │ │
│ │ [Shot 1: 6s] [Shot 2: 10s] [+]                 │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🎬 VIDEO TRACK                                  │ │
│ │ [Drag video clips here...]                      │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🖼️ IMAGE TRACK                                  │ │
│ │ [Drag images here...]                           │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🎵 AUDIO TRACK                                  │ │
│ │ [Drag audio files here...]                      │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 📝 TEXT TRACK                                   │ │
│ │ [Add text overlays here...]                     │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Fichiers à créer/modifier** :
- `src/components/editor/TimelineTracks.tsx` (nouveau composant)
- `src/components/editor/TimelineTracks.css` (styles)
- `src/components/editor/VideoEditorPage.tsx` (intégration)

### Phase 2 : Fonctionnalités Importantes (P1)
**Durée estimée : 4-5 heures**

#### 2.1 Génération de Grille avec Prompts
**Objectif** : Générer une grille d'images pour chaque shot avec son prompt

**Solution** :
```typescript
// Bouton "Générer Grille" dans le panneau droit
const handleGenerateGrid = async () => {
  for (const shot of shots) {
    // 1. Récupérer le prompt du shot
    const prompt = shot.prompt;
    
    // 2. Appeler ComfyUI pour générer l'image
    const imageUrl = await generateImageWithComfyUI(prompt);
    
    // 3. Mettre à jour le shot avec l'image générée
    updateShot(shot.id, { thumbnail: imageUrl });
  }
};
```

**Fichiers à créer/modifier** :
- `src/services/gridGenerationService.ts` (nouveau service)
- `src/components/editor/VideoEditorPage.tsx` (intégration du bouton)

#### 2.2 Édition des Prompts
**Objectif** : Permettre la modification des prompts directement dans l'éditeur

**Solution** :
- Rendre les textareas des prompts éditables
- Ajouter un bouton "Sauvegarder" pour chaque shot
- Mettre à jour le state local et le fichier JSON

**Fichiers à modifier** :
- `src/components/editor/VideoEditorPage.tsx` (handlers d'édition)
- `src/components/editor/VideoEditorPage.css` (styles pour l'édition)

#### 2.3 Sauvegarde Automatique
**Objectif** : Sauvegarder les modifications automatiquement

**Solution** :
```typescript
// Debounced save après chaque modification
const debouncedSave = useCallback(
  debounce(async (shotId: string, updates: Partial<Shot>) => {
    await saveShot(shotId, updates);
    toast({ title: 'Sauvegardé', description: 'Modifications enregistrées' });
  }, 1000),
  []
);
```

**Fichiers à créer/modifier** :
- `src/hooks/useAutoSave.ts` (nouveau hook)
- `src/components/editor/VideoEditorPage.tsx` (intégration)

## 📐 Architecture Proposée

### Structure des Composants

```
VideoEditorPage (Container)
├── Sidebar Left (Assets Library)
│   ├── SearchBar
│   ├── AssetCategories
│   └── QuickActions
│
├── Center Area (Main Editor)
│   ├── VideoPlayer
│   │   └── PreviewCanvas
│   │
│   └── Timeline
│       ├── TimelineControls
│       ├── ShotSegments (violet bars)
│       └── TimelineTracks (NOUVEAU)
│           ├── VideoTrack
│           ├── ImageTrack
│           ├── AudioTrack
│           └── TextTrack
│
├── Sidebar Right (Sequence Plan)
│   ├── SequenceHeader
│   │   ├── SequenceName
│   │   └── GenerateButton (AMÉLIORÉ)
│   │
│   ├── ShotsGrid
│   │   └── ShotCard (AMÉLIORÉ)
│   │       ├── ShotNumber
│   │       ├── Thumbnail
│   │       ├── Title & Duration
│   │       ├── PromptEditor (NOUVEAU)
│   │       └── SaveButton (NOUVEAU)
│   │
│   └── ProjectDetails
│
└── ChatAssistant (Floating)
```

### Flux de Données

```
1. CHARGEMENT
   Dashboard → EditorPageSimple → VideoEditorPage
   ↓
   Charge shots depuis store (avec prompts)
   ↓
   Affiche dans l'interface

2. ÉDITION
   User modifie prompt → State local mis à jour
   ↓
   Debounced save (1s)
   ↓
   Sauvegarde dans JSON via Electron API

3. GÉNÉRATION
   User clique "Générer Grille"
   ↓
   Pour chaque shot : appel ComfyUI avec prompt
   ↓
   Images générées → Thumbnails mis à jour
   ↓
   Sauvegarde automatique
```

## 🔧 Implémentation Détaillée

### Tâche 1 : Supprimer le Double Menu

**Fichier** : `src/components/editor/VideoEditorPage.tsx`

```typescript
// AVANT (à supprimer)
<header className="editor-header">
  <nav className="editor-nav">
    <button className="nav-item">File</button>
    ...
  </nav>
</header>

// APRÈS (garder uniquement)
<div className="editor-toolbar">
  {onBackToDashboard && (
    <button onClick={onBackToDashboard} className="btn-back">
      <ArrowLeft size={16} />
      Back to Dashboard
    </button>
  )}
  <span className="project-name">{projectName}</span>
  <span className="sequence-name">{sequenceName}</span>
</div>
```

### Tâche 2 : Charger les Prompts Correctement

**Fichier** : `src/components/editor/VideoEditorPage.tsx`

```typescript
// Améliorer la conversion des shots
const [shots, setShots] = useState<Shot[]>(() => {
  if (initialShots && initialShots.length > 0) {
    return initialShots.map((shot, index) => ({
      id: index + 1,
      title: shot.title || `Shot ${index + 1}`,
      duration: shot.duration || 5,
      // CORRECTION : Récupérer le prompt correctement
      prompt: shot.prompt || shot.description || shot.text || '',
      thumbnail: shot.thumbnail || shot.image_url,
    }));
  }
  return [];
});
```

### Tâche 3 : Ajouter les Tracks de Timeline

**Nouveau fichier** : `src/components/editor/TimelineTracks.tsx`

```typescript
interface TimelineTracksProps {
  shots: Shot[];
  onDropMedia: (trackType: 'video' | 'image' | 'audio' | 'text', file: File) => void;
}

export function TimelineTracks({ shots, onDropMedia }: TimelineTracksProps) {
  const handleDrop = (trackType: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => onDropMedia(trackType as any, file));
  };

  return (
    <div className="timeline-tracks">
      <div className="track video-track" onDrop={handleDrop('video')}>
        <div className="track-header">
          <Video size={16} />
          <span>VIDEO TRACK</span>
        </div>
        <div className="track-content">
          {/* Clips vidéo */}
        </div>
      </div>
      
      {/* Autres tracks... */}
    </div>
  );
}
```

### Tâche 4 : Génération de Grille

**Nouveau fichier** : `src/services/gridGenerationService.ts`

```typescript
export class GridGenerationService {
  async generateGridForSequence(shots: Shot[]): Promise<void> {
    for (const shot of shots) {
      try {
        // 1. Préparer le prompt
        const prompt = this.preparePrompt(shot);
        
        // 2. Appeler ComfyUI
        const imageUrl = await this.callComfyUI(prompt);
        
        // 3. Sauvegarder l'image
        await this.saveImage(shot.id, imageUrl);
        
        // 4. Mettre à jour le shot
        shot.thumbnail = imageUrl;
        
      } catch (error) {
        console.error(`Failed to generate image for shot ${shot.id}:`, error);
      }
    }
  }

  private preparePrompt(shot: Shot): string {
    // Enrichir le prompt avec des détails techniques
    return `${shot.prompt}, cinematic lighting, high quality, 4k`;
  }

  private async callComfyUI(prompt: string): Promise<string> {
    // Appel à l'API ComfyUI
    const response = await fetch('http://localhost:8188/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    
    const data = await response.json();
    return data.imageUrl;
  }

  private async saveImage(shotId: string, imageUrl: string): Promise<void> {
    // Sauvegarder l'image dans le projet
    if (window.electronAPI?.fs?.writeFile) {
      // Télécharger et sauvegarder l'image
    }
  }
}
```

### Tâche 5 : Édition et Sauvegarde des Prompts

**Fichier** : `src/components/editor/VideoEditorPage.tsx`

```typescript
// Ajouter un handler pour l'édition des prompts
const handlePromptChange = (shotId: number, newPrompt: string) => {
  // Mettre à jour le state local
  setShots(prevShots =>
    prevShots.map(shot =>
      shot.id === shotId ? { ...shot, prompt: newPrompt } : shot
    )
  );
  
  // Sauvegarder avec debounce
  debouncedSave(shotId, { prompt: newPrompt });
};

// Dans le JSX des cartes de shot
<textarea
  className="shot-prompt"
  value={shot.prompt}
  onChange={(e) => handlePromptChange(shot.id, e.target.value)}
  placeholder="Entrez le prompt pour ce shot..."
/>
```

## 📊 Priorités d'Implémentation

### Sprint 1 (Jour 1) - Corrections Critiques
- [ ] **Tâche 1.1** : Supprimer le double menu (30 min)
- [ ] **Tâche 1.2** : Charger les prompts correctement (1h)
- [ ] **Tâche 1.3** : Ajouter les tracks de timeline (2h)

### Sprint 2 (Jour 2) - Fonctionnalités Essentielles
- [ ] **Tâche 2.1** : Édition des prompts (1h)
- [ ] **Tâche 2.2** : Sauvegarde automatique (1h)
- [ ] **Tâche 2.3** : Génération de grille (3h)

### Sprint 3 (Jour 3) - Polish & Tests
- [ ] Tests de l'édition
- [ ] Tests de la génération
- [ ] Optimisation des performances
- [ ] Documentation utilisateur

## 🎨 Maquettes Visuelles

### Avant (Problèmes)
```
┌─────────────────────────────────────────────────────┐
│ File | Create | Edit | View | Settings | Docs | Help│ ← DOUBLE MENU
├─────────────────────────────────────────────────────┤
│ File | Create | Edit | View | Settings | Docs | Help│ ← DOUBLE MENU
├──────────┬──────────────────────┬───────────────────┤
│ Library  │ [Player]             │ Sequence Plan     │
│          │                      │ Shot 1: [empty]   │ ← Pas de prompt
│          │ [Timeline]           │ Shot 2: [empty]   │
│          │ [Shot1][Shot2][+]   │                   │ ← Pas de tracks
└──────────┴──────────────────────┴───────────────────┘
```

### Après (Améliorations)
```
┌─────────────────────────────────────────────────────┐
│ ← Back | My Project | Sequence 1                    │ ← UN SEUL MENU
├──────────┬──────────────────────┬───────────────────┤
│ Library  │ [Player]             │ Sequence Plan     │
│          │                      │ ┌───────────────┐ │
│ Search   │ [Timeline]           │ │ Shot 1        │ │
│ Assets   │ [Shot1][Shot2][+]   │ │ [thumbnail]   │ │
│ • Images │                      │ │ 6s            │ │
│ • Audio  │ 🎬 VIDEO TRACK       │ │ [Prompt...]   │ │ ← Prompt éditable
│ • Text   │ [clip1] [clip2]      │ │ [Save]        │ │
│          │                      │ └───────────────┘ │
│ [+ New]  │ 🖼️ IMAGE TRACK       │ [✨ Generate]    │ ← Génération
│          │ [img1]               │                   │
│          │                      │                   │
│          │ 🎵 AUDIO TRACK       │                   │
│          │ [audio1]             │                   │
│          │                      │                   │
│          │ 📝 TEXT TRACK        │                   │
│          │ [text1]              │                   │
└──────────┴──────────────────────┴───────────────────┘
```

## 🧪 Tests à Effectuer

### Tests Fonctionnels
1. ✅ Le menu n'apparaît qu'une seule fois
2. ✅ Les prompts des shots sont chargés depuis les JSON
3. ✅ Les prompts peuvent être modifiés
4. ✅ Les modifications sont sauvegardées automatiquement
5. ✅ La génération de grille fonctionne pour tous les shots
6. ✅ Les tracks de timeline acceptent le drag & drop
7. ✅ Les médias déposés apparaissent dans les tracks

### Tests de Performance
1. ✅ Chargement de 50+ shots sans lag
2. ✅ Édition de prompts fluide (< 100ms)
3. ✅ Génération de grille en arrière-plan
4. ✅ Sauvegarde sans bloquer l'UI

## 📝 Notes Techniques

### Gestion des Prompts
- Les prompts sont stockés dans `shot.prompt` ou `shot.description`
- Format : texte libre, max 500 caractères
- Validation : pas de caractères spéciaux dangereux

### Génération d'Images
- Service : ComfyUI (port 8188)
- Format : PNG, 1024x1024
- Stockage : `project/assets/generated/`
- Nommage : `shot_${shotId}_${timestamp}.png`

### Timeline Tracks
- 4 tracks : Video, Image, Audio, Text
- Drag & drop depuis la bibliothèque
- Snap to grid (1 seconde)
- Zoom : 1x à 10x

## 🚀 Déploiement

### Checklist Avant Release
- [ ] Tous les tests passent
- [ ] Documentation à jour
- [ ] Pas d'erreurs console
- [ ] Performance acceptable (< 2s chargement)
- [ ] Compatible Electron + Web

### Migration des Données
- Pas de migration nécessaire
- Les anciens projets fonctionnent toujours
- Les nouveaux champs sont optionnels

---

**Version** : 3.0.0  
**Date** : 20 janvier 2026  
**Statut** : 📋 Plan prêt pour implémentation
