"""
Integration tests for Image and Concept Art API endpoints.

Tests all 8 image generation and manipulation endpoints with realistic scenarios.
"""

import pytest
import uuid
import tempfile
import shutil
from pathlib import Path

from src.api.config import APIConfig
from src.api.router import APIRouter
from src.api.models import RequestContext
from src.api.categories.image import ImageCategoryHandler


@pytest.fixture
def api_config():
    """Create test API configuration."""
    return APIConfig(
        version="v1",
        log_api_calls=True,
        log_sanitize_params=True,
    )


@pytest.fixture
def router(api_config):
    """Create test router."""
    return APIRouter(api_config)


@pytest.fixture
def handler(api_config, router):
    """Create image handler."""
    return ImageCategoryHandler(api_config, router)


@pytest.fixture
def context():
    """Create test request context."""
    return RequestContext(
        request_id=str(uuid.uuid4()),
        user=None,
    )


@pytest.fixture
def temp_project(tmp_path):
    """Create a temporary test project."""
    project_name = "test-project"
    project_path = tmp_path / project_name
    project_path.mkdir()
    
    # Create project structure
    (project_path / "assets" / "images" / "panels").mkdir(parents=True)
    (project_path / "assets" / "images" / "promoted").mkdir(parents=True)
    
    # Create project.json
    import json
    project_json = {
        "schema_version": "1.0",
        "project_id": str(uuid.uuid4()),
        "project_name": project_name,
        "capabilities": {
            "grid_generation": True,
            "promotion_engine": True,
        },
        "generation_status": {
            "grid": "pending",
            "promotion": "pending",
        },
    }
    
    with open(project_path / "project.json", "w") as f:
        json.dump(project_json, f, indent=2)
    
    yield {
        "name": project_name,
        "path": project_path,
        "base_path": str(tmp_path),
    }
    
    # Cleanup
    shutil.rmtree(project_path, ignore_errors=True)


@pytest.fixture
def temp_image(tmp_path):
    """Create a temporary test image."""
    try:
        from PIL import Image
        import numpy as np
        
        # Create a simple test image
        img_array = np.random.randint(0, 255, (512, 512, 3), dtype=np.uint8)
        img = Image.fromarray(img_array)
        
        img_path = tmp_path / "test_image.png"
        img.save(img_path)
        
        yield str(img_path)
        
        # Cleanup
        if img_path.exists():
            img_path.unlink()
    except ImportError:
        # If PIL not available, create a dummy file
        img_path = tmp_path / "test_image.png"
        img_path.write_text("dummy image")
        yield str(img_path)
        if img_path.exists():
            img_path.unlink()


class TestImageGeneration:
    """Test image generation endpoints."""
    
    def test_generate_image_basic(self, handler, context):
        """Test basic image generation."""
        params = {
            "prompt": "A beautiful landscape with mountains",
        }
        
        response = handler.generate_image(params, context)
        
        assert response.status == "success"
        assert "image_path" in response.data
        assert response.data["width"] == 512
        assert response.data["height"] == 512
        assert "seed" in response.data
        assert "generation_time" in response.data

    
    def test_generate_image_with_custom_dimensions(self, handler, context):
        """Test image generation with custom dimensions."""
        params = {
            "prompt": "A portrait of a character",
            "width": 768,
            "height": 1024,
        }
        
        response = handler.generate_image(params, context)
        
        assert response.status == "success"
        assert response.data["width"] == 768
        assert response.data["height"] == 1024
    
    def test_generate_image_with_seed(self, handler, context):
        """Test image generation with specific seed."""
        params = {
            "prompt": "A landscape",
            "seed": 12345,
        }
        
        response = handler.generate_image(params, context)
        
        assert response.status == "success"
        assert response.data["seed"] == 12345
    
    def test_generate_image_without_prompt_fails(self, handler, context):
        """Test that generation without prompt fails."""
        response = handler.generate_image({}, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
        assert "prompt" in response.error.details["missing_fields"]
    
    def test_generate_image_with_invalid_dimensions_fails(self, handler, context):
        """Test that invalid dimensions fail."""
        params = {
            "prompt": "Test",
            "width": -100,
            "height": 512,
        }
        
        response = handler.generate_image(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"


class TestGridCreation:
    """Test grid creation endpoints."""
    
    def test_create_grid_basic(self, handler, context, temp_project):
        """Test basic grid creation."""
        params = {
            "project_name": temp_project["name"],
            "base_path": temp_project["base_path"],
        }
        
        response = handler.create_grid(params, context)
        
        assert response.status == "success"
        assert response.data["project_name"] == temp_project["name"]
        assert response.data["grid_format"] == "3x3"
        assert response.data["total_panels"] == 9
        assert len(response.data["panel_paths"]) == 9
    
    def test_create_grid_with_custom_format(self, handler, context, temp_project):
        """Test grid creation with custom format."""
        params = {
            "project_name": temp_project["name"],
            "grid_format": "1x2",
            "base_path": temp_project["base_path"],
        }
        
        response = handler.create_grid(params, context)
        
        assert response.status == "success"
        assert response.data["grid_format"] == "1x2"
        assert response.data["total_panels"] == 2
    
    def test_create_grid_with_custom_cell_size(self, handler, context, temp_project):
        """Test grid creation with custom cell size."""
        params = {
            "project_name": temp_project["name"],
            "cell_size": 1024,
            "base_path": temp_project["base_path"],
        }
        
        response = handler.create_grid(params, context)
        
        assert response.status == "success"
        assert response.data["cell_size"] == 1024
    
    def test_create_grid_for_nonexistent_project_fails(self, handler, context):
        """Test that grid creation for nonexistent project fails."""
        params = {
            "project_name": "nonexistent-project",
        }
        
        response = handler.create_grid(params, context)
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"
    
    def test_create_grid_with_invalid_format_fails(self, handler, context, temp_project):
        """Test that invalid grid format fails."""
        params = {
            "project_name": temp_project["name"],
            "grid_format": "5x5",
            "base_path": temp_project["base_path"],
        }
        
        response = handler.create_grid(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_create_grid_with_invalid_cell_size_fails(self, handler, context, temp_project):
        """Test that invalid cell size fails."""
        params = {
            "project_name": temp_project["name"],
            "cell_size": -100,
            "base_path": temp_project["base_path"],
        }
        
        response = handler.create_grid(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"


class TestPanelPromotion:
    """Test panel promotion endpoints."""
    
    def test_promote_panel_basic(self, handler, context, temp_project):
        """Test basic panel promotion."""
        params = {
            "project_name": temp_project["name"],
            "base_path": temp_project["base_path"],
        }
        
        response = handler.promote_panel(params, context)
        
        assert response.status == "success"
        assert response.data["project_name"] == temp_project["name"]
        assert "output_dir" in response.data
    
    def test_promote_panel_with_custom_scale(self, handler, context, temp_project):
        """Test panel promotion with custom scale."""
        params = {
            "project_name": temp_project["name"],
            "scale": 4,
            "base_path": temp_project["base_path"],
        }
        
        response = handler.promote_panel(params, context)
        
        assert response.status == "success"
    
    def test_promote_panel_with_custom_method(self, handler, context, temp_project):
        """Test panel promotion with custom upscale method."""
        params = {
            "project_name": temp_project["name"],
            "method": "bicubic",
            "base_path": temp_project["base_path"],
        }
        
        response = handler.promote_panel(params, context)
        
        assert response.status == "success"
    
    def test_promote_panel_with_invalid_scale_fails(self, handler, context, temp_project):
        """Test that invalid scale fails."""
        params = {
            "project_name": temp_project["name"],
            "scale": -2,
            "base_path": temp_project["base_path"],
        }
        
        response = handler.promote_panel(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_promote_panel_with_invalid_method_fails(self, handler, context, temp_project):
        """Test that invalid upscale method fails."""
        params = {
            "project_name": temp_project["name"],
            "method": "invalid_method",
            "base_path": temp_project["base_path"],
        }
        
        response = handler.promote_panel(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"


class TestImageRefinement:
    """Test image refinement endpoints."""
    
    def test_refine_image_basic(self, handler, context, temp_image):
        """Test basic image refinement."""
        params = {
            "image_path": temp_image,
        }
        
        response = handler.refine_image(params, context)
        
        assert response.status == "success"
        assert response.data["original_path"] == temp_image
        assert "refined_path" in response.data
        assert "improvements" in response.data
    
    def test_refine_image_with_custom_settings(self, handler, context, temp_image):
        """Test image refinement with custom settings."""
        params = {
            "image_path": temp_image,
            "denoising_strength": 0.5,
            "sharpen": True,
            "enhance_contrast": True,
        }
        
        response = handler.refine_image(params, context)
        
        assert response.status == "success"
        assert response.data["improvements"]["sharpness_improved"] is True
        assert response.data["improvements"]["contrast_enhanced"] is True
    
    def test_refine_nonexistent_image_fails(self, handler, context):
        """Test that refining nonexistent image fails."""
        params = {
            "image_path": "/nonexistent/image.png",
        }
        
        response = handler.refine_image(params, context)
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"
    
    def test_refine_with_invalid_denoising_strength_fails(self, handler, context, temp_image):
        """Test that invalid denoising strength fails."""
        params = {
            "image_path": temp_image,
            "denoising_strength": 1.5,
        }
        
        response = handler.refine_image(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"


class TestImageAnalysis:
    """Test image analysis endpoints."""
    
    def test_analyze_image_basic(self, handler, context, temp_image):
        """Test basic image analysis."""
        params = {
            "image_path": temp_image,
        }
        
        response = handler.analyze_image(params, context)
        
        assert response.status == "success"
        assert "metrics" in response.data
        assert "laplacian_variance" in response.data["metrics"]
        assert "sharpness_score" in response.data["metrics"]
        assert "quality_grade" in response.data["metrics"]
    
    def test_analyze_image_with_histogram(self, handler, context, temp_image):
        """Test image analysis with histogram."""
        params = {
            "image_path": temp_image,
            "include_histogram": True,
        }
        
        response = handler.analyze_image(params, context)
        
        assert response.status == "success"
        # Histogram may be None if PIL not available
        if response.data["histogram"] is not None:
            assert isinstance(response.data["histogram"], dict)
    
    def test_analyze_image_with_color_analysis(self, handler, context, temp_image):
        """Test image analysis with color analysis."""
        params = {
            "image_path": temp_image,
            "include_color_analysis": True,
        }
        
        response = handler.analyze_image(params, context)
        
        assert response.status == "success"
        # Color analysis may be None if PIL not available
        if response.data["color_analysis"] is not None:
            assert isinstance(response.data["color_analysis"], dict)
    
    def test_analyze_nonexistent_image_fails(self, handler, context):
        """Test that analyzing nonexistent image fails."""
        params = {
            "image_path": "/nonexistent/image.png",
        }
        
        response = handler.analyze_image(params, context)
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"


class TestStyleExtraction:
    """Test style extraction endpoints."""
    
    def test_extract_style_basic(self, handler, context, temp_image):
        """Test basic style extraction."""
        params = {
            "reference_image_path": temp_image,
        }
        
        response = handler.extract_style(params, context)
        
        assert response.status == "success"
        assert "style_parameters" in response.data
        assert "dominant_colors" in response.data["style_parameters"]
        assert "lighting_style" in response.data["style_parameters"]
    
    def test_extract_style_with_custom_options(self, handler, context, temp_image):
        """Test style extraction with custom options."""
        params = {
            "reference_image_path": temp_image,
            "extract_colors": True,
            "extract_composition": True,
            "extract_lighting": True,
        }
        
        response = handler.extract_style(params, context)
        
        assert response.status == "success"
        assert "style_parameters" in response.data
    
    def test_extract_style_from_nonexistent_image_fails(self, handler, context):
        """Test that extracting style from nonexistent image fails."""
        params = {
            "reference_image_path": "/nonexistent/image.png",
        }
        
        response = handler.extract_style(params, context)
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"


class TestStyleApplication:
    """Test style application endpoints."""
    
    def test_apply_style_basic(self, handler, context, temp_image):
        """Test basic style application."""
        params = {
            "target_image_path": temp_image,
            "style_parameters": {
                "dominant_colors": ["#FF0000", "#00FF00"],
                "lighting_style": "bright",
            },
        }
        
        response = handler.apply_style(params, context)
        
        assert response.status == "success"
        assert response.data["original_path"] == temp_image
        assert "styled_path" in response.data
        assert "style_applied" in response.data
    
    def test_apply_style_with_custom_strength(self, handler, context, temp_image):
        """Test style application with custom strength."""
        params = {
            "target_image_path": temp_image,
            "style_parameters": {"lighting_style": "dark"},
            "strength": 0.5,
        }
        
        response = handler.apply_style(params, context)
        
        assert response.status == "success"
        assert response.data["style_applied"]["strength"] == 0.5
    
    def test_apply_style_with_invalid_strength_fails(self, handler, context, temp_image):
        """Test that invalid strength fails."""
        params = {
            "target_image_path": temp_image,
            "style_parameters": {},
            "strength": 1.5,
        }
        
        response = handler.apply_style(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_apply_style_to_nonexistent_image_fails(self, handler, context):
        """Test that applying style to nonexistent image fails."""
        params = {
            "target_image_path": "/nonexistent/image.png",
            "style_parameters": {},
        }
        
        response = handler.apply_style(params, context)
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"


class TestBatchProcessing:
    """Test batch processing endpoints."""
    
    def test_batch_process_analyze(self, handler, context, temp_image):
        """Test batch image analysis."""
        params = {
            "image_paths": [temp_image],
            "operation": "analyze",
        }
        
        response = handler.batch_process(params, context)
        
        assert response.status == "success"
        assert response.data["total_images"] == 1
        assert response.data["successful"] >= 0
        assert "results" in response.data
    
    def test_batch_process_refine(self, handler, context, temp_image):
        """Test batch image refinement."""
        params = {
            "image_paths": [temp_image],
            "operation": "refine",
            "parameters": {
                "denoising_strength": 0.3,
                "sharpen": True,
            },
        }
        
        response = handler.batch_process(params, context)
        
        assert response.status == "success"
        assert response.data["total_images"] == 1
    
    def test_batch_process_with_invalid_operation_fails(self, handler, context, temp_image):
        """Test that invalid operation fails."""
        params = {
            "image_paths": [temp_image],
            "operation": "invalid_operation",
        }
        
        response = handler.batch_process(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_batch_process_with_empty_paths_fails(self, handler, context):
        """Test that empty image paths fails."""
        params = {
            "image_paths": [],
            "operation": "analyze",
        }
        
        response = handler.batch_process(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_batch_process_handles_missing_images(self, handler, context, temp_image):
        """Test that batch processing handles missing images gracefully."""
        params = {
            "image_paths": [temp_image, "/nonexistent/image.png"],
            "operation": "analyze",
        }
        
        response = handler.batch_process(params, context)
        
        assert response.status == "success"
        assert response.data["failed"] >= 1
        assert len(response.data["errors"]) >= 1


class TestResponseMetadata:
    """Test response metadata."""
    
    def test_response_includes_metadata(self, handler, context):
        """Test that all responses include proper metadata."""
        params = {
            "prompt": "Test image",
        }
        
        response = handler.generate_image(params, context)
        
        assert response.metadata is not None
        assert response.metadata.request_id == context.request_id
        assert response.metadata.api_version == "v1"
        assert response.metadata.timestamp is not None
        assert response.metadata.duration_ms >= 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
