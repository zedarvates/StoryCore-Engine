"""
backend_integration.py — Intégration avec les systèmes existants de StoryCore-Engine
=====================================================================================

Ponts entre BlenderBridge et :
  - Le système de personnages (characterStorage.ts / backend/character_api.py)
  - Le système de lieux (locationStorage.ts / backend/location_api.py)
  - Le pipeline narratif (narrative_engine.py)
  - La génération d'images IA (ContentCreationService)

Chaque pont est indépendant : utiliser uniquement ceux dont vous avez besoin.

Usage :
    from blender_bridge.backend_integration import (
        CharacterSystemBridge,
        LocationSystemBridge,
        NarrativePipelineBridge,
    )
"""

from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

from blender_bridge import BlenderBridge
from blender_bridge.scene_types import SceneJSON, SceneType, CharacterRig
from blender_bridge.rig_generator import RigGenerator
from blender_bridge.location_manager import LocationManager
from blender_bridge.voice_bridge import VoiceToSceneBridge

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
#  PONT : SYSTÈME DE PERSONNAGES
# ─────────────────────────────────────────────────────────────────────────────

class CharacterSystemBridge:
    """
    Pont entre le système de personnages StoryCore et les rigs Blender.

    Compatible avec :
    - characterStorage.ts (frontend)
    - backend/character_api.py (backend Python)
    - Les fichiers JSON de profils personnages

    Chemin des données : projects/*/characters/*.json
    """

    def __init__(self, characters_dir: str = "./projects"):
        self.characters_dir = Path(characters_dir)
        self.rig_gen = RigGenerator()

    def load_character(self, character_name: str, project_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Charge les données d'un personnage depuis le stockage StoryCore.

        Recherche dans :
          1. projects/<project_id>/characters/<name>.json
          2. projects/*/characters/<name>.json (recherche globale)

        Args:
            character_name : nom du personnage
            project_id     : ID du projet (None = recherche globale)

        Returns:
            dict des données personnage ou None
        """
        search_paths = []

        if project_id:
            search_paths.append(self.characters_dir / project_id / "characters")
        else:
            # Recherche dans tous les projets
            search_paths.extend(self.characters_dir.glob("*/characters"))

        name_lower = character_name.lower()
        for path in search_paths:
            if not path.exists():
                continue
            for json_file in path.glob("*.json"):
                try:
                    with open(json_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    # Correspondance par nom (insensible à la casse)
                    stored_name = data.get("name", "").lower()
                    if stored_name == name_lower or json_file.stem.lower() == name_lower:
                        logger.info(f"[CharacterBridge] Personnage trouvé : {json_file}")
                        return data
                except Exception as e:
                    logger.debug(f"[CharacterBridge] Erreur lecture {json_file}: {e}")

        logger.warning(f"[CharacterBridge] Personnage '{character_name}' introuvable")
        return None

    def load_all_characters(self, project_id: str) -> List[Dict[str, Any]]:
        """Charge tous les personnages d'un projet."""
        chars_path = self.characters_dir / project_id / "characters"
        if not chars_path.exists():
            return []

        characters = []
        for json_file in chars_path.glob("*.json"):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                characters.append(data)
            except Exception as e:
                logger.debug(f"[CharacterBridge] Erreur {json_file}: {e}")

        return characters

    def characters_to_rigs(
        self,
        character_names: List[str],
        positions: Optional[List[Tuple[float, float, float]]] = None,
        project_id: Optional[str] = None,
    ) -> List[CharacterRig]:
        """
        Convertit une liste de noms de personnages en rigs Blender.

        Utilise les données StoryCore si disponibles,
        sinon crée des rigs par défaut avec les noms.

        Args:
            character_names : liste de noms de personnages
            positions       : positions correspondantes (auto si None)
            project_id      : ID de projet pour charger les données

        Returns:
            Liste de CharacterRig prêts pour SceneJSON
        """
        rigs = []
        n = len(character_names)

        # Positions par défaut en ligne
        if positions is None:
            spacing = 0.8
            start_x = -(n - 1) * spacing / 2.0
            positions = [(start_x + i * spacing, 0.0, 0.0) for i in range(n)]

        for name, pos in zip(character_names, positions):
            char_data = self.load_character(name, project_id)

            if char_data:
                rig = self.rig_gen.create_from_character_data(char_data, position=pos)
                logger.info(f"[CharacterBridge] Rig créé depuis données StoryCore : {name}")
            else:
                # Fallback : rig avec données par défaut
                rig = self.rig_gen.create_rig(name=name, position=pos)
                logger.info(f"[CharacterBridge] Rig créé par défaut : {name}")

            rigs.append(rig)

        return rigs

    def inject_into_scene(
        self,
        scene: SceneJSON,
        character_names: List[str],
        project_id: Optional[str] = None,
    ) -> SceneJSON:
        """
        Injecte les personnages StoryCore dans une scène Blender.

        Args:
            scene           : SceneJSON à enrichir
            character_names : noms des personnages à ajouter
            project_id      : ID du projet

        Returns:
            SceneJSON avec les personnages ajoutés
        """
        rigs = self.characters_to_rigs(character_names, project_id=project_id)

        existing_names = {c.name for c in scene.characters}
        for rig in rigs:
            if rig.name not in existing_names:
                scene.characters.append(rig)
                existing_names.add(rig.name)

        return scene


# ─────────────────────────────────────────────────────────────────────────────
#  PONT : SYSTÈME DE LIEUX
# ─────────────────────────────────────────────────────────────────────────────

class LocationSystemBridge:
    """
    Pont entre le système de lieux StoryCore et les presets Blender.

    Compatible avec :
    - locationStorage.ts (frontend)
    - backend/location_api.py (backend Python)

    Permet de convertir automatiquement un lieu narratif en preset Blender 3D.
    """

    def __init__(self):
        self.location_mgr = LocationManager()

    def location_to_scene(
        self,
        location_data: Dict[str, Any],
        base_command: str = "",
    ) -> SceneJSON:
        """
        Convertit des données de lieu StoryCore en SceneJSON Blender.

        Args:
            location_data : dict du lieu (format API backend)
                {
                  "id": "...",
                  "name": "Ruelle de Tokyo",
                  "description": "...",
                  "atmosphere": "nocturne et humide",
                  "location_type": "exterior"
                }
            base_command  : commande vocale de base optionnelle

        Returns:
            SceneJSON prêt pour le rendu Blender
        """
        # Importer le lieu comme preset
        preset = self.location_mgr.import_from_location_api(location_data)

        # Construire une commande narrative depuis les données
        name = location_data.get("name", "")
        description = location_data.get("description", "")
        atmosphere = location_data.get("atmosphere", "")

        narrative = f"{name} {description} {atmosphere} {base_command}".strip()

        # Parser la commande narrative
        bridge = VoiceToSceneBridge()
        scene = bridge.parse(narrative)

        # Appliquer le preset si un lieu similaire existe dans la bibliothèque
        similar = self.location_mgr.create_from_narrative(narrative)
        if similar:
            scene = self.location_mgr.apply_to_scene(scene, similar.id)

        return scene

    def sync_location_presets(self, locations_json_path: str) -> int:
        """
        Synchronise les lieux du fichier JSON StoryCore vers les presets Blender.

        Args:
            locations_json_path : chemin vers le fichier JSON des lieux

        Returns:
            Nombre de presets synchronisés
        """
        count = 0
        try:
            with open(locations_json_path, "r", encoding="utf-8") as f:
                locations = json.load(f)

            if isinstance(locations, dict) and "locations" in locations:
                locations = locations["locations"]

            for loc in locations:
                preset = self.location_mgr.import_from_location_api(loc)
                self.location_mgr.save_preset(preset)
                count += 1

            logger.info(f"[LocationBridge] {count} lieu(x) synchronisé(s)")
        except Exception as e:
            logger.error(f"[LocationBridge] Erreur synchronisation : {e}")

        return count


# ─────────────────────────────────────────────────────────────────────────────
#  PONT : PIPELINE NARRATIF
# ─────────────────────────────────────────────────────────────────────────────

class NarrativePipelineBridge:
    """
    Pont entre le pipeline narratif StoryCore et le moteur Blender.

    Transforme les beats narratifs d'une histoire en scènes Blender,
    en préservant la cohérence visuelle entre les scènes.

    Usage :
        bridge = NarrativePipelineBridge()
        scenes = bridge.beats_to_scenes([
            {"beat": "Arrivée dans la ruelle cyberpunk", "characters": ["Alpha"]},
            {"beat": "Alpha découvre le message", "camera": "gros plan"},
            {"beat": "Fuite dans la nuit sous la pluie", "camera": "wide"},
        ])
    """

    def __init__(self, blender_bridge: Optional[BlenderBridge] = None):
        self.bb = blender_bridge or BlenderBridge()
        self._scene_history: List[SceneJSON] = []

    def beat_to_scene(
        self,
        beat: Dict[str, Any],
        carry_over_location: bool = True,
    ) -> SceneJSON:
        """
        Convertit un beat narratif en SceneJSON Blender.

        Args:
            beat              : dict de beat narratif
                {
                  "beat": "description narrative",
                  "characters": ["Alpha", "Beta"],
                  "camera": "gros plan",     # optionnel
                  "location": "...",          # optionnel
                  "atmosphere": "..."         # optionnel
                }
            carry_over_location : hériter du lieu de la scène précédente

        Returns:
            SceneJSON correspondant au beat
        """
        # Construire la commande narrative depuis le beat
        parts = [beat.get("beat", "")]

        if beat.get("camera"):
            parts.append(beat["camera"])

        if beat.get("atmosphere"):
            parts.append(beat["atmosphere"])

        if beat.get("location"):
            parts.append(beat["location"])

        command = " ".join(filter(None, parts))
        scene = self.bb.parse_voice_command(command)

        # Héritage du lieu si aucun preset détecté et qu'on a une scène précédente
        if carry_over_location and self._scene_history and not scene.location_preset_id:
            last_scene = self._scene_history[-1]
            if last_scene.location_preset_id:
                scene = self.bb.locations.apply_to_scene(scene, last_scene.location_preset_id)
                logger.info(f"[NarrativeBridge] Lieu hérité : {last_scene.location_preset_id}")

        # Injecter les personnages du beat
        if beat.get("characters"):
            char_bridge = CharacterSystemBridge()
            scene = char_bridge.inject_into_scene(scene, beat["characters"])

        self._scene_history.append(scene)
        return scene

    def beats_to_scenes(
        self,
        beats: List[Dict[str, Any]],
        carry_over_location: bool = True,
    ) -> List[SceneJSON]:
        """
        Convertit une liste de beats en scènes Blender cohérentes.

        Args:
            beats             : liste de beats narratifs
            carry_over_location : hériter du lieu entre scènes

        Returns:
            Liste de SceneJSON dans l'ordre narratif
        """
        scenes = []
        for i, beat in enumerate(beats):
            logger.info(f"[NarrativeBridge] Beat {i+1}/{len(beats)} : {beat.get('beat', '')[:50]}")
            scene = self.beat_to_scene(beat, carry_over_location=carry_over_location)
            scenes.append(scene)
        return scenes

    def render_all(
        self,
        beats: List[Dict[str, Any]],
        output_dir: str = "./exports/blender/narrative",
    ) -> List[Dict[str, Any]]:
        """
        Convertit et rend toutes les scènes d'un pipeline narratif.

        Args:
            beats      : liste de beats narratifs
            output_dir : dossier de sortie des renders

        Returns:
            Liste de résultats de rendu
        """
        scenes = self.beats_to_scenes(beats)
        results = []

        for i, scene in enumerate(scenes):
            scene.render.output_path = f"{output_dir}/beat_{i+1:03d}_"
            result = self.bb.render(scene)
            result["beat_index"] = i
            result["beat_description"] = beats[i].get("beat", "")
            results.append(result)
            logger.info(
                f"[NarrativeBridge] Beat {i+1} rendu : "
                f"{'✓' if result['success'] else '✗'} {result.get('render_path', result.get('error'))}"
            )

        return results

    def export_storyboard(self, output_path: str = "./exports/storyboard.json") -> str:
        """
        Exporte le storyboard des scènes en JSON.

        Returns:
            Chemin du fichier JSON exporté
        """
        storyboard = {
            "beat_count": len(self._scene_history),
            "scenes": [
                {
                    "index": i,
                    "scene_id": s.scene_id,
                    "description": s.description,
                    "camera": {
                        "shot_type": s.camera.shot_type.value,
                        "lens": s.camera.lens,
                    },
                    "atmosphere": s.atmosphere.type.value,
                    "characters": [c.name for c in s.characters],
                    "location_preset": s.location_preset_id,
                    "tags": s.narrative_tags,
                }
                for i, s in enumerate(self._scene_history)
            ]
        }

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(storyboard, f, indent=2, ensure_ascii=False)

        logger.info(f"[NarrativeBridge] Storyboard exporté : {output_path}")
        return output_path


# ─────────────────────────────────────────────────────────────────────────────
#  PONT : GÉNÉRATION D'IMAGES IA → PROJECTION 2.5D
# ─────────────────────────────────────────────────────────────────────────────

class AIImageTo2DSceneBridge:
    """
    Connecte le pipeline de génération d'images IA au système de projection 2.5D.

    Workflow :
      1. Une image est générée par IA (ComfyUI, SDXL, Flux, etc.)
      2. Cette image est projetée dans une scène Blender 2.5D
      3. La caméra et la profondeur sont configurées
      4. Blender rend la scène → résultat cinématographique

    Usage :
        bridge = AIImageTo2DSceneBridge()
        result = bridge.process(
            ai_image_path="./exports/generated/ruelle_001.png",
            voice_config="caméra basse 35mm contre-plongée extérieur",
        )
    """

    def __init__(self, blender_executable: Optional[str] = None):
        from blender_projection.scene_builder import build_projected_scene, ProjectionConfig
        from blender_bridge.headless_runner import BlenderHeadlessRunner
        self._build_scene = build_projected_scene
        self._ProjectionConfig = ProjectionConfig
        self.runner = BlenderHeadlessRunner(blender_executable=blender_executable)
        self.voice_bridge = VoiceToSceneBridge()
        self.camera_sys = __import__("blender_bridge.camera_system", fromlist=["CinematicCameraSystem"]).CinematicCameraSystem()

    def process(
        self,
        ai_image_path: str,
        voice_config: str = "",
        depth_map_path: Optional[str] = None,
        output_path: Optional[str] = None,
        engine: str = "EEVEE",
    ) -> Dict[str, Any]:
        """
        Transforme une image IA en scène 2.5D rendue par Blender.

        Args:
            ai_image_path  : chemin vers l'image IA générée
            voice_config   : description vocale pour la config caméra/scène
            depth_map_path : chemin vers la depth map (optionnel)
            output_path    : chemin de sortie du rendu
            engine         : moteur de rendu Blender ("EEVEE" ou "CYCLES")

        Returns:
            dict avec "success", "render_path", "script_path"
        """
        # Détecter le type de scène et la config caméra depuis la commande vocale
        scene_type = "exterior"
        camera_mode = "wide"

        if voice_config:
            cmd_lower = voice_config.lower()

            # Type de scène
            if any(k in cmd_lower for k in ["intérieur", "interieur", "bureau", "pièce", "salle"]):
                scene_type = "interior"

            # Mode caméra
            if any(k in cmd_lower for k in ["basse", "contre-plongée", "low"]):
                camera_mode = "low_angle"
            elif any(k in cmd_lower for k in ["gros plan", "serré", "close"]):
                camera_mode = "close"
            elif any(k in cmd_lower for k in ["over", "épaule", "shoulder"]):
                camera_mode = "over_shoulder"
            elif any(k in cmd_lower for k in ["plongée", "dessus", "high"]):
                camera_mode = "high_angle"

        # Construire la configuration de projection
        config = {
            "scene_type": scene_type,
            "camera_mode": camera_mode,
            "use_depth_map": depth_map_path is not None,
            "depth_map_path": depth_map_path,
            "depth_strength": 0.3,
            "engine": engine,
            "output_path": output_path or f"./exports/blender/2_5d_{Path(ai_image_path).stem}_",
        }

        # Générer le script de projection
        script_path = self._build_scene(ai_image_path, scene_type, config)

        # Exécuter si Blender disponible
        if self.runner.is_blender_available():
            result = self.runner.execute_projection(
                script_path=script_path,
                image_path=ai_image_path,
                scene_type=scene_type,
            )
        else:
            result = {
                "success": False,
                "render_path": None,
                "error": "Blender non disponible",
                "command": f"blender -b -P {script_path} -- {ai_image_path} {scene_type}",
            }

        result["script_path"] = script_path
        result["ai_image_path"] = ai_image_path
        result["config"] = config
        return result

    def batch_process(
        self,
        images: List[Dict[str, str]],
        output_dir: str = "./exports/blender/2_5d_batch",
    ) -> List[Dict[str, Any]]:
        """
        Traite plusieurs images IA en batch.

        Args:
            images : liste de dicts {"image_path": ..., "voice_config": ..., "depth_path": ...}
            output_dir : dossier de sortie

        Returns:
            Liste de résultats
        """
        results = []
        for i, img_config in enumerate(images):
            image_path = img_config.get("image_path", "")
            if not image_path:
                continue

            output_path = f"{output_dir}/frame_{i+1:04d}_"
            result = self.process(
                ai_image_path=image_path,
                voice_config=img_config.get("voice_config", ""),
                depth_map_path=img_config.get("depth_path"),
                output_path=output_path,
            )
            results.append(result)
            logger.info(
                f"[AIImageBridge] Frame {i+1}/{len(images)} : "
                f"{'✓' if result['success'] else '✗'}"
            )

        return results
