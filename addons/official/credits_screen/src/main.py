import os
import logging
from pathlib import Path
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ============================================================================
# API Models
# ============================================================================


class CreditsRequest(BaseModel):
    project_id: str
    text: str
    duration: int = 10
    scroll_speed: int = 50
    final_thank_you: bool = True
    include_pegi: bool = True
    include_storycore: bool = True
    output_filename: str = "credits.mp4"


# ============================================================================
# Credits Logic
# ============================================================================


class CreditsService:
    def __init__(self):
        self.output_dir = Path("data/assets/credits")
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.ffmpeg_path = os.path.join(os.getcwd(), "ffmpeg", "bin", "ffmpeg.exe")
        if not os.path.exists(self.ffmpeg_path):
            self.ffmpeg_path = "ffmpeg"  # Fallback

    async def generate_credits_video(self, req: CreditsRequest) -> Dict[str, Any]:
        """
        Génère une vidéo avec texte déroulant sur fond noir.
        FFmpeg drawtext filter used for scrolling.
        """
        output_path = self.output_dir / f"{req.project_id}_{req.output_filename}"

        # Prepare text with StoryCore Engine credit
        full_text = req.text
        if req.final_thank_you:
            full_text += "\n\n\n\nSpecial Thanks\n\n"
        if req.include_storycore:
            full_text += "StoryCore Engine\n"

        # Write text to a temporary file for FFmpeg
        text_file = self.output_dir / f"{req.project_id}_text.txt"
        text_file.write_text(full_text, encoding="utf-8")

        # FFmpeg command
        # black background, scroll from bottom to top
        # y=h-t*scroll_speed
        scroll_speed = req.scroll_speed

        # Drawtext filter string
        # Escape path for windows
        escaped_text_path = str(text_file).replace("\\", "/").replace(":", "\\:")

        vf_filters = [
            f"drawtext=textfile='{escaped_text_path}':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=h-{scroll_speed}*t:line_spacing=10"
        ]

        # Add PEG Watermark logic if requested
        # Using a semi-transparent box as a placeholder for PEG
        if req.include_pegi:
            # Drawing a small marker at bottom left
            vf_filters.append(
                "drawtext=text='PEGI 18':fontcolor=white@0.5:fontsize=20:x=20:y=h-40"
            )
            vf_filters.append(
                "drawtext=text='CENSURE':fontcolor=white@0.5:fontsize=20:x=w-120:y=h-40"
            )

        vf_str = ",".join(vf_filters)

        cmd = [
            self.ffmpeg_path,
            "-y",
            "-f",
            "lavfi",
            "-i",
            f"color=c=black:s=1920x1080:d={req.duration}",
            "-vf",
            vf_str,
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(output_path),
        ]

        logger.info(f"Generating credits: {' '.join(cmd)}")

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                logger.error(f"FFmpeg failed: {stderr.decode()}")
                return {"success": False, "error": stderr.decode()}

            return {
                "success": True,
                "video_path": str(output_path),
                "duration": req.duration,
            }
        except Exception as e:
            logger.error(f"Error generating credits: {e}")
            return {"success": False, "error": str(e)}


# ============================================================================
# FastAPI Router
# ============================================================================

import asyncio

router = APIRouter(prefix="/api/addons/credits_screen", tags=["Credits Engine"])
service = CreditsService()


@router.get("/status")
async def get_status():
    return {"status": "active", "addon": "credits_screen"}


@router.post("/generate")
async def generate_credits(req: CreditsRequest):
    result = await service.generate_credits_video(req)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


# ADDON_INFO required for engine integration
ADDON_INFO = {
    "name": "credits_screen",
    "display_name": "Credits Screen",
    "version": "1.0.0",
    "router": router,
    "description": "Generates cinematic credits with scrolling text, PEGI/Censure watermarks, and StoryCore Engine attribution.",
}
