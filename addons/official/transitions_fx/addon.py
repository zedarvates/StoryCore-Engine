"""
Transitions & FX Pack Addon — StoryCore Engine
===============================================
Cinematic transitions and VFX compositing for professional-grade video output.

Hooks:
    on_before_assemble  — select transition types for each clip pair based on mood arc
    on_clip_pair_ready  — apply transition between two adjacent video clips
    on_export_ready     — apply global VFX (film grain, vignette, color grade)

Transitions implemented (via FFmpeg):
    cut            — instant cut (no effect)
    crossfade      — alpha blend between clips
    glitch_cut     — digital corruption glitch on cut
    neon_wipe      — neon-color left-to-right wipe
    cinematic_fade — fade through black
    pixel_blur     — blur-into-next effect
    vertical_wipe  — cinematic vertical reveal
    dramatic_zoom  — push-zoom on exit/entrance
    whip_pan       — lateral blur simulating whip pan
    black_flash    — fast flash to black and back

Status: BETA — cut/crossfade/cinematic_fade are production-ready.
"""

import asyncio
import json
import logging
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

ADDON_ID   = "transitions_fx"
ADDON_NAME = "Transitions & FX Pack"
VERSION    = "0.7.0"


# ---------------------------------------------------------------------------
# Tension → Transition mapping
# ---------------------------------------------------------------------------

# delta_tension = tension_B - tension_A
# Negative = decreasing tension (relief), Positive = escalating tension
MOOD_TRANSITION_MAP = [
    # (min_delta, max_delta, transition_type)
    (-1.00, -0.30, "cinematic_fade"),    # Strong relief → slow fade
    (-0.30, -0.10, "crossfade"),         # Mild relief → soft blend
    (-0.10,  0.10, "cut"),               # Neutral → clean cut
    ( 0.10,  0.25, "vertical_wipe"),     # Mild escalation
    ( 0.25,  0.45, "neon_wipe"),         # Noticeable escalation
    ( 0.45,  0.65, "glitch_cut"),        # High escalation → glitch
    ( 0.65,  1.00, "black_flash"),       # Max escalation → shock cut
]

COLOR_GRADE_FILTERS = {
    "none":            "",
    "cyberpunk_noir":  "curves=vintage,colorbalance=rs=-0.1:gs=-0.05:bs=0.15:rm=0:gm=0:bm=0:rh=0.1:gh=0:bh=-0.1,eq=contrast=1.15:brightness=-0.05:saturation=1.3",
    "warm_vintage":    "curves=vintage,colorbalance=rs=0.2:gs=0.05:bs=-0.15,vignette=PI/5",
    "cold_horror":     "colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3,curves=none",
    "euphoric":        "hue=s=1.5,eq=contrast=1.1:brightness=0.05:saturation=1.8",
    "desaturated":     "hue=s=0.2,curves=lighter",
}


# ---------------------------------------------------------------------------
# Addon API
# ---------------------------------------------------------------------------

def get_manifest() -> Dict[str, Any]:
    manifest_path = Path(__file__).parent / "manifest.json"
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def initialize(config: Dict[str, Any]) -> None:
    logger.info(
        f"[{ADDON_NAME}] Initialized — "
        f"auto_mood={config.get('auto_mood_transitions', True)}, "
        f"default={config.get('default_transition', 'crossfade')}"
    )


# ---------------------------------------------------------------------------
# Hook handlers
# ---------------------------------------------------------------------------

def on_before_assemble(payload: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Assign transition types to each clip pair based on scene tension arc.
    Payload keys:
        clips (list[dict]) — each has {video_path, scene_id, tension, mood}
    Returns:
        Updated payload with transitions list [{from_id, to_id, transition_type, duration_ms}]
    """
    clips = payload.get("clips", [])
    if len(clips) < 2:
        payload["transitions"] = []
        return payload

    auto_mood = config.get("auto_mood_transitions", True)
    default   = config.get("default_transition", "crossfade")
    duration  = config.get("transition_duration_ms", 600)
    transitions = []

    for i in range(len(clips) - 1):
        clip_a = clips[i]
        clip_b = clips[i + 1]
        tension_a = clip_a.get("tension", 0.5)
        tension_b = clip_b.get("tension", 0.5)

        if auto_mood:
            delta = tension_b - tension_a
            transition_type = _select_transition_from_delta(delta, default)
        else:
            transition_type = default

        transitions.append({
            "from_id":        clip_a.get("scene_id"),
            "to_id":          clip_b.get("scene_id"),
            "from_path":      clip_a.get("video_path"),
            "to_path":        clip_b.get("video_path"),
            "transition_type": transition_type,
            "duration_ms":    duration,
            "tension_delta":  round(tension_b - tension_a, 3),
        })
        logger.debug(
            f"[{ADDON_NAME}] {clip_a.get('scene_id')} → {clip_b.get('scene_id')}: "
            f"{transition_type} (Δtension={tension_b - tension_a:+.2f})"
        )

    payload["transitions"] = transitions
    return payload


async def on_clip_pair_ready(payload: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply transition between two clips.
    Payload keys:
        from_path        (str) — path to first clip
        to_path          (str) — path to second clip
        transition_type  (str)
        duration_ms      (int)
        output_path      (str) — where to write merged clip
    Returns:
        Updated payload with merged_path
    """
    from_path   = Path(payload.get("from_path", ""))
    to_path     = Path(payload.get("to_path", ""))
    trans_type  = payload.get("transition_type", "crossfade")
    duration_ms = payload.get("duration_ms", 600)
    output_path = Path(payload.get("output_path", from_path.parent / f"merged_{from_path.stem}.mp4"))

    if not from_path.exists():
        logger.error(f"[{ADDON_NAME}] Source clip not found: {from_path}")
        return payload
    if not to_path.exists():
        logger.error(f"[{ADDON_NAME}] Target clip not found: {to_path}")
        return payload

    try:
        success = await _apply_transition(from_path, to_path, output_path, trans_type, duration_ms)
        if success:
            payload["merged_path"] = str(output_path)
            logger.info(f"[{ADDON_NAME}] Transition '{trans_type}' applied → {output_path.name}")
        else:
            logger.warning(f"[{ADDON_NAME}] Transition failed — returning unmodified clips")
    except Exception as e:
        logger.error(f"[{ADDON_NAME}] Transition error: {e}")

    return payload


async def on_export_ready(payload: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply global VFX to the final assembled video.
    Payload keys:
        video_path   (str) — assembled video before VFX
        output_path  (str, optional) — final output path (defaults to vfx-suffixed)
    Returns:
        Updated payload with vfx_video_path
    """
    video_path  = Path(payload.get("video_path", ""))
    vfx_config  = config.get("global_vfx", {})

    if not video_path.exists():
        return payload

    output_path = Path(payload.get("output_path", video_path.parent / f"{video_path.stem}_vfx{video_path.suffix}"))

    try:
        vfx_applied = await _apply_global_vfx(video_path, output_path, vfx_config)
        if vfx_applied:
            payload["vfx_video_path"] = str(output_path)
            logger.info(f"[{ADDON_NAME}] Global VFX applied → {output_path.name}")
        else:
            payload["vfx_video_path"] = str(video_path)
    except Exception as e:
        logger.error(f"[{ADDON_NAME}] Global VFX error: {e}")
        payload["vfx_video_path"] = str(video_path)

    return payload


# ---------------------------------------------------------------------------
# Transition implementations
# ---------------------------------------------------------------------------

def _select_transition_from_delta(delta: float, default: str) -> str:
    for min_d, max_d, trans in MOOD_TRANSITION_MAP:
        if min_d <= delta < max_d:
            return trans
    return default


async def _apply_transition(
    from_path: Path,
    to_path: Path,
    output_path: Path,
    trans_type: str,
    duration_ms: int,
) -> bool:
    """Build FFmpeg filter for the requested transition and apply it."""
    ffmpeg = shutil.which("ffmpeg") or "ffmpeg"
    dur    = duration_ms / 1000.0

    # Transition filter graphs
    filters = {
        "cut": None,  # No filter needed — just concatenate
        "crossfade": (
            f"[0:v]format=pix_fmts=yuva420p,fade=t=out:st={{dur_a:.3f}}:d={dur}:alpha=1[va];"
            f"[1:v]format=pix_fmts=yuva420p,fade=t=in:st=0:d={dur}:alpha=1[vb];"
            f"[va][vb]overlay[v]"
        ),
        "cinematic_fade": (
            f"[0:v]fade=t=out:st={{dur_a:.3f}}:d={dur}:color=black[va];"
            f"[1:v]fade=t=in:st=0:d={dur}:color=black[vb];"
            f"[va][vb]concat=n=2:v=1:a=0[v]"
        ),
        "glitch_cut": (
            f"[0:v]rgbashift=rh=8:rv=-8:gh=-4:bh=4,noise=alls=25:allf=t[va];"
            f"[1:v]noise=alls=10:allf=t[vb];"
            f"[va][vb]concat=n=2:v=1:a=0[v]"
        ),
        "neon_wipe": (
            f"[0:v][1:v]xfade=transition=wipeleft:duration={dur}:offset={{dur_a_offset:.3f}}[v]"
        ),
        "vertical_wipe": (
            f"[0:v][1:v]xfade=transition=wipedown:duration={dur}:offset={{dur_a_offset:.3f}}[v]"
        ),
        "black_flash": (
            f"[0:v][1:v]xfade=transition=fade:duration={min(dur, 0.15)}:offset={{dur_a_offset:.3f}}[tmpv];"
            f"[tmpv]fade=t=in:st=0:d={dur}:color=black[v]"
        ),
        "dramatic_zoom": (
            f"[0:v]zoompan=z='zoom+0.02':d={int(dur*25)}:s=1280x720[va];"
            f"[1:v]zoompan=z='2-zoom':d={int(dur*25)}:s=1280x720[vb];"
            f"[va][vb]concat=n=2:v=1:a=0[v]"
        ),
        "whip_pan": (
            f"[0:v]minterpolate=fps=60,boxblur=luma_radius=20:luma_power=2[va];"
            f"[1:v]minterpolate=fps=60,boxblur=luma_radius=3:luma_power=1[vb];"
            f"[va][vb]concat=n=2:v=1:a=0[v]"
        ),
        "pixel_blur": (
            f"[0:v][1:v]xfade=transition=dissolve:duration={dur}:offset={{dur_a_offset:.3f}}[v]"
        ),
    }

    filter_graph = filters.get(trans_type)

    # For cut: simple concat
    if trans_type == "cut" or filter_graph is None:
        tmp_list = output_path.parent / "_concat_list.txt"
        tmp_list.write_text(
            f"file '{from_path.resolve()}'\nfile '{to_path.resolve()}'\n",
            encoding="utf-8"
        )
        cmd = [
            ffmpeg, "-y",
            "-f", "concat", "-safe", "0",
            "-i", str(tmp_list),
            "-c", "copy",
            str(output_path),
        ]
    else:
        # Get clip A duration for offset calculation
        dur_a      = await _get_video_duration(from_path)
        dur_a_off  = max(0.0, dur_a - dur)
        filter_graph = filter_graph.replace("{dur_a:.3f}", f"{dur_a:.3f}")
        filter_graph = filter_graph.replace("{dur_a_offset:.3f}", f"{dur_a_off:.3f}")

        # Use xfade if available (FFmpeg 4.3+), otherwise fallback to concat
        cmd = [
            ffmpeg, "-y",
            "-i", str(from_path),
            "-i", str(to_path),
            "-filter_complex", filter_graph,
            "-map", "[v]",
            "-c:v", "libx264", "-crf", "22", "-preset", "fast",
            "-pix_fmt", "yuv420p",
            str(output_path),
        ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=180)
        if proc.returncode != 0:
            # Fallback to simple concat on any failure
            logger.warning(
                f"[{ADDON_NAME}] Transition '{trans_type}' failed "
                f"(FFmpeg exit {proc.returncode}) — falling back to cut"
            )
            return await _apply_transition(from_path, to_path, output_path, "cut", duration_ms)
        return output_path.exists()
    except asyncio.TimeoutError:
        logger.error(f"[{ADDON_NAME}] FFmpeg timed out for transition '{trans_type}'")
        return False


async def _apply_global_vfx(
    video_path: Path,
    output_path: Path,
    vfx_config: Dict[str, Any],
) -> bool:
    """Apply film grain, vignette, and color grade to the final video."""
    ffmpeg   = shutil.which("ffmpeg") or "ffmpeg"
    filters  = []

    color_grade = vfx_config.get("color_grade", "cyberpunk_noir")
    if color_grade and color_grade != "none":
        grade_filter = COLOR_GRADE_FILTERS.get(color_grade, "")
        if grade_filter:
            filters.append(grade_filter)

    if vfx_config.get("film_grain", True):
        filters.append("noise=alls=8:allf=t+u")

    if vfx_config.get("vignette", True):
        filters.append("vignette=PI/4")

    if vfx_config.get("flicker_enabled", False):
        filters.append("tmix=frames=3:weights='1 0.5 0.25'")

    if not filters:
        return False  # Nothing to apply

    vf = ",".join(filters)
    cmd = [
        ffmpeg, "-y",
        "-i", str(video_path),
        "-vf", vf,
        "-c:v", "libx264", "-crf", "20", "-preset", "fast",
        "-c:a", "copy",
        str(output_path),
    ]

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=300)
        return proc.returncode == 0 and output_path.exists()
    except Exception as e:
        logger.error(f"[{ADDON_NAME}] Global VFX error: {e}")
        return False


async def _get_video_duration(video_path: Path) -> float:
    """Get video duration in seconds using ffprobe."""
    ffprobe = shutil.which("ffprobe") or "ffprobe"
    cmd = [
        ffprobe, "-v", "quiet",
        "-show_entries", "format=duration",
        "-of", "csv=p=0",
        str(video_path),
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
        return float(stdout.decode().strip())
    except Exception:
        return 5.0  # default fallback
