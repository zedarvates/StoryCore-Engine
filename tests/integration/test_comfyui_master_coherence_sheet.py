"""
Integration tests for Master Coherence Sheet generation with ComfyUI backend.

Tests the complete 3x3 grid generation workflow with real ComfyUI backend,
validating all 9 panels are generated correctly with proper dimensions and quality.

Requirements tested: 5.3
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
        MasterCoherenceSheet,
        FallbackMode,
        ColorPalette
    )
except ImportError:
    pytest.skip("ComfyUI integration modules not available", allow_module_level=True)


class TestMasterCoherenceSheetGeneration:
    """End-to-end tests for Master Coherence Sheet generation."""
    
    @pytest.fixture
    def backend_url(self):
        """Get ComfyUI backend URL from environment or use default."""
        return os.getenv("COMFYUI_URL", "http://localhost:8000")
    
    @pytest.fixture
    def temp_output_dir(self):
        """Create temporary directory for test outputs."""
        temp_dir = tempfile.mkdtemp(prefix="test_coherence_sheet_")
        yield Path(temp_dir)
        # Cleanup after test
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    @pytest.fixture
    def world_config(self):
        """Create sample world configuration."""
        return WorldConfig(
            name="Test World",
            description="A vibrant fantasy world with magical forests",
            setting="Fantasy medieval kingdom",
            time_period="Medieval era",
            atmosphere="Mystical and enchanting",
            color_palette=ColorPalette(
                primary="#4A7C59",
                secondary="#8B4513",
                accent="#FFD700",
                background="#2F4F4F"
            )
        )
    
    @pytest.fixture
    def style_config(self):
        """Create sample style configuration."""
        return StyleConfig(
            art_style="Cinematic fantasy illustration",
            lighting="Soft golden hour lighting",
            camera_angle="Wide establishing shot",
            mood="Peaceful and magical",
            quality_tags="highly detailed, 4k, professional"
        )
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_master_coherence_sheet_generation_real_backend(
        self, backend_url, temp_output_dir, world_config, style_config
    ):
        """
        Test complete 3x3 Master Coherence Sheet generation with real backend.
        
        Validates:
        - All 9 panels are generated
        - Each panel has correct dimensions
        - Images meet quality thresholds
        - Output files are created correctly
        """
        # Initialize ComfyUI integration
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=60,
            max_retries=3,
            fallback_mode=FallbackMode.PLACEHOLDER
        ) as comfyui:
            # Check backend availability
            status = await comfyui.check_availability()
            
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            # Generate Master Coherence Sheet
            coherence_sheet = await comfyui.generate_master_coherence_sheet(
                world_config=world_config,
                style_config=style_config,
                output_dir=temp_output_dir
            )
            
            # Validate the coherence sheet structure
            assert coherence_sheet is not None, "Coherence sheet should not be None"
            assert isinstance(coherence_sheet, MasterCoherenceSheet), \
                "Should return MasterCoherenceSheet instance"
            
            # Validate all 9 panels are present
            assert len(coherence_sheet.panels) == 9, \
                f"Should have 9 panels, got {len(coherence_sheet.panels)}"
            
            # Validate each panel
            for i, panel in enumerate(coherence_sheet.panels):
                # Check panel file exists
                assert panel.path.exists(), \
                    f"Panel {i} file should exist at {panel.path}"
                
                # Load and validate image
                with Image.open(panel.path) as img:
                    # Check dimensions
                    width, height = img.size
                    assert width > 0 and height > 0, \
                        f"Panel {i} should have valid dimensions, got {width}x{height}"
                    
                    # Check aspect ratio is reasonable (not too extreme)
                    aspect_ratio = width / height
                    assert 0.5 <= aspect_ratio <= 2.0, \
                        f"Panel {i} aspect ratio {aspect_ratio} is outside reasonable range"
                    
                    # Check image format
                    assert img.format in ['PNG', 'JPEG', 'JPG'], \
                        f"Panel {i} should be PNG or JPEG, got {img.format}"
                    
                    # Check image is not blank (has some variation)
                    extrema = img.convert('L').getextrema()
                    assert extrema[1] - extrema[0] > 10, \
                        f"Panel {i} appears to be blank or has no variation"
            
            # Validate grid dimensions
            assert coherence_sheet.grid_width == 3, "Grid should be 3 panels wide"
            assert coherence_sheet.grid_height == 3, "Grid should be 3 panels tall"
            
            # Validate metadata
            assert coherence_sheet.world_config == world_config, \
                "World config should be preserved"
            assert coherence_sheet.style_config == style_config, \
                "Style config should be preserved"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_master_coherence_sheet_quality_thresholds(
        self, backend_url, temp_output_dir, world_config, style_config
    ):
        """
        Test that generated panels meet minimum quality thresholds.
        
        Validates:
        - Images have sufficient sharpness
        - Images have good color distribution
        - Images are not corrupted
        """
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=60,
            max_retries=3
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            coherence_sheet = await comfyui.generate_master_coherence_sheet(
                world_config=world_config,
                style_config=style_config,
                output_dir=temp_output_dir
            )
            
            for i, panel in enumerate(coherence_sheet.panels):
                with Image.open(panel.path) as img:
                    # Convert to RGB for consistent analysis
                    rgb_img = img.convert('RGB')
                    
                    # Check color distribution (not monochrome)
                    r_extrema = rgb_img.getchannel('R').getextrema()
                    g_extrema = rgb_img.getchannel('G').getextrema()
                    b_extrema = rgb_img.getchannel('B').getextrema()
                    
                    r_range = r_extrema[1] - r_extrema[0]
                    g_range = g_extrema[1] - g_extrema[0]
                    b_range = b_extrema[1] - b_extrema[0]
                    
                    # At least one channel should have good range
                    assert max(r_range, g_range, b_range) > 50, \
                        f"Panel {i} has poor color distribution"
                    
                    # Check file size is reasonable (not corrupted)
                    file_size = panel.path.stat().st_size
                    # At least 1KB
                    assert file_size > 1024, \
                        f"Panel {i} file size {file_size} is suspiciously small"
                    # Less than 50MB
                    assert file_size < 50 * 1024 * 1024, \
                        f"Panel {i} file size {file_size} is suspiciously large"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_master_coherence_sheet_fallback_mode(
        self, temp_output_dir, world_config, style_config
    ):
        """
        Test fallback to mock mode when backend is unavailable.
        
        Validates:
        - System gracefully falls back to placeholder generation
        - All 9 panels are still created
        - Placeholder images have correct structure
        """
        # Use invalid URL to force fallback
        async with ComfyUIIntegration(
            backend_url="http://localhost:9999",  # Invalid port
            timeout=2,
            max_retries=1,
            fallback_mode=FallbackMode.PLACEHOLDER
        ) as comfyui:
            # This should fall back to mock mode
            coherence_sheet = await comfyui.generate_master_coherence_sheet(
                world_config=world_config,
                style_config=style_config,
                output_dir=temp_output_dir
            )
            
            # Should still generate 9 panels
            assert len(coherence_sheet.panels) == 9, \
                "Should generate 9 placeholder panels"
            
            # All panels should exist
            for i, panel in enumerate(coherence_sheet.panels):
                assert panel.path.exists(), \
                    f"Placeholder panel {i} should exist"
                
                # Verify it's a valid image
                with Image.open(panel.path) as img:
                    assert img.size[0] > 0 and img.size[1] > 0, \
                        f"Placeholder panel {i} should have valid dimensions"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_master_coherence_sheet_progress_tracking(
        self, backend_url, temp_output_dir, world_config, style_config
    ):
        """
        Test progress tracking during Master Coherence Sheet generation.
        
        Validates:
        - Progress callback is called for each panel
        - Progress values are in correct range (0-100)
        - All 9 panels are tracked
        """
        progress_updates = []
        
        def progress_callback(progress):
            """Track progress updates."""
            progress_updates.append({
                'current_item': progress.current_item,
                'total_items': progress.total_items,
                'percentage': progress.percentage,
                'current_step': progress.current_step
            })
        
        async with ComfyUIIntegration(
            backend_url=backend_url,
            timeout=60,
            max_retries=3
        ) as comfyui:
            status = await comfyui.check_availability()
            if not status.available:
                pytest.skip(f"ComfyUI backend not available at {backend_url}")
            
            await comfyui.generate_master_coherence_sheet(
                world_config=world_config,
                style_config=style_config,
                output_dir=temp_output_dir,
                progress_callback=progress_callback
            )
            
            # Should have received progress updates
            assert len(progress_updates) > 0, \
                "Should receive progress updates"
            
            # Check progress values
            for update in progress_updates:
                assert 0 <= update['percentage'] <= 100, \
                    f"Progress percentage should be 0-100, got {update['percentage']}"
                assert update['total_items'] == 9, \
                    "Total items should be 9 for Master Coherence Sheet"
                assert 1 <= update['current_item'] <= 9, \
                    f"Current item should be 1-9, got {update['current_item']}"
            
            # Should track all 9 panels
            final_update = progress_updates[-1]
            assert final_update['current_item'] == 9, \
                "Final update should be for panel 9"
            assert final_update['percentage'] == 100, \
                "Final progress should be 100%"


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "-s", "--tb=short"])
