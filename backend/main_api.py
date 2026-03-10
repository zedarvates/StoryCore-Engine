"""
StoryCore-Engine Main API Server

This module provides the main FastAPI application that integrates all backend APIs.
Consolidates project, shot, sequence, audio, and LLM APIs into a single server.

Requirements: Q1 2026 - Backend API Integration
"""

import os
import sys
import logging
import traceback
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import centralized configuration
from backend.config import settings

# Import API routers
from backend.project_api import router as project_router
from backend.shot_api import router as shot_router
from backend.sequence_api import router as sequence_router
from backend.audio_api import router as audio_router
from backend.llm_api import router as llm_router
from backend.mvp_endpoints import router as mvp_router
from backend.scenario_api import router as scenario_router
from backend.lip_sync_api import router as lip_sync_router
from backend.ttt_lrm_api import router as ttt_lrm_router
from backend.story_generation_api import router as story_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup
    logger.info("Starting StoryCore-Engine API Server")
    
    # Start AsyncTaskQueue for advanced task management
    try:
        from src.async_task_queue import get_async_task_queue
        queue = get_async_task_queue()
        queue.start()
        logger.info("AsyncTaskQueue started successfully")
    except ImportError:
        logger.warning("AsyncTaskQueue not available, using basic background tasks")
    except Exception as e:
        logger.error(f"Failed to start AsyncTaskQueue: {e}")
    
    # Create required directories
    directories = [
        "./data",
        "./data/shots",
        "./data/jobs",
        "./data/audio",
        "./data/camera_angle_jobs",
        "./data/identities",  # Identity Lock storage
        "./data/segments",  # Script Segmentation storage
        "./data/assets/comics",  # Comic Generator output
        "./data/assets/recaps",   # Recap Engine output
        "./data/prompt_templates",  # Prompt Templates storage
        "./projects",
        "./output",
        "./output/pro",  # AI Pro output storage
        "./output/lip_sync",
        "./output/frames"
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"Ensured directory exists: {directory}")

    # 💎 GemReward: Migration des tables DB au démarrage
    try:
        from backend.gem_migration import run_gem_migration
        await run_gem_migration()
    except Exception as e:
        logger.warning(f"GemReward migration skipped: {e} (non-fatal, running in mock mode)")

    yield
    
    # Shutdown
    logger.info("Shutting down StoryCore-Engine API Server")


# Create FastAPI application
app = FastAPI(
    title="StoryCore-Engine API",
    description="Backend API for StoryCore Creative Studio Engine",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Default CORS origins for development - use centralized config
DEFAULT_CORS_ORIGINS = settings.get_cors_origins_list()


def get_cors_origins() -> list:
    """
    Get CORS allowed origins from environment variable or defaults.
    
    Security Fix: In production environment, localhost origins are not allowed
    unless explicitly configured. This prevents accidental exposure of the API
    to local development origins in production deployments.
    
    Environment Variables:
        CORS_ALLOWED_ORIGINS: Comma-separated list of allowed origins
        ENVIRONMENT: Set to "production" to enforce production CORS rules
    """
    env_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
    environment = os.getenv("ENVIRONMENT", "development").lower()
    is_production = environment in ("production", "prod", "live")
    
    if env_origins:
        if env_origins == "*":
            if is_production:
                logger.error("CORS_ALLOWED_ORIGINS='*' is NOT allowed in production! Using empty origins.")
                return []
            logger.warning("CORS_ALLOWED_ORIGINS='*' allows all origins - NOT recommended for production!")
            return ["*"]
        # Parse comma-separated list
        origins = [origin.strip() for origin in env_origins.split(",")]
        logger.info(f"CORS origins configured from environment: {origins}")
        return origins
    
    # Security Fix: In production, don't allow localhost origins by default
    if is_production:
        logger.warning("No CORS_ALLOWED_ORIGINS configured in production environment. "
                      "API will not be accessible from browsers.")
        return []
    
    # Return default origins for development only
    logger.info(f"Using default development CORS origins: {DEFAULT_CORS_ORIGINS}")
    return DEFAULT_CORS_ORIGINS


# Configure CORS with secure defaults
cors_origins = get_cors_origins()
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"CORS configured with origins: {cors_origins}")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "StoryCore-Engine API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


# API version info
@app.get("/api")
async def api_info():
    """API information endpoint"""
    return {
        "name": "StoryCore-Engine API",
        "version": "1.0.0",
        "description": "Backend API for StoryCore Creative Studio Engine",
        "endpoints": {
            "projects": "/api/projects",
            "shots": "/api/shots",
            "sequences": "/api/sequences",
            "audio": "/api/audio",
            "llm": "/api/llm",
            "locations": "/api/locations",
            "camera-angle": "/api/camera-angle",
            "video-editor": "/api/video-editor",
            "identity": "/api/identity",
            "segment": "/api/segment",
            "prompt-templates": "/api/prompt-templates",
            "ai-pro": "/api/ai/pro",
            "ai-workflow": "/api/ai/workflow",
            "comic-generator": "/api/addons/comic_generator",
            "recap-engine": "/api/addons/recap_engine",
            "ltx": "/api/ltx",
            "director": "/api/director"
        },
        "documentation": {
            "swagger": "/docs",
            "redoc": "/redoc"
        }
    }


# Include API routers
app.include_router(project_router, prefix="/api")
app.include_router(shot_router, prefix="/api")
app.include_router(sequence_router, prefix="/api")
app.include_router(audio_router, prefix="/api")
app.include_router(llm_router, prefix="/api")
app.include_router(mvp_router, prefix="/api/mvp")
app.include_router(scenario_router, prefix="/api")
app.include_router(lip_sync_router, prefix="/api")
app.include_router(story_router)
# Include rigging API router
from backend.rigging_api import router as rigging_router
app.include_router(rigging_router, prefix="/api")
# Include task queue API router
from backend.task_queue_api import router as task_queue_router
app.include_router(task_queue_router, prefix="/api")
# Include location logic loop API router
from backend.location_logic_loop_api import router as location_logic_loop_router
app.include_router(location_logic_loop_router, prefix="/api")
# Include camera angle API router
from backend.camera_angle_api import router as camera_angle_router
app.include_router(camera_angle_router, prefix="/api")

# Include location API router (already has prefix="/api/locations" in the router)
from backend.location_api import router as location_router
app.include_router(location_router)

# Include cine production API router
from backend.cine_production_api import router as cine_production_router
app.include_router(cine_production_router, prefix="/api")

# Include post production API router
from backend.post_production_api import router as post_production_router
app.include_router(post_production_router, prefix="/api")

# Include video editor API router
from backend.video_editor_api import VIDEO_EDITOR_ROUTER
app.include_router(VIDEO_EDITOR_ROUTER)

# Include Identity Lock API router (for character visual consistency)
from backend.identity_lock_api import router as identity_lock_router
app.include_router(identity_lock_router, prefix="/api")

# Include Script Segmenter API router (for intelligent script segmentation)
from backend.script_segmenter_api import router as script_segmenter_router
app.include_router(script_segmenter_router, prefix="/api")

# Include Prompt Template API router (for optimized prompt management)
from backend.prompt_template_api import router as prompt_template_router
app.include_router(prompt_template_router)

# Include Automation API router
from backend.automation_endpoints import router as automation_router
app.include_router(automation_router)

# Include AI Audio API router (Beat Detection, Voice Isolation, Auto-Ducking, etc.)
from backend.ai_audio_api import router as ai_audio_router
app.include_router(ai_audio_router)

# Include AI Video API router (Smart Crop, Multi-Angle, Character Consistency, etc.)
from backend.ai_video_api import router as ai_video_router
app.include_router(ai_video_router)

# Include AI Creative API router (Animation Presets, Music Remix, Pose Interpolation, etc.)
from backend.ai_creative_api import router as ai_creative_router
app.include_router(ai_creative_router)

# Include AI Advanced API router (Magic Mask, Depth Map, Bloom, Subtitles, Background Replacement)
from backend.ai_advanced_api import router as ai_advanced_router
app.include_router(ai_advanced_router)

# Include AI Performance API router (Job Progress, Cache, Batch Processing, Job Queue)
from backend.ai_performance_api import router as ai_performance_router
app.include_router(ai_performance_router)

# Include High-Impact Experimental AI features (Skin Enhancer, SFX, LADI-VTON, OOTD)
try:
    from backend.high_impact_api import router as high_impact_router
    app.include_router(high_impact_router)
    logger.info("Experimental High-Impact Features registered at /api/v1/experimental")
except ImportError as e:
    logger.warning(f"Could not load high_impact_api: {e}")

# Include tttLRM 3D Reconstruction API router
app.include_router(ttt_lrm_router)

# Include CLI API router
from backend.cli_api import router as cli_router
app.include_router(cli_router, prefix="/api")

# ─── 💎 GemReward System ─────────────────────────────────────────────────────
# Router Gems API (balance, history, stats, leaderboard, tiers)
try:
    from backend.gem_api import router as gem_router
    from backend.gem_api import agent_keys_router, report_router as gem_report_router
    app.include_router(gem_router)
    app.include_router(agent_keys_router)
    app.include_router(gem_report_router)
    logger.info("💎 GemReward API registered: /api/gems, /api/agent-keys, /api/v1/report/check-dup")
except ImportError as e:
    logger.warning(f"GemReward API not available: {e}")

# Router Webhook GitHub (réception des labels gem-awarded, duplicate, etc.)
try:
    from backend.webhook_api import router as webhook_router
    app.include_router(webhook_router)
    logger.info("💎 GemReward Webhook registered: /api/webhooks/github")
except ImportError as e:
    logger.warning(f"GemReward Webhook not available: {e}")

# Router Temps Réel (Notifications WebSockets pour GemWallet, progrès, etc.)
try:
    from backend.realtime_api import router as realtime_router
    app.include_router(realtime_router)
    logger.info("📡 Real-time WebSocket API registered at /ws")
except ImportError as e:
    logger.warning(f"Real-time API not available: {e}")

# ─────────────────────────────────────────────────────────────────────────────

# Include AI Pro API router (Color Grading, Speed Ramping, Scene Detection, etc.)
try:
    from backend.ai_pro_api import router as ai_pro_router
    app.include_router(ai_pro_router, prefix="/api")
    logger.info("AI Pro API Router registered at /api/ai/pro")
except ImportError as e:
    logger.warning(f"Could not load ai_pro_api: {e}")

# Include AI Workflow Orchestrator API router (Phase 11: Complex Pipeline Chaining)
try:
    from backend.ai_workflow_api import router as ai_workflow_router
    app.include_router(ai_workflow_router, prefix="/api")
    logger.info("AI Workflow API Router registered at /api/ai/workflow")
except ImportError as e:
    logger.warning(f"Could not load ai_workflow_api: {e}")

# Include LTX 2.3 Video API router
try:
    from backend.ltx_api import LTX_ROUTER
    app.include_router(LTX_ROUTER)
    logger.info("LTX 2.3 Video API Router registered at /api/ltx")
except ImportError as e:
    logger.warning(f"Could not load ltx_api: {e}")

# Include Director API router (Nano Banana 2)
try:
    from backend.director_api import DIRECTOR_ROUTER
    app.include_router(DIRECTOR_ROUTER)
    logger.info("Director API (Nano Banana 2) Router registered at /api/director")
except ImportError as e:
    logger.warning(f"Could not load director_api: {e}")

# Include Comic Generator addon router
try:
    from addons.official.comic_generator.src.main import router as comic_generator_router
    app.include_router(comic_generator_router, prefix="/api/addons/comic_generator")
    logger.info("[Comic Generator] Router registered at /api/addons/comic_generator")
except ImportError as e:
    logger.warning(f"[Comic Generator] Could not load router (dependencies may be missing): {e}")
except Exception as e:
    logger.warning(f"[Comic Generator] Router registration skipped: {e}")

# Include Recap Engine addon router
try:
    from addons.official.recap_engine.src.main import router as recap_engine_router
    if recap_engine_router is not None:
        app.include_router(recap_engine_router, prefix="/api/addons/recap_engine")
        logger.info("[Recap Engine] Router registered at /api/addons/recap_engine")
except ImportError as e:
    logger.warning(f"[Recap Engine] Could not load router (dependencies may be missing): {e}")
except Exception as e:
    logger.warning(f"[Recap Engine] Router registration skipped: {e}")

# Include Credits Screen addon router
try:
    from addons.official.credits_screen.src.main import router as credits_screen_router
    if credits_screen_router is not None:
        app.include_router(credits_screen_router) # Prefix already defined in router
        logger.info("[Credits Screen] Router registered at /api/addons/credits_screen")
except ImportError as e:
    logger.warning(f"[Recap Engine] Could not load router (dependencies may be missing): {e}")
except Exception as e:
    logger.warning(f"[Recap Engine] Router registration skipped: {e}")

# Include Project Translator addon router
try:
    from addons.official.project_translator.src.main import router as project_translator_router
    if project_translator_router is not None:
        app.include_router(project_translator_router, prefix="/api/addons/project_translator")
        logger.info("[Project Translator] Router registered at /api/addons/project_translator")
except ImportError as e:
    logger.warning(f"[Project Translator] Could not load router (dependencies may be missing): {e}")
except Exception as e:
    logger.warning(f"[Project Translator] Router registration skipped: {e}")

# Include Character Image API router
try:
    from backend.character_image_api import router as character_image_router
    app.include_router(character_image_router, prefix="/api")
    logger.info("Character Image API Router registered at /api")
except ImportError as e:
    logger.warning(f"Could not load character_image_api: {e}")

# Include Character Logic/AI API router
try:
    from backend.character_api import router as character_api_router
    app.include_router(character_api_router)
    logger.info("Character AI API Router registered at /api/characters")
except ImportError as e:
    logger.warning(f"Could not load character_api: {e}")

# Include Location and Object Image API router
try:
    from backend.location_object_api import router as location_object_router
    app.include_router(location_object_router, prefix="/api")
    logger.info("Location and Object Image API Router registered at /api")
except ImportError as e:
    logger.warning(f"Could not load location_object_api: {e}")

# Mount static files for output
app.mount("/output", StaticFiles(directory="output"), name="output")


# Exception handlers
# Security Fix: Determine debug mode from environment for stack trace handling
DEBUG_MODE = os.getenv("DEBUG", "false").lower() == "true"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT in ("production", "prod", "live")


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler.
    
    Security Fix: Stack traces are only exposed in debug mode (DEBUG=true).
    In production, only a generic error message is returned to prevent
    leaking implementation details that could aid attackers.
    """
    # Always log the full error with traceback for debugging
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # In production, never expose error details or stack traces
    if IS_PRODUCTION or not DEBUG_MODE:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": "An unexpected error occurred. Please try again later."
            }
        )
    
    # In development/debug mode, provide detailed error information
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "traceback": traceback.format_exc(),
            "type": type(exc).__name__
        }
    )


if __name__ == "__main__":
    import uvicorn
    
    # MIGRATION NOTE: Default port changed from 8001 to 8080
    # This aligns with standard HTTP port conventions (8080 = HTTP alt)
    # and avoids conflicts with common development services.
    # Override with environment variable: PORT=8001 python -m backend.main_api
    uvicorn.run(
        "backend.main_api:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        reload_dirs=["backend", "src"],
        log_level="info"
    )
