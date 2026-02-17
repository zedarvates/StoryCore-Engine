from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import os
import uuid
import logging
from pydantic import BaseModel
from backend.ffmpeg_service import FFmpegService
from backend.auth import verify_jwt_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/post-production", tags=["post-production"])
ffmpeg = FFmpegService()

# Directory where outputs are stored
OUTPUT_DIR = "./output"
FRAMES_DIR = os.path.join(OUTPUT_DIR, "frames")

class FrameExtractionRequest(BaseModel):
    video_filename: str
    fps: float = 1.0
    width: Optional[int] = None

class FrameExtractionResponse(BaseModel):
    job_id: str
    frames: List[str]

@router.post("/extract-frames", response_model=FrameExtractionResponse)
async def extract_frames(
    request: FrameExtractionRequest, 
    user_id: str = Depends(verify_jwt_token)
):
    """
    Extracts frames from a video and returns the list of generated image paths.
    """
    video_path = os.path.join(OUTPUT_DIR, request.video_filename)
    if not os.path.exists(video_path):
        # Try without the /output/ prefix if it was included
        clean_filename = request.video_filename.replace("/output/", "").replace("\\output\\", "")
        video_path = os.path.join(OUTPUT_DIR, clean_filename)
        
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail=f"Video not found: {request.video_filename}")

    # Create a unique directory for this extraction job
    job_id = str(uuid.uuid4())[:8]
    job_frames_dir = os.path.join(FRAMES_DIR, job_id)
    os.makedirs(job_frames_dir, exist_ok=True)

    output_pattern = os.path.join(job_frames_dir, "frame_%04d.jpg")
    
    success, error = ffmpeg.extract_frames(
        input_path=video_path,
        output_pattern=output_pattern,
        fps=request.fps,
        width=request.width
    )

    if not success:
        logger.error(f"Frame extraction failed: {error}")
        raise HTTPException(status_code=500, detail=f"Frame extraction failed: {error}")

    # Collect generated frames
    frames = []
    for f in os.listdir(job_frames_dir):
        if f.endswith(".jpg"):
            # Return relative path for frontend
            frames.append(f"/output/frames/{job_id}/{f}")

    return {
        "job_id": job_id,
        "frames": sorted(frames)
    }
