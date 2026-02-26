# StoryCore Recap Engine

> **Addon officiel StoryCore** · v1.0.0  
> Transforme vos BDs en vidéos narratives longues, style **Manga Recap YouTube**

---

## 🎬 Qu'est-ce que le Recap Engine ?

Le Recap Engine convertit automatiquement une **BD générée par le Comic Generator** en **vidéo narrative** prête pour YouTube :

- 🎙️ **Voix off continue** (TTS neurale, multi-personnages)
- 🖼️ **Panels légèrement animés** (zoom lent, pan, slow push, shake)
- 🎬 **Transitions cinématiques** (fade au noir, dissolve, sépia pour flashbacks)
- 🎨 **Code couleur fixe par personnage** (lisibilité longue durée)
- 📝 **Sous-titres SRT** générés automatiquement
- 🎵 **Musique de fond** optionnelle
- 📦 **Export MP4** via ffmpeg

---

## 🏗️ Architecture

```
addons/official/recap_engine/
├── addon.json           # Manifeste de l'addon
├── config.json          # Configuration par défaut
├── src/
│   ├── types.py         # Types de données (RecapScene, RecapTimeline, …)
│   ├── script_builder.py # BD → Script narratif + scènes
│   ├── tts_generator.py  # Texte → Audio (gTTS, EdgeTTS, Piper)
│   ├── video_renderer.py # Scènes → Clips MP4 (ffmpeg zoompan)
│   ├── recap_pipeline.py # Orchestrateur principal
│   ├── main.py           # API FastAPI
│   └── cli.py            # Interface en ligne de commande
```

---

## 🚀 Pipeline

```
BD StoryCore (JSON)
    │
    ▼
RecapScriptBuilder
    ├── Extraire chaque panel
    ├── Construire le texte de narration (dialogues → prose)
    ├── Assigner mouvement caméra selon l'émotion
    ├── Calculer les durées (selon longueur texte)
    └── Créer signature visuelle par personnage
    │
    ▼
TTSGenerator
    ├── gTTS (Google TTS) – par défaut
    ├── edge_tts (Microsoft Neural) – haute qualité
    ├── piper (local offline)
    └── mock (silencieux, pour tests)
    │
    ▼
VideoRenderer (ffmpeg)
    ├── Par scène : zoompan filter → clip MP4
    ├── Concat tous les clips
    ├── + musique de fond (volume 0.15)
    └── + burn-in sous-titres SRT
    │
    ▼
📦 Export MP4 final
```

---

## 🎙️ Structure d'une scène

```python
RecapScene {
    panel_id: str              # Panel source BD
    narration_text: str        # Texte lu par la voix off
    duration: float            # Durée (3 – 12 secondes)
    camera_move: CameraMove    # zoom_in | pan_left | slow_push | shake | static
    transition_in: TransitionType  # fade_black | dissolve | sepia_wash | cut
    highlight_bubbles: bool    # Surbrillance des bulles actives
    audio_path: str            # Fichier MP3 TTS généré
}
```

---

## 🎨 Codes visuels par personnage

Chaque personnage reçoit automatiquement une **signature visuelle fixe** :

| Rôle         | Couleur cadre | Effet         |
|-------------|---------------|---------------|
| Protagoniste | `#00aaff` 🔵 | soft_glow     |
| Antagoniste  | `#ff4444` 🔴 | hard_outline  |
| Allié 1      | `#44cc88` 🟢 | pulse         |
| Allié 2      | `#ffaa00` 🟡 | pulse         |
| Mystérieux   | `#cc44ff` 🟣 | soft_glow     |

---

## 📡 API REST

Toutes les routes sont disponibles sous `/api/addons/recap_engine/`.

### `GET /status`
Vérifie l'état du Recap Engine et la disponibilité de ffmpeg.

### `POST /generate/comic`
Génère un recap depuis un JSON de BD exporté.

```json
{
  "project_id": "my_project",
  "comic_json_path": "data/assets/comics/my_project/export/comic_export.json",
  "story_context": "Dans un Tokyo futuriste…",
  "style": "manga_recap",
  "tts_provider": "edge_tts"
}
```

### `POST /render`
Lance le rendu vidéo MP4 d'une timeline.

```json
{
  "project_id": "my_project",
  "timeline_id": "abc123..."
}
```

### `POST /export`
Export final avec sous-titres SRT incrustés.

### `GET /timeline/{project_id}/{timeline_id}`
Détails complets d'une timeline.

### `GET /video/{project_id}/{timeline_id}`
Serve le fichier MP4 final.

---

## 💻 CLI

```bash
# Générer un recap
python -m addons.official.recap_engine.src.cli generate \
    --project my_project \
    --comic data/assets/comics/my_project/export/comic_export.json \
    --context "Dans un Tokyo futuriste, Akira découvre…" \
    --style manga_recap \
    --tts edge_tts

# Rendre la vidéo
python -m addons.official.recap_engine.src.cli render \
    --project my_project \
    --timeline <timeline_id>

# Export final
python -m addons.official.recap_engine.src.cli export \
    --project my_project \
    --timeline <timeline_id>

# Voir les timelines
python -m addons.official.recap_engine.src.cli status \
    --project my_project
```

---

## ⚙️ Prérequis

### Obligatoire
- **Python 3.9+**
- **ffmpeg** dans le PATH (pour le rendu vidéo)

### TTS (choisir un)
```bash
pip install gtts        # Google TTS (simple)
pip install edge-tts    # Microsoft Edge TTS (recommandé)
# Piper TTS : télécharger les exécutables sur github.com/rhasspy/piper
```

### Optionnel
```bash
pip install pillow      # Pour les images placeholder
```

---

## 🎬 Mouvements de caméra

| Émotion     | Mouvement ffmpeg   | Effet              |
|-------------|-------------------|---------------------|
| Tension     | `slow_push`       | Avancée lente       |
| Climax      | `shake`           | Tremblement         |
| Révélation  | `zoom_in`         | Zoom avant          |
| Résolution  | `zoom_out`        | Dézoom              |
| Setup       | `pan_left`        | Panoramique         |
| Transition  | `pan_right`       | Panoramique inversé |
| Calme       | `static`          | Image fixe          |

---

## 🗺️ Roadmap (Phase 2)

- [ ] **Mode 2** : Vidéo existante → Recap stylisé (speech-to-text + résumé)
- [ ] **Musique adaptative** : IA générative selon l'émotion
- [ ] **Lip-sync** approximatif sur les panels avec personnages
- [ ] **Templates YouTube** : intro/outro animés
- [ ] **Chapitres** avec timeline chaptering pour YouTube
- [ ] **Multi-résolution** : 720p, 1080p, 4K
