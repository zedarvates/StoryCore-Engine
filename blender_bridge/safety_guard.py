"""
safety_guard.py — Exécution sécurisée de Blender sans risque de blocage
========================================================================

Problèmes évités :
  1. Blocage buffer  : subprocess.run(capture_output=True) gèle si stdout/stderr
                       dépasse la taille du pipe (~65 Ko sur Windows)
                       → Solution : Popen + threads de lecture non-bloquants

  2. Timeout ignoré : si Blender crée des threads enfants, SIGTERM ne les tue pas
                       → Solution : os.killpg / taskkill /F /T (arbre de processus)

  3. Script invalide : exécuter un script corrompu peut faire planter Blender
                       → Solution : validation syntaxique Python avant exécution

  4. Retry infini   : une boucle de retry sans budget peut bloquer indéfiniment
                       → Solution : budget MAX_RETRIES=3 avec backoff exponentiel

  5. Boucle d'attente : while True: sleep() sans condition de sortie
                       → Solution : threading.Event avec deadline absolue

Architecture :
  SafeBlenderRunner.execute()
      ↓
  _validate_script()          # syntaxe Python + marqueurs requis
      ↓
  _launch_with_watchdog()     # Popen + threads lecteurs + watchdog deadline
      ↓
  _drain_output_threads()     # vide stdout/stderr en parallèle (pas de deadlock)
      ↓
  _kill_tree()                # kill processus + tous ses enfants
      ↓
  BlenderRunResult            # résultat structuré avec durée, log, erreur
"""

from __future__ import annotations
import os
import sys
import ast
import time
import queue
import shutil
import signal
import logging
import threading
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

# ─── CONSTANTES ───────────────────────────────────────────────────────────────
MAX_RETRIES      = 3          # Nombre maximum de tentatives
RETRY_BACKOFF    = 2.0        # Facteur de backoff entre les tentatives (secondes)
MAX_OUTPUT_LINES = 2000       # Nombre max de lignes de log conservées (anti-mémoire)
DRAIN_TIMEOUT    = 5.0        # Timeout final de lecture des pipes après la fin du process
SCRIPT_MAX_SIZE  = 512_000    # Taille max d'un script Blender (512 Ko)


# ─────────────────────────────────────────────────────────────────────────────
#  RÉSULTAT DE L'EXÉCUTION
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class BlenderRunResult:
    """Résultat structuré d'une exécution Blender."""
    success: bool
    returncode: int
    stdout: str
    stderr: str
    duration_seconds: float
    script_path: str
    render_path: Optional[str] = None
    error: Optional[str] = None
    attempt: int = 1            # Numéro de la tentative ayant réussi

    @property
    def log(self) -> str:
        """Sortie complète (stdout + stderr)."""
        return (self.stdout + "\n" + self.stderr).strip()

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success":          self.success,
            "returncode":       self.returncode,
            "duration_seconds": self.duration_seconds,
            "script_path":      self.script_path,
            "render_path":      self.render_path,
            "error":            self.error,
            "attempt":          self.attempt,
            "log":              self.log[-3000:],   # Tronqué pour les logs
        }


# ─────────────────────────────────────────────────────────────────────────────
#  VALIDATION DE SCRIPT
# ─────────────────────────────────────────────────────────────────────────────

class ScriptValidator:
    """
    Valide un script Python Blender AVANT de l'exécuter.

    Checks :
      1. Syntaxe Python valide (ast.parse)
      2. Taille raisonnable (< SCRIPT_MAX_SIZE)
      3. Présence des imports attendus (import bpy)
      4. Absence de patterns dangereux connus (while True sans break)
    """

    DANGEROUS_PATTERNS = [
        # Boucle infinie sans break
        ("while True:", "while True sans break détecté"),
        ("while 1:",    "while 1 sans break détecté"),
    ]

    def validate(self, script_path: str) -> tuple[bool, str]:
        """
        Valide le script.

        Returns:
            (True, "") si valide
            (False, "raison") si invalide
        """
        path = Path(script_path)

        # 1. Fichier existe
        if not path.exists():
            return False, f"Script introuvable : {script_path}"

        # 2. Taille raisonnable
        size = path.stat().st_size
        if size > SCRIPT_MAX_SIZE:
            return False, f"Script trop volumineux : {size} octets (max {SCRIPT_MAX_SIZE})"

        try:
            source = path.read_text(encoding="utf-8")
        except Exception as e:
            return False, f"Erreur lecture : {e}"

        # 3. Syntaxe Python valide
        try:
            tree = ast.parse(source)
        except SyntaxError as e:
            return False, f"Erreur syntaxe Python ligne {e.lineno}: {e.msg}"

        # 4. Patterns dangereux — recherche naïve + vérification ast
        source_lower = source.lower()
        for pattern, description in self.DANGEROUS_PATTERNS:
            if pattern.lower() in source_lower:
                # Vérifier si un break est présent à proximité
                if "break" not in source_lower and "timeout" not in source_lower:
                    logger.warning(f"[SafeGuard] Pattern risqué détecté : {description}")
                    # Warning seulement, pas d'erreur bloquante
                    # (Blender lui-même peut avoir des while True légitimes)

        # 5. Doit importer bpy (sinon ce n'est pas un script Blender)
        has_bpy = any(
            isinstance(node, (ast.Import, ast.ImportFrom))
            and any(
                (alias.name == "bpy" if isinstance(node, ast.Import) else node.module == "bpy")
                for alias in node.names
            )
            for node in ast.walk(tree)
        )
        if not has_bpy:
            return False, "Script ne contient pas 'import bpy' — n'est pas un script Blender valide"

        return True, ""


# ─────────────────────────────────────────────────────────────────────────────
#  RUNNER SÉCURISÉ PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────

class SafeBlenderRunner:
    """
    Exécute Blender headless sans risque de blocage.

    Différences vs subprocess.run(capture_output=True) :
      - Lecture stdout/stderr dans des threads séparés (pas de deadlock buffer)
      - Kill de l'arbre de processus complet (pas seulement le processus parent)
      - Deadline absolue (monotonic clock) contre les dérives de timeout
      - Retry automatique avec backoff exponentiel
      - Validation syntaxique du script avant exécution
    """

    def __init__(
        self,
        blender_executable: str = "blender",
        timeout_seconds: int = 300,
        max_retries: int = MAX_RETRIES,
        validate_scripts: bool = True,
    ):
        self.blender_executable = blender_executable
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.validator = ScriptValidator() if validate_scripts else None

    # ─── API PUBLIQUE ────────────────────────────────────────────────────────

    def execute(
        self,
        script_path: str,
        extra_args: Optional[List[str]] = None,
    ) -> BlenderRunResult:
        """
        Exécute un script Blender avec protection totale contre les blocages.

        Stratégie :
          1. Valide le script syntaxiquement
          2. Tente l'exécution (max MAX_RETRIES fois)
          3. Chaque tentative a une deadline absolue
          4. En cas de timeout : kill de l'arbre de processus complet
          5. Backoff exponentiel entre les tentatives

        Args:
            script_path : chemin du script .py Blender
            extra_args  : arguments supplémentaires après '--'

        Returns:
            BlenderRunResult avec tous les détails
        """
        start = time.monotonic()

        # 1. Validation préalable
        if self.validator:
            ok, reason = self.validator.validate(script_path)
            if not ok:
                return BlenderRunResult(
                    success=False,
                    returncode=-10,
                    stdout="",
                    stderr=reason,
                    duration_seconds=time.monotonic() - start,
                    script_path=script_path,
                    error=f"Script invalide : {reason}",
                )

        # 2. Tentatives avec backoff
        last_result = None
        for attempt in range(1, self.max_retries + 1):
            logger.info(f"[SafeGuard] Tentative {attempt}/{self.max_retries} : {Path(script_path).name}")

            result = self._run_once(script_path, extra_args, attempt)

            if result.success:
                logger.info(f"[SafeGuard] Succès (tentative {attempt}) en {result.duration_seconds:.1f}s")
                return result

            last_result = result

            # Réessayer SEULEMENT sur timeout (-1) ou kill signal (-9)
            # Toute autre erreur (FileNotFoundError=-2, code Blender>0) est définitive
            if result.returncode not in (-1, -9):
                logger.warning(
                    f"[SafeGuard] Tentative {attempt} échouée (code {result.returncode}) "
                    f"— pas de retry (erreur définitive)"
                )
                break

            # Backoff avant la prochaine tentative
            if attempt < self.max_retries:
                wait = RETRY_BACKOFF * (2 ** (attempt - 1))   # 2s, 4s, 8s...
                logger.warning(
                    f"[SafeGuard] Tentative {attempt} échouée — retry dans {wait:.0f}s"
                )
                time.sleep(wait)

        logger.error(f"[SafeGuard] Toutes les tentatives épuisées pour {script_path}")
        return last_result

    def dry_run(self, script_path: str, extra_args: Optional[List[str]] = None) -> Dict[str, Any]:
        """Retourne la commande CLI qui serait exécutée, sans l'exécuter."""
        cmd = self._build_command(script_path, extra_args)
        valid, reason = self.validator.validate(script_path) if self.validator else (True, "")
        return {
            "command": " ".join(cmd),
            "script_valid": valid,
            "validation_error": reason or None,
            "timeout_seconds": self.timeout_seconds,
            "max_retries": self.max_retries,
        }

    # ─── EXÉCUTION INTERNE ───────────────────────────────────────────────────

    def _run_once(
        self,
        script_path: str,
        extra_args: Optional[List[str]],
        attempt: int,
    ) -> BlenderRunResult:
        """Lance Blender une fois avec protection contre les blocages."""
        cmd = self._build_command(script_path, extra_args)
        start = time.monotonic()
        deadline = start + self.timeout_seconds

        stdout_lines: List[str] = []
        stderr_lines: List[str] = []
        stdout_q: queue.Queue = queue.Queue()
        stderr_q: queue.Queue = queue.Queue()

        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding="utf-8",
                errors="replace",
                # Créer un groupe de processus pour pouvoir kill tout l'arbre
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0,
            )
        except FileNotFoundError:
            duration = time.monotonic() - start
            return BlenderRunResult(
                success=False,
                returncode=-2,
                stdout="",
                stderr=f"Blender introuvable : '{self.blender_executable}'",
                duration_seconds=duration,
                script_path=script_path,
                error=f"Blender introuvable : '{self.blender_executable}'",
                attempt=attempt,
            )

        # Threads de lecture non-bloquants (évitent le deadlock buffer)
        t_stdout = threading.Thread(
            target=self._drain_pipe,
            args=(proc.stdout, stdout_q),
            daemon=True,
        )
        t_stderr = threading.Thread(
            target=self._drain_pipe,
            args=(proc.stderr, stderr_q),
            daemon=True,
        )
        t_stdout.start()
        t_stderr.start()

        # Watchdog : vérifie la deadline toutes les 0.5s
        killed = threading.Event()

        def watchdog():
            while not killed.is_set():
                if time.monotonic() >= deadline:
                    logger.warning(
                        f"[SafeGuard] Timeout {self.timeout_seconds}s — kill processus {proc.pid}"
                    )
                    self._kill_tree(proc)
                    killed.set()
                    return
                killed.wait(timeout=0.5)

        t_watchdog = threading.Thread(target=watchdog, daemon=True)
        t_watchdog.start()

        # Attendre la fin du processus
        returncode = proc.wait()
        killed.set()   # Signaler au watchdog que le process est terminé

        # Attendre que les threads de lecture aient vidé les pipes
        t_stdout.join(timeout=DRAIN_TIMEOUT)
        t_stderr.join(timeout=DRAIN_TIMEOUT)
        t_watchdog.join(timeout=1.0)

        # Collecter les sorties
        while not stdout_q.empty():
            stdout_lines.append(stdout_q.get_nowait())
        while not stderr_q.empty():
            stderr_lines.append(stderr_q.get_nowait())

        # Tronquer si trop de lignes
        if len(stdout_lines) > MAX_OUTPUT_LINES:
            stdout_lines = stdout_lines[-MAX_OUTPUT_LINES:]
        if len(stderr_lines) > MAX_OUTPUT_LINES:
            stderr_lines = stderr_lines[-MAX_OUTPUT_LINES:]

        stdout_str = "\n".join(stdout_lines)
        stderr_str = "\n".join(stderr_lines)
        duration = time.monotonic() - start

        # Vérifier si on a été tué par le watchdog
        if returncode in (-9, -15, 1) and duration >= self.timeout_seconds - 1:
            return BlenderRunResult(
                success=False,
                returncode=-1,
                stdout=stdout_str,
                stderr=stderr_str,
                duration_seconds=duration,
                script_path=script_path,
                error=f"Timeout après {self.timeout_seconds}s",
                attempt=attempt,
            )

        # Succès
        if returncode == 0:
            render_path = self._extract_render_path(stdout_str + stderr_str)
            return BlenderRunResult(
                success=True,
                returncode=0,
                stdout=stdout_str,
                stderr=stderr_str,
                duration_seconds=duration,
                script_path=script_path,
                render_path=render_path,
                attempt=attempt,
            )

        # Erreur Blender
        error_msg = self._extract_error(stdout_str + "\n" + stderr_str)
        return BlenderRunResult(
            success=False,
            returncode=returncode,
            stdout=stdout_str,
            stderr=stderr_str,
            duration_seconds=duration,
            script_path=script_path,
            error=error_msg,
            attempt=attempt,
        )

    @staticmethod
    def _drain_pipe(pipe, q: queue.Queue) -> None:
        """
        Lit un pipe ligne par ligne dans un thread dédié.
        Évite le blocage du pipe buffer (problème classique subprocess).
        """
        try:
            for line in pipe:
                q.put(line.rstrip("\n\r"))
        except Exception:
            pass
        finally:
            try:
                pipe.close()
            except Exception:
                pass

    @staticmethod
    def _kill_tree(proc: subprocess.Popen) -> None:
        """
        Tue le processus ET tous ses enfants (arbre complet).

        Windows : taskkill /F /T /PID
        Unix    : os.killpg (signal au groupe de processus)
        """
        try:
            if sys.platform == "win32":
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                    capture_output=True,
                    timeout=5,
                )
            else:
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        except Exception as e:
            logger.debug(f"[SafeGuard] Kill tree : {e}")
            try:
                proc.kill()
            except Exception:
                pass

    def _build_command(
        self,
        script_path: str,
        extra_args: Optional[List[str]] = None,
    ) -> List[str]:
        """Construit la commande CLI Blender."""
        cmd = [
            self.blender_executable,
            "--background",
            "--python", script_path,
            "--",
        ]
        if extra_args:
            cmd.extend(extra_args)
        return cmd

    @staticmethod
    def _extract_render_path(log: str) -> Optional[str]:
        """Extrait le chemin du rendu depuis la sortie Blender."""
        import re
        for line in log.splitlines():
            if line.startswith("STORYCORE_RENDER_COMPLETE:"):
                return line.split(":", 1)[1].strip()
            if line.startswith("STORYCORE_ASSET_COMPLETE:"):
                return line.split(":", 1)[1].strip()
            m = re.search(r"Saved:\s+'([^']+)'", line)
            if m:
                return m.group(1)
        return None

    @staticmethod
    def _extract_error(log: str) -> str:
        """Extrait le message d'erreur principal."""
        error_lines = [
            line.strip() for line in log.splitlines()
            if any(kw in line for kw in ["Error", "Traceback", "Exception", "EXCEPTION"])
        ]
        if error_lines:
            return " | ".join(error_lines[:5])
        lines = [l for l in log.splitlines() if l.strip()]
        return " | ".join(lines[-5:]) if lines else "Erreur inconnue"


# ─────────────────────────────────────────────────────────────────────────────
#  INTÉGRATION AVEC headless_runner.py
# ─────────────────────────────────────────────────────────────────────────────

def make_safe_runner(
    blender_executable: str = "blender",
    timeout_seconds: int = 300,
) -> SafeBlenderRunner:
    """
    Crée un SafeBlenderRunner prêt à l'emploi.

    À utiliser à la place de subprocess.run() partout dans le projet.

    Exemple :
        runner = make_safe_runner("blender", timeout_seconds=600)
        result = runner.execute("./exports/blender/scripts/scene.py")
        if result.success:
            print(f"Rendu : {result.render_path}")
        else:
            print(f"Erreur : {result.error}")
    """
    return SafeBlenderRunner(
        blender_executable=blender_executable,
        timeout_seconds=timeout_seconds,
        max_retries=MAX_RETRIES,
        validate_scripts=True,
    )
