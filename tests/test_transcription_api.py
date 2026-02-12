"""
Tests for Transcription API Endpoints
"""

import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.transcription_routes import router, transcription_engine
from api_server_fastapi import app

client = TestClient(app)


class TestTranscriptionAPI:
    """Test suite for Transcription API endpoints."""
    
    def test_health_check(self):
        """Test transcription health endpoint."""
        response = client.get("/api/v1/transcription/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_transcribe_missing_url(self):
        """Test transcription with missing URL."""
        response = client.post("/api/v1/transcription/transcribe", json={
            "language": "fr"
        })
        assert response.status_code == 422  # Validation error
    
    def test_transcribe_valid_request(self):
        """Test transcription with valid request."""
        response = client.post("/api/v1/transcription/transcribe", json={
            "audio_url": "/assets/audio/test.wav",
            "language": "fr"
        })
        assert response.status_code == 200
        data = response.json()
        assert "transcript_id" in data
        assert "text" in data
        assert "segments" in data
    
    def test_transcribe_with_speaker_diarization(self):
        """Test transcription with speaker diarization."""
        response = client.post("/api/v1/transcription/transcribe", json={
            "audio_url": "/assets/audio/interview.wav",
            "language": "fr",
            "enable_speaker_diarization": True
        })
        assert response.status_code == 200
        data = response.json()
        assert "segments" in data
    
    def test_get_transcript(self):
        """Test get transcript by ID."""
        # First create a transcript
        response = client.post("/api/v1/transcription/transcribe", json={
            "audio_url": "/assets/audio/test.wav",
            "language": "fr"
        })
        
        if response.status_code == 200:
            transcript_id = response.json()["transcript_id"]
            
            # Then retrieve it
            get_response = client.get(f"/api/v1/transcription/{transcript_id}")
            assert get_response.status_code == 200
            data = get_response.json()
            assert data["transcript_id"] == transcript_id
    
    def test_export_srt(self):
        """Test SRT export."""
        # Create transcript first
        response = client.post("/api/v1/transcription/transcribe", json={
            "audio_url": "/assets/audio/test.wav",
            "language": "fr"
        })
        
        if response.status_code == 200:
            transcript_id = response.json()["transcript_id"]
            
            # Export to SRT
            export_response = client.get(f"/api/v1/transcription/{transcript_id}/export/srt")
            assert export_response.status_code == 200
            content = export_response.text
            assert "1" in content  # SRT format starts with index
            assert "-->" in content  # SRT timestamp format
    
    def test_export_vtt(self):
        """Test VTT export."""
        response = client.post("/api/v1/transcription/transcribe", json={
            "audio_url": "/assets/audio/test.wav",
            "language": "fr"
        })
        
        if response.status_code == 200:
            transcript_id = response.json()["transcript_id"]
            
            # Export to VTT
            export_response = client.get(f"/api/v1/transcription/{transcript_id}/export/vtt")
            assert export_response.status_code == 200
            content = export_response.text
            assert "WEBVTT" in content  # VTT header
    
    def test_generate_montage_missing_params(self):
        """Test montage generation with missing parameters."""
        response = client.post("/api/v1/transcription/generate-montage", json={})
        assert response.status_code == 422  # Validation error
    
    def test_generate_montage_valid(self):
        """Test montage generation."""
        # Create transcript first
        response = client.post("/api/v1/transcription/transcribe", json={
            "audio_url": "/assets/audio/test.wav",
            "language": "fr"
        })
        
        if response.status_code == 200:
            transcript_id = response.json()["transcript_id"]
            
            # Generate montage
            montage_response = client.post("/api/v1/transcription/generate-montage", json={
                "transcript_id": transcript_id,
                "style": "chronologique"
            })
            assert montage_response.status_code == 200
            data = montage_response.json()
            assert "shots" in data
            assert "total_duration" in data


class TestTranscriptionEngine:
    """Unit tests for Transcription Engine."""
    
    def test_engine_initialization(self):
        """Test engine initializes correctly."""
        from api.transcription_routes import transcription_engine
        assert transcription_engine is not None
    
    def test_supported_languages(self):
        """Test supported languages list."""
        response = client.get("/api/v1/transcription/languages")
        assert response.status_code == 200
        data = response.json()
        assert "languages" in data
        assert "fr" in data["languages"]
        assert "en" in data["languages"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

