"""
Location API - FastAPI endpoints for location management
"""
import os
import json
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/locations", tags=["locations"])

LOCATIONS_DIR = Path("./data/locations").resolve()
LOCATIONS_DIR.mkdir(parents=True, exist_ok=True)
locations_db: Dict[str, Dict[str, Any]] = {}

class LocationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    location_type: str = "generic"
    metadata: Dict[str, Any] = {}

class LocationCreate(LocationBase):
    cube_faces: Optional[Dict[str, str]] = None
    skybox_data: Optional[Dict[str, Any]] = None
    tile_image_path: Optional[str] = None

class LocationResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    location_type: str
    metadata: Dict[str, Any]
    cube_faces: Optional[Dict[str, str]]
    skybox_data: Optional[Dict[str, Any]]
    tile_image_path: Optional[str]
    created_at: str
    updated_at: str


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    cube_faces: Optional[Dict[str, str]] = None
    skybox_data: Optional[Dict[str, Any]] = None
    tile_image_path: Optional[str] = None


def get_location_path(location_id: str) -> Path:
    """Get safe location file path using pathlib."""
    # Validate location_id to prevent path traversal
    if not location_id or '/' in location_id or '\\' in location_id:
        raise ValueError(f"Invalid location_id: {location_id}")
    return LOCATIONS_DIR / f"{location_id}.json"

def load_location(location_id: str) -> Optional[Dict[str, Any]]:
    if location_id in locations_db:
        return locations_db[location_id]
    path = get_location_path(location_id)
    if path.exists():
        try:
            with open(path, 'r', encoding='utf-8') as f:
                loc = json.load(f)
                locations_db[location_id] = loc
                return loc
        except (json.JSONDecodeError, IOError, UnicodeDecodeError) as e:
            logger.error(f"Error loading location {location_id}: {e}")
            return None
    return None

def save_location(location_id: str, data: Dict[str, Any]) -> bool:
    locations_db[location_id] = data
    # Determine target directory: use project-specific folder if project_id is provided
    if "project_id" in data and data["project_id"]:
        # Validate project_id to prevent path traversal
        project_id = data["project_id"]
        if '/' in project_id or '\\' in project_id:
            logger.error(f"Invalid project_id: {project_id}")
            return False
        base_dir = Path("./projects").resolve() / project_id / "lieux"
    else:
        base_dir = LOCATIONS_DIR
    # Ensure the target directory exists
    base_dir.mkdir(parents=True, exist_ok=True)
    target_path = base_dir / f"{location_id}.json"
    try:
        with open(target_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, default=str)
        return True
    except (IOError, OSError) as e:
        logger.error(f"Error saving location {location_id}: {e}")
        return False

@router.get("", response_model=List[LocationResponse])
async def list_locations() -> List[LocationResponse]:
    locations = []
    for loc in locations_db.values():
        try:
            locations.append(LocationResponse(**loc))
        except (ValueError, TypeError) as e:
            logger.warning(f"Error validating location: {e}")
            continue
    return locations

@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(location_id: str) -> LocationResponse:
    loc = load_location(location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return LocationResponse(**loc)

@router.post("", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(data: LocationCreate) -> LocationResponse:
    loc_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    loc = {
        "id": loc_id, "name": data.name, "description": data.description,
        "location_type": data.location_type, "metadata": data.metadata,
        "cube_faces": data.cube_faces, "skybox_data": data.skybox_data,
        "tile_image_path": data.tile_image_path,
        "created_at": now, "updated_at": now
    }
    save_location(loc_id, loc)
    return LocationResponse(**loc)

@router.put("/{location_id}", response_model=LocationResponse)
async def update_location(location_id: str, update_data: dict) -> LocationResponse:
    loc = load_location(location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    loc.update(update_data)
    loc["updated_at"] = datetime.utcnow().isoformat()
    save_location(location_id, loc)
    return LocationResponse(**loc)

@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(location_id: str):
    if location_id in locations_db:
        del locations_db[location_id]
    path = get_location_path(location_id)
    if os.path.exists(path):
        os.remove(path)

# =============================================================================
# Project-Local Locations Endpoints
# =============================================================================

@router.get("/project/{project_id}", response_model=List[LocationResponse])
async def list_project_locations(project_id: str) -> List[LocationResponse]:
    """
    List all locations in a project's lieux folder.
    """
    # Validate project_id to prevent path traversal
    if '/' in project_id or '\\' in project_id:
        logger.warning(f"Invalid project_id in path traversal attempt: {project_id}")
        return []
    
    lieux_dir = Path("./projects") / project_id / "lieux"
    if not lieux_dir.exists():
        return []
    
    locations = []
    for filename in lieux_dir.iterdir():
        if filename.suffix == '.json':
            filepath = lieux_dir / filename
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    loc = json.load(f)
                    locations.append(LocationResponse(**loc))
            except (json.JSONDecodeError, IOError, UnicodeDecodeError) as e:
                logger.error(f"Error loading location {filename}: {e}")
                continue
    return locations

@router.get("/project/{project_id}/{location_id}", response_model=LocationResponse)
async def get_project_location(project_id: str, location_id: str) -> LocationResponse:
    """
    Get a specific location from a project's lieux folder.
    """
    # Validate IDs to prevent path traversal
    if '/' in project_id or '\\' in project_id:
        raise HTTPException(status_code=400, detail="Invalid project_id")
    if '/' in location_id or '\\' in location_id:
        raise HTTPException(status_code=400, detail="Invalid location_id")
    
    filepath = Path("./projects") / project_id / "lieux" / f"{location_id}.json"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Location not found in project")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            loc = json.load(f)
            return LocationResponse(**loc)
    except (json.JSONDecodeError, IOError, UnicodeDecodeError) as e:
        logger.error(f"Error loading location {project_id}/{location_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading location: {str(e)}")
