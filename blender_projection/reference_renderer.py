"""reference_renderer.py — Generation d images de reference pour IA video."""
from __future__ import annotations
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, List
from blender_projection.asset_placer import AssetPlacer
from blender_projection.asset_library import AssetLibrary, SceneContext

_LIB = AssetLibrary()

SCENE_PRESETS = {
    "foret":     {"tags":["foret","arbre","nature","brume"],
                  "assets":{"tree_conifer":6,"tree_deciduous":4,"plant_fern":8,
                             "rock_medium":3,"sprite_grass_ground":15},"context":"exterior"},
    "desert":    {"tags":["desert","aride","sec"],
                  "assets":{"plant_cactus":4,"rock_boulder":3,"rock_cluster":6,"rock_medium":5},
                  "context":"exterior"},
    "urbain":    {"tags":["urbain","rue","nuit","ville"],
                  "assets":{"prop_streetlamp":3,"prop_crate":4,"prop_barrel":2,"prop_debris":5},
                  "context":"exterior"},
    "montagne":  {"tags":["montagne","rocher","alpin"],
                  "assets":{"rock_boulder":5,"rock_medium":8,"rock_cluster":6,
                             "tree_conifer":4,"tree_dead":3},"context":"exterior"},
    "tropical":  {"tags":["tropical","palmier","plage","ile"],
                  "assets":{"tree_palm":5,"plant_bush":6,"sprite_grass_ground":12},
                  "context":"exterior"},
    "interieur": {"tags":["interieur","bureau","piece"],
                  "assets":{"plant_pot":2,"prop_crate":2,"prop_barrel":1},
                  "context":"interior"},
}

class ReferenceRenderer:
    """
    Genere des images de reference Blender propres pour les IA video.

    Pipeline:
      VoiceCommand / NarrativeTags
        -> ScenePreset + assets procéduraux
        -> Blender script (skybox + assets + camera + eclairage)
        -> Render EEVEE 1920x1080 PNG
        -> Image de reference pour Kling / Runway / SVD / CogVideoX...
    """

    CAM_PRESETS = {
        "wide":          ("(0.0, -8.0, 1.7)",  "(1.53, 0, 0)",   24.0, 5.6, 8.0),
        "close":         ("(0.0, -1.5, 1.65)", "(1.53, 0, 0)",   85.0, 1.8, 1.5),
        "low_angle":     ("(0.0, -4.0, 0.4)",  "(1.22, 0, 0)",   28.0, 4.0, 4.0),
        "high_angle":    ("(0.0, -3.0, 5.0)",  "(2.09, 0, 0)",   35.0, 4.0, 4.0),
        "over_shoulder": ("(0.4, -1.8, 1.7)",  "(1.40, 0,-0.14)",50.0, 2.8, 2.5),
    }

    def __init__(self, output_dir: str = "./exports/blender/references"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.placer = AssetPlacer()

    def generate_reference_script(
        self,
        image_path: str,
        scene_type: str = "exterior",
        narrative_tags: Optional[List[str]] = None,
        camera_shot: str = "wide",
        camera_lens: float = 24.0,
        assets: Optional[Dict[str, int]] = None,
        use_depth_map: bool = False,
        depth_map_path: Optional[str] = None,
        resolution: tuple = (1920, 1080),
        engine: str = "EEVEE",
        output_path: Optional[str] = None,
        seed: int = 42,
    ) -> str:
        """
        Genere un script Blender complet pour une image de reference IA video.

        Returns: chemin du script .py genere
        """
        img_path = Path(image_path)
        uid = hashlib.md5(image_path.encode()).hexdigest()[:8]
        script_name = f"ref_{img_path.stem}_{scene_type}_{uid}.py"
        script_path = self.output_dir / script_name

        if output_path is None:
            output_path = str(self.output_dir / f"ref_{img_path.stem}_render")

        if assets is None and narrative_tags:
            assets = self._suggest_assets(narrative_tags, scene_type)
        elif assets is None:
            assets = {}

        placement_code = ""
        for asset_id, count in assets.items():
            if _LIB.get_by_id(asset_id):
                placement_code += self.placer.generate_placement_code(
                    asset_id=asset_id,
                    count=count,
                    area_bounds=(-8.0, 8.0, 0.0, 14.0),
                    seed=seed + abs(hash(asset_id)) % 999,
                )

        script = self._build_script(
            image_path=str(img_path.resolve()).replace("\\", "/"),
            scene_type=scene_type,
            camera_shot=camera_shot,
            camera_lens=camera_lens,
            use_depth_map=use_depth_map,
            depth_map_path=(str(Path(depth_map_path).resolve()).replace("\\", "/")
                            if depth_map_path else ""),
            resolution=resolution,
            engine=engine,
            output_path=output_path.replace("\\", "/"),
            placement_code=placement_code,
        )
        script_path.write_text(script, encoding="utf-8")
        return str(script_path)

    def generate_from_preset(
        self,
        image_path: str,
        preset_name: str,
        camera_shot: str = "wide",
        camera_lens: float = 24.0,
        density: str = "medium",
        **kwargs,
    ) -> str:
        """Genere depuis un preset: 'foret','desert','urbain','montagne','tropical','interieur'."""
        preset = SCENE_PRESETS.get(preset_name, SCENE_PRESETS["foret"])
        mult = {"light": 0.4, "medium": 1.0, "heavy": 2.0}.get(density, 1.0)
        assets = {aid: max(1, int(cnt * mult)) for aid, cnt in preset["assets"].items()}
        return self.generate_reference_script(
            image_path=image_path,
            scene_type=preset["context"],
            narrative_tags=preset["tags"],
            camera_shot=camera_shot,
            camera_lens=camera_lens,
            assets=assets,
            **kwargs,
        )

    def list_presets(self) -> Dict[str, Any]:
        return {
            name: {"tags": p["tags"], "context": p["context"],
                   "asset_count": sum(p["assets"].values())}
            for name, p in SCENE_PRESETS.items()
        }

    def _suggest_assets(self, tags: List[str], context: str) -> Dict[str, int]:
        ctx = SceneContext.EXTERIOR if context == "exterior" else SceneContext.INTERIOR
        suggestions = _LIB.suggest_for_scene(tags, context=ctx, max_per_category=2)
        return {
            asset.id: (5 if asset.asset_type.value == "mesh_3d" else 12)
            for asset_list in suggestions.values()
            for asset in asset_list[:2]
        }

    def _build_script(self, image_path, scene_type, camera_shot, camera_lens,
                      use_depth_map, depth_map_path, resolution, engine,
                      output_path, placement_code) -> str:
        cam = self.CAM_PRESETS.get(camera_shot, self.CAM_PRESETS["wide"])
        cam_pos, cam_rot, default_lens, fstop, focus = cam
        lens = camera_lens or default_lens

        # ── Code skybox / intérieur ───────────────────────────────────────────
        if scene_type == "exterior":
            env_code = (
                "    # Skybox cube inverse avec image projetee\n"
                "    bpy.ops.mesh.primitive_cube_add(size=30.0)\n"
                "    sky = bpy.context.active_object\n"
                "    sky.name = 'Skybox'\n"
                "    mat_sky = bpy.data.materials.new(name='SkyMat')\n"
                "    mat_sky.use_nodes = True\n"
                "    nodes_sky = mat_sky.node_tree.nodes\n"
                "    links_sky = mat_sky.node_tree.links\n"
                "    nodes_sky.clear()\n"
                "    n_out = nodes_sky.new('ShaderNodeOutputMaterial')\n"
                "    n_em  = nodes_sky.new('ShaderNodeEmission')\n"
                "    n_tex = nodes_sky.new('ShaderNodeTexImage')\n"
                "    n_crd = nodes_sky.new('ShaderNodeTexCoord')\n"
                f"    try:\n"
                f"        n_tex.image = bpy.data.images.load(r'{image_path}')\n"
                "    except Exception as e:\n"
                "        print(f'[RefRenderer] Image: {e}')\n"
                "    n_tex.extension = 'EXTEND'\n"
                "    links_sky.new(n_crd.outputs['Object'], n_tex.inputs['Vector'])\n"
                "    links_sky.new(n_tex.outputs['Color'], n_em.inputs['Color'])\n"
                "    n_em.inputs['Strength'].default_value = 1.0\n"
                "    links_sky.new(n_em.outputs['Emission'], n_out.inputs['Surface'])\n"
                "    sky.data.materials.append(mat_sky)\n"
                "    bpy.ops.object.mode_set(mode='EDIT')\n"
                "    bpy.ops.mesh.select_all(action='SELECT')\n"
                "    bpy.ops.mesh.flip_normals()\n"
                "    bpy.ops.object.mode_set(mode='OBJECT')\n"
                "    # Sol\n"
                "    bpy.ops.mesh.primitive_plane_add(size=30.0, location=(0,0,-0.01))\n"
                "    ground = bpy.context.active_object\n"
                "    ground.name = 'Ground'\n"
                "    mat_g = bpy.data.materials.new('GroundMat')\n"
                "    mat_g.use_nodes = True\n"
                "    bsdf_g = mat_g.node_tree.nodes['Principled BSDF']\n"
                "    bsdf_g.inputs['Roughness'].default_value = 0.9\n"
                "    bsdf_g.inputs['Base Color'].default_value = (0.15, 0.14, 0.12, 1.0)\n"
                "    ground.data.materials.append(mat_g)\n"
            )
        else:
            env_code = (
                "    # Piece interieure\n"
                "    room_size = 8.0; wall_h = 3.5\n"
                "    walls = [\n"
                "        ('Wall_Back',  (0, room_size/2, wall_h/2), (room_size, wall_h, 0.1)),\n"
                "        ('Wall_Left',  (-room_size/2, 0, wall_h/2),(room_size, wall_h, 0.1)),\n"
                "        ('Wall_Right', ( room_size/2, 0, wall_h/2),(room_size, wall_h, 0.1)),\n"
                "        ('Floor',      (0, 0, 0),                  (room_size, room_size, 0.1)),\n"
                "        ('Ceiling',    (0, 0, wall_h),             (room_size, room_size, 0.1)),\n"
                "    ]\n"
                "    for wname, wloc, wsz in walls:\n"
                "        bpy.ops.mesh.primitive_cube_add(size=1.0, location=wloc)\n"
                "        w = bpy.context.active_object; w.name = wname; w.scale = wsz\n"
                "        mat_w = bpy.data.materials.new(f'{wname}_m')\n"
                "        mat_w.use_nodes = True\n"
                "        n_tex = mat_w.node_tree.nodes.new('ShaderNodeTexImage')\n"
                f"        try: n_tex.image = bpy.data.images.load(r'{image_path}')\n"
                "        except Exception: pass\n"
                "        bsdf_w = mat_w.node_tree.nodes['Principled BSDF']\n"
                "        mat_w.node_tree.links.new(n_tex.outputs['Color'], bsdf_w.inputs['Base Color'])\n"
                "        bsdf_w.inputs['Roughness'].default_value = 0.8\n"
                "        w.data.materials.append(mat_w)\n"
            )

        depth_code = ""
        if use_depth_map and depth_map_path:
            depth_code = (
                "    ground = bpy.data.objects.get('Ground')\n"
                "    if ground:\n"
                "        mod = ground.modifiers.new(name='Depth', type='DISPLACE')\n"
                "        tex_d = bpy.data.textures.new(name='DepthTex', type='IMAGE')\n"
                f"        try:\n"
                f"            tex_d.image = bpy.data.images.load(r'{depth_map_path}')\n"
                "            mod.texture = tex_d; mod.strength = 0.8\n"
                "            mod.texture_coords = 'UV'\n"
                "        except Exception as e: print(f'Depth map: {e}')\n"
            )

        engine_code = (
            f"    scene.render.engine = 'BLENDER_{engine}'\n"
            f"    scene.render.resolution_x = {resolution[0]}\n"
            f"    scene.render.resolution_y = {resolution[1]}\n"
        )
        if engine == "EEVEE":
            engine_code += (
                "    if hasattr(scene, 'eevee'):\n"
                "        scene.eevee.use_bloom = True\n"
                "        scene.eevee.bloom_intensity = 0.05\n"
                "        scene.eevee.use_ssr = True\n"
                "        scene.eevee.use_gtao = True\n"
                "        scene.eevee.taa_render_samples = 64\n"
            )
        else:
            engine_code += (
                "    scene.cycles.samples = 128\n"
                "    scene.cycles.use_denoising = True\n"
            )

        lines = [
            "#!/usr/bin/env python3",
            f'"""Image de reference IA video — {scene_type} | {camera_shot} {lens}mm | {engine}"""',
            "import bpy, math, random",
            "",
            "def setup_scene():",
            "    bpy.ops.object.select_all(action='SELECT')",
            "    bpy.ops.object.delete()",
            "",
            env_code,
            "",
            depth_code,
            "",
            f"    # Camera {camera_shot} {lens}mm",
            f"    bpy.ops.object.camera_add(location={cam_pos})",
            "    cam_obj = bpy.context.active_object",
            "    cam_obj.name = 'Camera'",
            f"    cam_obj.rotation_euler = {cam_rot}",
            "    cam = cam_obj.data",
            f"    cam.lens = {lens}",
            "    cam.dof.use_dof = True",
            f"    cam.dof.focus_distance = {focus}",
            f"    cam.dof.aperture_fstop = {fstop}",
            "    cam.sensor_width = 36.0",
            "    bpy.context.scene.camera = cam_obj",
            "",
            "    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 1.7))",
            "    target = bpy.context.active_object",
            "    target.name = 'CameraTarget'",
            "    tc = cam_obj.constraints.new(type='TRACK_TO')",
            "    tc.target = target; tc.track_axis = 'TRACK_NEGATIVE_Z'; tc.up_axis = 'UP_Y'",
            "",
            "    # Eclairage 3 points",
            "    bpy.ops.object.light_add(type='SUN', location=(3, -5, 8))",
            "    sun = bpy.context.active_object",
            "    sun.data.energy = 3.0; sun.data.angle = 0.1",
            "    sun.rotation_euler = (0.7, 0, 0.5)",
            "    bpy.ops.object.light_add(type='AREA', location=(-3, -3, 4))",
            "    fill = bpy.context.active_object",
            "    fill.data.energy = 50.0; fill.data.size = 3.0",
            "    fill.data.color = (0.6, 0.7, 1.0)",
            "    bpy.ops.object.light_add(type='AREA', location=(0, 5, 3))",
            "    rim = bpy.context.active_object",
            "    rim.data.energy = 30.0; rim.data.size = 2.0",
            "    rim.data.color = (1.0, 0.9, 0.7)",
            "",
            "    # Rendu",
            "    scene = bpy.context.scene",
            "    scene.render.resolution_percentage = 100",
            "    scene.render.image_settings.file_format = 'PNG'",
            "    scene.render.image_settings.color_mode = 'RGBA'",
            f"    scene.render.filepath = r'{output_path}'",
            engine_code,
            "",
            "",
            "setup_scene()",
            "",
            "# Assets procéduraux",
            placement_code,
            "",
            "# Rendu final",
            "bpy.ops.render.render(write_still=True)",
            "print(f'STORYCORE_RENDER_COMPLETE:{bpy.context.scene.render.filepath}.png')",
        ]
        return "\n".join(lines)

if __name__ == "__main__":
    r = ReferenceRenderer()
    print("Presets:", list(r.list_presets().keys()))
