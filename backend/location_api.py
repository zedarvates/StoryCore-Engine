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
    significance: str = ""
    atmosphere: str = ""

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
    significance: str = ""
    atmosphere: str = ""
    created_at: str
    updated_at: str


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    significance: Optional[str] = None
    atmosphere: Optional[str] = None
    cube_faces: Optional[Dict[str, str]] = None
    skybox_data: Optional[Dict[str, Any]] = None
    tile_image_path: Optional[str] = None


def get_location_path(location_id: str) -> Path:
    """
    Get safe location file path using pathlib.
    
    Security Fix: Uses pathlib.Path.resolve() to sanitize paths and prevent 
    directory traversal attacks. This ensures the resolved path stays within 
    the designated LOCATIONS_DIR directory.
    """
    # Validate location_id format first
    if not location_id or '/' in location_id or '\\' in location_id or '..' in location_id:
        raise ValueError(f"Invalid location_id: {location_id}")
    
    # Construct and resolve the target path
    target_path = (LOCATIONS_DIR / f"{location_id}.json").resolve()
    
    # Security check: ensure the resolved path is within LOCATIONS_DIR
    # This prevents directory traversal attacks using symlinks or other tricks
    if not str(target_path).startswith(str(LOCATIONS_DIR)):
        raise ValueError(f"Path traversal detected for location_id: {location_id}")
    
    return target_path

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
        # Use 'locations' directory
        base_dir = Path("./projects").resolve() / project_id / "locations"
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

@router.get("/", response_model=List[LocationResponse])
async def list_locations() -> List[LocationResponse]:
    """
    List all globally available locations.
    Scans the LOCATIONS_DIR and returns all valid location records.
    """
    if not LOCATIONS_DIR.exists():
        LOCATIONS_DIR.mkdir(parents=True, exist_ok=True)
        return []
        
    locations = []
    for filename in LOCATIONS_DIR.iterdir():
        if filename.suffix == '.json':
            try:
                # Use load_location which handles caching
                loc = load_location(filename.stem)
                if loc:
                    # Clean up data mapping if needed (id vs location_id)
                    if 'id' not in loc and 'location_id' in loc:
                        loc['id'] = loc['location_id']
                    elif 'location_id' not in loc and 'id' in loc:
                        loc['location_id'] = loc['id']
                        
                    locations.append(LocationResponse(**loc))
            except Exception as e:
                logger.error(f"Error loading location {filename}: {e}")
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
        "significance": data.significance,
        "atmosphere": data.atmosphere,
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
    List all locations in a project's locations folder.
    """
    # Validate project_id to prevent path traversal
    if '/' in project_id or '\\' in project_id:
        logger.warning(f"Invalid project_id in path traversal attempt: {project_id}")
        return []
    
    locations_dir = Path("./projects") / project_id / "locations"
    if not locations_dir.exists():
        return []
    
    locations = []
    for filename in locations_dir.iterdir():
        if filename.suffix == '.json':
            filepath = locations_dir / filename
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
    Get a specific location from a project's locations folder.
    """
    # Validate IDs to prevent path traversal
    if '/' in project_id or '\\' in project_id:
        raise HTTPException(status_code=400, detail="Invalid project_id")
    if '/' in location_id or '\\' in location_id:
        raise HTTPException(status_code=400, detail="Invalid location_id")
    
    filepath = Path("./projects") / project_id / "locations" / f"{location_id}.json"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Location not found in project")
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            loc = json.load(f)
            return LocationResponse(**loc)
    except (json.JSONDecodeError, IOError, UnicodeDecodeError) as e:
        logger.error(f"Error loading location {project_id}/{location_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error loading location: {str(e)}")

@router.post("/{location_id}/cube-textures", response_model=LocationResponse)
async def update_cube_texture(location_id: str, data: dict) -> LocationResponse:
    """
    Update cube textures for a location.
    Typically called after a face generation.
    """
    loc = load_location(location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    
    face = data.get("face")
    if not face:
        raise HTTPException(status_code=400, detail="Face direction is required")
        
    # Initialize dictionaries if they don't exist
    if "cube_faces" not in loc or loc["cube_faces"] is None:
        loc["cube_faces"] = {}
        
    # Update the face texture path (which might be a URL or local path)
    # The frontend might pass the image_path or we might need to derive it
    image_path = data.get("image_path") or data.get("image")
    if image_path:
        loc["cube_faces"][face] = image_path
        
    # Also update metadata if provided
    if "metadata" not in loc:
        loc["metadata"] = {}
    
    if "generation_history" not in loc["metadata"]:
        loc["metadata"]["generation_history"] = []
        
    loc["metadata"]["generation_history"].append({
        "type": "cube_face",
        "face": face,
        "timestamp": datetime.utcnow().isoformat(),
        "params": data
    })
    
    loc["updated_at"] = datetime.utcnow().isoformat()
    save_location(location_id, loc)
    return LocationResponse(**loc)

@router.post("/{location_id}/skybox", response_model=LocationResponse)
async def update_skybox(location_id: str, data: dict) -> LocationResponse:
    """
    Update skybox data for a location.
    """
    loc = load_location(location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
        
    # Update skybox metadata
    loc["skybox_data"] = data
    
    # If there's an image_path in the data, also update tile_image_path for preview
    if "image_path" in data:
        loc["tile_image_path"] = data["image_path"]
        
    loc["updated_at"] = datetime.utcnow().isoformat()
    save_location(location_id, loc)
    return LocationResponse(**loc)
