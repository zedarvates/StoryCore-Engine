"""
StoryCore API Server - FastAPI Implementation
Provides REST endpoints for StoryCore-Engine dashboard functionality.

Author: StoryCore-Engine Team
Date: 2026-01-15
"""

from fastapi import FastAPI, APIRouter, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict, Any
import time
import secrets

from .auth import (
    settings,
    User,
    APIKey,
    api_keys_db,
    generate_api_key,
    hash_api_key,
    users_db,
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_current_admin_user,
    rate_limiter,
)
from fastapi_limiter import FastAPILimiter
import redis.asyncio as redis
from .models import Project, Storyboard, QAReport
import datetime
from typing import Dict

# Create FastAPI application instance
app = FastAPI(title="StoryCore API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API versioning router (v1)
v1_router = APIRouter(prefix="/v1")

# Routers for modules
auth_router = APIRouter()
projects_router = APIRouter()
storyboards_router = APIRouter()
qa_reports_router = APIRouter()
system_router = APIRouter()
api_keys_router = APIRouter()

# Import installation router
from .installation_api import installation_router

# Include routers in v1
v1_router.include_router(auth_router, prefix="/auth", tags=["auth"])
v1_router.include_router(projects_router, prefix="/projects", tags=["projects"])
v1_router.include_router(storyboards_router, prefix="/storyboards", tags=["storyboards"])
v1_router.include_router(qa_reports_router, prefix="/qa-reports", tags=["qa-reports"])
v1_router.include_router(system_router, prefix="/system", tags=["system"])
v1_router.include_router(api_keys_router, prefix="/api-keys", tags=["api-keys"])

# Include installation router (not under v1 to match design spec)
app.include_router(installation_router)

# Include v1 router in app
app.include_router(v1_router)

# In-memory databases
projects_db: Dict[str, Project] = {}
storyboards_db: Dict[str, Storyboard] = {}
qa_reports_db: Dict[str, QAReport] = {}

# Startup event for rate limiter
@app.on_event("startup")
async def startup():
    redis_instance = redis.from_url(settings.redis_url, encoding="utf8")
    await FastAPILimiter.init(redis_instance)

# Auth models
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str

# Auth endpoints
@auth_router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login endpoint."""
    user = users_db.get(request.username)
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.username, "role": user.role})
    expires_in = settings.jwt_access_token_expire_minutes * 60
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in
    )

@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: User = Depends(get_current_user)):
    """Refresh access token."""
    access_token = create_access_token(data={"sub": current_user.username, "role": current_user.role})
    refresh_token = create_refresh_token(data={"sub": current_user.username, "role": current_user.role})
    expires_in = settings.jwt_access_token_expire_minutes * 60
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in
    )

@auth_router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout endpoint (placeholder)."""
    # In production, implement token blacklisting
    return {"message": "Logged out successfully"}

# Health check endpoint with rate limiting
@app.get("/health", dependencies=[Depends(rate_limiter)])
async def health_check():
    return {"status": "healthy", "version": "1.0.0", "timestamp": time.time()}

# Protected system endpoint
@system_router.get("/stats")
async def system_stats(current_user: User = Depends(get_current_user)):
    """Get system statistics (protected)."""
    return {
        "version": "1.0.0",
        "uptime_seconds": time.time(),
        "user": current_user.username,
        "role": current_user.role
    }

@system_router.get("/health")
async def system_health():
    """Get system health status."""
    return {"status": "healthy", "timestamp": datetime.datetime.utcnow().isoformat()}

# Video Plan model
class VideoPlanEntry(BaseModel):
    shot_id: str
    shot_number: int
    source_image: str
    camera_movement: str
    duration: float
    style_anchor: Dict[str, Any] = {}
    transition: str
    description: str
    title: str

class VideoPlan(BaseModel):
    video_plan_id: str
    project_id: str
    storyboard_id: str = ""
    created_at: str
    total_shots: int
    total_duration: float
    video_entries: List[VideoPlanEntry]
    metadata: Dict[str, Any]

# In-memory database for video plans
video_plans_db: Dict[str, VideoPlan] = {}

# Projects endpoints
@projects_router.get("/", response_model=List[Project])
async def get_projects(skip: int = 0, limit: int = 10, current_user: User = Depends(get_current_user)):
    """Get projects with pagination."""
    if current_user.role == "admin":
        all_projects = list(projects_db.values())
    else:
        all_projects = [p for p in projects_db.values() if p.user_id == current_user.username]
    return all_projects[skip:skip+limit]

@projects_router.post("/", response_model=Project)
async def create_project(project: Project, current_user: User = Depends(get_current_user)):
    """Create a new project."""
    project.user_id = current_user.username
    now = datetime.datetime.utcnow().isoformat()
    project.created_at = now
    project.updated_at = now
    projects_db[project.project_id] = project
    return project

@projects_router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific project."""
    project = projects_db.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role != "admin" and project.user_id != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")
    return project

@projects_router.put("/{project_id}", response_model=Project)
async def update_project(project_id: str, project_update: Project, current_user: User = Depends(get_current_user)):
    """Update a project."""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    project = projects_db[project_id]
    if current_user.role != "admin" and project.user_id != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")
    project_update.user_id = project.user_id
    project_update.created_at = project.created_at
    project_update.updated_at = datetime.datetime.utcnow().isoformat()
    projects_db[project_id] = project_update
    return project_update

@projects_router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: User = Depends(get_current_user)):
    """Delete a project."""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    project = projects_db[project_id]
    if current_user.role != "admin" and project.user_id != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")
    del projects_db[project_id]
    return {"message": "Project deleted"}

# Storyboards endpoints
@storyboards_router.get("/", response_model=List[Storyboard])
async def get_storyboards(skip: int = 0, limit: int = 10, current_user: User = Depends(get_current_user)):
    """Get storyboards with pagination."""
    if current_user.role == "admin":
        all_storyboards = list(storyboards_db.values())
    else:
        all_storyboards = [s for s in storyboards_db.values() if s.user_id == current_user.username]
    return all_storyboards[skip:skip+limit]

@storyboards_router.post("/", response_model=Storyboard)
async def create_storyboard(storyboard: Storyboard, current_user: User = Depends(get_current_user)):
    """Create a new storyboard."""
    storyboard.user_id = current_user.username
    storyboards_db[storyboard.storyboard_id] = storyboard
    return storyboard

@storyboards_router.get("/{storyboard_id}", response_model=Storyboard)
async def get_storyboard(storyboard_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific storyboard."""
    storyboard = storyboards_db.get(storyboard_id)
    if not storyboard:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    if current_user.role != "admin" and storyboard.user_id != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")
    return storyboard

@storyboards_router.put("/{storyboard_id}", response_model=Storyboard)
async def update_storyboard(storyboard_id: str, storyboard_update: Storyboard, current_user: User = Depends(get_current_user)):
    """Update a storyboard."""
    if storyboard_id not in storyboards_db:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    storyboard = storyboards_db[storyboard_id]
    if current_user.role != "admin" and storyboard.user_id != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")
    storyboard_update.user_id = storyboard.user_id
    storyboards_db[storyboard_id] = storyboard_update
    return storyboard_update

@storyboards_router.delete("/{storyboard_id}")
async def delete_storyboard(storyboard_id: str, current_user: User = Depends(get_current_user)):
    """Delete a storyboard."""
    if storyboard_id not in storyboards_db:
        raise HTTPException(status_code=404, detail="Storyboard not found")
    storyboard = storyboards_db[storyboard_id]
    if current_user.role != "admin" and storyboard.user_id != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")
    del storyboards_db[storyboard_id]
    return {"message": "Storyboard deleted"}

# QA Reports endpoints
@qa_reports_router.get("/", response_model=List[QAReport])
async def get_qa_reports(skip: int = 0, limit: int = 10, current_user: User = Depends(get_current_user)):
    """Get QA reports with pagination."""
    if current_user.role == "admin":
        all_qa_reports = list(qa_reports_db.values())
    else:
        all_qa_reports = [q for q in qa_reports_db.values() if q.user_id == current_user.username]
    return all_qa_reports[skip:skip+limit]

@qa_reports_router.post("/", response_model=QAReport)
async def create_qa_report(qa_report: QAReport, current_user: User = Depends(get_current_user)):
    """Create a new QA report."""
    qa_report.user_id = current_user.username
    qa_report.timestamp = datetime.datetime.utcnow().isoformat()
    qa_reports_db[qa_report.qa_report_id] = qa_report
    return qa_report

@qa_reports_router.get("/{qa_report_id}", response_model=QAReport)
async def get_qa_report(qa_report_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific QA report."""
    qa_report = qa_reports_db.get(qa_report_id)
    if not qa_report:
        raise HTTPException(status_code=404, detail="QA Report not found")
    if current_user.role != "admin" and qa_report.user_id != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")
    return qa_report

@qa_reports_router.put("/{qa_report_id}", response_model=QAReport)
async def update_qa_report(qa_report_id: str, qa_report_update: QAReport, current_user: User = Depends(get_current_user)):
    """Update a QA report."""
    if qa_report_id not in qa_reports_db:
        raise HTTPException(status_code=404, detail="QA Report not found")
    qa_report = qa_reports_db[qa_report_id]
    if current_user.role != "admin" and qa_report.user_id != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")
    qa_report_update.user_id = qa_report.user_id
    qa_report_update.timestamp = qa_report.timestamp
    qa_reports_db[qa_report_id] = qa_report_update
    return qa_report_update

@qa_reports_router.delete("/{qa_report_id}")
async def delete_qa_report(qa_report_id: str, current_user: User = Depends(get_current_user)):
    """Delete a QA report."""
    if qa_report_id not in qa_reports_db:
        raise HTTPException(status_code=404, detail="QA Report not found")
    qa_report = qa_reports_db[qa_report_id]
    if current_user.role != "admin" and qa_report.user_id != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")
    del qa_reports_db[qa_report_id]
    return {"message": "QA Report deleted"}

# Video Plans endpoints
@projects_router.get("/{project_id}/video-plan", response_model=VideoPlan)
async def get_video_plan(project_id: str, current_user: User = Depends(get_current_user)):
    """Get video plan for a project."""
    # Check if user has access to project
    project = projects_db.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role != "admin" and project.user_id != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Return video plan or create empty one
    video_plan = video_plans_db.get(project_id)
    if not video_plan:
        # Create empty video plan
        video_plan = VideoPlan(
            video_plan_id=f"vp_{project_id}_{int(time.time())}",
            project_id=project_id,
            storyboard_id="",
            created_at=datetime.datetime.utcnow().isoformat(),
            total_shots=0,
            total_duration=0.0,
            video_entries=[],
            metadata={
                "global_style_applied": False,
                "camera_movements": {},
                "transitions": {}
            }
        )
        video_plans_db[project_id] = video_plan

    return video_plan

@projects_router.put("/{project_id}/video-plan", response_model=VideoPlan)
async def update_video_plan(project_id: str, video_plan_update: VideoPlan, current_user: User = Depends(get_current_user)):
    """Update video plan for a project."""
    # Check if user has access to project
    project = projects_db.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role != "admin" and project.user_id != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Update video plan
    video_plan_update.project_id = project_id
    video_plans_db[project_id] = video_plan_update

    # Save to JSON file for persistence
    try:
        from .video_plan_engine import VideoPlanEngine
        engine = VideoPlanEngine()

        # Find project directory
        import os
        project_path = None
        for root, dirs, files in os.walk("."):
            if f"{project_id}.json" in files:
                project_path = Path(root)
                break

        if project_path:
            # Save video plan to file using the engine method
            engine.save_video_plan_to_file(project_path, video_plan_update.dict())
        else:
            # Fallback: create a simple projects directory
            project_path = Path(f"./projects/{project_id}")
            project_path.mkdir(parents=True, exist_ok=True)
            video_plan_file = project_path / "video_plan.json"
            with open(video_plan_file, 'w') as f:
                import json
                json.dump(video_plan_update.dict(), f, indent=2, default=str)

    except Exception as e:
        # Log but don't fail the API call
        print(f"Warning: Could not save video plan to file: {e}")

    return video_plan_update

@projects_router.post("/{project_id}/video-plan/generate")
async def generate_video_plan(project_id: str, current_user: User = Depends(get_current_user)):
    """Generate video plan from storyboard."""
    # Check if user has access to project
    project = projects_db.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role != "admin" and project.user_id != current_user.username:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        from .video_plan_engine import VideoPlanEngine
        engine = VideoPlanEngine()

        # Find project directory
        import os
        project_path = None
        for root, dirs, files in os.walk("."):
            if f"{project_id}.json" in files:
                project_path = Path(root)
                break

        if not project_path:
            raise HTTPException(status_code=404, detail="Project files not found")

        result = engine.generate_video_plan(project_path)

        # Load and return the generated plan
        video_plan_file = project_path / "video_plan.json"
        if video_plan_file.exists():
            import json
            with open(video_plan_file, 'r') as f:
                plan_data = json.load(f)

            # Convert to VideoPlan model
            video_plan = VideoPlan(**plan_data)
            video_plans_db[project_id] = video_plan

            return result
        else:
            raise HTTPException(status_code=500, detail="Failed to generate video plan")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video plan generation failed: {str(e)}")

# API Keys endpoints (admin only)
class APIKeyCreate(BaseModel):
    name: str
    permissions: List[str] = []

@api_keys_router.get("/", response_model=List[APIKey])
async def get_api_keys(current_user: User = Depends(get_current_admin_user)):
    """Get all API keys (admin only)."""
    return list(api_keys_db.values())

@api_keys_router.post("/", response_model=Dict[str, Any])
async def create_api_key(api_key_data: APIKeyCreate, current_user: User = Depends(get_current_admin_user)):
    """Create a new API key (admin only)."""
    key_id = secrets.token_hex(16)
    api_key_plain = generate_api_key()
    api_key_hashed = hash_api_key(api_key_plain)
    api_key_obj = APIKey(
        key_id=key_id,
        name=api_key_data.name,
        hashed_key=api_key_hashed,
        permissions=api_key_data.permissions
    )
    api_keys_db[key_id] = api_key_obj
    return {"key_id": key_id, "api_key": api_key_plain, "name": api_key_data.name, "permissions": api_key_data.permissions}

@api_keys_router.get("/{key_id}", response_model=APIKey)
async def get_api_key(key_id: str, current_user: User = Depends(get_current_admin_user)):
    """Get a specific API key (admin only)."""
    api_key = api_keys_db.get(key_id)
    if not api_key:
        raise HTTPException(status_code=404, detail="API Key not found")
    return api_key

@api_keys_router.put("/{key_id}", response_model=APIKey)
async def update_api_key(key_id: str, api_key_update: APIKeyCreate, current_user: User = Depends(get_current_admin_user)):
    """Update an API key (admin only)."""
    if key_id not in api_keys_db:
        raise HTTPException(status_code=404, detail="API Key not found")
    api_key = api_keys_db[key_id]
    api_key.name = api_key_update.name
    api_key.permissions = api_key_update.permissions
    api_keys_db[key_id] = api_key
    return api_key

@api_keys_router.delete("/{key_id}")
async def delete_api_key(key_id: str, current_user: User = Depends(get_current_admin_user)):
    """Delete an API key (admin only)."""
    if key_id not in api_keys_db:
        raise HTTPException(status_code=404, detail="API Key not found")
    del api_keys_db[key_id]
    return {"message": "API Key deleted"}

@app.get("/system_stats")
async def system_stats_legacy(current_user: User = Depends(get_current_user)):
    """Legacy system stats endpoint for compatibility."""
    return {
        "version": "1.0.0",
        "uptime_seconds": time.time(),
        "user": current_user.username,
        "role": current_user.role
    }

# Global error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )

# Run server with uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)