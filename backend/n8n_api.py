from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
from pathlib import Path
import json
from pydantic import BaseModel
from backend.n8n_service import get_n8n_service, N8nService
from backend.auth import verify_jwt_token

router = APIRouter(
    prefix="/n8n",
    tags=["n8n-management"],
    responses={404: {"description": "Not found"}}
)

@router.get("/status")
async def get_status(n8n: N8nService = Depends(get_n8n_service)):
    """Check connection status with n8n."""
    return await n8n.check_status()

@router.get("/workflows")
async def list_workflows(
    n8n: N8nService = Depends(get_n8n_service),
    # user_id: str = Depends(verify_jwt_token) # Optionnel selon la sécurité souhaitée
):
    """List available n8n workflows."""
    workflows = await n8n.list_workflows()
    return {"workflows": workflows}

@router.post("/trigger/{webhook_id}")
async def trigger_workflow(
    webhook_id: str,
    payload: Dict[str, Any],
    n8n: N8nService = Depends(get_n8n_service)
):
    """Trigger an n8n workflow via its webhook ID."""
    result = await n8n.trigger_workflow(webhook_id, payload)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

@router.post("/workflows")
async def create_workflow(
    payload: Dict[str, Any],
    n8n: N8nService = Depends(get_n8n_service)
):
    """Create a new n8n workflow."""
    name = payload.get("name")
    nodes = payload.get("nodes")
    connections = payload.get("connections")
    
    if not name or not nodes or not connections:
        raise HTTPException(status_code=400, detail="Missing name, nodes or connections")
        
    result = await n8n.create_workflow(name, nodes, connections)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["error"])
    return result

# ==================== N8N TEMPLATE ENDPOINTS ====================

class N8nTemplateInfo(BaseModel):
    name: str
    filename: str
    description: Optional[str] = None
    tags: List[str] = []

@router.get("/templates", response_model=List[N8nTemplateInfo])
async def list_n8n_templates():
    """
    List available n8n workflow templates from local storage.
    """
    template_dir = Path("workflows/n8n")
    if not template_dir.exists():
        return []
    
    templates = []
    # Use glob to find json files and sort them
    json_files = sorted(list(template_dir.glob("*.json")))
    for p in json_files:
        try:
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
                templates.append(N8nTemplateInfo(
                    name=data.get("name", p.stem),
                    filename=p.name,
                    description=data.get("notes", ""),
                    tags=data.get("tags", [])
                ))
        except Exception as e:
            # We don't have logger here, using print or ignoring
            pass
            
    return templates

@router.post("/templates/import/{filename}")
async def import_n8n_template(
    filename: str,
    n8n: N8nService = Depends(get_n8n_service)
):
    """
    Import a local n8n template into the active n8n instance.
    """
    template_path = Path("workflows/n8n") / filename
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Template not found")
    
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            workflow_data = json.load(f)
            
        # Create workflow in n8n
        name = workflow_data.get("name", f"Imported {filename}")
        nodes = workflow_data.get("nodes", [])
        connections = workflow_data.get("connections", {})
        
        result = await n8n.create_workflow(name, nodes, connections)
        if not result["success"]:
            raise HTTPException(status_code=500, detail=result["error"])
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
