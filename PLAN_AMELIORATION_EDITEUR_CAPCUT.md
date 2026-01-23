# Plan d'Amélioration de l'Éditeur Vidéo - Fonctionnalités CapCut

## Vue d'Ensemble
Améliorer l'écran d'édition de StoryCore pour atteindre le niveau de fonctionnalités de CapCut, en se concentrant sur une timeline professionnelle avec outils d'édition avancés.

## État Actuel
- ✅ Timeline basique avec réordonnancement par drag & drop
- ✅ Contrôles de lecture simples (play/pause/skip)
- ✅ Pistes multiples (vidéo, image, audio, texte)
- ✅ Menu contextuel pour les shots
- ✅ Timeline professionnelle avec scrubbing précis (Phase 1.3)
- ✅ Visualisation des formes d'onde audio (Phase 2.1)
- ✅ Keyframes de volume audio (Phase 2.1)
- ❌ Outils de découpe/trimming précis
- ❌ Transitions entre clips
- ❌ Animation par keyframes
- ❌ Ajustement de vitesse
- ❌ Gestion avancée des calques

## Plan d'Implémentation - Phase 1: Fonctionnalités Core

### 1.1 Outils de Découpe et Trim (Priorité Haute)
**Objectif**: Permettre la découpe précise des clips comme dans CapCut

**Composants à créer/modifier**:
- `ClipTrimmer.tsx` - Outil de trimming visuel
- `ClipSplitter.tsx` - Outil de découpe
- `TimelineRuler.tsx` - Règle temporelle précise

**Fonctionnalités**:
- Sélection de zone de trimming par drag
- Découpe de clips en deux ou plusieurs parties
- Aperçu en temps réel pendant le trimming
- Raccourcis clavier (I/O pour in/out, X pour couper)

**API Timeline**:
```typescript
interface TimelineClip {
  id: string;
  type: 'video' | 'image' | 'audio' | 'text' | 'effect';
  startTime: number;
  endTime: number;
  duration: number;
  trimStart: number;  // Point de départ dans le média source
  trimEnd: number;    // Point de fin dans le média source
  // ... autres propriétés
}
```

### 1.2 Transitions Avancées (Priorité Haute)
**Objectif**: Ajouter des transitions fluides entre clips

**Types de transitions**:
- Dissolve/Fade
- Wipe (balayage)
- Push (poussée)
- Zoom
- Custom transitions

**Implémentation**:
- Bibliothèque de transitions prédéfinies
- Éditeur de transitions personnalisées
- Aperçu en temps réel
- Gestion des chevauchements

### 1.3 Contrôles de Lecture Professionnels (Priorité Moyenne)
**Objectif**: Contrôles précis comme dans les logiciels pro

**Fonctionnalités**:
- Scrubbing de la timeline (drag pour naviguer)
- Navigation frame par frame (flèches gauche/droite)
- Lecture en boucle d'une sélection
- Zoom de la timeline (raccourci Z)
- Indicateur de temps précis (HH:MM:SS:FF)
- Marqueurs de timeline

## Phase 2: Audio et Effets

### 2.1 Édition Audio Avancée ✅ COMPLETED
**Objectif**: Outils d'édition audio complets

**Fonctionnalités implémentées**:
- ✅ Visualisation des formes d'onde (`AudioWaveform.tsx`)
- ✅ Ajustement du volume par keyframes (`VolumeKeyframes.tsx`)
- ✅ Contrôles de volume et mute
- ✅ Interface de timeline audio intégrée
- ✅ Keyframes d'animation du volume avec drag & drop

**Composants créés**:
- `AudioWaveform.tsx` - Visualisation des formes d'onde avec contrôles
- `VolumeKeyframes.tsx` - Édition des keyframes de volume
- `AudioWaveform.css` & `VolumeKeyframes.css` - Styles professionnels

### 2.2 Système d'Effets et Filtres
**Objectif**: Bibliothèque d'effets visuels

**Catégories d'effets**:
- Correction couleur (brightness, contrast, saturation)
- Filtres créatifs (vintage, cinematic, etc.)
- Effets de transformation (rotation, scale, position)
- Effets temporels (speed ramp, reverse)

**Implémentation**:
- Effets en temps réel sur la timeline
- Pile d'effets par clip
- Paramètres ajustables

## Phase 3: Animation et Texte

### 3.1 Système de Keyframes
**Objectif**: Animation précise des propriétés

**Propriétés animables**:
- Position (X, Y)
- Échelle (scale X, Y)
- Rotation
- Opacité
- Paramètres d'effets

**Interface**:
- Timeline d'animation séparée
- Courbes de Bézier pour easing
- Copie/collage d'animations

### 3.2 Éditeur de Texte Avancé
**Objectif**: Textes animés professionnels

**Fonctionnalités**:
- Polices personnalisées
- Animations d'entrée/sortie
- Styles de texte (ombre, contour, glow)
- Positioning précis
- Templates de texte prédéfinis

## Phase 4: Gestion de Projet

### 4.1 Gestion des Calques
**Objectif**: Système de calques hiérarchique

**Fonctionnalités**:
- Calques multiples par piste
- Groupement de calques
- Visibilité/opacité par calque
- Lock/unlock de calques
- Réordonnancement des calques

### 4.2 Bibliothèque de Médias
**Objectif**: Gestion avancée des assets

**Fonctionnalités**:
- Import par drag & drop
- Organisation par dossiers
- Recherche et filtrage
- Prévisualisation des médias
- Gestion des proxies pour performance

## Architecture Technique

### Structure des Composants
```
src/components/editor/
├── timeline/
│   ├── Timeline.tsx              # Conteneur principal
│   ├── TimelineRuler.tsx         # Règle temporelle
│   ├── TimelineTracks.tsx        # Pistes existant
│   ├── TimelineScrubber.tsx      # Curseur de navigation
│   └── TimelineZoom.tsx          # Contrôles de zoom
├── clips/
│   ├── VideoClip.tsx             # Clip vidéo avec trimming
│   ├── AudioClip.tsx             # Clip audio avec waveform
│   ├── TextClip.tsx              # Clip texte animé
│   └── EffectClip.tsx            # Clip d'effet
├── tools/
│   ├── ClipTrimmer.tsx           # Outil de trimming
│   ├── ClipSplitter.tsx          # Outil de découpe
│   ├── TransitionEditor.tsx      # Éditeur de transitions
│   └── KeyframeEditor.tsx        # Éditeur de keyframes
└── effects/
    ├── EffectPanel.tsx           # Panneau d'effets
    ├── TransitionLibrary.tsx     # Bibliothèque de transitions
    └── FilterLibrary.tsx         # Bibliothèque de filtres
```

### État Global (Zustand Store)
```typescript
interface EditorState {
  // Timeline
  currentTime: number;
  zoom: number;
  duration: number;
  selectedClips: string[];
  
  // Clips
  clips: TimelineClip[];
  transitions: Transition[];
  
  // Audio
  audioTracks: AudioTrack[];
  masterVolume: number;
  
  // Effects
  effects: Effect[];
  keyframes: Keyframe[];
  
  // UI
  tool: 'select' | 'trim' | 'split' | 'transition';
  showKeyframes: boolean;
  showAudioWaveform: boolean;
}
```

### API Backend
**Nouveaux endpoints nécessaires**:
- `POST /api/timeline/trim` - Trim un clip
- `POST /api/timeline/split` - Découpe un clip
- `POST /api/timeline/transition` - Applique une transition
- `POST /api/effects/apply` - Applique un effet
- `POST /api/audio/waveform` - Génère waveform audio
- `POST /api/render/preview` - Aperçu temps réel

## Plan de Développement

### Sprint 1: Outils de Base (2 semaines)
1. Implémentation du trimming visuel
2. Découpe de clips
3. Règle temporelle précise
4. Navigation améliorée

### Sprint 2: Transitions (1 semaine)
1. Bibliothèque de transitions
2. Éditeur de transitions
3. Aperçu des transitions

### Sprint 3: Audio (2 semaines)
1. Visualisation des waveforms
2. Édition audio de base
3. Mixage audio

### Sprint 4: Effets (2 semaines)
1. Système d'effets
2. Bibliothèque de filtres
3. Correction couleur

### Sprint 5: Animation (2 semaines)
1. Système de keyframes
2. Animation de propriétés
3. Éditeur de texte avancé

### Sprint 6: Calques et Performance (1 semaine)
1. Gestion des calques
2. Optimisations de performance
3. Tests d'intégration

## Métriques de Succès
- **Utilisabilité**: Temps d'édition réduit de 50%
- **Performance**: Rendu temps réel fluide (60 FPS)
- **Fonctionnalités**: 80% des fonctionnalités CapCut implémentées
- **Stabilité**: Moins de 5 bugs critiques par release

## Technologies Recommandées
- **Canvas/WebGL** pour le rendu timeline haute performance
- **Web Audio API** pour l'édition audio
- **Fabric.js** ou **Konva.js** pour les transformations visuelles
- **FFmpeg.wasm** pour le traitement vidéo côté client
- **IndexedDB** pour le cache des médias

Ce plan transforme l'éditeur StoryCore en outil professionnel comparable à CapCut, tout en gardant l'ADN IA du projet.