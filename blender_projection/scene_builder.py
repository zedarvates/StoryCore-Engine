"""
scene_builder.py — Orchestrateur de scènes 2.5D par projection d'image
=======================================================================

Module principal du système de projection 2.5D.
Génère un script Python Blender complet depuis :
  - une image source (généré par IA ou fourni)
  - un type de scène (exterior / interior)
  - une configuration JSON

Commande CLI :
    blender -b -P generate_scene.py -- image.png exterior

Philosophie :
  "Tu ne recrées PAS la 3D. Tu crées une illusion 3D contrôlée."
"""

from __future__ import annotations
import os
import uuid
import json
import textwrap
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional, Dict, Any, List


# ─────────────────────────────────────────────────────────────────────────────
#  CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class ProjectionConfig:
    """
    Configuration JSON pour une scène de projection 2.5D.

    Tous les paramètres sont optionnels avec des valeurs par défaut sensées.
    """
    # Scène
    scene_type:         str     = "exterior"    # "exterior" | "interior"
    global_scale:       float   = 10.0          # échelle globale de la skybox/pièce

    # Profondeur
    use_depth_map:      bool    = False          # utiliser une depth map externe
    depth_map_path:     Optional[str] = None     # chemin vers la depth map
    depth_strength:     float   = 0.3           # intensité du displacement
    depth_subdivisions: int     = 8             # subdivisions pour le displacement

    # Caméra
    camera_mode:        str     = "wide"        # wide | close | over_shoulder | low_angle | high_angle
    dof_enabled:        bool    = True
    f_stop:             float   = 2.8

    # Assets
    plant_trees:        bool    = False          # planter des arbres (exterior)
    tree_count:         int     = 5
    tree_asset_path:    Optional[str] = None

    # Rendu
    engine:             str     = "EEVEE"        # EEVEE ou CYCLES (EEVEE = plus rapide pour 2.5D)
    resolution_x:       int     = 1920
    resolution_y:       int     = 1080
    samples:            int     = 32
    output_path:        str     = "./exports/blender/projection_render"
    output_format:      str     = "PNG"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ProjectionConfig":
        valid_keys = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in d.items() if k in valid_keys}
        return cls(**filtered)

    @classmethod
    def from_json(cls, json_str: str) -> "ProjectionConfig":
        return cls.from_dict(json.loads(json_str))


# ─────────────────────────────────────────────────────────────────────────────
#  BUILDER PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────

class ProjectionSceneBuilder:
    """
    Génère des scripts Blender pour les scènes 2.5D par projection d'image.

    Le script généré :
    - charge l'image source comme texture
    - crée la géométrie appropriée (skybox / pièce)
    - applique la profondeur (displacement ou artificielle)
    - positionne la caméra en mode cinématographique
    - plante les assets si nécessaire
    - lance le rendu
    """

    def __init__(self, scripts_dir: str = "./exports/blender/projection_scripts"):
        self.scripts_dir = Path(scripts_dir)
        self.scripts_dir.mkdir(parents=True, exist_ok=True)

    def generate(
        self,
        image_path: str,
        config: Optional[ProjectionConfig] = None,
        output_script_path: Optional[str] = None,
    ) -> str:
        """
        Génère le script Blender complet.

        Args:
            image_path         : chemin vers l'image source
            config             : configuration de la scène
            output_script_path : chemin de sortie du script

        Returns:
            Chemin absolu du script généré
        """
        if config is None:
            config = ProjectionConfig()

        blocks = []

        # En-tête
        blocks.append(self._header(image_path, config))

        # Fonctions utilitaires
        blocks.append(self._utilities())

        # Scène principale
        if config.scene_type == "interior":
            blocks.append(self._build_interior(image_path, config))
        else:
            blocks.append(self._build_exterior(image_path, config))

        # Profondeur
        blocks.append(self._apply_depth(config))

        # Caméra cinématographique
        blocks.append(self._setup_camera(config))

        # Plantation d'assets (exterior uniquement)
        if config.scene_type == "exterior" and config.plant_trees:
            blocks.append(self._plant_assets(config))

        # Rendu
        blocks.append(self._render_settings(config))

        # Assemblage
        script = "\n".join(blocks)

        # Chemin de sortie
        if output_script_path is None:
            uid = uuid.uuid4().hex[:8]
            output_script_path = str(self.scripts_dir / f"projection_{config.scene_type}_{uid}.py")

        Path(output_script_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_script_path, "w", encoding="utf-8") as f:
            f.write(script)

        return output_script_path

    # ─── BLOCS DU SCRIPT ────────────────────────────────────────────────────

    def _header(self, image_path: str, config: ProjectionConfig) -> str:
        return textwrap.dedent(f"""\
            #!/usr/bin/env python3
            \"\"\"
            Script Blender 2.5D — Projection d'image
            Généré par StoryCore-Engine BlenderProjection
            Image source : {image_path}
            Mode : {config.scene_type}
            \"\"\"
            import bpy
            import math
            import random
            import sys
            import os
            from mathutils import Vector, Euler

            # ─── Arguments CLI ───────────────────────────────────────────────
            argv = sys.argv
            if "--" in argv:
                args = argv[argv.index("--") + 1:]
                IMAGE_PATH = args[0] if len(args) > 0 else r"{image_path}"
                SCENE_TYPE = args[1] if len(args) > 1 else "{config.scene_type}"
            else:
                IMAGE_PATH = r"{image_path}"
                SCENE_TYPE = "{config.scene_type}"

            # ─── Paramètres ──────────────────────────────────────────────────
            GLOBAL_SCALE  = {config.global_scale}
            DEPTH_STRENGTH = {config.depth_strength}
            OUTPUT_PATH   = r"{config.output_path}"

            def deg2rad(d): return math.radians(d)
        """)

    def _utilities(self) -> str:
        return textwrap.dedent("""\

            # ═══════════════════════════════════════════════════════════════
            #  UTILITAIRES
            # ═══════════════════════════════════════════════════════════════

            def clear_scene():
                bpy.ops.object.select_all(action='SELECT')
                bpy.ops.object.delete(use_global=False)
                for mat in bpy.data.materials:
                    bpy.data.materials.remove(mat)
                for img in bpy.data.images:
                    bpy.data.images.remove(img)

            def load_image(path):
                \"\"\"Charge une image Blender depuis un chemin.\"\"\"
                if not os.path.exists(path):
                    raise FileNotFoundError(f"Image introuvable : {path}")
                return bpy.data.images.load(path, check_existing=True)

            def make_image_material(name, image, is_emissive=True):
                \"\"\"Crée un matériau avec une image comme texture de base.\"\"\"
                mat = bpy.data.materials.new(name=name)
                mat.use_nodes = True
                nodes = mat.node_tree.nodes
                links = mat.node_tree.links
                nodes.clear()

                output = nodes.new("ShaderNodeOutputMaterial")
                principled = nodes.new("ShaderNodeBsdfPrincipled")
                tex_node = nodes.new("ShaderNodeTexImage")
                tex_node.image = image

                principled.inputs["Roughness"].default_value = 1.0
                principled.inputs["Metallic"].default_value = 0.0

                if is_emissive:
                    emission = nodes.new("ShaderNodeEmission")
                    links.new(tex_node.outputs["Color"], emission.inputs["Color"])
                    links.new(emission.outputs["Emission"], output.inputs["Surface"])
                else:
                    links.new(tex_node.outputs["Color"], principled.inputs["Base Color"])
                    links.new(principled.outputs["BSDF"], output.inputs["Surface"])

                return mat

            def assign_material(obj, mat):
                if obj.data.materials:
                    obj.data.materials[0] = mat
                else:
                    obj.data.materials.append(mat)

            clear_scene()
            source_image = load_image(IMAGE_PATH)
        """)

    def _build_exterior(self, image_path: str, config: ProjectionConfig) -> str:
        return textwrap.dedent(f"""\

            # ═══════════════════════════════════════════════════════════════
            #  EXTÉRIEUR : CUBE INVERSÉ / SKYBOX
            # ═══════════════════════════════════════════════════════════════

            def build_exterior_scene():
                scale = GLOBAL_SCALE

                # Créer le cube inversé (normales vers l'intérieur = skybox)
                bpy.ops.mesh.primitive_cube_add(size=scale * 2, location=(0, 0, scale * 0.3))
                skybox = bpy.context.active_object
                skybox.name = "Skybox_Cube"

                # Inverser les normales pour que la texture soit visible de l'intérieur
                bpy.ops.object.mode_set(mode='EDIT')
                bpy.ops.mesh.select_all(action='SELECT')
                bpy.ops.mesh.flip_normals()
                bpy.ops.object.mode_set(mode='OBJECT')

                # Appliquer la projection UV (cube projection)
                bpy.ops.object.mode_set(mode='EDIT')
                bpy.ops.uv.cube_project(cube_size=scale * 2)
                bpy.ops.object.mode_set(mode='OBJECT')

                # Matériau émissif avec l'image source
                mat_sky = make_image_material("Skybox_Mat", source_image, is_emissive=True)
                assign_material(skybox, mat_sky)

                # Sol avec légère réflexion
                bpy.ops.mesh.primitive_plane_add(size=scale * 2.5, location=(0, 0, -0.05))
                ground = bpy.context.active_object
                ground.name = "Ground_Plane"

                mat_ground = bpy.data.materials.new("Ground_Mat")
                mat_ground.use_nodes = True
                bsdf = mat_ground.node_tree.nodes.get("Principled BSDF")
                if bsdf:
                    # Récupérer la couleur du bas de l'image pour le sol
                    bsdf.inputs["Base Color"].default_value = (0.08, 0.08, 0.08, 1.0)
                    bsdf.inputs["Roughness"].default_value = 0.9
                assign_material(ground, mat_ground)

                # Empty central (cible de la caméra)
                bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 1.0))
                target = bpy.context.active_object
                target.name = "Scene_Target"

                return skybox, ground, target

            skybox_obj, ground_obj, target_obj = build_exterior_scene()
        """)

    def _build_interior(self, image_path: str, config: ProjectionConfig) -> str:
        return textwrap.dedent(f"""\

            # ═══════════════════════════════════════════════════════════════
            #  INTÉRIEUR : PIÈCE AVEC PROJECTION D'IMAGE
            # ═══════════════════════════════════════════════════════════════

            def build_interior_scene():
                scale = GLOBAL_SCALE * 0.5  # pièce plus petite

                # Créer la géométrie de base de la pièce
                def make_wall(name, location, rotation, size_x, size_y):
                    bpy.ops.mesh.primitive_plane_add(size=1, location=location)
                    obj = bpy.context.active_object
                    obj.name = name
                    obj.scale = (size_x, size_y, 1)
                    obj.rotation_euler = Euler([deg2rad(r) for r in rotation], 'XYZ')
                    # Subdivision légère pour le displacement
                    mod = obj.modifiers.new("Subdiv", "SUBSURF")
                    mod.levels = 3
                    bpy.ops.object.modifier_apply(modifier="Subdiv")
                    return obj

                # Sol
                floor = make_wall("Floor", (0, 0, 0), (0, 0, 0), scale, scale)
                # Mur arrière
                wall_back = make_wall("Wall_Back", (0, scale/2, scale/2), (90, 0, 0), scale, scale)
                # Mur gauche
                wall_left = make_wall("Wall_Left", (-scale/2, 0, scale/2), (90, 0, 90), scale, scale)
                # Mur droit
                wall_right = make_wall("Wall_Right", (scale/2, 0, scale/2), (90, 0, -90), scale, scale)
                # Plafond
                ceiling = make_wall("Ceiling", (0, 0, scale), (180, 0, 0), scale, scale)

                # Appliquer la projection d'image sur tous les murs
                mat_walls = make_image_material("Interior_Mat", source_image, is_emissive=False)

                for obj in [floor, wall_back, wall_left, wall_right, ceiling]:
                    # UV Project depuis la vue
                    bpy.context.view_layer.objects.active = obj
                    bpy.ops.object.select_all(action='DESELECT')
                    obj.select_set(True)
                    bpy.ops.object.mode_set(mode='EDIT')
                    bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
                    bpy.ops.object.mode_set(mode='OBJECT')
                    assign_material(obj, mat_walls)

                # Empty central
                bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, scale * 0.3))
                target = bpy.context.active_object
                target.name = "Scene_Target"

                return floor, target

            floor_obj, target_obj = build_interior_scene()
        """)

    def _apply_depth(self, config: ProjectionConfig) -> str:
        if config.use_depth_map and config.depth_map_path:
            depth_path = config.depth_map_path.replace("\\", "/")
            return textwrap.dedent(f"""\

                # ═══════════════════════════════════════════════════════════════
                #  PROFONDEUR : Depth Map externe
                # ═══════════════════════════════════════════════════════════════
                def apply_depth_from_map():
                    depth_path = r"{depth_path}"
                    if not os.path.exists(depth_path):
                        print(f"[WARNING] Depth map introuvable : {{depth_path}}, utilisation de la profondeur artificielle")
                        apply_artificial_depth()
                        return

                    depth_img = bpy.data.images.load(depth_path, check_existing=True)

                    # Appliquer un displacement modifier sur le sol
                    if "Ground_Plane" in bpy.data.objects:
                        ground = bpy.data.objects["Ground_Plane"]

                        # Subdivision pour avoir assez de vertices
                        sub = ground.modifiers.new("Subsurf_Depth", "SUBSURF")
                        sub.levels = {config.depth_subdivisions}
                        bpy.ops.object.modifier_apply({{"modifier": "Subsurf_Depth"}})

                        # Displacement
                        displace = ground.modifiers.new("Displace_Depth", "DISPLACE")
                        displace.strength = DEPTH_STRENGTH

                        # Texture de displacement
                        tex = bpy.data.textures.new("Depth_Tex", type='IMAGE')
                        tex.image = depth_img
                        displace.texture = tex

                apply_depth_from_map()
            """)
        else:
            return textwrap.dedent(f"""\

                # ═══════════════════════════════════════════════════════════════
                #  PROFONDEUR : Artificielle (sans depth map)
                # ═══════════════════════════════════════════════════════════════
                def apply_artificial_depth():
                    \"\"\"
                    Crée une profondeur artificielle par :
                    - Plan avant légèrement rapproché
                    - Fond légèrement reculé
                    - Gradient Z progressif
                    \"\"\"
                    # Plan de premier plan (légèrement devant)
                    bpy.ops.mesh.primitive_plane_add(size=2, location=(0, -2, 0.5))
                    fg_plane = bpy.context.active_object
                    fg_plane.name = "FG_Plane"
                    fg_mat = bpy.data.materials.new("FG_Transparent")
                    fg_mat.use_nodes = True
                    fg_mat.blend_method = 'BLEND'
                    bsdf = fg_mat.node_tree.nodes.get("Principled BSDF")
                    if bsdf:
                        bsdf.inputs["Alpha"].default_value = 0.0  # Invisible (juste pour la profondeur)
                    assign_material(fg_plane, fg_mat)

                    # Offset Z léger sur le sol pour simuler la profondeur
                    if "Ground_Plane" in bpy.data.objects:
                        ground = bpy.data.objects["Ground_Plane"]
                        # Légère inclinaison pour simulation de perspective
                        ground.rotation_euler.x = deg2rad(-2)

                apply_artificial_depth()
            """)

    def _setup_camera(self, config: ProjectionConfig) -> str:
        """Configure la caméra selon le mode cinématographique."""
        # Presets caméra pour la projection 2.5D
        camera_presets = {
            "wide": {
                "pos": (0.0, -8.0, 1.7),
                "rot": (88.0, 0.0, 0.0),
                "lens": 24.0,
                "desc": "Plan large — vue d'ensemble",
            },
            "close": {
                "pos": (0.0, -1.5, 1.65),
                "rot": (88.0, 0.0, 0.0),
                "lens": 85.0,
                "desc": "Plan serré — détail / portrait",
            },
            "over_shoulder": {
                "pos": (0.5, -2.0, 1.75),
                "rot": (80.0, 0.0, -10.0),
                "lens": 50.0,
                "desc": "Over-shoulder — dialogue",
            },
            "low_angle": {
                "pos": (0.0, -4.0, 0.4),
                "rot": (70.0, 0.0, 0.0),
                "lens": 28.0,
                "desc": "Contre-plongée — héroïsme",
            },
            "high_angle": {
                "pos": (0.0, -3.0, 5.0),
                "rot": (120.0, 0.0, 0.0),
                "lens": 35.0,
                "desc": "Plongée — vulnérabilité",
            },
        }

        cam = camera_presets.get(config.camera_mode, camera_presets["wide"])
        pos = cam["pos"]
        rot = cam["rot"]

        return textwrap.dedent(f"""\

            # ═══════════════════════════════════════════════════════════════
            #  CAMÉRA CINÉMATOGRAPHIQUE : {config.camera_mode}
            #  {cam['desc']}
            # ═══════════════════════════════════════════════════════════════
            def setup_cinematic_camera():
                bpy.ops.object.camera_add(location={list(pos)})
                cam_obj = bpy.context.active_object
                cam_obj.name = "Projection_Camera"
                cam_obj.rotation_euler = Euler([deg2rad(r) for r in {list(rot)}], 'XYZ')

                cam_data = cam_obj.data
                cam_data.lens = {cam['lens']}
                cam_data.sensor_width = 36.0  # format 35mm
                cam_data.clip_start = 0.1
                cam_data.clip_end = 500.0

                # Depth of Field
                cam_data.dof.use_dof = {str(config.dof_enabled)}
                cam_data.dof.aperture_fstop = {config.f_stop}

                # Pointer vers la cible centrale
                if "Scene_Target" in bpy.data.objects:
                    target = bpy.data.objects["Scene_Target"]
                    cam_data.dof.focus_object = target

                bpy.context.scene.camera = cam_obj
                return cam_obj

            camera_obj = setup_cinematic_camera()

            # Éclairage minimal (monde)
            world = bpy.data.worlds["World"]
            world.use_nodes = True
            bg = world.node_tree.nodes.get("Background")
            if bg:
                bg.inputs["Color"].default_value = (0.05, 0.05, 0.05, 1.0)
                bg.inputs["Strength"].default_value = 1.0
        """)

    def _plant_assets(self, config: ProjectionConfig) -> str:
        asset_path = config.tree_asset_path or ""
        return textwrap.dedent(f"""\

            # ═══════════════════════════════════════════════════════════════
            #  PLANTATION PROCÉDURALE D'ASSETS
            # ═══════════════════════════════════════════════════════════════
            def plant_assets(asset_type="tree", count={config.tree_count}, area_bounds=8.0):
                \"\"\"
                Distribue des assets de façon procédurale dans la scène.

                Comportement :
                - Import de l'asset depuis la librairie (ou fallback primitif)
                - Duplication linked (économie de mémoire)
                - Placement aléatoire contrôlé
                - Jitter rotation/scale
                \"\"\"
                asset_path = r"{asset_path}"
                random.seed(42)  # Seed fixe pour la reproductibilité

                # Essayer d'importer l'asset depuis la librairie
                master_asset = None
                if asset_path and os.path.exists(asset_path):
                    try:
                        # Import du .blend
                        if asset_path.endswith(".blend"):
                            with bpy.data.libraries.load(asset_path, link=False) as (data_from, data_to):
                                if data_from.objects:
                                    data_to.objects = [data_from.objects[0]]
                            if bpy.context.scene.objects:
                                master_asset = bpy.data.objects[data_from.objects[0]]
                        print(f"[PlantAssets] Asset chargé : {{asset_path}}")
                    except Exception as e:
                        print(f"[PlantAssets] Erreur chargement asset : {{e}}, utilisation du fallback")

                # Fallback : cône stylisé pour les arbres
                if master_asset is None:
                    bpy.ops.mesh.primitive_cone_add(
                        vertices=6, radius1=0.5, depth=2.5, location=(99, 99, 99)
                    )
                    master_asset = bpy.context.active_object
                    master_asset.name = f"{{asset_type}}_Master"
                    # Couleur verte
                    mat = bpy.data.materials.new(f"{{asset_type}}_Mat")
                    mat.use_nodes = True
                    bsdf = mat.node_tree.nodes.get("Principled BSDF")
                    if bsdf:
                        bsdf.inputs["Base Color"].default_value = (0.15, 0.4, 0.12, 1.0)
                        bsdf.inputs["Roughness"].default_value = 0.9
                    if master_asset.data.materials:
                        master_asset.data.materials[0] = mat
                    else:
                        master_asset.data.materials.append(mat)
                    master_asset.hide_render = True
                    master_asset.hide_viewport = True

                # Distribuer les instances
                placed_positions = []
                placed = 0
                attempts = 0
                max_attempts = count * 20

                while placed < count and attempts < max_attempts:
                    attempts += 1
                    x = random.uniform(-area_bounds, area_bounds)
                    y = random.uniform(0, area_bounds)

                    # Vérification simple d'anti-intersection
                    too_close = any(
                        abs(x - px) < 1.5 and abs(y - py) < 1.5
                        for px, py in placed_positions
                    )
                    if too_close:
                        continue

                    # Dupliquer l'asset
                    bpy.ops.object.select_all(action='DESELECT')
                    master_asset.select_set(True)
                    bpy.context.view_layer.objects.active = master_asset
                    bpy.ops.object.duplicate_move(
                        OBJECT_OT_duplicate={{"linked": True}},
                        TRANSFORM_OT_translate={{"value": (x, y, 0)}}
                    )
                    instance = bpy.context.active_object
                    instance.name = f"{{asset_type}}_{{placed + 1:03d}}"
                    instance.location = (x, y, 0)

                    # Jitter rotation et scale
                    instance.rotation_euler.z = random.uniform(0, 2 * math.pi)
                    scale = random.uniform(0.9, 1.1)
                    instance.scale = (scale, scale, scale)

                    instance.hide_render = False
                    instance.hide_viewport = False

                    placed_positions.append((x, y))
                    placed += 1

                print(f"[PlantAssets] {{placed}} {{asset_type}}(s) placé(s)")
                return placed

            n_placed = plant_assets(asset_type="tree", count={config.tree_count}, area_bounds=GLOBAL_SCALE)
        """)

    def _render_settings(self, config: ProjectionConfig) -> str:
        engine_map = {
            "EEVEE": "BLENDER_EEVEE",
            "CYCLES": "CYCLES",
        }
        engine = engine_map.get(config.engine.upper(), "BLENDER_EEVEE")
        output_path = config.output_path.replace("\\", "/")

        return textwrap.dedent(f"""\

            # ═══════════════════════════════════════════════════════════════
            #  PARAMÈTRES DE RENDU
            # ═══════════════════════════════════════════════════════════════
            scene = bpy.context.scene
            scene.render.engine = '{engine}'
            scene.render.resolution_x = {config.resolution_x}
            scene.render.resolution_y = {config.resolution_y}
            scene.render.resolution_percentage = 100
            scene.render.image_settings.file_format = '{config.output_format}'
            scene.render.filepath = r"{output_path}"

            if '{engine}' == 'CYCLES':
                scene.cycles.samples = {config.samples}
                scene.cycles.use_denoising = True
            else:
                scene.eevee.taa_render_samples = {config.samples}
                scene.eevee.use_bloom = True
                scene.eevee.use_ssr = True  # Screen-Space Reflections

            # Lancer le rendu
            bpy.ops.render.render(write_still=True)
            print(f"STORYCORE_RENDER_COMPLETE:{{scene.render.filepath}}")
        """)


# ─────────────────────────────────────────────────────────────────────────────
#  FONCTION PUBLIQUE PRINCIPALE
# ─────────────────────────────────────────────────────────────────────────────

def build_projected_scene(
    image_path: str,
    scene_type: str = "exterior",
    config: Optional[Dict[str, Any]] = None,
    output_script_path: Optional[str] = None,
) -> str:
    """
    Point d'entrée principal : génère un script Blender de scène 2.5D.

    Args:
        image_path         : chemin vers l'image source
        scene_type         : "exterior" ou "interior"
        config             : dict de configuration (voir ProjectionConfig)
        output_script_path : chemin de sortie du script (auto si None)

    Returns:
        Chemin absolu du script Python Blender généré

    Exemple CLI :
        blender -b -P <script.py> -- image.png exterior

    Exemple Python :
        script = build_projected_scene("scene.png", "exterior", {"camera_mode": "low_angle"})
        # Puis : runner.execute(script)
    """
    cfg_dict = config or {}
    cfg_dict["scene_type"] = scene_type
    cfg = ProjectionConfig.from_dict(cfg_dict)

    builder = ProjectionSceneBuilder()
    script_path = builder.generate(image_path, cfg, output_script_path)

    return script_path
