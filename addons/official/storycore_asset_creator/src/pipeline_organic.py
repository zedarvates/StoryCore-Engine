"""
pipeline_organic.py -- Pipeline multi-etapes pour assets organiques (arbres, plantes).

PROBLEME: Generer un arbre complet en 3D direct donne de mauvais resultats avec
Trellis2 car le feuillage cree des artefacts geometriques.

SOLUTION multi-etapes:
  Etape 1 - Tronc  : image 'tronc seul, sans feuilles' -> Trellis2 -> GLB tronc
  Etape 2 - Import : GLB tronc importe dans Blender
  Etape 3 - Foliage: feuillage procédural Blender ajoute sur le tronc
  Etape 4 - Export : arbre final disponible pour placement dans scene
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from .comfyui_client import ComfyUIClient


# Styles de feuillage disponibles
FOLIAGE_STYLES = {
    "conifer":   {"color": (0.08, 0.35, 0.08, 1.0), "shape": "cone",   "density": 0.8, "scale": (0.6, 0.6, 1.2)},
    "deciduous": {"color": (0.15, 0.45, 0.10, 1.0), "shape": "sphere", "density": 1.0, "scale": (1.0, 1.0, 0.8)},
    "palm":      {"color": (0.20, 0.50, 0.05, 1.0), "shape": "fan",    "density": 0.4, "scale": (1.5, 1.5, 0.3)},
    "dead":      {"color": (0.25, 0.18, 0.08, 1.0), "shape": "sparse", "density": 0.2, "scale": (1.0, 1.0, 1.0)},
    "bush":      {"color": (0.12, 0.40, 0.08, 1.0), "shape": "sphere", "density": 1.2, "scale": (1.2, 1.2, 0.7)},
    "tropical":  {"color": (0.10, 0.55, 0.05, 1.0), "shape": "spread", "density": 0.9, "scale": (1.3, 1.3, 0.6)},
}


class OrganicAssetPipeline:
    """
    Pipeline multi-etapes pour assets organiques (arbres, arbustes, plantes).

    Usage:
        pipeline = OrganicAssetPipeline()
        result = pipeline.run(
            trunk_image_path="./tronc_chene.png",
            asset_name="Chene",
            foliage_style="deciduous",
            output_dir="./exports/organic",
        )
    """

    def __init__(self, comfyui_host: str = "127.0.0.1", comfyui_port: int = 8188):
        self.client = ComfyUIClient(host=comfyui_host, port=comfyui_port)
        self._status = ""

    @property
    def status(self) -> str:
        return self._status

    def _log(self, msg: str, cb: Optional[Callable] = None):
        self._status = msg
        if cb:
            cb(msg)
        print(f"[Organic] {msg}")

    def run(
        self,
        trunk_image_path: str,
        asset_name: str = "Tree",
        foliage_style: str = "deciduous",
        preset: str = "lowvram",
        remove_background: bool = True,
        seed: int = 42,
        output_dir: str = "./exports/organic",
        foliage_density: float = 1.0,
        timeout: float = 300.0,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """
        Pipeline complet tronc 3D + feuillage procédural.

        Args:
            trunk_image_path : image du tronc SEUL (fond uni, sans feuilles)
            asset_name       : nom de l'asset
            foliage_style    : conifer | deciduous | palm | dead | bush | tropical
            foliage_density  : multiplicateur de densite (0.5=leger, 2.0=dense)
        """
        start = time.time()
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        # ETAPE 1: Tronc -> GLB via Trellis2
        self._log(f"Etape 1/3: Generation tronc 3D pour {asset_name}...", progress_callback)
        from .pipeline_image_to_3d import ImageTo3DPipeline

        host = self.client.base_url.replace("http://", "").split(":")[0]
        p3d = ImageTo3DPipeline(comfyui_host=host)
        result = p3d.run(
            image_path=trunk_image_path,
            asset_name=f"{asset_name}_Trunk",
            preset=preset,
            remove_background=remove_background,
            seed=seed,
            output_dir=str(out_dir),
            timeout=timeout,
            progress_callback=progress_callback,
        )
        trunk_glb = result["glb_path"]
        self._log(f"Tronc genere: {Path(trunk_glb).name}", progress_callback)

        # ETAPE 2 + 3: Import Blender + feuillage procédural
        self._log("Etape 2/3: Import GLB + feuillage procédural...", progress_callback)
        blender_result = self.assemble_in_blender(
            trunk_glb_path=trunk_glb,
            asset_name=asset_name,
            foliage_style=foliage_style,
            foliage_density=foliage_density,
            progress_callback=progress_callback,
        )

        duration = time.time() - start
        self._log(f"Asset organique termine: {asset_name} en {duration:.1f}s", progress_callback)

        return {
            "trunk_glb": trunk_glb,
            "asset_name": asset_name,
            "foliage_style": foliage_style,
            "blender_objects": blender_result,
            "duration": duration,
        }

    def assemble_in_blender(
        self,
        trunk_glb_path: str,
        asset_name: str,
        foliage_style: str = "deciduous",
        foliage_density: float = 1.0,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """
        Assemble tronc + feuillage dans Blender (doit etre appele dans Blender).

        1. Import GLB tronc
        2. Calcul hauteur tronc (bounding box)
        3. Creation feuillage procédural au-dessus
        """
        try:
            import bpy

            style = FOLIAGE_STYLES.get(foliage_style, FOLIAGE_STYLES["deciduous"])
            bpy.ops.object.select_all(action="DESELECT")

            # Import du tronc
            self._log("Import GLB tronc...", progress_callback)
            bpy.ops.import_scene.gltf(filepath=trunk_glb_path, import_pack_images=True)
            trunk_objects = list(bpy.context.selected_objects)
            trunk_root = trunk_objects[0] if trunk_objects else None

            if trunk_root:
                trunk_root.name = f"{asset_name}_Trunk"

            # Mesure de la hauteur du tronc
            trunk_height = 2.0
            if trunk_root and trunk_root.type == "MESH":
                bb = trunk_root.bound_box
                trunk_height = max(v[2] for v in bb) - min(v[2] for v in bb)

            # Creation du feuillage
            self._log(f"Feuillage procédural ({foliage_style})...", progress_callback)
            foliage_obj = self._create_foliage(asset_name, style, trunk_height, foliage_density)

            return {
                "trunk": trunk_root.name if trunk_root else "",
                "foliage": foliage_obj.name if foliage_obj else "",
            }

        except ImportError:
            raise RuntimeError("assemble_in_blender doit etre appele dans Blender")

    def _create_foliage(
        self,
        asset_name: str,
        style: dict,
        trunk_height: float,
        density: float,
    ):
        """Cree la masse de feuillage procédurale au-dessus du tronc."""
        import bpy

        color = style["color"]
        shape = style["shape"]
        scale = style["scale"]
        base_density = style["density"] * density
        foliage_z = trunk_height * 0.75

        if shape in ("sphere", "bush", "tropical", "spread"):
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0, location=(0, 0, foliage_z))
        elif shape == "cone":
            bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.9, depth=2.2, location=(0, 0, foliage_z))
        elif shape == "fan":
            bpy.ops.mesh.primitive_circle_add(vertices=12, radius=1.3, location=(0, 0, foliage_z))
        elif shape == "sparse":
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.6, location=(0, 0, foliage_z))
        else:
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0, location=(0, 0, foliage_z))

        foliage = bpy.context.active_object
        foliage.name = f"{asset_name}_Foliage"
        foliage.scale = scale

        # Materiau feuillage
        mat = bpy.data.materials.new(name=f"{asset_name}_FoliageMat")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = color
            bsdf.inputs["Roughness"].default_value = 0.9
            try:
                bsdf.inputs["Subsurface Weight"].default_value = 0.1
            except Exception:
                pass
        mat.blend_method = "HASHED"
        foliage.data.materials.append(mat)

        # Systeme de particules (cheveux) pour densite visuelle
        if base_density > 0.5:
            ps_mod = foliage.modifiers.new(name="FoliageHair", type="PARTICLE_SYSTEM")
            ps = ps_mod.particle_system.settings
            ps.type = "HAIR"
            ps.count = int(200 * base_density)
            ps.hair_length = 0.15

        return foliage
