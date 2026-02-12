"""
StoryCore-Engine Scenario API

This module provides REST API endpoints for story to scenario transformation.
Transforms raw story text into structured cinematic scenario JSON.

Endpoints:
- POST /api/scenario/transform - Transform story to scenario
- GET /api/scenario/{id} - Get scenario by ID
- GET /api/scenario/{id}/export - Export scenario in various formats
- DELETE /api/scenario/{id} - Delete scenario

Requirements: Q1 2026 - Scenario Transformation API
"""

import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from backend.auth import verify_jwt_token
from backend.storage import JSONFileStorage

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.story_transformer import transform_story_to_scenario, StructuredScenario

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()


class Settings(BaseSettings):
    """Application settings for scenario management"""
    scenarios_directory: str = Field(default="./data/scenarios", env='SCENARIOS_DIRECTORY')
    max_story_length: int = Field(default=50000, env='MAX_STORY_LENGTH')
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


try:
    settings = Settings()
except Exception as e:
    logger.warning(f"Failed to load settings, using defaults: {e}")
    settings = Settings()


class ExportFormat(str, Enum):
    """Export format options"""
    JSON = "json"
    TEXT = "txt"
    MARKDOWN = "md"
    HTML = "html"


class ScenarioTransformRequest(BaseModel):
    """Request model for scenario transformation"""
    story: str = Field(..., min_length=10, max_length=50000)
    title: Optional[str] = Field(None, max_length=255)
    options: Dict[str, Any] = {}


class ScenarioResponse(BaseModel):
    """Response model for scenario data"""
    id: str
    title: str
    status: str
    created_at: str
    updated_at: str
    meta: Dict[str, Any]
    personnages_count: int
    lieux_count: int
    objets_count: int
    sequences_count: int
    scenes_count: int


class ScenarioTransformResponse(BaseModel):
    """Response model for transformation result"""
    scenario_id: str
    status: str
    message: str
    summary: Dict[str, Any]


class ScenarioExportResponse(BaseModel):
    """Response model for scenario export"""
    format: str
    content: str
    filename: str


# Initialize scenario storage
scenario_storage = JSONFileStorage(settings.scenarios_directory, max_cache_size=100)


def save_scenario(scenario_id: str, data: Dict[str, Any]) -> bool:
    """Save scenario to storage"""
    data["updated_at"] = datetime.utcnow().isoformat()
    return scenario_storage.save(scenario_id, data)


def load_scenario(scenario_id: str) -> Optional[Dict[str, Any]]:
    """Load scenario from storage"""
    return scenario_storage.load(scenario_id)


@router.post("/scenario/transform", response_model=ScenarioTransformResponse)
async def transform_story(
    request: ScenarioTransformRequest,
    user_id: str = Depends(verify_jwt_token)
) -> ScenarioTransformResponse:
    """
    Transform raw story text into structured cinematic scenario.
    
    This endpoint:
    1. Analyzes the story to extract meta information (pitch, theme, ton)
    2. Extracts and analyzes characters with detailed profiles
    3. Identifies locations with atmospheric descriptions
    4. Finds objects/artefacts important to the narrative
    5. Builds the 3-act narrative structure
    6. Generates sequences with detailed breakdowns
    7. Creates scenes with camera plans, dialogues, and audio cues
    
    Args:
        request: Story transformation parameters
        user_id: Authenticated user ID
    
    Returns:
        Transformation result with scenario summary
    
    Raises:
        HTTPException: If transformation fails
    """
    logger.info(f"Story transformation request from user {user_id}")
    
    try:
        # Generate unique scenario ID
        scenario_id = str(uuid.uuid4())
        
        # Transform story to scenario
        logger.info(f"Transforming story (length: {len(request.story)})...")
        
        scenario = transform_story_to_scenario(request.story, request.title)
        
        # Convert to dict for storage
        scenario_data = scenario.to_dict()
        scenario_data["id"] = scenario_id
        scenario_data["user_id"] = user_id
        scenario_data["created_at"] = datetime.utcnow().isoformat()
        scenario_data["status"] = "completed"
        
        # Save scenario
        if not save_scenario(scenario_id, scenario_data):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save scenario"
            )
        
        logger.info(f"Scenario {scenario_id} created successfully")
        
        # Build summary
        summary = {
            "titre": scenario.meta["titre"],
            "pitch": scenario.meta["pitch"][:100] + "...",
            "theme": scenario.meta["theme"],
            "ton": scenario.meta["ton"],
            "personnages": len(scenario.personnages),
            "lieux": len(scenario.lieux),
            "objets": len(scenario.objets),
            "sequences": len(scenario.sequences),
            "scenes": len(scenario.scenes)
        }
        
        return ScenarioTransformResponse(
            scenario_id=scenario_id,
            status="completed",
            message="Story transformed to scenario successfully",
            summary=summary
        )
        
    except Exception as e:
        logger.error(f"Story transformation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transformation failed: {str(e)}"
        )


@router.get("/scenario/{scenario_id}", response_model=ScenarioResponse)
async def get_scenario(
    scenario_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> ScenarioResponse:
    """
    Get scenario by ID.
    
    Args:
        scenario_id: Scenario ID
        user_id: Authenticated user ID
    
    Returns:
        Scenario metadata and summary
    
    Raises:
        HTTPException: If scenario not found
    """
    scenario = load_scenario(scenario_id)
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    
    # Check access rights (for future implementation)
    # if scenario.get("user_id") != user_id:
    #     raise HTTPException(status_code=403, detail="Access denied")
    
    return ScenarioResponse(
        id=scenario_id,
        title=scenario.get("meta", {}).get("titre", "Sans titre"),
        status=scenario.get("status", "unknown"),
        created_at=scenario.get("created_at", ""),
        updated_at=scenario.get("updated_at", ""),
        meta=scenario.get("meta", {}),
        personnages_count=len(scenario.get("personnages", [])),
        lieux_count=len(scenario.get("lieux", [])),
        objets_count=len(scenario.get("objets", [])),
        sequences_count=len(scenario.get("sequences", [])),
        scenes_count=len(scenario.get("scenes", []))
    )


@router.get("/scenario/{scenario_id}/full")
async def get_scenario_full(
    scenario_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Get full scenario data.
    
    Args:
        scenario_id: Scenario ID
        user_id: Authenticated user ID
    
    Returns:
        Complete scenario JSON data
    
    Raises:
        HTTPException: If scenario not found
    """
    scenario = load_scenario(scenario_id)
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    
    return scenario


@router.get("/scenario/{scenario_id}/export", response_model=ScenarioExportResponse)
async def export_scenario(
    scenario_id: str,
    format: ExportFormat = ExportFormat.JSON,
    user_id: str = Depends(verify_jwt_token)
) -> ScenarioExportResponse:
    """
    Export scenario in specified format.
    
    Args:
        scenario_id: Scenario ID
        format: Export format (json, txt, md, html)
        user_id: Authenticated user ID
    
    Returns:
        Exported scenario content
    
    Raises:
        HTTPException: If scenario not found or format not supported
    """
    scenario = load_scenario(scenario_id)
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    
    if format == ExportFormat.JSON:
        content = json.dumps(scenario, ensure_ascii=False, indent=2)
        filename = f"{scenario_id}.json"
    
    elif format == ExportFormat.TEXT:
        content = _export_as_text(scenario)
        filename = f"{scenario_id}.txt"
    
    elif format == ExportFormat.MARKDOWN:
        content = _export_as_markdown(scenario)
        filename = f"{scenario_id}.md"
    
    elif format == ExportFormat.HTML:
        content = _export_as_html(scenario)
        filename = f"{scenario_id}.html"
    
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported export format: {format}"
        )
    
    return ScenarioExportResponse(
        format=format.value,
        content=content,
        filename=filename
    )


@router.delete("/scenario/{scenario_id}")
async def delete_scenario(
    scenario_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Delete scenario by ID.
    
    Args:
        scenario_id: Scenario ID
        user_id: Authenticated user ID
    
    Returns:
        Deletion confirmation
    
    Raises:
        HTTPException: If scenario not found
    """
    scenario = load_scenario(scenario_id)
    
    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    
    # Check ownership
    if scenario.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owner can delete scenario"
        )
    
    scenario_storage.delete(scenario_id)
    
    logger.info(f"Scenario {scenario_id} deleted")
    
    return {"status": "deleted", "scenario_id": scenario_id}


@router.get("/scenario")
async def list_scenarios(
    page: int = 1,
    page_size: int = 20,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    List all scenarios for user.
    
    Args:
        page: Page number
        page_size: Items per page
        user_id: Authenticated user ID
    
    Returns:
        Paginated list of scenarios
    """
    scenarios = [
        {"id": k, **v} for k, v in scenario_storage.cache.items()
        if v.get("user_id") == user_id
    ]
    
    # Sort by created_at
    scenarios.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # Paginate
    total = len(scenarios)
    start = (page - 1) * page_size
    end = start + page_size
    paginated = scenarios[start:end]
    
    return {
        "scenarios": [
            {
                "id": s["id"],
                "title": s.get("meta", {}).get("titre", "Sans titre"),
                "status": s.get("status", "unknown"),
                "created_at": s.get("created_at", ""),
                "scenes_count": len(s.get("scenes", []))
            }
            for s in paginated
        ],
        "total": total,
        "page": page,
        "page_size": page_size
    }


# =============================================================================
# EXPORT HELPERS
# =============================================================================

def _export_as_text(scenario: Dict[str, Any]) -> str:
    """Export scenario as plain text"""
    lines = []
    
    meta = scenario.get("meta", {})
    lines.append(f"=== {meta.get('titre', 'Sans titre')} ===")
    lines.append(f"\n{meta.get('pitch', '')}")
    lines.append(f"\nTheme: {meta.get('theme', '')}")
    lines.append(f"Ton: {meta.get('ton', '')}")
    
    # Characters
    lines.append("\n=== PERSONNAGES ===")
    for char in scenario.get("personnages", []):
        lines.append(f"- {char.get('nom', '')}: {char.get('role', '')}")
    
    # Structure
    lines.append("\n=== STRUCTURE ===")
    for act in ["acte_1", "acte_2", "acte_3"]:
        act_data = scenario.get("structure", {}).get(act, {})
        lines.append(f"\n{act_data.get('titre', act)}:")
        lines.append(f"  {act_data.get('description', '')}")
    
    # Sequences
    lines.append("\n=== SÉQUENCES ===")
    for seq in scenario.get("sequences", []):
        lines.append(f"\n{seq.get('id', '')}. {seq.get('titre', '')}")
        lines.append(f"   {seq.get('resume', '')}")
    
    # Scenes
    lines.append("\n=== SCÈNES ===")
    for scene in scenario.get("scenes", []):
        lines.append(f"\nScène {scene.get('id', '')}: {scene.get('description', '')}")
    
    return "\n".join(lines)


def _export_as_markdown(scenario: Dict[str, Any]) -> str:
    """Export scenario as Markdown"""
    meta = scenario.get("meta", {})
    
    md = f"""# {meta.get('titre', 'Sans titre')}

## Pitch
{meta.get('pitch', '')}

## Informations
- **Thème:** {meta.get('theme', '')}
- **Ton:** {meta.get('ton', '')}
- **Version:** {meta.get('version', '1.0')}

---

## Personnages

| Nom | Rôle | Objectif |
|-----|------|----------|
"""
    for char in scenario.get("personnages", []):
        md += f"| {char.get('nom', '')} | {char.get('role', '')} | {char.get('objectif', '')} |\n"
    
    md += "\n## Structure Narrative\n\n"
    for act in ["acte_1", "acte_2", "acte_3"]:
        act_data = scenario.get("structure", {}).get(act, {})
        md += f"### {act_data.get('titre', act)}\n{act_data.get('description', '')}\n\n"
    
    md += "## Séquences\n\n"
    for seq in scenario.get("sequences", []):
        md += f"### {seq.get('id', '')}. {seq.get('titre', '')}\n"
        md += f"- Lieu: {seq.get('lieu_principal', '')}\n"
        md += f"- Résumé: {seq.get('resume', '')}\n\n"
    
    md += "## Scènes Détaillées\n\n"
    for scene in scenario.get("scenes", []):
        md += f"### Scène {scene.get('id', '')}\n"
        md += f"- **Type:** {scene.get('type', '')}\n"
        md += f"- **Lieu:** {scene.get('lieu', '')}\n"
        md += f"- **Moment:** {scene.get('moment', '')}\n"
        md += f"- **Description:** {scene.get('description', '')}\n\n"
    
    return md


def _export_as_html(scenario: Dict[str, Any]) -> str:
    """Export scenario as HTML"""
    meta = scenario.get("meta", {})
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <title>{meta.get('titre', 'Scenario')}</title>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }}
        h1 {{ color: #333; }}
        h2 {{ color: #666; border-bottom: 1px solid #ccc; }}
        .meta {{ background: #f5f5f5; padding: 15px; border-radius: 5px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background: #f5f5f5; }}
        .scene {{ margin: 20px 0; padding: 15px; border-left: 3px solid #007bff; }}
        .sequence {{ margin: 30px 0; padding: 15px; background: #f9f9f9; }}
    </style>
</head>
<body>
    <h1>{meta.get('titre', 'Sans titre')}</h1>
    <div class="meta">
        <p><strong>Pitch:</strong> {meta.get('pitch', '')}</p>
        <p><strong>Thème:</strong> {meta.get('theme', '')}</p>
        <p><strong>Ton:</strong> {meta.get('ton', '')}</p>
    </div>
    
    <h2>Personnages</h2>
    <table>
        <tr><th>Nom</th><th>Rôle</th><th>Objectif</th></tr>
"""
    for char in scenario.get("personnages", []):
        html += f"        <tr><td>{char.get('nom', '')}</td><td>{char.get('role', '')}</td><td>{char.get('objectif', '')}</td></tr>\n"
    
    html += """    </table>
    
    <h2>Structure Narrative</h2>
"""
    for act in ["acte_1", "acte_2", "acte_3"]:
        act_data = scenario.get("structure", {}).get(act, {})
        html += f"    <h3>{act_data.get('titre', act)}</h3>\n    <p>{act_data.get('description', '')}</p>\n"
    
    html += """
    <h2>Séquences</h2>
"""
    for seq in scenario.get("sequences", []):
        html += f"""    <div class="sequence">
        <h3>{seq.get('id', '')}. {seq.get('titre', '')}</h3>
        <p><strong>Lieu:</strong> {seq.get('lieu_principal', '')}</p>
        <p>{seq.get('resume', '')}</p>
    </div>
"""
    
    html += """
    <h2>Scènes</h2>
"""
    for scene in scenario.get("scenes", []):
        html += f"""    <div class="scene">
        <h3>Scène {scene.get('id', '')}</h3>
        <p><strong>Type:</strong> {scene.get('type', '')} | <strong>Lieu:</strong> {scene.get('lieu', '')} | <strong>Moment:</strong> {scene.get('moment', '')}</p>
        <p>{scene.get('description', '')}</p>
    </div>
"""
    
    html += """
</body>
</html>
"""
    return html

