# Plan d'Amélioration: Wizards pour Plans Séquences, Shots, Musique et Paroles

## Informations Réunies

### État Actuel du Codebase

1. **Types de Wizards Existants** (dans `wizardStorage.ts`):
   - 'world', 'character', 'storyteller', 'dialogue-writer', 'scene-generator', 'storyboard-creator', 'style-transfer', 'sequence-plan', 'shot'

2. **Service LLM** (`llmService.ts`):
   - Génération de texte via OpenAI, Anthropic, Ollama
   - Génération d'images (DALL-E)
   - PAS de génération de musique/audio/paroles

3. **StoryCore Assistant** (`StoryCoreAssistant.tsx`):
   - Peut lancer des wizards
   - Analyse de projet
   - Suggestions basées sur le pipeline

4. **Menu Actions** (`menuActions.ts`):
   - Placeholders pour `audioProduction` et `videoProduction` wizards

## Plan d'Implémentation

### 1. Ajout des Nouveaux Types de Wizards

**Fichier**: `creative-studio-ui/src/utils/wizardStorage.ts`

Ajouter à `WizardType`:
- `'music-generation'` - Génération de musique
- `'lyrics-generation'` - Génération de paroles

### 2. Extensions du Service LLM

**Fichier**: `creative-studio-ui/src/services/llmService.ts`

Ajouter:
- `generateMusic(prompt, options)` - Génération de musique via prompts
- `generateLyrics(prompt, options)` - Génération de paroles
- `MusicGenerationOptions` interface
- `LyricsGenerationOptions` interface

### 3. Création des Nouveaux Wizards

**Fichiers à créer**:
- `creative-studio-ui/src/components/wizard/music/MusicGenerationWizard.tsx`
- `creative-studio-ui/src/components/wizard/lyrics/LyricsGenerationWizard.tsx`

### 4. Intégration avec le StoryCore Assistant

**Fichier**: `creative-studio-ui/src/components/assistants/StoryCoreAssistant.tsx`

Ajouter:
- Compréhension des demandes de musique/paroles
- Suggestions de wizards音乐
- Intégration shot-dialogue

### 5. Définitions des Wizards

**Fichier**: `creative-studio-ui/src/data/wizardDefinitions.ts`

Ajouter les définitions pour:
- Music Generation Wizard
- Lyrics Generation Wizard

### 6. Menu Actions

**Fichier**: `creative-studio-ui/src/components/menuBar/menuActions.ts`

Implémenter les fonctions pour:
- `musicWizard()`
- `lyricsWizard()`

## Types de Données à Créer

```typescript
// Pour la musique
interface MusicGenerationRequest {
  prompt: string;
  style: 'cinematic' | 'ambient' | 'action' | 'romantic' | 'horror' | 'comedy';
  duration: number; // secondes
  mood: string[];
  instrumentation?: string[];
  bpm?: number;
  key?: string;
}

// Pour les paroles
interface LyricsGenerationRequest {
  theme: string;
  style: 'rap' | 'pop' | 'rock' | 'ballad' | 'folk';
  mood: string[];
  length: 'short' | 'medium' | 'long';
  characters?: string[]; // Pour integration avec personnages
  shots?: string[]; // Pour integration avec shots
}

// Pour l'integration dialogue-shot
interface ShotDialogueIntegration {
  shotId: string;
  characterId?: string;
  dialogue?: string;
  audioPhraseId?: string;
}
```

## Fonctionnalités de l'Assistant LLM

L'assistant devra comprendre des commandes comme:
- "Génère une musique triste pour le shot 3"
- "Crée des paroles pour un duo romantique"
- "Le personnage Jean dit bonjour dans le shot 2"
- "Génère la musique de scène pour la séquence d'action"

## Étapes de Suivi

1. [ ] Ajouter les nouveaux types de wizards
2. [ ] Créer les interfaces pour musique/paroles
3. [ ] Étendre le LLM service
4. [ ] Créer le Music Generation Wizard
5. [ ] Créer le Lyrics Generation Wizard
6. [ ] Mettre à jour les définitions de wizards
7. [ ] Intégrer avec le StoryCore Assistant
8. [ ] Implémenter les menu actions
9. [ ] Tester l'intégration

## Dépendances

- Ollama avec modèle de musique (si disponible)
- API de génération musicale externe (en option)
- Intégration avec le système de shots existant
- Intégration avec les personnages existants

