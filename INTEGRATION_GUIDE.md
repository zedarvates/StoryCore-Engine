# 🎬 StoryCore - Guide d'Intégration Complète

## 📚 Documentation Finale

Ce document montre comment utiliser **tous les composants** de StoryCore ensemble pour créer un pipeline vidéo complet.

---

## 🔗 Architecture d'Intégration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      STORYCORE PRODUCTION PIPELINE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  📝 SCRIPT/HISTOIRE                                                     │
│      │                                                                   │
│      ▼                                                                   │
│  🎭 1. DIALOGUE WIZARD                                                   │
│      │   • Génère dialogues avec personnages                             │
│      │   • Tons: Dramatic, Natural, Comedic                             │
│      │   • Sous-textes et émotions                                       │
│      │                                                                   │
│      ▼                                                                   │
│  🔊 2. QWEN3 TTS                                                         │
│      │   • Synthèse vocale multilingue                                  │
│      │   • Clonage de voix                                              │
│      │   • Contrôle émotion                                              │
│      │                                                                   │
│      ▼                                                                   │
│  🎚️ 3. AUDIO ENHANCEMENT                                                 │
│      │   • Noise reduction                                               │
│      │   • EQ, compression, reverb                                       │
│      │   • Génération musique par mood                                   │
│      │                                                                   │
│      ▼                                                                   │
│  🎭 4. LIP SYNC (ADDON)                                                  │
│      │   • Wav2Lip pour sync lèvres                                     │
│      │   • GFPGAN enhancement                                           │
│      │   • Presets: Default, High Quality, Fast                        │
│      │                                                                   │
│      ▼                                                                   │
│  🎬 5. PLAN SEQUENCES (ADDON)                                            │
│      │   • Planification shots                                           │
│      │   • Synchronisation audio/video                                   │
│      │   • Durée et timing                                               │
│      │                                                                   │
│      ▼                                                                   │
│  🎨 6. COMFYUI WORKFLOWS                                                 │
│      │   • Image generation (Flux, SDXL)                                │
│      │   • Video generation (HunyuanVideo, Wan)                          │
│      │   • Video-to-Video ControlNet                                     │
│      │                                                                   │
│      ▼                                                                   │
│  🎬 7. VIDEO ENGINE                                                      │
│      │   • Interpolation de frames                                       │
│      │   • Camera movements                                             │
│      │   • Timeline management                                           │
│      │                                                                   │
│      ▼                                                                   │
│  📦 EXPORT FINAL                                                          │
│      • MP4                                                               │
│      • Qualité au choix                                                  │
│      • Métadonnées intégrées                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Démarrage Rapide

### 1. Installation Complète

```bash
# Cloner le repository
git clone https://github.com/storycore/engine.git
cd storycore-engine

# Installer dépendances Python
pip install -r requirements.txt

# Installer dépendances Node.js
npm install

# Télécharger modèles ComfyUI
python scripts/download_comfyui_models.py
```

### 2. Lancer les Services

```bash
# Terminal 1: ComfyUI
cd comfyui_portable
python main.py --port 8188

# Terminal 2: API Backend
python backend/main_api.py

# Terminal 3: UI Development
npm run dev
```

### 3. Ouvrir StoryCore Studio

```
http://localhost:5173
```

---

## 📖 Utilisation du Pipeline

### Phase 1: Créer les Dialogues

```python
# src/wizard/dialogue_wizard.py
from src.wizard.dialogue_wizard import (
    DialogueWizard,
    DialoguePurpose,
    DialogueTone
)

# Créer le wizard
wizard = DialogueWizard()

# Générer une scène de dialogue
scene = wizard.generate_dialogue_scene(
    scene_concept="Une conversation tendue dans un bureau",
    characters=["Alice", "Bob"],
    purpose=DialoguePurpose.CONFLICT,
    tone=DialogueTone.INTENSE,
    target_length=10  # ~40 secondes de dialogue
)

print(f"Scène: {scene.title}")
print(f"Durée estimée: {scene.duration_estimate}s")
print(f"Nombre de lignes: {len(scene.dialogue_lines)}")

# Afficher les dialogues
for line in scene.dialogue_lines:
    print(f"[{line.character}] {line.text}")
```

### Phase 2: Convertir en Audio

```python
# src/qwen3_tts_integration.py
from src.qwen3_tts_integration import Qwen3TTSIntegration

# Initialiser TTS
tts = Qwen3TTSIntegration(model_name="qwen3-tts-1.7b")

# Générer audio pour chaque ligne
audio_files = []
for i, line in enumerate(scene.dialogue_lines):
    output_path = f"output/audio/dialogue_{i:03d}.wav"
    
    # Déterminer voix selon personnage
    voice_type = "female" if line.character == "Alice" else "male"
    
    # Générer audio
    success = tts.generate_voice(
        text=line.text,
        output_path=output_path,
        voice_params={
            "voice_type": voice_type,
            "emotion": line.emotional_state,
            "language": "fr"
        }
    )
    
    if success:
        audio_files.append(output_path)
        print(f"✓ Généré: {output_path}")
```

### Phase 3: Enhancement Audio

```python
# src/ai_audio_enhancement_engine.py
from src.ai_audio_enhancement_engine import (
    AIAudioEnhancementEngine,
    AudioEnhancementRequest,
    AudioMood,
    AudioEnhancementType
)

# Initialiser le moteur
engine = AIAudioEnhancementEngine(config)

# Enhancer chaque fichier audio
enhanced_files = []
for audio_file in audio_files:
    request = AudioEnhancementRequest(
        audio_id=audio_file,
        target_mood=AudioMood.DRAMATIC,
        enhancement_types=[
            AudioEnhancementType.NOISE_REDUCTION,
            AudioEnhancementType.VOICE_ENHANCEMENT,
            AudioEnhancementType.COMPRESSION
        ],
        quality_level=AudioQuality.HIGH
    )
    
    result = await engine.enhance_audio(request)
    enhanced_files.append(result.output_path)
```

### Phase 4: Lip Sync (Addon UI)

```typescript
// creative-studio-ui/src/addons/lip-sync/LipSyncAddon.tsx
import { LipSyncAddon } from './lip-sync';

// Dans l'UI
const LipSyncPanel = () => {
  return <LipSyncAddon />;
};
```

API:
```bash
# Démarrer un job lip sync
POST /api/v1/lip-sync/execute
{
  "character_image": "input/character_face.png",
  "dialogue_audio": "output/audio/dialogue_001.wav",
  "preset": "high-quality",
  "enhancer": true
}

# Vérifier le statut
GET /api/v1/lip-sync/status/{job_id}
```

### Phase 5: Planification Séquences

```typescript
// creative-studio-ui/src/addons/plan-sequences/PlanSequencesManager.ts
import { PlanSequencesManager } from './plan-sequences';

const manager = new PlanSequencesManager();

// Créer une séquence
const sequence = manager.createSequence("Scène 1 - Bureau");

// Ajouter un shot avec dialogue
sequence.addShot({
  id: "shot_001",
  dialogue: "dialogue_001.wav",  // Audio de Qwen3 TTS
  lipSync: "lip_sync_001.mp4",   // Résultat Lip Sync
  duration: 5.0,
  camera: {
    movement: "pan_left",
    start: { x: 0, y: 0 },
    end: { x: 100, y: 0 }
  },
  emotionalImpact: "dramatic"
});

// Exporter pour timeline
sequence.exportToTimeline();
```

### Phase 6: Génération Vidéo ComfyUI

```bash
# Utiliser le workflow HunyuanVideo
POST /api/v1/comfyui/execute
{
  "workflow": "hunyuan_video_t2v",
  "prompt": "Cinematic shot of two characters talking in an office",
  "num_frames": 121,
  "fps": 24
}

# Ou Video-to-Video ControlNet
POST /api/v1/comfyui/execute
{
  "workflow": "video_to_video",
  "source_video": "input/scene.mp4",
  "prompt": "cinematic lighting, dramatic atmosphere",
  "controlnet": "openpose"
}
```

### Phase 7: Video Engine

```python
# src/video_engine.py
from src.video_engine import VideoEngine, VideoConfig

# Initialiser le moteur
config = VideoConfig(
    frame_rate=24,
    resolution=(1920, 1080),
    quality="high"
)

engine = VideoEngine(config)

# Charger le projet
engine.load_project("projects/mon_projet")

# Générer séquences pour tous les shots
results = engine.generate_all_sequences()

# Obtenir timeline metadata
timeline = engine.get_timeline_metadata()
print(f"Durée totale: {timeline['total_duration']}s")
print(f"Total frames: {timeline['total_frames']}")
```

---

## 🔧 Configuration

### Structure du Projet

```
projects/
└── mon_projet/
    ├── project.json           # Métadonnées du projet
    ├── storyboard_visual.json  # Storyboard visuel
    ├── scene_breakdown.json   # Découpage scènes
    ├── puppet_layers/         # Layers puppets
    ├── assets/
    │   ├── images/
    │   │   ├── generated/     # Images générées
    │   │   ├── grids/         # Grilles cohérence
    │   │   └── panels/        # Panels découpés
    │   ├── audio/
    │   │   ├── dialogues/     # Audio dialogues
    │   │   ├── enhanced/      # Audio enhanced
    │   │   └── music/         # Musique générée
    │   └── video/
    │       ├── sequences/     # Séquences vidéo
    │       └── final/         # Export final
    └── exports/               # Fichiers exportés
```

### Fichier project.json

```json
{
  "project_id": "mon_projet",
  "title": "Mon Film",
  "schema_version": "1.0",
  "created_at": "2026-01-15T10:00:00Z",
  "settings": {
    "resolution": "1920x1080",
    "frame_rate": 24,
    "quality": "high"
  },
  "pipeline": {
    "dialogue": "complete",
    "audio": "complete",
    "lip_sync": "pending",
    "video_generation": "pending",
    "timeline": "pending"
  },
  "characters": [
    {
      "id": "alice",
      "name": "Alice",
      "voice_type": "female",
      "face_image": "assets/images/faces/alice.png"
    }
  ],
  "sequences": []
}
```

---

## 📋 Checklist de Production

### Pré-Production ✅
- [ ] Script/Histoire écrit
- [ ] Découpage en scènes
- [ ] Fiche de cohérence créée

### Production Audio ✅
- [ ] Dialogues générés (Dialogue Wizard)
- [ ] Audio voix (Qwen3 TTS)
- [ ] Enhancement audio
- [ ] Musique de fond

### Production Vidéo ⏳
- [ ] Lip Sync appliqué
- [ ] Images clés générées
- [ ] Séquences vidéo créées
- [ ] Transitions ajoutées

### Post-Production ⏳
- [ ] Timeline assemblée
- [ ] Audio sync
- [ ] Export final
- [ ] Validation qualité

---

## 🎯 Commandes Utiles

```bash
# Générer grille de cohérence
python -m src.grid_generator --project mon_projet --grid 3x3

# Lancer le pipeline complet
python storycore.py promote --project mon_projet

# Générer vidéo depuis storyboard
python -m src.video_engine --project mon_projet

# Vérifier la cohérence
python -m src.quality_validator --project mon_projet

# Exporter le projet
python -m src.export_manager --project mon_projet --format mp4
```

---

## 🔗 Liens Rapides

| Ressource | Emplacement |
|-----------|-------------|
| README principal | `README.md` |
| Analyse concurrentielle | `COMPETITOR_VIDEO_AI_ANALYSIS.md` |
| Plan d'implémentation | `IMPLEMENTATION_PLAN_COMFYUI.md` |
| Guide API | `docs/API_REFERENCE.md` |
| Documentation wizards | `docs/WIZARDS.md` |

---

*Document généré pour StoryCore Engine - Janvier 2026*

