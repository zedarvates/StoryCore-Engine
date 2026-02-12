"""
Tests for Media Intelligence API Endpoints
"""

import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.media_routes import router, media_engine
from api_server_fastapi import app

client = TestClient(app)


class TestMediaIntelligenceAPI:
    """Test suite for Media Intelligence API endpoints."""
    
    def test_health_check(self):
        """Test media intelligence health endpoint."""
        response = client.get("/api/v1/media/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_search_empty_query(self):
        """Test search with empty query returns error."""
        response = client.post("/api/v1/media/search", json={
            "query": ""
        })
        assert response.status_code == 422  # Validation error
    
    def test_search_missing_query(self):
        """Test search with missing query field."""
        response = client.post("/api/v1/media/search", json={})
        assert response.status_code == 422  # Validation error
    
    def test_search_valid_query(self):
        """Test search with valid query."""
        response = client.post("/api/v1/media/search", json={
            "query": "videos with dialogue"
        })
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert isinstance(data["results"], list)
    
    def test_search_with_filters(self):
        """Test search with type filters."""
        response = client.post("/api/v1/media/search", json={
            "query": "nature scenes",
            "types": ["image", "video"],
            "limit": 10
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) <= 10
    
    def test_index_project(self):
        """Test indexing a project."""
        response = client.post("/api/v1/media/index", json={
            "project_id": "test-project"
        })
        assert response.status_code == 200
        data = response.json()
        assert "indexed_assets" in data
    
    def test_get_stats(self):
        """Test getting media intelligence stats."""
        response = client.get("/api/v1/media/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_assets" in data
        assert "indexed_assets" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

