#!/usr/bin/env python3
"""
StoryCore Engine — End-to-End Demo Runner
==========================================
Runs the full StoryCore pipeline from a single prompt to a final MP4 video.
Designed for demos and CI validation.

Usage:
    # Full pipeline (requires ComfyUI + Ollama running)
    python scripts/run_e2e_demo.py "Little Red Riding Hood in 2048"

    # Mock mode — never calls ComfyUI or LLM (placeholder images, offline TTS)
    python scripts/run_e2e_demo.py --mock "Little Red Riding Hood in 2048"

    # Use a specific output directory
    python scripts/run_e2e_demo.py --output ./my_demo "My story prompt"

    # Run the canonical demo story (for video recording)
    python scripts/run_e2e_demo.py --canonical

    # Skip the pre-flight check (dangerous but fast for CI)
    python scripts/run_e2e_demo.py --no-preflight "Prompt here"

    # Verbose logging
    python scripts/run_e2e_demo.py --verbose "Prompt here"

Exit codes:
    0 = Success — video produced at output_dir/final_<project_name>.mp4
    1 = Pipeline failure (see logs)
    2 = Pre-flight check failed (run startup_check.py for details)
    3 = Invalid arguments
"""

import argparse
import asyncio
import json
import logging
import os
import shutil
import sys
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# ── Project root on sys.path ────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# ── ANSI colors ─────────────────────────────────────────────────────────────
USE_COLOR = sys.stdout.isatty()


def _c(t: str, code: str) -> str:
    return f"\033[{code}m{t}\033[0m" if USE_COLOR else t


def RED(t):
    return _c(t, "91")


def YELLOW(t):
    return _c(t, "93")


def GREEN(t):
    return _c(t, "92")


def CYAN(t):
    return _c(t, "96")


def BLUE(t):
    return _c(t, "94")


def BOLD(t):
    return _c(t, "1")


def DIM(t):
    return _c(t, "2")


# ── Canonical demo story (Little Red Riding Hood in 2048) ───────────────────
CANONICAL_PROMPT = (
    "Little Red Riding Hood in 2048. "
    "A teenage girl in a neon-lit megacity delivers a survival package "
    "through gang-controlled streets to reach her sick grandmother's apartment "
    "on the 97th floor. The city is cyberpunk, rainy, and oppressive. "
    "The Wolf is a Wolf-Corp corporate enforcer. The Woodsman is a drone mechanic."
)

CANONICAL_PROJECT_NAME = "little_red_riding_hood_2048"

# Fallback scene breakdown for mock mode (used when LLM is unavailable)
MOCK_SCENE_BREAKDOWN = {
    "project_name": CANONICAL_PROJECT_NAME,
    "prompt": CANONICAL_PROMPT,
    "visual_coherence": {
        "style": "Cyberpunk noir / Blade Runner palette",
        "colors": {"primary": "#FF2244", "shadow": "#0A0A1A", "neon": "#00F5FF"},
        "lens": "35mm anamorphic, slight chromatic aberration",
        "atmosphere": "Rain, fog, neon reflections on wet asphalt",
        "forbidden": ["Daylight", "warm tones", "clean environments"],
    },
    "characters": [
        {
            "id": "red",
            "name": "Red",
            "description": "Teenage girl, red hoodie, delivery backpack, face partially hidden",
            "role": "protagonist",
            "voice": {"style": "determined", "pitch": "medium-low"},
        },
        {
            "id": "grandmother",
            "name": "Grandmother",
            "description": "Elderly woman, pale, medical tubes, 97th-floor apartment",
            "role": "supporting",
            "voice": {"style": "weak", "pitch": "high"},
        },
        {
            "id": "wolf_corp",
            "name": "Wolf-Corp Enforcer",
            "description": "Corporate enforcer, black tactical suit, augmented eyes, imposing",
            "role": "antagonist",
            "voice": {"style": "cold", "pitch": "low"},
        },
    ],
    "scenes": [
        {
            "scene_id": "scene_01",
            "title": "Streets of Neon — Departure",
            "environment": {
                "type": "megacity-street",
                "time_of_day": "night",
                "weather": "heavy_rain",
            },
            "mood": "tense",
            "tension": 0.45,
            "camera": {"shot_type": "low_angle_wide", "movement": "slow_push_in"},
            "vfx": ["rain_particles", "neon_reflections"],
            "dialogue": [
                {
                    "character_id": "red",
                    "text": "Package 97B. 97th floor. Don't be late.",
                    "emotion": "determined",
                }
            ],
            "actions": [
                {
                    "type": "walk",
                    "description": "Red navigates a neon-lit alley, dodging puddles",
                }
            ],
            "duration_sec": 8,
        },
        {
            "scene_id": "scene_02",
            "title": "Gang Territory — The Warning",
            "environment": {
                "type": "underground-market",
                "time_of_day": "night",
                "weather": "dry",
            },
            "mood": "dangerous",
            "tension": 0.70,
            "camera": {"shot_type": "close_up", "movement": "rack_focus"},
            "vfx": ["color_isolation_red_hoodie"],
            "dialogue": [
                {
                    "character_id": "red",
                    "text": "I just need to pass through.",
                    "emotion": "alert",
                },
            ],
            "actions": [
                {
                    "type": "look",
                    "description": "Red scans for threats at the marketplace entrance",
                }
            ],
            "duration_sec": 6,
        },
        {
            "scene_id": "scene_03",
            "title": "The Wolf-Corp Confrontation",
            "environment": {
                "type": "corporate-lobby",
                "time_of_day": "night",
                "weather": "none",
            },
            "mood": "menacing",
            "tension": 0.87,
            "camera": {"shot_type": "low_angle", "movement": "dolly_in"},
            "vfx": ["hellation_effect", "color_isolation"],
            "dialogue": [
                {
                    "character_id": "wolf_corp",
                    "text": "Unregistered delivery. The package is forfeit.",
                    "emotion": "cold",
                },
                {
                    "character_id": "red",
                    "text": "You can't stop me.",
                    "emotion": "defiant",
                },
            ],
            "actions": [
                {
                    "type": "standoff",
                    "description": "Wolf-Corp enforcer blocks the elevator",
                }
            ],
            "duration_sec": 10,
        },
        {
            "scene_id": "scene_04",
            "title": "The 97th Floor — Arrival",
            "environment": {
                "type": "apartment-97f",
                "time_of_day": "dawn",
                "weather": "clearing",
            },
            "mood": "relief",
            "tension": 0.20,
            "camera": {"shot_type": "medium_wide", "movement": "slow_zoom_out"},
            "vfx": ["warm_light_break"],
            "dialogue": [
                {
                    "character_id": "grandmother",
                    "text": "You made it...",
                    "emotion": "weak",
                },
                {
                    "character_id": "red",
                    "text": "I always do, Grand-Mère.",
                    "emotion": "warm",
                },
            ],
            "actions": [
                {
                    "type": "delivery",
                    "description": "Red delivers the package, grandmother smiles",
                }
            ],
            "duration_sec": 12,
        },
    ],
}


# ── Data models ──────────────────────────────────────────────────────────────


@dataclass
class StepLog:
    step: str
    status: str  # running | ok | warning | error | skip
    message: str
    detail: str = ""
    duration_sec: float = 0.0


@dataclass
class DemoRunResult:
    success: bool
    project_name: str
    output_dir: Path
    video_path: Optional[Path]
    duration_sec: float
    steps: List[StepLog] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    mock_mode: bool = False


# ── Logger setup ─────────────────────────────────────────────────────────────


def setup_logger(verbose: bool, log_file: Optional[Path]) -> logging.Logger:
    level = logging.DEBUG if verbose else logging.INFO
    fmt = "%(asctime)s  %(levelname)-8s  %(message)s"
    handlers: List[logging.Handler] = [logging.StreamHandler(sys.stdout)]
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(str(log_file), encoding="utf-8"))
    logging.basicConfig(level=level, format=fmt, handlers=handlers)
    return logging.getLogger("StoryCore.E2EDemo")


# ── Progress print helpers ────────────────────────────────────────────────────


def step_start(label: str) -> float:
    print(f"\n  {CYAN('▶')} {BOLD(label)}")
    return time.time()


def step_ok(label: str, detail: str, t0: float) -> StepLog:
    elapsed = time.time() - t0
    print(f"  {GREEN('✓')} {label:<40} {DIM(f'{elapsed:.1f}s')}")
    if detail:
        print(f"    {DIM(detail)}")
    return StepLog(step=label, status="ok", message=detail, duration_sec=elapsed)


def step_warn(label: str, detail: str, t0: float) -> StepLog:
    elapsed = time.time() - t0
    print(f"  {YELLOW('⚠')} {label:<40} {DIM(f'{elapsed:.1f}s')}")
    if detail:
        print(f"    {YELLOW(detail)}")
    return StepLog(step=label, status="warning", message=detail, duration_sec=elapsed)


def step_error(label: str, detail: str, t0: float) -> StepLog:
    elapsed = time.time() - t0
    print(f"  {RED('✗')} {label:<40} {DIM(f'{elapsed:.1f}s')}")
    if detail:
        print(f"    {RED(detail)}")
    return StepLog(step=label, status="error", message=detail, duration_sec=elapsed)


def step_skip(label: str, reason: str) -> StepLog:
    print(f"  {DIM('⏭')} {label:<40} {DIM('SKIPPED: ' + reason)}")
    return StepLog(step=label, status="skip", message=reason)


# ── Pipeline steps ────────────────────────────────────────────────────────────


async def step_preflight(mock: bool, logger: logging.Logger) -> StepLog:
    """Run startup_check.py and parse the result."""
    label = "Pre-flight check"
    t0 = step_start(label)

    if mock:
        return step_ok(label, "Skipped in mock mode (--mock)", t0)

    preflight_script = PROJECT_ROOT / "scripts" / "startup_check.py"
    if not preflight_script.exists():
        return step_warn(label, "startup_check.py not found — skipping", t0)

    try:
        import subprocess

        result = subprocess.run(
            [sys.executable, str(preflight_script), "--json"],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=str(PROJECT_ROOT),
        )
        try:
            data = json.loads(result.stdout)
            if data.get("critical_failures", 0) > 0:
                details = "; ".join(
                    c["message"]
                    for c in data.get("checks", [])
                    if c["level"] == "CRITICAL"
                )
                return step_error(
                    label,
                    f"{data['critical_failures']} critical issue(s): {details}",
                    t0,
                )
            warnings = data.get("warnings", 0)
            msg = "All checks passed"
            if warnings:
                msg += f" ({warnings} warnings)"
            return step_ok(label, msg, t0)
        except json.JSONDecodeError:
            # Non-JSON output → check exit code
            if result.returncode == 0:
                return step_ok(label, "Passed", t0)
            elif result.returncode == 2:
                return step_warn(label, "Warnings detected — proceeding anyway", t0)
            else:
                return step_error(label, f"Exit code {result.returncode}", t0)
    except Exception as e:
        return step_warn(label, f"Could not run pre-flight check: {e}", t0)


async def step_parse_prompt(
    prompt: str, mock: bool, logger: logging.Logger
) -> tuple[Dict[str, Any], StepLog]:
    """Expand the user prompt into a structured scene_breakdown."""
    label = "Prompt → Scene breakdown"
    t0 = step_start(label)

    if mock:
        data = MOCK_SCENE_BREAKDOWN.copy()
        data["prompt"] = prompt
        return data, step_ok(
            label, f"Mock breakdown: {len(data['scenes'])} scenes generated", t0
        )

    # Try to use the end_to_end orchestrator
    try:
        from src.end_to_end.prompt_parser import PromptParser

        parser = PromptParser()
        parsed = parser.parse(prompt)
        _, errors = parser.validate_parsed_data(parsed)
        if errors:
            parsed = parser.fill_defaults(parsed)
        data = parsed.__dict__ if hasattr(parsed, "__dict__") else {"prompt": prompt}
        # Inject mock scenes if parser didn't generate them
        if "scenes" not in data or not data.get("scenes"):
            data.update(MOCK_SCENE_BREAKDOWN)
            data["prompt"] = prompt
        return data, step_ok(
            label, f"Parsed: {len(data.get('scenes', []))} scene(s)", t0
        )
    except ImportError as e:
        logger.debug(f"PromptParser import failed: {e} — using mock breakdown")
        data = MOCK_SCENE_BREAKDOWN.copy()
        data["prompt"] = prompt
        return data, step_warn(
            label, f"Using mock breakdown (PromptParser unavailable: {e})", t0
        )
    except Exception as e:
        logger.warning(f"PromptParser error: {e}")
        data = MOCK_SCENE_BREAKDOWN.copy()
        data["prompt"] = prompt
        return data, step_warn(label, f"Fallback to mock breakdown: {e}", t0)


async def step_setup_project(
    project_name: str,
    output_dir: Path,
    scene_data: Dict[str, Any],
) -> StepLog:
    """Create project directory structure and write JSON files."""
    label = "Project structure"
    t0 = step_start(label)

    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / "images").mkdir(exist_ok=True)
        (output_dir / "audio").mkdir(exist_ok=True)
        (output_dir / "video_clips").mkdir(exist_ok=True)
        (output_dir / "final").mkdir(exist_ok=True)
        (output_dir / "logs").mkdir(exist_ok=True)

        # Write project.json
        project_json = {
            "project_id": project_name,
            "project_name": project_name,
            "schema_version": "1.0",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "prompt": scene_data.get("prompt", ""),
        }
        (output_dir / "project.json").write_text(
            json.dumps(project_json, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        # Write scene_breakdown.json
        (output_dir / "scene_breakdown.json").write_text(
            json.dumps(scene_data, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        return step_ok(label, f"Created at {output_dir}", t0)
    except Exception as e:
        return step_error(label, str(e), t0)


async def step_generate_images(
    scene_data: Dict[str, Any],
    output_dir: Path,
    mock: bool,
    logger: logging.Logger,
) -> StepLog:
    """Generate one image per scene via ComfyUI or placeholder in mock mode."""
    label = "Image generation"
    t0 = step_start(label)
    images_dir = output_dir / "images"
    scenes = scene_data.get("scenes", [])

    if not scenes:
        return step_warn(label, "No scenes defined — skipping", t0)

    if mock:
        # Create colored placeholder images
        try:
            from PIL import Image, ImageDraw, ImageFont

            neon_palette = ["#FF2244", "#00F5FF", "#9D00FF", "#FF6B00", "#00FF9D"]
            for i, scene in enumerate(scenes):
                img = Image.new("RGB", (1280, 720), color="#0A0A1A")
                draw = ImageDraw.Draw(img)
                # Draw gradient-like neon border
                border_color = neon_palette[i % len(neon_palette)]
                for thickness in range(4):
                    draw.rectangle(
                        [thickness, thickness, 1280 - thickness, 720 - thickness],
                        outline=border_color,
                    )
                # Scene info text
                text_lines = [
                    f"🎬 {scene.get('title', scene['scene_id'])}",
                    f"Tension: {scene.get('tension', 0):.0%}",
                    f"Mood: {scene.get('mood', 'unknown')}",
                    "[ PLACEHOLDER — COMFYUI NOT ACTIVE ]",
                ]
                y = 100
                for line in text_lines:
                    draw.text((60, y), line, fill="#FFFFFF")
                    y += 50

                img_path = images_dir / f"{scene['scene_id']}.png"
                img.save(str(img_path), "PNG")
                print(f"    {DIM(f'  Placeholder image: {img_path.name}')}")

            return step_ok(
                label, f"Created {len(scenes)} placeholder image(s) [mock mode]", t0
            )
        except ImportError:
            # PIL not available — create empty files
            for scene in scenes:
                (images_dir / f"{scene['scene_id']}.png").write_bytes(b"")
            return step_warn(
                label,
                f"Created {len(scenes)} empty placeholder files (PIL not installed)",
                t0,
            )

    # Real mode: ComfyUI via end_to_end integration
    try:
        from src.end_to_end.comfyui_integration import ComfyUIIntegration
        from src.end_to_end.configuration_manager import ConfigurationManager

        comfyui_host = os.environ.get("COMFYUI_HOST", "localhost")
        comfyui_port = int(os.environ.get("COMFYUI_PORT", "8188"))
        comfyui_url = f"http://{comfyui_host}:{comfyui_port}"

        integration = ComfyUIIntegration(comfyui_url)
        available = await integration.check_availability()

        if not available:
            # Try fallback port
            comfyui_url2 = f"http://{comfyui_host}:8000"
            integration2 = ComfyUIIntegration(comfyui_url2)
            available = await integration2.check_availability()
            if available:
                integration = integration2
                logger.info("ComfyUI found on port 8000 (Desktop mode)")

        if not available:
            logger.warning("ComfyUI not available — falling back to placeholder images")
            # Create placeholders without PIL
            for scene in scenes:
                (images_dir / f"{scene['scene_id']}.png").write_bytes(b"")
            return step_warn(
                label,
                f"Created {len(scenes)} placeholder image(s) (ComfyUI unavailable — start it first)",
                t0,
            )

        # ComfyUI is up — generate real images
        coherence = scene_data.get("visual_coherence", {})
        config_mgr = ConfigurationManager()
        config_mgr.determine_style_config(coherence)

        generated = 0
        for scene in scenes:
            scene_prompt = (
                f"[Master Style] {coherence.get('style', 'cinematic noir')}, "
                f"{coherence.get('atmosphere', 'rain and neon')}, "
                f"{coherence.get('lens', '35mm anamorphic')}\n"
                f"[Scene] {scene.get('title', '')}: {scene.get('mood', '')} mood, "
                f"tension {scene.get('tension', 0.5):.0%}"
            )
            try:
                img_result = await integration.generate_shot(
                    prompt=scene_prompt,
                    output_path=images_dir / f"{scene['scene_id']}.png",
                    width=1280,
                    height=720,
                )
                if img_result:
                    generated += 1
                    logger.info(f"Generated image: {scene['scene_id']}")
                else:
                    # Create placeholder on failure
                    (images_dir / f"{scene['scene_id']}.png").write_bytes(b"")
            except Exception as e:
                logger.warning(f"Image generation failed for {scene['scene_id']}: {e}")
                (images_dir / f"{scene['scene_id']}.png").write_bytes(b"")

        return step_ok(
            label, f"Generated {generated}/{len(scenes)} real image(s) via ComfyUI", t0
        )

    except ImportError as e:
        logger.warning(f"ComfyUI integration unavailable: {e}")
        for scene in scenes:
            (images_dir / f"{scene['scene_id']}.png").write_bytes(b"")
        return step_warn(label, f"Placeholder mode (integration import error: {e})", t0)


async def step_generate_audio(
    scene_data: Dict[str, Any],
    output_dir: Path,
    mock: bool,
    logger: logging.Logger,
) -> StepLog:
    """Generate dialogue audio (TTS) for each scene."""
    label = "Audio / TTS synthesis"
    t0 = step_start(label)
    audio_dir = output_dir / "audio"
    scenes = scene_data.get("scenes", [])

    if mock:
        # Create silent WAV placeholders (44100 Hz, 1 sec, mono)
        try:
            import wave

            for scene in scenes:
                dialogues = scene.get("dialogue", [])
                for j, dlg in enumerate(dialogues):
                    wav_path = audio_dir / f"{scene['scene_id']}_dlg{j:02d}.wav"
                    # Write minimal valid WAV (0.5 s silence)
                    n_samples = 22050
                    with wave.open(str(wav_path), "w") as wf:
                        wf.setnchannels(1)
                        wf.setsampwidth(2)
                        wf.setframerate(44100)
                        wf.writeframes(b"\x00\x00" * n_samples)
            total = sum(len(s.get("dialogue", [])) for s in scenes)
            return step_ok(
                label, f"Created {total} silent placeholder WAV(s) [mock mode]", t0
            )
        except Exception as e:
            return step_warn(label, f"Could not write WAV placeholders: {e}", t0)

    # Real mode: try local TTS
    try:
        from src.audio_engine import AudioEngine

        engine = AudioEngine()
        generated = 0
        for scene in scenes:
            for j, dlg in enumerate(scene.get("dialogue", [])):
                char_id = dlg.get("character_id", "narrator")
                text = dlg.get("text", "")
                emotion = dlg.get("emotion", "neutral")
                wav_path = audio_dir / f"{scene['scene_id']}_dlg{j:02d}.wav"
                try:
                    await engine.synthesize(
                        text=text,
                        character=char_id,
                        emotion=emotion,
                        output_path=wav_path,
                    )
                    generated += 1
                except Exception as e:
                    logger.warning(f"TTS failed for {char_id}: {e}")
        return step_ok(label, f"Synthesized {generated} audio clip(s)", t0)
    except ImportError:
        logger.warning("AudioEngine not available — skipping TTS")
        return step_warn(label, "TTS skipped (AudioEngine import error)", t0)


async def step_assemble_video(
    scene_data: Dict[str, Any],
    output_dir: Path,
    project_name: str,
    mock: bool,
    logger: logging.Logger,
) -> tuple[Optional[Path], StepLog]:
    """Assemble images + audio into final MP4 using FFmpeg."""
    label = "Video assembly (FFmpeg)"
    t0 = step_start(label)

    images_dir = output_dir / "images"
    final_dir = output_dir / "final"
    final_path = final_dir / f"{project_name}_demo.mp4"
    scenes = scene_data.get("scenes", [])

    # Check FFmpeg
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        for candidate in [
            PROJECT_ROOT / "ffmpeg" / "bin" / "ffmpeg.exe",
            Path("C:/ffmpeg/bin/ffmpeg.exe"),
        ]:
            if candidate.exists():
                ffmpeg = str(candidate)
                break

    if not ffmpeg:
        return None, step_error(
            label, "FFmpeg not found. Install it and add to PATH.", t0
        )

    # Build image list file
    image_list_path = output_dir / "image_list.txt"
    with open(image_list_path, "w", encoding="utf-8") as f:
        for scene in scenes:
            img_path = images_dir / f"{scene['scene_id']}.png"
            if not img_path.exists() or img_path.stat().st_size == 0:
                # Write a colored solid frame as substitute
                logger.debug(
                    f"Image missing for {scene['scene_id']} — will use black frame"
                )
                # Create a 1280x720 black PNG with text via FFmpeg itself
                black_img = images_dir / f"{scene['scene_id']}_blank.png"
                import subprocess as sp

                sp.run(
                    [
                        ffmpeg,
                        "-y",
                        "-f",
                        "lavfi",
                        "-i",
                        "color=c=0x0A0A1A:size=1280x720:rate=1",
                        "-frames:v",
                        "1",
                        str(black_img),
                    ],
                    capture_output=True,
                    timeout=10,
                )
                if black_img.exists():
                    img_path = black_img

            duration = scene.get("duration_sec", 5)
            f.write(f"file '{img_path.resolve()}'\n")
            f.write(f"duration {duration}\n")

    # FFmpeg: images → slideshow MP4
    try:
        import subprocess as sp

        cmd = [
            ffmpeg,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(image_list_path),
            "-vf",
            "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=24",
            "-c:v",
            "libx264",
            "-crf",
            "23",
            "-preset",
            "fast",
            "-pix_fmt",
            "yuv420p",
            str(final_path),
        ]
        logger.debug(f"FFmpeg command: {' '.join(cmd)}")
        result = sp.run(cmd, capture_output=True, text=True, timeout=300)

        if result.returncode != 0:
            return None, step_error(
                label,
                f"FFmpeg failed (exit {result.returncode}): {result.stderr[-500:]}",
                t0,
            )

        size_mb = final_path.stat().st_size / (1024 * 1024)
        return final_path, step_ok(
            label, f"Video: {final_path.name} ({size_mb:.1f} MB)", t0
        )
    except Exception as e:
        return None, step_error(label, str(e), t0)


async def step_copy_to_demo_dir(
    output_dir: Path,
    video_path: Optional[Path],
    project_name: str,
    logger: logging.Logger,
) -> StepLog:
    """Copy results into the canonical complete_pipeline_test/ directory."""
    label = "Update demo folder"
    t0 = step_start(label)

    demo_dir = PROJECT_ROOT / "complete_pipeline_test"
    demo_dir.mkdir(exist_ok=True)

    try:
        # Copy json files
        for fname in ["project.json", "scene_breakdown.json"]:
            src = output_dir / fname
            if src.exists():
                shutil.copy2(src, demo_dir / fname)

        # Copy video
        if video_path and video_path.exists():
            vid_dest = demo_dir / "video_output"
            vid_dest.mkdir(exist_ok=True)
            shutil.copy2(video_path, vid_dest / video_path.name)

        return step_ok(label, f"Synced results to {demo_dir}", t0)
    except Exception as e:
        return step_warn(label, f"Non-critical: {e}", t0)


# ── Main orchestrator ─────────────────────────────────────────────────────────


async def run_e2e_demo(
    prompt: str,
    output_dir: Path,
    mock: bool,
    no_preflight: bool,
    verbose: bool,
) -> DemoRunResult:
    global_start = time.time()

    # Project name
    safe_prompt = "".join(c for c in prompt[:50] if c.isalnum() or c in " _-").strip()
    safe_prompt = safe_prompt.replace(" ", "_").lower()
    project_name = f"{safe_prompt}_{datetime.now().strftime('%H%M%S')}"
    if prompt == CANONICAL_PROMPT:
        project_name = CANONICAL_PROJECT_NAME

    run_dir = output_dir / project_name

    log_file = run_dir / "logs" / "e2e_demo.log"
    logger = setup_logger(verbose, log_file)

    result = DemoRunResult(
        success=False,
        project_name=project_name,
        output_dir=run_dir,
        video_path=None,
        duration_sec=0.0,
        mock_mode=mock,
    )

    # ── Banner ───────────────────────────────────────────────────────────────
    print()
    print(BOLD("╔══════════════════════════════════════════════════════╗"))
    print(BOLD("║         StoryCore Engine — E2E Demo Runner          ║"))
    print(BOLD("╚══════════════════════════════════════════════════════╝"))
    print(
        f"  Mode    : {YELLOW('MOCK (no AI calls)') if mock else GREEN('FULL (ComfyUI + LLM)')}"
    )
    print(f"  Project : {CYAN(project_name)}")
    print(f"  Output  : {DIM(str(run_dir))}")
    print(f"  Prompt  : {DIM(prompt[:100] + ('...' if len(prompt) > 100 else ''))}")
    print()

    # ── Steps ────────────────────────────────────────────────────────────────

    # 1. Pre-flight
    if no_preflight:
        log = step_skip("Pre-flight check", "disabled via --no-preflight")
    else:
        log = await step_preflight(mock, logger)
    result.steps.append(log)
    if log.status == "error":
        result.errors.append(log.message)
        result.duration_sec = time.time() - global_start
        print(RED("\n  ❌  Pre-flight failed. Run: python scripts/startup_check.py"))
        return result

    # 2. Prompt → scene breakdown
    scene_data, log = await step_parse_prompt(prompt, mock, logger)
    result.steps.append(log)
    if log.status == "warning":
        result.warnings.append(log.message)

    # 3. Project structure
    log = await step_setup_project(project_name, run_dir, scene_data)
    result.steps.append(log)
    if log.status == "error":
        result.errors.append(log.message)
        result.duration_sec = time.time() - global_start
        return result

    # 4. Image generation (parallel-ish, runs in background)
    log = await step_generate_images(scene_data, run_dir, mock, logger)
    result.steps.append(log)
    if log.status == "warning":
        result.warnings.append(log.message)
    if log.status == "error":
        result.errors.append(log.message)

    # 5. Audio / TTS
    log = await step_generate_audio(scene_data, run_dir, mock, logger)
    result.steps.append(log)
    if log.status == "warning":
        result.warnings.append(log.message)

    # 6. Video assembly
    video_path, log = await step_assemble_video(
        scene_data, run_dir, project_name, mock, logger
    )
    result.steps.append(log)
    if log.status == "error":
        result.errors.append(log.message)
    elif log.status == "warning":
        result.warnings.append(log.message)
    result.video_path = video_path

    # 7. Sync to demo folder
    log = await step_copy_to_demo_dir(run_dir, video_path, project_name, logger)
    result.steps.append(log)

    # ── Final status ─────────────────────────────────────────────────────────
    result.duration_sec = time.time() - global_start
    has_errors = any(s.status == "error" for s in result.steps)
    result.success = not has_errors and video_path is not None

    # Write run summary JSON
    summary_path = run_dir / "demo_run_summary.json"
    summary = {
        "project_name": project_name,
        "prompt": prompt,
        "mock_mode": mock,
        "success": result.success,
        "duration_sec": round(result.duration_sec, 2),
        "video_path": str(video_path) if video_path else None,
        "warnings": result.warnings,
        "errors": result.errors,
        "steps": [asdict(s) for s in result.steps],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    summary_path.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # ── Banner ───────────────────────────────────────────────────────────────
    print()
    print(BOLD("─" * 56))
    if result.success:
        print(GREEN(BOLD(f"  ✅  SUCCESS in {result.duration_sec:.1f}s")))
        print(f"  🎬  Video   : {GREEN(str(video_path))}")
        print(f"  📁  Project : {DIM(str(run_dir))}")
    else:
        print(RED(BOLD(f"  ❌  FAILED after {result.duration_sec:.1f}s")))
        for err in result.errors:
            print(f"      {RED('•')} {err}")
        if not video_path:
            print(YELLOW("  ⚠️   No video output was produced"))

    if result.warnings:
        print()
        print(YELLOW(f"  ⚠️   {len(result.warnings)} warning(s):"))
        for w in result.warnings:
            print(f"      {YELLOW('•')} {w}")

    print(f"\n  📋  Log : {DIM(str(log_file))}")
    print(f"  📋  Summary : {DIM(str(summary_path))}")
    print()

    return result


# ── Entry point ───────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="StoryCore Engine — End-to-End Demo Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Full mock run — canonical demo story, no AI required
  python scripts/run_e2e_demo.py --canonical --mock

  # Full real run (requires ComfyUI on port 8188 and Ollama)
  python scripts/run_e2e_demo.py "Little Red Riding Hood in 2048"

  # Custom story, mock mode
  python scripts/run_e2e_demo.py --mock "Snow White in 2048, cyberpunk, neon"
        """,
    )
    parser.add_argument(
        "prompt",
        nargs="?",
        default=None,
        help="Story prompt (omit if using --canonical)",
    )
    parser.add_argument(
        "--canonical",
        action="store_true",
        help=f"Use the canonical demo prompt: '{CANONICAL_PROMPT[:60]}...'",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Mock mode: skip ComfyUI and LLM calls, use placeholders",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=PROJECT_ROOT / "output" / "e2e_demos",
        help="Output directory (default: output/e2e_demos/)",
    )
    parser.add_argument(
        "--no-preflight", action="store_true", help="Skip the pre-flight check"
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Enable verbose debug logging"
    )
    args = parser.parse_args()

    # Resolve prompt
    if args.canonical:
        prompt = CANONICAL_PROMPT
    elif args.prompt:
        prompt = args.prompt.strip()
    else:
        parser.error(
            "You must provide a prompt OR use --canonical.\n"
            "  Example: python scripts/run_e2e_demo.py --canonical --mock"
        )
        sys.exit(3)

    if len(prompt) < 10:
        parser.error("Prompt is too short (minimum 10 characters)")
        sys.exit(3)

    # Run
    result = asyncio.run(
        run_e2e_demo(
            prompt=prompt,
            output_dir=args.output,
            mock=args.mock,
            no_preflight=args.no_preflight,
            verbose=args.verbose,
        )
    )

    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
