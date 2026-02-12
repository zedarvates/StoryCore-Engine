"""
Media Intelligence API Routes - FastAPI endpoints for media search
"""

import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import time

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from auth import get_current_user, User, rate_limiter
except ImportError:
    try:
        from ..auth import get_current_user, User, rate_limiter
    except ImportError:
        # Mock for standalone testing
        class MockUser:
            def __init__(self):
                self.username = "test_user"
                self.role = "admin"
        
        def get_current_user():
            return MockUser()
        
        User = MockUser
        rate_limiter = None

try:
    from media_intelligence_engine import (
        MediaIntelligenceEngine,
        SearchResult,
        AssetType,
        SearchMode
    )
except ImportError:
    from ..media_intelligence_engine import (
        MediaIntelligenceEngine,
        SearchResult,
        AssetType,
        SearchMode
    )

# Create router
media_router = APIRouter()

# Global engine instance
_engine: Optional[MediaIntelligenceEngine] = None

def get_engine() -> MediaIntelligenceEngine:
    """Get or create the media intelligence engine."""
    global _engine
    if _engine is None:
        _engine = MediaIntelligenceEngine()
    return _engine


# Request/Response Models
class SearchRequest(BaseModel):
    query: str
    project_id: Optional[str] = None
    asset_types: Optional[List[str]] = None
    search_mode: Optional[str] = "hybrid"
    limit: Optional[int] = 20
    similarity_threshold: Optional[float] = 0.7


class IndexRequest(BaseModel):
    project_id: str


class IndexResponse(BaseModel):
    project_id: str
    indexed_assets: int
    errors: List[str]
    duration_seconds: float


class HealthResponse(BaseModel):
    status: str
    indexed_assets: int
    asset_type_counts: Dict[str, int]


class TypesResponse(BaseModel):
    types: List[str]
    modes: List[str]


class StatsResponse(BaseModel):
    total_assets: int
    indexed_assets: int
    index_size_mb: float
    last_indexed: Optional[str]
    asset_type_counts: Dict[str, int]


@media_router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    try:
        engine = get_engine()
        stats = engine.get_index_stats()
        return HealthResponse(
            status="healthy",
            indexed_assets=stats.indexed_assets,
            asset_type_counts=stats.asset_type_counts
        )
    except Exception as e:
        return HealthResponse(
            status="error",
            indexed_assets=0,
            asset_type_counts={}
        )


@media_router.get("/types", response_model=TypesResponse)
async def get_supported_types():
    """Get supported asset types and search modes."""
    return TypesResponse(
        types=["image", "video", "audio", "text"],
        modes=["semantic", "keyword", "hybrid", "similarity"]
    )


@media_router.get("/stats", response_model=StatsResponse)
async def get_index_stats():
    """Get index statistics."""
    engine = get_engine()
    stats = engine.get_index_stats()
    return StatsResponse(
        total_assets=stats.total_assets,
        indexed_assets=stats.indexed_assets,
        index_size_mb=stats.index_size_mb,
        last_indexed=stats.last_indexed.isoformat() if stats.last_indexed else None,
        asset_type_counts=stats.asset_type_counts
    )


@media_router.post("/search")
async def search_assets(request: SearchRequest):
    """
    Search for media assets using natural language.
    
    Example:
    ```
    POST /api/v1/media/search
    {
        "query": "vidéos avec des personnages",
        "types": ["video"],
        "limit": 10
    }
    ```
    """
    start_time = time.time()
    
    # Convert asset types
    asset_types_enum = None
    if request.asset_types:
        try:
            asset_types_enum = [AssetType(t) for t in request.asset_types]
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid asset type. Supported: image, video, audio, text"
            )
    
    # Convert search mode
    search_mode = SearchMode.HYBRID
    if request.search_mode:
        try:
            search_mode = SearchMode(request.search_mode)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid search mode. Supported: semantic, keyword, hybrid, similarity"
            )
    
    try:
        engine = get_engine()
        results = await engine.search(
            query=request.query,
            project_id=request.project_id,
            asset_types=asset_types_enum,
            search_mode=search_mode,
            limit=request.limit,
            similarity_threshold=request.similarity_threshold
        )
        
        # Format results for response
        formatted_results = []
        for result in results:
            formatted_results.append({
                "asset_id": result.asset_id,
                "asset_type": result.asset_type.value,
                "file_path": result.file_path,
                "file_name": result.file_name,
                "similarity_score": result.similarity_score,
                "match_type": result.match_type,
                "highlighted_text": result.highlighted_text,
                "preview_url": result.preview_url,
                "metadata": result.metadata
            })
        
        processing_time = time.time() - start_time
        
        return {
            "query": request.query,
            "results_count": len(formatted_results),
            "processing_time_seconds": processing_time,
            "results": formatted_results
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}"
        )


@media_router.post("/index", response_model=IndexResponse)
async def index_project(request: IndexRequest):
    """
    Index all assets in a project.
    
    Example:
    ```
    POST /api/v1/media/index
    {
        "project_id": "mon-projet"
    }
    ```
    """
    start_time = time.time()
    
    try:
        engine = get_engine()
        result = await engine.index_project_assets(request.project_id)
        
        return IndexResponse(
            project_id=result["project_id"],
            indexed_assets=result["indexed_assets"],
            errors=result["errors"],
            duration_seconds=result["duration_seconds"]
        )
        
    except Exception as e:
        return IndexResponse(
            project_id=request.project_id,
            indexed_assets=0,
            errors=[str(e)],
            duration_seconds=time.time() - start_time
        )


@media_router.delete("/clear/{project_id}")
async def clear_project_index(project_id: str):
    """Clear all indexed assets for a project."""
    try:
        engine = get_engine()
        removed_count = await engine.clear_project_index(project_id)
        return {
            "project_id": project_id,
            "removed_assets": removed_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear project index: {str(e)}"
        )


@media_router.post("/export")
async def export_index(file_path: str = "media_index_export.json"):
    """Export the media index to a JSON file."""
    try:
        engine = get_engine()
        await engine.export_index(file_path)
        return {
            "status": "success",
            "file_path": file_path
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export index: {str(e)}"
        )
