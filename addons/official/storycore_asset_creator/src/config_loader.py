"""
config_loader.py -- Chargeur de configuration ComfyUI pour StoryCore Asset Creator.

PRIORITE DE LECTURE (du plus prioritaire au moins prioritaire):
  1. config/comfyui_config.json  (fichier projet racine StoryCore)
  2. Preferences Blender de l'addon (si execute dans Blender)
  3. Variables d'environnement STORYCORE_COMFYUI_HOST / STORYCORE_COMFYUI_PORT
  4. Valeurs par defaut hardcodees (AUCUN port par defaut - l'utilisateur doit configurer)

POURQUOI:
  - ComfyUI Standard  : port 8188
  - ComfyUI Desktop   : port 8000
  - ComfyUI Remote    : host + port quelconque
  Ne JAMAIS assumer un port fixe.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Optional


# ── Chemins de recherche pour config/comfyui_config.json ──────────────────────
# Cherche en remontant depuis le dossier de l'addon jusqu'a la racine du projet

def _find_project_config() -> Optional[Path]:
    """
    Remonte l'arborescence depuis ce fichier pour trouver config/comfyui_config.json.

    Strategie : cherche un fichier config/comfyui_config.json dans les parents.
    S'arrete quand il trouve ou atteint la racine du disque.
    """
    current = Path(__file__).resolve().parent

    for _ in range(10):  # max 10 niveaux de remontee
        candidate = current / "config" / "comfyui_config.json"
        if candidate.exists():
            return candidate
        parent = current.parent
        if parent == current:
            break
        current = parent

    # Chercher aussi dans le repertoire courant de travail
    cwd_candidate = Path.cwd() / "config" / "comfyui_config.json"
    if cwd_candidate.exists():
        return cwd_candidate

    return None


def load_comfyui_config() -> dict:
    """
    Charge la configuration ComfyUI depuis le fichier projet.

    Returns:
        dict avec au minimum:
            host             : str
            port             : int
            timeout_seconds  : float
            poll_interval_seconds: float
            output_dirs      : dict

    Raises: aucune exception - retourne les valeurs par defaut si echec
    """
    defaults = {
        "host": "127.0.0.1",
        "port": None,              # Volontairement None = non configure
        "timeout_seconds": 300.0,
        "poll_interval_seconds": 2.0,
        "output_dirs": {
            "assets_3d":  "./exports/assets_3d",
            "puppets":    "./exports/puppets",
            "organic":    "./exports/organic",
            "references": "./exports/blender/references",
        },
    }

    config_path = _find_project_config()

    if config_path:
        try:
            with open(config_path, encoding="utf-8") as f:
                raw = json.load(f)

            # Filtrer les cles de documentation (_doc, _note, etc.)
            cfg = {k: v for k, v in raw.items() if not k.startswith("_")}
            merged = {**defaults, **cfg}
            merged["_config_path"] = str(config_path)
            return merged

        except Exception as e:
            print(f"[StoryCore Config] Erreur lecture {config_path}: {e}")

    # Fallback: variables d'environnement
    host = os.environ.get("STORYCORE_COMFYUI_HOST", defaults["host"])
    port_env = os.environ.get("STORYCORE_COMFYUI_PORT")
    port = int(port_env) if port_env else defaults["port"]

    return {**defaults, "host": host, "port": port, "_config_path": "env/default"}


def get_comfyui_connection(blender_prefs=None) -> tuple[str, int]:
    """
    Retourne (host, port) en appliquant la priorite de configuration.

    Args:
        blender_prefs: objet preferences Blender de l'addon (optionnel)

    Returns:
        (host: str, port: int)

    Raises:
        ValueError si le port n'est pas configure nulle part
    """
    cfg = load_comfyui_config()

    host = cfg.get("host", "127.0.0.1")
    port = cfg.get("port")  # peut etre None si non configure dans le JSON

    # Surcharge par les preferences Blender si disponibles
    if blender_prefs is not None:
        try:
            bl_host = getattr(blender_prefs, "comfyui_host", None)
            bl_port = getattr(blender_prefs, "comfyui_port", None)
            if bl_host:
                host = bl_host
            if bl_port and bl_port != 0:
                port = bl_port
        except Exception:
            pass

    # Validation
    if not port:
        raise ValueError(
            "Port ComfyUI non configure!\n"
            "Options:\n"
            "  1. Editer config/comfyui_config.json -> 'port': 8188 (standard) ou 8000 (Desktop)\n"
            "  2. Dans Blender: addon preferences -> ComfyUI Port\n"
            "  3. Variable d'env: STORYCORE_COMFYUI_PORT=8188"
        )

    return host, int(port)


def get_output_dir(category: str = "assets_3d", base_dir: Optional[str] = None) -> str:
    """
    Retourne le dossier de sortie pour une categorie d'assets.

    Args:
        category : 'assets_3d' | 'puppets' | 'organic' | 'references'
        base_dir : dossier de base override (ex: depuis prefs Blender)

    Returns: chemin absolu ou relatif au projet
    """
    if base_dir:
        return base_dir

    cfg = load_comfyui_config()
    output_dirs = cfg.get("output_dirs", {})
    return output_dirs.get(category, f"./exports/{category}")


def get_timeout() -> float:
    """Retourne le timeout en secondes depuis la config."""
    return float(load_comfyui_config().get("timeout_seconds", 300.0))


def get_poll_interval() -> float:
    """Retourne l'intervalle de polling en secondes."""
    return float(load_comfyui_config().get("poll_interval_seconds", 2.0))


def describe_config() -> str:
    """Retourne une description lisible de la config active (pour debug/UI)."""
    cfg = load_comfyui_config()
    host = cfg.get("host", "?")
    port = cfg.get("port", "NON CONFIGURE")
    source = cfg.get("_config_path", "?")
    return f"ComfyUI: {host}:{port} (lu depuis: {source})"
