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
    # Pass project_id in params
    params = body.copy()
    params["project_id"] = project_id
    
    response = export_handler.comfyui_generate_video(params, context)
    
    if response.status == "error":
        raise HTTPException(status_code=400, detail=response.error.message)
    
    return response.data

@video_editor_router.get("/projects/{project_id}/vault/assets")
async def list_vault_assets(project_id: str):
    """Bridge to vault_list_assets"""
    # Simple project path resolution for now
    params = {"project_path": f"./projects/{project_id}"} 
    return export_handler.vault_list_assets(params, RequestContext())

@video_editor_router.get("/projects/{project_id}/media-raw")
async def get_media_raw(project_id: str, path: str = Query(...)):
    """Serve a raw media file from the project directory"""
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
    params = {"task_id": task_id, "project_id": project_id}
    
    response = export_handler.comfyui_get_status(params, context)
    
    if response.status == "error":
        raise HTTPException(status_code=404, detail=response.error.message)
    
    return response.data

app.include_router(video_editor_router)
logger.info("Video Editor AI routes registered")

# ============================================
# ADDON ROUTES
# ============================================

from src.api.addon_routes import router as addon_router
from src.api.external_addon_routes import router as external_addon_router

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
        
        # Initialize Addon API with managers
        init_addon_api(manager, validator, perm_manager)
        
        # Initialize External Addon API
        from src.addon_api import ExternalAddonLoader, AddonRegistryClient, DependencyManager
        from pathlib import Path
        
        engine_path = Path(__file__).parent.parent
        external_loader = ExternalAddonLoader(engine_path / "addons")
        await external_loader.initialize()
        
        registry_client = AddonRegistryClient()
        deps_manager = DependencyManager()
        await deps_manager.initialize()
        
        init_external_addon_api(manager, external_loader, registry_client, deps_manager)
        
        # Initialize Seedance API with manager
        # It will try to find the "Seedance 2.0" addon from the manager
        init_seedance_api(manager)
        
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
