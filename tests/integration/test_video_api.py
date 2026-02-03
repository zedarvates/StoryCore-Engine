"""
Integration tests for Video API category.

Tests all video processing endpoints including assembly, transitions,
effects, rendering, and preview generation.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

from src.api.config import APIConfig
from src.api.router import APIRouter
from src.api.models import RequestContext
from src.api.categories.video import VideoCategoryHandler


@pytest.fixture
def api_config():
    """Create test API configuration."""
    return APIConfig(
        version="v1",
        log_api_calls=True,
        log_sanitize_params=False,
    )


@pytest.fixture
def router(api_config):
    """Create API router."""
    return APIRouter(api_config)


@pytest.fixture
def handler(api_config, router):
    """Create video category handler."""
    return VideoCategoryHandler(api_config, router)


@pytest.fixture
def request_context():
    """Create test request context."""
    return RequestContext(
        request_id="test_req_001",
        user=None,
    )


@pytest.fixture
def temp_dir():
    """Create temporary directory for test files."""
    temp_path = tempfile.mkdtemp()
    yield temp_path
    shutil.rmtree(temp_path, ignore_errors=True)


@pytest.fixture
def mock_video_file(temp_dir):
    """Create a mock video file for testing."""
    video_path = Path(temp_dir) / "test_video.mp4"
    video_path.write_text("mock video content")
    return str(video_path)


@pytest.fixture
def mock_shot_files(temp_dir):
    """Create multiple mock video shot files."""
    shots = []
    for i in range(3):
        shot_path = Path(temp_dir) / f"shot_{i+1}.mp4"
        shot_path.write_text(f"mock shot {i+1} content")
        shots.append({
            "shot_id": f"shot_{i+1:03d}",
            "video_path": str(shot_path),
            "duration_seconds": 3.0 + i,
        })
    return shots


class TestVideoAssemble:
    """Tests for storycore.video.assemble endpoint."""
    
    def test_assemble_success(self, handler, request_context, temp_dir, mock_shot_files):
        """Test successful video assembly."""
        output_path = str(Path(temp_dir) / "assembled.mp4")
        
        params = {
            "project_name": "test-project",
            "shots": mock_shot_files,
            "output_path": output_path,
            "output_format": "mp4",
            "resolution": "1920x1080",
            "framerate": 30,
            "codec": "h264",
        }
        
        response = handler.assemble(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert response.data["video_path"] == output_path
        assert response.data["project_name"] == "test-project"
        assert response.data["total_shots"] == 3
        assert response.data["duration_seconds"] > 0
        assert response.data["resolution"] == "1920x1080"
        assert response.data["framerate"] == 30
        assert response.data["format"] == "mp4"
        assert response.data["file_size_bytes"] > 0
        assert response.data["processing_time_ms"] >= 0
    
    def test_assemble_missing_required_params(self, handler, request_context):
        """Test assembly with missing required parameters."""
        params = {
            "project_name": "test-project",
            # Missing shots and output_path
        }
        
        response = handler.assemble(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "missing required parameters" in response.error.message.lower()
    
    def test_assemble_empty_shots(self, handler, request_context, temp_dir):
        """Test assembly with empty shots list."""
        params = {
            "project_name": "test-project",
            "shots": [],
            "output_path": str(Path(temp_dir) / "output.mp4"),
        }
        
        response = handler.assemble(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "at least one shot" in response.error.message.lower()
    
    def test_assemble_invalid_resolution(self, handler, request_context, temp_dir, mock_shot_files):
        """Test assembly with invalid resolution format."""
        params = {
            "project_name": "test-project",
            "shots": mock_shot_files,
            "output_path": str(Path(temp_dir) / "output.mp4"),
            "resolution": "invalid",
        }
        
        response = handler.assemble(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "resolution" in response.error.message.lower()
    
    def test_assemble_invalid_framerate(self, handler, request_context, temp_dir, mock_shot_files):
        """Test assembly with invalid framerate."""
        params = {
            "project_name": "test-project",
            "shots": mock_shot_files,
            "output_path": str(Path(temp_dir) / "output.mp4"),
            "framerate": 0,
        }
        
        response = handler.assemble(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "framerate" in response.error.message.lower()
    
    def test_assemble_missing_shot_fields(self, handler, request_context, temp_dir):
        """Test assembly with shots missing required fields."""
        params = {
            "project_name": "test-project",
            "shots": [
                {"shot_id": "shot_001"}  # Missing video_path
            ],
            "output_path": str(Path(temp_dir) / "output.mp4"),
        }
        
        response = handler.assemble(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "missing required fields" in response.error.message.lower()
    
    def test_assemble_nonexistent_shot_file(self, handler, request_context, temp_dir):
        """Test assembly with nonexistent shot video file."""
        params = {
            "project_name": "test-project",
            "shots": [
                {
                    "shot_id": "shot_001",
                    "video_path": "/nonexistent/video.mp4",
                }
            ],
            "output_path": str(Path(temp_dir) / "output.mp4"),
        }
        
        response = handler.assemble(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "NOT_FOUND"
        assert "not found" in response.error.message.lower()


class TestVideoTransitionAdd:
    """Tests for storycore.video.transition.add endpoint."""
    
    def test_transition_add_success(self, handler, request_context, temp_dir, mock_video_file):
        """Test successful transition addition."""
        output_path = str(Path(temp_dir) / "video_with_transition.mp4")
        
        params = {
            "video_path": mock_video_file,
            "shot_index": 0,
            "transition_type": "fade",
            "transition_duration_seconds": 0.5,
            "output_path": output_path,
        }
        
        response = handler.transition_add(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert response.data["video_path"] == output_path
        assert response.data["original_path"] == mock_video_file
        assert response.data["shot_index"] == 0
        assert response.data["transition_type"] == "fade"
        assert response.data["transition_duration_seconds"] == 0.5
        assert response.data["total_duration_seconds"] > 0
        assert response.data["processing_time_ms"] >= 0
    
    def test_transition_add_auto_output_path(self, handler, request_context, mock_video_file):
        """Test transition addition with auto-generated output path."""
        params = {
            "video_path": mock_video_file,
            "shot_index": 1,
            "transition_type": "dissolve",
        }
        
        response = handler.transition_add(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert "transition" in response.data["video_path"]
    
    def test_transition_add_missing_params(self, handler, request_context):
        """Test transition addition with missing parameters."""
        params = {
            "video_path": "/some/video.mp4",
            # Missing shot_index and transition_type
        }
        
        response = handler.transition_add(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_transition_add_nonexistent_video(self, handler, request_context):
        """Test transition addition with nonexistent video file."""
        params = {
            "video_path": "/nonexistent/video.mp4",
            "shot_index": 0,
            "transition_type": "fade",
        }
        
        response = handler.transition_add(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "NOT_FOUND"
    
    def test_transition_add_invalid_type(self, handler, request_context, mock_video_file):
        """Test transition addition with invalid transition type."""
        params = {
            "video_path": mock_video_file,
            "shot_index": 0,
            "transition_type": "invalid_transition",
        }
        
        response = handler.transition_add(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "transition type" in response.error.message.lower()
    
    def test_transition_add_negative_shot_index(self, handler, request_context, mock_video_file):
        """Test transition addition with negative shot index."""
        params = {
            "video_path": mock_video_file,
            "shot_index": -1,
            "transition_type": "fade",
        }
        
        response = handler.transition_add(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "shot index" in response.error.message.lower()
    
    def test_transition_add_invalid_duration(self, handler, request_context, mock_video_file):
        """Test transition addition with invalid duration."""
        params = {
            "video_path": mock_video_file,
            "shot_index": 0,
            "transition_type": "fade",
            "transition_duration_seconds": 10.0,  # Too long
        }
        
        response = handler.transition_add(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "duration" in response.error.message.lower()


class TestVideoEffectsApply:
    """Tests for storycore.video.effects.apply endpoint."""
    
    def test_effects_apply_success(self, handler, request_context, temp_dir, mock_video_file):
        """Test successful effects application."""
        output_path = str(Path(temp_dir) / "video_with_effects.mp4")
        
        params = {
            "video_path": mock_video_file,
            "effects": [
                {
                    "effect_type": "color_grade",
                    "parameters": {"brightness": 1.2, "contrast": 1.1},
                },
                {
                    "effect_type": "sharpen",
                    "parameters": {"amount": 0.5},
                },
            ],
            "output_path": output_path,
        }
        
        response = handler.effects_apply(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert response.data["video_path"] == output_path
        assert response.data["original_path"] == mock_video_file
        assert response.data["effects_applied"] == 2
        assert response.data["duration_seconds"] > 0
        assert response.data["processing_time_ms"] >= 0
    
    def test_effects_apply_single_effect(self, handler, request_context, mock_video_file):
        """Test applying a single effect."""
        params = {
            "video_path": mock_video_file,
            "effects": [
                {"effect_type": "blur", "parameters": {"radius": 5}},
            ],
        }
        
        response = handler.effects_apply(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert response.data["effects_applied"] == 1
    
    def test_effects_apply_missing_params(self, handler, request_context):
        """Test effects application with missing parameters."""
        params = {
            "video_path": "/some/video.mp4",
            # Missing effects
        }
        
        response = handler.effects_apply(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_effects_apply_nonexistent_video(self, handler, request_context):
        """Test effects application with nonexistent video file."""
        params = {
            "video_path": "/nonexistent/video.mp4",
            "effects": [{"effect_type": "blur"}],
        }
        
        response = handler.effects_apply(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "NOT_FOUND"
    
    def test_effects_apply_empty_effects(self, handler, request_context, mock_video_file):
        """Test effects application with empty effects list."""
        params = {
            "video_path": mock_video_file,
            "effects": [],
        }
        
        response = handler.effects_apply(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "at least one effect" in response.error.message.lower()
    
    def test_effects_apply_missing_effect_type(self, handler, request_context, mock_video_file):
        """Test effects application with missing effect_type."""
        params = {
            "video_path": mock_video_file,
            "effects": [
                {"parameters": {"amount": 0.5}},  # Missing effect_type
            ],
        }
        
        response = handler.effects_apply(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "effect_type" in response.error.message.lower()
    
    def test_effects_apply_invalid_effect_type(self, handler, request_context, mock_video_file):
        """Test effects application with invalid effect type."""
        params = {
            "video_path": mock_video_file,
            "effects": [
                {"effect_type": "invalid_effect"},
            ],
        }
        
        response = handler.effects_apply(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "effect type" in response.error.message.lower()


class TestVideoRender:
    """Tests for storycore.video.render endpoint."""
    
    def test_render_success(self, handler, request_context, temp_dir, mock_video_file):
        """Test successful video rendering."""
        output_path = str(Path(temp_dir) / "rendered.mp4")
        
        params = {
            "project_name": "test-project",
            "video_path": mock_video_file,
            "output_path": output_path,
            "output_format": "mp4",
            "resolution": "1920x1080",
            "framerate": 30,
            "codec": "h264",
            "bitrate": "5M",
            "quality": "high",
        }
        
        response = handler.render(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert response.data["video_path"] == output_path
        assert response.data["project_name"] == "test-project"
        assert response.data["duration_seconds"] > 0
        assert response.data["resolution"] == "1920x1080"
        assert response.data["framerate"] == 30
        assert response.data["format"] == "mp4"
        assert response.data["codec"] == "h264"
        assert response.data["bitrate"] == "5M"
        assert response.data["file_size_bytes"] > 0
        assert response.data["rendering_time_ms"] >= 0
        assert 0.0 <= response.data["quality_score"] <= 1.0
    
    def test_render_different_qualities(self, handler, request_context, temp_dir, mock_video_file):
        """Test rendering with different quality settings."""
        qualities = ["low", "medium", "high", "ultra"]
        
        for quality in qualities:
            output_path = str(Path(temp_dir) / f"rendered_{quality}.mp4")
            params = {
                "project_name": "test-project",
                "video_path": mock_video_file,
                "output_path": output_path,
                "quality": quality,
            }
            
            response = handler.render(params, request_context)
            
            assert response.status == "success"
            assert response.data is not None
            assert response.data["quality_score"] > 0
    
    def test_render_missing_params(self, handler, request_context):
        """Test rendering with missing parameters."""
        params = {
            "project_name": "test-project",
            # Missing video_path and output_path
        }
        
        response = handler.render(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_render_nonexistent_video(self, handler, request_context, temp_dir):
        """Test rendering with nonexistent video file."""
        params = {
            "project_name": "test-project",
            "video_path": "/nonexistent/video.mp4",
            "output_path": str(Path(temp_dir) / "output.mp4"),
        }
        
        response = handler.render(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "NOT_FOUND"
    
    def test_render_invalid_resolution(self, handler, request_context, temp_dir, mock_video_file):
        """Test rendering with invalid resolution."""
        params = {
            "project_name": "test-project",
            "video_path": mock_video_file,
            "output_path": str(Path(temp_dir) / "output.mp4"),
            "resolution": "invalid",
        }
        
        response = handler.render(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "resolution" in response.error.message.lower()
    
    def test_render_invalid_framerate(self, handler, request_context, temp_dir, mock_video_file):
        """Test rendering with invalid framerate."""
        params = {
            "project_name": "test-project",
            "video_path": mock_video_file,
            "output_path": str(Path(temp_dir) / "output.mp4"),
            "framerate": 200,  # Too high
        }
        
        response = handler.render(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "framerate" in response.error.message.lower()
    
    def test_render_invalid_quality(self, handler, request_context, temp_dir, mock_video_file):
        """Test rendering with invalid quality setting."""
        params = {
            "project_name": "test-project",
            "video_path": mock_video_file,
            "output_path": str(Path(temp_dir) / "output.mp4"),
            "quality": "invalid_quality",
        }
        
        response = handler.render(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "quality" in response.error.message.lower()


class TestVideoPreview:
    """Tests for storycore.video.preview endpoint."""
    
    def test_preview_success(self, handler, request_context, temp_dir, mock_video_file):
        """Test successful preview generation."""
        output_path = str(Path(temp_dir) / "preview.mp4")
        
        params = {
            "video_path": mock_video_file,
            "output_path": output_path,
            "resolution": "640x360",
            "framerate": 15,
            "quality": "low",
        }
        
        response = handler.preview(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert response.data["preview_path"] == output_path
        assert response.data["original_path"] == mock_video_file
        assert response.data["duration_seconds"] > 0
        assert response.data["resolution"] == "640x360"
        assert response.data["framerate"] == 15
        assert response.data["file_size_bytes"] > 0
        assert response.data["compression_ratio"] > 0
        assert response.data["generation_time_ms"] >= 0
    
    def test_preview_auto_output_path(self, handler, request_context, mock_video_file):
        """Test preview generation with auto-generated output path."""
        params = {
            "video_path": mock_video_file,
        }
        
        response = handler.preview(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert "preview" in response.data["preview_path"]
    
    def test_preview_with_max_duration(self, handler, request_context, mock_video_file):
        """Test preview generation with max duration limit."""
        params = {
            "video_path": mock_video_file,
            "max_duration_seconds": 10.0,
        }
        
        response = handler.preview(params, request_context)
        
        assert response.status == "success"
        assert response.data is not None
        assert response.data["duration_seconds"] <= 10.0
    
    def test_preview_missing_params(self, handler, request_context):
        """Test preview generation with missing parameters."""
        params = {}
        
        response = handler.preview(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_preview_nonexistent_video(self, handler, request_context):
        """Test preview generation with nonexistent video file."""
        params = {
            "video_path": "/nonexistent/video.mp4",
        }
        
        response = handler.preview(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "NOT_FOUND"
    
    def test_preview_invalid_resolution(self, handler, request_context, mock_video_file):
        """Test preview generation with invalid resolution."""
        params = {
            "video_path": mock_video_file,
            "resolution": "invalid",
        }
        
        response = handler.preview(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "resolution" in response.error.message.lower()
    
    def test_preview_invalid_framerate(self, handler, request_context, mock_video_file):
        """Test preview generation with invalid framerate."""
        params = {
            "video_path": mock_video_file,
            "framerate": 100,  # Too high for preview
        }
        
        response = handler.preview(params, request_context)
        
        assert response.status == "error"
        assert response.error is not None
        assert response.error.code == "VALIDATION_ERROR"
        assert "framerate" in response.error.message.lower()


class TestVideoEndpointIntegration:
    """Integration tests for video endpoint workflows."""
    
    def test_complete_video_workflow(self, handler, request_context, temp_dir, mock_shot_files):
        """Test complete video processing workflow."""
        # Step 1: Assemble video from shots
        assembled_path = str(Path(temp_dir) / "assembled.mp4")
        assemble_params = {
            "project_name": "test-project",
            "shots": mock_shot_files,
            "output_path": assembled_path,
        }
        
        assemble_response = handler.assemble(assemble_params, request_context)
        assert assemble_response.status == "success"
        
        # Create the assembled file for subsequent steps
        Path(assembled_path).write_text("assembled video content")
        
        # Step 2: Add transition
        transition_path = str(Path(temp_dir) / "with_transition.mp4")
        transition_params = {
            "video_path": assembled_path,
            "shot_index": 0,
            "transition_type": "fade",
            "output_path": transition_path,
        }
        
        transition_response = handler.transition_add(transition_params, request_context)
        assert transition_response.status == "success"
        
        # Create the transition file for subsequent steps
        Path(transition_path).write_text("video with transition")
        
        # Step 3: Apply effects
        effects_path = str(Path(temp_dir) / "with_effects.mp4")
        effects_params = {
            "video_path": transition_path,
            "effects": [
                {"effect_type": "color_grade", "parameters": {"brightness": 1.1}},
            ],
            "output_path": effects_path,
        }
        
        effects_response = handler.effects_apply(effects_params, request_context)
        assert effects_response.status == "success"
        
        # Create the effects file for subsequent steps
        Path(effects_path).write_text("video with effects")
        
        # Step 4: Render final video
        rendered_path = str(Path(temp_dir) / "final.mp4")
        render_params = {
            "project_name": "test-project",
            "video_path": effects_path,
            "output_path": rendered_path,
            "quality": "high",
        }
        
        render_response = handler.render(render_params, request_context)
        assert render_response.status == "success"
        
        # Create the rendered file for preview
        Path(rendered_path).write_text("final rendered video")
        
        # Step 5: Generate preview
        preview_params = {
            "video_path": rendered_path,
        }
        
        preview_response = handler.preview(preview_params, request_context)
        assert preview_response.status == "success"
        
        # Verify all steps completed successfully
        assert assemble_response.data["total_shots"] == 3
        assert transition_response.data["transition_type"] == "fade"
        assert effects_response.data["effects_applied"] == 1
        assert render_response.data["quality_score"] > 0
        assert preview_response.data["compression_ratio"] > 0
    
    def test_endpoint_error_handling_consistency(self, handler, request_context):
        """Test that all endpoints handle errors consistently."""
        endpoints = [
            ("assemble", {"project_name": "test", "shots": [], "output_path": "/tmp/out.mp4"}),
            ("transition_add", {"video_path": "/nonexistent.mp4", "shot_index": 0, "transition_type": "fade"}),
            ("effects_apply", {"video_path": "/nonexistent.mp4", "effects": [{"effect_type": "blur"}]}),
            ("render", {"project_name": "test", "video_path": "/nonexistent.mp4", "output_path": "/tmp/out.mp4"}),
            ("preview", {"video_path": "/nonexistent.mp4"}),
        ]
        
        for endpoint_name, params in endpoints:
            endpoint = getattr(handler, endpoint_name)
            response = endpoint(params, request_context)
            
            # All should return error responses
            assert response.status == "error"
            assert response.error is not None
            assert response.error.code in ["VALIDATION_ERROR", "NOT_FOUND"]
            assert response.metadata is not None
            assert response.metadata.request_id == request_context.request_id
