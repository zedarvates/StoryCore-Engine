"""
comfyui_client.py -- Client API ComfyUI pour StoryCore Asset Creator.

Gere:
  - Envoi de workflow JSON via API HTTP
  - Upload d'images (input)
  - Polling du statut (queue)
  - Recuperation des outputs (GLB, PNG)
"""

from __future__ import annotations

import math
import time
import uuid
from pathlib import Path
from typing import Any

try:
    import requests
except ImportError:
    requests = None  # Blender embeds its own Python; requests peut manquer


class ComfyUIWaitTimeout(TimeoutError):
    """Suivi interrompu; prompt_id permet de reprendre sans soumettre de nouveau."""

    def __init__(self, prompt_id: str, reason: str = "wait_deadline"):
        self.prompt_id = prompt_id
        self.reason = reason
        detail = (
            "delai HTTP depasse"
            if reason == "http_timeout"
            else "delai d'attente depasse"
        )
        super().__init__(
            f"ComfyUI {prompt_id}: {detail}. "
            "Le suivi est interrompu; le prompt n'a pas ete annule."
        )


def _positive_seconds(value: float, name: str) -> float:
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f"{name} doit etre un nombre fini strictement positif")
    return value


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

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int | None = None,
        *,
        request_timeout: float = 30.0,
    ):
        self.request_timeout = _positive_seconds(request_timeout, "request_timeout")
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
    def from_project_config(
        cls, blender_prefs=None, *, request_timeout: float = 30.0
    ) -> ComfyUIClient:
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
        return cls(host=host, port=port, request_timeout=request_timeout)

    def _http_timeout(self, timeout: float | None) -> float:
        if timeout is None:
            return self.request_timeout
        return min(self.request_timeout, _positive_seconds(timeout, "timeout"))

    # ── API ──────────────────────────────────────────────────────────────────

    def is_alive(self) -> bool:
        """Verifie que ComfyUI repond."""
        if requests is None:
            return False
        try:
            r = requests.get(
                f"{self.base_url}/system_stats", timeout=min(5.0, self.request_timeout)
            )
            return r.status_code == 200
        except requests.exceptions.RequestException:
            return False

    def upload_image(self, image_path: str, subfolder: str = "") -> dict[str, Any]:
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
            r = requests.post(
                f"{self.base_url}/upload/image",
                files=files,
                data=data,
                timeout=self.request_timeout,
            )
            r.raise_for_status()
            return r.json()

    def queue_workflow(
        self, workflow: dict[str, Any], client_id: str | None = None
    ) -> str:
        """
        Envoie le workflow dans la queue ComfyUI.

        Returns: prompt_id (str)
        """
        payload = {
            "prompt": workflow,
            "client_id": client_id or self.client_id,
        }
        r = requests.post(
            f"{self.base_url}/prompt", json=payload, timeout=self.request_timeout
        )
        r.raise_for_status()
        return r.json()["prompt_id"]

    def get_queue_status(self, *, timeout: float | None = None) -> dict[str, Any]:
        """Retourne le statut de la queue."""
        r = requests.get(f"{self.base_url}/queue", timeout=self._http_timeout(timeout))
        r.raise_for_status()
        return r.json()

    def get_history(
        self, prompt_id: str, *, timeout: float | None = None
    ) -> dict[str, Any] | None:
        """Retourne l'historique d'un prompt execute."""
        r = requests.get(
            f"{self.base_url}/history/{prompt_id}", timeout=self._http_timeout(timeout)
        )
        r.raise_for_status()
        data = r.json()
        return data.get(prompt_id)

    def wait_for_result(
        self,
        prompt_id: str,
        timeout: float = 300.0,
        poll_interval: float = 2.0,
        progress_callback=None,
    ) -> dict[str, Any]:
        """
        Attend la fin d'un prompt en polling.

        Args:
            prompt_id        : ID retourne par queue_workflow
            timeout          : budget de suivi (hors garanties de temps reel)
            poll_interval    : intervalle de polling en secondes
            progress_callback: callable(status_str) optionnel

        Returns: outputs dict du prompt

        Raises: ComfyUIWaitTimeout si budget ecoule ou delai HTTP depasse
                RuntimeError si erreur dans le workflow

        Un timeout arrete le suivi, pas le prompt. Les delais Requests bornent
        connexion/inactivite de lecture, pas la duree totale d'une requete.
        """
        _positive_seconds(timeout, "timeout")
        _positive_seconds(poll_interval, "poll_interval")
        if requests is None:
            raise ImportError("Le client ComfyUI requiert le module requests")
        start = time.monotonic()
        deadline = start + timeout

        def remaining() -> float:
            budget = deadline - time.monotonic()
            if budget <= 0:
                raise ComfyUIWaitTimeout(prompt_id)
            return budget

        while True:
            try:
                history = self.get_history(prompt_id, timeout=remaining())
            except requests.exceptions.Timeout as error:
                raise ComfyUIWaitTimeout(prompt_id, "http_timeout") from error
            remaining()
            if history:
                if "error" in history:
                    raise RuntimeError(
                        f"ComfyUI {prompt_id} erreur: {history['error']}"
                    )
                status = history.get("status")
                if isinstance(status, dict):
                    if status.get("status_str") == "error":
                        raise RuntimeError(
                            f"ComfyUI {prompt_id} erreur: {status.get('messages', [])}"
                        )
                    if (
                        status.get("status_str") == "success"
                        and status.get("completed") is True
                    ):
                        outputs = history.get("outputs", {})
                        if not isinstance(outputs, dict):
                            raise RuntimeError(
                                f"ComfyUI {prompt_id}: outputs invalides"
                            )
                        return outputs

            if progress_callback:
                try:
                    queue = self.get_queue_status(timeout=remaining())
                except requests.exceptions.Timeout as error:
                    raise ComfyUIWaitTimeout(prompt_id, "http_timeout") from error
                remaining()
                running = len(queue.get("queue_running", []))
                pending = len(queue.get("queue_pending", []))
                elapsed = time.monotonic() - start
                progress_callback(
                    f"Running: {running} | Pending: {pending} | {elapsed:.0f}s"
                )

            time.sleep(min(poll_interval, remaining()))

    def download_output(self, filename: str, dest_dir: str, subfolder: str = "") -> str:
        """
        Telecharge un fichier output de ComfyUI (GLB, PNG...).

        Returns: chemin local du fichier telecharge
        """
        params = {"filename": filename, "type": "output"}
        if subfolder:
            params["subfolder"] = subfolder
        with requests.get(
            f"{self.base_url}/view",
            params=params,
            stream=True,
            timeout=self.request_timeout,
        ) as r:
            r.raise_for_status()
            dest = Path(dest_dir)
            dest.mkdir(parents=True, exist_ok=True)
            out_path = dest / filename

            with open(out_path, "wb") as f:
                f.writelines(r.iter_content(chunk_size=8192))

        return str(out_path)

    def get_output_files(self, outputs: dict[str, Any]) -> list[str]:
        """
        Extrait la liste des noms de fichiers depuis les outputs d'un prompt.

        Cherche les nodes de type 'images', 'gltf', 'glb_path' etc.
        """
        files = []
        for node_outputs in outputs.values():
            for values in node_outputs.values():
                if isinstance(values, list):
                    for v in values:
                        if isinstance(v, dict) and "filename" in v:
                            files.append(v["filename"])
                elif isinstance(values, str) and values.endswith(
                    (".glb", ".gltf", ".png")
                ):
                    files.append(Path(values).name)
        return files
