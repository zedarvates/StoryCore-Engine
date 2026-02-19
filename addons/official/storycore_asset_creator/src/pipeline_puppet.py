"""
pipeline_puppet.py -- Pipeline Personnage -> Puppet (marionnette articulee).

Etapes:
  1. Image du personnage (photo ou IA) -> Trellis2 -> Mesh 3D
  2. Import GLB dans Blender
  3. Creation d'une armature humanoide basique (Rigify-like ou custom)
  4. Parent mesh -> armature
  5. Poids automatiques (Automatic Weights)
  6. Nommage des os selon le personnage

Le puppet peut ensuite etre anime dans Blender.
"""
from __future__ import annotations

import time
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from .comfyui_client import ComfyUIClient
from .trellis_workflows import build_workflow, get_expected_output_names


class PuppetPipeline:
    """
    Pipeline : Image personnage -> Mesh 3D -> Armature articulee (puppet).

    Le rig est un humanoide basique avec 22 os :
    Hips, Spine, Chest, Neck, Head,
    UpperArm.L/R, LowerArm.L/R, Hand.L/R,
    UpperLeg.L/R, LowerLeg.L/R, Foot.L/R,
    Shoulder.L/R, Thumb.L/R (simplifies)
    """

    BONE_HIERARCHY = {
        "Hips": {
            "pos": (0, 0, 1.0), "tail": (0, 0, 1.15),
            "children": {
                "Spine": {
                    "pos": (0, 0, 1.15), "tail": (0, 0, 1.35),
                    "children": {
                        "Chest": {
                            "pos": (0, 0, 1.35), "tail": (0, 0, 1.55),
                            "children": {
                                "Neck": {
                                    "pos": (0, 0, 1.55), "tail": (0, 0, 1.68),
                                    "children": {
                                        "Head": {"pos": (0, 0, 1.68), "tail": (0, 0, 1.85), "children": {}}
                                    },
                                },
                                "Shoulder.L": {
                                    "pos": (0.08, 0, 1.52), "tail": (0.18, 0, 1.52),
                                    "children": {
                                        "UpperArm.L": {
                                            "pos": (0.18, 0, 1.52), "tail": (0.38, 0, 1.45),
                                            "children": {
                                                "LowerArm.L": {
                                                    "pos": (0.38, 0, 1.45), "tail": (0.55, 0, 1.38),
                                                    "children": {
                                                        "Hand.L": {"pos": (0.55, 0, 1.38), "tail": (0.65, 0, 1.35), "children": {}}
                                                    },
                                                }
                                            },
                                        }
                                    },
                                },
                                "Shoulder.R": {
                                    "pos": (-0.08, 0, 1.52), "tail": (-0.18, 0, 1.52),
                                    "children": {
                                        "UpperArm.R": {
                                            "pos": (-0.18, 0, 1.52), "tail": (-0.38, 0, 1.45),
                                            "children": {
                                                "LowerArm.R": {
                                                    "pos": (-0.38, 0, 1.45), "tail": (-0.55, 0, 1.38),
                                                    "children": {
                                                        "Hand.R": {"pos": (-0.55, 0, 1.38), "tail": (-0.65, 0, 1.35), "children": {}}
                                                    },
                                                }
                                            },
                                        }
                                    },
                                },
                            },
                        }
                    },
                },
                "UpperLeg.L": {
                    "pos": (0.1, 0, 1.0), "tail": (0.12, 0, 0.55),
                    "children": {
                        "LowerLeg.L": {
                            "pos": (0.12, 0, 0.55), "tail": (0.12, 0, 0.12),
                            "children": {
                                "Foot.L": {"pos": (0.12, 0, 0.12), "tail": (0.12, 0.15, 0.02), "children": {}}
                            },
                        }
                    },
                },
                "UpperLeg.R": {
                    "pos": (-0.1, 0, 1.0), "tail": (-0.12, 0, 0.55),
                    "children": {
                        "LowerLeg.R": {
                            "pos": (-0.12, 0, 0.55), "tail": (-0.12, 0, 0.12),
                            "children": {
                                "Foot.R": {"pos": (-0.12, 0, 0.12), "tail": (-0.12, 0.15, 0.02), "children": {}}
                            },
                        }
                    },
                },
            },
        }
    }

    def __init__(self, comfyui_host: str = "127.0.0.1", comfyui_port: int = 8188):
        self.client = ComfyUIClient(host=comfyui_host, port=comfyui_port)
        self._status = ""

    @property
    def status(self) -> str:
        return self._status

    def _log(self, msg: str, callback: Optional[Callable] = None):
        self._status = msg
        if callback:
            callback(msg)
        print(f"[Puppet] {msg}")

    def run(
        self,
        image_path: str,
        character_name: str = "Character",
        preset: str = "lowvram",
        remove_background: bool = True,
        seed: int = 42,
        output_dir: str = "./exports/puppets",
        timeout: float = 300.0,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """
        Pipeline complet : image -> GLB -> puppet rige.

        Returns:
            {
                "glb_path": str,
                "character_name": str,
                "rig_bones": list[str],
                "duration": float,
            }
        """
        start = time.time()
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Etape 1: Generer le mesh 3D
        self._log(f"Etape 1/3: Generation mesh 3D pour {character_name}...", progress_callback)
        from .pipeline_image_to_3d import ImageTo3DPipeline

        p3d = ImageTo3DPipeline(self.client.base_url.split("//")[1].split(":")[0])
        result = p3d.run(
            image_path=image_path,
            asset_name=character_name,
            preset=preset,
            remove_background=remove_background,
            seed=seed,
            output_dir=output_dir,
            timeout=timeout,
            progress_callback=progress_callback,
        )
        glb_path = result["glb_path"]

        # Etapes 2 et 3 dans Blender
        self._log("Etape 2/3: Import GLB et creation rig...", progress_callback)
        rig_result = self.create_puppet_in_blender(glb_path, character_name, progress_callback)

        duration = time.time() - start
        self._log(f"Puppet termine en {duration:.1f}s", progress_callback)

        return {
            "glb_path": glb_path,
            "character_name": character_name,
            "rig_bones": rig_result.get("bones", []),
            "armature_name": rig_result.get("armature_name", ""),
            "duration": duration,
        }

    def create_puppet_in_blender(
        self,
        glb_path: str,
        character_name: str,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """
        Cree le puppet dans Blender:
          1. Import GLB
          2. Creation armature humanoide
          3. Parent mesh -> armature (Automatic Weights)
          4. Nommage

        Doit etre appele depuis un context Blender.
        """
        try:
            import bpy
            import mathutils

            # Nettoyer la selection
            bpy.ops.object.select_all(action="DESELECT")

            # 1. Importer le GLB
            self._log("Import GLB...", progress_callback)
            bpy.ops.import_scene.gltf(filepath=glb_path, import_pack_images=True)
            mesh_objects = list(bpy.context.selected_objects)

            if not mesh_objects:
                raise ValueError("Aucun objet importe depuis le GLB")

            # Renommer le mesh principal
            main_mesh = mesh_objects[0]
            main_mesh.name = f"{character_name}_mesh"
            if main_mesh.data:
                main_mesh.data.name = f"{character_name}_mesh_data"

            # 2. Creer l'armature
            self._log("Creation armature...", progress_callback)
            bpy.ops.object.select_all(action="DESELECT")
            bpy.ops.object.armature_add(location=(0, 0, 0))
            armature_obj = bpy.context.active_object
            armature_obj.name = f"{character_name}_rig"
            armature = armature_obj.data
            armature.name = f"{character_name}_armature"

            # Entrer en mode edition pour creer les os
            bpy.ops.object.mode_set(mode="EDIT")
            edit_bones = armature.edit_bones

            # Supprimer l'os par defaut
            for bone in list(edit_bones):
                edit_bones.remove(bone)

            # Creer la hierarchie d'os
            bones_created = []
            self._create_bones_recursive(edit_bones, self.BONE_HIERARCHY, parent=None)

            # Collecter les noms
            bones_created = [b.name for b in edit_bones]

            bpy.ops.object.mode_set(mode="OBJECT")

            # 3. Parent mesh -> armature avec Automatic Weights
            self._log("Application Automatic Weights...", progress_callback)
            bpy.ops.object.select_all(action="DESELECT")
            main_mesh.select_set(True)
            armature_obj.select_set(True)
            bpy.context.view_layer.objects.active = armature_obj

            try:
                bpy.ops.object.parent_set(type="ARMATURE_AUTO")
            except Exception:
                # Fallback: parent simple
                bpy.ops.object.parent_set(type="ARMATURE")

            self._log(f"Puppet cree: {len(bones_created)} os", progress_callback)

            return {
                "armature_name": armature_obj.name,
                "mesh_name": main_mesh.name,
                "bones": bones_created,
            }

        except ImportError:
            raise RuntimeError("create_puppet_in_blender doit etre appele dans Blender")

    def _create_bones_recursive(self, edit_bones, hierarchy: dict, parent=None):
        """Cree recursivement les os depuis la hierarchie."""
        for bone_name, bone_data in hierarchy.items():
            bone = edit_bones.new(bone_name)
            bone.head = bone_data["pos"]
            bone.tail = bone_data["tail"]
            if parent:
                bone.parent = parent
                bone.use_connect = False  # Joints libres pour marionnette
            # Recurse
            self._create_bones_recursive(edit_bones, bone_data.get("children", {}), parent=bone)
