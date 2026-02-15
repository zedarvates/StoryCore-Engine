# Plan d'implémentation: Synchronisation Plans Séquences

## Objectif
Ajouter un bouton "Synchroniser" dans la section "Plan Séquences" du dashboard qui met à jour les plans séquences en fonction de l'histoire et des dialogues.

## Fonctionnalités à implémenter

### 1. Bouton "Synchroniser" dans `PlanSequencesSection.tsx`
- Icône: 🔄 (Refresh/Sync)
- Texte: "Mise à jour" ou "Synchroniser"
- Action: Appelle une fonction pour mettre à jour les séquences

### 2. Fonction de synchronisation dans `ProjectDashboardNew.tsx`
La fonction `handleSyncSequences` doit:
1. Récupérer l'histoire sélectionnée (stories depuis `useStore`)
2. Analyser le contenu de l'histoire pour chaque séquence
3. Pour chaque shot associé à une séquence:
   - Mettre à jour la description basée sur le contenu narratif
   - Synchroniser les dialogues (audioTracks de type 'dialogue')
   - Stocker les prompts de génération d'images dans `metadata`
   - Stocker les prompts pour audio/TTS dans `audioTracks`

### 3. Structure de données à mettre à jour

Pour chaque Shot:
```typescript
Shot {
  description: string; // Basé sur l'histoire
  audioTracks: AudioTrack[]; // Avec dialogues synchronisés
  metadata: {
    // Prompts pour générations
    imagePrompt?: string;
    negativePrompt?: string;
    visualStyle?: string;
    // Prompts pour audio
    ttsPrompt?: string;
    voiceParameters?: VoiceParameters;
    // Métadonnées de synchronisation
    syncedFromStory: boolean;
    lastSyncedAt: string;
  }
}
```

## Fichiers à modifier

1. `src/components/workspace/PlanSequencesSection.tsx`
   - Ajouter le bouton "Synchroniser"
   - Ajouter la props `onSync` et `isSyncing`

2. `src/components/workspace/ProjectDashboardNew.tsx`
   - Ajouter la fonction `handleSyncSequences()`
   - Implémenter la logique de synchronisation avec l'histoire et les dialogues

## Métadonnées à synchroniser

### Pour la génération d'images:
- `imagePrompt` - Prompt positif pour génération
- `negativePrompt` - Prompt négatif
- `visualStyle` - Style visuel
- `comfyUIWorkflow` - Workflow ComfyUI optionnel

### Pour l'audio/TTS:
- `ttsPrompt` - Texte à dire
- `voiceId` - Identifiant de voix
- `emotion` - Émotion du dialogue
- `speed` - Vitesse de lecture
- `pitch` - Hauteur de voix

### Métadonnées de tracking:
- `syncedFromStory` - Si le shot est synchronisé
- `lastSyncedAt` - Date de dernière synchronisation
- `storyId` - ID de l'histoire source
- `chapterId` - ID du chapitre si applicable

