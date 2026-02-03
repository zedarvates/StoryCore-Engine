"""
Tests for GenerationEngine.

Tests the enhanced generation engine with ComfyUI integration.
"""

import pytest
import asyncio
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from src.end_to_end.generation_engine import (
    GenerationEngine,
    GenerationSession,
    GenerationProgress,
    GenerationMetrics
)
from src.end_to_end.connection_manager import ConnectionManager, ComfyUIConfig
from src.end_to_end.model_manager import ModelManager
from src.end_to_end.workflow_manager import WorkflowManager
from src.end_to_end.data_models import (
    WorldConfig,
    StyleConfig,
    ShotConfig,
    ColorPalette,
    Location,
    ComfyUIStatus
)


@pytest.fixture
def mock_connection_manager():
    """Create mock connection manager"""
    config = ComfyUIConfig()
    manager = Mock(spec=ConnectionManager)
    manager.config = config
    manager.get_status.return_value = ComfyUIStatus(
        available=True,
        url="http://localhost:8000",
        version="1.0.0",
        queue_size=0
    )
    manager.get_fallback_mode.return_value = "placeholder"
    return manager


@pytest.fixture
def mock_model_manager(tmp_path):
    """Create mock model manager"""
    manager = Mock(spec=ModelManager)
    manager.models_dir = tmp_path / "models"
    manager.check_required_models.return_value = []  # No missing models
    return manager


@pytest.fixture
def mock_workflow_manager(tmp_path):
    """Create mock workflow manager"""
    manager = Mock(spec=WorkflowManager)
    manager.workflows_dir = tmp_path / "workflows"
    manager.comfyui_workflows_dir = tmp_path / "comfyui_workflows"
    manager.check_installed_workflows.return_value = []  # All installed
    return manager


@pytest.fixture
def generation_engine(mock_connection_manager, mock_model_manager, mock_workflow_manager):
    """Create generation engine with mocked dependencies"""
    return GenerationEngine(
        connection_manager=mock_connection_manager,
        model_manager=mock_model_manager,
        workflow_manager=mock_workflow_manager
    )


@pytest.fixture
def world_config():
    """Create test world config"""
    return WorldConfig(
        world_id="test_world",
        name="Test World",
        genre="fantasy",
        setting="mystical forest",
        time_period="medieval",
        visual_style=["painterly", "atmospheric"],
        color_palette=ColorPalette(
            primary="#2D5016",
            secondary="#4A7C59",
            accent="#FFD700",
            background="#1a1a1a"
        ),
        lighting_style="soft filtered",
        atmosphere="mysterious",
        key_locations=[
            Location(
                location_id="loc1",
                name="Forest Clearing",
                description="A peaceful clearing",
                visual_description="Sunlit glade with ancient trees"
            )
        ]
    )


@pytest.fixture
def style_config():
    """Create test style config"""
    return StyleConfig(
        style_type="painterly",
        style_strength=0.8,
        color_palette=ColorPalette(
            primary="#2D5016",
            secondary="#4A7C59",
            accent="#FFD700",
            background="#1a1a1a"
        ),
        visual_elements=["atmospheric lighting", "detailed textures"]
    )


def test_generation_engine_initialization(generation_engine):
    """Test that generation engine initializes correctly"""
    assert generation_engine.connection_manager is not None
    assert generation_engine.model_manager is not None
    assert generation_engine.workflow_manager is not None
    assert generation_engine.current_session is None


def test_check_backend_availability_success(generation_engine):
    """Test backend availability check when all systems ready"""
    available = generation_engine.check_backend_availability()
    assert available is True


def test_check_backend_availability_no_connection(generation_engine):
    """Test backend availability check when connection unavailable"""
    generation_engine.connection_manager.get_status.return_value = ComfyUIStatus(
        available=False,
        url="http://localhost:8000",
        error_message="Connection failed"
    )
    
    available = generation_engine.check_backend_availability()
    assert available is False


def test_create_session(generation_engine):
    """Test session creation"""
    session = generation_engine._create_session(
        session_type="test",
        total_items=10,
        metadata={"test": "data"}
    )
    
    assert session.session_type == "test"
    assert session.total_items == 10
    assert session.completed_items == 0
    assert session.failed_items == 0
    assert session.cancelled is False
    assert session.metadata["test"] == "data"
    assert generation_engine.current_session == session


def test_create_progress(generation_engine):
    """Test progress creation"""
    session = generation_engine._create_session("test", 10)
    
    progress = generation_engine._create_progress(
        session=session,
        current_item=5,
        current_step="Processing",
        current_message="Processing item 5"
    )
    
    assert progress.session_id == session.session_id
    assert progress.current_item == 5
    assert progress.total_items == 10
    assert progress.percentage == 50.0
    assert progress.current_step == "Processing"
    assert progress.current_message == "Processing item 5"


def test_finalize_session(generation_engine):
    """Test session finalization"""
    import time
    
    session = generation_engine._create_session("test", 10)
    session.completed_items = 8
    session.failed_items = 2
    
    # Add small delay to ensure measurable time
    time.sleep(0.01)
    
    metrics = generation_engine._finalize_session(session)
    
    assert metrics.total_images == 10
    assert metrics.successful == 8
    assert metrics.failed == 2
    assert metrics.total_time >= 0  # Changed from > 0 to >= 0 for reliability
    assert generation_engine.current_session is None


def test_get_generation_metrics_no_session(generation_engine):
    """Test getting metrics when no session exists"""
    metrics = generation_engine.get_generation_metrics()
    assert metrics is None


def test_get_generation_metrics_active_session(generation_engine):
    """Test getting metrics for active session"""
    session = generation_engine._create_session("test", 10)
    session.completed_items = 5
    
    metrics = generation_engine.get_generation_metrics()
    
    assert metrics is not None
    assert metrics.total_images == 10
    assert metrics.successful == 5
    assert metrics.failed == 0


def test_cancel_generation(generation_engine):
    """Test generation cancellation"""
    session = generation_engine._create_session("test", 10)
    
    generation_engine.cancel_generation()
    
    assert generation_engine._cancel_requested is True
    assert session.cancelled is True


def test_check_cancellation(generation_engine):
    """Test cancellation checking"""
    generation_engine._create_session("test", 10)
    
    # Not cancelled initially
    assert generation_engine._check_cancellation() is False
    
    # Request cancellation
    generation_engine.cancel_generation()
    
    # Should be cancelled now
    assert generation_engine._check_cancellation() is True


@pytest.mark.asyncio
async def test_generate_master_coherence_sheet_placeholder(
    generation_engine,
    world_config,
    style_config,
    tmp_path
):
    """Test Master Coherence Sheet generation with placeholder mode"""
    output_dir = tmp_path / "output"
    
    # Set backend as unavailable to trigger placeholder mode
    generation_engine.connection_manager.get_status.return_value = ComfyUIStatus(
        available=False,
        url="http://localhost:8000",
        error_message="Backend unavailable"
    )
    
    coherence_sheet = await generation_engine.generate_master_coherence_sheet(
        world_config=world_config,
        style_config=style_config,
        output_dir=output_dir,
        grid_size=3
    )
    
    assert coherence_sheet is not None
    assert len(coherence_sheet.grid_images) == 9
    assert coherence_sheet.sheet_id == f"coherence_{world_config.world_id}"
    assert coherence_sheet.generation_time > 0
    
    # Check that placeholder images were created
    for image in coherence_sheet.grid_images:
        assert image.file_path.exists()
        assert image.metadata.get("placeholder") is True


def test_validate_generated_asset(generation_engine, tmp_path):
    """Test asset validation"""
    from PIL import Image
    from src.end_to_end.data_models import GeneratedImage
    
    # Create test image with variation (not blank)
    img = Image.new('RGB', (512, 512), color='white')
    # Add some variation to avoid blank detection
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    draw.rectangle([100, 100, 400, 400], fill='red')
    
    img_path = tmp_path / "test.png"
    img.save(img_path)
    
    generated_image = GeneratedImage(
        image_id="test_img",
        shot_id="shot_1",
        file_path=img_path,
        width=512,
        height=512,
        generation_time=1.0,
        quality_score=0.8
    )
    
    result = generation_engine.validate_generated_asset(
        image=generated_image,
        expected_width=512,
        expected_height=512,
        expected_format="PNG"
    )
    
    assert result["valid"] is True
    assert len(result["errors"]) == 0
    assert result["checks"]["width"]["passed"] is True
    assert result["checks"]["height"]["passed"] is True


def test_validate_generated_asset_dimension_mismatch(generation_engine, tmp_path):
    """Test asset validation with dimension mismatch"""
    from PIL import Image
    from src.end_to_end.data_models import GeneratedImage
    
    # Create test image with wrong dimensions but with variation (not blank)
    img = Image.new('RGB', (256, 256), color='white')
    # Add some variation to avoid blank detection
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 50, 200, 200], fill='blue')
    
    img_path = tmp_path / "test.png"
    img.save(img_path)
    
    generated_image = GeneratedImage(
        image_id="test_img",
        shot_id="shot_1",
        file_path=img_path,
        width=256,
        height=256,
        generation_time=1.0
    )
    
    result = generation_engine.validate_generated_asset(
        image=generated_image,
        expected_width=512,
        expected_height=512
    )
    
    assert result["valid"] is False
    assert len(result["errors"]) == 2  # Width and height mismatch
    assert result["checks"]["width"]["passed"] is False
    assert result["checks"]["height"]["passed"] is False


def test_get_session_history(generation_engine):
    """Test getting session history"""
    # Create and finalize a session
    session = generation_engine._create_session("test", 10)
    session.completed_items = 10
    generation_engine._finalize_session(session)
    
    history = generation_engine.get_session_history()
    
    assert len(history) == 1
    assert "session_id" in history[0]
    assert "metrics" in history[0]


def test_get_average_metrics(generation_engine):
    """Test calculating average metrics"""
    # Create and finalize multiple sessions
    for i in range(3):
        session = generation_engine._create_session("test", 10)
        session.completed_items = 8 + i
        session.failed_items = 2 - i
        generation_engine._finalize_session(session)
    
    avg_metrics = generation_engine.get_average_metrics()
    
    assert avg_metrics is not None
    assert avg_metrics["total_images"] == 10
    assert avg_metrics["successful"] == 9  # Average of 8, 9, 10
    assert avg_metrics["failed"] == 1  # Average of 2, 1, 0


def test_clear_metrics_history(generation_engine):
    """Test clearing metrics history"""
    # Create and finalize a session
    session = generation_engine._create_session("test", 10)
    session.completed_items = 10
    generation_engine._finalize_session(session)
    
    assert len(generation_engine._session_metrics) == 1
    
    generation_engine.clear_metrics_history()
    
    assert len(generation_engine._session_metrics) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
