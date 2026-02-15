# 🚀 Propositions d'Amélioration pour StoryCore Engine

Basé sur l'analyse du projet, voici les propositions d'amélioration pour les 3 fonctionnalités sélectionnées:

---

## 1. 🎫 Contrôle de Version (Git-like Versioning)

### Analyse de l'existant
Le projet utilise déjà:
- `project_manager.py` - Gestion de projets
- `archive/` - Archives
- `memory_system/` - Système de mémoire

### Proposition d'Implémentation

```python
# src/version_control.py (Nouveau Module)

import json
import os
import hashlib
from datetime import datetime
from pathlib import Path

class StoryCoreVersionControl:
    """Système de contrôle de version style Git pour projets StoryCore"""
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.version_dir = self.project_path / ".storycore" / "versions"
        self.version_dir.mkdir(parents=True, exist_ok=True)
        
    def commit(self, message: str, project_data: dict) -> str:
        """Crée une nouvelle version du projet"""
        version_id = self._generate_version_id(project_data)
        
        version_data = {
            "version_id": version_id,
            "timestamp": datetime.utcnow().isoformat(),
            "message": message,
            "project_snapshot": project_data,
            "parent": self._get_latest_version()
        }
        
        # Sauvegarder la version
        version_file = self.version_dir / f"{version_id}.json"
        with open(version_file, 'w', encoding='utf-8') as f:
            json.dump(version_data, f, indent=2, default=str)
            
        return version_id
    
    def checkout(self, version_id: str) -> dict:
        """Restaure une version précédente"""
        version_file = self.version_dir / f"{version_id}.json"
        if not version_file.exists():
            raise ValueError(f"Version {version_id} non trouvée")
            
        with open(version_file, 'r', encoding='utf-8') as f:
            return json.load(f)["project_snapshot"]
    
    def diff(self, version_id_1: str, version_id_2: str) -> dict:
        """Compare deux versions"""
        v1 = self.checkout(version_id_1)
        v2 = self.checkout(version_id_2)
        
        differences = {
            "added": self._get_diff(v1, v2),
            "removed": self._get_diff(v2, v1),
            "modified": self._get_modified(v1, v2)
        }
        return differences
    
    def log(self, limit: int = 10) -> list:
        """Historique des versions"""
        versions = sorted(self.version_dir.glob("*.json"), 
                         key=lambda x: x.stat().st_mtime, 
                         reverse=True)
        return [self._load_version_metadata(v) for v in versions[:limit]]
    
    def branch(self, branch_name: str, project_data: dict) -> str:
        """Crée une nouvelle branche"""
        pass
    
    def merge(self, source_branch: str, target_branch: str) -> dict:
        """Fusionne deux branches"""
        pass
```

### Intégration UI
- Bouton "Commit" dans le header du projet
- Timeline visuelle des versions
- Comparaison side-by-side

---

## 2. 🔊 Amélioration Audio-Vidéo (Lip Sync)

### Analyse de l'existant
Le projet dispose déjà de:
- `qwen3_tts_integration.py` - Génération de voix
- `ai_audio_enhancement_engine.py` - Enhancement audio
- `ltx2_image_to_video` - Génération vidéo avec audio

### Proposition d'Implémentation

```python
# src/lip_sync_manager.py (Nouveau Module)

from dataclasses import dataclass
from typing import Optional, List
import asyncio

@dataclass
class LipSyncConfig:
    method: str = "ltx2_native"  # ou "wav2lip", "sadtalker"
    quality: str = "medium"  # low, medium, high
    enhance_face: bool = True

class LipSyncManager:
    """Gestionnaire de lip sync pour StoryCore"""
    
    def __init__(self, comfyui_client):
        self.comfyui = comfyui_client
        self.config = LipSyncConfig()
    
    async def generate_with_lip_sync(
        self,
        character_face: str,
        dialogue_audio: str,
        video_prompt: str,
        method: str = "ltx2_native"
    ) -> str:
        """Génère vidéo avec lip sync"""
        
        if method == "ltx2_native":
            enhanced_prompt = f"""
{video_prompt}
The character is speaking: "{self._extract_dialogue_text(dialogue_audio)}"
Mouth moving naturally while speaking.
"""
            return await self._generate_ltx2(enhanced_prompt, character_face)
            
        elif method == "wav2lip":
            video = await self._generate_base_video(video_prompt, character_face)
            return await self._apply_wav2lip(video, dialogue_audio)
            
        elif method == "sadtalker":
            return await self._apply_sadtalker(character_face, dialogue_audio)
    
    async def _generate_ltx2(self, prompt: str, reference_image: str) -> str:
        pass
    
    async def _apply_wav2lip(self, video_path: str, audio_path: str) -> str:
        workflow = {
            "nodes": [
                {"class_type": "LoadImage", "inputs": {"image": video_path}},
                {"class_type": "LoadAudio", "inputs": {"audio": audio_path}},
                {"class_type": "Wav2Lip", "inputs": {
                    "face_image": "LoadImage",
                    "audio_file": "LoadAudio",
                    "pads": "0 0 0 0",
                    "nosmooth": False,
                    "enhancer": True
                }},
                {"class_type": "FaceEnhance", "inputs": {
                    "image": "Wav2Lip",
                    "model": "GFPGAN"
                }}
            ]
        }
        return await self.comfyui.execute(workflow)
```

---

## 3. 🎮 Support 3D (Import/Export)

### Analyse de l'existant
Le projet a:
- `src/3d/` - Module 3D existant
- `3D_MODULE_STATUS.md` - Status du module
- `puppet_layer_engine.py` - Engine de puppet

### Proposition d'Implémentation

```python
# src/3d/model_importer.py (Nouveau Module)

import json
from pathlib import Path
from typing import Optional, List
from dataclasses import dataclass

@dataclass
class Model3DFormat:
    type: str
    path: str
    scale: float = 1.0
    rotation: tuple = (0, 0, 0)
    position: tuple = (0, 0, 0)

class Model3DManager:
    """Gestionnaire d'import/export de modèles 3D"""
    
    SUPPORTED_FORMATS = ['.glb', '.gltf', '.fbx', '.obj', '.usd', '.usda']
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.models_dir = self.project_path / "assets" / "3d_models"
        self.models_dir.mkdir(parents=True, exist_ok=True)
    
    def import_model(
        self,
        source_path: str,
        format_type: Optional[str] = None,
        optimize: bool = True
    ) -> Model3DFormat:
        source = Path(source_path)
        if not source.exists():
            raise FileNotFoundError(f"Modèle non trouvé: {source_path}")
        
        format_ext = source.suffix.lower()
        if format_ext not in self.SUPPORTED_FORMATS:
            raise ValueError(f"Format non supporté: {format_ext}")
        
        dest = self.models_dir / source.name
        if source != dest:
            import shutil
            shutil.copy2(source, dest)
        
        if optimize:
            self._optimize_model(dest)
        
        return Model3DFormat(
            type=format_ext,
            path=str(dest),
            scale=1.0,
            rotation=(0, 0, 0),
            position=(0, 0, 0)
        )
    
    def export_for_rendering(
        self,
        model_path: str,
        output_format: str = "glb",
        quality: str = "high"
    ) -> str:
        pass
    
    def create_puppet_from_model(
        self,
        model_path: str,
        rig_type: str = "humanoid"
    ) -> dict:
        return {
            "model_path": model_path,
            "rig_type": rig_type,
            "blend_shapes": self._extract_blend_shapes(model_path),
            "animations": self._extract_animations(model_path)
        }
```

---

## 📋 Roadmap d'Implémentation Suggérée

### Phase 1: Version Control (2 semaines)
1. Créer `src/version_control.py`
2. Intégrer dans `project_manager.py`
3. Ajouter UI dans Creative Studio

### Phase 2: Lip Sync (3 semaines)
1. Créer `src/lip_sync_manager.py`
2. Intégrer avec `qwen3_tts_integration.py`
3. Ajouter Workflows ComfyUI (Wav2Lip)
4. Extension du Dialogue Wizard

### Phase 3: Support 3D (4 semaines)
1. Créer `src/3d/model_importer.py`
2. Mettre à jour `src/3d/` existant
3. Intégration ComfyUI pour rendu 3D
4. UI d'import/export

---

## 💡 Autres Idées d'Amélioration

1. **Collaboration en temps réel** - WebSocket pour plusieurs utilisateurs
2. **Templates prédéfinis** - Bibliothèque de styles vidéo
3. **Suggestions IA** - Amélioration de scénario via LLM
4. **Rendu cloud optionnel** - GPU cloud pour gros projets
5. **Plugin système** - Extensions tierces
6. **Export multi-format** - YouTube, TikTok, etc.

---

*Document créé pour StoryCore Engine - Propositions d'amélioration*
*Date: 2026*

