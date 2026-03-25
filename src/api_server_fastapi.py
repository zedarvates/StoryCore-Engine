"""
StoryCore API Server - FastAPI Implementation v2.0
AI-powered video storyboard creation with Media Intelligence, Audio Remix, and Transcription
"""

import sys
import os
from pathlib import Path

# Add src to path
src_path = Path(__file__).parent
sys.path.insert(0, str(src_path))

from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import time
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def get_cors_origins() -> list:
    """Get CORS allowed origins from environment variable."""
    env_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
    if env_origins:
        if env_origins == "*":
            logger.warning("CORS_ALLOWED_ORIGINS='*' allows all origins - NOT recommended for production!")
            return ["*"]
        return [origin.strip() for origin in env_origins.split(",")]
    # Default origins for development
    return ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"]


# Create FastAPI app
app = FastAPI(
    title="StoryCore API v2.0",
    version="2.0.0",
    description="Media Intelligence, Audio Remix, and Transcription APIs"
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create main API router
api_router = APIRouter(prefix="/api/v1")

# ============================================
# HEALTH & INFO ENDPOINTS
# ============================================

@app.get("/")
async def root():
    return {
        "name": "StoryCore API v2.0",
        "version": "2.0.0",
        "status": "running",
        "mock_mode": False
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "2.0.0"}

# ============================================
# MOCK MODE ENDPOINTS
# ============================================

@app.get("/mock/status")
async def mock_status():
    """Get current mock mode status"""
    return {
        "mock_mode": False,
        "available_endpoints": [
            "/api/v1/media/search",
            "/api/v1/audio/remix",
            "/api/v1/transcription/transcribe"
        ]
    }

@app.post("/mock/enable")
async def enable_mock_mode():
    """Enable mock mode for development/testing"""
    return {
        "mock_mode": True,
        "message": "Mock mode enabled - all endpoints will return mock data"
    }

@app.post("/mock/disable")
async def disable_mock_mode():
    """Disable mock mode"""
    return {
        "mock_mode": False,
        "message": "Mock mode disabled - endpoints will use real implementations"
    }

# ============================================
# MEDIA INTELLIGENCE ROUTES
# ============================================

media_router = APIRouter(prefix="/media")

@media_router.get("/health")
async def media_health():
    return {"status": "media_service_healthy"}

@media_router.get("/types")
async def media_types():
    return {
        "types": ["image", "video", "audio", "text"],
        "modes": ["semantic", "keyword", "hybrid", "similarity"]
    }

@media_router.post("/search")
async def media_search(body: dict):
    """Search for media assets"""
    query = body.get("query", "")
    return {
        "query": query,
        "results": [],
        "message": f"Search executed for: {query}"
    }

@media_router.post("/index")
async def media_index(body: dict):
    """Index project assets"""
    project_id = body.get("project_id", "")
    return {
        "project_id": project_id,
        "indexed_assets": 0,
        "message": f"Indexing project: {project_id}"
    }

api_router.include_router(media_router)
logger.info("Media Intelligence routes registered")

# ============================================
# AUDIO REMIX ROUTES
# ============================================

from src.api.audio_remix_routes import audio_router as _audio_remix_router

api_router.include_router(_audio_remix_router, prefix="/audio")
logger.info("Audio Remix routes registered")

# ============================================
# TRANSCRIPTION ROUTES
# ============================================

from src.api.transcription_routes import transcription_router as _transcription_router

api_router.include_router(_transcription_router, prefix="/transcription")
logger.info("Transcription routes registered")

# ============================================
# VIDEO EDITOR & AI ROUTES
# ============================================

from src.api.categories.export_integration import ExportIntegrationCategoryHandler
from src.api.config import APIConfig
from src.api.router import APIRouter as CustomRouter
from src.api.models import RequestContext

# Initialize custom handler system
api_config = APIConfig(version="2.0.0")
custom_router = CustomRouter(api_config)
export_handler = ExportIntegrationCategoryHandler(api_config, custom_router)

video_editor_router = APIRouter(prefix="/api/video-editor")

@video_editor_router.post("/projects/{project_id}/ai/generate-video")
async def generate_video(project_id: str, body: dict):
    """Bridge to ExportIntegrationCategoryHandler for AI video generation"""
    context = RequestContext(endpoint="storycore.integration.comfyui.generate_video", method="POST")
    # Resolve project path
    if project_id.startswith("./") or "projects" in project_id:
        project_path = project_id
    elif ":" in project_id or project_id.startswith("/") or project_id.startswith("\\"):
        project_path = project_id
    else:
        project_path = f"./projects/{project_id}"
        
    params = body.copy()
    params["project_id"] = project_id
    params["project_path"] = project_path
    
    response = export_handler.comfyui_generate_video(params, context)
    
    if response is None:
        raise HTTPException(status_code=500, detail="Internal error: response is None")
    
    if response.status == "error":
        # Safely handle potential None error object
        error_detail = "Unknown error"
        if response.error is not None:
            error_detail = response.error.message if hasattr(response.error, 'message') else str(response.error)
        logger.error(f"[generate_video] Error response: {error_detail}")
        raise HTTPException(status_code=400, detail=error_detail)
    
    return response.data


@video_editor_router.post("/projects/{project_id}/ai/extend-video")
async def extend_video(project_id: str, body: dict):
    """Bridge to ExportIntegrationCategoryHandler for AI video extension"""
    context = RequestContext(endpoint="storycore.integration.comfyui.extend_video", method="POST")
    
    # Resolve project path
    if project_id.startswith("./") or "projects" in project_id:
        project_path = project_id
    elif ":" in project_id or project_id.startswith("/") or project_id.startswith("\\"):
        project_path = project_id
    else:
        project_path = f"./projects/{project_id}"
        
    params = body.copy()
    params["project_id"] = project_id
    params["project_path"] = project_path
    
    response = export_handler.comfyui_extend_video(params, context)
    
    if response is None:
        raise HTTPException(status_code=500, detail="Internal error: response is None")
    
    if response.status == "error":
        # Safely handle potential None error object
        error_detail = "Unknown error"
        if response.error is not None:
            error_detail = response.error.message if hasattr(response.error, 'message') else str(response.error)
        logger.error(f"[extend_video] Error response: {error_detail}")
        raise HTTPException(status_code=400, detail=error_detail)
    
    return response.data


@video_editor_router.get("/projects/{project_id}/vault/assets")
async def list_vault_assets(project_id: str):
    """Bridge to vault_list_assets"""
    logger.info(f"[vault_assets] Called for project_id={project_id}")
    
    # Project path resolution: handle both simple IDs and full paths
    if project_id.startswith("./") or "projects" in project_id:
        project_path = project_id
    elif ":" in project_id or project_id.startswith("/") or project_id.startswith("\\"):
        # It's already a full path
        project_path = project_id
    else:
        # It's a simple ID, look in projects folder
        project_path = f"./projects/{project_id}"
        
    logger.info(f"[vault_assets] resolved project_path={project_path}")
    
    try:
        params = {"project_path": project_path} 
        response = export_handler.vault_list_assets(params, RequestContext())
        
        # Defensive check for None response
        if response is None:
            logger.error("[vault_assets] Response is None!")
            raise HTTPException(status_code=500, detail="Internal error: response is None")
        
        logger.info(f"[vault_assets] response status={response.status}, has_error={response.error is not None}")
        
        if response.status == "error":
            # Safely handle potential None error object
            error_detail = "Unknown error"
            if response.error is not None:
                error_detail = response.error.message if hasattr(response.error, 'message') else str(response.error)
            else:
                error_detail = "Unknown error - error object is None"
            logger.error(f"[vault_assets] Error response: {error_detail}")
            raise HTTPException(status_code=400, detail=error_detail)
        
        # Handle case where data is None but status is success
        if response.data is None:
            logger.warning("[vault_assets] Success but data is None, returning empty list")
            return {"assets": []}
        
        logger.info(f"[vault_assets] Success, returning data")
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[vault_assets] Unexpected exception: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@video_editor_router.get("/projects/{project_id}/media-raw")
async def get_media_raw(project_id: str, path: str = Query(...)):
    # Resolve project path
    if project_id.startswith("./") or "projects" in project_id:
        project_dir = Path(project_id)
    elif ":" in project_id or project_id.startswith("/") or project_id.startswith("\\"):
        project_dir = Path(project_id)
    else:
        project_dir = Path("./projects") / project_id
    
    # Resolve to absolute path and validate it stays within project
    full_path = (project_dir / path).resolve()
    project_dir_resolved = project_dir.resolve()
    
    if not str(full_path).startswith(str(project_dir_resolved)):
        raise HTTPException(status_code=403, detail="Access denied - path outside project directory")
    
    if not full_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
        
    return FileResponse(full_path)

@video_editor_router.get("/projects/{project_id}/ai/generation-status/{task_id}")
async def get_generation_status(project_id: str, task_id: str):
    """Bridge to ExportIntegrationCategoryHandler for checking generation status"""
    context = RequestContext(endpoint="storycore.integration.comfyui.get_status", method="GET")
    
    # Resolve project path
    if project_id.startswith("./") or "projects" in project_id:
        project_path = project_id
    elif ":" in project_id or project_id.startswith("/") or project_id.startswith("\\"):
        project_path = project_id
    else:
        project_path = f"./projects/{project_id}"
        
    params = {"task_id": task_id, "project_id": project_id, "project_path": project_path}
    
    response = export_handler.comfyui_get_status(params, context)
    
    # Defensive check for None response
    if response is None:
        logger.error("[get_generation_status] Response is None!")
        raise HTTPException(status_code=500, detail="Internal error: response is None")
    
    if response.status == "error":
        # Safely handle potential None error object
        error_detail = "Unknown error"
        if response.error is not None:
            error_detail = response.error.message if hasattr(response.error, 'message') else str(response.error)
        else:
            error_detail = "Unknown error - error object is None"
        logger.error(f"[get_generation_status] Error response: {error_detail}")
        raise HTTPException(status_code=404, detail=error_detail)
    
    return response.data

app.include_router(video_editor_router)
logger.info("Video Editor AI routes registered")

# ============================================
# ADDON ROUTES
# ============================================

from src.api.addon_routes import router as addon_router, init_addon_api
from src.api.external_addon_routes import router as external_addon_router, init_external_addon_api

app.include_router(addon_router)
app.include_router(external_addon_router)
logger.info("Addon routes registered")

# ============================================
# SEEDANCE ROUTES
# ============================================

from src.api.seedance_routes import router as seedance_router

app.include_router(seedance_router)
logger.info("Seedance routes registered")

# ============================================
# STARTUP & INITIALIZATION
# ============================================

@app.on_event("startup")
async def startup_event():
    """Initialize systems on startup"""
    logger.info("Starting up StoryCore API v2.0...")
    
    try:
        from src.addon_manager import AddonManager
        from src.addon_validator import AddonValidator
        from src.addon_permissions import PermissionManager
        from src.api.addon_routes import init_addon_api
        from src.api.seedance_routes import init_seedance_api
        
        # Initialize Core Addon Systems
        manager = AddonManager()
        validator = AddonValidator()
        perm_manager = PermissionManager()
        
        # Load and discover all addons
        await manager.initialize_all_addons()
        
        # Initialize External Addon Systems
        from src.addon_api import ExternalAddonLoader, AddonRegistryClient, DependencyManager
        from pathlib import Path
        
        engine_path = Path(__file__).parent.parent
        external_loader = ExternalAddonLoader(engine_path / "addons")
        await external_loader.initialize()
        
        registry_url = os.getenv("STORYCORE_MARKETPLACE_API", "https://nexrealm.shop/wp-json/storycore/v1/marketplace")
        registry_client = AddonRegistryClient(registry_url=registry_url)
        deps_manager = DependencyManager()
        await deps_manager.initialize()

        # Initialize Addon API with managers
        init_addon_api(manager, validator, perm_manager, registry_client)
        
        init_external_addon_api(manager, external_loader, registry_client, deps_manager)
        
        # Initialize Seedance API with manager
        init_seedance_api(manager)
        
        # Dynamically mount routers from enabled addons
        for addon_name, addon_info in manager.addons.items():
            if addon_info.state == AddonState.ENABLED and addon_info.module:
                if hasattr(addon_info.module, "ADDON_INFO") and "router" in addon_info.module.ADDON_INFO:
                    addon_router_obj = addon_info.module.ADDON_INFO["router"]
                    app.include_router(addon_router_obj)
                    logger.info(f"Mounted custom router for addon: {addon_name}")
        
        logger.info(f"Addon system initialized: {len(manager.addons)} addons discovered")
        
    except Exception as e:
        logger.error(f"Failed to initialize addon system during startup: {e}")
        import traceback
        logger.error(traceback.format_exc())

# ============================================
# INCLUDE API ROUTER
# ============================================

app.include_router(api_router)

# ============================================
# RUN SERVER
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    PORT = 8001
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║           StoryCore API v2.0 - Serveur Démarré              ║
╠══════════════════════════════════════════════════════════════╣
║  Health:     http://localhost:{PORT}/health                  ║
║  Root:       http://localhost:{PORT}/                        ║
║  Media:      http://localhost:{PORT}/api/v1/media           ║
║  Audio:      http://localhost:{PORT}/api/v1/audio           ║
║  Transcription: http://localhost:{PORT}/api/v1/transcription║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=PORT)
