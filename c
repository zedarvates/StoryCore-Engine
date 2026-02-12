"""
StoryCore API Server - FastAPI Implementation
Provides REST endpoints for StoryCore-Engine dashboard functionality.

Features:
- Media Intelligence API
- Audio Remix API
- Transcription API

Author: StoryCore-Engine Team
Date: 2026-01-23
"""

import sys
from pathlib import Path

# Add src to path for imports
src_path = Path(__file__).parent
sys.path.insert(0, str(src_path))

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create FastAPI application instance
app = FastAPI(
    title="StoryCore API",
    version="2.0.0",
    description="AI-powered video storyboard creation with Media Intelligence, Audio Remix, and Transcription"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API version router
v1_router = APIRouter(prefix="/v1")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Global health check."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "timestamp": time.time()
    }

@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "StoryCore API",
        "version": "2.0.0",
        "endpoints": {
            "health": "/health",
            "media": "/api/v1/media",
            "audio": "/api/v1/audio",
            "transcription": "/api/v1/transcription"
        }
    }

# Import and include routers with error handling
def include_routers():
    """Include API routers with proper error handling."""
    
    # Media Intelligence Router
    try:
        from api.media_routes import media_router
        v1_router.include_router(media_router, prefix="/media", tags=["Media Intelligence"])
        logger.info("Media Intelligence routes loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load Media Intelligence routes: {e}")
    
    # Audio Remix Router
    try:
        from api.audio_remix_routes import audio_router
        v1_router.include_router(audio_router, prefix="/audio", tags=["Audio Remix"])
        logger.info("Audio Remix routes loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load Audio Remix routes: {e}")
    
    # Transcription Router
    try:
        from api.transcription_routes import transcription_router
        v1_router.include_router(transcription_router, prefix="/transcription", tags=["Transcription"])
        logger.info("Transcription routes loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load Transcription routes: {e}")

# Include routers
include_routers()

# Include v1 router in app
app.include_router(v1_router)

# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global error handler."""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if sys.debug else "An unexpected error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or use default
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    
    print(f"🚀 Starting StoryCore API Server v2.0.0")
    print(f"   Health check: http://localhost:{port}/health")
    print(f"   API docs: http://localhost:{port}/docs")
    print(f"   Media Intelligence: http://localhost:{port}/api/v1/media")
    print(f"   Audio Remix: http://localhost:{port}/api/v1/audio")
    print(f"   Transcription: http://localhost:{port}/api/v1/transcription")
    
    uvicorn.run(app, host="0.0.0.0", port=port)
