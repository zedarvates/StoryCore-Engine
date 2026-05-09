from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from backend.hermes_novelist_service import hermes_novelist_service
import logging

router = APIRouter(prefix="/hermes-novelist", tags=["Hermes Novelist"])
logger = logging.getLogger(__name__)

class ProjectCreate(BaseModel):
    seed: str
    title: Optional[str] = "Untitled Novel"
    methodology: Optional[str] = "3_act_structure"

class ChapterDraftRequest(BaseModel):
    chapter_index: int

@router.get("/projects")
async def list_projects():
    return hermes_novelist_service.list_projects()

@router.post("/projects")
async def create_project(req: ProjectCreate):
    project_id = await hermes_novelist_service.create_project(req.seed, req.title, req.methodology)
    return {"project_id": project_id}

@router.get("/projects/{project_id}")
async def get_project(project_id: str):
    project = hermes_novelist_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.post("/projects/{project_id}/foundation")
async def run_foundation(project_id: str):
    result = await hermes_novelist_service.run_foundation(project_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.post("/projects/{project_id}/chapters")
async def draft_chapter(project_id: str, req: ChapterDraftRequest):
    result = await hermes_novelist_service.draft_chapter(project_id, req.chapter_index)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.post("/projects/{project_id}/chapters/{chapter_index}/revise")
async def revise_chapter(project_id: str, chapter_index: int):
    result = await hermes_novelist_service.revise_chapter(project_id, chapter_index)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.post("/projects/{project_id}/export")
async def export_novel(project_id: str):
    result = await hermes_novelist_service.export_novel(project_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.post("/projects/{project_id}/extract-assets")
async def extract_assets(project_id: str):
    result = await hermes_novelist_service.extract_structured_assets(project_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/projects/{project_id}/chapters/{chapter_index}/visualize")
async def visualize_chapter(project_id: str, chapter_index: int):
    result = await hermes_novelist_service.visualize_chapter(project_id, chapter_index)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/projects/{project_id}/chapters/{chapter_index}/generate-clips")
async def generate_clips(project_id: str, chapter_index: int):
    result = await hermes_novelist_service.generate_video_clips(project_id, chapter_index)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/projects/{project_id}/chapters/{chapter_index}/clips-status")
async def get_clips_status(project_id: str, chapter_index: int):
    result = await hermes_novelist_service.get_clips_status(project_id, chapter_index)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/projects/{project_id}/questions/{question_id}/answer")
async def answer_question(project_id: str, question_id: str, answer: str):
    result = await hermes_novelist_service.answer_question(project_id, question_id, answer)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
