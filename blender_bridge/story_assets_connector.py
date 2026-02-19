"""
story_assets_connector.py — Connexion VoiceBridge ↔ StoryAssets ↔ Blender
==========================================================================

Ce module est le chaînon manquant entre :
  - Le système vocal (VoiceToSceneBridge → SceneJSON)
  - Le registre d'objets (StoryObjectRegistry → inventaires personnages)
  - Le moteur Blender (SceneObjectInjector → injection dans script)

Pipeline complet :
  Commande vocale
      ↓  VoiceToSceneBridge.parse()
  SceneJSON + liste de personnages
      ↓  StoryAssetsConnector.enrich_scene()
  Script Blender généré + objets d'inventaire injectés
      ↓  BlenderHeadlessRunner.execute()
  Rendu PNG final

Usage :
    connector = StoryAssetsConnector(
        project_id="cyberpunk_001",
        projects_dir="./projects",
    )

    # Option 1 : pipeline complet depuis une commande vocale
    result = connector.voice_to_render(
        "Ruelle cyberpunk, Alpha à 2 mètres devant caméra"
    )
    print(result["render_path"])

    # Option 2 : enrichir une SceneJSON existante
    scene = bridge.parse("Ruelle cyberpunk")
    script_path = connector.enrich_and_build(scene)
"""

from __future__ import annotations
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)


class StoryAssetsConnector:
    """
    Orchestre le pipeline complet :
      voix → scène → inventaires → script Blender → rendu

    Responsabilités :
    1. Parser une commande vocale via VoiceToSceneBridge
    2. Détecter les personnages mentionnés
    3. Charger leurs inventaires depuis StoryObjectRegistry
    4. Générer le script Blender via ScriptGenerator
    5. Injecter les objets via SceneObjectInjector
    6. Exécuter via BlenderHeadlessRunner (avec SafeBlenderRunner)
    """

    def __init__(
        self,
        project_id: Optional[str] = None,
        projects_dir: str = "./projects",
        output_dir: str = "./exports/blender",
        blender_executable: Optional[str] = None,
        inject_equipped_only: bool = True,
    ):
        """
        Args:
            project_id         : ID du projet StoryCore (pour les inventaires)
            projects_dir       : dossier racine des projets
            output_dir         : dossier de sortie Blender
            blender_executable : chemin Blender (None = auto-détection)
            inject_equipped_only : injecter seulement les objets équipés
        """
        self.project_id = project_id
        self.projects_dir = projects_dir
        self.output_dir = output_dir
        self.blender_executable = blender_executable
        self.inject_equipped_only = inject_equipped_only

        # Imports différés pour éviter les dépendances circulaires
        self._bridge = None
        self._registry = None
        self._script_gen = None
        self._injector = None
        self._runner = None

    # ─── LAZY INIT ───────────────────────────────────────────────────────────

    @property
    def bridge(self):
        if self._bridge is None:
            from blender_bridge.voice_bridge import VoiceToSceneBridge
            self._bridge = VoiceToSceneBridge()
        return self._bridge

    @property
    def registry(self):
        if self._registry is None:
            from story_assets.object_registry import StoryObjectRegistry
            self._registry = StoryObjectRegistry(
                project_id=self.project_id,
                projects_dir=self.projects_dir,
            )
        return self._registry

    @property
    def script_gen(self):
        if self._script_gen is None:
            from blender_bridge.script_generator import BlenderScriptGenerator
            self._script_gen = BlenderScriptGenerator(
                scripts_dir=str(Path(self.output_dir) / "scripts")
            )
        return self._script_gen

    @property
    def injector(self):
        if self._injector is None:
            from story_assets.scene_injector import SceneObjectInjector
            from story_assets.asset_builder import StoryAssetBuilder
            builder = StoryAssetBuilder(
                output_dir=str(Path(self.output_dir) / "assets" / "scripts")
            )
            self._injector = SceneObjectInjector(asset_builder=builder)
        return self._injector

    @property
    def runner(self):
        if self._runner is None:
            from blender_bridge.headless_runner import BlenderHeadlessRunner
            self._runner = BlenderHeadlessRunner(
                blender_executable=self.blender_executable,
                output_dir=str(Path(self.output_dir) / "renders"),
            )
        return self._runner

    # ─── API PRINCIPALE ──────────────────────────────────────────────────────

    def voice_to_render(
        self,
        command: str,
        frame: int = 1,
        execute: bool = True,
    ) -> Dict[str, Any]:
        """
        Pipeline complet : commande vocale → rendu Blender.

        Args:
            command : commande vocale en langage naturel
            frame   : frame à rendre
            execute : si False, génère le script mais ne lance pas Blender

        Returns:
            dict avec :
              - scene_id    : ID de la scène générée
              - script_path : chemin du script Blender
              - render_path : chemin du rendu (si execute=True)
              - success     : bool
              - objects_injected : liste des objets injectés
              - error       : message d'erreur éventuel
        """
        logger.info(f"[Connector] Pipeline vocal → '{command}'")

        try:
            # 1. Parser la commande vocale
            scene = self.bridge.parse(command)

            # 2. Générer le script Blender
            script_path = self.script_gen.generate(scene)
            logger.info(f"[Connector] Script généré : {script_path}")

            # 3. Injecter les inventaires des personnages
            injected_objects = []
            for char in scene.characters:
                char_objects = self._inject_character_inventory(
                    script_path=script_path,
                    character_name=char.name,
                    scene_tags=scene.narrative_tags,
                )
                injected_objects.extend(char_objects)
                if char_objects:
                    logger.info(
                        f"[Connector] {char.name} → {len(char_objects)} objet(s) injecté(s)"
                    )

            # 4. Exécuter Blender (optionnel)
            render_path = None
            if execute:
                result = self.runner.execute(script_path=script_path, scene=scene, frame=frame)
                render_path = result.get("render_path")
                if not result["success"]:
                    return {
                        "scene_id": scene.scene_id,
                        "script_path": script_path,
                        "render_path": None,
                        "success": False,
                        "objects_injected": [o.name for o in injected_objects],
                        "error": result.get("error"),
                    }

            return {
                "scene_id": scene.scene_id,
                "script_path": script_path,
                "render_path": render_path,
                "success": True,
                "objects_injected": [o.name for o in injected_objects],
                "error": None,
                "scene_json": scene.to_dict() if hasattr(scene, "to_dict") else {},
            }

        except Exception as e:
            logger.error(f"[Connector] Erreur pipeline : {e}", exc_info=True)
            return {
                "scene_id": None,
                "script_path": None,
                "render_path": None,
                "success": False,
                "objects_injected": [],
                "error": str(e),
            }

    def enrich_and_build(
        self,
        scene,
        execute: bool = False,
    ) -> str:
        """
        Enrichit une SceneJSON existante avec les inventaires et génère le script.

        Args:
            scene   : SceneJSON déjà parsée
            execute : lancer Blender après génération

        Returns:
            Chemin du script Blender enrichi
        """
        # Générer le script de base
        script_path = self.script_gen.generate(scene)

        # Injecter les inventaires
        for char in scene.characters:
            self._inject_character_inventory(
                script_path=script_path,
                character_name=char.name,
                scene_tags=getattr(scene, "narrative_tags", []),
            )

        if execute:
            self.runner.execute(script_path=script_path, scene=scene)

        return script_path

    def apply_voice_modifier(
        self,
        scene,
        modifier_command: str,
    ):
        """
        Applique une commande modificatrice sur une scène existante.

        Exemple :
            scene = connector.bridge.parse("Ruelle cyberpunk")
            scene = connector.apply_voice_modifier(scene, "Ajoute brouillard dense")
            scene = connector.apply_voice_modifier(scene, "Place Bêta à 3 mètres")

        Returns:
            SceneJSON modifiée
        """
        return self.bridge.apply_command(scene, modifier_command)

    def get_character_objects(
        self,
        character_name: str,
        scene_tags: Optional[List[str]] = None,
    ) -> List:
        """
        Retourne les objets d'un personnage depuis le registre.

        Args:
            character_name : nom du personnage
            scene_tags     : tags de la scène pour filtrage contextuel

        Returns:
            Liste de StoryObject
        """
        try:
            inventory = self.registry.get_inventory(character_name)
            if self.inject_equipped_only:
                objects = inventory.equipped
            else:
                objects = inventory.items

            # Filtrer par tags de scène si fournis
            if scene_tags:
                scene_set = set(scene_tags)
                objects = [
                    o for o in objects
                    if not o.tags or scene_set.intersection(set(o.tags))
                ]

            return objects
        except Exception as e:
            logger.warning(f"[Connector] Inventaire {character_name} indisponible : {e}")
            return []

    def register_object(self, obj) -> None:
        """
        Enregistre un objet dans le registre du projet.

        Args:
            obj : StoryObject à persister
        """
        self.registry.register(obj)

    def list_all_objects(self, character_name: Optional[str] = None) -> List:
        """Retourne tous les objets enregistrés (ou ceux d'un personnage)."""
        if character_name:
            return self.registry.find_by_owner(character_name)
        return self.registry.all_objects()

    # ─── UTILITAIRES PRIVÉS ──────────────────────────────────────────────────

    def _inject_character_inventory(
        self,
        script_path: str,
        character_name: str,
        scene_tags: Optional[List[str]] = None,
    ) -> List:
        """
        Charge l'inventaire d'un personnage et l'injecte dans le script.

        Returns:
            Liste des StoryObject injectés
        """
        objects = self.get_character_objects(character_name, scene_tags)

        if not objects:
            logger.debug(f"[Connector] Aucun objet pour {character_name}")
            return []

        self.injector.inject_into_script(
            scene_script_path=script_path,
            objects=objects,
            character_name=character_name,
        )

        return objects

    def dry_run(self, command: str) -> Dict[str, Any]:
        """
        Simule le pipeline complet sans rien exécuter.

        Utile pour prévisualiser ce qui sera généré :
          - SceneJSON parsée
          - Objets qui seraient injectés
          - Commande CLI qui serait lancée

        Returns:
            dict descriptif du pipeline
        """
        scene = self.bridge.parse(command)

        char_objects = {}
        for char in scene.characters:
            objects = self.get_character_objects(
                char.name,
                getattr(scene, "narrative_tags", []),
            )
            char_objects[char.name] = [o.name for o in objects]

        # Commande CLI simulée
        cli_cmd = (
            f"blender --background --python "
            f"{self.output_dir}/scripts/{scene.scene_id}.py -- --frame 1"
        )

        return {
            "command": command,
            "scene_id": scene.scene_id,
            "scene_type": getattr(scene.scene_type, "value", str(scene.scene_type)),
            "characters": [c.name for c in scene.characters],
            "character_objects": char_objects,
            "atmosphere": getattr(scene.atmosphere.type, "value", "none"),
            "shot_type": getattr(scene.camera.shot_type, "value", "medium"),
            "tags": getattr(scene, "narrative_tags", []),
            "cli_command": cli_cmd,
        }
