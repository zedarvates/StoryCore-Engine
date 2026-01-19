"""
Comprehensive test suite for HunyuanVideo Integration

Tests cover:
- Text-to-video generation
- Image-to-video generation
- Super-resolution upscaling
- CLIP vision encoding
- Quality validation
- Frame sequence management
- Caching and performance
- Error handling

Author: Kiro AI Assistant
Date: January 14, 2026
"""

import pytest
import asyncio
import sys
from pathlib import Path
from PIL import Image
import numpy as np

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from hunyuan_video_integration import (
    HunyuanVideoIntegration,
    VideoGenerationRequest,
    VideoGenerationResult,
    FrameSequence,
    HunyuanWorkflowType,
    CLIPVisionEncoder,
    VideoQualityValidator,
    SuperResolutionUpscaler,
    generate_text_to_video,
    generate_image_to_video
)
from advanced_workflow_config import HunyuanVideoConfig
from advanced_model_manager import AdvancedModelManager, ModelManagerConfig


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def config():
    """Create test configuration"""
    return HunyuanVideoConfig(
        width=720,
        height=480,
        num_frames=10,  # Reduced for faster tests
        steps=20,
        enable_upscaling=True
    )


@pytest.fixture
def model_manager():
    """Create test model manager"""
    manager_config = ModelManagerConfig(
        models_directory=Path("models"),
        max_vram_usage_gb=20.0,
        enable_quantization=True,
        auto_download=False  # Don't download in tests
    )
    return AdvancedModelManager(manager_config)


@pytest.fixture
async def integration(config, model_manager):
    """Create test integration instance"""
    integration = HunyuanVideoIntegration(config, model_manager)
    yield integration
    await integration.cleanup()


@pytest.fixture
def test_image():
    """Create test image"""
    arr = np.random.randint(0, 255, (480, 720, 3), dtype=np.uint8)
    return Image.fromarray(arr)


# ============================================================================
# Test FrameSequence
# ============================================================================

def test_frame_sequence_creation():
    """Test frame sequence creation"""
    frames = [Image.new('RGB', (720, 480)) for _ in range(10)]
    sequence = FrameSequence(frames=frames, fps=24, width=720, height=480)
    
    assert len(sequence) == 10
    assert sequence.fps == 24
    assert sequence.width == 720
    assert sequence.height == 480


def test_frame_sequence_duration():
    """Test duration calculation"""
    frames = [Image.new('RGB', (720, 480)) for _ in range(24)]
    sequence = FrameSequence(frames=frames, fps=24)
    
    assert sequence.get_duration() == 1.0  # 24 frames at 24fps = 1 second


def test_frame_sequence_save(tmp_path):
    """Test saving frames to directory"""
    frames = [Image.new('RGB', (720, 480)) for _ in range(5)]
    sequence = FrameSequence(frames=frames)
    
    output_dir = tmp_path / "frames"
    sequence.save_frames(output_dir, prefix="test")
    
    # Check files were created
    assert output_dir.exists()
    assert len(list(output_dir.glob("test_*.png"))) == 5



# ============================================================================
# Test CLIPVisionEncoder
# ============================================================================

@pytest.mark.asyncio
async def test_clip_encoder_initialization(model_manager):
    """Test CLIP encoder initialization"""
    encoder = CLIPVisionEncoder(model_manager)
    assert encoder.model_name == "clip_vision_h"
    assert len(encoder.cache) == 0


@pytest.mark.asyncio
async def test_clip_encode_image(model_manager, test_image):
    """Test image encoding"""
    encoder = CLIPVisionEncoder(model_manager)
    embedding = await encoder.encode_image(test_image)
    
    assert embedding is not None
    assert embedding.shape == (1, 1024)
    assert embedding.dtype == np.float32


@pytest.mark.asyncio
async def test_clip_encoder_caching(model_manager, test_image):
    """Test encoding caching"""
    encoder = CLIPVisionEncoder(model_manager)
    
    # First encoding
    embedding1 = await encoder.encode_image(test_image)
    assert len(encoder.cache) == 1
    
    # Second encoding (should use cache)
    embedding2 = await encoder.encode_image(test_image)
    assert len(encoder.cache) == 1
    assert np.array_equal(embedding1, embedding2)


@pytest.mark.asyncio
async def test_clip_preprocess_image(model_manager):
    """Test image preprocessing"""
    encoder = CLIPVisionEncoder(model_manager)
    
    # Test various image sizes
    test_sizes = [(1024, 768), (640, 480), (224, 224)]
    for size in test_sizes:
        img = Image.new('RGB', size)
        processed = encoder._preprocess_image(img)
        assert processed.size == (224, 224)
        assert processed.mode == 'RGB'


# ============================================================================
# Test VideoQualityValidator
# ============================================================================

def test_quality_validator_initialization(config):
    """Test quality validator initialization"""
    validator = VideoQualityValidator(config)
    assert validator.config == config


def test_validate_empty_frames(config):
    """Test validation with empty frames"""
    validator = VideoQualityValidator(config)
    metrics = validator.validate_frames([])
    
    assert metrics['quality_score'] == 0.0
    assert metrics['temporal_consistency'] == 0.0
    assert metrics['sharpness_score'] == 0.0


def test_validate_single_frame(config):
    """Test validation with single frame"""
    validator = VideoQualityValidator(config)
    frames = [Image.new('RGB', (720, 480))]
    metrics = validator.validate_frames(frames)
    
    assert 0.0 <= metrics['quality_score'] <= 1.0
    assert metrics['temporal_consistency'] == 1.0  # Single frame is consistent


def test_validate_multiple_frames(config):
    """Test validation with multiple frames"""
    validator = VideoQualityValidator(config)
    frames = [Image.new('RGB', (720, 480)) for _ in range(10)]
    metrics = validator.validate_frames(frames)
    
    assert 0.0 <= metrics['quality_score'] <= 1.0
    assert 0.0 <= metrics['temporal_consistency'] <= 1.0
    assert 0.0 <= metrics['sharpness_score'] <= 1.0
    assert 0.0 <= metrics['color_consistency'] <= 1.0


# ============================================================================
# Test SuperResolutionUpscaler
# ============================================================================

@pytest.mark.asyncio
async def test_upscaler_initialization(config, model_manager):
    """Test upscaler initialization"""
    upscaler = SuperResolutionUpscaler(model_manager, config)
    assert upscaler.model_name == "hunyuan_video_sr"


@pytest.mark.asyncio
async def test_upscale_empty_frames(config, model_manager):
    """Test upscaling empty frame list"""
    upscaler = SuperResolutionUpscaler(model_manager, config)
    result = await upscaler.upscale_frames([])
    assert result == []


@pytest.mark.asyncio
async def test_upscale_single_frame(config, model_manager):
    """Test upscaling single frame"""
    upscaler = SuperResolutionUpscaler(model_manager, config)
    frame = Image.new('RGB', (720, 480))
    result = await upscaler.upscale_frames([frame], upscale_factor=1.5)
    
    assert len(result) == 1
    assert result[0].size == (1080, 720)  # 720*1.5, 480*1.5


@pytest.mark.asyncio
async def test_upscale_multiple_frames(config, model_manager):
    """Test upscaling multiple frames"""
    upscaler = SuperResolutionUpscaler(model_manager, config)
    frames = [Image.new('RGB', (720, 480)) for _ in range(5)]
    result = await upscaler.upscale_frames(frames, upscale_factor=2.0)
    
    assert len(result) == 5
    for frame in result:
        assert frame.size == (1440, 960)  # 720*2, 480*2


@pytest.mark.asyncio
async def test_upscale_fallback(config, model_manager):
    """Test fallback upscaling"""
    upscaler = SuperResolutionUpscaler(model_manager, config)
    frames = [Image.new('RGB', (720, 480)) for _ in range(3)]
    result = upscaler._fallback_upscale(frames, upscale_factor=1.5)
    
    assert len(result) == 3
    for frame in result:
        assert frame.size == (1080, 720)



# ============================================================================
# Test HunyuanVideoIntegration
# ============================================================================

@pytest.mark.asyncio
async def test_integration_initialization(config, model_manager):
    """Test integration initialization"""
    integration = HunyuanVideoIntegration(config, model_manager)
    
    assert integration.config == config
    assert integration.model_manager == model_manager
    assert isinstance(integration.clip_encoder, CLIPVisionEncoder)
    assert isinstance(integration.quality_validator, VideoQualityValidator)
    assert isinstance(integration.upscaler, SuperResolutionUpscaler)
    
    await integration.cleanup()


@pytest.mark.asyncio
async def test_integration_default_model_manager(config):
    """Test integration with default model manager"""
    integration = HunyuanVideoIntegration(config)
    
    assert integration.model_manager is not None
    assert len(integration.model_manager.model_registry) > 0
    
    await integration.cleanup()


@pytest.mark.asyncio
async def test_text_to_video_generation(integration):
    """Test text-to-video generation"""
    request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
        prompt="A beautiful sunset over the ocean",
        width=720,
        height=480,
        num_frames=10,
        steps=20
    )
    
    result = await integration.generate_video(request)
    
    assert result.success
    assert len(result.frames) == 10
    assert result.workflow_type == HunyuanWorkflowType.TEXT_TO_VIDEO
    assert result.resolution == (720, 480)
    assert result.generation_time > 0


@pytest.mark.asyncio
async def test_image_to_video_generation(integration, test_image):
    """Test image-to-video generation"""
    request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.IMAGE_TO_VIDEO,
        prompt="Animate this image with gentle motion",
        conditioning_image=test_image,
        width=720,
        height=480,
        num_frames=10,
        steps=20
    )
    
    result = await integration.generate_video(request)
    
    assert result.success
    assert len(result.frames) == 10
    assert result.workflow_type == HunyuanWorkflowType.IMAGE_TO_VIDEO
    assert result.resolution == (720, 480)


@pytest.mark.asyncio
async def test_i2v_without_image(integration):
    """Test I2V generation without conditioning image"""
    request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.IMAGE_TO_VIDEO,
        prompt="Test prompt",
        conditioning_image=None
    )
    
    result = await integration.generate_video(request)
    
    assert not result.success
    assert "Conditioning image required" in result.error_message


@pytest.mark.asyncio
async def test_generation_with_upscaling(integration):
    """Test generation with super-resolution upscaling"""
    request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
        prompt="Test prompt",
        width=720,
        height=480,
        num_frames=5,
        enable_upscaling=True,
        upscale_factor=1.5
    )
    
    result = await integration.generate_video(request)
    
    assert result.success
    assert result.resolution == (1080, 720)  # Upscaled
    assert len(result.warnings) > 0  # Should have upscaling warning


@pytest.mark.asyncio
async def test_generation_caching(integration):
    """Test frame caching"""
    request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
        prompt="Test prompt",
        seed=42,
        enable_caching=True
    )
    
    # First generation
    result1 = await integration.generate_video(request)
    assert result1.success
    cache_size_1 = len(integration.frame_cache)
    
    # Second generation (should use cache)
    result2 = await integration.generate_video(request)
    assert result2.success
    cache_size_2 = len(integration.frame_cache)
    
    assert cache_size_1 == cache_size_2
    assert integration.generation_stats['cache_hits'] > 0


@pytest.mark.asyncio
async def test_invalid_request_validation(integration):
    """Test request validation"""
    # Empty prompt
    request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
        prompt=""
    )
    result = await integration.generate_video(request)
    assert not result.success
    
    # Invalid dimensions
    request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
        prompt="Test",
        width=-1,
        height=-1
    )
    result = await integration.generate_video(request)
    assert not result.success


@pytest.mark.asyncio
async def test_quality_metrics(integration):
    """Test quality metrics calculation"""
    request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
        prompt="Test prompt",
        num_frames=10
    )
    
    result = await integration.generate_video(request)
    
    assert result.success
    assert 0.0 <= result.quality_score <= 1.0
    assert 0.0 <= result.temporal_consistency <= 1.0
    assert 0.0 <= result.sharpness_score <= 1.0


@pytest.mark.asyncio
async def test_statistics_tracking(integration):
    """Test statistics tracking"""
    # Generate T2V
    request_t2v = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
        prompt="Test T2V",
        num_frames=5
    )
    await integration.generate_video(request_t2v)
    
    # Generate I2V
    test_img = Image.new('RGB', (720, 480))
    request_i2v = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.IMAGE_TO_VIDEO,
        prompt="Test I2V",
        conditioning_image=test_img,
        num_frames=5
    )
    await integration.generate_video(request_i2v)
    
    stats = integration.get_stats()
    
    assert stats['t2v_count'] >= 1
    assert stats['i2v_count'] >= 1
    assert stats['total_frames'] >= 10
    assert stats['total_time'] > 0
    assert 'avg_fps' in stats


@pytest.mark.asyncio
async def test_cache_clearing(integration):
    """Test cache clearing"""
    request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
        prompt="Test",
        enable_caching=True
    )
    
    await integration.generate_video(request)
    assert len(integration.frame_cache) > 0
    
    integration.clear_cache()
    assert len(integration.frame_cache) == 0



# ============================================================================
# Test Convenience Functions
# ============================================================================

@pytest.mark.asyncio
async def test_convenience_text_to_video():
    """Test convenience function for T2V"""
    result = await generate_text_to_video(
        prompt="A beautiful landscape",
        num_frames=5,
        steps=10
    )
    
    assert result.success
    assert len(result.frames) == 5


@pytest.mark.asyncio
async def test_convenience_image_to_video():
    """Test convenience function for I2V"""
    test_img = Image.new('RGB', (720, 480))
    result = await generate_image_to_video(
        prompt="Animate this image",
        image=test_img,
        num_frames=5,
        steps=10
    )
    
    assert result.success
    assert len(result.frames) == 5


# ============================================================================
# Test Error Handling
# ============================================================================

@pytest.mark.asyncio
async def test_error_handling_invalid_workflow(integration):
    """Test error handling for invalid workflow type"""
    # Create request with invalid workflow type (by modifying after creation)
    request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
        prompt="Test"
    )
    # Manually set to invalid type
    request.workflow_type = "invalid_type"
    
    result = await integration.generate_video(request)
    assert not result.success


@pytest.mark.asyncio
async def test_mock_frame_generation_t2v(integration):
    """Test mock frame generation for T2V"""
    frames = integration._generate_mock_frames(720, 480, 5, "Test prompt")
    
    assert len(frames) == 5
    for frame in frames:
        assert frame.size == (720, 480)
        assert frame.mode == 'RGB'


@pytest.mark.asyncio
async def test_mock_frame_generation_i2v(integration):
    """Test mock frame generation for I2V"""
    base_image = Image.new('RGB', (640, 360))
    frames = integration._generate_mock_frames(
        720, 480, 5, "Test prompt", base_image=base_image
    )
    
    assert len(frames) == 5
    for frame in frames:
        assert frame.size == (720, 480)
        assert frame.mode == 'RGB'


# ============================================================================
# Test Performance and Optimization
# ============================================================================

@pytest.mark.asyncio
async def test_batch_generation_performance(integration):
    """Test performance with multiple generations"""
    requests = [
        VideoGenerationRequest(
            workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
            prompt=f"Test prompt {i}",
            num_frames=5,
            seed=i
        )
        for i in range(3)
    ]
    
    results = []
    for request in requests:
        result = await integration.generate_video(request)
        results.append(result)
    
    assert all(r.success for r in results)
    assert len(results) == 3
    
    stats = integration.get_stats()
    assert stats['t2v_count'] == 3
    assert stats['total_frames'] == 15


@pytest.mark.asyncio
async def test_memory_efficiency(integration):
    """Test memory efficiency with large frame counts"""
    request = VideoGenerationRequest(
        workflow_type=HunyuanWorkflowType.TEXT_TO_VIDEO,
        prompt="Test prompt",
        num_frames=50,  # Larger frame count
        enable_caching=False  # Disable caching to test memory
    )
    
    result = await integration.generate_video(request)
    
    assert result.success
    assert len(result.frames) == 50
    
    # Check memory stats
    stats = integration.get_stats()
    assert 'memory_stats' in stats


# ============================================================================
# Test Integration with Model Manager
# ============================================================================

@pytest.mark.asyncio
async def test_model_registration(integration):
    """Test that models are properly registered"""
    registered_models = integration.model_manager.list_registered_models()
    
    assert "hunyuan_video_i2v" in registered_models
    assert "hunyuan_video_t2v" in registered_models
    assert "hunyuan_video_sr" in registered_models
    assert "clip_vision_h" in registered_models


@pytest.mark.asyncio
async def test_model_compatibility_check(integration):
    """Test model compatibility checking"""
    is_compatible, issues = integration.model_manager.check_model_compatibility(
        "hunyuan_video_i2v"
    )
    
    # Should return compatibility status
    assert isinstance(is_compatible, bool)
    assert isinstance(issues, list)


# ============================================================================
# Test Configuration
# ============================================================================

def test_config_validation():
    """Test configuration validation"""
    config = HunyuanVideoConfig()
    errors = config.validate()
    assert len(errors) == 0  # Default config should be valid


def test_invalid_config_validation():
    """Test invalid configuration validation"""
    config = HunyuanVideoConfig(
        width=-1,
        height=-1,
        num_frames=0,
        steps=0
    )
    errors = config.validate()
    assert len(errors) > 0


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
