#!/usr/bin/env python3
"""
StoryCore Engine — Pre-flight Startup Check
============================================
Run this BEFORE starting a demo to verify that all dependencies are healthy.

Usage:
    python scripts/startup_check.py
    python scripts/startup_check.py --fix         # attempt auto-fix suggestions
    python scripts/startup_check.py --json        # machine-readable JSON output
    python scripts/startup_check.py --minimal     # only critical checks

Exit codes:
    0 = All critical checks passed (demo safe to run)
    1 = One or more CRITICAL failures (demo will fail)
    2 = Only warnings (demo may have degraded quality)
"""

import asyncio
import json
import os
import platform
import shutil
import subprocess
import sys
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import List

# Try optional imports
try:
    import aiohttp

    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False

# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------


@dataclass
class CheckResult:
    name: str
    category: str  # SYSTEM | COMFYUI | LLM | FFMPEG | ADDONS | DEMO
    level: str  # CRITICAL | WARNING | OK | SKIP
    message: str
    detail: str = ""
    fix_hint: str = ""
    duration_ms: float = 0.0


@dataclass
class PreflightReport:
    timestamp: str
    platform: str
    python_version: str
    checks: List[CheckResult] = field(default_factory=list)
    critical_failures: int = 0
    warnings: int = 0
    ok: int = 0
    demo_ready: bool = False


# ---------------------------------------------------------------------------
# ANSI colors (disabled on Windows without ANSI support)
# ---------------------------------------------------------------------------

USE_COLOR = sys.stdout.isatty() and platform.system() != "Windows"


def _c(text: str, code: str) -> str:
    if not USE_COLOR:
        return text
    return f"\033[{code}m{text}\033[0m"


def RED(t):
    return _c(t, "91")


def YELLOW(t):
    return _c(t, "93")


def GREEN(t):
    return _c(t, "92")


def CYAN(t):
    return _c(t, "96")


def BOLD(t):
    return _c(t, "1")


def DIM(t):
    return _c(t, "2")


# ---------------------------------------------------------------------------
# Individual checks
# ---------------------------------------------------------------------------


def check_python_version() -> CheckResult:
    v = sys.version_info
    if v.major < 3 or (v.major == 3 and v.minor < 10):
        return CheckResult(
            name="Python version",
            category="SYSTEM",
            level="CRITICAL",
            message=f"Python {v.major}.{v.minor} detected — requires 3.10+",
            fix_hint="Install Python 3.10 or 3.11 from python.org",
        )
    return CheckResult(
        name="Python version",
        category="SYSTEM",
        level="OK",
        message=f"Python {v.major}.{v.minor}.{v.micro}",
    )


def check_ffmpeg() -> CheckResult:
    """Verify FFmpeg is installed and callable."""
    t0 = time.time()
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        # Check common Windows locations
        candidates = [
            Path("C:/storycore-engine/ffmpeg/bin/ffmpeg.exe"),
            Path("C:/ffmpeg/bin/ffmpeg.exe"),
        ]
        for c in candidates:
            if c.exists():
                ffmpeg_path = str(c)
                break

    if not ffmpeg_path:
        return CheckResult(
            name="FFmpeg",
            category="FFMPEG",
            level="CRITICAL",
            message="FFmpeg not found in PATH or known locations",
            fix_hint=(
                "Download FFmpeg from https://ffmpeg.org/download.html\n"
                "  OR run: scripts/deploy_models.py --install-ffmpeg"
            ),
            duration_ms=(time.time() - t0) * 1000,
        )

    try:
        result = subprocess.run(
            [ffmpeg_path, "-version"], capture_output=True, text=True, timeout=5
        )
        version_line = result.stdout.split("\n")[0] if result.stdout else "unknown"
        return CheckResult(
            name="FFmpeg",
            category="FFMPEG",
            level="OK",
            message=version_line[:80],
            detail=str(ffmpeg_path),
            duration_ms=(time.time() - t0) * 1000,
        )
    except Exception as e:
        return CheckResult(
            name="FFmpeg",
            category="FFMPEG",
            level="CRITICAL",
            message=f"FFmpeg found but not executable: {e}",
            fix_hint="Reinstall FFmpeg and ensure it is in your PATH",
            duration_ms=(time.time() - t0) * 1000,
        )


def check_gpu_vram() -> CheckResult:
    """Check GPU availability and VRAM."""
    t0 = time.time()
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,memory.total,memory.free",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0:
            lines = [l.strip() for l in result.stdout.strip().split("\n") if l.strip()]
            if lines:
                gpu_info = lines[0]  # Primary GPU
                parts = [p.strip() for p in gpu_info.split(",")]
                name = parts[0] if len(parts) > 0 else "Unknown GPU"
                total_mb = int(parts[1]) if len(parts) > 1 else 0
                free_mb = int(parts[2]) if len(parts) > 2 else 0
                total_gb = total_mb / 1024
                free_gb = free_mb / 1024

                if total_gb < 8:
                    return CheckResult(
                        name="GPU / VRAM",
                        category="SYSTEM",
                        level="CRITICAL",
                        message=f"{name} — {total_gb:.1f} GB total (minimum 12 GB required)",
                        fix_hint="Use an RTX 3060 12GB or better for reliable generation",
                        duration_ms=(time.time() - t0) * 1000,
                    )
                level = "OK" if total_gb >= 12 else "WARNING"
                return CheckResult(
                    name="GPU / VRAM",
                    category="SYSTEM",
                    level=level,
                    message=f"{name} — {total_gb:.1f} GB total, {free_gb:.1f} GB free",
                    duration_ms=(time.time() - t0) * 1000,
                )
    except FileNotFoundError:
        pass
    except Exception:
        pass

    # No nvidia-smi → check CPU-only fallback
    return CheckResult(
        name="GPU / VRAM",
        category="SYSTEM",
        level="WARNING",
        message="No NVIDIA GPU detected (nvidia-smi not found) — CPU fallback will be very slow",
        fix_hint="Install NVIDIA drivers and nvidia-smi, or use a machine with an RTX-series GPU",
        duration_ms=(time.time() - t0) * 1000,
    )


def check_pip_packages() -> CheckResult:
    """Verify critical Python packages are installed."""
    t0 = time.time()
    required = {
        "fastapi": "FastAPI backend",
        "uvicorn": "ASGI server",
        "aiohttp": "Async HTTP (ComfyUI communication)",
        "PIL": "Image processing (Pillow)",
        "numpy": "Numerical computing",
        "pydantic": "Data validation",
    }
    missing = []
    for pkg, purpose in required.items():
        try:
            __import__(pkg.replace("-", "_").split("[")[0].lower())
        except ImportError:
            # Try alternative names
            try:
                __import__(pkg)
            except ImportError:
                missing.append(f"{pkg} ({purpose})")

    if missing:
        return CheckResult(
            name="Python packages",
            category="SYSTEM",
            level="CRITICAL",
            message=f"Missing: {', '.join(missing)}",
            fix_hint="Run: pip install -r requirements.txt",
            duration_ms=(time.time() - t0) * 1000,
        )
    return CheckResult(
        name="Python packages",
        category="SYSTEM",
        level="OK",
        message=f"All {len(required)} critical packages present",
        duration_ms=(time.time() - t0) * 1000,
    )


def check_env_file() -> CheckResult:
    """Check that .env exists and has required keys."""
    t0 = time.time()
    root = Path(__file__).parent.parent
    env_path = root / ".env"

    if not env_path.exists():
        return CheckResult(
            name=".env configuration",
            category="SYSTEM",
            level="WARNING",
            message=".env file not found — defaults will be used",
            fix_hint="Copy .env.example to .env and configure your API keys",
            duration_ms=(time.time() - t0) * 1000,
        )

    content = env_path.read_text(encoding="utf-8", errors="ignore")
    recommended = ["COMFYUI_HOST", "COMFYUI_PORT", "OLLAMA_HOST"]
    missing_recommended = [k for k in recommended if k not in content]

    if missing_recommended:
        return CheckResult(
            name=".env configuration",
            category="SYSTEM",
            level="WARNING",
            message=f"Recommended keys not set: {', '.join(missing_recommended)}",
            fix_hint="Edit your .env file to configure these variables",
            duration_ms=(time.time() - t0) * 1000,
        )

    return CheckResult(
        name=".env configuration",
        category="SYSTEM",
        level="OK",
        message=".env present and recommended keys configured",
        duration_ms=(time.time() - t0) * 1000,
    )


async def check_comfyui_port(host: str, port: int, label: str) -> CheckResult:
    """Check ComfyUI connectivity on a specific port."""
    t0 = time.time()
    url = f"http://{host}:{port}"

    if not HAS_AIOHTTP:
        # Fallback using urllib
        import urllib.request
        import urllib.error

        try:
            req = urllib.request.Request(f"{url}/system_stats", method="GET")
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
                version = data.get("system", {}).get("version", "unknown")
                return CheckResult(
                    name=f"ComfyUI ({label})",
                    category="COMFYUI",
                    level="OK",
                    message=f"Reachable — version {version}",
                    detail=url,
                    duration_ms=(time.time() - t0) * 1000,
                )
        except urllib.error.URLError as e:
            return CheckResult(
                name=f"ComfyUI ({label})",
                category="COMFYUI",
                level="CRITICAL",
                message=f"Not reachable at {url}: {e.reason}",
                fix_hint=(
                    f"Start ComfyUI on port {port}.\n"
                    "  ComfyUI Standard: python main.py --port 8188\n"
                    "  ComfyUI Desktop: launch the app (port 8000)"
                ),
                duration_ms=(time.time() - t0) * 1000,
            )
        except Exception as e:
            return CheckResult(
                name=f"ComfyUI ({label})",
                category="COMFYUI",
                level="CRITICAL",
                message=f"Connection error: {e}",
                duration_ms=(time.time() - t0) * 1000,
            )

    # aiohttp path
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{url}/system_stats", timeout=aiohttp.ClientTimeout(total=5)
            ) as resp:
                if resp.status == 200:
                    data = await resp.json(content_type=None)
                    version = data.get("system", {}).get("version", "unknown")
                    queue = data.get("system", {}).get("queue_remaining", 0)
                    return CheckResult(
                        name=f"ComfyUI ({label})",
                        category="COMFYUI",
                        level="OK",
                        message=f"✓ Reachable — v{version} | Queue: {queue} job(s)",
                        detail=url,
                        duration_ms=(time.time() - t0) * 1000,
                    )
                return CheckResult(
                    name=f"ComfyUI ({label})",
                    category="COMFYUI",
                    level="CRITICAL",
                    message=f"HTTP {resp.status} at {url}",
                    duration_ms=(time.time() - t0) * 1000,
                )
    except Exception as e:
        return CheckResult(
            name=f"ComfyUI ({label})",
            category="COMFYUI",
            level="CRITICAL",
            message=f"Not reachable at {url}",
            detail=str(e),
            fix_hint=(
                f"Start ComfyUI on port {port}.\n"
                "  ComfyUI Standard: python main.py --listen --port 8188 --enable-cors-header '*'\n"
                "  ComfyUI Desktop: launch the app (default port 8000)\n"
                "  IMPORTANT: CORS must be enabled in ComfyUI settings (origin = *)"
            ),
            duration_ms=(time.time() - t0) * 1000,
        )


async def check_comfyui_models(host: str, port: int) -> CheckResult:
    """Check that required model families are available in ComfyUI."""
    t0 = time.time()
    url = f"http://{host}:{port}"
    required_families = ["flux", "sdxl", "hunyuan", "wan"]

    try:
        if not HAS_AIOHTTP:
            import urllib.request

            req = urllib.request.Request(f"{url}/object_info", method="GET")
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read())
        else:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{url}/object_info", timeout=aiohttp.ClientTimeout(total=8)
                ) as resp:
                    if resp.status != 200:
                        raise RuntimeError(f"HTTP {resp.status}")
                    data = await resp.json(content_type=None)

        # Try to get model list
        checkpoints = []
        if "CheckpointLoaderSimple" in data:
            checkpoints = (
                data["CheckpointLoaderSimple"]
                .get("input", {})
                .get("required", {})
                .get("ckpt_name", [[]])[0]
            )

        found = {f: any(f in m.lower() for m in checkpoints) for f in required_families}
        missing = [f for f, present in found.items() if not present]

        if missing:
            return CheckResult(
                name="ComfyUI models",
                category="COMFYUI",
                level="WARNING",
                message=f"Model families not confirmed: {', '.join(missing)}",
                detail=f"Found {len(checkpoints)} checkpoint(s): {', '.join(checkpoints[:5])}{'...' if len(checkpoints) > 5 else ''}",
                fix_hint="Run: python scripts/download_comfyui_models.py",
                duration_ms=(time.time() - t0) * 1000,
            )

        return CheckResult(
            name="ComfyUI models",
            category="COMFYUI",
            level="OK",
            message=f"Required model families detected ({len(checkpoints)} checkpoints total)",
            duration_ms=(time.time() - t0) * 1000,
        )
    except Exception as e:
        return CheckResult(
            name="ComfyUI models",
            category="COMFYUI",
            level="WARNING",
            message=f"Could not enumerate models: {e}",
            fix_hint="Verify ComfyUI is running and accessible",
            duration_ms=(time.time() - t0) * 1000,
        )


async def check_ollama() -> CheckResult:
    """Check Ollama service and at least one loaded model."""
    t0 = time.time()
    ollama_host = os.environ.get("OLLAMA_HOST", "http://localhost:11434")

    try:
        if HAS_AIOHTTP:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{ollama_host}/api/tags", timeout=aiohttp.ClientTimeout(total=5)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json(content_type=None)
                        models = [m["name"] for m in data.get("models", [])]
                    else:
                        raise RuntimeError(f"HTTP {resp.status}")
        else:
            import urllib.request

            req = urllib.request.Request(f"{ollama_host}/api/tags")
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
                models = [m["name"] for m in data.get("models", [])]

        if not models:
            return CheckResult(
                name="Ollama / LLM",
                category="LLM",
                level="CRITICAL",
                message="Ollama running but NO model is loaded",
                fix_hint=(
                    "Pull a model: ollama pull llama3.2\n"
                    "  Recommended: ollama pull qwen2.5:7b\n"
                    "  See: python scripts/check_llm_models.py"
                ),
                duration_ms=(time.time() - t0) * 1000,
            )

        # Check for recommended models
        recommended = ["llama3", "qwen2", "mistral", "gemma"]
        has_recommended = any(any(r in m.lower() for r in recommended) for m in models)
        level = "OK" if has_recommended else "WARNING"
        summary = ", ".join(models[:4]) + (
            f"... (+{len(models) - 4} more)" if len(models) > 4 else ""
        )

        return CheckResult(
            name="Ollama / LLM",
            category="LLM",
            level=level,
            message=f"{len(models)} model(s) available: {summary}",
            fix_hint="" if has_recommended else "Recommended: ollama pull qwen2.5:7b",
            duration_ms=(time.time() - t0) * 1000,
        )

    except Exception as e:
        return CheckResult(
            name="Ollama / LLM",
            category="LLM",
            level="CRITICAL",
            message=f"Ollama not reachable at {ollama_host}",
            detail=str(e),
            fix_hint=(
                "Start Ollama: ollama serve\n"
                "  Then pull a model: ollama pull llama3.2\n"
                "  OR configure OLLAMA_HOST in .env to point to your server\n"
                "  Run python scripts/check_llm_models.py for full diagnostics"
            ),
            duration_ms=(time.time() - t0) * 1000,
        )


def check_demo_project_data() -> CheckResult:
    """Check that a valid demo project exists (or note it needs creation)."""
    t0 = time.time()
    root = Path(__file__).parent.parent
    demo_dir = root / "complete_pipeline_test"

    if not demo_dir.exists():
        return CheckResult(
            name="Demo project data",
            category="DEMO",
            level="WARNING",
            message="complete_pipeline_test/ not found",
            fix_hint="Run: python scripts/run_e2e_demo.py --mock to create demo data",
            duration_ms=(time.time() - t0) * 1000,
        )

    project_json = demo_dir / "project.json"
    scene_json = demo_dir / "scene_breakdown.json"
    video_output = demo_dir / "video_output"

    issues = []
    if not project_json.exists():
        issues.append("project.json missing")
    if not scene_json.exists():
        issues.append("scene_breakdown.json missing")

    # Check video_output has content
    has_video = any(video_output.glob("*.mp4")) if video_output.exists() else False
    if not has_video:
        issues.append("video_output/ is empty (no .mp4 generated yet)")

    if issues:
        level = "WARNING"
        msg = f"Demo data partial: {'; '.join(issues)}"
        hint = 'Run: python scripts/run_e2e_demo.py --mock "Little Red Riding Hood in 2048"'
    else:
        level = "OK"
        msg = "Demo project data present and video output found"
        hint = ""

    return CheckResult(
        name="Demo project data",
        category="DEMO",
        level=level,
        message=msg,
        fix_hint=hint,
        duration_ms=(time.time() - t0) * 1000,
    )


def check_addon_scaffolds() -> CheckResult:
    """Check which documented addons are actually present on disk."""
    t0 = time.time()
    root = Path(__file__).parent.parent
    official_dir = root / "addons" / "official"

    documented = [
        "comic_generator",
        "content_sensitivity",
        "grok-imagine",
        "mcp_server_addon",
        "project_translator",
        "recap_engine",
        "seedance",
        "storycore_asset_creator",
        "lip_sync",  # documented but missing
        "casting_studio",  # documented but missing
        "transitions_fx",  # documented but missing
    ]

    if not official_dir.exists():
        return CheckResult(
            name="Official addons",
            category="ADDONS",
            level="WARNING",
            message="addons/official/ directory not found",
            duration_ms=(time.time() - t0) * 1000,
        )

    # Gather all subdirectories in addons and addons/official
    present = []
    if (root / "addons").exists():
        present.extend([d.name for d in (root / "addons").iterdir() if d.is_dir()])
    present.extend([d.name for d in official_dir.iterdir() if d.is_dir()])
    missing = [a for a in documented if not any(a in p for p in present)]
    [p for p in present if not any(p in a for a in documented)]

    if len(missing) > 3:
        level = "WARNING"
    else:
        level = "OK"

    return CheckResult(
        name="Official addons",
        category="ADDONS",
        level=level,
        message=(
            f"{len(present)} addon(s) present | "
            f"{len(missing)} documented but missing on disk"
        ),
        detail=(
            f"Present: {', '.join(present)}\nMissing scaffolds: {', '.join(missing)}"
        )
        if missing
        else f"Present: {', '.join(present)}",
        fix_hint="See PRESENTATION.md > Gap #4–6 for addon scaffold work"
        if missing
        else "",
        duration_ms=(time.time() - t0) * 1000,
    )


# ---------------------------------------------------------------------------
# Main orchestration
# ---------------------------------------------------------------------------


async def run_preflight(
    minimal: bool = False, comfyui_host: str = "localhost"
) -> PreflightReport:
    from datetime import datetime, timezone

    report = PreflightReport(
        timestamp=datetime.now(timezone.utc).isoformat(),
        platform=f"{platform.system()} {platform.release()} — {platform.machine()}",
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
    )

    # --- Synchronous checks ---
    sync_checks = [
        check_python_version,
        check_ffmpeg,
        check_gpu_vram,
        check_pip_packages,
        check_env_file,
        check_demo_project_data,
        check_addon_scaffolds,
    ]

    for fn in sync_checks:
        result = fn()
        report.checks.append(result)

    if not minimal:
        # --- Async checks ---
        # ComfyUI Standard (8188) and Desktop (8000)
        comfyui_std = await check_comfyui_port(comfyui_host, 8188, "Standard :8188")
        comfyui_dsk = await check_comfyui_port(comfyui_host, 8000, "Desktop  :8000")

        # If at least one ComfyUI is up, check its models
        active_comfyui_port = None
        if comfyui_std.level == "OK":
            active_comfyui_port = 8188
        elif comfyui_dsk.level == "OK":
            active_comfyui_port = 8000

        # Determine combined ComfyUI status
        if active_comfyui_port:
            # One is up — mark the non-active one as WARNING instead of CRITICAL
            if comfyui_std.level == "CRITICAL":
                comfyui_std.level = "WARNING"
                comfyui_std.message += " (but Desktop on :8000 is active)"
            if comfyui_dsk.level == "CRITICAL":
                comfyui_dsk.level = "WARNING"
                comfyui_dsk.message += " (but Standard on :8188 is active)"

            model_check = await check_comfyui_models(comfyui_host, active_comfyui_port)
        else:
            # Both are down — mark as CRITICAL, but only emit ONE critical message
            comfyui_dsk.message += " — No ComfyUI instance found on this machine"
            model_check = CheckResult(
                name="ComfyUI models",
                category="COMFYUI",
                level="SKIP",
                message="Skipped — ComfyUI not reachable",
            )

        ollama_check = await check_ollama()

        for r in [comfyui_std, comfyui_dsk, model_check, ollama_check]:
            report.checks.append(r)

    # --- Tally ---
    for c in report.checks:
        if c.level == "CRITICAL":
            report.critical_failures += 1
        elif c.level == "WARNING":
            report.warnings += 1
        elif c.level == "OK":
            report.ok += 1

    report.demo_ready = report.critical_failures == 0
    return report


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------

ICONS = {"CRITICAL": "❌", "WARNING": "⚠️ ", "OK": "✅", "SKIP": "⏭️ "}


def render_report(report: PreflightReport, show_hints: bool = True) -> None:
    print()
    print(BOLD("╔══════════════════════════════════════════════════════╗"))
    print(BOLD("║       StoryCore Engine — Pre-flight Check           ║"))
    print(BOLD("╚══════════════════════════════════════════════════════╝"))
    print(DIM(f"  Platform : {report.platform}"))
    print(DIM(f"  Python   : {report.python_version}"))
    print(DIM(f"  Time     : {report.timestamp}"))
    print()

    current_category = None
    for check in report.checks:
        if check.category != current_category:
            current_category = check.category
            print(CYAN(BOLD(f"\n  [{check.category}]")))

        icon = ICONS.get(check.level, "?")
        if check.level == "OK":
            line = GREEN(f"  {icon} {check.name:<30} {check.message}")
        elif check.level == "WARNING":
            line = YELLOW(f"  {icon} {check.name:<30} {check.message}")
        elif check.level == "CRITICAL":
            line = RED(f"  {icon} {check.name:<30} {check.message}")
        else:
            line = DIM(f"  {icon} {check.name:<30} {check.message}")

        print(line)

        if check.detail:
            for detail_line in check.detail.split("\n"):
                print(DIM(f"       → {detail_line}"))

        if show_hints and check.fix_hint:
            for hint_line in check.fix_hint.split("\n"):
                print(YELLOW(f"       💡 {hint_line}"))

    # Summary
    print()
    print(BOLD("─" * 56))
    summary = (
        f"  Results: "
        f"{GREEN(str(report.ok) + ' OK')}  "
        f"{YELLOW(str(report.warnings) + ' warnings')}  "
        f"{RED(str(report.critical_failures) + ' critical')}"
    )
    print(summary)
    print()

    if report.demo_ready:
        print(GREEN(BOLD("  ✅  DEMO READY — all critical checks passed.")))
    else:
        print(
            RED(
                BOLD(
                    f"  ❌  DEMO NOT READY — {report.critical_failures} critical issue(s) must be fixed."
                )
            )
        )
    print()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="StoryCore Engine Pre-flight Startup Check"
    )
    parser.add_argument(
        "--json", action="store_true", help="Output machine-readable JSON"
    )
    parser.add_argument(
        "--minimal",
        action="store_true",
        help="Run only local system checks (skip network)",
    )
    parser.add_argument(
        "--host", default="localhost", help="ComfyUI host to check (default: localhost)"
    )
    parser.add_argument(
        "--no-hints", action="store_true", help="Suppress fix hints in output"
    )
    args = parser.parse_args()

    report = asyncio.run(run_preflight(minimal=args.minimal, comfyui_host=args.host))

    if args.json:
        # Convert dataclasses to dict
        output = {
            "timestamp": report.timestamp,
            "platform": report.platform,
            "python_version": report.python_version,
            "demo_ready": report.demo_ready,
            "critical_failures": report.critical_failures,
            "warnings": report.warnings,
            "ok": report.ok,
            "checks": [asdict(c) for c in report.checks],
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))
    else:
        render_report(report, show_hints=not args.no_hints)

    # Exit code
    if report.critical_failures > 0:
        sys.exit(1)
    elif report.warnings > 0:
        sys.exit(2)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
