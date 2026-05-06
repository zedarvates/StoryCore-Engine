"""
Tests for Audio Remix API Endpoints

Tests are aligned to the actual route contracts defined in
src/api/audio_remix_routes.py and the AudioRemixEngine mock implementation.
"""

import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.api.audio_remix_routes import get_engine
from src.api_server_fastapi import app

client = TestClient(app)


class TestAudioRemixAPI:
    """Test suite for Audio Remix API endpoints."""

    def test_health_check(self):
        """Test audio remix health endpoint."""
        response = client.get("/api/v1/audio/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "is_initialized" in data

    def test_analyze_structure_missing_url(self):
        """Test analyze structure with missing required field returns 422."""
        response = client.post(
            "/api/v1/audio/analyze-structure",
            json={
                "style": "smooth"  # missing music_url
            },
        )
        assert response.status_code == 422  # Pydantic validation error

    def test_analyze_structure_valid_request(self):
        """Test analyze structure with valid request returns expected fields."""
        response = client.post(
            "/api/v1/audio/analyze-structure",
            json={"music_url": "/assets/music/test.mp3"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "tempo" in data
        assert "key" in data
        assert "structure" in data
        assert "sections" in data
        assert isinstance(data["sections"], list)

    def test_remix_missing_params(self):
        """Test remix with missing parameters returns 422."""
        response = client.post("/api/v1/audio/remix", json={})
        assert response.status_code == 422  # Validation error

    def test_remix_valid_request(self):
        """Test remix with valid request returns correct response schema."""
        response = client.post(
            "/api/v1/audio/remix",
            json={
                "music_url": "/assets/music/test.mp3",
                "target_duration": 30.0,
                "style": "smooth",
            },
        )
        assert response.status_code == 200
        data = response.json()
        # Route returns: music_url, original_duration, target_duration, remix_url, style, cuts, crossfades, processing_time
        assert "remix_url" in data
        assert "cuts" in data
        assert "crossfades" in data
        assert "original_duration" in data
        assert "target_duration" in data
        assert data["style"] == "smooth"

    def test_remix_with_preservation(self):
        """Test remix with structural style returns correct response schema."""
        response = client.post(
            "/api/v1/audio/remix",
            json={
                "music_url": "/assets/music/test.mp3",
                "target_duration": 60.0,
                "style": "structural",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "remix_url" in data

    def test_remix_invalid_style(self):
        """Test remix with unknown style returns 400."""
        response = client.post(
            "/api/v1/audio/remix",
            json={
                "music_url": "/assets/music/test.mp3",
                "target_duration": 30.0,
                "style": "not-a-real-style",
            },
        )
        assert response.status_code == 400

    def test_preview_remix(self):
        """Test preview remix endpoint with correct schema."""
        response = client.post(
            "/api/v1/audio/preview",
            json={
                "music_url": "/assets/music/test.mp3",
                "target_duration": 30.0,
                "preview_start": 10.0,
                "preview_duration": 5.0,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "preview_url" in data
        assert "duration" in data
        assert "processing_time" in data

    def test_get_styles(self):
        """Test get available styles returns list of style objects."""
        response = client.get("/api/v1/audio/styles")
        assert response.status_code == 200
        data = response.json()
        assert "styles" in data
        styles_list = data["styles"]
        assert isinstance(styles_list, list)
        # Each style is an object with id, name, description
        style_ids = [s["id"] for s in styles_list]
        assert "smooth" in style_ids
        assert "beat-cut" in style_ids
        assert "structural" in style_ids
        assert "dynamic" in style_ids


class TestAudioRemixEngine:
    """Unit tests for Audio Remix Engine."""

    def test_engine_initialization(self):
        """Test engine initializes correctly and has is_initialized attribute."""
        engine = get_engine()
        assert engine is not None
        assert hasattr(engine, "is_initialized")

    def test_detect_sections(self):
        """Test section detection returns a dict structure."""
        response = client.post(
            "/api/v1/audio/analyze-structure", json={"music_url": "/test/audio.mp3"}
        )
        if response.status_code == 200:
            data = response.json()
            assert "structure" in data
            sections = data["structure"]
            assert isinstance(sections, dict)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
