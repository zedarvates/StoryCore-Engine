"""
Storage and monitoring endpoints for StoryCore AI Assistant API.
"""

from fastapi import APIRouter, Depends, HTTPException

from ...storycore_assistant import StoryCoreAssistant
from ...auth import User
from ..dependencies import get_current_user
from ..models import StorageStatsResponse
from ...logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()

# This will be injected from app.py
assistant: StoryCoreAssistant = None


def init_storage_routes(asst: StoryCoreAssistant):
    """Initialize route dependencies"""
    global assistant
    assistant = asst


@router.get("/stats", response_model=StorageStatsResponse)
async def get_storage_stats(user: User = Depends(get_current_user)):
    """
    Get current storage statistics.
    
    Args:
        user: Authenticated user
        
    Returns:
        Storage usage statistics
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logger.info(f"Storage stats requested for user: {user.username}")
    
    # Get storage stats
    stats = assistant.get_storage_stats()
    
    # Check for warnings
    warnings = []
    if stats.usage_percent >= 90:
        warnings.append(f"Storage at {stats.usage_percent:.1f}% of limit")
    if stats.file_usage_percent >= 90:
        warnings.append(f"File count at {stats.file_usage_percent:.1f}% of limit")
    
    return StorageStatsResponse(
        total_bytes=stats.total_bytes,
        total_gb=stats.total_gb,
        file_count=stats.file_count,
        limit_bytes=stats.limit_bytes,
        limit_gb=stats.limit_gb,
        file_limit=stats.file_limit,
        usage_percent=stats.usage_percent,
        file_usage_percent=stats.file_usage_percent,
        warnings=warnings
    )


@router.get("/usage", response_model=StorageStatsResponse)
async def get_storage_usage(user: User = Depends(get_current_user)):
    """
    Get current storage usage (alias for /stats).
    
    Args:
        user: Authenticated user
        
    Returns:
        Storage usage statistics
    """
    return await get_storage_stats(user)
