"""
FastAPI application for StoryCore AI Assistant.

Provides RESTful API endpoints for project generation, management, and modification.
Includes authentication, rate limiting, and usage tracking middleware.
"""

from fastapi import FastAPI, Depends, HTTPException, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
from pathlib import Path
import time
import os

from ..storycore_assistant import StoryCoreAssistant, ProjectPreview
from ..auth import AuthenticationMiddleware, UserService, User
from ..rate_limiter import RateLimiter, RateLimitExceededError
from ..usage_tracker import UsageTracker
from ..exceptions import (
    AssistantError, AuthenticationError, AuthorizationError,
    ValidationError, ResourceError, ProjectError, StorageLimitExceededError
)
from ..logging_config import get_logger
from .models import *
from .dependencies import set_auth_middleware, get_current_user

logger = get_logger(__name__)

# Initialize FastAPI app with comprehensive OpenAPI metadata
app = FastAPI(
    title="StoryCore AI Assistant API",
    description="""
    ## Natural Language Interface for StoryCore Project Generation
    
    The StoryCore AI Assistant API provides a RESTful interface for creating, managing, 
    and modifying StoryCore projects through natural language commands.
    
    ### Key Features
    
    * **Natural Language Project Generation**: Create complete projects from creative prompts
    * **Secure Authentication**: JWT-based authentication with token refresh
    * **Rate Limiting**: Fair usage enforcement (100 requests/minute)
    * **Project Management**: Open, close, list, and delete projects
    * **Project Modifications**: Update scenes, characters, and sequences
    * **Storage Monitoring**: Track storage usage and enforce limits
    * **Usage Analytics**: Detailed API usage statistics
    
    ### Getting Started
    
    1. **Authenticate**: POST to `/auth/login` with credentials
    2. **Generate Project**: POST to `/generate/project` with a creative prompt
    3. **Finalize Project**: POST to `/generate/finalize` to save the project
    4. **Manage Projects**: Use project management endpoints to open and modify
    
    ### Rate Limiting
    
    All endpoints are rate limited to 100 requests per minute per user. 
    Rate limit information is included in response headers:
    
    * `X-RateLimit-Limit`: Maximum requests allowed
    * `X-RateLimit-Remaining`: Requests remaining in current window
    * `X-RateLimit-Reset`: Unix timestamp when limit resets
    
    ### Authentication
    
    Most endpoints require authentication. Include your access token in the Authorization header:
    
    ```
    Authorization: Bearer <your_access_token>
    ```
    
    Access tokens expire after 1 hour. Use the `/auth/refresh` endpoint to obtain a new token.
    
    ### Documentation
    
    * [Complete API Documentation](../docs/API_DOCUMENTATION.md)
    * [Authentication Guide](../docs/AUTHENTICATION_GUIDE.md)
    * [Rate Limiting Guide](../docs/RATE_LIMITING_GUIDE.md)
    """,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    contact={
        "name": "StoryCore Support",
        "url": "https://github.com/your-org/storycore-engine",
        "email": "support@storycore.example.com"
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT"
    },
    terms_of_service="https://storycore.example.com/terms",
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "JWT-based authentication and token management"
        },
        {
            "name": "Generation",
            "description": "Natural language project generation from creative prompts"
        },
        {
            "name": "Projects",
            "description": "Project management operations (open, close, list, delete)"
        },
        {
            "name": "Modifications",
            "description": "Modify project elements (scenes, characters, sequences)"
        },
        {
            "name": "Storage",
            "description": "Storage monitoring and usage statistics"
        }
    ]
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
PROJECT_DIR = Path(os.getenv("STORYCORE_PROJECT_DIR", Path.home() / "Documents" / "StoryCore Projects"))
SECRET_KEY = os.getenv("STORYCORE_SECRET_KEY", "dev-secret-key-change-in-production")

auth_middleware = AuthenticationMiddleware(secret_key=SECRET_KEY)
user_service = UserService()
rate_limiter = RateLimiter(max_requests=100, window_seconds=60)
usage_tracker = UsageTracker(storage_path=PROJECT_DIR / ".usage_data.json")
assistant = StoryCoreAssistant(project_directory=PROJECT_DIR)

# Set auth middleware for dependencies
set_auth_middleware(auth_middleware)


# Dependency for authentication (now imported from dependencies module)
# async def get_current_user is defined in dependencies.py


# Middleware for rate limiting and usage tracking
@app.middleware("http")
async def rate_limit_and_track_middleware(request: Request, call_next):
    """
    Middleware for rate limiting and usage tracking.
    
    Enforces rate limits per user and tracks API usage.
    """
    start_time = time.time()
    
    # Extract user from authorization header if present
    user_id = "anonymous"
    authorization = request.headers.get("authorization")
    if authorization:
        try:
            parts = authorization.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
                user = auth_middleware.validate_token(token)
                if user:
                    user_id = user.id
        except:
            pass  # Continue with anonymous user_id
    
    # Check rate limit
    try:
        limit_info = rate_limiter.enforce_limit(user_id)
    except RateLimitExceededError as e:
        # Return 429 with rate limit headers
        headers = rate_limiter.get_headers(rate_limiter.check_limit(user_id))
        return JSONResponse(
            status_code=429,
            content={
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": str(e),
                    "details": e.details
                }
            },
            headers=headers
        )
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    duration_ms = (time.time() - start_time) * 1000
    
    # Track usage
    request_size = int(request.headers.get("content-length", 0))
    response_size = 0
    if hasattr(response, "body"):
        response_size = len(response.body)
    
    # Determine operation type from endpoint
    operation_type = _determine_operation_type(request.url.path)
    
    usage_tracker.record_request(
        user_id=user_id,
        endpoint=request.url.path,
        method=request.method,
        status_code=response.status_code,
        request_size_bytes=request_size,
        response_size_bytes=response_size,
        duration_ms=duration_ms,
        operation_type=operation_type
    )
    
    # Add rate limit headers to response
    limit_headers = rate_limiter.get_headers(limit_info)
    for key, value in limit_headers.items():
        response.headers[key] = value
    
    return response


def _determine_operation_type(path: str) -> str:
    """Determine operation type from endpoint path"""
    if "/generate/" in path:
        return "project_generation"
    elif "/projects/" in path and "/scenes" in path:
        return "scene_modification"
    elif "/projects/" in path and "/characters" in path:
        return "character_modification"
    elif "/projects/" in path and "/sequences" in path:
        return "sequence_modification"
    elif "/projects/open" in path:
        return "project_open"
    elif "/projects/close" in path:
        return "project_close"
    elif "/projects/list" in path:
        return "project_list"
    elif "/storage/" in path:
        return "storage_query"
    elif "/auth/" in path:
        return "authentication"
    else:
        return "other"


# Exception handlers
@app.exception_handler(AssistantError)
async def assistant_exception_handler(request: Request, exc: AssistantError):
    """Handle Assistant-specific exceptions"""
    status_code = 500
    
    if isinstance(exc, AuthenticationError):
        status_code = 401
    elif isinstance(exc, AuthorizationError):
        status_code = 403
    elif isinstance(exc, ValidationError):
        status_code = 400
    elif isinstance(exc, ResourceError):
        status_code = 404
    elif isinstance(exc, StorageLimitExceededError):
        status_code = 507  # Insufficient Storage
    elif isinstance(exc, ProjectError):
        status_code = 400
    
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "suggested_action": exc.suggested_action
            }
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred",
                "details": {"error_type": type(exc).__name__}
            }
        }
    )


# Health check endpoint
@app.get("/api/v1/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.
    
    Returns system status and basic statistics.
    """
    storage_stats = assistant.get_storage_stats()
    
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        storage_usage_gb=storage_stats.total_gb,
        storage_limit_gb=storage_stats.limit_gb,
        file_count=storage_stats.file_count,
        file_limit=storage_stats.file_limit
    )


# Import route modules
from .routes import auth, projects, generation, modifications, storage

# Initialize route dependencies
auth.init_auth_routes(auth_middleware, user_service, usage_tracker)
projects.init_project_routes(assistant)
generation.init_generation_routes(assistant)
modifications.init_modification_routes(assistant)
storage.init_storage_routes(assistant)

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(generation.router, prefix="/api/v1/generate", tags=["Generation"])
app.include_router(modifications.router, prefix="/api/v1/projects", tags=["Modifications"])
app.include_router(storage.router, prefix="/api/v1/storage", tags=["Storage"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
