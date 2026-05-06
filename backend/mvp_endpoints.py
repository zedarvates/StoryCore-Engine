from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
import uuid
from datetime import datetime
import json
from pathlib import Path

# Import authentication dependency
from backend.auth import verify_jwt_token

router = APIRouter()

# Data directories for persistent storage
DATA_DIR = Path("./data")
IDENTITIES_DIR = DATA_DIR / "identities"
SEGMENTS_DIR = DATA_DIR / "segments"
TEMPLATES_DIR = DATA_DIR / "prompt_templates"
VIDEOS_DIR = DATA_DIR / "videos"

# Ensure directories exist
for dir_path in [IDENTITIES_DIR, SEGMENTS_DIR, TEMPLATES_DIR, VIDEOS_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)


def _load_json_store(directory: Path) -> Dict[str, dict]:
    """Load all JSON files from a directory into a dictionary."""
    store = {}
    try:
        for file_path in directory.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    store[file_path.stem] = json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
    except OSError:
        pass
    return store


def _save_json_item(directory: Path, item_id: str, data: dict) -> None:
    """Save a single item to a JSON file."""
    file_path = directory / f"{item_id}.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False, default=str)


def _delete_json_item(directory: Path, item_id: str) -> bool:
    """Delete a JSON file."""
    file_path = directory / f"{item_id}.json"
    if file_path.exists():
        file_path.unlink()
        return True
    return False


def _new_id() -> str:
    return str(uuid.uuid4())


class IdentityCreateRequest(BaseModel):
    name: str
    project_id: str
    reference_image: Optional[str] = None
    manual_attributes: Optional[dict] = None
    lock_features: List[str] = []


class IdentityResponse(BaseModel):
    identity_id: str
    name: str
    project_id: str
    thumbnail_url: str
    lock_strength: float
    locked_features: List[str]


@router.post("/identity/create", response_model=IdentityResponse)
def identity_create(
    req: IdentityCreateRequest, user_id: str = Depends(verify_jwt_token)
):
    identity_id = _new_id()
    identity_data = {
        "name": req.name,
        "project_id": req.project_id,
        "reference_image": req.reference_image,
        "locked_features": req.lock_features,
        "lock_strength": 0.85,
        "created_at": datetime.utcnow().isoformat(),
        "owner_id": user_id,
    }
    _save_json_item(IDENTITIES_DIR, identity_id, identity_data)
    return IdentityResponse(
        identity_id=identity_id,
        name=req.name,
        project_id=req.project_id,
        thumbnail_url=f"/output/identity/{identity_id}/thumb.jpg",
        lock_strength=0.85,
        locked_features=req.lock_features,
    )


class IdentityApplyRequest(BaseModel):
    identity_id: str
    scene_id: Optional[str] = None
    generation_params: Optional[dict] = None


class IdentityApplyResponse(BaseModel):
    applied: bool
    identity_score: float = 0.92
    prompt_enhanced: Optional[str] = None


@router.post("/identity/apply", response_model=IdentityApplyResponse)
def identity_apply(req: IdentityApplyRequest, user_id: str = Depends(verify_jwt_token)):
    identities = _load_json_store(IDENTITIES_DIR)
    if req.identity_id not in identities:
        raise HTTPException(status_code=404, detail="Identity not found")

    # Vérifier que l'utilisateur est propriétaire de l'identité
    identity = identities[req.identity_id]
    if identity.get("owner_id") and identity.get("owner_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this identity")

    return IdentityApplyResponse(
        applied=True, identity_score=0.92, prompt_enhanced="Applied identity to scene"
    )


class IdentityValidateResponse(BaseModel):
    identity_id: str
    scene_id: str
    consistency_score: float
    issues: List[str]
    recommendations: List[str]


@router.get(
    "/identity/{identity_id}/validate/{scene_id}",
    response_model=IdentityValidateResponse,
)
def identity_validate(
    identity_id: str, scene_id: str, user_id: str = Depends(verify_jwt_token)
):
    identities = _load_json_store(IDENTITIES_DIR)
    if identity_id not in identities:
        raise HTTPException(status_code=404, detail="Identity not found")

    # Vérifier que l'utilisateur est propriétaire de l'identité
    identity = identities[identity_id]
    if identity.get("owner_id") and identity.get("owner_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this identity")

    return IdentityValidateResponse(
        identity_id=identity_id,
        scene_id=scene_id,
        consistency_score=0.88,
        issues=[],
        recommendations=["Consider adjusting lighting for better identity match"],
    )


class ScriptSegmentRequest(BaseModel):
    script: str
    language: str = "fr"
    target_duration: float = 8.0


class ScriptSegmentResponse(BaseModel):
    segmentation_id: str
    total_duration: float
    segments: List[Dict]


@router.post("/segmentation/segment", response_model=ScriptSegmentResponse)
def segmentation_segment(
    req: ScriptSegmentRequest, user_id: str = Depends(verify_jwt_token)
):
    seg_id = _new_id()
    segments = [
        {
            "id": "seg_001",
            "text": req.script[:50],
            "duration": 7.5,
            "promptSuggestion": "Generated prompt",
        }
    ]
    return ScriptSegmentResponse(
        segmentation_id=seg_id, total_duration=8.0, segments=segments
    )


# --- Additional MVP endpoints: Templates & Video rendering ---


class TemplateCreateRequest(BaseModel):
    name: str
    category: str
    template_text: str
    variables: Optional[dict] = None


class TemplateResponse(BaseModel):
    template_id: str
    name: str
    category: str
    template_text: str
    variables: Optional[dict]
    created_at: str


@router.post("/templates/create", response_model=TemplateResponse)
def template_create(
    req: TemplateCreateRequest, user_id: str = Depends(verify_jwt_token)
):
    tmpl_id = _new_id()
    created_at = datetime.utcnow().isoformat()
    template_data = {
        "name": req.name,
        "category": req.category,
        "template_text": req.template_text,
        "variables": req.variables,
        "created_at": created_at,
        "owner_id": user_id,
    }
    _save_json_item(TEMPLATES_DIR, tmpl_id, template_data)
    return TemplateResponse(
        template_id=tmpl_id,
        name=req.name,
        category=req.category,
        template_text=req.template_text,
        variables=req.variables,
        created_at=created_at,
    )


class TemplateRenderRequest(BaseModel):
    template_id: str
    payload: dict


class TemplateRenderResponse(BaseModel):
    rendered_text: str
    token_count: int


@router.post("/templates/{template_id}/render", response_model=TemplateRenderResponse)
def template_render(
    template_id: str,
    req: TemplateRenderRequest,
    user_id: str = Depends(verify_jwt_token),
):
    templates = _load_json_store(TEMPLATES_DIR)
    if template_id not in templates:
        raise HTTPException(status_code=404, detail="Template not found")

    # Get declared variables from template
    template_data = templates[template_id]
    declared_vars = template_data.get("variables", {})
    template = template_data["template_text"]

    rendered = template
    for k, v in req.payload.items():
        # Validate that the key is a declared variable in the template
        if k not in declared_vars:
            raise HTTPException(
                status_code=400,
                detail=f"Variable '{k}' is not declared in template. Allowed variables: {list(declared_vars.keys())}",
            )
        # Only replace exact variable patterns - sanitize value to prevent injection
        safe_value = str(v).replace("{{", "").replace("}}", "")
        rendered = rendered.replace("{{" + k + "}}", safe_value)

    return TemplateRenderResponse(
        rendered_text=rendered, token_count=len(rendered.split())
    )


class VideoRenderRequest(BaseModel):
    prompt: str
    identity_id: Optional[str] = None
    resolution: str = "1080p"
    audio_url: Optional[str] = None


class VideoRenderResponse(BaseModel):
    video_url: str
    duration: float
    resolution: str


@router.post("/video/render", response_model=VideoRenderResponse)
def video_render(req: VideoRenderRequest, user_id: str = Depends(verify_jwt_token)):
    vid_id = _new_id()
    video_data = {
        "prompt": req.prompt,
        "identity_id": req.identity_id,
        "resolution": req.resolution,
        "audio_url": req.audio_url,
        "created_at": datetime.utcnow().isoformat(),
        "owner_id": user_id,
    }
    _save_json_item(VIDEOS_DIR, vid_id, video_data)
    return VideoRenderResponse(
        video_url=f"/output/videos/{vid_id}.mp4",
        duration=12.0,
        resolution=req.resolution,
    )


class VideoMergeExportRequest(BaseModel):
    videos: List[str]
    platforms: List[str] = []
    generate_metadata: bool = True


class VideoMergeExportResponse(BaseModel):
    final_video_url: str
    platform_versions: dict
    metadata: dict


@router.post("/video/merge-export", response_model=VideoMergeExportResponse)
def video_merge_export(
    req: VideoMergeExportRequest, user_id: str = Depends(verify_jwt_token)
):
    final_url = "/output/final/storycore_combined.mp4"
    return VideoMergeExportResponse(
        final_video_url=final_url, platform_versions={"youtube": "v1"}, metadata={}
    )
