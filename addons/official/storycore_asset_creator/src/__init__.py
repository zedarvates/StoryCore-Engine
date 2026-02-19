"""
StoryCore Asset Creator -- Addon Blender 4.x
=============================================

Cree des assets 3D depuis des images via ComfyUI Trellis2.

Trois pipelines accessibles depuis le panneau N de Blender (View3D):
  [Image -> 3D]    : toute image (photo/IA) -> mesh 3D texturé (GLB)
  [Personnage]     : image personnage -> mesh 3D + armature articulee (puppet)
  [Organique]      : image tronc -> mesh tronc + feuillage procédural

Installation:
  1. Zipper le dossier storycore_asset_creator/
  2. Blender > Edit > Preferences > Add-ons > Install...
  3. Activer "StoryCore Asset Creator"
  4. Configurer l'URL ComfyUI dans les preferences de l'addon

Dependances (pip install dans le Python de Blender):
  requests, Pillow
"""
from __future__ import annotations

import bpy
from bpy.types import AddonPreferences, Panel, Operator, PropertyGroup
from bpy.props import (
    StringProperty, EnumProperty, BoolProperty,
    FloatProperty, IntProperty, PointerProperty,
)

bl_info = {
    "name": "StoryCore Asset Creator",
    "author": "StoryCore-Engine",
    "version": (1, 0, 0),
    "blender": (4, 0, 0),
    "location": "View3D > N Panel > StoryCore",
    "description": "Cree des assets 3D depuis images via ComfyUI Trellis2",
    "category": "Object",
    "doc_url": "https://github.com/zedarvates/StoryCore-Engine",
}


# ── PREFERENCES ──────────────────────────────────────────────────────────────

class StoryCoreAssetPreferences(AddonPreferences):
    bl_idname = __package__

    comfyui_host: StringProperty(
        name="ComfyUI Host (override)",
        default="",
        description="Override host ComfyUI. Laisser vide pour utiliser config/comfyui_config.json",
    )
    comfyui_port: IntProperty(
        name="ComfyUI Port (override)",
        default=0,
        min=0, max=65535,
        description=(
            "Override port ComfyUI. 0 = utiliser config/comfyui_config.json.\n"
            "ComfyUI Standard = 8188 | ComfyUI Desktop = 8000"
        ),
    )
    output_dir: StringProperty(
        name="Dossier de sortie (override)",
        default="",
        subtype="DIR_PATH",
        description="Override dossier de sortie. Laisser vide pour utiliser config/comfyui_config.json",
    )

    def draw(self, context):
        layout = self.layout

        # Affichage de la config active
        box = layout.box()
        box.label(text="Configuration active (lue depuis config/comfyui_config.json):", icon="FILE_TEXT")
        try:
            from .config_loader import describe_config
            box.label(text=describe_config(), icon="NETWORK_DRIVE")
        except Exception as e:
            box.label(text=f"Config non lisible: {e}", icon="ERROR")

        layout.separator()
        layout.label(text="Overrides Blender (optionnel - surcharge le fichier JSON):", icon="PREFERENCES")
        layout.label(text="Port 0 = lire depuis config/comfyui_config.json", icon="INFO")

        row = layout.row()
        row.prop(self, "comfyui_host")
        row.prop(self, "comfyui_port")
        layout.prop(self, "output_dir")

        layout.separator()
        layout.label(text="Fichier de config: config/comfyui_config.json", icon="FILEBROWSER")
        layout.label(text="Ports: Standard=8188 | Desktop=8000 | Remote=custom", icon="INFO")


# ── PROPRIETES DE SCENE ───────────────────────────────────────────────────────

class StoryCoreAssetProperties(PropertyGroup):
    # Proprietes communes
    image_path: StringProperty(
        name="Image source",
        subtype="FILE_PATH",
        description="Image a convertir en 3D (PNG/JPG, ratio 1:1 recommande)",
    )
    asset_name: StringProperty(
        name="Nom asset",
        default="MonAsset",
        description="Nom de l'asset genere (sans espaces)",
    )
    preset: EnumProperty(
        name="Qualite",
        items=[
            ("lowvram",  "Low VRAM (rapide)",   "Moins de VRAM, moins de details"),
            ("standard", "Standard",             "Qualite standard"),
            ("lowpoly",  "Low Poly",             "Mesh basse resolution"),
        ],
        default="lowvram",
    )
    remove_background: BoolProperty(
        name="Supprimer le fond",
        default=True,
        description="Supprimer automatiquement le fond de l'image",
    )
    seed: IntProperty(
        name="Seed",
        default=12345,
        min=0,
        description="Graine de generation (changer si resultat insatisfaisant)",
    )

    # Pipeline puppet
    character_name: StringProperty(
        name="Nom personnage",
        default="Hero",
        description="Nom du personnage pour le rig",
    )

    # Pipeline organique
    trunk_image_path: StringProperty(
        name="Image tronc",
        subtype="FILE_PATH",
        description="Image du tronc SEUL (sans feuilles, fond uni)",
    )
    foliage_style: EnumProperty(
        name="Style feuillage",
        items=[
            ("deciduous", "Feuillu",    "Arbre a feuilles caduques"),
            ("conifer",   "Conifere",   "Sapin, epicea..."),
            ("palm",      "Palmier",    "Palmier tropical"),
            ("bush",      "Arbuste",    "Buisson dense"),
            ("dead",      "Mort",       "Arbre mort, branches nues"),
            ("tropical",  "Tropical",   "Vegetation tropicale"),
        ],
        default="deciduous",
    )
    foliage_density: FloatProperty(
        name="Densite feuillage",
        default=1.0,
        min=0.1, max=3.0,
        description="Multiplicateur de densite du feuillage",
    )

    # Status
    status_text: StringProperty(name="Status", default="Pret")
    is_running: BoolProperty(name="En cours", default=False)


# ── OPERATEURS ────────────────────────────────────────────────────────────────

class STORYCORE_OT_image_to_3d(Operator):
    """Convertit une image en asset 3D via ComfyUI Trellis2"""
    bl_idname = "storycore.image_to_3d"
    bl_label = "Image -> 3D"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        props = context.scene.storycore_assets
        prefs_obj = context.preferences.addons.get(__package__)
        bl_prefs = prefs_obj.preferences if prefs_obj else None

        if not props.image_path:
            self.report({"ERROR"}, "Veuillez selectionner une image source")
            return {"CANCELLED"}

        try:
            from .comfyui_client import ComfyUIClient
            from .config_loader import get_output_dir, get_timeout
            from .pipeline_image_to_3d import ImageTo3DPipeline

            client = ComfyUIClient.from_project_config(blender_prefs=bl_prefs)
            out_dir = get_output_dir("assets_3d", getattr(bl_prefs, "output_dir", "") or None)

            def _progress(msg):
                props.status_text = msg
                print(f"[StoryCore] {msg}")

            host, port = client.base_url.replace("http://", "").rsplit(":", 1)
            pipeline = ImageTo3DPipeline(comfyui_host=host, comfyui_port=int(port))
            result = pipeline.run(
                image_path=bpy.path.abspath(props.image_path),
                asset_name=props.asset_name or "Asset",
                preset=props.preset,
                remove_background=props.remove_background,
                seed=props.seed,
                output_dir=bpy.path.abspath(out_dir) if out_dir.startswith("//") else out_dir,
                timeout=get_timeout(),
                progress_callback=_progress,
            )

            # Importer dans Blender
            pipeline.import_glb_in_blender(result["glb_path"], result["asset_name"])
            props.status_text = f"OK: {result['asset_name']} en {result['duration']:.1f}s"
            self.report({"INFO"}, f"Asset 3D importe: {result['asset_name']}")

        except ConnectionError as e:
            self.report({"ERROR"}, f"ComfyUI inaccessible: {e}")
            props.status_text = "Erreur: ComfyUI non accessible"
            return {"CANCELLED"}
        except Exception as e:
            self.report({"ERROR"}, f"Erreur pipeline: {e}")
            props.status_text = f"Erreur: {e}"
            return {"CANCELLED"}

        return {"FINISHED"}


class STORYCORE_OT_create_puppet(Operator):
    """Cree un puppet (marionnette articulee) depuis une image de personnage"""
    bl_idname = "storycore.create_puppet"
    bl_label = "Creer Puppet"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        props = context.scene.storycore_assets
        prefs_obj = context.preferences.addons.get(__package__)
        bl_prefs = prefs_obj.preferences if prefs_obj else None

        if not props.image_path:
            self.report({"ERROR"}, "Veuillez selectionner une image de personnage")
            return {"CANCELLED"}

        try:
            from .comfyui_client import ComfyUIClient
            from .config_loader import get_output_dir, get_timeout
            from .pipeline_puppet import PuppetPipeline

            client = ComfyUIClient.from_project_config(blender_prefs=bl_prefs)
            out_dir = get_output_dir("puppets", getattr(bl_prefs, "output_dir", "") or None)
            host, port = client.base_url.replace("http://", "").rsplit(":", 1)

            def _progress(msg):
                props.status_text = msg

            pipeline = PuppetPipeline(comfyui_host=host, comfyui_port=int(port))
            result = pipeline.run(
                image_path=bpy.path.abspath(props.image_path),
                character_name=props.character_name or "Character",
                preset=props.preset,
                remove_background=props.remove_background,
                seed=props.seed,
                output_dir=out_dir,
                timeout=get_timeout(),
                progress_callback=_progress,
            )

            props.status_text = f"Puppet: {result['character_name']} ({len(result['rig_bones'])} os)"
            self.report({"INFO"}, f"Puppet cree: {result['character_name']}")

        except Exception as e:
            self.report({"ERROR"}, f"Erreur puppet: {e}")
            props.status_text = f"Erreur: {e}"
            return {"CANCELLED"}

        return {"FINISHED"}


class STORYCORE_OT_create_organic(Operator):
    """Cree un asset organique (tronc 3D + feuillage procedural)"""
    bl_idname = "storycore.create_organic"
    bl_label = "Creer Arbre/Plante"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        props = context.scene.storycore_assets
        prefs_obj = context.preferences.addons.get(__package__)
        bl_prefs = prefs_obj.preferences if prefs_obj else None

        trunk_path = props.trunk_image_path or props.image_path
        if not trunk_path:
            self.report({"ERROR"}, "Veuillez selectionner une image de tronc")
            return {"CANCELLED"}

        try:
            from .comfyui_client import ComfyUIClient
            from .config_loader import get_output_dir, get_timeout
            from .pipeline_organic import OrganicAssetPipeline

            client = ComfyUIClient.from_project_config(blender_prefs=bl_prefs)
            out_dir = get_output_dir("organic", getattr(bl_prefs, "output_dir", "") or None)
            host, port = client.base_url.replace("http://", "").rsplit(":", 1)

            def _progress(msg):
                props.status_text = msg

            pipeline = OrganicAssetPipeline(comfyui_host=host, comfyui_port=int(port))
            result = pipeline.run(
                trunk_image_path=bpy.path.abspath(trunk_path),
                asset_name=props.asset_name or "Tree",
                foliage_style=props.foliage_style,
                preset=props.preset,
                remove_background=props.remove_background,
                seed=props.seed,
                output_dir=out_dir,
                timeout=get_timeout(),
                foliage_density=props.foliage_density,
                progress_callback=_progress,
            )

            props.status_text = f"Organique: {result['asset_name']} ({result['foliage_style']})"
            self.report({"INFO"}, f"Asset organique cree: {result['asset_name']}")

        except Exception as e:
            self.report({"ERROR"}, f"Erreur organic: {e}")
            props.status_text = f"Erreur: {e}"
            return {"CANCELLED"}

        return {"FINISHED"}


class STORYCORE_OT_check_comfyui(Operator):
    """Verifie la connexion a ComfyUI"""
    bl_idname = "storycore.check_comfyui"
    bl_label = "Tester ComfyUI"

    def execute(self, context):
        prefs_obj = context.preferences.addons.get(__package__)
        bl_prefs = prefs_obj.preferences if prefs_obj else None

        try:
            from .comfyui_client import ComfyUIClient
            from .config_loader import describe_config
            client = ComfyUIClient.from_project_config(blender_prefs=bl_prefs)
            info = describe_config()
            if client.is_alive():
                self.report({"INFO"}, f"ComfyUI OK — {info}")
                context.scene.storycore_assets.status_text = f"ComfyUI: OK ({info})"
            else:
                self.report({"WARNING"}, f"ComfyUI ne repond pas — {info}")
                context.scene.storycore_assets.status_text = f"ComfyUI: non accessible ({info})"
        except ValueError as e:
            # Port non configure
            self.report({"ERROR"}, str(e))
            context.scene.storycore_assets.status_text = "Config manquante: voir config/comfyui_config.json"
        except Exception as e:
            self.report({"ERROR"}, f"Erreur: {e}")

        return {"FINISHED"}


# ── PANNEAU UI ────────────────────────────────────────────────────────────────

class STORYCORE_PT_main_panel(Panel):
    """Panneau principal StoryCore Asset Creator"""
    bl_label = "StoryCore Assets"
    bl_idname = "STORYCORE_PT_main_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "StoryCore"

    def draw(self, context):
        layout = self.layout
        props = context.scene.storycore_assets

        # Status
        box = layout.box()
        row = box.row()
        row.label(text=props.status_text, icon="INFO")
        row.operator("storycore.check_comfyui", text="", icon="NETWORK_DRIVE")

        # Parametres communs
        layout.separator()
        layout.label(text="Parametres communs:", icon="SETTINGS")
        layout.prop(props, "image_path")
        layout.prop(props, "asset_name")
        layout.prop(props, "preset")

        row = layout.row()
        row.prop(props, "remove_background")
        row.prop(props, "seed")


class STORYCORE_PT_image_to_3d(Panel):
    """Pipeline Image -> 3D"""
    bl_label = "Image -> Asset 3D"
    bl_idname = "STORYCORE_PT_image_to_3d"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "StoryCore"
    bl_parent_id = "STORYCORE_PT_main_panel"

    def draw(self, context):
        layout = self.layout
        layout.label(text="Convertit image en mesh 3D texturé", icon="MESH_DATA")
        layout.label(text="Ratio 1:1 recommande pour l'image", icon="ERROR")
        layout.operator("storycore.image_to_3d", icon="IMPORT")


class STORYCORE_PT_puppet(Panel):
    """Pipeline Personnage -> Puppet"""
    bl_label = "Personnage -> Puppet"
    bl_idname = "STORYCORE_PT_puppet"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "StoryCore"
    bl_parent_id = "STORYCORE_PT_main_panel"

    def draw(self, context):
        layout = self.layout
        props = context.scene.storycore_assets
        layout.label(text="Image -> Mesh 3D + Armature articulee", icon="ARMATURE_DATA")
        layout.prop(props, "character_name")
        layout.operator("storycore.create_puppet", icon="POSE_HLT")


class STORYCORE_PT_organic(Panel):
    """Pipeline Organique (arbres, plantes)"""
    bl_label = "Arbres / Plantes"
    bl_idname = "STORYCORE_PT_organic"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "StoryCore"
    bl_parent_id = "STORYCORE_PT_main_panel"

    def draw(self, context):
        layout = self.layout
        props = context.scene.storycore_assets
        layout.label(text="Tronc seul -> 3D + Feuillage procédural", icon="OUTLINER_OB_FORCE_FIELD")
        layout.label(text="Conseil: image de tronc sans feuilles!", icon="ERROR")
        layout.prop(props, "trunk_image_path")
        layout.prop(props, "foliage_style")
        layout.prop(props, "foliage_density")
        layout.operator("storycore.create_organic", icon="PARTICLE_POINT")


# ── REGISTRATION ──────────────────────────────────────────────────────────────

classes = (
    StoryCoreAssetPreferences,
    StoryCoreAssetProperties,
    STORYCORE_OT_image_to_3d,
    STORYCORE_OT_create_puppet,
    STORYCORE_OT_create_organic,
    STORYCORE_OT_check_comfyui,
    STORYCORE_PT_main_panel,
    STORYCORE_PT_image_to_3d,
    STORYCORE_PT_puppet,
    STORYCORE_PT_organic,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.storycore_assets = PointerProperty(type=StoryCoreAssetProperties)


def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
    del bpy.types.Scene.storycore_assets


if __name__ == "__main__":
    register()
