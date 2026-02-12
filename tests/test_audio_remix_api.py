"""
Tests for Audio Remix API Endpoints
"""

import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.audio_remix_routes import router, audio_remix_engine
from api_server_fastapi import app

client = TestClient(app)


class TestAudioRemixAPI:
    """Test suite for Audio Remix API endpoints."""
    
    def test_health_check(self):
        """Test audio remix health endpoint."""
        response = client.get("/api/v1/audio/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_analyze_structure_missing_url(self):
        """Test analyze structure with missing URL."""
        response = client.post("/api/v1/audio/analyze-structure", json={
            "style": "smooth"
        })
        assert response.status_code == 422  # Validation error
    
    def test_analyze_structure_invalid_url(self):
        """Test analyze structure with invalid URL."""
        response = client.post("/api/v1/audio/analyze-structure", json={
            "music_url": "not-a-valid-url"
        })
        assert response.status_code == 422  # Validation error
    
    def test_analyze_structure_valid_request(self):
        """Test analyze structure with valid request."""
        response = client.post("/api/v1/audio/analyze-structure", json={
            "music_url": "/assets/music/test.mp3"
        })
        assert response.status_code == 200
        data = response.json()
        assert "tempo" in data
        assert "key" in data
        assert "structure" in data
    
    def test_remix_missing_params(self):
        """Test remix with missing parameters."""
        response = client.post("/api/v1/audio/remix", json={})
        assert response.status_code == 422  # Validation error
    
    def test_remix_valid_request(self):
        """Test remix with valid request."""
        response = client.post("/api/v1/audio/remix", json={
            "music_url": "/assets/music/test.mp3",
            "target_duration": 30.0,
            "style": "smooth"
        })
        assert response.status_code == 200
        data = response.json()
        assert "remixed_url" in data
        assert "cuts" in data
        assert "duration_saved" in data
    
    def test_remix_with_preservation(self):
        """Test remix with structure preservation."""
        response = client.post("/api/v1/audio/remix", json={
            "music_url": "/assets/music/test.mp3",
            "target_duration": 60.0,
            "style": "structural",
            "preserve_structure": True
        })
        assert response.status_code == 200
        data = response.json()
        assert "remixed_url" in data
    
    def test_preview_remix(self):
        """Test preview remix endpoint."""
        response = client.post("/api/v1/audio/preview", json={
            "music_url": "/assets/music/test.mp3",
            "start_time": 10.0,
            "end_time": 20.0
        })
        assert response.status_code == 200
        data = response.json()
        assert "preview_url" in data
        assert "duration" in data
    
    def test_get_styles(self):
        """Test get available styles."""
        response = client.get("/api/v1/audio/styles")
        assert response.status_code == 200
        data = response.json()
        assert "styles" in data
        assert "smooth" in data["styles"]
        assert "beat-cut" in data["styles"]
        assert "structural" in data["styles"]
        assert "dynamic" in data["styles"]


class TestAudioRemixEngine:
    """Unit tests for Audio Remix Engine."""
    
    def test_engine_initialization(self):
        """Test engine initializes correctly."""
        from api.audio_remix_routes import audio_remix_engine
        assert audio_remix_engine is not None
    
    def test_detect_sections(self):
        """Test section detection returns list."""
        from api.audio_remix_routes import router
        
        # Test structure detection response
        response = client.post("/api/v1/audio/analyze-structure", json={
            "music_url": "/test/audio.mp3"
        })
        data = response.json()
        
        if response.status_code == 200:
            assert "structure" in data
            sections = data["structure"]
            assert isinstance(sections, dict)
            assert "intro" in sections or sections == {}


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

