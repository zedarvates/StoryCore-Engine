"""
asset_builder.py — Génération de scripts Blender pour objets d'histoire
========================================================================

Convertit un StoryObject en script Python Blender autonome qui crée
l'objet 3D procéduralement (géométrie + matériau).

Chaque objet est généré une seule fois et devient un asset Blender
réutilisable dans n'importe quelle scène.

Principe :
  StoryObject JSON → script .py autonome → exécuté par Blender headless
  → objet 3D dans la scène (ou rendu preview PNG)

Géométries supportées :
  blade, cylinder, box, sphere, disc, gem, lantern,
  book, key_shape, bottle, flat_plane, scroll, gun_body...

Usage :
    builder = StoryAssetBuilder()
    script = builder.build_script(epee)
    # → exports/blender/assets/scripts/Alpha_Epee.py

    # Ou : générer tous les objets d'un inventaire
    scripts = builder.build_inventory_scripts(inventory)
"""

from __future__ import annotations
import re
import hashlib
import logging
from pathlib import Path
from typing import Optional, List, Dict, Tuple

from story_assets.story_object import StoryObject, MATERIAL_PRESETS

logger = logging.getLogger(__name__)

# Dossier par défaut pour les scripts d'assets
DEFAULT_ASSETS_DIR = "./exports/blender/assets/scripts"


class StoryAssetBuilder:
    """
    Génère les scripts Blender Python pour créer les objets d'histoire en 3D.

    Chaque script est autonome et peut être exécuté directement par Blender :
        blender -b -P Alpha_Epee.py

    Les scripts incluent :
    - Nettoyage de la scène (mode asset isolation)
    - Création de la géométrie procédurale
    - Application du matériau Principled BSDF
    - Configuration caméra preview
    - Rendu PNG preview
    - Marqueur STORYCORE_ASSET_COMPLETE:<path>
    """

    def __init__(self, output_dir: str = DEFAULT_ASSETS_DIR):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    # ─── API PRINCIPALE ──────────────────────────────────────────────────────

    def build_script(
        self,
        obj: StoryObject,
        preview_output: Optional[str] = None,
        render_preview: bool = True,
    ) -> str:
        """
        Génère un script Blender Python pour créer un objet d'histoire.

        Args:
            obj            : StoryObject à matérialiser en 3D
            preview_output : chemin PNG de sortie (None = auto)
            render_preview : inclure un rendu preview dans le script

        Returns:
            Chemin du script .py généré
        """
        script_name = f"{self._safe_name(obj.blender_object_name)}.py"
        script_path = self.output_dir / script_name

        if preview_output is None:
            preview_output = str(
                self.output_dir.parent / "previews" / f"{self._safe_name(obj.blender_object_name)}_preview"
            )

        script_content = self._generate_script(obj, preview_output, render_preview)
        script_path.write_text(script_content, encoding="utf-8")

        # Mettre à jour le chemin du script dans l'objet
        obj.blender_script_path = str(script_path)
        obj.preview_image_path = preview_output + ".png"

        logger.info(f"[AssetBuilder] Script généré : {script_path}")
        return str(script_path)

    def build_inventory_scripts(self, inventory) -> List[str]:
        """
        Génère les scripts pour tous les objets d'un inventaire.

        Args:
            inventory : CharacterInventory

        Returns:
            Liste des chemins de scripts générés
        """
        scripts = []
        for obj in inventory.items:
            script = self.build_script(obj)
            scripts.append(script)
        return scripts

    def build_scene_embed_code(
        self,
        obj: StoryObject,
        position: Tuple[float, float, float] = (0.0, 0.0, 0.0),
        rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0),
        parent_rig_name: Optional[str] = None,
    ) -> str:
        """
        Génère le code Python Blender pour insérer l'objet dans une scène existante.

        Contrairement à `build_script()`, ce code est destiné à être
        INCLUS dans un script de scène, pas exécuté seul.

        Args:
            obj            : StoryObject à insérer
            position       : position XYZ dans la scène
            rotation       : rotation euler (degrés) XYZ
            parent_rig_name: nom du rig auquel attacher l'objet (optionnel)

        Returns:
            Code Python Blender à inclure dans un script de scène
        """
        mat = obj.material_preset
        geom = obj.geometry_type
        obj_name = self._safe_name(obj.blender_object_name)

        lines = [
            f"# ── Objet d'histoire : {obj.name} [{obj.object_type}] ──",
            f"# Description : {obj.description[:80] if obj.description else 'N/A'}",
            f"",
            f"def create_story_object_{obj_name}(scene):",
            f'    """Crée {obj.name} ({obj.object_type}) dans la scène Blender."""',
            f"    import bpy, math",
            f"",
        ]

        # Géométrie
        lines.extend(self._geometry_code(geom, obj_name, obj.scale))

        # Position et rotation
        lines += [
            f"    obj_{obj_name}.location = ({position[0]}, {position[1]}, {position[2]})",
            f"    obj_{obj_name}.rotation_euler = (",
            f"        math.radians({rotation[0]}),",
            f"        math.radians({rotation[1]}),",
            f"        math.radians({rotation[2]}),",
            f"    )",
            f"",
        ]

        # Matériau
        lines.extend(self._material_code(mat, obj_name, obj.name))

        # Parent rig
        if parent_rig_name:
            lines += [
                f"    # Attacher au rig",
                f"    if '{parent_rig_name}' in bpy.data.objects:",
                f"        obj_{obj_name}.parent = bpy.data.objects['{parent_rig_name}']",
                f"",
            ]

        lines += [
            f"    return obj_{obj_name}",
            f"",
            f"# Appel",
            f"story_obj_{obj_name} = create_story_object_{obj_name}(bpy.context.scene)",
        ]

        return "\n".join(lines)

    # ─── GÉNÉRATION DU SCRIPT COMPLET ────────────────────────────────────────

    def _generate_script(
        self,
        obj: StoryObject,
        preview_output: str,
        render_preview: bool,
    ) -> str:
        """Génère le script Blender Python complet pour un objet."""
        mat = obj.material_preset
        geom = obj.geometry_type
        obj_name = self._safe_name(obj.blender_object_name)
        preview_path = preview_output.replace("\\", "/")

        lines = [
            f'"""',
            f'Script Blender — Objet d\'histoire : {obj.name}',
            f'=================================================================',
            f'ID         : {obj.id}',
            f'Type       : {obj.object_type}',
            f'Proprietaire: {obj.owner or "aucun"}',
            f'Materiau   : {obj.material}',
            f'Description: {obj.description[:100] if obj.description else "N/A"}',
            f'Execution  : blender -b -P {obj_name}.py',
            f'"""',
            f'',
            f'import bpy',
            f'import sys',
            f'import math',
            f'from pathlib import Path',
            f'',
            f'# ── Nettoyage scene ──────────────────────────────────────────────────',
            f'bpy.ops.object.select_all(action="SELECT")',
            f'bpy.ops.object.delete()',
            f'',
            f'# ── Geometrie : {geom} ───────────────────────────────────────────────',
        ]

        # Code géométrie
        lines.extend(self._geometry_code(geom, obj_name, obj.scale, indent=""))
        lines += [""]

        # Matériau
        lines.extend(self._material_code(mat, obj_name, obj.name, indent=""))
        lines += [""]

        if render_preview:
            lines.extend(self._preview_render_code(obj_name, preview_path, obj.name))

        lines += [
            f'',
            f'print(f"STORYCORE_ASSET_COMPLETE:{preview_path}.png")',
        ]

        return "\n".join(lines)

    # ─── CODE DE GÉOMÉTRIE ────────────────────────────────────────────────────

    def _geometry_code(
        self,
        geom: str,
        obj_name: str,
        scale: Tuple[float, float, float],
        indent: str = "    ",
    ) -> List[str]:
        """Génère le code de création de géométrie Blender."""
        i = indent
        sx, sy, sz = scale

        builders = {
            "blade": self._geom_blade,
            "cylinder": self._geom_cylinder,
            "box": self._geom_box,
            "sphere": self._geom_sphere,
            "disc": self._geom_disc,
            "gem": self._geom_gem,
            "lantern": self._geom_lantern,
            "book": self._geom_book,
            "bottle": self._geom_bottle,
            "flat_plane": self._geom_flat_plane,
            "scroll": self._geom_scroll,
            "gun_body": self._geom_gun_body,
            "key_shape": self._geom_key_shape,
        }

        builder = builders.get(geom, self._geom_box)
        return builder(obj_name, sx, sy, sz, i)

    def _geom_blade(self, n, sx, sy, sz, i) -> List[str]:
        """Lame / épée : plan extrudé en forme de lame."""
        return [
            f"{i}bpy.ops.mesh.primitive_plane_add(size=1, location=(0,0,0))",
            f"{i}bpy.ops.object.mode_set(mode='EDIT')",
            f"{i}bpy.ops.mesh.select_all(action='SELECT')",
            f"{i}# Etirer en longueur (lame)",
            f"{i}bpy.ops.transform.resize(value=(0.08 * {sx}, 1.0 * {sy}, 1.0 * {sz}))",
            f"{i}bpy.ops.mesh.extrude_region_move(TRANSFORM_OT_translate={{\"value\": (0, 0, 0.02 * {sz})}})",
            f"{i}bpy.ops.object.mode_set(mode='OBJECT')",
            f"{i}obj_{n} = bpy.context.active_object",
            f"{i}obj_{n}.name = '{n}'",
        ]

    def _geom_cylinder(self, n, sx, sy, sz, i) -> List[str]:
        """Cylindre : bâton, outil, lance."""
        return [
            f"{i}bpy.ops.mesh.primitive_cylinder_add(",
            f"{i}    radius=0.04 * {sx},",
            f"{i}    depth=1.2 * {sz},",
            f"{i}    location=(0, 0, 0),",
            f"{i}    vertices=16,",
            f"{i})",
            f"{i}obj_{n} = bpy.context.active_object",
            f"{i}obj_{n}.name = '{n}'",
        ]

    def _geom_box(self, n, sx, sy, sz, i) -> List[str]:
        """Boîte générique."""
        return [
            f"{i}bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))",
            f"{i}obj_{n} = bpy.context.active_object",
            f"{i}obj_{n}.name = '{n}'",
            f"{i}obj_{n}.scale = ({0.4 * sx}, {0.6 * sy}, {0.3 * sz})",
            f"{i}bpy.ops.object.transform_apply(scale=True)",
        ]

    def _geom_sphere(self, n, sx, sy, sz, i) -> List[str]:
        """Sphère : nourriture, boule."""
        return [
            f"{i}bpy.ops.mesh.primitive_uv_sphere_add(",
            f"{i}    radius={0.15 * sx},",
            f"{i}    location=(0, 0, 0),",
            f"{i}    segments=16, ring_count=8,",
            f"{i})",
            f"{i}obj_{n} = bpy.context.active_object",
            f"{i}obj_{n}.name = '{n}'",
        ]

    def _geom_disc(self, n, sx, sy, sz, i) -> List[str]:
        """Disque aplati : bouclier."""
        return [
            f"{i}bpy.ops.mesh.primitive_cylinder_add(",
            f"{i}    radius={0.5 * sx}, depth={0.06 * sz},",
            f"{i}    location=(0, 0, 0), vertices=24,",
            f"{i})",
            f"{i}obj_{n} = bpy.context.active_object",
            f"{i}obj_{n}.name = '{n}'",
        ]

    def _geom_gem(self, n, sx, sy, sz, i) -> List[str]:
        """Gemme facettée : bijou."""
        return [
            f"{i}bpy.ops.mesh.primitive_ico_sphere_add(",
            f"{i}    radius={0.1 * sx}, subdivisions=1,",
            f"{i}    location=(0, 0, 0),",
            f"{i})",
            f"{i}obj_{n} = bpy.context.active_object",
            f"{i}obj_{n}.name = '{n}'",
            f"{i}# Aplatir légèrement",
            f"{i}obj_{n}.scale[2] = {0.7 * sz}",
        ]

    def _geom_lantern(self, n, sx, sy, sz, i) -> List[str]:
        """Lanterne : cylindre + sphère lumineuse."""
        return [
            f"{i}# Corps lanterne (cylindre)",
            f"{i}bpy.ops.mesh.primitive_cylinder_add(",
            f"{i}    radius={0.08 * sx}, depth={0.3 * sz}, location=(0, 0, 0), vertices=8,",
            f"{i})",
            f"{i}lantern_body = bpy.context.active_object",
            f"{i}lantern_body.name = '{n}_body'",
            f"{i}# Globe (sphère)",
            f"{i}bpy.ops.mesh.primitive_uv_sphere_add(",
            f"{i}    radius={0.06 * sx}, location=(0, 0, {0.1 * sz}), segments=8, ring_count=6,",
            f"{i})",
            f"{i}obj_{n} = bpy.context.active_object",
            f"{i}obj_{n}.name = '{n}'",
        ]

    def _geom_book(self, n, sx, sy, sz, i) -> List[str]:
        """Livre : boîte plate."""
        return [
            f"{i}bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))",
            f"{i}obj_{n} = bpy.context.active_object",
            f"{i}obj_{n}.name = '{n}'",
            f"{i}obj_{n}.scale = ({0.15 * sx}, {0.2 * sy}, {0.25 * sz})",
            f"{i}bpy.ops.object.transform_apply(scale=True)",
        ]

    def _geom_bottle(self, n, sx, sy, sz, i) -> List[str]:
        """Flacon / potion : cylindre + sphère."""
        return [
            f"{i}bpy.ops.mesh.primitive_cylinder_add(",
            f"{i}    radius={0.04 * sx}, depth={0.18 * sz}, location=(0, 0, 0), vertices=12,",
            f"{i})",
            f"{i}bottle_body = bpy.context.active_object",
            f"{i}bottle_body.name = '{n}_body'",
            f"{i}bpy.ops.mesh.primitive_uv_sphere_add(",
            f"{i}    radius={0.05 * sx}, location=(0, 0, {0.12 * sz}), segments=8, ring_count=6,",
            f"{i})",
            f"{i}obj_{n} = bpy.context.active_object",
            f"{i}obj_{n}.name = '{n}'",
        ]

    def _geom_flat_plane(self, n, sx, sy, sz, i) -> List[str]:
        """Plan plat : document, parchemin."""
        return [
            f"{i}bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))",
            f"{i}obj_{n} = bpy.context.active_object",
            f"{i}obj_{n}.name = '{n}'",
            f"{i}obj_{n}.scale = ({0.2 * sx}, {0.28 * sy}, 1.0)",
            f"{i}bpy.ops.object.transform_apply(scale=True)",
        ]

    def _geom_scroll(self, n, sx, sy, sz, i) -> List[str]:
        """Parchemin enroulé : cylindre plat."""
        return [
            f"{i}bpy.ops.mesh.primitive_cylinder_add(",
            f"{i}    radius={0.04 * sx}, depth={0.25 * sz}, location=(0, 0, 0), vertices=12,",
            f"{i})",
            f"{i}obj_{n} = bpy.context.active_object",
            f"{i}obj_{n}.name = '{n}'",
            f"{i}obj_{n}.rotation_euler[0] = math.radians(90)",
        ]

    def _geom_gun_body(self, n, sx, sy, sz, i) -> List[str]:
        """Arme à feu : boîte + cylindre canon."""
        return [
            f"{i}# Corps arme",
            f"{i}bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))",
            f"{i}gun_body = bpy.context.active_object",
            f"{i}gun_body.name = '{n}_body'",
            f"{i}gun_body.scale = ({0.08 * sx}, {0.3 * sy}, {0.12 * sz})",
            f"{i}bpy.ops.object.transform_apply(scale=True)",
            f"{i}# Canon",
            f"{i}bpy.ops.mesh.primitive_cylinder_add(",
            f"{i}    radius={0.015 * sx}, depth={0.35 * sy},",
            f"{i}    location=(0, {0.2 * sy}, {0.04 * sz}), vertices=8,",
            f"{i})",
            f"{i}obj_{n} = bpy.context.active_object",
            f"{i}obj_{n}.name = '{n}'",
        ]

    def _geom_key_shape(self, n, sx, sy, sz, i) -> List[str]:
        """Clé : cylindre + torus."""
        return [
            f"{i}# Tige de la clé",
            f"{i}bpy.ops.mesh.primitive_cylinder_add(",
            f"{i}    radius={0.015 * sx}, depth={0.3 * sz},",
            f"{i}    location=(0, 0, 0), vertices=8,",
            f"{i})",
            f"{i}key_shaft = bpy.context.active_object",
            f"{i}key_shaft.name = '{n}_shaft'",
            f"{i}# Anneau",
            f"{i}bpy.ops.mesh.primitive_torus_add(",
            f"{i}    major_radius={0.04 * sx}, minor_radius={0.01 * sx},",
            f"{i}    location=(0, 0, {0.18 * sz}),",
            f"{i})",
            f"{i}obj_{n} = bpy.context.active_object",
            f"{i}obj_{n}.name = '{n}'",
        ]

    # ─── CODE DE MATÉRIAU ────────────────────────────────────────────────────

    def _material_code(
        self,
        mat: Dict,
        obj_name: str,
        display_name: str,
        indent: str = "    ",
    ) -> List[str]:
        """Génère le code de création du matériau Principled BSDF."""
        i = indent
        bc = mat.get("base_color", (0.7, 0.7, 0.7, 1.0))
        metallic = mat.get("metallic", 0.0)
        roughness = mat.get("roughness", 0.5)
        transmission = mat.get("transmission", 0.0)
        emission = mat.get("emission", None)
        emission_strength = mat.get("emission_strength", 0.0)

        mat_var = f"mat_{obj_name}"
        lines = [
            f"# Materiau : {display_name}",
            f"{i}{mat_var} = bpy.data.materials.new(name='{obj_name}_mat')",
            f"{i}{mat_var}.use_nodes = True",
            f"{i}nodes_{obj_name} = {mat_var}.node_tree.nodes",
            f"{i}bsdf_{obj_name} = nodes_{obj_name}.get('Principled BSDF')",
            f"{i}if bsdf_{obj_name}:",
            f"{i}    bsdf_{obj_name}.inputs['Base Color'].default_value = {tuple(bc)}",
            f"{i}    bsdf_{obj_name}.inputs['Metallic'].default_value = {metallic}",
            f"{i}    bsdf_{obj_name}.inputs['Roughness'].default_value = {roughness}",
        ]

        if transmission > 0:
            lines.append(f"{i}    bsdf_{obj_name}.inputs['Transmission Weight'].default_value = {transmission}")

        if emission and emission_strength > 0:
            em = emission if len(emission) == 4 else (*emission, 1.0)
            lines += [
                f"{i}    bsdf_{obj_name}.inputs['Emission Color'].default_value = {tuple(em)}",
                f"{i}    bsdf_{obj_name}.inputs['Emission Strength'].default_value = {emission_strength}",
            ]

        lines += [
            f"{i}if obj_{obj_name}.data.materials:",
            f"{i}    obj_{obj_name}.data.materials[0] = {mat_var}",
            f"{i}else:",
            f"{i}    obj_{obj_name}.data.materials.append({mat_var})",
        ]

        return lines

    # ─── CODE DE RENDU PREVIEW ────────────────────────────────────────────────

    def _preview_render_code(
        self,
        obj_name: str,
        preview_path: str,
        display_name: str,
    ) -> List[str]:
        """Génère le code de configuration caméra + rendu preview."""
        return [
            f"# ── Caméra preview ────────────────────────────────────────────────────",
            f"bpy.ops.object.camera_add(location=(0.8, -1.5, 0.8))",
            f"cam_obj = bpy.context.active_object",
            f"cam_obj.name = 'Preview_Camera'",
            f"# Pointer vers l'objet",
            f"bpy.ops.object.empty_add(location=(0, 0, 0))",
            f"empty = bpy.context.active_object",
            f"empty.name = 'Camera_Target'",
            f"track = cam_obj.constraints.new(type='TRACK_TO')",
            f"track.target = empty",
            f"track.track_axis = 'TRACK_NEGATIVE_Z'",
            f"track.up_axis = 'UP_Y'",
            f"bpy.context.scene.camera = cam_obj",
            f"",
            f"# ── Eclairage ─────────────────────────────────────────────────────────",
            f"bpy.ops.object.light_add(type='AREA', location=(1.5, -1.0, 2.0))",
            f"key_light = bpy.context.active_object",
            f"key_light.data.energy = 50",
            f"key_light.data.color = (1.0, 0.95, 0.9)",
            f"bpy.ops.object.light_add(type='AREA', location=(-2.0, 1.0, 1.5))",
            f"fill_light = bpy.context.active_object",
            f"fill_light.data.energy = 20",
            f"fill_light.data.color = (0.6, 0.7, 1.0)",
            f"",
            f"# ── Rendu ─────────────────────────────────────────────────────────────",
            f"scene = bpy.context.scene",
            f"scene.render.engine = 'BLENDER_EEVEE'",
            f"scene.render.resolution_x = 512",
            f"scene.render.resolution_y = 512",
            f"scene.render.filepath = r'{preview_path}'",
            f"scene.render.image_settings.file_format = 'PNG'",
            f"bpy.ops.render.render(write_still=True)",
            f"print(f'Preview rendu : {preview_path}.png')",
        ]

    # ─── UTILITAIRES ─────────────────────────────────────────────────────────

    def _safe_name(self, name: str) -> str:
        """Convertit un nom en identifiant Python/Blender valide."""
        return re.sub(r"[^a-zA-Z0-9_]", "_", name)[:63].strip("_")

    def script_exists(self, obj: StoryObject) -> bool:
        """Vérifie si le script de l'objet a déjà été généré."""
        if obj.blender_script_path:
            return Path(obj.blender_script_path).exists()
        script_name = f"{self._safe_name(obj.blender_object_name)}.py"
        return (self.output_dir / script_name).exists()

    def get_all_scripts(self) -> List[str]:
        """Retourne la liste de tous les scripts générés."""
        return [str(p) for p in self.output_dir.glob("*.py")]
