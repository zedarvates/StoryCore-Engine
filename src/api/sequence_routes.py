"""
Sequence API Routes
Provides REST endpoints for sequence management in StoryCore.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import logging
from pathlib import Path
import datetime

from ..auth import User, get_current_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
sequences_router = APIRouter(prefix="/sequences", tags=["sequences"])

class SequenceData(BaseModel):
    id: str
    name: str
    order: int
    duration: float
    shots_count: int
    resume: str
    shot_ids: List[str] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class SequenceListResponse(BaseModel):
    sequences: List[SequenceData]
    total: int

@sequences_router.get("/{project_path:path}/list", response_model=SequenceListResponse)
async def list_sequences(project_path: str, current_user: User = Depends(get_current_user)):
    """
    List all sequences for a project.
    """
    try:
        # Decode project path
        from urllib.parse import unquote
        project_path = unquote(project_path)
        
        sequences_dir = Path(project_path) / "sequences"
        
        if not sequences_dir.exists():
            logger.warning(f"Sequences directory not found: {sequences_dir}")
            return SequenceListResponse(sequences=[], total=0)
        
        sequences = []
        
        # Read all sequence JSON files
        for file_path in sequences_dir.glob("sequence_*.json"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    sequence_data = json.load(f)
                    
                # Ensure shot_ids is an array
                if 'shot_ids' not in sequence_data or not isinstance(sequence_data['shot_ids'], list):
                    sequence_data['shot_ids'] = []
                
                sequences.append(SequenceData(**sequence_data))
            except Exception as e:
                logger.error(f"Failed to load sequence file {file_path}: {e}")
                continue
        
        # Sort by order
        sequences.sort(key=lambda s: s.order)
        
        logger.info(f"Loaded {len(sequences)} sequences from {sequences_dir}")
        return SequenceListResponse(sequences=sequences, total=len(sequences))
        
    except Exception as e:
        logger.error(f"Failed to list sequences: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list sequences: {str(e)}")

@sequences_router.get("/{project_path:path}/{sequence_id}", response_model=SequenceData)
async def get_sequence(project_path: str, sequence_id: str, current_user: User = Depends(get_current_user)):
    """
    Get a specific sequence by ID.
    """
    try:
        from urllib.parse import unquote
        project_path = unquote(project_path)
        
        sequences_dir = Path(project_path) / "sequences"
        
        # Find the sequence file
        for file_path in sequences_dir.glob("sequence_*.json"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    sequence_data = json.load(f)
                    
                if sequence_data.get('id') == sequence_id:
                    if 'shot_ids' not in sequence_data or not isinstance(sequence_data['shot_ids'], list):
                        sequence_data['shot_ids'] = []
                    return SequenceData(**sequence_data)
            except Exception as e:
                logger.error(f"Failed to read sequence file {file_path}: {e}")
                continue
        
        raise HTTPException(status_code=404, detail=f"Sequence {sequence_id} not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get sequence: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get sequence: {str(e)}")

@sequences_router.put("/{project_path:path}/{sequence_id}", response_model=SequenceData)
async def update_sequence(
    project_path: str, 
    sequence_id: str, 
    sequence_update: SequenceData,
    current_user: User = Depends(get_current_user)
):
    """
    Update a sequence.
    """
    try:
        from urllib.parse import unquote
        project_path = unquote(project_path)
        
        sequences_dir = Path(project_path) / "sequences"
        sequences_dir.mkdir(parents=True, exist_ok=True)
        
        # Update timestamp
        sequence_update.updated_at = datetime.datetime.utcnow().isoformat()
        
        # Save to file
        file_name = f"sequence_{sequence_id.zfill(3)}.json"
        file_path = sequences_dir / file_name
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(sequence_update.dict(), f, indent=2, ensure_ascii=False)
        
        logger.info(f"Updated sequence {sequence_id} at {file_path}")
        return sequence_update
        
    except Exception as e:
        logger.error(f"Failed to update sequence: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update sequence: {str(e)}")

@sequences_router.post("/{project_path:path}", response_model=SequenceData)
async def create_sequence(
    project_path: str,
    sequence: SequenceData,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new sequence.
    """
    try:
        from urllib.parse import unquote
        project_path = unquote(project_path)
        
        sequences_dir = Path(project_path) / "sequences"
        sequences_dir.mkdir(parents=True, exist_ok=True)
        
        # Set timestamps
        now = datetime.datetime.utcnow().isoformat()
        sequence.created_at = now
        sequence.updated_at = now
        
        # Save to file
        file_name = f"sequence_{sequence.id.zfill(3)}.json"
        file_path = sequences_dir / file_name
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(sequence.dict(), f, indent=2, ensure_ascii=False)
        
        logger.info(f"Created sequence {sequence.id} at {file_path}")
        return sequence
        
    except Exception as e:
        logger.error(f"Failed to create sequence: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create sequence: {str(e)}")

@sequences_router.delete("/{project_path:path}/{sequence_id}")
async def delete_sequence(
    project_path: str,
    sequence_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a sequence.
    """
    try:
        from urllib.parse import unquote
        project_path = unquote(project_path)
        
        sequences_dir = Path(project_path) / "sequences"
        
        # Find and delete the sequence file
        for file_path in sequences_dir.glob("sequence_*.json"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    sequence_data = json.load(f)
                    
                if sequence_data.get('id') == sequence_id:
                    file_path.unlink()
                    logger.info(f"Deleted sequence {sequence_id} at {file_path}")
                    return {"message": f"Sequence {sequence_id} deleted successfully"}
            except Exception as e:
                logger.error(f"Failed to process sequence file {file_path}: {e}")
                continue
        
        raise HTTPException(status_code=404, detail=f"Sequence {sequence_id} not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete sequence: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete sequence: {str(e)}")
