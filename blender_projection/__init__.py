"""
BlenderProjection -- Systeme 2.5D + Assets procéduraux pour StoryCore-Engine
=============================================================================

Cree des scenes 3D illusionnistes par projection d'images dans des
geometries simples (cube inverse, skybox, piece interieure).

Pipeline complet :
    Image IA -> ReferenceRenderer -> Blender headless -> PNG 1920x1080 -> IA video

Modules :
    - scene_builder      : Orchestrateur principal (CLI-ready)
    - asset_library      : Catalogue 26 assets (mesh 3D + sprites 2D)
    - asset_placer       : Plantation procedurale d'assets Blender
    - reference_renderer : Generation d'images de reference pour IA video

Usage ReferenceRenderer :
    from blender_projection import ReferenceRenderer

    r = ReferenceRenderer()
    script = r.generate_from_preset(
        image_path="ma_scene.png",
        preset_name="foret",
        camera_shot="low_angle",
        camera_lens=35.0,
        density="medium",
    )
    # blender -b -P {script}

Usage AssetPlacer :
    from blender_projection import AssetPlacer
    placer = AssetPlacer()
    code = placer.generate_placement_code("tree_conifer", count=6, seed=42)

Execution CLI headless :
    blender -b -P generate_scene.py -- scene.png exterior
"""

from blender_projection.scene_builder import (
    build_projected_scene,
    ProjectionSceneBuilder,
    ProjectionConfig,
)
from blender_projection.asset_library import (
    AssetLibrary,
    AssetDef,
    AssetType,
    AssetCategory,
    SceneContext,
)
from blender_projection.asset_placer import AssetPlacer
from blender_projection.reference_renderer import ReferenceRenderer, SCENE_PRESETS

__all__ = [
    # scene_builder
    "build_projected_scene",
    "ProjectionSceneBuilder",
    "ProjectionConfig",
    # asset_library
    "AssetLibrary",
    "AssetDef",
    "AssetType",
    "AssetCategory",
    "SceneContext",
    # asset_placer
    "AssetPlacer",
    # reference_renderer
    "ReferenceRenderer",
    "SCENE_PRESETS",
]
