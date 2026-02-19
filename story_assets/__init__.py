"""
story_assets — Module d'inventaires et objets 3D persistants
=============================================================

Gère les objets d'histoire (armes, props, artefacts...) associés
aux personnages et générés en 3D Blender.

Pipeline complet :
  1. Créer un StoryObject (JSON)
  2. L'ajouter à l'inventaire du personnage
  3. Le registre le persiste sur disque
  4. L'AssetBuilder génère un script Blender autonome
  5. L'SceneInjector l'injecte dans n'importe quelle scène

Usage rapide :
    from story_assets import StoryObject, CharacterInventory, StoryObjectRegistry
    from story_assets import StoryAssetBuilder, SceneObjectInjector

    # Créer un objet
    epee = StoryObject(
        id="epee_alpha",
        name="Epee d'Alpha",
        object_type="weapon",
        owner="Alpha",
        material="metal_rusty",
        description="Lame brisee, gravee d'un symbole inconnu",
        tags=["cyberpunk", "weapon", "rusty"],
    )

    # Inventaire
    inv = CharacterInventory("Alpha", project_id="cyberpunk_001")
    inv.add(epee, slot="main_hand")
    inv.save()

    # Registre persistant
    registry = StoryObjectRegistry(project_id="cyberpunk_001")
    registry.register(epee)

    # Script Blender
    builder = StoryAssetBuilder()
    script = builder.build_script(epee)
    # → exports/blender/assets/scripts/Alpha_Epee_d_Alpha.py

    # Injection dans une scène
    injector = SceneObjectInjector()
    injector.inject_inventory(
        scene_script_path="./exports/blender/scripts/scene.py",
        inventory=inv,
    )
"""

from story_assets.story_object import StoryObject, OBJECT_TYPES, MATERIAL_PRESETS
from story_assets.character_inventory import CharacterInventory, INVENTORY_SLOTS
from story_assets.object_registry import StoryObjectRegistry
from story_assets.asset_builder import StoryAssetBuilder
from story_assets.scene_injector import SceneObjectInjector

__all__ = [
    "StoryObject",
    "OBJECT_TYPES",
    "MATERIAL_PRESETS",
    "CharacterInventory",
    "INVENTORY_SLOTS",
    "StoryObjectRegistry",
    "StoryAssetBuilder",
    "SceneObjectInjector",
]

__version__ = "1.0.0"
