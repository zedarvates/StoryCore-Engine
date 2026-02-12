# 🎬 Cinematic Components - Documentation

## Vue d'ensemble

Le système cinématographique de StoryCore fournit des outils professionnels pour l'édition de séquences avec:
- **Sélection de mouvements de caméra** - 18 types de mouvements
- **Beats narratifs** - Structure dramatique professionnelle
- **Tracking émotionnel** - Arc émotionnel et moods
- **Analyse du rythme** - Pacing et tempo
- **Notes de réalisation** - Director's notes

## Installation

Les composants sont déjà exportés via l'index:

```typescript
import {
  CameraMovementSelector,
  BeatSelector,
  EnhancedSequenceCard,
  CinematicEditorPanel,
  CameraMovement,
  MoodType,
  BeatType,
  PacingType
} from '@/components/cinematic';
```

## Composants

### 1. CameraMovementSelector

Sélecteur visuel de mouvements de caméra avec icônes et présets.

```tsx
<CameraMovementSelector
  value={currentMovement}
  onChange={(movement) => setMovement(movement)}
  compact={false}        // Version compacte ou complète
  showPresets={true}     // Afficher les présets
  disabled={false}       // Désactiver les interactions
/>
```

**Mouvements disponibles:**

| Catégorie | Mouvements |
|-----------|------------|
| Stabilité | Steadicam, Steady Cam, Plan fixe, Dolly |
| Tracking | Tracking, Walking, Running, Vehicle |
| Rotation | Pan, Tilt, Orbital, Arc |
| Style | Handheld, POV, Reverse |
| Échelle | Drone, Crane, Zoom, Spline |

### 2. BeatSelector

Composant de sélection de beats narratifs avec suggestions intelligentes.

```tsx
<BeatSelector
  value={currentBeatId}
  onChange={(beatId, beatType) => handleBeatChange(beatId, beatType)}
  suggestions={beatSuggestions}  // Suggestions basées sur le contenu
/>
```

**Types de beats:**

| Type | Description |
|------|-------------|
| Opening | Ouverture de séquence |
| Setup | Mise en place |
| Confrontation | Confrontation |
| Climax | Point culminant |
| Reversal | Retournement |
| Resolution | Résolution |
| Emotional | Beat émotionnel |
| Closing | Clôture |
| Transition | Transition |
| Callback | Retour/Callback |

### 3. EnhancedSequenceCard

Carte de séquence enrichie avec affichage des métriques.

```tsx
<EnhancedSequenceCard
  sequence={sequenceData}
  onClick={() => handleSequenceClick(sequence.id)}
  compact={false}     // Version compacte
  showBeats={true}    // Afficher les beats
  showCharacters={true}
/>
```

**Métriques affichées:**
- Durée totale
- Nombre de plans
- Mood dominant
- Progression émotionnelle (barres colorées)

### 4. CinematicEditorPanel

Panneau complet d'édition cinématographique pour l'intégration dans l'éditeur de séquences.

```tsx
<CinematicEditorPanel
  sequenceId="seq-123"
  shots={allShots}
  characters={allCharacters}
  onUpdateShot={(shotId, updates) => updateShot(shotId, updates)}
  onUpdateSequence={(updates) => updateSequence(updates)}
  className="custom-class"
/>
```

## Types

### CameraMovement

```typescript
type CameraMovement = 
  | 'steadicam' | 'steadicam_shoulder' | 'fixed' | 'dolly'
  | 'tracking' | 'walking' | 'running' | 'vehicle'
  | 'pan' | 'tilt' | 'orbital' | 'arc'
  | 'handheld' | 'pov' | 'reverse'
  | 'drone' | 'crane' | 'zoom' | 'spline';
```

### MoodType

```typescript
type MoodType = 
  | 'neutral' | 'happy' | 'sad' | 'tense' | 'romantic'
  | 'mysterious' | 'epic' | 'intimate' | 'dark' | 'whimsical'
  | 'melancholic' | 'anxious' | 'triumphant' | 'nostalgic'
  | 'peaceful' | 'chaotic' | 'mystical' | 'ironic';
```

### BeatType

```typescript
type BeatType = 
  | 'opening' | 'setup' | 'confrontation' | 'climax'
  | 'reversal' | 'resolution' | 'emotional' | 'closing'
  | 'transition' | 'callback';
```

### PacingType

```typescript
type PacingType = 'slow' | 'medium' | 'fast' | 'varying';
```

## Utilisation avancée

### Intégration dans le dashboard

```tsx
import { EnhancedSequenceCard } from '@/components/cinematic';

function DashboardSequences({ sequences }) {
  return (
    <div className="sequences-grid">
      {sequences.map(seq => (
        <EnhancedSequenceCard
          key={seq.id}
          sequence={seq}
          onClick={() => openEditor(seq.id)}
        />
      ))}
    </div>
  );
}
```

### Intégration dans l'éditeur de séquences

```tsx
import { CinematicEditorPanel } from '@/components/cinematic';

function SequenceEditor() {
  return (
    <div className="editor-layout">
      <CinematicEditorPanel
        sequenceId={currentSequenceId}
        shots={shots}
        characters={characters}
        onUpdateShot={handleShotUpdate}
        onUpdateSequence={handleSequenceUpdate}
      />
      {/* Autres panneaux... */}
    </div>
  );
}
```

### Utilisation autonome des types

```typescript
import { 
  EnhancedShot, 
  CompleteSequence,
  ChapterWithBeats,
  MoodArc,
  getCameraMovementConfig 
} from '@/types/cinematicTypes';

// Configuration d'un mouvement
const cameraConfig = getCameraMovementConfig('tracking');
console.log(cameraConfig.name); // "Tracking"
// console.log(cameraConfig.icon); // Composant icône

// Création d'un shot enrichi
const shot: EnhancedShot = {
  id: 'shot-1',
  title: 'Plan d\'ouverture',
  description: 'Le héros entre dans la ville',
  duration: 15,
  position: 1,
  cameraMovement: 'steadicam',
  mood: 'epic',
  tone: 'dramatic',
  pacing: 'medium',
  characters: [heroCharacter],
  beatId: 'beat-1',
  transition: 'dissolve'
};
```

## Couleurs et styles

### Mood Colors

| Mood | Background | Border |
|------|------------|--------|
| neutral | #f3f4f6 | #d1d5db |
| happy | #fef3c7 | #fcd34d |
| sad | #e0e7ff | #a5b4fc |
| tense | #fee2e2 | #fca5a5 |
| romantic | #fce7f3 | #f9a8d4 |
| mysterious | #1f2937 | #374151 |
| epic | #fef9c3 | #fde047 |
| dark | #18181b | #27272a |

### Tone Colors

| Tone | Color |
|------|-------|
| serious | #3b82f6 |
| comedic | #f59e0b |
| dramatic | #8b5cf6 |
| light | #10b981 |
| heavy | #1f2937 |

## Bonnes pratiques

1. **Conservateur pour les novices**: Commencez avec `Plan fixe` et `Cut`
2. **Contextuel**: Choisissez le mouvement en fonction de l'émotion
3. **Progression**: Variez les mouvements dans une séquence
4. **Documentation**: Utilisez les Director's notes pour expliquer vos choix
5. ** beat planning**: Planifiez les beats avant le tournage

## Prochaines extensions

- [ ] Storyboard Generator (génération visuelle)
- [ ] Export PDF de la liste de plans
- [ ] Intégration avec ComfyUI pour générations
- [ ] Templates de séquences par genre
- [ ] Analyse AI du rythme narratif

---

*Version: 1.0.0*
* Dernière mise à jour: 2024

