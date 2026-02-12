"""
StoryCore-Engine Main API Server

This module provides the main FastAPI application that integrates all backend APIs.
Consolidates project, shot, sequence, audio, and LLM APIs into a single server.

Requirements: Q1 2026 - Backend API Integration
"""

import os
import sys
import logging
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import API routers
from backend.project_api import router as project_router
from backend.shot_api import router as shot_router
from backend.sequence_api import router as sequence_router
from backend.audio_api import router as audio_router
from backend.llm_api import router as llm_router
from backend.scenario_api import router as scenario_router

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
        "./projects"
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

# Default CORS origins for development
DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]


def get_cors_origins() -> list:
    """
    Get CORS allowed origins from environment variable or defaults.
    
    Environment variable CORS_ALLOWED_ORIGINS can contain comma-separated origins.
    Set to "*" to allow all origins (NOT recommended for production).
    """
    env_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
    
    if env_origins:
        if env_origins == "*":
            logger.warning("CORS_ALLOWED_ORIGINS='*' allows all origins - NOT recommended for production!")
            return ["*"]
        # Parse comma-separated list
        return [origin.strip() for origin in env_origins.split(",")]
    
    # Return default origins for development
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
            "llm": "/api/llm"
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
# Include rigging API router
from backend.rigging_api import router as rigging_router
app.include_router(rigging_router, prefix="/api")


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if os.getenv("DEBUG") else "An unexpected error occurred"
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

