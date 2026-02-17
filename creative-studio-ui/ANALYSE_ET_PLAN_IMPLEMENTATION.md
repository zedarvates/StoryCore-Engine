# 🔍 Analyse Complète du Projet StoryCore Engine
## & Plan d'Implémentation des Améliorations

**Date :** 16 février 2026  
**Auteur :** Analyse Automatique  

---

## 📐 1. Architecture Générale du Projet

### 1.1 Structure Globale

```
storycore-engine/
├── creative-studio-ui/     ← Frontend React/TypeScript (Vite + Electron)
│   ├── src/
│   │   ├── components/     ← 1124+ composants UI
│   │   ├── services/       ← 283 fichiers de services
│   │   ├── stores/         ← State management (Zustand)
│   │   ├── hooks/          ← 115+ hooks React
│   │   ├── types/          ← 55 fichiers de types
│   │   ├── utils/          ← 91 utilitaires
│   │   └── sequence-editor/← Éditeur de séquences
│   └── electron/           ← Configuration Electron
├── src/                    ← Backend Python
│   ├── llm/                ← Moteur LLM (20 fichiers)
│   ├── assistant/          ← Assistant IA (60 fichiers)
│   ├── api/                ← API REST (101 fichiers)
│   ├── wizard/             ← Wizards backend (37 fichiers)
│   └── video/              ← Moteur vidéo (11 fichiers)
└── backend/                ← Services backend supplémentaires
```

### 1.2 Stack Technologique

| Couche | Technologie |
|--------|-------------|
| **Frontend** | React 18 + TypeScript + Vite |
| **State** | Zustand (useAppStore, stores spécialisés) |
| **Desktop** | Electron |
| **Styling** | TailwindCSS + CSS Modules |
| **LLM** | Ollama (local) + OpenAI/Anthropic (API) |
| **Images** | ComfyUI (FLUX.2, SDXL, Stable Diffusion) |
| **Audio** | TTS (SAPI, Qwen3-TTS) |
| **Backend** | Python (FastAPI) |

---

## 🤖 2. État Actuel du LLM Assistant Chat

### 2.1 Composants du Chat

| Fichier | Lignes | État | Rôle |
|---------|--------|------|------|
| `LandingChatBox.tsx` | 1666 | ✅ Fonctionnel | Chat principal avec LLM, streaming, fallback |
| `ChatBox.tsx` | 389 | ⚠️ Basique | Chat legacy avec mock AI (generateAIResponse) |
| `ChatPanel.tsx` | 394 | ✅ Fonctionnel | Panel flottant draggable/resizable |
| `ChatToggleButton.tsx` | - | ✅ | Bouton toggle |
| `StoryCoreAssistant.tsx` | - | ✅ | Assistant contextuel |

### 2.2 Services Chat

| Service | État | Description |
|---------|------|-------------|
| `chatService.ts` (763 lignes) | ⚠️ Partiellement | ChatService avec intent analysis, mais ne **déclenche PAS** les créations réelles via les API |
| `llmService.ts` (1672 lignes) | ✅ Robuste | Service LLM complet : multi-provider, streaming, retry, error handling |
| `useChatService.ts` (140 lignes) | ⚠️ Limité | Hook qui dispatch les actions (addShot, updateShot, deleteShot) mais **pas de création de contenu** |

### 2.3 Analyse des Intents du Chat (chatService.ts)

Le `ChatService.analyzeIntent()` détecte ces types d'intentions :
- ✅ `createShots` → Crée des shots
- ✅ `modifyShot` → Modifie des shots
- ✅ `addTransition` → Ajoute des transitions
- ✅ `addAudio` → Ajoute de l'audio
- ✅ `addText` → Ajoute du texte
- ✅ `suggestAssets` → Suggère des assets
- ✅ `createProject` → Création de projet (parsing NLP)
- ✅ `createCharacter` → **IMPLÉMENTÉ** (ChatService + ContentCreationService + LLMResponseParser)
- ✅ `createLocation` → **IMPLÉMENTÉ** (ChatService + ContentCreationService + LLMResponseParser)
- ✅ `createObject` → **IMPLÉMENTÉ** (ChatService + ContentCreationService + LLMResponseParser)
- ✅ `createDialogue` → **IMPLÉMENTÉ** (ChatService + ContentCreationService + LLMResponseParser)
- ✅ `createScenario` → **IMPLÉMENTÉ** (ChatService + ContentCreationService + LLMResponseParser)
- ✅ `createStory` → **IMPLÉMENTÉ** (ChatService + ContentCreationService + LLMResponseParser)
- ✅ `createWorld` → **IMPLÉMENTÉ** (ChatService + ContentCreationService + LLMResponseParser)
- ✅ `generateImage` → **IMPLÉMENTÉ** (ChatService + ContentCreationService + GenerationOrchestrator)
- ✅ `generateAudio` → **IMPLÉMENTÉ** (ChatService + ContentCreationService + GenerationOrchestrator)
- ✅ `generateVideo` → **IMPLÉMENTÉ** (ChatService + ContentCreationService + GenerationOrchestrator)

### 2.4 Problème Principal du Chat

**Le chat LLM est maintenant un "créateur" en plus d'un "conseiller".**

Le `LandingChatBox` :
1. ✅ Envoie les messages au LLM (Ollama/OpenAI/Anthropic)
2. ✅ Reçoit des réponses textuelles
3. ✅ **PARSE** les réponses via `LLMResponseParser` pour en extraire des données structurées
4. ✅ **DÉCLENCHE** les services de création via `ContentCreationService`
5. ✅ Affiche des **boutons d'action contextuels** dans les messages assistant
6. ✅ Propose une **barre de création rapide** (Quick Create Bar)

→ Le **pont entre la réponse LLM et l'exécution des actions de création** est maintenant en place.

---

## 🏗️ 3. API de Création de Contenu - État Actuel

### 3.1 Création de Projets

| Composant | État | Description |
|-----------|------|-------------|
| `CreateProjectWizard.tsx` | ✅ | Wizard multi-étapes |
| `ProjectSetupWizardModal.tsx` | ✅ | Modal de configuration |
| `ChatService.executeProjectCreation()` | ✅ | Création via Electron API |
| `ChatService.createProjectAndNavigate()` | ✅ | Workflow complet |

**→ Fonctionnel via wizard ET chat (seul type de création connecté au chat).**

### 3.2 Création de Personnages

| Composant | État | Description |
|-----------|------|-------------|
| `aiCharacterService.ts` (828 lignes) | ✅ Service | Génération AI complète (apparence, personnalité, backstory) |
| `storyGenerationService.createCharacter()` | ✅ Service | Création via LLM |
| `CharacterWizardModal.tsx` | ✅ UI | Wizard de création |
| `components/wizard/character/` (18 fichiers) | ✅ UI | Composants de création |
| **Chat → Service** | ✅ | **Connecté via ContentCreationService** |

### 3.3 Création de Lieux (Locations)

| Composant | État | Description |
|-----------|------|-------------|
| `storyGenerationService.createLocation()` | ✅ Service | Création via LLM |
| `locationStore.ts` (20K) | ✅ Store | State management |
| `WorldWizardModal.tsx` | ✅ UI | Wizard monde/lieux |
| `components/wizard/world-builder/` (21 fichiers) | ✅ UI | Composants monde |
| **Chat → Service** | ✅ | **Connecté via ContentCreationService** |

### 3.4 Création d'Objets

| Composant | État | Description |
|-----------|------|-------------|
| `ObjectsAIService.ts` (537 lignes) | ✅ Service | Génération AI, analyse narrative, connections |
| `objectStore.ts` | ✅ Store | State management |
| `ObjectWizardModal.tsx` | ✅ UI | Wizard de création |
| `components/wizard/object/` (6 fichiers) | ✅ UI | Composants objets |
| **Chat → Service** | ✅ | **Connecté via ContentCreationService** |

### 3.5 Création de Dialogues

| Composant | État | Description |
|-----------|------|-------------|
| `dialogueService.ts` (631 lignes) | ✅ Service | Génération dialogues LLM, prompts image/vidéo, TTS |
| `DialogueWriterWizard.tsx` | ✅ UI | Wizard dialogues |
| `VoiceGenerationService.ts` | ✅ Service | Génération voix TTS |
| **Chat → Service** | ✅ | **Connecté via ContentCreationService** |

### 3.6 Création de Scénarios/Histoire

| Composant | État | Description |
|-----------|------|-------------|
| `storyGenerationService.ts` (702 lignes) | ✅ Service | Génération histoire complète, résumé, personnages, lieux |
| `storyMethodologies.ts` (37K) | ✅ Config | Méthodologies narratives |
| `StorytellerWizardModal.tsx` | ✅ UI | Wizard storyteller |
| `components/wizard/storyteller/` (11 fichiers) | ✅ UI | Composants storyteller |
| **Chat → Service** | ✅ | **Connecté via ContentCreationService** |

### 3.7 Création de Monde

| Composant | État | Description |
|-----------|------|-------------|
| `worldBuilderStore.ts` (6.7K) | ✅ Store | State management monde |
| `WorldWizardModal.tsx` | ✅ UI | Wizard monde |
| `components/wizard/world-builder/` (21 fichiers) | ✅ UI | Composants monde |
| `EnhancedLLMAssistant.tsx` | ✅ UI | Assistant LLM dans le wizard |
| **Chat → Service** | ✅ | **Connecté via ContentCreationService** |

---

## 🖼️ 4. Génération d'Images, Audio, Vidéo

### 4.1 Images

| Service | État |
|---------|------|
| `imageGenerationService.ts` | ✅ Workflows FLUX.2, SDXL, SD, Custom |
| `comfyuiService.ts` (35K) | ✅ Client ComfyUI robuste |
| `GenerationOrchestrator.ts` | ✅ Pipeline unifié image/vidéo/audio |

### 4.2 Audio / Voix

| Service | État |
|---------|------|
| `voiceGenerationService.ts` | ✅ TTS Service |
| `ttsService.ts` | ✅ Service TTS (SAPI, Qwen3-TTS) |
| `dialogueService.ts` | ✅ SAPI audio generation |

### 4.3 Vidéo

| Service | État |
|---------|------|
| `GenerationOrchestrator.generateVideo()` | ✅ Connecté au Chat |
| `R_AND_D_VIDEO_GENERATION.md` | 📋 Document de recherche |

---

## ✏️ 5. Édition d'Images (Module type Canva)

### 5.1 État Actuel

| Composant | État | Description |
|-----------|------|-------------|
| `GridEditorCanvas.tsx` | ✅ Existe | Éditeur de grille avec panneaux |
| `AnnotationTools.tsx` | ✅ Existe | Outils dessin (pen, line, rectangle, ellipse, text) |
| `AnnotationControls.tsx` | ✅ Existe | Contrôles UI (couleur, épaisseur, opacité) |
| `AnnotationRenderer.tsx` | ✅ Existe | Rendu des annotations |
| `ResponsiveGridEditor.tsx` | ✅ Existe | Éditeur responsive |
| `GridEditorPropertiesPanel.tsx` | ✅ Existe | Panel de propriétés |

### 5.2 Ce qui Manque pour le Module d'Édition d'Images

- ❌ **Activation contextuelle** : Les boutons d'édition ne s'affichent PAS automatiquement quand une image est générée
- ❌ **Intégration avec la génération** : Pas de pont entre `imageGenerationService` → `GridEditor`
- ❌ **Inpainting** : Pas de workflow d'inpainting dans ComfyUI
- ❌ **Modification directe avec souris/stylet** : Le système d'annotations existe mais n'est pas relié aux images générées
- ❌ **Texte graphique sur les shots** : Le `TextTypographyService` existe mais n'est pas intégré aux shots

---

## 🎯 6. Texte Graphique dans les Shots

### 6.1 État Actuel

| Composant | État | Description |
|-----------|------|-------------|
| `TextTypographyService.ts` (549 lignes) | ✅ Service | Animations texte, presets, easing |
| `TextTypographyTypes.ts` (11K) | ✅ Types | Types complets |
| `CaptionStylesService.ts` (11K) | ✅ Service | Styles de sous-titres |

### 6.2 Ce qui Manque

- ❌ **Composant d'overlay texte sur les shots** (TextOverlay dans les shots)
- ❌ **UI de positionnement drag & drop** du texte sur l'image
- ❌ **Rendu en temps réel** du texte sur les shots

---

## 🚀 7. PLAN D'IMPLÉMENTATION

### Phase 1 : Bouton de Création dans le Chat (PRIORITÉ HAUTE)

**Objectif :** Ajouter un bouton "Créer" dans le chat qui déclenche la création automatique quand le LLM ne produit pas ce qui est attendu.

#### 7.1 Créer `ContentCreationService.ts`

Service centralisé qui fait le pont entre le chat et TOUS les services de création :

```typescript
// Nouveau service : services/ContentCreationService.ts
export class ContentCreationService {
  // Auto-génère les données manquantes
  async createCharacter(partialData, worldContext): Character
  async createLocation(partialData, worldContext): Location  
  async createObject(partialData, worldContext): StoryObject
  async createDialogue(partialData, characters): DialogueScene
  async createStory(partialData, worldContext): Story
  async createWorld(partialData): World
  async createScenario(partialData): Scenario
  
  // Auto-fill des données manquantes via LLM
  async autoFillMissingData(entityType, partialData): CompleteData
}
```

#### 7.2 Ajouter les Boutons d'Action dans le Chat

Modifier `LandingChatBox.tsx` pour ajouter :
- Un bouton **"✨ Créer"** qui apparaît dans chaque message assistant
- Des boutons contextuels selon le type de contenu détecté dans la réponse
- Des boutons d'action rapide : `[Créer Personnage]` `[Créer Lieu]` `[Créer Objet]` etc.

#### 7.3 Parser Intelligent de Réponses LLM

Créer `LLMResponseParser.ts` qui analyse la réponse du LLM pour :
- Détecter les entités mentionnées (personnages, lieux, objets)
- Extraire les données structurées
- Proposer automatiquement les actions de création

### Phase 2 : Auto-Génération des Données Manquantes

**Objectif :** Quand l'utilisateur lance une création mais des champs sont vides, le système complète automatiquement.

- Si pas de nom → LLM génère un nom contextuel
- Si pas de description → LLM génère une description
- Si pas d'apparence → LLM génère l'apparence selon le contexte du monde
- Si pas d'image → ComfyUI génère l'image automatiquement

### Phase 3 : Génération Image/Audio/Vidéo depuis le Chat (✅ IMPLÉMENTÉ)

#### 3.1 Images
- ✅ Commande dans le chat : "Génère une image de [description]"
- ✅ Bouton "🖼️ Générer Image" dans le chat
- ✅ Intégration directe avec `imageGenerationService` et `comfyuiService` via `GenerationOrchestrator`

#### 3.2 Audio / Modification Vocale
- ✅ Commande : "Donne une voix à [personnage]"
- ✅ Bouton "🎤 Générer Voix" 
- ✅ Intégration avec `voiceGenerationService` et `ttsService` via `GenerationOrchestrator`

#### 3.3 Vidéo
- ✅ Intégration avec le pipeline vidéo ComfyUI
- ✅ Bouton "🎬 Générer Vidéo" via `ChatService` / `ContentCreationService`

### Phase 4 : Texte Graphique dans les Shots

- Créer `TextOverlayComponent.tsx` pour ajouter du texte sur les shots
- Drag & drop pour positionner le texte
- Utiliser `TextTypographyService` pour les animations
- Intégrer avec `CaptionStylesService` pour les styles

### Phase 5 : Module d'Édition d'Images (type Canva)

#### 5.1 Activation Contextuelle
- Quand une image est générée, afficher automatiquement les boutons d'édition
- Toolbar d'édition : [Modifier] [Annoter] [Texte] [Crop] [Filter]

#### 5.2 Rendre Opérationnel le Système d'Annotations
- Connecter `AnnotationTools` aux images générées
- Ajouter le support stylet/tablette graphique
- Ajouter l'inpainting via ComfyUI

---

## 📊 8. Résumé des Priorités

| # | Tâche | Priorité | Effort | Impact |
|---|-------|----------|--------|--------|
| 1 | Bouton "Créer" dans le chat | 🔴 Haute | Moyen | Élevé |
| 2 | ContentCreationService unifié | 🔴 Haute | Élevé | Très Élevé |
| 3 | Auto-génération données manquantes | 🔴 Haute | Moyen | Élevé |
| 4 | Connecter tous les services de création au chat | ✅ Fait | Élevé | Élevé |
| 5 | Génération image/audio depuis le chat | ✅ Fait | Moyen | Moyen |
| 6 | Texte graphique sur les shots | 🟡 Moyenne | Moyen | Moyen |
| 7 | Module édition d'images opérationnel | 🟠 Moyenne | Élevé | Élevé |
| 8 | Génération vidéo | 🟢 Basse | Très Élevé | Élevé |

---

## 🔗 9. Fichiers Clés à Modifier

### Chat / Assistant
- `creative-studio-ui/src/components/launcher/LandingChatBox.tsx` - Ajouter boutons de création
- `creative-studio-ui/src/services/chatService.ts` - Étendre les intents
- `creative-studio-ui/src/hooks/useChatService.ts` - Ajouter les handlers de création

### Nouveau Service de Création
- **CRÉER** `creative-studio-ui/src/services/ContentCreationService.ts`
- **CRÉER** `creative-studio-ui/src/services/LLMResponseParser.ts`

### Édition d'Images
- `creative-studio-ui/src/components/gridEditor/` - Connecter aux images générées
- **CRÉER** `creative-studio-ui/src/components/ImageEditorOverlay.tsx`

### Texte Graphique
- **CRÉER** `creative-studio-ui/src/components/shot/TextOverlay.tsx`
- Utiliser `creative-studio-ui/src/services/text-typography/TextTypographyService.ts`
