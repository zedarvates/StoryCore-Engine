"""
comfyui_client.py -- Client API ComfyUI pour StoryCore Asset Creator.

Gere:
  - Envoi de workflow JSON via API HTTP
  - Upload d'images (input)
  - Polling du statut (queue)
  - Recuperation des outputs (GLB, PNG)
"""
from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

try:
    import requests
except ImportError:
    requests = None  # Blender embeds its own Python; requests peut manquer


class ComfyUIClient:
    """
    Client HTTP pour ComfyUI (localhost ou remote).

    Usage depuis config projet (RECOMMANDE):
        client = ComfyUIClient.from_project_config()

    Usage direct (host + port explicites):
        client = ComfyUIClient(host="127.0.0.1", port=8188)  # ComfyUI standard
        client = ComfyUIClient(host="127.0.0.1", port=8000)  # ComfyUI Desktop

    NE PAS hardcoder le port 8188 — lire depuis config/comfyui_config.json.
    """

    def __init__(self, host: str = "127.0.0.1", port: Optional[int] = None):
        if port is None:
            # Tenter de charger depuis la config projet
            try:
                from .config_loader import get_comfyui_connection
                host, port = get_comfyui_connection()
            except Exception as e:
                raise ValueError(
                    f"Port ComfyUI non specifie et config introuvable: {e}\n"
                    "Editez config/comfyui_config.json ou passez port= explicitement."
                ) from e
        self.base_url = f"http://{host}:{port}"
        self.client_id = str(uuid.uuid4())

    @classmethod
    def from_project_config(cls, blender_prefs=None) -> "ComfyUIClient":
        """
        Cree un client en lisant la config depuis config/comfyui_config.json
        (avec surcharge optionnelle depuis les preferences Blender).

        Exemples:
            # Standard (depuis config/comfyui_config.json)
            client = ComfyUIClient.from_project_config()

            # Avec surcharge Blender prefs
            client = ComfyUIClient.from_project_config(blender_prefs=context.preferences.addons[...].preferences)
        """
        from .config_loader import get_comfyui_connection
        host, port = get_comfyui_connection(blender_prefs=blender_prefs)
        return cls(host=host, port=port)

    # ── API ──────────────────────────────────────────────────────────────────

    def is_alive(self) -> bool:
        """Verifie que ComfyUI repond."""
        try:
            r = requests.get(f"{self.base_url}/system_stats", timeout=5)
            return r.status_code == 200
        except Exception:
            return False

    def upload_image(self, image_path: str, subfolder: str = "") -> Dict[str, Any]:
        """
        Upload une image dans ComfyUI input/.

        Returns: {"name": "filename.png", "subfolder": "", "type": "input"}
        """
        path = Path(image_path)
        with open(path, "rb") as f:
            files = {"image": (path.name, f, "image/png")}
            data = {"type": "input", "overwrite": "true"}
            if subfolder:
                data["subfolder"] = subfolder
            r = requests.post(f"{self.base_url}/upload/image", files=files, data=data)
            r.raise_for_status()
            return r.json()

    def queue_workflow(self, workflow: Dict[str, Any], client_id: Optional[str] = None) -> str:
        """
        Envoie le workflow dans la queue ComfyUI.

        Returns: prompt_id (str)
        """
        payload = {
            "prompt": workflow,
            "client_id": client_id or self.client_id,
        }
        r = requests.post(f"{self.base_url}/prompt", json=payload)
        r.raise_for_status()
        return r.json()["prompt_id"]

    def get_queue_status(self) -> Dict[str, Any]:
        """Retourne le statut de la queue."""
        r = requests.get(f"{self.base_url}/queue")
        r.raise_for_status()
        return r.json()

    def get_history(self, prompt_id: str) -> Optional[Dict[str, Any]]:
        """Retourne l'historique d'un prompt execute."""
        r = requests.get(f"{self.base_url}/history/{prompt_id}")
        r.raise_for_status()
        data = r.json()
        return data.get(prompt_id)

    def wait_for_result(
        self,
        prompt_id: str,
        timeout: float = 300.0,
        poll_interval: float = 2.0,
        progress_callback=None,
    ) -> Dict[str, Any]:
        """
        Attend la fin d'un prompt en polling.

        Args:
            prompt_id        : ID retourne par queue_workflow
            timeout          : secondes max avant abandon
            poll_interval    : intervalle de polling en secondes
            progress_callback: callable(status_str) optionnel

        Returns: outputs dict du prompt

        Raises: TimeoutError si depasse le timeout
                RuntimeError si erreur dans le workflow
        """
        start = time.time()
        while True:
            elapsed = time.time() - start
            if elapsed > timeout:
                raise TimeoutError(f"Trellis2: timeout apres {timeout}s")

            history = self.get_history(prompt_id)
            if history:
                if "error" in history:
                    raise RuntimeError(f"ComfyUI erreur: {history['error']}")
                outputs = history.get("outputs", {})
                if outputs:
                    return outputs

            if progress_callback:
                queue = self.get_queue_status()
                running = len(queue.get("queue_running", []))
                pending = len(queue.get("queue_pending", []))
                progress_callback(f"Running: {running} | Pending: {pending} | {elapsed:.0f}s")

            time.sleep(poll_interval)

    def download_output(self, filename: str, dest_dir: str, subfolder: str = "") -> str:
        """
        Telecharge un fichier output de ComfyUI (GLB, PNG...).

        Returns: chemin local du fichier telecharge
        """
        params = {"filename": filename, "type": "output"}
        if subfolder:
            params["subfolder"] = subfolder
        r = requests.get(f"{self.base_url}/view", params=params, stream=True)
        r.raise_for_status()

        dest = Path(dest_dir)
        dest.mkdir(parents=True, exist_ok=True)
        out_path = dest / filename

        with open(out_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)

        return str(out_path)

    def get_output_files(self, outputs: Dict[str, Any]) -> list[str]:
        """
        Extrait la liste des noms de fichiers depuis les outputs d'un prompt.

        Cherche les nodes de type 'images', 'gltf', 'glb_path' etc.
        """
        files = []
        for node_id, node_outputs in outputs.items():
            for key, values in node_outputs.items():
                if isinstance(values, list):
                    for v in values:
                        if isinstance(v, dict) and "filename" in v:
                            files.append(v["filename"])
                elif isinstance(values, str) and (
                    values.endswith(".glb") or values.endswith(".gltf") or values.endswith(".png")
                ):
                    files.append(Path(values).name)
        return files
