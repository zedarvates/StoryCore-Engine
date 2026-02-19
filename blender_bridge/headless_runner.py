"""
headless_runner.py — Exécution Blender en mode headless CLI
===========================================================

Responsabilité unique : exécuter un script Python via Blender CLI
et récupérer le fichier rendu produit.

Commande générée :
    blender -b -P <script.py> -- --scene <scene_id> --frame <n>

Séparation des couches :
  - description narrative  → SceneJSON
  - génération du script   → script_generator.py
  - EXÉCUTION BLENDER      → ce module
  - résultat               → chemin du fichier rendu
"""

from __future__ import annotations
import os
import re
import sys
import shutil
import subprocess
import logging
from pathlib import Path
from typing import Optional, Dict, Any
from datetime import datetime

from blender_bridge.scene_types import SceneJSON
from blender_bridge.safety_guard import SafeBlenderRunner, make_safe_runner

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
#  LECTEUR DE CONFIG PROJET
# ─────────────────────────────────────────────────────────────────────────────

def _load_blender_project_config() -> dict:
    """
    Charge config/blender_config.json depuis la racine du projet.

    Priorité d'exécutable :
      1. BLENDER_EXECUTABLE (variable d'environnement)  ← override absolu
      2. config/blender_config.json  "executable"       ← recommandé
      3. Auto-détection PATH + chemins communs          ← fallback

    Returns: dict brut (clés sans "_" de documentation)
    """
    defaults = {
        "executable": "",
        "version_preference": "4.2",
        "render": {
            "timeout_seconds": 600,
            "default_engine": "BLENDER_EEVEE",
            "default_samples": 32,
            "default_resolution_x": 1920,
            "default_resolution_y": 1080,
        },
        "paths": {
            "scripts_output": "./exports/blender/scripts",
            "renders_output": "./exports/blender/renders",
            "projection_output": "./exports/blender/projection_scripts",
        },
    }

    # Chercher le fichier config en remontant l'arborescence
    current = Path(__file__).resolve().parent
    for _ in range(10):
        candidate = current / "config" / "blender_config.json"
        if candidate.exists():
            try:
                import json
                with open(candidate, encoding="utf-8") as f:
                    raw = json.load(f)
                cfg = {k: v for k, v in raw.items() if not k.startswith("_")}
                return {**defaults, **cfg}
            except Exception as e:
                logger.warning(f"[BlenderBridge] Erreur lecture {candidate}: {e}")
            break
        parent = current.parent
        if parent == current:
            break
        current = parent

    # Fallback: CWD
    cwd_cfg = Path.cwd() / "config" / "blender_config.json"
    if cwd_cfg.exists():
        try:
            import json
            with open(cwd_cfg, encoding="utf-8") as f:
                raw = json.load(f)
            cfg = {k: v for k, v in raw.items() if not k.startswith("_")}
            return {**defaults, **cfg}
        except Exception:
            pass

    return defaults


# ─────────────────────────────────────────────────────────────────────────────
#  RUNNER PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────

class BlenderHeadlessRunner:
    """
    Exécute des scripts Blender en mode headless (sans interface graphique).

    Usage :
        runner = BlenderHeadlessRunner()
        result = runner.execute(script_path, scene)
        print(result["render_path"])

    Résultat :
        {
          "success": bool,
          "render_path": str | None,
          "script_path": str,
          "log": str,
          "duration_seconds": float,
          "error": str | None,
        }
    """

    def __init__(
        self,
        blender_executable: Optional[str] = None,
        output_dir: str = "./exports/blender",
        timeout_seconds: int = 600,
    ):
        """
        Args:
            blender_executable : chemin vers l'exécutable Blender
                                 (ex: None = auto-détection, "blender", "/opt/blender/blender",
                                       "C:/Program Files/Blender Foundation/Blender 4.2/blender.exe")
            output_dir         : dossier de sortie des rendus
            timeout_seconds    : timeout d'exécution (défaut : 10 min)
        """
        # None → auto-détection ; on garde "blender" comme fallback pour PATH
        self.blender_executable = blender_executable or "blender"
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.timeout_seconds = timeout_seconds

        # Vérification de l'exécutable au démarrage
        self._blender_path = self._resolve_blender_path()

    # ─── API PUBLIQUE ────────────────────────────────────────────────────────

    def execute(
        self,
        script_path: str,
        scene: Optional[SceneJSON] = None,
        frame: int = 1,
        extra_args: Optional[list] = None,
    ) -> Dict[str, Any]:
        """
        Exécute un script Blender en headless.

        Args:
            script_path : chemin vers le script Python Blender généré
            scene       : SceneJSON pour construire le chemin de sortie
            frame       : frame à rendre
            extra_args  : arguments supplémentaires passés après '--'

        Returns:
            dict avec success, render_path, log, error, duration_seconds
        """
        start_time = datetime.now()

        # Chemin de rendu attendu
        render_path = self._build_render_path(scene, frame)

        # Mise à jour du chemin de rendu dans le script si possible
        if scene is not None:
            render_path = self._patch_render_path_in_script(script_path, scene, render_path)

        # Construction de la commande CLI
        cmd = self._build_command(script_path, frame, extra_args)

        logger.info(f"[BlenderBridge] Lancement Blender headless (SafeRunner)")
        logger.info(f"  Script  : {script_path}")
        logger.info(f"  Commande: {' '.join(cmd)}")

        # ── Exécution via SafeBlenderRunner (anti-blocage buffer + kill tree) ──
        safe_runner = SafeBlenderRunner(
            blender_executable=self._blender_path or self.blender_executable,
            timeout_seconds=self.timeout_seconds,
            max_retries=1,          # Pas de retry ici (géré au niveau appelant)
            validate_scripts=True,  # Valider la syntaxe avant de lancer Blender
        )
        safe_result = safe_runner.execute(script_path, extra_args=extra_args)

        duration = (datetime.now() - start_time).total_seconds()
        log_output = safe_result.log

        # Prioriser le render_path détecté par SafeRunner
        if safe_result.render_path:
            render_path = safe_result.render_path

        if safe_result.success:
            logger.info(f"[BlenderBridge] Rendu terminé en {duration:.1f}s → {render_path}")
            return {
                "success": True,
                "render_path": render_path,
                "script_path": script_path,
                "log": log_output,
                "error": None,
                "duration_seconds": duration,
                "returncode": 0,
            }
        else:
            logger.error(f"[BlenderBridge] Erreur (code {safe_result.returncode}): {safe_result.error}")
            return {
                "success": False,
                "render_path": None,
                "script_path": script_path,
                "log": log_output,
                "error": safe_result.error,
                "duration_seconds": duration,
                "returncode": safe_result.returncode,
            }

    def is_blender_available(self) -> bool:
        """Vérifie que Blender est disponible sur le système."""
        return self._blender_path is not None

    def get_blender_version(self) -> Optional[str]:
        """Retourne la version de Blender installée."""
        if not self._blender_path:
            return None
        try:
            result = subprocess.run(
                [self._blender_path, "--version"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            for line in result.stdout.splitlines():
                if line.startswith("Blender"):
                    return line.strip()
        except Exception:
            pass
        return None

    def dry_run(self, script_path: str, scene: Optional[SceneJSON] = None) -> Dict[str, Any]:
        """
        Simulation à sec : retourne la commande CLI sans l'exécuter.
        Utile pour debug et tests.
        """
        render_path = self._build_render_path(scene, 1)
        cmd = self._build_command(script_path, 1)
        return {
            "command": " ".join(cmd),
            "command_parts": cmd,
            "script_path": script_path,
            "expected_render_path": render_path,
            "blender_available": self.is_blender_available(),
            "blender_version": self.get_blender_version(),
        }

    # ─── MÉTHODES PRIVÉES ───────────────────────────────────────────────────

    def _resolve_blender_path(self) -> Optional[str]:
        """
        Résout le chemin vers l'exécutable Blender.

        Ordre de priorité :
          1. Variable d'environnement BLENDER_EXECUTABLE  ← override absolu
          2. config/blender_config.json "executable"      ← recommandé
          3. Chemin fourni au constructeur                ← explicit
          4. Recherche dans le PATH système               ← auto
          5. Chemins Windows communs (4.2, 4.1, 4.0...)  ← auto
          6. Chemins Linux/Mac communs                    ← auto
        """
        # 1. Variable d'environnement (priorité maximale, override tout)
        env_path = os.environ.get("BLENDER_EXECUTABLE", "")
        if env_path and Path(env_path).exists():
            logger.debug(f"[BlenderBridge] Blender depuis env var: {env_path}")
            return env_path

        # 2. Fichier de config projet (config/blender_config.json)
        proj_cfg = _load_blender_project_config()
        cfg_exe = proj_cfg.get("executable", "").strip()
        if cfg_exe and Path(cfg_exe).exists():
            logger.info(f"[BlenderBridge] Blender depuis config/blender_config.json: {cfg_exe}")
            return cfg_exe
        elif cfg_exe:
            logger.warning(
                f"[BlenderBridge] Executable dans blender_config.json introuvable: {cfg_exe}\n"
                "  → Vérifiez le chemin dans config/blender_config.json"
            )

        # 3. Chemin fourni directement au constructeur
        if self.blender_executable != "blender" and Path(self.blender_executable).exists():
            return self.blender_executable

        # 4. Recherche dans le PATH système
        found = shutil.which(self.blender_executable)
        if found:
            return found

        # 5. Chemins communs Windows
        version_pref = proj_cfg.get("version_preference", "4.2")
        windows_paths = [
            rf"C:\Program Files\Blender Foundation\Blender {version_pref}\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.3\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.1\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 4.0\blender.exe",
            r"C:\Program Files\Blender Foundation\Blender 3.6\blender.exe",
        ]
        for p in windows_paths:
            if Path(p).exists():
                logger.info(f"[BlenderBridge] Blender auto-détecté: {p}")
                return p

        # 6. Chemins communs Linux/Mac
        unix_paths = [
            "/usr/bin/blender",
            "/usr/local/bin/blender",
            "/opt/blender/blender",
            "/snap/bin/blender",
        ]
        for p in unix_paths:
            if Path(p).exists():
                return p

        logger.warning(
            "[BlenderBridge] Blender non trouve.\n"
            "  Solutions :\n"
            "    1. Editer config/blender_config.json -> \"executable\": \"C:/..../blender.exe\"\n"
            "    2. Variable d'env : BLENDER_EXECUTABLE=C:/..../blender.exe\n"
            "    3. Installer Blender et l'ajouter au PATH systeme\n"
            "    4. https://www.blender.org/download/"
        )
        return None

    def _build_command(
        self,
        script_path: str,
        frame: int = 1,
        extra_args: Optional[list] = None,
    ) -> list:
        """
        Construit la commande CLI Blender.

        Format : blender -b -P <script.py> -- [extra_args]
        """
        exe = self._blender_path or self.blender_executable
        cmd = [
            exe,
            "--background",         # headless (équivalent -b)
            "--python", script_path,
            "--",                   # séparateur : arguments passés au script Python
            "--frame", str(frame),
        ]
        if extra_args:
            cmd.extend(extra_args)
        return cmd

    def _build_render_path(
        self,
        scene: Optional[SceneJSON],
        frame: int,
    ) -> str:
        """Construit le chemin de sortie du rendu."""
        if scene is None:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            return str(self.output_dir / f"render_{ts}_{frame:04d}.png")

        scene_id = scene.scene_id.replace(" ", "_")
        ext = scene.render.output_format.lower()
        if ext == "jpeg":
            ext = "jpg"
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{scene_id}_{ts}_{frame:04d}.{ext}"
        return str(self.output_dir / filename)

    def _patch_render_path_in_script(
        self,
        script_path: str,
        scene: SceneJSON,
        render_path: str,
    ) -> str:
        """
        Met à jour le chemin de rendu dans le script Python généré.
        Remplace le placeholder /tmp/render_ par le vrai chemin.
        """
        try:
            with open(script_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Normaliser le chemin pour Blender (slashes Unix même sur Windows)
            blender_path = render_path.replace("\\", "/")
            # Supprimer l'extension du chemin (Blender l'ajoute automatiquement)
            base_path = blender_path
            for ext in [".png", ".jpg", ".jpeg", ".exr"]:
                if base_path.lower().endswith(ext):
                    base_path = base_path[: -len(ext)]
                    break

            content = re.sub(
                r'scene\.render\.filepath\s*=\s*r?"[^"]*"',
                f'scene.render.filepath = r"{base_path}"',
                content,
            )

            with open(script_path, "w", encoding="utf-8") as f:
                f.write(content)

        except Exception as e:
            logger.warning(f"[BlenderBridge] Impossible de patcher le chemin de rendu : {e}")

        return render_path

    def _extract_render_path_from_log(self, log: str) -> Optional[str]:
        """
        Extrait le chemin du rendu depuis la sortie Blender.
        Cherche le marqueur : STORYCORE_RENDER_COMPLETE:<path>
        """
        for line in log.splitlines():
            if line.startswith("STORYCORE_RENDER_COMPLETE:"):
                path = line.split(":", 1)[1].strip()
                # Ajouter l'extension si manquante
                if path and not Path(path).suffix:
                    path += ".png"
                return path
            # Marqueur natif Blender
            if "Saved:" in line and "Time:" in line:
                match = re.search(r"Saved:\s+'([^']+)'", line)
                if match:
                    return match.group(1)
        return None

    def _extract_error(self, log: str) -> str:
        """Extrait le message d'erreur principal depuis la sortie Blender."""
        error_lines = []
        for line in log.splitlines():
            if any(kw in line for kw in ["Error", "Traceback", "Exception", "EXCEPTION"]):
                error_lines.append(line.strip())
        if error_lines:
            return " | ".join(error_lines[:5])
        # Retourner les dernières lignes du log si pas d'erreur identifiée
        lines = [l for l in log.splitlines() if l.strip()]
        return " | ".join(lines[-5:]) if lines else "Erreur inconnue"


    def execute_projection(
        self,
        script_path: str,
        image_path: str,
        scene_type: str = "exterior",
        timeout: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Exécute un script de projection 2.5D en headless.

        Passe l'image et le type de scène comme arguments après '--'.

        Commande générée :
            blender -b -P <script.py> -- <image.png> <exterior|interior>

        Args:
            script_path : chemin vers le script Python Blender de projection
            image_path  : chemin vers l'image source
            scene_type  : "exterior" ou "interior"
            timeout     : timeout en secondes (None = valeur par défaut du runner)

        Returns:
            dict avec success, render_path, log, error, duration_seconds
        """
        start_time = datetime.now()
        effective_timeout = timeout or self.timeout_seconds

        exe = self._blender_path or self.blender_executable
        cmd = [
            exe,
            "--background",
            "--python", script_path,
            "--",
            image_path,
            scene_type,
        ]

        logger.info(f"[BlenderBridge] Projection 2.5D headless")
        logger.info(f"  Script    : {script_path}")
        logger.info(f"  Image     : {image_path}")
        logger.info(f"  Type scène: {scene_type}")

        if not self._blender_path:
            return {
                "success": False,
                "render_path": None,
                "script_path": script_path,
                "log": "",
                "error": "Blender non disponible",
                "duration_seconds": 0.0,
                "command": " ".join(cmd),
            }

        # ── Exécution via SafeBlenderRunner (anti-blocage buffer + kill tree) ──
        safe_runner = SafeBlenderRunner(
            blender_executable=self._blender_path,
            timeout_seconds=effective_timeout,
            max_retries=1,
            validate_scripts=False,  # Script de projection déjà validé à la génération
        )
        safe_result = safe_runner.execute(
            script_path,
            extra_args=[image_path, scene_type],
        )

        duration = (datetime.now() - start_time).total_seconds()
        log_output = safe_result.log

        if safe_result.success:
            render_path = safe_result.render_path
            logger.info(f"[BlenderBridge] Projection rendue en {duration:.1f}s → {render_path}")
            return {
                "success": True,
                "render_path": render_path,
                "script_path": script_path,
                "log": log_output,
                "error": None,
                "duration_seconds": duration,
            }
        else:
            return {
                "success": False,
                "render_path": None,
                "script_path": script_path,
                "log": log_output,
                "error": safe_result.error,
                "duration_seconds": duration,
                "command": " ".join(cmd),
            }


# ─────────────────────────────────────────────────────────────────────────────
#  UTILITAIRE : commande CLI d'exemple
# ─────────────────────────────────────────────────────────────────────────────

def build_cli_example(
    script_path: str = "exports/blender/scripts/scene_ruelle_cyberpunk.py",
    blender_path: str = "blender",
) -> str:
    """Retourne un exemple de commande CLI Blender headless."""
    return (
        f"{blender_path} --background "
        f"--python {script_path} "
        f"-- --frame 1"
    )
