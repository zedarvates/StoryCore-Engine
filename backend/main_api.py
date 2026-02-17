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
from backend.scenario_api import router as scenario_router
from backend.lip_sync_api import router as lip_sync_router

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
    
    # Create required directories
    directories = [
        "./data",
        "./data/shots",
        "./data/jobs",
        "./data/audio",
        "./data/camera_angle_jobs",
        "./projects",
        "./output",
        "./output/lip_sync",
        "./output/frames"
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"Ensured directory exists: {directory}")
    
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
            "camera-angle": "/api/camera-angle",
            "video-editor": "/api/video-editor"
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
app.include_router(scenario_router, prefix="/api")
app.include_router(lip_sync_router, prefix="/api")
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

# Include cine production API router
from backend.cine_production_api import router as cine_production_router
app.include_router(cine_production_router, prefix="/api")

# Include post production API router
from backend.post_production_api import router as post_production_router
app.include_router(post_production_router, prefix="/api")

# Include video editor API router
from backend.video_editor_api import VIDEO_EDITOR_ROUTER
app.include_router(VIDEO_EDITOR_ROUTER)

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
    
    uvicorn.run(
        "backend.main_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

