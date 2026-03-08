import logging
import asyncio
import json
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ============================================================================
# API Models
# ============================================================================

class PlatformConfig(BaseModel):
    id: str
    name: str
    enabled: bool = False
    status: str = "disconnected" # disconnected, connected, error
    username: Optional[str] = None

class PlatformMetadata(BaseModel):
    title: str
    description: str
    tags: List[str]
    thumbnail_url: Optional[str] = None

class MetadataGenerationRequest(BaseModel):
    project_id: str
    tone: str = "viral"
    context: Optional[str] = None

class PublishRequest(BaseModel):
    project_id: str
    video_path: str
    title: str
    description: str
    tags: List[str] = []
    platforms: List[str] # List of platform IDs
    # Per-platform overrides
    overrides: Dict[str, PlatformMetadata] = {} 
    schedule_time: Optional[str] = None # ISO format

class PublishResult(BaseModel):
    task_id: str
    status: str
    timestamp: str

# ============================================================================
# Publishing Service (Mock)
# ============================================================================

class PublisherService:
    def __init__(self):
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.platforms = [
            {"id": "youtube_shorts", "name": "YouTube Shorts", "status": "connected", "username": "@StoryCoreGen"},
            {"id": "tiktok", "name": "TikTok", "status": "connected", "username": "storycore_ai"},
            {"id": "instagram_reels", "name": "Instagram Reels", "status": "disconnected"},
            {"id": "x_twitter", "name": "X (Twitter)", "status": "connected", "username": "StoryCoreEngine"},
        ]

    async def get_platforms(self) -> List[Dict[str, Any]]:
        return self.platforms

    async def publish_video(self, req: PublishRequest) -> str:
        task_id = str(uuid.uuid4())
        self.tasks[task_id] = {
            "id": task_id,
            "project_id": req.project_id,
            "title": req.title,
            "status": "pending",
            "progress": 0,
            "platforms": req.platforms,
            "results": {},
            "created_at": datetime.now().isoformat()
        }
        
        # Start background processing
        asyncio.create_task(self._process_publishing(task_id, req))
        
        return task_id

    async def generate_ai_metadata(self, req: MetadataGenerationRequest) -> Dict[str, PlatformMetadata]:
        """Simulate AI metadata generation optimized for each platform"""
        logger.info(f"Generating AI metadata for project {req.project_id}")
        await asyncio.sleep(1.5) # Simulate LLM latency
        
        base_title = "My Epic StoryCore Project"
        if req.context:
            base_title = req.context[:30] + "..." if len(req.context) > 30 else req.context

        results = {}
        
        # YouTube Shorts
        results["youtube_shorts"] = PlatformMetadata(
            title=f"{base_title} ⚡ #shorts",
            description=f"Check out this amazing story created with StoryCore AI! \n\n#storycore #ai #filmmaking #shorts",
            tags=["shorts", "ai", "filmmaking", "storycore", "trending"],
            thumbnail_url=f"/api/addons/video_publisher/thumbnail/{req.project_id}?platform=youtube"
        )
        
        # TikTok
        results["tiktok"] = PlatformMetadata(
            title=f"Wait for the end... 🔥 {base_title}",
            description=f"AI Storytelling is here! 🤖✨ \n\n#fyp #storytime #aiart #storycore",
            tags=["fyp", "storytime", "aiart", "storycore", "creative"],
            thumbnail_url=f"/api/addons/video_publisher/thumbnail/{req.project_id}?platform=tiktok"
        )
        
        # Instagram Reels
        results["instagram_reels"] = PlatformMetadata(
            title=f"Aesthetic AI Creation: {base_title}",
            description=f"Crafting digital worlds with StoryCore. 🎬✨ \n.\n.\n#reels #digitalart #aifilm #storycore #creativity",
            tags=["reels", "digitalart", "aifilm", "storycore", "cinematic"],
            thumbnail_url=f"/api/addons/video_publisher/thumbnail/{req.project_id}?platform=instagram"
        )
        
        # X (Twitter)
        results["x_twitter"] = PlatformMetadata(
            title=f"New creation from StoryCore Engine: {base_title}",
            description=f"The future of automated storytelling is here. What do you think of this result? 🧵👇",
            tags=["StoryCore", "AI", "BuildInPublic", "GenerativeAI"],
            thumbnail_url=f"/api/addons/video_publisher/thumbnail/{req.project_id}?platform=x"
        )
        
        return results

    async def generate_thumbnail(self, project_id: str) -> str:
        """Simulate thumbnail extraction from project storyboard"""
        logger.info(f"Generating thumbnail for project {project_id}")
        await asyncio.sleep(0.5)
        # Mock returning a path to a storyboard image
        return f"/api/video-editor/projects/{project_id}/media-raw?path=storyboard/frame_01.jpg"

    async def _process_publishing(self, task_id: str, req: PublishRequest):
        task = self.tasks[task_id]
        task["status"] = "processing"
        
        total_platforms = len(req.platforms)
        for i, platform_id in enumerate(req.platforms):
            # Check for platform-specific metadata
            metadata = req.overrides.get(platform_id)
            title = metadata.title if metadata else req.title
            
            logger.info(f"Publishing to {platform_id}: [ {title} ]")
            
            # Simulate platform specific delay
            await asyncio.sleep(2) 
            
            # Simulate upload progress
            task["progress"] = int(((i + 1) / total_platforms) * 100)
            task["results"][platform_id] = {
                "status": "success",
                "url": f"https://{platform_id}.com/watch?v={uuid.uuid4().hex[:8]}",
                "timestamp": datetime.now().isoformat(),
                "published_title": title
            }
            
        task["status"] = "completed"
        task["progress"] = 100
        logger.info(f"Publishing task {task_id} completed successfully")

    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        if task_id not in self.tasks:
            raise HTTPException(status_code=404, detail="Task not found")
        return self.tasks[task_id]

# ============================================================================
# FastAPI Router
# ============================================================================

router = APIRouter(prefix="/api/addons/video_publisher", tags=["Video Publisher"])
service = PublisherService()

@router.get("/status")
async def get_status():
    return {"status": "active", "addon": "video_publisher"}

@router.get("/platforms")
async def get_platforms():
    return await service.get_platforms()

@router.post("/generate-metadata")
async def generate_metadata(req: MetadataGenerationRequest):
    data = await service.generate_ai_metadata(req)
    return {
        "success": True,
        "metadata": data
    }

@router.get("/thumbnail/{project_id}")
async def get_thumbnail(project_id: str):
    url = await service.generate_thumbnail(project_id)
    return {
        "success": True,
        "thumbnail_url": url
    }

@router.post("/publish")
async def publish_video(req: PublishRequest):
    task_id = await service.publish_video(req)
    return {
        "success": True,
        "task_id": task_id,
        "status": "queued"
    }

@router.get("/task/{task_id}")
async def get_task(task_id: str):
    return await service.get_task_status(task_id)

# ADDON_INFO required for engine integration
ADDON_INFO = {
    "name": "video_publisher",
    "display_name": "Video Multi-Publisher",
    "version": "1.0.0",
    "router": router,
    "description": "Post content to multiple platforms simultaneously (YouTube, TikTok, Instagram, X)."
}

def initialize(context):
    """Called by AddonManager when addon is enabled"""
    logger.info("Initializing Video Multi-Publisher Addon")
    # You can register hooks or listeners here
    pass

def cleanup():
    """Called by AddonManager when addon is disabled"""
    logger.info("Cleaning up Video Multi-Publisher Addon")
    pass
