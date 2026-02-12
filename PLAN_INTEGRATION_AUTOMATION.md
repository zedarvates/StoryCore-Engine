# Plan d'Intégration - Système d'Automation StoryCore Engine

## Vue d'Ensemble

Ce document décrit le plan d'intégration pour le système d'automation complet incluant:
- Dialogue Automation
- Character Image Grid (2x2, 3x3)
- Location Image Grid (2x2)
- Advanced Prompts
- Video Generation
- ControlNet Pipeline

## Architecture Actuelle

### Structure du Projet
```
storycore-engine/
├── backend/                    # FastAPI backend
│   ├── feedback_proxy.py       # Main FastAPI app
│   ├── github_api.py           # GitHub integration
│   ├── rate_limiter.py         # Rate limiting
│   └── ...
├── creative-studio-ui/         # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── character/      # Character components
│   │   │   ├── dialogue/       # Dialogue components
│   │   │   └── location/       # [N'EXISTE PAS]
│   │   ├── services/
│   │   │   ├── dialogueService.ts
│   │   │   └── aiCharacterService.ts
│   │   └── ...
│   └── ...
└── src/                        # Core Python modules
    ├── ai_character_engine/
    ├── audio_mixing_engine.py
    └── ...
```

## Phase 1: Création des Modules Python d'Automation

### Fichiers à Créer

#### 1.1 `src/automation/__init__.py`
Package d'automation pour centraliser tous les modules.

#### 1.2 `src/automation/dialogue.py`
Module de génération de dialogues basé sur la personnalité.

**Classes principales:**
- `Character` - Personnage avec personnalité
- `DialogueContext` - Contexte de scène (lieu, moment, situation)
- `DialogueLine` - Ligne de dialogue
- `DialogueScene` - Scène complète
- `DialogueGenerator` - Moteur de génération

**Intégration avec:**
- `creative-studio-ui/src/services/dialogueService.ts` (existant)

#### 1.3 `src/automation/character_images.py`
Module de génération d'images personnages avec grille.

**Classes principales:**
- `GridSize` - Enum: GRID_2X2, GRID_3X3
- `CharacterView` - Vue individuelle
- `CharacterAssetBundle` - Bundle complet
- `CharacterImageGenerator` - Générateur principal

**Fonctionnalités:**
- Grilles 2x2 (4 images) et 3x3 (9 images)
- Tenues: casual, formal, combat, armor, robe
- Poses: standing, walking, sitting, fighting, casting
- Expressions: neutral, happy, angry, sad, surprised

**Intégration avec:**
- `creative-studio-ui/src/services/aiCharacterService.ts` (existant)

#### 1.4 `src/automation/location_images.py`
Module de génération d'images de lieux avec grille 2x2.

**Classes principales:**
- `LocationType` - Enum: EXTERIOR, INTERIOR
- `LocationCategory` - Enum: city, village, forest, castle_exterior, etc.
- `LocationView` - Vue individuelle (N, S, E, W)
- `LocationAssetBundle` - Bundle complet
- `LocationImageGenerator` - Générateur principal

**Fonctionnalités:**
- Grille 2x2 avec 4 angles: Nord, Sud, Est, Ouest
- Extérieurs: city, village, forest, mountain, beach, desert, castle_exterior, ruins
- Intérieurs: room, hall, throne_room, tavern, library, cave, dungeon, castle_interior

#### 1.5 `src/automation/advanced_prompts.py`
Système de prompts avancés pour ComfyUI.

**Classes principales:**
- `PromptStyle` - Enum: REALISTIC, ANIME, FANTASY, OIL_PAINTING, etc.
- `LightingType` - Enum: CINEMATIC, GOLDEN_HOUR, BLUE_HOUR, etc.
- `CameraAngle` - Enum: WIDE_SHOT, MEDIUM_SHOT, CLOSE_UP, etc.
- `MoodType` - Enum: PEACEFUL, TENSE, EPIC, MYSTERIOUS, etc.
- `QualityTier` - Enum: LOW, MEDIUM, HIGH, ULTRA
- `AdvancedPromptGenerator` - Générateur de prompts

#### 1.6 `src/automation/video_generation.py`
Module de génération vidéo avec SVD et AnimateDiff.

**Classes principales:**
- `VideoModel` - Enum: SVD, SVD_XT, ANIMEDIFF_V3
- `VideoDuration` - Enum: SHORT, MEDIUM, LONG
- `MotionType` - Enum: IDLE, WALK, RUN, FIGHT, CAST_SPELL
- `VideoGenerator` - Générateur principal
- `CharacterAnimation` - Animation de personnage
- `VideoProject` - Projet vidéo complet

#### 1.7 `src/automation/controlnet_pipeline.py`
Pipeline ControlNet pour cohérence visuelle.

**Classes principales:**
- `ControlNetType` - Enum: CANNY, DEPTH, OPENPOSE, NORMAL, etc.
- `ControlMode` - Enum: LOW, MEDIUM, HIGH, MAXIMUM
- `ControlNetPipeline` - Pipeline principal
- `ConsistencySet` - Set d'images cohérentes

#### 1.8 `src/automation/comfyui_integration.py`
Intégration avec ComfyUI pour génération d'images.

**Classes principales:**
- `ComfyUIClient` - Client API ComfyUI
- `WorkflowBuilder` - Constructeur de workflows
- `GenerationJob` - Job de génération

## Phase 2: Backend API - Endpoints FastAPI

### Fichiers à Modifier

#### 2.1 `backend/automation_routes.py` (Nouveau)
Router FastAPI pour les endpoints d'automation.

**Endpoints à ajouter:**

```python
# Dialogue
POST /api/automation/dialogue/generate
  Body: { characters: Character[], context: DialogueContext }
  Response: { lines: DialogueLine[], scene_id: string }

# Character Images
POST /api/automation/character/images/generate
  Body: { character_id: string, character_name: string, grid_size: "2x2" | "3x3", outfits: string[], poses: string[] }
  Response: { bundle: CharacterAssetBundle, job_id: string }

GET /api/automation/character/images/status/{job_id}
  Response: { status: "pending" | "processing" | "completed" | "failed", progress: number, urls: string[] }

# Location Images
POST /api/automation/location/images/generate
  Body: { location_id: string, location_name: string, location_type: "exterior" | "interior", category: string }
  Response: { bundle: LocationAssetBundle, job_id: string }

GET /api/automation/location/images/status/{job_id}
  Response: { status: "pending" | "processing" | "completed" | "failed", progress: number, urls: string[] }

# Advanced Prompts
POST /api/automation/prompts/generate
  Body: { subject: string, style: string, lighting: string, camera: string, mood: string }
  Response: { prompt: string, negative_prompt: string, consistency_tags: string[] }

# Video Generation
POST /api/automation/video/generate
  Body: { image_path: string, motion_type: string, duration: string }
  Response: { video_path: string, job_id: string }

# ControlNet
POST /api/automation/controlnet/generate
  Body: { prompt: string, control_type: string, reference_image: string, mode: string }
  Response: { image_path: string, control_image: string }
```

#### 2.2 `backend/feedback_proxy.py` (Modifier)
Ajouter le router d'automation à l'application FastAPI principale.

```python
from backend.automation_routes import router as automation_router

app.include_router(automation_router, prefix="/api/automation")
```

## Phase 3: Frontend React - Composants UI

### Fichiers à Créer

#### 3.1 `creative-studio-ui/src/components/dialogue/DialoguePanel.tsx` (Nouveau)
Panneau de génération de dialogues.

**Fonctionnalités:**
- Sélection des personnages
- Configuration du contexte (lieu, moment, situation, humeur)
- Bouton de génération
- Affichage des dialogues générés
- Export JSON

**Props:**
```typescript
interface DialoguePanelProps {
  characters: Character[];
  onDialogueGenerated: (scene: DialogueScene) => void;
  projectId: string;
}
```

#### 3.2 `creative-studio-ui/src/components/character/CharacterImageGenerator.tsx` (Nouveau)
Générateur d'images de personnages.

**Fonctionnalités:**
- Sélection de la taille de grille (2x2 ou 3x3)
- Sélection des tenues
- Sélection des poses
- Sélection des expressions
- Grille de prévisualisation
- Boutons de génération par vue
- Affichage du statut de génération

**Props:**
```typescript
interface CharacterImageGeneratorProps {
  characterId: string;
  characterName: string;
  onImagesGenerated: (bundle: CharacterAssetBundle) => void;
}
```

#### 3.3 `creative-studio-ui/src/components/location/LocationImageGenerator.tsx` (Nouveau)
Générateur d'images de lieux.

**Fonctionnalités:**
- Sélection du type (extérieur/intérieur)
- Sélection de la catégorie
- Grille 2x2 des 4 vues (N, S, E, W)
- Génération par vue
- Prévisualisation
- Gestion des variations temporelles (day, night, sunset, etc.)

**Props:**
```typescript
interface LocationImageGeneratorProps {
  locationId: string;
  locationName: string;
  onImagesGenerated: (bundle: LocationAssetBundle) => void;
}
```

#### 3.4 `creative-studio-ui/src/components/automation/AdvancedPromptPanel.tsx` (Nouveau)
Panneau de génération de prompts avancés.

**Fonctionnalités:**
- Sélection du style
- Sélection de l'éclairage
- Sélection de l'angle caméra
- Sélection de l'humeur
- Sélection du niveau de qualité
- Prévisualisation du prompt généré

#### 3.5 `creative-studio-ui/src/components/automation/VideoGeneratorPanel.tsx` (Nouveau)
Panneau de génération vidéo.

**Fonctionnalités:**
- Upload d'image source
- Sélection du type de motion
- Sélection de la durée
- Prévisualisation de la vidéo

#### 3.6 `creative-studio-ui/src/components/automation/AutomationDashboard.tsx` (Nouveau)
Dashboard central pour toutes les automations.

**Fonctionnalités:**
- Vue d'ensemble des jobs en cours
- Historique des générations
- Accès rapide aux différents générateurs
- Statistiques d'utilisation

### Fichiers à Modifier

#### 3.7 `creative-studio-ui/src/services/automationService.ts` (Nouveau)
Service API pour communiquer avec le backend d'automation.

```typescript
class AutomationService {
  // Dialogue
  async generateDialogue(characters: Character[], context: DialogueContext): Promise<DialogueScene>;
  
  // Character Images
  async generateCharacterImages(config: CharacterImageConfig): Promise<GenerationJob>;
  async getCharacterImageStatus(jobId: string): Promise<JobStatus>;
  
  // Location Images
  async generateLocationImages(config: LocationImageConfig): Promise<GenerationJob>;
  async getLocationImageStatus(jobId: string): Promise<JobStatus>;
  
  // Prompts
  async generatePrompt(params: PromptParams): Promise<GeneratedPrompt>;
  
  // Video
  async generateVideo(config: VideoConfig): Promise<GenerationJob>;
  
  // ControlNet
  async generateWithControlNet(config: ControlNetConfig): Promise<GenerationResult>;
}
```

#### 3.8 `creative-studio-ui/src/App.tsx` ou `router.tsx` (Modifier)
Ajouter les routes pour les nouveaux composants.

## Phase 4: Intégration avec le Storyteller Wizard

### 4.1 Extension du Wizard

Modifier le Storyteller Wizard pour intégrer les nouvelles fonctionnalités:

**Étape 1: Sélection d'éléments existants**
- Afficher les lieux existants
- Afficher les personnages existants
- Afficher les objets existants
- Permettre la sélection multiple

**Étape 2: Création de nouveaux éléments**
- Bouton "Créer un nouveau lieu" → Ouvre LocationImageGenerator
- Bouton "Créer un nouveau personnage" → Ouvre CharacterImageGenerator
- Bouton "Créer un nouvel objet" → Formulaire de création

**Étape 3: Génération de l'histoire**
- Utiliser tous les éléments sélectionnés/créés
- Générer l'histoire avec le LLM
- Permettre au LLM de créer de nouveaux éléments si nécessaire

**Étape 4: Récapitulatif**
- Afficher tous les lieux utilisés
- Afficher tous les personnages impliqués
- Afficher tous les objets présents
- Indiquer les éléments créés automatiquement

### 4.2 Fichiers à Modifier

- `creative-studio-ui/src/components/wizard/StorytellerWizard.tsx` (existant ou nouveau)
- `creative-studio-ui/src/services/aiWizardService.ts` (existant)

## Phase 5: Assets et Stockage

### Structure des Assets Générés

```
assets/
├── characters/
│   ├── {character_id}/
│   │   ├── {character_id}_grid_2x2.png
│   │   ├── {character_id}_grid_0.png
│   │   ├── {character_id}_grid_1.png
│   │   ├── {character_id}_grid_2.png
│   │   ├── {character_id}_grid_3.png
│   │   └── {character_id}_grid.json
│   └── reference_banks/
│       └── all_characters.json
├── locations/
│   ├── {location_id}/
│   │   ├── {location_id}_grid_2x2.png
│   │   ├── {location_id}_north.png
│   │   ├── {location_id}_south.png
│   │   ├── {location_id}_east.png
│   │   ├── {location_id}_west.png
│   │   └── {location_id}_grid.json
│   └── reference_banks/
│       └── all_locations.json
├── dialogues/
│   └── {scene_id}.json
└── videos/
    └── {video_id}.mp4
```

## Phase 6: Tests et Validation

### Tests Unitaires

#### Python
- `tests/automation/test_dialogue.py`
- `tests/automation/test_character_images.py`
- `tests/automation/test_location_images.py`
- `tests/automation/test_advanced_prompts.py`
- `tests/automation/test_video_generation.py`
- `tests/automation/test_controlnet_pipeline.py`

#### TypeScript/React
- `creative-studio-ui/src/components/dialogue/__tests__/DialoguePanel.test.tsx`
- `creative-studio-ui/src/components/character/__tests__/CharacterImageGenerator.test.tsx`
- `creative-studio-ui/src/components/location/__tests__/LocationImageGenerator.test.tsx`

### Tests d'Intégration
- `tests/integration/test_automation_api.py`
- `tests/integration/test_comfyui_integration.py`

## Phase 7: Documentation

### Fichiers à Créer

- `docs/AUTOMATION_SYSTEM.md` - Documentation complète du système
- `docs/AUTOMATION_API.md` - Référence API
- `docs/AUTOMATION_UI_GUIDE.md` - Guide d'utilisation de l'UI
- `examples/automation/dialogue_example.py`
- `examples/automation/character_images_example.py`
- `examples/automation/location_images_example.py`

## Plan d'Implémentation

### Priorité 1 (Core)
1. Créer `src/automation/dialogue.py`
2. Créer `src/automation/character_images.py`
3. Créer `src/automation/location_images.py`
4. Créer `backend/automation_routes.py`
5. Créer `creative-studio-ui/src/services/automationService.ts`

### Priorité 2 (UI)
6. Créer `creative-studio-ui/src/components/dialogue/DialoguePanel.tsx`
7. Créer `creative-studio-ui/src/components/character/CharacterImageGenerator.tsx`
8. Créer `creative-studio-ui/src/components/location/LocationImageGenerator.tsx`

### Priorité 3 (Avancé)
9. Créer `src/automation/advanced_prompts.py`
10. Créer `src/automation/video_generation.py`
11. Créer `src/automation/controlnet_pipeline.py`
12. Créer composants UI avancés

### Priorité 4 (Intégration)
13. Intégrer au Storyteller Wizard
14. Tests et validation
15. Documentation

## Dépendances

### Python
```
fastapi>=0.100.0
pydantic>=2.0.0
httpx>=0.24.0
pillow>=10.0.0
numpy>=1.24.0
```

### TypeScript/React
```
# Déjà présentes dans le projet
react
react-dom
axios
zustand
@tanstack/react-query
```

## Notes Importantes

1. **ComfyUI Integration**: Le système nécessite une instance ComfyUI en cours d'exécution. Les workflows JSON doivent être générés et envoyés via l'API ComfyUI.

2. **Async Jobs**: La génération d'images/vidéos est asynchrone. Utiliser un système de jobs avec polling ou WebSockets pour le suivi.

3. **Rate Limiting**: Implémenter le rate limiting sur les endpoints d'automation pour éviter la surcharge de ComfyUI.

4. **Caching**: Mettre en cache les prompts générés et les images dans `asset_cache/`.

5. **Error Handling**: Gérer les erreurs de génération (ComfyUI non disponible, modèle manquant, etc.).
