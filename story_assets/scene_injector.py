"""
scene_injector.py — Injection d'objets d'histoire dans les scènes Blender
=========================================================================

Connecte le registre d'objets d'histoire (StoryObjectRegistry)
au système de génération de scènes Blender (BlenderBridge).

Responsabilité :
  Prendre une SceneJSON + une liste de StoryObject
  → Enrichir le script Blender généré avec le code 3D de chaque objet

Usage :
    injector = SceneObjectInjector()

    # Injecter les objets d'Alpha dans une scène
    scene = bridge.parse_voice_command("Ruelle cyberpunk avec Alpha")
    enriched_script = injector.inject_into_script(
        scene_script_path="./exports/blender/scripts/scene_001.py",
        objects=registry.find_by_owner("Alpha"),
        character_name="Alpha",
    )

    # Ou directement depuis l'inventaire
    enriched_script = injector.inject_inventory(
        scene_script_path="./exports/blender/scripts/scene_001.py",
        inventory=registry.get_inventory("Alpha"),
    )
"""

from __future__ import annotations
import logging
import re
from pathlib import Path
from typing import List, Optional, Tuple, Dict

from story_assets.story_object import StoryObject
from story_assets.asset_builder import StoryAssetBuilder

logger = logging.getLogger(__name__)


class SceneObjectInjector:
    """
    Injecte les objets d'histoire StoryObject dans les scripts Blender de scène.

    Stratégie :
    - Pour chaque objet : génère le code d'insertion via StoryAssetBuilder
    - Insère le code AVANT le rendu (après la création des rigs)
    - Place les objets à des positions cohérentes (devant le rig si owner trouvé)
    - Préserve le script de scène d'origine (insertion non destructive)
    """

    def __init__(self, asset_builder: Optional[StoryAssetBuilder] = None):
        self.builder = asset_builder or StoryAssetBuilder()

    # ─── API PRINCIPALE ──────────────────────────────────────────────────────

    def inject_into_script(
        self,
        scene_script_path: str,
        objects: List[StoryObject],
        character_name: Optional[str] = None,
        positions: Optional[Dict[str, Tuple[float, float, float]]] = None,
    ) -> str:
        """
        Injecte des objets dans un script de scène Blender existant.

        Args:
            scene_script_path : chemin du script .py de scène
            objects           : liste de StoryObject à injecter
            character_name    : nom du rig parent (attachement optionnel)
            positions         : dict {object_id: (x,y,z)} — positions personnalisées

        Returns:
            Chemin du script enrichi (modifie le fichier sur place)
        """
        if not objects:
            return scene_script_path

        script_path = Path(scene_script_path)
        if not script_path.exists():
            logger.warning(f"[Injector] Script introuvable : {scene_script_path}")
            return scene_script_path

        original = script_path.read_text(encoding="utf-8")

        # Générer le code d'injection pour chaque objet
        inject_lines = [
            "",
            "# ════════════════════════════════════════════════════════════════",
            "# OBJETS D'HISTOIRE (StoryAssets) — Injectés automatiquement",
            f"# Personnage : {character_name or 'Global'}",
            "# ════════════════════════════════════════════════════════════════",
            "",
        ]

        for i, obj in enumerate(objects):
            pos = (positions or {}).get(obj.id)
            if pos is None:
                pos = self._default_position(i, len(objects), character_name)

            rig_name = f"{character_name}_Rig" if character_name else None

            embed_code = self.builder.build_scene_embed_code(
                obj=obj,
                position=pos,
                rotation=(0.0, 0.0, 0.0),
                parent_rig_name=rig_name,
            )
            inject_lines.append(embed_code)
            inject_lines.append("")

        inject_block = "\n".join(inject_lines)

        # Insérer AVANT le rendu final
        enriched = self._insert_before_render(original, inject_block)
        script_path.write_text(enriched, encoding="utf-8")

        logger.info(
            f"[Injector] {len(objects)} objet(s) injecté(s) dans {script_path.name}"
        )
        return str(script_path)

    def inject_inventory(
        self,
        scene_script_path: str,
        inventory,
        inject_equipped_only: bool = False,
        positions: Optional[Dict[str, Tuple[float, float, float]]] = None,
    ) -> str:
        """
        Injecte l'inventaire complet (ou équipé) d'un personnage dans une scène.

        Args:
            scene_script_path : chemin du script .py de scène
            inventory         : CharacterInventory à injecter
            inject_equipped_only : si True, injecte seulement les objets équipés
            positions         : positions personnalisées par object_id

        Returns:
            Chemin du script enrichi
        """
        objects = inventory.equipped if inject_equipped_only else inventory.items
        return self.inject_into_script(
            scene_script_path=scene_script_path,
            objects=objects,
            character_name=inventory.character_name,
            positions=positions,
        )

    def inject_from_registry(
        self,
        scene_script_path: str,
        registry,
        scene_tags: Optional[List[str]] = None,
        character_name: Optional[str] = None,
    ) -> str:
        """
        Injecte des objets depuis le registre, filtrés par tags de scène.

        Args:
            scene_script_path : chemin du script
            registry          : StoryObjectRegistry
            scene_tags        : tags narratifs de la scène pour filtrer les objets
            character_name    : limiter aux objets d'un personnage

        Returns:
            Chemin du script enrichi
        """
        if character_name:
            objects = registry.find_by_owner(character_name)
        elif scene_tags:
            objects = registry.objects_in_scene(scene_tags)
        else:
            objects = registry.all_objects()

        return self.inject_into_script(
            scene_script_path=scene_script_path,
            objects=objects,
            character_name=character_name,
        )

    def generate_objects_section(
        self,
        objects: List[StoryObject],
        character_name: Optional[str] = None,
    ) -> str:
        """
        Génère le bloc de code Python Blender pour les objets,
        sans modifier de fichier existant.

        Utile pour intégration directe dans un générateur de script.

        Returns:
            String de code Python Blender à inclure dans un script
        """
        if not objects:
            return "# Aucun objet d'histoire\n"

        lines = [
            "",
            "# ════════════════════════════════════════════════════════════════",
            "# OBJETS D'HISTOIRE — StoryAssets",
            "# ════════════════════════════════════════════════════════════════",
            "",
        ]

        for i, obj in enumerate(objects):
            pos = self._default_position(i, len(objects), character_name)
            rig_name = f"{character_name}_Rig" if character_name else None
            embed_code = self.builder.build_scene_embed_code(
                obj=obj,
                position=pos,
                parent_rig_name=rig_name,
            )
            lines.append(embed_code)
            lines.append("")

        return "\n".join(lines)

    # ─── UTILITAIRES PRIVÉS ──────────────────────────────────────────────────

    def _insert_before_render(self, script: str, inject_block: str) -> str:
        """
        Insère le bloc d'injection AVANT le rendu Blender dans le script.

        Cherche les marqueurs dans l'ordre :
          1. "bpy.ops.render.render(" — appel de rendu direct
          2. "STORYCORE_RENDER_COMPLETE" — marqueur StoryCore
          3. Fin du fichier (fallback)
        """
        markers = [
            "bpy.ops.render.render(",
            "STORYCORE_RENDER_COMPLETE",
            "scene.render.filepath",
        ]

        for marker in markers:
            idx = script.find(marker)
            if idx > 0:
                # Trouver le début de la ligne
                line_start = script.rfind("\n", 0, idx) + 1
                return script[:line_start] + inject_block + "\n" + script[line_start:]

        # Fallback : ajouter à la fin
        return script + "\n" + inject_block

    def _default_position(
        self,
        index: int,
        total: int,
        character_name: Optional[str],
    ) -> Tuple[float, float, float]:
        """
        Calcule une position par défaut pour un objet dans la scène.

        Les objets d'un personnage sont disposés en arc devant lui.
        Les objets globaux sont disposés au sol.
        """
        if character_name:
            # Disposition en arc devant le rig (radius 0.5m)
            import math
            angle = (index / max(total, 1)) * math.pi - math.pi / 2
            radius = 0.5
            x = radius * math.cos(angle)
            y = -1.0 + radius * math.sin(angle) * 0.3
            z = 0.8  # hauteur taille
            return (round(x, 3), round(y, 3), round(z, 3))
        else:
            # Disposition au sol en ligne
            x = (index - total / 2) * 0.8
            return (round(x, 3), 0.0, 0.0)
