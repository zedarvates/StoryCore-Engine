"""
BlenderBridge — Façade principale pour l'intégration Blender dans StoryCore-Engine
==================================================================================

Point d'entrée unique pour toutes les opérations Blender.

Usage rapide :
    from blender_bridge import BlenderBridge

    bridge = BlenderBridge()

    # Pipeline complet depuis une commande vocale
    result = bridge.render_from_voice("Ruelle cyberpunk sous pluie avec Alpha devant")
    print(result["render_path"])

    # Ou étape par étape
    scene = bridge.parse_voice_command("Ruelle cyberpunk nocturne")
    scene = bridge.modify_scene(scene, "Caméra basse 35mm")
    result = bridge.render(scene)
"""

from __future__ import annotations
import logging
from typing import Optional, Dict, Any

from blender_bridge.scene_types import SceneJSON
from blender_bridge.voice_bridge import VoiceToSceneBridge
from blender_bridge.script_generator import BlenderScriptGenerator
from blender_bridge.headless_runner import BlenderHeadlessRunner
from blender_bridge.camera_system import CinematicCameraSystem
from blender_bridge.rig_generator import RigGenerator
from blender_bridge.location_manager import LocationManager
from blender_bridge.scene_types import (
    SceneType, ShotType, AtmosphereType, RigType,
    CameraConfig, CharacterRig, AtmosphereConfig,
    LightingConfig, LightConfig, LightType, PropObject,
    LocationPreset, RenderSettings,
)

logger = logging.getLogger(__name__)


class BlenderBridge:
    """
    Façade principale — orchestre tous les modules BlenderBridge.

    Responsabilités :
    - Parsing de commandes vocales
    - Construction et modification de scènes
    - Génération de scripts Python Blender
    - Exécution headless + récupération des renders

    Architecture (séparation des couches) :
        VoiceCommand → VoiceToSceneBridge → SceneJSON
                                                 ↓
                               BlenderScriptGenerator → script.py
                                                 ↓
                               BlenderHeadlessRunner → render.png
    """

    def __init__(
        self,
        blender_executable: Optional[str] = None,
        scripts_dir: str = "./exports/blender/scripts",
        presets_dir: str = "./blender_bridge/presets/locations",
    ):
        self.voice_bridge = VoiceToSceneBridge()
        self.script_gen = BlenderScriptGenerator(scripts_dir=scripts_dir)
        self.runner = BlenderHeadlessRunner(blender_executable=blender_executable)
        self.camera_sys = CinematicCameraSystem()
        self.rig_gen = RigGenerator()
        self.location_mgr = LocationManager(presets_dir=presets_dir)

        # Note : le runner logue déjà un warning si Blender est absent

    # ─── API PRINCIPALE ───────────────────────────────────────────────────────

    def parse_voice_command(self, command: str) -> SceneJSON:
        """
        Parse une commande vocale → SceneJSON.

        Args:
            command : commande en langage naturel (FR ou EN)

        Returns:
            SceneJSON structuré et prêt pour le rendu
        """
        return self.voice_bridge.parse(command)

    def modify_scene(self, scene: SceneJSON, command: str) -> SceneJSON:
        """
        Modifie une scène existante avec une commande vocale.

        Args:
            scene   : SceneJSON à modifier
            command : commande de modification

        Returns:
            SceneJSON modifié
        """
        return self.voice_bridge.apply_command(scene, command)

    def render(
        self,
        scene: SceneJSON,
        script_path: Optional[str] = None,
        timeout: int = 300,
    ) -> Dict[str, Any]:
        """
        Génère le script Blender et lance le rendu headless.

        Args:
            scene       : SceneJSON complet
            script_path : chemin de sortie du script (auto si None)
            timeout     : timeout en secondes

        Returns:
            dict avec "success", "render_path", "duration_seconds", "error"
        """
        # Générer le script
        generated_script = self.script_gen.generate(scene, output_path=script_path)

        # Vérifier si Blender est disponible
        if not self.runner.is_blender_available():
            return {
                "success": False,
                "render_path": None,
                "script_path": generated_script,
                "duration_seconds": 0,
                "error": "Blender non disponible. Configurez BLENDER_EXECUTABLE dans .env",
                "command": self.runner.dry_run(generated_script, scene)["command"],
            }

        # Lancer le rendu
        return self.runner.execute(generated_script, scene, timeout=timeout)

    def render_from_voice(
        self,
        command: str,
        output_path: Optional[str] = None,
        timeout: int = 300,
    ) -> Dict[str, Any]:
        """
        Pipeline complet : commande vocale → SceneJSON → script → rendu.

        Args:
            command     : commande vocale
            output_path : chemin de sortie du rendu (dans SceneJSON si None)
            timeout     : timeout en secondes

        Returns:
            dict avec "success", "render_path", "scene_json", "script_path"
        """
        scene = self.parse_voice_command(command)

        if output_path:
            scene.render.output_path = output_path

        result = self.render(scene, timeout=timeout)
        result["scene_json"] = scene.to_dict()
        result["voice_command"] = command

        return result

    def generate_script_only(
        self,
        command: str,
        output_path: Optional[str] = None,
    ) -> str:
        """
        Génère uniquement le script Blender (sans l'exécuter).

        Utile pour inspecter le script avant de lancer le rendu.

        Returns:
            Chemin absolu du script généré
        """
        scene = self.parse_voice_command(command)
        return self.script_gen.generate(scene, output_path=output_path)

    def dry_run(self, command: str) -> Dict[str, Any]:
        """
        Simule le pipeline sans exécuter Blender.

        Retourne la commande CLI qui serait lancée, la scène JSON générée,
        et vérifie la disponibilité de Blender.

        Returns:
            dict avec "command", "scene_json", "script_path", "blender_available"
        """
        scene = self.parse_voice_command(command)
        script_path = self.script_gen.generate(scene)
        dry = self.runner.dry_run(script_path, scene)

        return {
            "command": dry["command"],
            "scene_json": scene.to_dict(),
            "script_path": script_path,
            "blender_available": dry["blender_available"],
            "blender_version": dry.get("blender_version"),
        }

    # ─── ACCÈS AUX SOUS-MODULES ──────────────────────────────────────────────

    @property
    def cameras(self) -> CinematicCameraSystem:
        """Accès au système de caméras cinématographiques."""
        return self.camera_sys

    @property
    def rigs(self) -> RigGenerator:
        """Accès au générateur de rigs placeholder."""
        return self.rig_gen

    @property
    def locations(self) -> LocationManager:
        """Accès au gestionnaire de lieux et presets."""
        return self.location_mgr

    # ─── UTILITAIRES ────────────────────────────────────────────────────────

    def is_ready(self) -> bool:
        """Vérifie si Blender est disponible et le système est prêt."""
        return self.runner.is_blender_available()

    def status(self) -> Dict[str, Any]:
        """Retourne le statut complet du système."""
        blender_ok = self.runner.is_blender_available()
        return {
            "blender_available": blender_ok,
            "blender_version": self.runner.get_blender_version() if blender_ok else None,
            "location_presets": len(self.location_mgr.list_all()),
            "camera_shot_types": len(self.camera_sys.list_shot_types()),
            "scripts_dir": str(self.script_gen.scripts_dir),
            "presets_dir": str(self.location_mgr.presets_dir),
        }


# ─── EXPORTS PUBLICS ──────────────────────────────────────────────────────────

__all__ = [
    # Façade principale
    "BlenderBridge",
    # Types de données
    "SceneJSON",
    "SceneType",
    "ShotType",
    "AtmosphereType",
    "RigType",
    "CameraConfig",
    "CharacterRig",
    "AtmosphereConfig",
    "LightingConfig",
    "LightConfig",
    "LightType",
    "PropObject",
    "LocationPreset",
    "RenderSettings",
    # Modules individuels
    "VoiceToSceneBridge",
    "CinematicCameraSystem",
    "RigGenerator",
    "LocationManager",
    "BlenderScriptGenerator",
    "BlenderHeadlessRunner",
]
