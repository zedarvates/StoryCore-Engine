# 📊 Analyse Complète: Seedance 2.0, Kling 3.0, Veo 3.1, Sora 2 vs StoryCore Engine

## 🎯 Objectif
Analyser les capacités de **Seedance 2.0**, **Kling 3.0**, **Veo 3.1**, et **Sora 2** pour identifier:
1. Ce que notre solution ne peut PAS faire
2. Ce qui existe déjà dans StoryCore (souvent ignoré!)
3. Les solutions ComfyUI pour combler les lacunes

---

## 🎬 ÉTAT ACTUEL DE STORYCORE (Souvent sous-estimé!)

### ✅ **INFRASTRUCTURE AUDIO EXISTANTE (PRÊTE À UTILISER)**

#### 1. **Dialogue Wizard** (`src/wizard/dialogue_wizard.py`)
```python
# CRÉATION DE DIALOGUES AUTOMATIQUE
wizard = DialogueWizard()
scene = wizard.generate_dialogue_scene(
    scene_concept="Discussion tendue dans un bureau",
    characters=["Alice", "Bob"],
    purpose=DialoguePurpose.CONFLICT,
    tone=DialogueTone.INTENSE,
    target_length=10
)
```
**Fonctionnalités:**
- ✅ Génération de scènes de dialogue complètes
- ✅ Personnages avec voix personnalisées
- ✅ Tons: Natural, Dramatic, Comedic, Intense, Subtle
- ✅ Sous-textes et actions décrites
- ✅ Adaptateur de voix par personnage

#### 2. **Qwen3 TTS Integration** (`src/qwen3_tts_integration.py`)
```python
# GÉNÉRATION DE VOIX
tts = Qwen3TTSIntegration(model_name="qwen3-tts-1.7b")
tts.generate_voice(
    text="Bonjour, comment allez-vous?",
    output_path="dialogue_001.wav",
    voice_params={"voice_type": "female", "emotion": "happy"}
)
```
**Fonctionnalités:**
- ✅ Génération de voix multilingue
- ✅ Clonage de voix (voice cloning)
- ✅ Prompts optimisés par émotion/type
- ✅ Support GPU

#### 3. **AI Audio Enhancement Engine** (`src/ai_audio_enhancement_engine.py`)
```python
# ENHANCEMENT AUDIO
engine = AIAudioEnhancementEngine(config)
await engine.enhance_audio(
    AudioEnhancementRequest(
        audio_id="dialogue_001",
        target_mood=AudioMood.DRAMATIC,
        enhancement_types=[
            AudioEnhancementType.NOISE_REDUCTION,
            AudioEnhancementType.VOICE_ENHANCEMENT
        ]
    )
)
```
**Fonctionnalités:**
- ✅ Réduction de bruit
- ✅ Enhancement voix
- ✅ Égalisation, compression, reverb
- ✅ Génération de musique par mood
- ✅ Mixing professionnel

#### 4. **Plan Sequences Addon** (`creative-studio-ui/src/addons/plan-sequences/`)
```typescript
// PLANIFICATION DE SÉQUENCES
const manager = new PlanSequencesManager();
const sequence = manager.createSequence("Séquence 1");
sequence.addShot({
    id: "shot_001",
    dialogue: "Dialogue généré...",
    duration: 5.0,
    emotional_impact: "dramatic"
});
```

---

## 🎯 PIPELINE DIALOGUE → AUDIO (DÉJÀ IMPLEMENTÉ!)

```
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW AUDIO STORYCORE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📝 Script/Histoire                                              │
│      ↓                                                          │
│  🎭 DialogueWizard → Scène de dialogue complète                  │
│      ↓                                                          │
│  🔊 Qwen3 TTS → Fichier audio (voix)                          │
│      ↓                                                          │
│  🎚️ Audio Enhancement → Nettoyage, EQ, Compression             │
│      ↓                                                          │
│  🎬 Timeline → Synchronisation avec plan-séquences             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚨 **Gap Analysis: Ce que StoryCore NE PEUT PAS faire (ou moins bien)**

### 1. **Génération Audio Intégrée (Style Veo 3.1)**
- **Veo 3.1:** Génère audio + vidéo en même temps
- **StoryCore:** Pipeline séparé (script → TTS → audio)
- **Solution:** Workflow existant! Utiliser le pipeline:

```python
# Script complet pour générer audio d'un dialogue
def generate_scene_audio(scene_concept, characters, shot_duration):
    # 1. Générer le dialogue
    wizard = DialogueWizard()
    scene = wizard.generate_dialogue_scene(
        scene_concept=scene_concept,
        characters=characters,
        purpose=DialoguePurpose.DIALOGUE,
        tone=DialogueTone.NATURAL,
        target_length=int(shot_duration / 4)  # ~4s par ligne
    )
    
    # 2. Générer audio par ligne
    tts = Qwen3TTSIntegration()
    audio_files = []
    for i, line in enumerate(scene.dialogue_lines):
        output = f"dialogue_{i:03d}.wav"
        tts.generate_voice(
            text=line.text,
            output_path=output,
            voice_params={
                "voice_type": "female" if "Alice" in line.character else "male",
                "emotion": line.emotional_state
            }
        )
        audio_files.append(output)
    
    # 3. Enhancement audio
    engine = AIAudioEnhancementEngine(config)
    enhanced_files = []
    for audio in audio_files:
        result = await engine.enhance_audio(...)
        enhanced_files.append(result)
    
    return enhanced_files
```

### 2. **Lip Sync Automatique**
- **Kling 3.0:** Lip sync intégré sur personnages
- **StoryCore:** Pas de moteur lip sync natif
- **Solution ComfyUI:** Utiliser **Wav2Lip** ou **SadTalker**

#### 🎯 **Workflow ComfyUI pour Lip Sync:**
```json
{
  "nodes": [
    {
      "class_type": "Wav2Lip",
      "inputs": {
        "face_image": "INPUT_IMAGE",
        "audio_file": "AUDIO_FILE",
        "pads": "0 0 0 0",
        "nosmooth": false,
        "enhancer": true
      }
    },
    {
      "class_type": "FaceEnhance",
      "inputs": {
        "image": ["Wav2Lip", 0],
        "model": "GFPGAN"
      }
    }
  ]
}
```

### 3. **Video-to-Video (V2V)**
- **Kling 3.0 / Sora 2:** Modifier vidéo existante avec prompts
- **StoryCore:** Pas de V2V natif
- **Solution ComfyUI:** **Inpainting + ControlNet**

#### 🎯 **Workflow ComfyUI pour V2V:**
```json
{
  "nodes": [
    {
      "class_type": "LoadVideo",
      "inputs": {
        "video": "INPUT_VIDEO",
        "frame_load_cap": 30,
        "skip_first_frames": 0
      }
    },
    {
      "class_type": "VideoInpaint",
      "inputs": {
        "video": ["LoadVideo", 0],
        "mask": "SEGMENTATION_MASK",
        "inpaint_strength": 0.8
      }
    },
    {
      "class_type": "ControlNetApply",
      "inputs": {
        "image": ["VideoInpaint", 0],
        "control_net": "openpose",
        "strength": 0.7
      }
    },
    {
      "class_type": "KSampler",
      "inputs": {
        "model": "sd_xl_base",
        "positive": "PROMPT_MODIFICATION",
        "negative": "NEGATIVE_PROMPT",
        "image": ["ControlNetApply", 0]
      }
    }
  ]
}
```

### 4. **Simulation Physique Avancée**
- **Sora 2:** Fluides, tissus, particules réalistes
- **StoryCore:** Interpolation basique
- **Solution ComfyUI:** **AnimateDiff + Physics Modules**

#### 🎯 **Workflow ComfyUI pour Simulation Physique:**
```json
{
  "nodes": [
    {
      "class_type": "AnimateDiffLoader",
      "inputs": {
        "model": "animatediff_xl",
        "motion_module": "mm_sd_xl_v10_beta"
      }
    },
    {
      "class_type": "PhysicsCloth",
      "inputs": {
        "model": ["AnimateDiffLoader", 0],
        "cloth_type": "silk",
        "gravity": 9.8,
        "damping": 0.99
      }
    },
    {
      "class_type": "FlowControlNet",
      "inputs": {
        "image": ["PhysicsCloth", 0],
        "flow_model": "sintel",
        "strength": 1.0
      }
    }
  ]
}
```

### 5. **Lip Sync + Visème Tracking**
- **Solution ComfyUI:** **VisemeNet + Wav2Lip**

```json
{
  "nodes": [
    {
      "class_type": "VisemeExtractor",
      "inputs": {
        "audio": "AUDIO_FILE",
        "sample_rate": 16000
      }
    },
    {
      "class_type": "Wav2Lip",
      "inputs": {
        "face_image": "CHARACTER_FACE",
        "audio_file": "AUDIO_FILE",
        "pads": "10 0 0 0",
        "nosmooth": false,
        "enhancer": true
      }
    },
    {
      "class_type": "FaceDetailer",
      "inputs": {
        "image": ["Wav2Lip", 0],
        "model": "GFPGAN",
        "strength": 0.8
      }
    }
  ]
}
```

---

## 📊 Tableau Comparatif Global (Mis à jour)

| Fonctionnalité | Seedance | Kling | Veo 3.1 | Sora 2 | **StoryCore** |
|----------------|:--------:|:-----:|:-------:|:------:|:-------------:|
| **Text-to-Video** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Image-to-Video** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Audio intégré** | ❌ | ❌ | ✅ | ❌ | **⚠️ Pipeline séparé** |
| **Lip Sync** | ❌ | ✅ | ❌ | ❌ | **❌ (ComfyUI requis)** |
| **Video-to-Video** | ❌ | ✅ | ❌ | ✅ | **❌ (ComfyUI requis)** |
| **Dialogue Wizard** | ❌ | ❌ | ❌ | ❌ | **✅ EXISTANT!** |
| **Qwen3 TTS** | ❌ | ❌ | ❌ | ❌ | **✅ EXISTANT!** |
| **Audio Enhancement** | ❌ | ❌ | ❌ | ❌ | **✅ EXISTANT!** |
| **Processing Local** | ❌ | ❌ | ❌ | ❌ | **✅ UNIQUE!** |

---

## 🎯 **Roadmap d'Intégration ComfyUI**

### Phase 1: Lip Sync (1-2 semaines)
```
1. Installer Wav2Lip dans ComfyUI
2. Créer addon lip-sync dans creative-studio-ui
3. Intégrer avec dialogue_wizard
4. Pipeline: Dialogue → TTS → Lip Sync → Vidéo
```

### Phase 2: Video-to-Video (2-3 semaines)
```
1. Configurer workflow Inpainting ControlNet
2. Créer UI pour upload vidéo source
3. Implémenter masquage automatique
4. Pipeline: Vidéo → Inpainting → Modification
```

### Phase 3: Audio Intégré (1 semaine)
```
1. Documenter pipeline existant (souvent ignoré!)
2. Créer wizard unifié: Script → Audio → Timeline
3. UI pour sélection mood/emotion
4. Export timeline compatible
```

### Phase 4: Simulation Physique (3-4 semaines)
```
1. Intégrer AnimateDiff + Physics modules
2. Créer presets: tissu, eau, feu, fumée
3. UI paramétrique pour physique
```

---

## 📈 **Recommandations Prioritaires**

### 1. **DOCUMENTER & PROMOUVOIR l'existant!**
Le dialogue_wizard, Qwen3 TTS, et AI Audio Enhancement sont **sous-utilisés**!

### 2. **Créer le "Dialogue-to-Audio-to-Timeline" Wizard**
Un wizard unifié qui:
```
1. Prend le script/scène
2. Génère dialogues via DialogueWizard
3. Convertit en audio via Qwen3 TTS
4. Enhance via AI Audio Engine
5. Ajoute à la timeline automatiquement
```

### 3. **Intégrer ComfyUI pour Lip Sync**
Le lip sync est la fonctionnalité **la plus demandée** et ComfyUI a des solutions!

### 4. **Positionnement unique**
StoryCore ne peut PAS rivaliser sur la durée vidéo (10s vs 20s pour Sora), mais peut offrir:
- **100% Local** (confidentialité)
- **Contrôle total** (ControlNet, prompts)
- **Pipeline cohérent** (dialogue→audio→video)
- **Extensibilité** (ComfyUI, addons)

---

## ✅ **Checklist: Fonctionnalités Existantes à Utiliser**

| Module | Status | Action Requise |
|--------|--------|----------------|
| `dialogue_wizard.py` | ✅ Prêt | Documenter, créer UI |
| `qwen3_tts_integration.py` | ✅ Prêt | Configurer modèles |
| `ai_audio_enhancement_engine.py` | ✅ Prêt | Créer presets mood |
| `plan-sequences addon` | ✅ Prêt | Intégrer audio |
| `Lip Sync ComfyUI` | ❌ Manquant | Implémenter Phase 1 |
| `V2V ComfyUI` | ❌ Manquant | Implémenter Phase 2 |
| `Physics ComfyUI` | ❌ Manquant | Implémenter Phase 4 |

---

*Document mis à jour pour StoryCore Engine - Analyse concurrentielle IA vidéo*
*Date: Janvier 2026*

