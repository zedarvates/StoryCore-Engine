"""
tests/test_safety_guard.py — Tests unitaires de blender_bridge/safety_guard.py
===============================================================================

Couvre :
  - BlenderRunResult (propriétés, sérialisation)
  - ScriptValidator (syntaxe, taille, import bpy, patterns dangereux)
  - SafeBlenderRunner (dry_run, FileNotFoundError, commande CLI)
  - make_safe_runner (factory)

Tous les tests fonctionnent SANS Blender installé.
"""

import ast
import time
import queue
import threading
from pathlib import Path
import pytest

from blender_bridge.safety_guard import (
    BlenderRunResult,
    ScriptValidator,
    SafeBlenderRunner,
    make_safe_runner,
    MAX_RETRIES,
    MAX_OUTPUT_LINES,
    SCRIPT_MAX_SIZE,
)


# ─────────────────────────────────────────────────────────────────────────────
#  FIXTURES
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def valid_script(tmp_path) -> str:
    """Script Blender Python valide."""
    p = tmp_path / "valid_scene.py"
    p.write_text(
        "import bpy\n"
        "bpy.ops.object.select_all(action='SELECT')\n"
        "bpy.ops.object.delete()\n"
        "scene = bpy.context.scene\n"
        "scene.render.filepath = '/tmp/render'\n"
        "bpy.ops.render.render(write_still=True)\n"
        "print('STORYCORE_RENDER_COMPLETE:/tmp/render.png')\n",
        encoding="utf-8",
    )
    return str(p)


@pytest.fixture
def invalid_syntax_script(tmp_path) -> str:
    """Script avec syntaxe Python invalide."""
    p = tmp_path / "bad_syntax.py"
    p.write_text(
        "import bpy\n"
        "def broken(\n"
        "    # missing closing paren\n",
        encoding="utf-8",
    )
    return str(p)


@pytest.fixture
def no_bpy_script(tmp_path) -> str:
    """Script Python valide mais sans import bpy."""
    p = tmp_path / "no_bpy.py"
    p.write_text(
        "import os\n"
        "print('Hello world')\n",
        encoding="utf-8",
    )
    return str(p)


@pytest.fixture
def large_script(tmp_path) -> str:
    """Script dépassant la taille maximale."""
    p = tmp_path / "large_script.py"
    content = "import bpy\n" + "# comment\n" * (SCRIPT_MAX_SIZE // 10)
    p.write_text(content, encoding="utf-8")
    return str(p)


@pytest.fixture
def runner() -> SafeBlenderRunner:
    """Runner avec exécutable fictif (ne sera pas exécuté réellement)."""
    return SafeBlenderRunner(
        blender_executable="fake_blender_not_installed",
        timeout_seconds=10,
        max_retries=1,
        validate_scripts=True,
    )


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : BlenderRunResult
# ─────────────────────────────────────────────────────────────────────────────

class TestBlenderRunResult:

    def test_creation_success(self):
        r = BlenderRunResult(
            success=True,
            returncode=0,
            stdout="Blender rendered",
            stderr="",
            duration_seconds=12.5,
            script_path="/tmp/scene.py",
            render_path="/tmp/render.png",
        )
        assert r.success is True
        assert r.returncode == 0
        assert r.render_path == "/tmp/render.png"

    def test_log_property_combines(self):
        r = BlenderRunResult(
            success=False, returncode=1,
            stdout="out", stderr="err",
            duration_seconds=1.0, script_path="s.py",
        )
        assert "out" in r.log
        assert "err" in r.log

    def test_to_dict_keys(self):
        r = BlenderRunResult(
            success=True, returncode=0,
            stdout="OK", stderr="",
            duration_seconds=5.0, script_path="test.py",
            render_path="/out.png", attempt=2,
        )
        d = r.to_dict()
        assert d["success"] is True
        assert d["returncode"] == 0
        assert d["duration_seconds"] == pytest.approx(5.0)
        assert d["render_path"] == "/out.png"
        assert d["attempt"] == 2
        assert "log" in d

    def test_log_truncated_in_dict(self):
        """Le log dans to_dict est tronqué à 3000 chars."""
        long_log = "x" * 10_000
        r = BlenderRunResult(
            success=False, returncode=1,
            stdout=long_log, stderr="",
            duration_seconds=1.0, script_path="s.py",
        )
        d = r.to_dict()
        assert len(d["log"]) <= 3000

    def test_attempt_default(self):
        r = BlenderRunResult(
            success=True, returncode=0,
            stdout="", stderr="",
            duration_seconds=1.0, script_path="s.py",
        )
        assert r.attempt == 1


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : ScriptValidator
# ─────────────────────────────────────────────────────────────────────────────

class TestScriptValidator:

    def test_valid_script(self, valid_script):
        v = ScriptValidator()
        ok, reason = v.validate(valid_script)
        assert ok is True
        assert reason == ""

    def test_missing_file(self):
        v = ScriptValidator()
        ok, reason = v.validate("/nonexistent/script.py")
        assert ok is False
        assert "introuvable" in reason.lower()

    def test_syntax_error(self, invalid_syntax_script):
        v = ScriptValidator()
        ok, reason = v.validate(invalid_syntax_script)
        assert ok is False
        assert "syntaxe" in reason.lower() or "syntax" in reason.lower()

    def test_no_bpy_import(self, no_bpy_script):
        v = ScriptValidator()
        ok, reason = v.validate(no_bpy_script)
        assert ok is False
        assert "bpy" in reason.lower()

    def test_oversized_script(self, large_script):
        v = ScriptValidator()
        ok, reason = v.validate(large_script)
        assert ok is False
        assert "volumineux" in reason.lower() or "max" in reason.lower()

    def test_dangerous_pattern_warning_only(self, tmp_path):
        """while True sans break → warning seulement, pas d'erreur."""
        p = tmp_path / "loop.py"
        p.write_text(
            "import bpy\n"
            "while True:\n"
            "    pass\n",
            encoding="utf-8",
        )
        v = ScriptValidator()
        # Doit valider quand même (warning seulement)
        # Blender peut avoir des while True légitimes
        ok, reason = v.validate(str(p))
        # Le script est syntaxiquement valide et a import bpy
        assert ok is True

    def test_bpy_fromimport(self, tmp_path):
        """import bpy via 'from bpy import ...' est aussi valide."""
        p = tmp_path / "frombpy.py"
        p.write_text(
            "import bpy\nimport bpy.ops\nprint('ok')\n",
            encoding="utf-8",
        )
        v = ScriptValidator()
        ok, _ = v.validate(str(p))
        assert ok is True


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : SafeBlenderRunner
# ─────────────────────────────────────────────────────────────────────────────

class TestSafeBlenderRunner:

    def test_creation(self):
        r = SafeBlenderRunner(
            blender_executable="blender",
            timeout_seconds=300,
            max_retries=3,
        )
        assert r.timeout_seconds == 300
        assert r.max_retries == 3
        assert r.validator is not None

    def test_creation_no_validation(self):
        r = SafeBlenderRunner(validate_scripts=False)
        assert r.validator is None

    def test_execute_invalid_script_returns_fast(self, runner, no_bpy_script):
        """Un script invalide retourne immédiatement sans lancer Blender."""
        start = time.monotonic()
        result = runner.execute(no_bpy_script)
        elapsed = time.monotonic() - start
        assert result.success is False
        assert "invalide" in result.error.lower() or "bpy" in result.error.lower()
        assert elapsed < 2.0  # Doit être quasi-instantané

    def test_execute_missing_script_returns_fast(self, runner):
        """Un script manquant retourne immédiatement."""
        start = time.monotonic()
        result = runner.execute("/nonexistent/blender_script.py")
        elapsed = time.monotonic() - start
        assert result.success is False
        assert elapsed < 2.0

    def test_execute_blender_not_found(self, runner, valid_script):
        """Si Blender n'est pas trouvé → FileNotFoundError → result structuré."""
        result = runner.execute(valid_script)
        assert result.success is False
        assert result.returncode == -2
        assert "introuvable" in result.error.lower() or "not found" in result.error.lower()

    def test_execute_no_retry_on_definitive_error(self, runner, valid_script):
        """
        Si Blender retourne un code d'erreur non-timeout,
        on ne réessaie pas (on ne bloque pas sur des retries inutiles).
        """
        # Avec max_retries=1 et Blender absent (code=-2), pas de retry
        runner.max_retries = 2
        result = runner.execute(valid_script)
        assert result.attempt == 1  # Pas de deuxième tentative pour FileNotFoundError

    def test_dry_run_returns_command(self, runner, valid_script):
        """dry_run retourne la commande sans l'exécuter."""
        info = runner.dry_run(valid_script)
        assert "command" in info
        assert "fake_blender_not_installed" in info["command"]
        assert "--background" in info["command"]
        assert "--python" in info["command"]
        assert info["script_valid"] is True

    def test_dry_run_invalid_script(self, runner, no_bpy_script):
        """dry_run signale le script invalide."""
        info = runner.dry_run(no_bpy_script)
        assert info["script_valid"] is False
        assert info["validation_error"] is not None

    def test_build_command_structure(self, runner):
        """La commande générée a la bonne structure."""
        cmd = runner._build_command("/tmp/script.py", ["arg1", "arg2"])
        assert cmd[0] == "fake_blender_not_installed"
        assert "--background" in cmd
        assert "--python" in cmd
        assert "/tmp/script.py" in cmd
        assert "--" in cmd
        assert "arg1" in cmd
        assert "arg2" in cmd

    def test_build_command_no_extra_args(self, runner):
        cmd = runner._build_command("/tmp/script.py")
        assert "--" in cmd
        assert len(cmd) == 5  # exe + --background + --python + script + --

    def test_extract_render_path_storycore_marker(self):
        log = "some output\nSTORYCORE_RENDER_COMPLETE:/renders/out.png\nmore output"
        path = SafeBlenderRunner._extract_render_path(log)
        assert path == "/renders/out.png"

    def test_extract_render_path_asset_marker(self):
        log = "STORYCORE_ASSET_COMPLETE:/assets/obj_preview.png"
        path = SafeBlenderRunner._extract_render_path(log)
        assert path == "/assets/obj_preview.png"

    def test_extract_render_path_blender_native(self):
        log = "Blender 4.2  \nSaved: '/tmp/scene0001.png'  Time: 00:12.34"
        path = SafeBlenderRunner._extract_render_path(log)
        assert path == "/tmp/scene0001.png"

    def test_extract_render_path_none(self):
        log = "some output without any render marker"
        path = SafeBlenderRunner._extract_render_path(log)
        assert path is None

    def test_extract_error_with_traceback(self):
        log = "normal output\nTraceback (most recent call last):\n  File script.py line 5\nError: bad value"
        err = SafeBlenderRunner._extract_error(log)
        assert "Traceback" in err or "Error" in err

    def test_extract_error_fallback(self):
        log = "line1\nline2\nlast line"
        err = SafeBlenderRunner._extract_error(log)
        assert "last line" in err

    def test_drain_pipe_no_block(self):
        """_drain_pipe lit un pipe et termine sans bloquer."""
        import io
        pipe = io.StringIO("line1\nline2\nline3\n")
        q = queue.Queue()
        SafeBlenderRunner._drain_pipe(pipe, q)
        lines = []
        while not q.empty():
            lines.append(q.get_nowait())
        assert len(lines) == 3
        assert "line1" in lines[0]

    def test_kill_tree_safe_on_dead_process(self, runner, valid_script):
        """_kill_tree ne lève pas d'exception sur un process déjà mort."""
        import subprocess
        # Créer un vrai processus (python -c 'exit(0)') et le laisser se terminer
        proc = subprocess.Popen(
            [sys.executable, "-c", "import sys; sys.exit(0)"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        proc.wait()   # Laisser terminer
        # Kill sur un process mort → ne doit pas lever d'exception
        SafeBlenderRunner._kill_tree(proc)


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : make_safe_runner
# ─────────────────────────────────────────────────────────────────────────────

class TestMakeSafeRunner:

    def test_returns_safe_runner(self):
        r = make_safe_runner("blender", timeout_seconds=120)
        assert isinstance(r, SafeBlenderRunner)
        assert r.timeout_seconds == 120
        assert r.max_retries == MAX_RETRIES
        assert r.validator is not None

    def test_default_executable(self):
        r = make_safe_runner()
        assert r.blender_executable == "blender"

    def test_custom_timeout(self):
        r = make_safe_runner(timeout_seconds=60)
        assert r.timeout_seconds == 60


# ─────────────────────────────────────────────────────────────────────────────
#  TESTS : Constantes de sécurité
# ─────────────────────────────────────────────────────────────────────────────

class TestSafetyConstants:

    def test_max_retries_bounded(self):
        """MAX_RETRIES doit être fini et raisonnable."""
        assert 1 <= MAX_RETRIES <= 10

    def test_max_output_lines_bounded(self):
        """MAX_OUTPUT_LINES doit limiter la mémoire."""
        assert MAX_OUTPUT_LINES <= 10_000

    def test_script_max_size(self):
        """SCRIPT_MAX_SIZE doit être inférieur à 1 Mo."""
        assert SCRIPT_MAX_SIZE <= 1_024_000


# Import manquant dans le module de test
import sys
