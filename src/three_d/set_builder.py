from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional

# --- STORYCORE SET BUILDER ENGINE ---
# This engine bridges Scene Breakdowns (Narrative) and 3D Production (Blender/ComfyUI).
# It uses "Primitives" for rapid layout and integrates with PrimitiveAnything.


class PrimitiveObject:
    """A 3D primitive (Cube, Sphere, Plane) used for scene blocking."""

    def __init__(
        self,
        primitive_id,
        type,
        name,
        position=(0, 0, 0),
        rotation=(0, 0, 0),
        scale=(1, 1, 1),
        color="#CCCCCC",
        roughness=0.5,
        metallic=0.0,
        material_modifier_id=None,
    ):
        self.primitive_id = primitive_id
        self.type = type
        self.name = name
        self.position = position
        self.rotation = rotation
        self.scale = scale
        self.color = color
        self.roughness = roughness
        self.metallic = metallic
        self.material_modifier_id = material_modifier_id


class SetLayout:
    """The 3D layout of a scene."""

    def __init__(
        self,
        scene_id,
        environment_type="interior",
        primitives=None,
        puppets=None,
        lighting_setup=None,
        camera_shot=None,
    ):
        self.scene_id = scene_id
        self.environment_type = environment_type
        self.primitives = primitives or []
        self.puppets = puppets or []
        self.lighting_setup = lighting_setup or {}
        self.camera_shot = camera_shot or {}


class SetBuilderEngine:
    """
    Engine for rapid 3D Set construction from script breakdowns.
    Integrates with Blender-in-ComfyUI and PrimitiveAnything.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.output_dir = Path("data/production/sets")
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_layout_from_breakdown(
        self, scene_breakdown: Dict[str, Any]
    ) -> SetLayout:
        """
        Interprets a scene breakdown and generates a blocking layout with primitives.
        """
        scene_id = scene_breakdown.get("scene_id", "scene_01")
        env_info = scene_breakdown.get("environment", {})
        env_type = env_info.get("type", "interior")

        layout = SetLayout(
            scene_id=scene_id,
            environment_type=env_type,
            lighting_setup=scene_breakdown.get("lighting", {}),
            camera_shot=scene_breakdown.get("composition", {}),
        )

        # 1. Automatic Primitive Placement (Rule-based)
        if env_type == "interior":
            # Add Ground Plane
            layout.primitives.append(
                PrimitiveObject(
                    primitive_id=f"plane_{scene_id}",
                    type="plane",
                    name="Floor",
                    scale=(10.0, 10.0, 1.0),
                    color="#888888",
                )
            )
            # Add Walls (Placeholder cubes)
            layout.primitives.append(
                PrimitiveObject(
                    primitive_id=f"wall_back_{scene_id}",
                    type="cube",
                    name="Back Wall",
                    position=(0, 5, 2.5),
                    scale=(10.0, 0.2, 5.0),
                    color="#AAAAAA",
                )
            )
        elif env_type == "urban":
            # Add Street Plane
            layout.primitives.append(
                PrimitiveObject(
                    primitive_id=f"street_{scene_id}",
                    type="plane",
                    name="Street",
                    scale=(50.0, 5.0, 1.0),
                    color="#333333",
                )
            )

        # 2. Map Characters to Puppets (Make-It-Animatable preparation)
        for char in scene_breakdown.get("characters", []):
            layout.puppets.append(
                {
                    "character_id": char.get("character_id"),
                    "name": char.get("name"),
                    "rig_type": "humanoid_advanced",  # ComfyUI_Make-It-Animatable compatible
                    "default_pose": "standing_A"
                    if char.get("role_in_scene") == "primary_focus"
                    else "idle",
                    "position": char.get("positioning", {}).get(
                        "world_position", (0, 0, 0)
                    ),
                }
            )

        return layout

    def export_comfy_manifest(
        self, layout: SetLayout, export_path: Optional[str] = None
    ) -> Path:
        """
        Exports a manifest JSON that can be read by specialized ComfyUI nodes (PrimitiveAnything).
        """
        manifest = {
            "version": "1.0_SetBuilder",
            "scene_id": layout.scene_id,
            "render_engine": "blender_eevee",  # Blender-in-ComfyUI preference
            "layout": {
                "primitives": [
                    {
                        "id": p.primitive_id,
                        "type": p.type,
                        "transform": {
                            "pos": p.position,
                            "rot": p.rotation,
                            "scale": p.scale,
                        },
                        "material": {
                            "color_hex": p.color,
                            "roughness": p.roughness,
                            "metallic": p.metallic,
                            "mod_id": p.material_modifier_id,
                        },
                    }
                    for p in layout.primitives
                ],
                "puppets": layout.puppets,
            },
            "lighting": layout.lighting_setup,
            "camera": layout.camera_shot,
        }

        path = Path(
            export_path or self.output_dir / f"set_{layout.scene_id}_comfy.json"
        )
        with open(path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

        self.logger.info(f"ComfyUI Set Manifest exported to: {path}")
        return path

    def sync_to_blender(self, layout: SetLayout) -> str:
        """
        Generates a Python command to sync this layout inside a Blender instance.
        """
        # (This would be consumed by our Blender Sync Character script or similar)
        return f"import storycore; storycore.sync_set('{layout.scene_id}')"


def build_scene_set(scene_breakdown_file: str) -> Path:
    """
    Convenience function to build a 3D set from a breakdown file.
    """
    with open(scene_breakdown_file, "r") as f:
        data = json.load(f)

    engine = SetBuilderEngine()

    # Process the first detailed scene if multiple
    detailed_scenes = data.get("detailed_scenes", [])
    if not detailed_scenes:
        print("Error: No detailed scenes found in breakdown.")
        return None

    scene = detailed_scenes[0]
    layout = engine.generate_layout_from_breakdown(scene)
    manifest_path = engine.export_comfy_manifest(layout)

    return manifest_path
