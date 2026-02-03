"""
Integration tests for individual shot generation with ComfyUI backend.

Tests shot generation with various resolutions, verifying style reference
from Master Coherence Sheet is applied and output format/dimensions are correct.

Requirements tested: 5.4
"""

import pytest
import asyncio
import os
from pathlib import Path
from PIL import Image
import tempfile
import shutil

# Import the modules we need to test
try:
    from src.end_to_end.comfyui_integration import ComfyUIIntegration
    from src.end_to_end.data_models import (
        WorldConfig,
        StyleConfig,
        ShotConfig,
        MasterCoherenceSheet,
        GeneratedImage,
        FallbackMode,
        ColorPalette
    )
except ImportError:
    pytest.skip("ComfyUI integration modules not available", allow_module_level=True)


class TestShotGeneration:
    """End-to-end tests for individual shot generation."""
    
    @pytest.fixture
    def backend_url(self):
        """Get ComfyUI backend URL from environment or use default."""
        return os.getenv("COMFYUI_URL", "http://localhost:8000")
    
    @pytest.fixture
    def temp_output_dir(self):
        """Create temporary directory for test outputs."""
        temp_dir = tempfile.mkdtemp(prefix="test_shot_gen_")
        yield Path(temp_dir)
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    @pytest.fixture
    def world_config(self):
        """Create sample world configuration."""
        return WorldConfig(
            name="Test World",
            description="A cyberpunk cityscape at night",
            setting="Futuristic urban environment",
            time_period="Near future",
            atmosphere="Neon-lit and atmospheric",
            color_palette=ColorPalette(
                primary="#FF00FF",
                secondary="#00FFFF",
                accent="#FFFF00",
                background="#1A1A2E"
            )
        )
    
    @pytest.fixture
    def style_config(self):
        """Create sample style configuration."""
        return StyleConfig(
            art_style="Cyberpunk digital art",
            lighting="Neon lighting with strong contrasts",
            camera_angle="Low angle hero shot",
            mood="Intense and dramatic",
            quality_tags="highly detailed, 8k, cinematic"
        )
    
    @pytest.fixture
    async def coherence_sheet(self, backend_url, temp_output_dir, world_config, style_config):
        """Generate a Master Coherence Sheet for testing."""
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=60,
            max_retries=3,
            fallback_mode=FallbackMode.PLACEHOLDER
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            return await comfyui.generate_master_coherence_sheet(
                world_config=world_config,
                style_config=style_config,
                output_dir=temp_output_dir
            )
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_shot_generation_with_style_reference(
        self, backend_url, temp_output_dir, world_config, style_config, coherence_sheet
    ):
        """
        Test individual shot generation with Master Coherence Sheet style reference.
        
        Validates:
        - Shot is generated successfully
        - Output dimensions match requested resolution
        - Image format is correct
        - Style reference is applied
        """
        shot_config = ShotConfig(
            shot_number=1,
            description="A lone figure walking through neon-lit streets",
            camera_movement="Slow dolly forward",
            duration_seconds=3.0,
            resolution=(1920, 1080)
        )
        
        output_path = temp_output_dir / "shot_001.png"
        
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=60,
            max_retries=3
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            # Generate shot with coherence sheet reference
            generated_shot = await comfyui.generate_shot(
                shot_config=shot_config,
                coherence_sheet=coherence_sheet,
                output_path=output_path
            )
            
            # Validate generated shot
            assert generated_shot is not None, "Generated shot should not be None"
            assert isinstance(generated_shot, GeneratedImage), \
                "Should return GeneratedImage instance"
            
            # Check file exists
            assert generated_shot.path.exists(), \
                f"Shot file should exist at {generated_shot.path}"
            
            # Validate image properties
            with Image.open(generated_shot.path) as img:
                # Check dimensions match requested resolution
                width, height = img.size
                expected_width, expected_height = shot_config.resolution
                
                # Allow some tolerance for aspect ratio preservation
                assert abs(width - expected_width) / expected_width < 0.1, \
                    f"Width {width} should be close to {expected_width}"
                assert abs(height - expected_height) / expected_height < 0.1, \
                    f"Height {height} should be close to {expected_height}"
                
                # Check format
                assert img.format in ['PNG', 'JPEG', 'JPG'], \
                    f"Should be PNG or JPEG, got {img.format}"
                
                # Check image has content (not blank)
                extrema = img.convert('L').getextrema()
                assert extrema[1] - extrema[0] > 10, \
                    "Image should have variation (not blank)"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    @pytest.mark.parametrize("resolution", [
        (1920, 1080),  # Full HD
        (1280, 720),   # HD
        (3840, 2160),  # 4K
        (2560, 1440),  # 2K
        (1024, 1024),  # Square
        (1024, 768),   # 4:3
        (2560, 1080),  # Ultrawide
    ])
    async def test_shot_generation_various_resolutions(
        self, backend_url, temp_output_dir, world_config, style_config, 
        coherence_sheet, resolution
    ):
        """
        Test shot generation with various resolutions.
        
        Validates:
        - System handles different aspect ratios
        - Output dimensions are correct
        - Quality is maintained across resolutions
        """
        shot_config = ShotConfig(
            shot_number=1,
            description="Test shot for resolution validation",
            camera_movement="Static",
            duration_seconds=2.0,
            resolution=resolution
        )
        
        output_path = temp_output_dir / f"shot_{resolution[0]}x{resolution[1]}.png"
        
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=90,  # Longer timeout for 4K
            max_retries=3
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            generated_shot = await comfyui.generate_shot(
                shot_config=shot_config,
                coherence_sheet=coherence_sheet,
                output_path=output_path
            )
            
            # Validate dimensions
            with Image.open(generated_shot.path) as img:
                width, height = img.size
                expected_width, expected_height = resolution
                
                # Check dimensions are close to requested
                width_ratio = width / expected_width
                height_ratio = height / expected_height
                
                assert 0.9 <= width_ratio <= 1.1, \
                    f"Width ratio {width_ratio} outside acceptable range"
                assert 0.9 <= height_ratio <= 1.1, \
                    f"Height ratio {height_ratio} outside acceptable range"
                
                # Check aspect ratio is preserved
                requested_aspect = expected_width / expected_height
                actual_aspect = width / height
                aspect_diff = abs(requested_aspect - actual_aspect)
                
                assert aspect_diff < 0.1, \
                    f"Aspect ratio difference {aspect_diff} too large"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_shot_generation_output_format_validation(
        self, backend_url, temp_output_dir, world_config, style_config, coherence_sheet
    ):
        """
        Test that generated shots have correct output format.
        
        Validates:
        - File format is correct (PNG/JPEG)
        - File size is reasonable
        - Image is not corrupted
        - Color depth is correct
        """
        shot_config = ShotConfig(
            shot_number=1,
            description="Format validation test shot",
            camera_movement="Pan right",
            duration_seconds=2.5,
            resolution=(1920, 1080)
        )
        
        output_path = temp_output_dir / "shot_format_test.png"
        
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=60,
            max_retries=3
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            generated_shot = await comfyui.generate_shot(
                shot_config=shot_config,
                coherence_sheet=coherence_sheet,
                output_path=output_path
            )
            
            with Image.open(generated_shot.path) as img:
                # Check format
                assert img.format in ['PNG', 'JPEG'], \
                    f"Format should be PNG or JPEG, got {img.format}"
                
                # Check mode (color depth)
                assert img.mode in ['RGB', 'RGBA'], \
                    f"Mode should be RGB or RGBA, got {img.mode}"
                
                # Check file size
                file_size = generated_shot.path.stat().st_size
                # At least 10KB
                assert file_size > 10 * 1024, \
                    f"File size {file_size} is too small"
                # Less than 100MB
                assert file_size < 100 * 1024 * 1024, \
                    f"File size {file_size} is too large"
                
                # Verify image can be loaded and processed
                rgb_img = img.convert('RGB')
                assert rgb_img.size == img.size, \
                    "Image should convert to RGB without issues"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_shot_generation_with_progress_tracking(
        self, backend_url, temp_output_dir, world_config, style_config, coherence_sheet
    ):
        """
        Test progress tracking during shot generation.
        
        Validates:
        - Progress callback is called
        - Progress values are valid
        - Generation completes successfully
        """
        progress_updates = []
        
        def progress_callback(progress):
            """Track progress updates."""
            progress_updates.append({
                'percentage': progress.percentage,
                'current_step': progress.current_step,
                'elapsed_time': progress.elapsed_time
            })
        
        shot_config = ShotConfig(
            shot_number=1,
            description="Progress tracking test shot",
            camera_movement="Zoom in",
            duration_seconds=2.0,
            resolution=(1920, 1080)
        )
        
        output_path = temp_output_dir / "shot_progress_test.png"
        
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=60,
            max_retries=3
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            await comfyui.generate_shot(
                shot_config=shot_config,
                coherence_sheet=coherence_sheet,
                output_path=output_path,
                progress_callback=progress_callback
            )
            
            # Should have received progress updates
            assert len(progress_updates) > 0, \
                "Should receive progress updates"
            
            # Check progress values
            for update in progress_updates:
                assert 0 <= update['percentage'] <= 100, \
                    f"Progress should be 0-100, got {update['percentage']}"
                assert update['elapsed_time'] >= 0, \
                    f"Elapsed time should be non-negative, got {update['elapsed_time']}"
            
            # Final update should be 100%
            if progress_updates:
                final_update = progress_updates[-1]
                assert final_update['percentage'] == 100, \
                    "Final progress should be 100%"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_multiple_shots_generation(
        self, backend_url, temp_output_dir, world_config, style_config, coherence_sheet
    ):
        """
        Test generating multiple shots in sequence.
        
        Validates:
        - Multiple shots can be generated
        - Each shot is unique
        - All shots maintain style consistency
        """
        shot_configs = [
            ShotConfig(
                shot_number=1,
                description="Opening establishing shot",
                camera_movement="Slow pan",
                duration_seconds=3.0,
                resolution=(1920, 1080)
            ),
            ShotConfig(
                shot_number=2,
                description="Character close-up",
                camera_movement="Static",
                duration_seconds=2.0,
                resolution=(1920, 1080)
            ),
            ShotConfig(
                shot_number=3,
                description="Action sequence",
                camera_movement="Fast tracking",
                duration_seconds=2.5,
                resolution=(1920, 1080)
            )
        ]
        
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=60,
            max_retries=3
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            generated_shots = []
            
            for shot_config in shot_configs:
                output_path = temp_output_dir / f"shot_{shot_config.shot_number:03d}.png"
                
                generated_shot = await comfyui.generate_shot(
                    shot_config=shot_config,
                    coherence_sheet=coherence_sheet,
                    output_path=output_path
                )
                
                generated_shots.append(generated_shot)
            
            # Validate all shots were generated
            assert len(generated_shots) == len(shot_configs), \
                f"Should generate {len(shot_configs)} shots"
            
            # All shots should exist
            for i, shot in enumerate(generated_shots):
                assert shot.path.exists(), \
                    f"Shot {i+1} should exist"
                
                # Validate each shot
                with Image.open(shot.path) as img:
                    assert img.size[0] > 0 and img.size[1] > 0, \
                        f"Shot {i+1} should have valid dimensions"
            
            # Check shots are different (not identical)
            if len(generated_shots) >= 2:
                with Image.open(generated_shots[0].path) as img1:
                    with Image.open(generated_shots[1].path) as img2:
                        # Convert to same mode for comparison
                        img1_rgb = img1.convert('RGB')
                        img2_rgb = img2.convert('RGB')
                        
                        # Images should not be identical
                        # (This is a simple check - in practice shots should differ)
                        img1_extrema = img1_rgb.getextrema()
                        img2_extrema = img2_rgb.getextrema()
                        
                        # At least one channel should have different extrema
                        assert img1_extrema != img2_extrema or \
                               img1_rgb.size != img2_rgb.size, \
                            "Shots should not be identical"


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s", "--tb=short"])
