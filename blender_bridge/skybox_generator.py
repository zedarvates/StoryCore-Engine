"""
skybox_generator.py — Générateur de Skyboxes 360° via ComfyUI
=============================================================

Permet de générer des textures équirectangulaires pour les environnements Blender.
Utilise l'API ComfyUI locale pour produire des images de haute qualité (panoramas).
"""

from pathlib import Path
from typing import Optional, Dict, Any

from addons.official.storycore_asset_creator.src.comfyui_client import ComfyUIClient


class SkyboxGenerator:
    """
    Gère la génération de Skyboxes via ComfyUI.
    """

    def __init__(self, output_dir: str = "./assets/generated/skyboxes"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        try:
            self.client = ComfyUIClient.from_project_config()
        except Exception:
            # Fallback si ComfyUI n'est pas configuré
            self.client = None

    def generate_skybox(self, prompt: str, style: str = "realistic") -> Optional[str]:
        """
        Génère une image de skybox 360°.

        Args:
            prompt: Description de l'environnement (ex: "cyberpunk city at night")
            style: Style visuel

        Returns:
            Chemin vers l'image générée ou None
        """
        if not self.client or not self.client.is_alive():
            print("[SkyboxGenerator] ComfyUI non disponible.")
            return None

        # Workflow minimaliste pour panorama (HDRI/Equirectangular)
        # Idéalement, charger un workflow JSON depuis workflows/comfyui/
        full_prompt = f"{prompt}, 360 panorama, equirectangular projection, highly detailed, {style}"

        # Exemple de workflow simplifié (structure ComfyUI API)
        workflow = self._get_skybox_workflow(full_prompt)

        try:
            print(f"[SkyboxGenerator] Lancement de la génération : {prompt}")
            prompt_id = self.client.queue_workflow(workflow)
            outputs = self.client.wait_for_result(prompt_id, timeout=120)

            files = self.client.get_output_files(outputs)
            if files:
                filename = files[0]
                local_path = self.client.download_output(filename, str(self.output_dir))
                return local_path
        except Exception as e:
            print(f"[SkyboxGenerator] Erreur : {e}")

        return None

    def _get_skybox_workflow(self, prompt: str) -> Dict[str, Any]:
        """Retourne un dictionnaire workflow ComfyUI pour un panorama (optimisé pour Flux)."""
        return {
            "3": {
                "class_type": "KSampler",
                "inputs": {
                    "cfg": 3.5,
                    "denoise": 1,
                    "latent_image": ["5", 0],
                    "model": ["4", 0],
                    "negative": ["7", 0],
                    "positive": ["6", 0],
                    "sampler_name": "euler",
                    "scheduler": "simple",
                    "seed": 42,
                    "steps": 20,
                },
            },
            "4": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": "flux1-dev.safetensors"},
            },
            "5": {
                "class_type": "EmptyLatentImage",
                "inputs": {
                    "batch_size": 1,
                    "height": 512,
                    "width": 1024,  # Ratio 2:1 pour panorama
                },
            },
            "6": {
                "class_type": "CLIPTextEncode",
                "inputs": {"clip": ["4", 1], "text": prompt},
            },
            "7": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "clip": ["4", 1],
                    "text": "low quality, distorted, watermark, signature",
                },
            },
            "8": {
                "class_type": "VAEDecode",
                "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
            },
            "9": {
                "class_type": "SaveImage",
                "inputs": {"filename_prefix": "Skybox", "images": ["8", 0]},
            },
        }
