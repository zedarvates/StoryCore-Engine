# Méthodologie Cinématographique pour StoryCore

## 📽️ Vue d'Ensemble

Ce document décrit la méthodologie cinématographique implémentée pour la gestion des plans-séquences dans StoryCore.

---

## 1. Types de Films

### Classification par Durée

| Type | Durée | Description | Plans-Séquences Recommandés |
|------|-------|-------------|---------------------------|
| **Court-métrage** | 3-20 min | Le plan-séquence comme signature | Intro + Fin (obligatoire) |
| **Moyen métrage** | 20-60 min | Structure élégante | Intro + Fin (recommandé) |
| **Long métrage** | 60+ min | Usage ponctuel | 0-1 plan-séquence notable |

### Détection Automatique

```typescript
function detectFilmType(story: any): FilmType {
  const estimatedMinutes = story.content.length / 150; // 150 mots/minute
  
  if (estimatedMinutes < 20) return 'short_film';
  if (estimatedMinutes < 60) return 'medium_film';
  return 'feature_film';
}
```

---

## 2. Approches de Chapitres

### 2.1 Approche Classique
**1 plan-séquence par chapitre**

- ✅ Structure propre et lisible
- ✅ Chaque chapitre a une identité forte
- ✅ Parfait pour films narratifs

### 2.2 Approche Immersive
**2-3 plans-séquences par chapitre**

- ✅ Mini-expérience fluide par chapitre
- ✅ Comme un niveau de jeu vidéo
- ✅ Idéal pour films chorégraphiés

### 2.3 Approche Extrême
**4-10 plans-séquences par chapitre**

- ✅ Bloc narratif continu
- ✅ Presque hypnotique
- ✅ Pour films d'auteur et expérimentaux

---

## 3. Complexité des Shots Internes

### 3.1 Simple (1-3 shots internes)

**Exemples:**
- Mouvement d'épaule
- Travelling léger
- Panoramique

**Effet:** Fluide, lisible, naturel

### 3.2 Riche (4-8 shots internes)

**Exemples:**
- Entrée → Déplacement → Interaction → Révélation → Sortie
- Changement de profondeur
- Changement de personnage
- Changement d'axe

**Effet:** Chorégraphié, dynamique, très cinématographique

### 3.3 Complexe (9+ shots internes)

**Exemples:**
- Traversée de plusieurs pièces
- Plusieurs groupes de personnages
- Actions simultanées

**Effet:** Spectaculaire, signature visuelle forte

---

## 4. Structure de Données

### ChapterData
```typescript
interface ChapterData {
  id: string;
  name: string;
  order: number;
  approach: ChapterApproach;      // classic | immersive | extreme
  longTakesCount: number;        // Nombre de plans-séquences
  complexity: ShotComplexity;     // simple | rich | complex
  internalShotsCount: number;    // Shots internes calculés
  description: string;
  sequences: string[];           // IDs des séquences
  storySegment?: string;         // Segment de l'histoire
}
```

### LongTakeSequenceData
```typescript
interface LongTakeSequenceData extends SequenceData {
  isLongTake: boolean;
  complexity: ShotComplexity;
  internalShotsCount: number;
  chapterId?: string;
  purpose?: 'intro' | 'body' | 'outro' | 'action' | 'emotional';
  cameraMovement?: string;
  characteristics?: string[];
}
```

---

## 5. Configuration par Défaut

### FILM_TYPE_CONFIGS
```typescript
const FILM_TYPE_CONFIGS = [
  {
    type: 'short_film',
    avgSequences: 3,
    avgChapters: 3,
    introLongTake: true,
    endingLongTake: true,
  },
  {
    type: 'medium_film',
    avgSequences: 5,
    avgChapters: 5,
    introLongTake: true,
    endingLongTake: true,
  },
  {
    type: 'feature_film',
    avgSequences: 12,
    avgChapters: 8,
    introLongTake: false,
    endingLongTake: false,
  },
];
```

### CHAPTER_APPROACHES
```typescript
const CHAPTER_APPROACHES = {
  classic: { longTakesPerChapter: { min: 1, max: 1 } },
  immersive: { longTakesPerChapter: { min: 2, max: 3 } },
  extreme: { longTakesPerChapter: { min: 4, max: 10 } },
};
```

### SHOT_COMPLEXITY
```typescript
const SHOT_COMPLEXITY = {
  simple: { internalShots: { min: 1, max: 3 } },
  rich: { internalShots: { min: 4, max: 8 } },
  complex: { internalShots: { min: 9, max: 50 } },
};
```

---

## 6. Fonctions Helper

### Détection et Calcul
```typescript
// Détecter le type de film
detectFilmType(story: any): FilmType

// Obtenir la configuration
getFilmTypeConfig(filmType: FilmType): FilmTypeConfig

// Calculer les plans-séquences par chapitre
calculateLongTakesForChapter(approach: ChapterApproach): number

// Calculer les shots internes
calculateInternalShots(complexity: ShotComplexity): number
```

---

## 7. Métadonnées pour Génération

Chaque shot reçoit des métadonnées enrichies:

```typescript
metadata: {
  // Pour génération d'images
  imagePrompt: string;
  negativePrompt: string;
  visualStyle: string;
  
  // Pour audio/TTS
  ttsPrompt: string;
  voiceParameters: {
    language: string;
    speed: number;
    pitch: number;
  };
  
  // Tracking de synchronisation
  syncedFromStory: boolean;
  lastSyncedAt: string;
  storyId: string;
  
  // Métadonnées cinématographiques
  sequenceType: SequenceType;
  isLongTake: boolean;
  complexity: ShotComplexity;
  internalShotsCount: number;
  purpose?: 'intro' | 'body' | 'outro';
}
```

---

## 8. Bonnes Pratiques

### Court-métrages (3-20 min)
1. ✅ Créer un plan-séquence d'intro (30s - 2min)
2. ✅ Créer un plan-séquence de fin (20s - 1min)
3. ✅ Utiliser l'approche "Classique" par défaut
4. ✅ Complexité: Simple à Riche

### Moyens métrages (20-60 min)
1. ✅ Plan-séquence intro avec setup du monde
2. ✅ Plan-séquence fin émotionnel
3. ✅ Approche "Immersive" pour chapitres clés
4. ✅ Complexité: Riche pour moments forts

### Longs métrages (60+ min)
1. ✅ Plan-séquence intro optionnel
2. ✅ Usage ponctuel pour moments clés
3. ✅ Approche "Classique" par défaut
4. ✅ Complexité variable selon la scène

---

## 9. Exemples d'Utilisation

### Créer un plan-séquence d'intro
```typescript
const introSequence: LongTakeSequenceData = {
  id: crypto.randomUUID(),
  name: '🎬 INTRO - Plan-Séquence',
  duration: 60,
  shots: 1,
  isLongTake: true,
  complexity: 'rich',
  internalShotsCount: 5,
  purpose: 'intro',
  cameraMovement: 'Steady cam / Tracking',
  characteristics: SEQUENCE_TEMPLATES.intro_long_take.characteristics,
};
```

### Synchroniser avec l'histoire
```typescript
handleSyncSequences();
// Distribue le contenu de l'histoire
// Génère les prompts pour images
// Extrait les dialogues pour TTS
```

---

## 10. Références Cinématographiques

### Réalisateurs Connus pour Plans-Séquences
- **Alfonso Cuarón** (Gravity, Children of Men)
- **Alejandro González Iñárritu** (Birdman, The Revenant)
- **Brian De Palma** (Mission: Impossible)
- **Sergei Eisenstein** (Théorie du montage)

### Films de Référence
- *1917* (Sam Mendes)
- *Russian Ark* (Alexander Sokurov)
- *Victoria* (Sebastian Schipper)
- *Hardcore Henry* (Ilya Naishuller)

---

## 11. Fichiers Associés

- `ProjectDashboardNew.tsx` - Composant principal
- `ProjectDashboardNew_complete.tsx` - Version complète avec cinéma
- `ProjectDashboardNew.css` - Styles
- `PlanSequencesSection.tsx` - Section séquences

---

*Document généré pour StoryCore Engine v1.0*

