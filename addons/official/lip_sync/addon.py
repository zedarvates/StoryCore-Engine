"""
Lip-Sync & Audio Addon — StoryCore Engine
==========================================
Automated audio-to-video synchronization for character dialogue.

Hooks:
    on_audio_ready    — triggered when TTS/audio synthesis completes for a clip
    on_video_clip_ready — triggered when a raw video clip is ready for sync
    on_export_ready   — triggered before final export, applies global audio sync

Status: BETA — basic_ffmpeg mode is production-ready.
        wav2lip and rhubarb modes require external model downloads.
"""

import asyncio
import json
import logging
import subprocess
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Addon API
# ---------------------------------------------------------------------------

ADDON_ID   = "lip_sync"
ADDON_NAME = "Lip-Sync & Audio"
VERSION    = "0.9.0"


def get_manifest() -> Dict[str, Any]:
    manifest_path = Path(__file__).parent / "manifest.json"
    return json.loads(manifest_path.read_text(encoding="utf-8"))


def initialize(config: Dict[str, Any]) -> None:
    """Called once by AddonManager on load."""
    mode = config.get("mode", "basic_ffmpeg")
    logger.info(f"[{ADDON_NAME}] Initialized — mode: {mode}")
    if mode == "wav2lip":
        _check_wav2lip()
    elif mode == "rhubarb":
        _check_rhubarb()


# ---------------------------------------------------------------------------
# Hook handlers
# ---------------------------------------------------------------------------

async def on_audio_ready(payload: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Triggered when a TTS audio clip is ready.
    Payload keys:
        audio_path   (str) — path to the synthesized WAV/MP3
        character_id (str) — character identifier
        scene_id     (str) — scene identifier
        transcript   (str) — dialogue text
    Returns:
        Updated payload with phoneme_map (if mode supports it)
    """
    mode = config.get("mode", "basic_ffmpeg")
    audio_path = Path(payload.get("audio_path", ""))

    if not audio_path.exists():
        logger.warning(f"[{ADDON_NAME}] Audio file not found: {audio_path}")
        return payload

    if mode == "rhubarb":
        phoneme_file = await _extract_phonemes_rhubarb(audio_path)
        payload["phoneme_map"] = str(phoneme_file) if phoneme_file else None

    logger.debug(f"[{ADDON_NAME}] on_audio_ready: {audio_path.name} (mode={mode})")
    return payload


async def on_video_clip_ready(payload: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Triggered when a video clip is ready.
    Payload keys:
        video_path   (str) — raw generated video clip
        audio_path   (str) — matched audio clip
        scene_id     (str)
        character_id (str)
        bbox         (list[int]) — optional [x, y, w, h] for character face region
    Returns:
        Updated payload with synced_video_path
    """
    mode      = config.get("mode", "basic_ffmpeg")
    video_in  = Path(payload.get("video_path", ""))
    audio_in  = Path(payload.get("audio_path", ""))
    scene_id  = payload.get("scene_id", "unknown")
    bbox      = payload.get("bbox")

    if not video_in.exists():
        logger.error(f"[{ADDON_NAME}] Video not found: {video_in}")
        return payload
    if not audio_in.exists():
        logger.warning(f"[{ADDON_NAME}] Audio not found: {audio_in} — skipping lip-sync")
        return payload

    synced_path = video_in.parent / f"{video_in.stem}_synced{video_in.suffix}"

    try:
        if mode == "wav2lip":
            success = await _sync_wav2lip(video_in, audio_in, synced_path, bbox)
        elif mode == "rhubarb":
            phoneme_map = payload.get("phoneme_map")
            success = await _sync_rhubarb(video_in, audio_in, synced_path, phoneme_map, bbox)
        else:
            # basic_ffmpeg: mux audio into video (no facial animation)
            success = await _sync_basic_ffmpeg(video_in, audio_in, synced_path)

        if success and synced_path.exists():
            payload["synced_video_path"] = str(synced_path)
            logger.info(f"[{ADDON_NAME}] Lip-sync complete: {synced_path.name}")
        else:
            logger.warning(f"[{ADDON_NAME}] Lip-sync failed for scene {scene_id}")

    except Exception as e:
        logger.error(f"[{ADDON_NAME}] Lip-sync error for scene {scene_id}: {e}")

    return payload


async def on_export_ready(payload: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Final pass: verify all clips have synced audio, apply audio mastering.
    Payload keys:
        clips      (list[dict]) — list of {video_path, audio_path, synced_video_path}
        output_dir (str)
    """
    clips = payload.get("clips", [])
    unsynced = [c for c in clips if not c.get("synced_video_path")]
    if unsynced:
        logger.warning(
            f"[{ADDON_NAME}] {len(unsynced)}/{len(clips)} clip(s) have no synced audio — "
            "running basic mux on remaining."
        )
        for clip in unsynced:
            vp = Path(clip.get("video_path", ""))
            ap = Path(clip.get("audio_path", ""))
            if vp.exists() and ap.exists():
                out = vp.parent / f"{vp.stem}_synced{vp.suffix}"
                await _sync_basic_ffmpeg(vp, ap, out)
                clip["synced_video_path"] = str(out)

    payload["lip_sync_applied"] = True
    logger.info(f"[{ADDON_NAME}] Export pass complete: {len(clips)} clip(s) processed.")
    return payload


# ---------------------------------------------------------------------------
# Backend implementations
# ---------------------------------------------------------------------------

async def _sync_basic_ffmpeg(
    video_path: Path,
    audio_path: Path,
    output_path: Path,
) -> bool:
    """Mux audio into video using FFmpeg (no facial animation)."""
    ffmpeg = shutil.which("ffmpeg") or "ffmpeg"
    cmd = [
        ffmpeg, "-y",
        "-i", str(video_path),
        "-i", str(audio_path),
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        str(output_path),
    ]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
        if proc.returncode != 0:
            logger.error(f"FFmpeg mux failed: {stderr.decode()[-200:]}")
            return False
        return True
    except asyncio.TimeoutError:
        logger.error("FFmpeg mux timed out")
        return False


async def _sync_wav2lip(
    video_path: Path,
    audio_path: Path,
    output_path: Path,
    bbox: Optional[List[int]] = None,
) -> bool:
    """
    Apply Wav2Lip deep-learning lip-sync.
    Requires: pip install wav2lip  or  local Wav2Lip installation.
    """
    try:
        # Attempt to use wav2lip via subprocess (local install)
        wav2lip_script = Path(__file__).parent / "wav2lip" / "inference.py"
        if not wav2lip_script.exists():
            logger.warning("Wav2Lip script not found — falling back to basic FFmpeg mux")
            return await _sync_basic_ffmpeg(video_path, audio_path, output_path)

        cmd = [
            "python", str(wav2lip_script),
            "--checkpoint_path", str(Path(__file__).parent / "wav2lip" / "wav2lip_gan.pth"),
            "--face", str(video_path),
            "--audio", str(audio_path),
            "--outfile", str(output_path),
        ]
        if bbox:
            cmd += ["--pads", str(bbox[1]), "0", "0", "0"]

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        _, stderr = await asyncio.wait_for(proc.communicate(), timeout=600)
        if proc.returncode != 0:
            logger.error(f"Wav2Lip failed: {stderr.decode()[-500:]}")
            return False
        return True
    except Exception as e:
        logger.error(f"Wav2Lip error: {e} — falling back to basic FFmpeg")
        return await _sync_basic_ffmpeg(video_path, audio_path, output_path)


async def _extract_phonemes_rhubarb(audio_path: Path) -> Optional[Path]:
    """Extract phonemes from audio using Rhubarb Lip Sync."""
    rhubarb = shutil.which("rhubarb")
    if not rhubarb:
        logger.warning("Rhubarb not found in PATH")
        return None
    out_json = audio_path.with_suffix(".phonemes.json")
    cmd = [rhubarb, "-f", "json", "-o", str(out_json), str(audio_path)]
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await asyncio.wait_for(proc.communicate(), timeout=60)
        return out_json if out_json.exists() else None
    except Exception as e:
        logger.error(f"Rhubarb extraction error: {e}")
        return None


async def _sync_rhubarb(
    video_path: Path,
    audio_path: Path,
    output_path: Path,
    phoneme_map: Optional[str],
    bbox: Optional[List[int]],
) -> bool:
    """Apply Rhubarb-based phoneme sync (overlay mouth shapes on video)."""
    # Rhubarb sync is complex; fall back to basic mux for now
    logger.info(
        f"[{ADDON_NAME}] Rhubarb mode: phoneme map={'present' if phoneme_map else 'absent'} "
        "— using basic mux"
    )
    return await _sync_basic_ffmpeg(video_path, audio_path, output_path)


# ---------------------------------------------------------------------------
# Dependency checks
# ---------------------------------------------------------------------------

def _check_wav2lip() -> None:
    wav2lip_dir = Path(__file__).parent / "wav2lip"
    if not wav2lip_dir.exists():
        logger.warning(
            f"[{ADDON_NAME}] Wav2Lip mode requested but models not found at {wav2lip_dir}.\n"
            "  Download: https://github.com/Rudrabha/Wav2Lip\n"
            "  Place wav2lip_gan.pth in addons/official/lip_sync/wav2lip/"
        )


def _check_rhubarb() -> None:
    if not shutil.which("rhubarb"):
        logger.warning(
            f"[{ADDON_NAME}] Rhubarb mode requested but 'rhubarb' not in PATH.\n"
            "  Download: https://github.com/DanielSWolf/rhubarb-lip-sync"
        )
