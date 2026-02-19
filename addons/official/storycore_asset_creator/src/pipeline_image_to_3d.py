"""
pipeline_image_to_3d.py -- Pipeline Image -> Asset 3D via Trellis2.

Etapes:
  1. L'utilisateur fournit une image (photo ou generee par IA)
  2. Upload de l'image dans ComfyUI
  3. Trellis2 genere le mesh 3D + texture -> GLB
  4. Le GLB est importe dans Blender
  5. L'asset est place dans la scene / bibliotheque

Deux modes d'entree:
  - IMAGE_UPLOAD  : l'utilisateur apporte son image
  - AI_GENERATED  : utilise une image deja generee par le pipeline IA
"""
from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from .comfyui_client import ComfyUIClient
from .trellis_workflows import build_workflow, get_expected_output_names


class ImageTo3DPipeline:
    """
    Pipeline complet Image -> Mesh 3D textured (GLB) -> Import Blender.

    Usage (hors Blender):
        pipeline = ImageTo3DPipeline(comfyui_host="127.0.0.1")
        result = pipeline.run(
            image_path="./mon_image.png",
            asset_name="MonAsset",
            preset="lowvram",
            output_dir="./exports/assets_3d",
        )
        print(result["glb_path"])

    Usage (dans Blender operator):
        pipeline.run_and_import(context, image_path, asset_name, ...)
    """

    def __init__(
        self,
        comfyui_host: str = "127.0.0.1",
        comfyui_port: int = 8188,
    ):
        self.client = ComfyUIClient(host=comfyui_host, port=comfyui_port)
        self._status = ""

    @property
    def status(self) -> str:
        return self._status

    def _log(self, msg: str, callback: Optional[Callable] = None):
        self._status = msg
        if callback:
            callback(msg)
        print(f"[ImageTo3D] {msg}")

    def run(
        self,
        image_path: str,
        asset_name: str = "Asset",
        preset: str = "lowvram",
        remove_background: bool = True,
        seed: int = 12345,
        output_dir: str = "./exports/assets_3d",
        timeout: float = 300.0,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """
        Execute le pipeline Image -> GLB.

        Args:
            image_path       : chemin vers l'image source (PNG/JPG)
            asset_name       : nom de l'asset (sans espaces)
            preset           : 'lowvram' | 'standard' | 'lowpoly'
            remove_background: True si l'image a un fond a supprimer
            seed             : graine de generation
            output_dir       : dossier de sortie local
            timeout          : timeout en secondes
            progress_callback: callback(str) pour afficher la progression

        Returns:
            {
                "glb_path": str,       # chemin du GLB principal (textured)
                "all_glb_paths": list, # tous les GLB generes
                "asset_name": str,
                "duration": float,
            }
        """
        start = time.time()
        img_path = Path(image_path)
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # 1. Verifier ComfyUI
        self._log("Verification ComfyUI...", progress_callback)
        if not self.client.is_alive():
            raise ConnectionError("ComfyUI non accessible. Verifiez qu'il est lance sur localhost:8188")

        # 2. Upload image
        self._log(f"Upload image: {img_path.name}", progress_callback)
        upload_info = self.client.upload_image(str(img_path))
        uploaded_filename = upload_info.get("name", img_path.name)
        self._log(f"Image uploadee: {uploaded_filename}", progress_callback)

        # 3. Construire et envoyer le workflow
        self._log(f"Lancement Trellis2 ({preset})...", progress_callback)
        workflow = build_workflow(
            image_filename=uploaded_filename,
            asset_name=asset_name,
            preset=preset,
            seed=seed,
            remove_background=remove_background,
            resolution=512 if preset == "lowvram" else 1024,
        )
        prompt_id = self.client.queue_workflow(workflow)
        self._log(f"Workflow en queue: {prompt_id}", progress_callback)

        # 4. Attendre le resultat
        self._log("Generation 3D en cours...", progress_callback)
        outputs = self.client.wait_for_result(
            prompt_id,
            timeout=timeout,
            progress_callback=progress_callback,
        )
        self._log("Generation terminee.", progress_callback)

        # 5. Telecharger les GLB
        expected_files = get_expected_output_names(asset_name, preset)
        all_glb_paths = []
        main_glb = None

        for filename in expected_files:
            try:
                local_path = self.client.download_output(filename, str(output_path))
                all_glb_paths.append(local_path)
                self._log(f"GLB telecharge: {filename}", progress_callback)
            except Exception as e:
                self._log(f"(optionnel manquant: {filename})", progress_callback)

        # Aussi chercher dans les outputs
        output_files = self.client.get_output_files(outputs)
        for f in output_files:
            if f.endswith(".glb") and f not in [Path(p).name for p in all_glb_paths]:
                try:
                    local_path = self.client.download_output(f, str(output_path))
                    all_glb_paths.append(local_path)
                except Exception:
                    pass

        # Choisir le GLB principal (Textured en priorite)
        for p in all_glb_paths:
            if "Textured" in p:
                main_glb = p
                break
        if not main_glb and all_glb_paths:
            main_glb = all_glb_paths[-1]

        if not main_glb:
            raise FileNotFoundError(f"Aucun GLB genere pour {asset_name}")

        duration = time.time() - start
        self._log(f"Pipeline termine en {duration:.1f}s -> {Path(main_glb).name}", progress_callback)

        return {
            "glb_path": main_glb,
            "all_glb_paths": all_glb_paths,
            "asset_name": asset_name,
            "duration": duration,
            "prompt_id": prompt_id,
        }

    def import_glb_in_blender(self, glb_path: str, asset_name: str = "") -> Any:
        """
        Importe un GLB dans la scene Blender active.
        Doit etre appele depuis un operator Blender.

        Returns: l'objet Blender importe (bpy.types.Object)
        """
        try:
            import bpy

            bpy.ops.import_scene.gltf(filepath=glb_path, import_pack_images=True)

            # Recuperer les objets importes et les grouper
            imported = [obj for obj in bpy.context.selected_objects]
            if imported and asset_name:
                for obj in imported:
                    obj.name = f"{asset_name}_{obj.name}"
                    if obj.data:
                        obj.data.name = f"{asset_name}_mesh"

            return imported[0] if imported else None

        except ImportError:
            raise RuntimeError("Ce module doit etre execute dans Blender")
