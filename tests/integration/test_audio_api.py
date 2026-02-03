"""
Integration tests for Audio API endpoints.

Tests all 6 audio production endpoints:
- storycore.audio.voice.generate
- storycore.audio.music.generate
- storycore.audio.effects.add
- storycore.audio.mix
- storycore.audio.sync
- storycore.audio.analyze
"""

import pytest
from pathlib import Path
import tempfile
import os

from src.api.categories.audio import AudioCategoryHandler
from src.api.config import APIConfig
from src.api.models import RequestContext


@pytest.fixture
def audio_handler():
    """Create audio handler for testing."""
    config = APIConfig(
        version="v1",
        log_api_calls=True,
        log_sanitize_params=False,
    )
    return AudioCategoryHandler(config)


@pytest.fixture
def request_context():
    """Create request context for testing."""
    return RequestContext(
        endpoint="test",
        method="POST",
    )


@pytest.fixture
def temp_audio_file():
    """Create a temporary audio file for testing."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.wav', delete=False) as f:
        f.write("mock audio data")
        temp_path = f.name
    
    yield temp_path
    
    # Cleanup
    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def temp_video_file():
    """Create a temporary video file for testing."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.mp4', delete=False) as f:
        f.write("mock video data")
        temp_path = f.name
    
    yield temp_path
    
    # Cleanup
    if os.path.exists(temp_path):
        os.unlink(temp_path)


class TestVoiceGenerate:
    """Test storycore.audio.voice.generate endpoint."""
    
    def test_voice_generate_success(self, audio_handler, request_context):
        """Test successful voice generation."""
        params = {
            "text": "Hello, this is a test of voice generation.",
            "voice_id": "voice_001",
            "voice_parameters": {
                "pitch": 1.0,
                "speed": 1.0,
                "emotion": "neutral"
            },
            "output_format": "wav",
            "sample_rate": 44100,
        }
        
        response = audio_handler.voice_generate(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert "audio_path" in response.data
        assert "duration_seconds" in response.data
        assert "text" in response.data
        assert response.data["text"] == params["text"]
        assert response.data["voice_id"] == params["voice_id"]
        assert response.data["sample_rate"] == 44100
        assert response.data["format"] == "wav"
        assert response.metadata is not None
    
    def test_voice_generate_missing_text(self, audio_handler, request_context):
        """Test voice generation with missing text parameter."""
        params = {
            "voice_id": "voice_001",
        }
        
        response = audio_handler.voice_generate(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "text" in response.error.message.lower()
    
    def test_voice_generate_text_too_long(self, audio_handler, request_context):
        """Test voice generation with text exceeding maximum length."""
        params = {
            "text": "a" * 10001,  # Exceeds 10,000 character limit
        }
        
        response = audio_handler.voice_generate(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "maximum length" in response.error.message.lower()
    
    def test_voice_generate_minimal_params(self, audio_handler, request_context):
        """Test voice generation with minimal parameters."""
        params = {
            "text": "Short test.",
        }
        
        response = audio_handler.voice_generate(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert response.data["text"] == params["text"]
        assert response.data["sample_rate"] == 44100  # Default
        assert response.data["format"] == "wav"  # Default


class TestMusicGenerate:
    """Test storycore.audio.music.generate endpoint."""
    
    def test_music_generate_success(self, audio_handler, request_context):
        """Test successful music generation."""
        params = {
            "mood": "upbeat",
            "duration_seconds": 30.0,
            "genre": "electronic",
            "tempo": 120,
            "key": "C major",
            "instruments": ["synth", "drums", "bass"],
            "output_format": "wav",
            "sample_rate": 44100,
        }
        
        response = audio_handler.music_generate(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert "audio_path" in response.data
        assert "duration_seconds" in response.data
        assert response.data["mood"] == params["mood"]
        assert response.data["duration_seconds"] == params["duration_seconds"]
        assert response.data["genre"] == params["genre"]
        assert response.data["tempo"] == params["tempo"]
        assert response.data["key"] == params["key"]
        assert response.metadata is not None
    
    def test_music_generate_missing_required_params(self, audio_handler, request_context):
        """Test music generation with missing required parameters."""
        params = {
            "mood": "upbeat",
            # Missing duration_seconds
        }
        
        response = audio_handler.music_generate(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "duration_seconds" in response.error.message.lower()
    
    def test_music_generate_invalid_duration(self, audio_handler, request_context):
        """Test music generation with invalid duration."""
        params = {
            "mood": "peaceful",
            "duration_seconds": 700,  # Exceeds 600 second limit
        }
        
        response = audio_handler.music_generate(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "duration" in response.error.message.lower()
    
    def test_music_generate_minimal_params(self, audio_handler, request_context):
        """Test music generation with minimal parameters."""
        params = {
            "mood": "melancholic",
            "duration_seconds": 15.0,
        }
        
        response = audio_handler.music_generate(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert response.data["mood"] == params["mood"]
        assert response.data["duration_seconds"] == params["duration_seconds"]


class TestEffectsAdd:
    """Test storycore.audio.effects.add endpoint."""
    
    def test_effects_add_success(self, audio_handler, request_context, temp_audio_file):
        """Test successful audio effect application."""
        params = {
            "audio_path": temp_audio_file,
            "effect_type": "reverb",
            "effect_parameters": {
                "room_size": 0.5,
                "damping": 0.3,
                "wet_level": 0.4,
            },
        }
        
        response = audio_handler.effects_add(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert "audio_path" in response.data
        assert "original_path" in response.data
        assert response.data["original_path"] == temp_audio_file
        assert response.data["effect_type"] == "reverb"
        assert response.data["effect_parameters"] == params["effect_parameters"]
    
    def test_effects_add_file_not_found(self, audio_handler, request_context):
        """Test effect application with non-existent audio file."""
        params = {
            "audio_path": "/nonexistent/audio.wav",
            "effect_type": "echo",
        }
        
        response = audio_handler.effects_add(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "NOT_FOUND"
        assert "not found" in response.error.message.lower()
    
    def test_effects_add_invalid_effect_type(self, audio_handler, request_context, temp_audio_file):
        """Test effect application with invalid effect type."""
        params = {
            "audio_path": temp_audio_file,
            "effect_type": "invalid_effect",
        }
        
        response = audio_handler.effects_add(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "invalid effect type" in response.error.message.lower()
    
    def test_effects_add_all_effect_types(self, audio_handler, request_context, temp_audio_file):
        """Test all valid effect types."""
        valid_effects = ["reverb", "echo", "fade_in", "fade_out", "normalize", "compress", "eq"]
        
        for effect_type in valid_effects:
            params = {
                "audio_path": temp_audio_file,
                "effect_type": effect_type,
            }
            
            response = audio_handler.effects_add(params, request_context)
            
            assert response.status == "success", f"Effect {effect_type} failed"
            assert response.data["effect_type"] == effect_type


class TestMix:
    """Test storycore.audio.mix endpoint."""
    
    def test_mix_success(self, audio_handler, request_context, temp_audio_file):
        """Test successful audio mixing."""
        params = {
            "tracks": [
                {
                    "path": temp_audio_file,
                    "name": "Track 1",
                    "volume": 1.0,
                    "pan": 0.0,
                    "start_time_seconds": 0.0,
                },
                {
                    "path": temp_audio_file,
                    "name": "Track 2",
                    "volume": 0.8,
                    "pan": -0.5,
                    "start_time_seconds": 2.0,
                },
            ],
            "output_path": "output_mix.wav",
            "output_format": "wav",
            "sample_rate": 44100,
            "normalize": True,
        }
        
        response = audio_handler.mix(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert "audio_path" in response.data
        assert response.data["track_count"] == 2
        assert "duration_seconds" in response.data
        assert "peak_level" in response.data
        assert "rms_level" in response.data
    
    def test_mix_no_tracks(self, audio_handler, request_context):
        """Test mixing with no tracks."""
        params = {
            "tracks": [],
            "output_path": "output_mix.wav",
        }
        
        response = audio_handler.mix(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "at least one track" in response.error.message.lower()
    
    def test_mix_invalid_track_data(self, audio_handler, request_context):
        """Test mixing with invalid track data."""
        params = {
            "tracks": [
                {
                    "name": "Track 1",
                    # Missing 'path'
                },
            ],
            "output_path": "output_mix.wav",
        }
        
        response = audio_handler.mix(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "missing required fields" in response.error.message.lower()
    
    def test_mix_track_file_not_found(self, audio_handler, request_context):
        """Test mixing with non-existent track file."""
        params = {
            "tracks": [
                {
                    "path": "/nonexistent/track.wav",
                    "name": "Track 1",
                },
            ],
            "output_path": "output_mix.wav",
        }
        
        response = audio_handler.mix(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "NOT_FOUND"
        assert "not found" in response.error.message.lower()


class TestSync:
    """Test storycore.audio.sync endpoint."""
    
    def test_sync_success(self, audio_handler, request_context, temp_audio_file, temp_video_file):
        """Test successful audio-video synchronization."""
        params = {
            "audio_path": temp_audio_file,
            "video_path": temp_video_file,
            "output_path": "synced_output.mp4",
            "sync_method": "auto",
            "offset_seconds": 0.0,
            "trim_audio": True,
        }
        
        response = audio_handler.sync(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert "output_path" in response.data
        assert response.data["audio_path"] == temp_audio_file
        assert response.data["video_path"] == temp_video_file
        assert "sync_offset_seconds" in response.data
        assert "sync_quality_score" in response.data
        assert 0.0 <= response.data["sync_quality_score"] <= 1.0
    
    def test_sync_audio_not_found(self, audio_handler, request_context, temp_video_file):
        """Test sync with non-existent audio file."""
        params = {
            "audio_path": "/nonexistent/audio.wav",
            "video_path": temp_video_file,
            "output_path": "synced_output.mp4",
        }
        
        response = audio_handler.sync(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "NOT_FOUND"
        assert "audio" in response.error.message.lower()
    
    def test_sync_video_not_found(self, audio_handler, request_context, temp_audio_file):
        """Test sync with non-existent video file."""
        params = {
            "audio_path": temp_audio_file,
            "video_path": "/nonexistent/video.mp4",
            "output_path": "synced_output.mp4",
        }
        
        response = audio_handler.sync(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "NOT_FOUND"
        assert "video" in response.error.message.lower()
    
    def test_sync_invalid_method(self, audio_handler, request_context, temp_audio_file, temp_video_file):
        """Test sync with invalid sync method."""
        params = {
            "audio_path": temp_audio_file,
            "video_path": temp_video_file,
            "output_path": "synced_output.mp4",
            "sync_method": "invalid_method",
        }
        
        response = audio_handler.sync(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "invalid sync method" in response.error.message.lower()
    
    def test_sync_all_methods(self, audio_handler, request_context, temp_audio_file, temp_video_file):
        """Test all valid sync methods."""
        valid_methods = ["auto", "manual", "timecode"]
        
        for sync_method in valid_methods:
            params = {
                "audio_path": temp_audio_file,
                "video_path": temp_video_file,
                "output_path": "synced_output.mp4",
                "sync_method": sync_method,
            }
            
            response = audio_handler.sync(params, request_context)
            
            assert response.status == "success", f"Sync method {sync_method} failed"
            assert response.data["metadata"]["sync_method"] == sync_method


class TestAnalyze:
    """Test storycore.audio.analyze endpoint."""
    
    def test_analyze_success(self, audio_handler, request_context, temp_audio_file):
        """Test successful audio analysis."""
        params = {
            "audio_path": temp_audio_file,
        }
        
        response = audio_handler.analyze(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert "metrics" in response.data
        assert "recommendations" in response.data
        assert "issues" in response.data
        
        metrics = response.data["metrics"]
        assert "audio_path" in metrics
        assert "duration_seconds" in metrics
        assert "sample_rate" in metrics
        assert "bit_depth" in metrics
        assert "channels" in metrics
        assert "peak_level" in metrics
        assert "rms_level" in metrics
        assert "dynamic_range" in metrics
        assert "clarity_score" in metrics
        assert "quality_score" in metrics
        assert 0.0 <= metrics["clarity_score"] <= 1.0
        assert 0.0 <= metrics["quality_score"] <= 1.0
    
    def test_analyze_file_not_found(self, audio_handler, request_context):
        """Test analysis with non-existent audio file."""
        params = {
            "audio_path": "/nonexistent/audio.wav",
        }
        
        response = audio_handler.analyze(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "NOT_FOUND"
        assert "not found" in response.error.message.lower()
    
    def test_analyze_missing_audio_path(self, audio_handler, request_context):
        """Test analysis with missing audio_path parameter."""
        params = {}
        
        response = audio_handler.analyze(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "audio_path" in response.error.message.lower()
    
    def test_analyze_recommendations_present(self, audio_handler, request_context, temp_audio_file):
        """Test that analysis provides recommendations."""
        params = {
            "audio_path": temp_audio_file,
        }
        
        response = audio_handler.analyze(params, request_context)
        
        assert response.status == "success"
        assert len(response.data["recommendations"]) > 0
        assert all(isinstance(rec, str) for rec in response.data["recommendations"])
    
    def test_analyze_metrics_completeness(self, audio_handler, request_context, temp_audio_file):
        """Test that all expected metrics are present."""
        params = {
            "audio_path": temp_audio_file,
        }
        
        response = audio_handler.analyze(params, request_context)
        
        assert response.status == "success"
        metrics = response.data["metrics"]
        
        # Check all required metrics are present
        required_metrics = [
            "audio_path", "duration_seconds", "sample_rate", "bit_depth",
            "channels", "format", "file_size_bytes", "peak_level", "rms_level",
            "dynamic_range", "clarity_score", "quality_score"
        ]
        
        for metric in required_metrics:
            assert metric in metrics, f"Missing metric: {metric}"


class TestEndToEndWorkflow:
    """Test end-to-end audio production workflows."""
    
    def test_voice_to_analysis_workflow(self, audio_handler, request_context):
        """Test workflow: generate voice -> analyze."""
        # Step 1: Generate voice
        voice_params = {
            "text": "This is a test of the complete audio workflow.",
            "voice_id": "voice_001",
        }
        
        voice_response = audio_handler.voice_generate(voice_params, request_context)
        assert voice_response.status == "success"
        
        # Note: In a real scenario, we would analyze the generated file
        # For now, we just verify the workflow structure
        assert "audio_path" in voice_response.data
    
    def test_music_to_effects_workflow(self, audio_handler, request_context):
        """Test workflow: generate music -> add effects."""
        # Step 1: Generate music
        music_params = {
            "mood": "upbeat",
            "duration_seconds": 30.0,
        }
        
        music_response = audio_handler.music_generate(music_params, request_context)
        assert music_response.status == "success"
        
        # Note: In a real scenario, we would apply effects to the generated file
        assert "audio_path" in music_response.data
    
    def test_complete_production_workflow(self, audio_handler, request_context, temp_audio_file, temp_video_file):
        """Test complete workflow: mix -> sync -> analyze."""
        # Step 1: Mix tracks
        mix_params = {
            "tracks": [
                {"path": temp_audio_file, "name": "Track 1"},
                {"path": temp_audio_file, "name": "Track 2"},
            ],
            "output_path": "mixed_output.wav",
        }
        
        mix_response = audio_handler.mix(mix_params, request_context)
        assert mix_response.status == "success"
        
        # Step 2: Sync with video (using temp file for testing)
        sync_params = {
            "audio_path": temp_audio_file,
            "video_path": temp_video_file,
            "output_path": "synced_output.mp4",
        }
        
        sync_response = audio_handler.sync(sync_params, request_context)
        assert sync_response.status == "success"
        
        # Step 3: Analyze audio quality
        analyze_params = {
            "audio_path": temp_audio_file,
        }
        
        analyze_response = audio_handler.analyze(analyze_params, request_context)
        assert analyze_response.status == "success"
        assert "quality_score" in analyze_response.data["metrics"]
