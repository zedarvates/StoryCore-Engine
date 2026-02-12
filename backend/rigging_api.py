# backend/rigging_api.py
"""
Rigging API Endpoint
Provides POST /api/rigging/convert to convert an image sheet into a rig.
"""

import logging
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Import authentication dependency (reuse existing verify_jwt_token)
from backend.auth import verify_jwt_token

# Import pipeline modules
from src.pipeline.segmenter import segment_character
from src.pipeline.rigging.rigging import rig_character

router = APIRouter()

logger = logging.getLogger("rigging_api")
handler = logging.StreamHandler()
formatter = logging.Formatter('{"time":"%(asctime)s","level":"%(levelname)s","msg":"%(message)s"}')
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

class RiggingRequest(BaseModel):
    """Request schema for rigging conversion."""
    image_path: str  # Path to the input image or JSON sheet
    # Additional fields could be added here (e.g., shotId)

@router.post("/rigging/convert", response_model=dict, status_code=status.HTTP_200_OK)
async def convert_to_rig(request: RiggingRequest, user_id: str = Depends(verify_jwt_token)):
    """Convert an image sheet to a rig.
    Steps:
    1. Segment the image to obtain keypoints.
    2. Rig the character using the keypoints.
    3. Return the path to the generated glTF rig.
    """
    logger.info(f"User {user_id} requested rig conversion for {request.image_path}")
    try:
        # Step 1: segmentation
        seg_result = segment_character(request.image_path)
    except Exception as e:
        logger.error(f"Segmentation failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    try:
        # Step 2: rigging – rig_character expects a dict of keypoints
        rig_meta = rig_character(seg_result)
    except Exception as e:
        logger.error(f"Rigging failed: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    # Return the glTF file path
    response = {
        "rigPath": rig_meta.get("file_path"),
        "boneCount": rig_meta.get("bone_count"),
        "hash": rig_meta.get("hash"),
    }
    logger.info(f"Rig conversion successful: {response}")
    return JSONResponse(content=response)
