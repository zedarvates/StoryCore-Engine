"""
script_generator.py — Générateur de scripts Python Blender
===========================================================

Transforme un SceneJSON en script Python exécutable par Blender en mode headless.

Séparation stricte des responsabilités :
  - description narrative  → SceneJSON  (couche métier)
  - description technique  → ce module  (couche technique 3D)
  - exécution Blender      → headless_runner.py

Le script généré est autonome : il peut être relu, modifié, versionné.
"""

from __future__ import annotations
import os
import uuid
import textwrap
from pathlib import Path
from typing import Optional
from datetime import datetime

from blender_bridge.scene_types import (
    SceneJSON, SceneType, ShotType, AtmosphereType,
    LightType, RigType,
)


# ─────────────────────────────────────────────────────────────────────────────
#  TEMPLATES DE BLOCS
# ─────────────────────────────────────────────────────────────────────────────

_HEADER = '''\
#!/usr/bin/env python3
"""
Script Blender auto-généré par StoryCore-Engine BlenderBridge
Scene  : {scene_id}
Date   : {date}
Desc   : {description}
"""
import bpy
import math
import random
from mathutils import Vector, Euler


# ═══════════════════════════════════════════════════════════════
#  UTILITAIRES
# ═══════════════════════════════════════════════════════════════

def deg2rad(d):
    return math.radians(d)

def clear_scene():
    """Vide la scène Blender par défaut."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    # Nettoyer les matériaux orphelins
    for mat in bpy.data.materials:
        bpy.data.materials.remove(mat)
    for mesh in bpy.data.meshes:
        bpy.data.meshes.remove(mesh)

def make_material(name, color=(0.8, 0.8, 0.8, 1.0), metallic=0.0, roughness=0.5, emission_strength=0.0):
    """Crée un matériau PBR simple."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emission_strength > 0:
            bsdf.inputs["Emission Strength"].default_value = emission_strength
            bsdf.inputs["Emission Color"].default_value = color
    return mat

def assign_material(obj, mat):
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)

clear_scene()
'''

_WORLD_TEMPLATE = '''\

# ═══════════════════════════════════════════════════════════════
#  MONDE (sky / ambiance globale)
# ═══════════════════════════════════════════════════════════════
world = bpy.data.worlds["World"]
world.use_nodes = True
bg_node = world.node_tree.nodes.get("Background")
if bg_node:
    bg_node.inputs["Color"].default_value = {world_color}
    bg_node.inputs["Strength"].default_value = {world_strength}
'''

_LIGHT_TEMPLATE = '''\
# Lumière : {name}
bpy.ops.object.light_add(type='{light_type}', location={position})
light_obj = bpy.context.active_object
light_obj.name = "{name}"
light_obj.rotation_euler = Euler([deg2rad(r) for r in {rotation}], 'XYZ')
light_obj.data.energy = {energy}
light_obj.data.color = {color}
light_obj.data.use_shadow = {cast_shadow}
'''

_CAMERA_TEMPLATE = '''\

# ═══════════════════════════════════════════════════════════════
#  CAMÉRA CINÉMATOGRAPHIQUE
#  Plan : {shot_type} | Focale : {lens}mm | DoF : {dof_enabled}
# ═══════════════════════════════════════════════════════════════
bpy.ops.object.camera_add(location={position})
cam_obj = bpy.context.active_object
cam_obj.name = "StoryCore_Camera"
cam_obj.rotation_euler = Euler([deg2rad(r) for r in {rotation}], 'XYZ')

cam_data = cam_obj.data
cam_data.lens = {lens}
cam_data.sensor_width = {sensor_width}
cam_data.clip_start = 0.1
cam_data.clip_end = 1000.0

# Depth of Field
cam_data.dof.use_dof = {dof_enabled}
cam_data.dof.aperture_fstop = {f_stop}
cam_data.dof.focus_distance = {focus_dist}

# Cible de l'empty pour pointer la caméra
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
cam_target = bpy.context.active_object
cam_target.name = "Camera_Target"
bpy.context.scene.camera = cam_obj
'''

_RENDER_TEMPLATE = '''\

# ═══════════════════════════════════════════════════════════════
#  PARAMÈTRES DE RENDU
# ═══════════════════════════════════════════════════════════════
scene = bpy.context.scene
scene.render.engine = '{engine}'
scene.render.resolution_x = {resolution_x}
scene.render.resolution_y = {resolution_y}
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = '{output_format}'
scene.render.filepath = r"{output_path}"
scene.frame_start = {frame_start}
scene.frame_end = {frame_end}
scene.render.fps = {fps}

# Denoiser
if '{engine}' == 'CYCLES':
    scene.cycles.samples = {samples}
    scene.cycles.use_denoising = {use_denoiser}
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
elif '{engine}' == 'BLENDER_EEVEE':
    scene.eevee.taa_render_samples = {samples}

# Lancer le rendu
bpy.ops.render.render(write_still=True)
print("STORYCORE_RENDER_COMPLETE:" + scene.render.filepath)
'''


# ─────────────────────────────────────────────────────────────────────────────
#  GÉNÉRATEUR PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────

class BlenderScriptGenerator:
    """
    Génère des scripts Python Blender depuis une description SceneJSON.

    Le script résultant est :
    - autonome (pas de dépendances externes)
    - exécutable en headless via : blender -b -P <script.py>
    - lisible et modifiable manuellement
    - versionnable (texte pur)
    """

    def __init__(self, scripts_dir: str = "./exports/blender/scripts"):
        self.scripts_dir = Path(scripts_dir)
        self.scripts_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, scene: SceneJSON, output_path: Optional[str] = None) -> str:
        """
        Génère le script Python Blender pour la scène.

        Args:
            scene       : description structurée de la scène
            output_path : chemin de sortie du script (auto si None)

        Returns:
            Chemin absolu du script généré
        """
        blocks = []

        # En-tête
        blocks.append(_HEADER.format(
            scene_id=scene.scene_id,
            date=datetime.now().isoformat(timespec="seconds"),
            description=scene.description,
        ))

        # Sol de base
        blocks.append(self._generate_ground(scene))

        # Monde / ciel
        blocks.append(self._generate_world(scene))

        # Lumières
        blocks.append(self._generate_lighting(scene))

        # Atmosphère volumétrique
        if scene.atmosphere.type != AtmosphereType.NONE:
            blocks.append(self._generate_atmosphere(scene))

        # Caméra
        blocks.append(self._generate_camera(scene))

        # Personnages (rigs placeholder)
        for char in scene.characters:
            blocks.append(self._generate_character_rig(char, scene))

        # Props de décor
        for prop in scene.props:
            blocks.append(self._generate_prop(prop))

        # Paramètres de rendu
        blocks.append(self._generate_render(scene))

        # Assemblage
        script_content = "\n".join(blocks)

        # Chemin de sortie
        if output_path is None:
            script_name = f"scene_{scene.scene_id}_{uuid.uuid4().hex[:8]}.py"
            output_path = str(self.scripts_dir / script_name)

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(script_content)

        return output_path

    # ─── BLOCS INTERNES ─────────────────────────────────────────────────────

    def _generate_ground(self, scene: SceneJSON) -> str:
        """Génère un sol adapté au type de scène."""
        if scene.scene_type == SceneType.INTERIOR:
            return textwrap.dedent("""\

                # ═══════════════════════════════════════════════════════════════
                #  INTÉRIEUR : pièce de base (4 murs + sol + plafond)
                # ═══════════════════════════════════════════════════════════════
                # Sol
                bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
                floor = bpy.context.active_object
                floor.name = "Floor"
                mat_floor = make_material("Floor_Mat", color=(0.15, 0.12, 0.1, 1.0), roughness=0.9)
                assign_material(floor, mat_floor)

                # Mur arrière
                bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 10, 2.5))
                wall_back = bpy.context.active_object
                wall_back.name = "Wall_Back"
                wall_back.scale = (10, 0.15, 2.5)
                mat_wall = make_material("Wall_Mat", color=(0.4, 0.38, 0.35, 1.0), roughness=0.8)
                assign_material(wall_back, mat_wall)
                bpy.ops.object.transform_apply(scale=True)

                # Mur gauche
                bpy.ops.mesh.primitive_cube_add(size=1, location=(-10, 0, 2.5))
                wall_l = bpy.context.active_object
                wall_l.name = "Wall_Left"
                wall_l.scale = (0.15, 10, 2.5)
                assign_material(wall_l, mat_wall)
                bpy.ops.object.transform_apply(scale=True)

                # Mur droit
                bpy.ops.mesh.primitive_cube_add(size=1, location=(10, 0, 2.5))
                wall_r = bpy.context.active_object
                wall_r.name = "Wall_Right"
                wall_r.scale = (0.15, 10, 2.5)
                assign_material(wall_r, mat_wall)
                bpy.ops.object.transform_apply(scale=True)

                # Plafond
                bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 5))
                ceiling = bpy.context.active_object
                ceiling.name = "Ceiling"
                mat_ceil = make_material("Ceil_Mat", color=(0.3, 0.3, 0.3, 1.0), roughness=0.9)
                assign_material(ceiling, mat_ceil)
            """)
        else:
            return textwrap.dedent("""\

                # ═══════════════════════════════════════════════════════════════
                #  EXTÉRIEUR : sol et environnement de base
                # ═══════════════════════════════════════════════════════════════
                bpy.ops.mesh.primitive_plane_add(size=100, location=(0, 0, 0))
                ground = bpy.context.active_object
                ground.name = "Ground"
                mat_ground = make_material("Ground_Mat", color=(0.1, 0.1, 0.1, 1.0), roughness=0.95)
                assign_material(ground, mat_ground)
            """)

    def _generate_world(self, scene: SceneJSON) -> str:
        L = scene.lighting
        wc = L.world_color
        color_str = f"({wc[0]:.3f}, {wc[1]:.3f}, {wc[2]:.3f}, 1.0)"
        return _WORLD_TEMPLATE.format(
            world_color=color_str,
            world_strength=L.world_strength,
        )

    def _generate_lighting(self, scene: SceneJSON) -> str:
        L = scene.lighting
        blocks = ["\n# ═══════════════════════════════════════════════════════════════",
                  "#  ÉCLAIRAGE",
                  "# ═══════════════════════════════════════════════════════════════"]

        if not L.lights:
            # Éclairage par défaut si aucun défini
            blocks.append(textwrap.dedent("""\
                # Lumière principale par défaut
                bpy.ops.object.light_add(type='SUN', location=(4, -4, 6))
                key_light = bpy.context.active_object
                key_light.name = "Key_Light"
                key_light.rotation_euler = Euler([deg2rad(45), 0, deg2rad(45)], 'XYZ')
                key_light.data.energy = 3.0
                key_light.data.color = (1.0, 0.95, 0.85)

                # Fill light doux
                bpy.ops.object.light_add(type='AREA', location=(-4, -2, 4))
                fill_light = bpy.context.active_object
                fill_light.name = "Fill_Light"
                fill_light.data.energy = 1.5
                fill_light.data.size = 4.0
                fill_light.data.color = (0.7, 0.8, 1.0)
            """))
        else:
            for light in L.lights:
                lt_map = {
                    LightType.SUN: "SUN",
                    LightType.AREA: "AREA",
                    LightType.POINT: "POINT",
                    LightType.SPOT: "SPOT",
                    LightType.HEMI: "SUN",
                }
                lt_str = lt_map.get(light.light_type, "SUN")
                color_str = f"({light.color[0]:.3f}, {light.color[1]:.3f}, {light.color[2]:.3f})"
                blocks.append(_LIGHT_TEMPLATE.format(
                    name=light.name,
                    light_type=lt_str,
                    position=list(light.position),
                    rotation=list(light.rotation),
                    energy=light.energy,
                    color=color_str,
                    cast_shadow=str(light.cast_shadow),
                ))

        return "\n".join(blocks)

    def _generate_atmosphere(self, scene: SceneJSON) -> str:
        atm = scene.atmosphere
        color_str = f"({atm.color[0]:.3f}, {atm.color[1]:.3f}, {atm.color[2]:.3f}, 1.0)"

        if atm.type in (AtmosphereType.FOG, AtmosphereType.MIST):
            return textwrap.dedent(f"""\

                # ═══════════════════════════════════════════════════════════════
                #  ATMOSPHÈRE : Brouillard / Mist
                # ═══════════════════════════════════════════════════════════════
                bpy.context.scene.world.mist_settings.use_mist = True
                bpy.context.scene.world.mist_settings.intensity = {atm.density:.3f}
                bpy.context.scene.world.mist_settings.start = 2.0
                bpy.context.scene.world.mist_settings.depth = 50.0
                bpy.context.scene.world.mist_settings.falloff = 'QUADRATIC'
            """)

        elif atm.type == AtmosphereType.VOLUMETRIC:
            return textwrap.dedent(f"""\

                # ═══════════════════════════════════════════════════════════════
                #  ATMOSPHÈRE : Volume Scatter (brouillard volumétrique)
                # ═══════════════════════════════════════════════════════════════
                bpy.ops.mesh.primitive_cube_add(size=100, location=(0, 0, 25))
                vol_cube = bpy.context.active_object
                vol_cube.name = "Atmosphere_Volume"

                mat_vol = bpy.data.materials.new(name="Atmosphere_Mat")
                mat_vol.use_nodes = True
                nodes = mat_vol.node_tree.nodes
                links = mat_vol.node_tree.links
                nodes.clear()

                output_node = nodes.new(type='ShaderNodeOutputMaterial')
                vol_scatter = nodes.new(type='ShaderNodeVolumeScatter')
                vol_scatter.inputs["Color"].default_value = {color_str}
                vol_scatter.inputs["Density"].default_value = {atm.density:.4f}
                vol_scatter.inputs["Anisotropy"].default_value = {atm.anisotropy:.3f}
                links.new(vol_scatter.outputs["Volume"], output_node.inputs["Volume"])

                if vol_cube.data.materials:
                    vol_cube.data.materials[0] = mat_vol
                else:
                    vol_cube.data.materials.append(mat_vol)
            """)

        elif atm.type == AtmosphereType.RAIN:
            return textwrap.dedent(f"""\

                # ═══════════════════════════════════════════════════════════════
                #  ATMOSPHÈRE : Pluie (particles)
                # ═══════════════════════════════════════════════════════════════
                bpy.ops.mesh.primitive_plane_add(size=50, location=(0, 0, 15))
                rain_emitter = bpy.context.active_object
                rain_emitter.name = "Rain_Emitter"

                # Système de particules pour la pluie
                bpy.ops.object.particle_system_add()
                ps = rain_emitter.particle_systems[0]
                ps.name = "Rain_Particles"
                settings = ps.settings
                settings.count = 10000
                settings.lifetime = 50
                settings.emit_from = 'FACE'
                settings.physics_type = 'NEWTON'
                settings.normal_factor = 0.0
                settings.factor_random = 0.1
                settings.use_die_on_hit = True

                # Volume scatter léger pour l'effet pluie
                bpy.context.scene.world.mist_settings.use_mist = True
                bpy.context.scene.world.mist_settings.intensity = {atm.density * 0.5:.3f}
                bpy.context.scene.world.mist_settings.start = 5.0
                bpy.context.scene.world.mist_settings.depth = 80.0
            """)

        else:
            return f"\n# Atmosphère : {atm.type.value} (non implémentée dans ce template)\n"

    def _generate_camera(self, scene: SceneJSON) -> str:
        cam = scene.camera
        pos = list(cam.position)
        rot = list(cam.rotation)
        return _CAMERA_TEMPLATE.format(
            shot_type=cam.shot_type.value,
            lens=cam.lens,
            dof_enabled=str(cam.dof_enabled),
            position=pos,
            rotation=rot,
            sensor_width=cam.sensor_width,
            f_stop=cam.f_stop,
            focus_dist=cam.focus_dist,
        )

    def _generate_character_rig(self, char, scene: SceneJSON) -> str:
        """Génère un rig placeholder humanoïde pour un personnage."""
        pos = list(char.position)
        mc = char.material_color
        color_str = f"({mc[0]:.3f}, {mc[1]:.3f}, {mc[2]:.3f}, 1.0)"
        h = char.height
        safe_name = char.name.replace(" ", "_").replace("-", "_")

        # Calcul orientation vers la caméra si demandé
        facing_code = ""
        if char.facing_camera:
            cam_pos = scene.camera.position
            facing_code = textwrap.dedent(f"""\
                import math
                dx = {cam_pos[0]:.3f} - {pos[0]:.3f}
                dy = {cam_pos[1]:.3f} - {pos[1]:.3f}
                angle_to_cam = math.atan2(dx, dy)
                rig_{safe_name}.rotation_euler.z = angle_to_cam
            """)

        return textwrap.dedent(f"""\

            # ═══════════════════════════════════════════════════════════════
            #  PANTIN (RIG PLACEHOLDER) : {char.name}
            # ═══════════════════════════════════════════════════════════════
            def create_humanoid_rig_{safe_name}():
                scale_factor = {h:.3f} / 1.75  # normalise par rapport à 1.75m
                mat_{safe_name} = make_material("{safe_name}_Mat", color={color_str}, roughness=0.7)

                # Corps (torse)
                bpy.ops.mesh.primitive_cylinder_add(
                    radius=0.18 * scale_factor, depth=0.55 * scale_factor,
                    location=({pos[0]:.3f}, {pos[1]:.3f}, {h * 0.55:.3f})
                )
                torso = bpy.context.active_object
                torso.name = "{safe_name}_Torso"
                assign_material(torso, mat_{safe_name})

                # Tête
                bpy.ops.mesh.primitive_uv_sphere_add(
                    radius=0.12 * scale_factor,
                    location=({pos[0]:.3f}, {pos[1]:.3f}, {h * 0.92:.3f})
                )
                head = bpy.context.active_object
                head.name = "{safe_name}_Head"
                assign_material(head, mat_{safe_name})

                # Bassin
                bpy.ops.mesh.primitive_cylinder_add(
                    radius=0.16 * scale_factor, depth=0.2 * scale_factor,
                    location=({pos[0]:.3f}, {pos[1]:.3f}, {h * 0.48:.3f})
                )
                pelvis = bpy.context.active_object
                pelvis.name = "{safe_name}_Pelvis"
                assign_material(pelvis, mat_{safe_name})

                # Bras gauche
                bpy.ops.mesh.primitive_cylinder_add(
                    radius=0.055 * scale_factor, depth=0.55 * scale_factor,
                    location=({pos[0] - 0.28:.3f}, {pos[1]:.3f}, {h * 0.62:.3f})
                )
                arm_l = bpy.context.active_object
                arm_l.name = "{safe_name}_Arm_L"
                arm_l.rotation_euler = Euler([deg2rad(0), deg2rad(90), deg2rad(15)], 'XYZ')
                assign_material(arm_l, mat_{safe_name})

                # Bras droit
                bpy.ops.mesh.primitive_cylinder_add(
                    radius=0.055 * scale_factor, depth=0.55 * scale_factor,
                    location=({pos[0] + 0.28:.3f}, {pos[1]:.3f}, {h * 0.62:.3f})
                )
                arm_r = bpy.context.active_object
                arm_r.name = "{safe_name}_Arm_R"
                arm_r.rotation_euler = Euler([deg2rad(0), deg2rad(90), deg2rad(-15)], 'XYZ')
                assign_material(arm_r, mat_{safe_name})

                # Jambe gauche
                bpy.ops.mesh.primitive_cylinder_add(
                    radius=0.07 * scale_factor, depth=0.75 * scale_factor,
                    location=({pos[0] - 0.1:.3f}, {pos[1]:.3f}, {h * 0.22:.3f})
                )
                leg_l = bpy.context.active_object
                leg_l.name = "{safe_name}_Leg_L"
                assign_material(leg_l, mat_{safe_name})

                # Jambe droite
                bpy.ops.mesh.primitive_cylinder_add(
                    radius=0.07 * scale_factor, depth=0.75 * scale_factor,
                    location=({pos[0] + 0.1:.3f}, {pos[1]:.3f}, {h * 0.22:.3f})
                )
                leg_r = bpy.context.active_object
                leg_r.name = "{safe_name}_Leg_R"
                assign_material(leg_r, mat_{safe_name})

                # Grouper toutes les parties
                parts = [torso, head, pelvis, arm_l, arm_r, leg_l, leg_r]
                bpy.ops.object.select_all(action='DESELECT')
                for p in parts:
                    p.select_set(True)
                bpy.context.view_layer.objects.active = torso
                bpy.ops.object.parent_set(type='OBJECT', keep_transform=True)

                # Empties pour les articulations (utile pour l'animation)
                bpy.ops.object.empty_add(type='SPHERE', radius=0.04, location=({pos[0]:.3f}, {pos[1]:.3f}, {h:.3f}))
                root_empty = bpy.context.active_object
                root_empty.name = "{safe_name}_ROOT"

                return root_empty

            rig_{safe_name} = create_humanoid_rig_{safe_name}()
            {facing_code}
        """)

    def _generate_prop(self, prop) -> str:
        """Génère un objet de décor (import ou primitif)."""
        pos = list(prop.position)
        rot = list(prop.rotation)
        sc = list(prop.scale)

        if prop.asset_path:
            return textwrap.dedent(f"""\

                # PROP : {prop.name} (depuis asset)
                # Note : l'import de l'asset se fait via le script de plantation procédurale
                # voir blender_projection/plant_assets.py pour le placement d'assets librairie
                # Fallback : cube placeholder
                bpy.ops.mesh.primitive_cube_add(size=1, location={pos})
                prop_{prop.name.replace(' ', '_')} = bpy.context.active_object
                prop_{prop.name.replace(' ', '_')}.name = "{prop.name}"
                prop_{prop.name.replace(' ', '_')}.rotation_euler = Euler([deg2rad(r) for r in {rot}], 'XYZ')
                prop_{prop.name.replace(' ', '_')}.scale = {sc}
                bpy.ops.object.transform_apply(scale=True)
            """)
        else:
            return textwrap.dedent(f"""\

                # PROP (primitif) : {prop.name}
                bpy.ops.mesh.primitive_cube_add(size=1, location={pos})
                prop_{prop.name.replace(' ', '_')} = bpy.context.active_object
                prop_{prop.name.replace(' ', '_')}.name = "{prop.name}"
                prop_{prop.name.replace(' ', '_')}.rotation_euler = Euler([deg2rad(r) for r in {rot}], 'XYZ')
                prop_{prop.name.replace(' ', '_')}.scale = {sc}
                bpy.ops.object.transform_apply(scale=True)
            """)

    def _generate_render(self, scene: SceneJSON) -> str:
        r = scene.render
        return _RENDER_TEMPLATE.format(
            engine=r.engine,
            resolution_x=r.resolution_x,
            resolution_y=r.resolution_y,
            samples=r.samples,
            use_denoiser=str(r.use_denoiser),
            output_format=r.output_format,
            output_path=r.output_path.replace("\\", "/"),
            frame_start=r.frame_start,
            frame_end=r.frame_end,
            fps=r.fps,
        )
