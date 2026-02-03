"""
Integration tests for LTX-2 image-to-video generation with ComfyUI backend.

Tests the complete image-to-video pipeline with LTX-2 workflow, validating
two-stage generation (latent + upscaling), audio synchronization, and various
video parameters.

Requirements tested: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 14.10,
                     14.11, 14.12, 14.13, 14.14, 14.15
"""

import pytest
import asyncio
import os
from pathlib import Path
from PIL import Image
import tempfile
import shutil
import time

# Import the modules we need to test
try:
    from src.end_to_end.generation_engine import GenerationEngine
    from src.end_to_end.connection_manager import ConnectionManager, ComfyUIConfig
    from src.end_to_end.model_manager import ModelManager
    from src.end_to_end.workflow_manager import WorkflowManager
    from src.end_to_end.workflow_configs import LTX2ImageToVideoConfig
    from src.end_to_end.data_models import (
        GeneratedVideo,
        FallbackMode
    )
except ImportError as e:
    pytest.skip(f"LTX-2 integration modules not available: {e}", allow_module_level=True)


def create_test_image(path: Path, size=(1024, 768), color=(100, 150, 200)):
    """Helper to create test images."""
    img = Image.new('RGB', size, color=color)
    from PIL import ImageDraw
    draw = ImageDraw.Draw(img)
    # Add some variation
    draw.rectangle([100, 100, size[0]-100, size[1]-100], fill=(200, 100, 150))
    draw.ellipse([150, 150, size[0]-150, size[1]-150], fill=(150, 200, 100))
    img.save(path)
    return path


async def create_generation_engine(config: ComfyUIConfig):
    """Helper to create generation engine with all dependencies."""
    connection_manager = ConnectionManager(config)
    model_manager = ModelManager(Path("models"))
    workflow_manager = WorkflowManager(
        workflows_dir=Path("assets/workflows"),
        comfyui_workflows_dir=Path("comfyui_portable/ComfyUI/user/default/workflows")
    )
    
    engine = GenerationEngine(
        connection_manager=connection_manager,
        model_manager=model_manager,
        workflow_manager=workflow_manager
    )
    
    return engine, connection_manager


class TestLTX2VideoGeneration:
    """End-to-end tests for LTX-2 image-to-video generation."""
    
    @pytest.fixture
    def temp_output_dir(self):
        """Create temporary directory for test outputs."""
        temp_dir = tempfile.mkdtemp(prefix="test_ltx2_video_")
        yield Path(temp_dir)
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    @pytest.fixture
    def comfyui_config(self):
        """Create ComfyUI configuration."""
        return ComfyUIConfig(
            host="localhost",
            port=8000,
            timeout=60,
            max_retries=3,
            fallback_mode=FallbackMode.PLACEHOLDER
        )
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_end_to_end_video_generation(self, comfyui_config, temp_output_dir):
        """
        Test complete image-to-video pipeline.
        Requirements: 14.1, 14.7, 14.8, 14.15
        """
        # Create test image
        test_image = create_test_image(temp_output_dir / "test_input.png")
        
        # Create config
        ltx2_config = LTX2ImageToVideoConfig(
            input_image_path=str(test_image),
            resize_width=1280,
            resize_height=720,
            frame_count=121,
            frame_rate=25
        )
        
        # Create engine
        engine, connection_manager = await create_generation_engine(comfyui_config)
        
        try:
            output_path = temp_output_dir / "output_video.mp4"
            prompt = "A wide, dynamic tracking shot"
            
            # Generate video
            generated_video = await engine.generate_video_from_image(
                input_image_path=test_image,
                prompt=prompt,
                config=ltx2_config,
                output_path=output_path
            )
            
            # Validate
            assert generated_video is not None
            assert isinstance(generated_video, GeneratedVideo)
            assert generated_video.path.exists()
            assert generated_video.duration_seconds > 0
            assert generated_video.frame_count == 121
            assert generated_video.frame_rate == 25
            assert generated_video.resolution == (1280, 720)
            assert generated_video.has_audio is True
            assert generated_video.generation_time > 0
            
        finally:
            await connection_manager.disconnect()
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_various_frame_counts(self, comfyui_config, temp_output_dir):
        """
        Test different frame counts.
        Requirements: 14.5, 14.13
        """
        test_image = create_test_image(temp_output_dir / "test_input.png")
        engine, connection_manager = await create_generation_engine(comfyui_config)
        
        try:
            for frame_count in [60, 121, 240]:
                config = LTX2ImageToVideoConfig(
                    input_image_path=str(test_image),
                    resize_width=1280,
                    resize_height=720,
                    frame_count=frame_count,
                    frame_rate=25
                )
                
                output_path = temp_output_dir / f"output_{frame_count}frames.mp4"
                
                video = await engine.generate_video_from_image(
                    input_image_path=test_image,
                    prompt=f"Test {frame_count} frames",
                    config=config,
                    output_path=output_path
                )
                
                assert video.frame_count == frame_count
                expected_duration = frame_count / 25
                assert abs(video.duration_seconds - expected_duration) < 0.1
                
        finally:
            await connection_manager.disconnect()
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_various_resolutions(self, comfyui_config, temp_output_dir):
        """
        Test different resolutions.
        Requirements: 14.5, 14.13
        """
        test_image = create_test_image(temp_output_dir / "test_input.png")
        engine, connection_manager = await create_generation_engine(comfyui_config)
        
        try:
            resolutions = [(1280, 720), (1920, 1080)]
            
            for width, height in resolutions:
                config = LTX2ImageToVideoConfig(
                    input_image_path=str(test_image),
                    resize_width=width,
                    resize_height=height,
                    frame_count=60,
                    frame_rate=25
                )
                
                output_path = temp_output_dir / f"output_{width}x{height}.mp4"
                
                video = await engine.generate_video_from_image(
                    input_image_path=test_image,
                    prompt=f"Test {width}x{height}",
                    config=config,
                    output_path=output_path
                )
                
                assert video.resolution == (width, height)
                
        finally:
            await connection_manager.disconnect()
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_various_frame_rates(self, comfyui_config, temp_output_dir):
        """
        Test different frame rates.
        Requirements: 14.5, 14.13
        """
        test_image = create_test_image(temp_output_dir / "test_input.png")
        engine, connection_manager = await create_generation_engine(comfyui_config)
        
        try:
            for fps in [24, 25, 30]:
                config = LTX2ImageToVideoConfig(
                    input_image_path=str(test_image),
                    resize_width=1280,
                    resize_height=720,
                    frame_count=120,
                    frame_rate=fps
                )
                
                output_path = temp_output_dir / f"output_{fps}fps.mp4"
                
                video = await engine.generate_video_from_image(
                    input_image_path=test_image,
                    prompt=f"Test {fps}fps",
                    config=config,
                    output_path=output_path
                )
                
                assert video.frame_rate == fps
                expected_duration = 120 / fps
                assert abs(video.duration_seconds - expected_duration) < 0.1
                
        finally:
            await connection_manager.disconnect()
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_image_preprocessing(self, comfyui_config, temp_output_dir):
        """
        Test image preprocessing with various sizes and formats.
        Requirements: 14.6
        """
        engine, connection_manager = await create_generation_engine(comfyui_config)
        
        try:
            # Test various input sizes
            sizes = [(256, 256), (1024, 768), (2048, 1536)]
            
            for width, height in sizes:
                test_image = create_test_image(
                    temp_output_dir / f"test_{width}x{height}.png",
                    size=(width, height)
                )
                
                config = LTX2ImageToVideoConfig(
                    input_image_path=str(test_image),
                    resize_width=1280,
                    resize_height=720,
                    resize_method="lanczos",
                    frame_count=60,
                    frame_rate=25
                )
                
                output_path = temp_output_dir / f"output_{width}x{height}.mp4"
                
                video = await engine.generate_video_from_image(
                    input_image_path=test_image,
                    prompt="Test preprocessing",
                    config=config,
                    output_path=output_path
                )
                
                # Output should always be resized to config dimensions
                assert video.resolution == (1280, 720)
                
        finally:
            await connection_manager.disconnect()
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    @pytest.mark.slow
    async def test_performance_benchmarks(self, comfyui_config, temp_output_dir):
        """
        Measure generation performance.
        Requirements: 14.8, 14.14
        """
        test_image = create_test_image(temp_output_dir / "test_input.png")
        engine, connection_manager = await create_generation_engine(comfyui_config)
        
        try:
            config = LTX2ImageToVideoConfig(
                input_image_path=str(test_image),
                resize_width=1280,
                resize_height=720,
                frame_count=121,
                frame_rate=25
            )
            
            output_path = temp_output_dir / "output_perf.mp4"
            
            start_time = time.time()
            
            video = await engine.generate_video_from_image(
                input_image_path=test_image,
                prompt="Performance test",
                config=config,
                output_path=output_path
            )
            
            total_time = time.time() - start_time
            
            assert video.generation_time > 0
            assert total_time < 300  # Should complete in reasonable time
            
        finally:
            await connection_manager.disconnect()
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_workflow_parameter_injection(self, comfyui_config, temp_output_dir):
        """
        Test workflow parameter injection.
        Requirements: 14.9, 14.10
        """
        test_image = create_test_image(temp_output_dir / "test_input.png")
        engine, connection_manager = await create_generation_engine(comfyui_config)
        
        try:
            # Test with custom parameters
            config = LTX2ImageToVideoConfig(
                input_image_path=str(test_image),
                resize_width=1536,
                resize_height=864,
                frame_count=90,
                frame_rate=30,
                noise_seed_stage1=42,
                noise_seed_stage2=123,
                cfg_scale=1.5
            )
            
            output_path = temp_output_dir / "output_custom_params.mp4"
            
            video = await engine.generate_video_from_image(
                input_image_path=test_image,
                prompt="Custom parameters test",
                config=config,
                output_path=output_path
            )
            
            # Validate parameters were applied
            assert video.resolution == (1536, 864)
            assert video.frame_count == 90
            assert video.frame_rate == 30
            
        finally:
            await connection_manager.disconnect()
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_error_handling(self, temp_output_dir):
        """
        Test error handling scenarios.
        Requirements: 14.8
        """
        # Test with invalid backend
        invalid_config = ComfyUIConfig(
            host="localhost",
            port=9999,  # Invalid port
            timeout=2,
            max_retries=1,
            fallback_mode=FallbackMode.PLACEHOLDER
        )
        
        test_image = create_test_image(temp_output_dir / "test_input.png")
        engine, connection_manager = await create_generation_engine(invalid_config)
        
        try:
            config = LTX2ImageToVideoConfig(
                input_image_path=str(test_image),
                resize_width=1280,
                resize_height=720,
                frame_count=60,
                frame_rate=25
            )
            
            output_path = temp_output_dir / "output_fallback.mp4"
            
            # Should fall back to mock mode
            video = await engine.generate_video_from_image(
                input_image_path=test_image,
                prompt="Test fallback",
                config=config,
                output_path=output_path
            )
            
            # Should still generate placeholder
            assert video is not None
            
        finally:
            await connection_manager.disconnect()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--tb=short"])
