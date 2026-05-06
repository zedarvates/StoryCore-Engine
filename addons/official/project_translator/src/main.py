import logging
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from .translator import TranslatorEngine

logger = logging.getLogger(__name__)

# ============================================================================
# Models
# ============================================================================


class TranslationRequest(BaseModel):
    project_id: str
    project_data: Dict[str, Any]
    target_lang: str
    translation_model: str = "llama3"
    embedding_model: Optional[str] = None


class TranslationStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: float
    message: str


# ============================================================================
# State / Globals
# ============================================================================

_engine: Optional[TranslatorEngine] = None
_tasks: Dict[str, Dict[str, Any]] = {}


def get_engine() -> TranslatorEngine:
    global _engine
    if _engine is None:
        _engine = TranslatorEngine()
    return _engine


# ============================================================================
# Router
# ============================================================================

router = APIRouter(tags=["Project Translator"])


@router.get("/status")
async def get_status():
    """Health check et config de l'addon."""
    engine = get_engine()
    return {
        "addon": "project_translator",
        "version": "1.0.0",
        "status": "active",
        "ollama_url": engine.ollama_url,
        "models": {
            "translation": engine.translation_model,
            "embedding": engine.embedding_model,
        },
    }


@router.post("/translate")
async def translate_project(req: TranslationRequest, background_tasks: BackgroundTasks):
    """
    Lance la traduction d'un projet complet.
    Ceci est une opération lourde qui peut prendre du temps.
    """
    engine = get_engine()
    engine.translation_model = req.translation_model
    if req.embedding_model:
        engine.embedding_model = req.embedding_model

    task_id = f"tr_{req.project_id}_{int(hash(req.target_lang) % 10000)}"

    _tasks[task_id] = {
        "status": "processing",
        "progress": 0.0,
        "message": f"Démarrage de la traduction vers {req.target_lang}...",
        "result": None,
    }

    async def run_translation():
        try:
            # Pour l'instant on fait un appel direct,
            # mais on pourrait découper en étapes pour mettre à jour le progress
            _tasks[task_id]["message"] = "Analyse et traduction du projet..."
            translated_data = await engine.translate_project(
                req.project_data, req.target_lang
            )

            _tasks[task_id]["status"] = "completed"
            _tasks[task_id]["progress"] = 1.0
            _tasks[task_id]["message"] = "Traduction terminée avec succès."
            _tasks[task_id]["result"] = translated_data

        except Exception as e:
            logger.error(f"Translation Task Error: {e}")
            _tasks[task_id]["status"] = "error"
            _tasks[task_id]["message"] = f"Erreur : {str(e)}"

    background_tasks.add_task(run_translation)

    return {
        "success": True,
        "task_id": task_id,
        "message": "Traduction lancée en arrière-plan.",
    }


@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """Récupère l'état d'une tâche de traduction."""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    return _tasks[task_id]


# ============================================================================
# Metadata
# ============================================================================

ADDON_INFO = {
    "name": "project_translator",
    "display_name": "Project Translator",
    "version": "1.0.0",
    "router": router,
}
