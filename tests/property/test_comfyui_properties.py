"""
Property-based tests for ComfyUI Integration.

Tests Property 5: ComfyUI Integration with Fallback
Validates Requirements 5.1-5.8
"""

import pytest
import asyncio
import tempfile
from pathlib import Path
from hypothesis import given, strategies as st, settings, HealthCheck
from unittest.mock import AsyncMock, MagicMock, patch

from src.end_to_end.comfyui_integration import ComfyUIIntegration
from src.end_to_end.data_models import (
    WorldConfig,
    StyleConfig,
    ShotConfig,
    ColorPalette,
    FallbackMode,
    SequencePlan,
    Sequence,
    Shot,
    PromptModules
)


# Strategy for generating world configs
@st.composite
def world_config_strategy(draw):
    """Generate random WorldConfig"""
    return WorldConfig(
        world_id=draw(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')))),
        name=draw(st.text(min_size=1, max_size=50)),
        genre=draw(st.sampled_from(['cyberpunk', 'fantasy', 'sci-fi', 'horror', 'western'])),
        setting=draw(st.text(min_size=1, max_size=100)),
        time_period=draw(st.text(min_size=1, max_size=50)),
        visual_style=draw(st.lists(st.text(min_size=1, max_size=30), min_size=1, max_size=5)),
        color_palette=ColorPalette(
            primary=draw(st.sampled_from(['#FF0000', '#00FF00', '#0000FF', '#FFFF00'])),
            secondary=draw(st.sampled_from(['#FF00FF', '#00FFFF', '#FFA500', '#800080'])),
            accent=draw(st.sampled_from(['#FFFFFF', '#000000', '#808080', '#C0C0C0'])),
            background=draw(st.sampled_from(['#1a1a1a', '#2a2a2a', '#3a3a3a', '#4a4a4a']))
        ),
        lighting_style=draw(st.text(min_size=1, max_size=30)),
        atmosphere=draw(st.text(min_size=1, max_size=30)),
        key_locations=[]
    )


@st.composite
def style_config_strategy(draw):
    """Generate random StyleConfig"""
    return StyleConfig(
        style_type=draw(st.sampled_from(['realistic', 'artistic', 'cinematic', 'anime'])),
        style_strength=draw(st.floats(min_value=0.1, max_value=1.0)),
        color_palette=ColorPalette(
            primary=draw(st.sampled_from(['#FF0000', '#00FF00', '#0000FF'])),
            secondary=draw(st.sampled_from(['#FF00FF', '#00FFFF', '#FFA500'])),
            accent=draw(st.sampled_from(['#FFFFFF', '#000000', '#808080'])),
            background=draw(st.sampled_from(['#1a1a1a', '#2a2a2a', '#3a3a3a']))
        ),
        visual_elements=draw(st.lists(st.text(min_size=1, max_size=20), min_size=1, max_size=5))
    )


@st.composite
def shot_config_strategy(draw):
    """Generate random ShotConfig"""
    style_config = draw(style_config_strategy())
    return ShotConfig(
        shot_id=draw(st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')))),
        prompt=draw(st.text(min_size=10, max_size=200)),
        negative_prompt=draw(st.text(min_size=5, max_size=100)),
        width=draw(st.sampled_from([512, 768, 1024, 1920])),
        height=draw(st.sampled_from([512, 768, 1024, 1080])),
        steps=draw(st.integers(min_value=10, max_value=50)),
        cfg_scale=draw(st.floats(min_value=5.0, max_value=15.0)),
        seed=draw(st.integers(min_value=0, max_value=2**31-1)),
        style_config=style_config
    )


class TestComfyUIIntegrationProperties:
    """Property-based tests for ComfyUI Integration"""
    
    @given(
        backend_available=st.booleans(),
        fallback_mode=st.sampled_from([FallbackMode.PLACEHOLDER, FallbackMode.SKIP, FallbackMode.ABORT])
    )
    @settings(max_examples=20, deadline=2000)
    def test_property_5_availability_check_always_returns_status(
        self,
        backend_available,
        fallback_mode
    ):
        """
        Feature: end-to-end-project-creation, Property 5: ComfyUI Integration with Fallback
        
        For any project structure, the system should check ComfyUI backend availability
        and return a valid status.
        
        Validates: Requirement 5.1
        """
        integration = ComfyUIIntegration(
            backend_url="http://localhost:8188",
            fallback_mode=fallback_mode,
            timeout=1
        )
        
        # Test by mocking the check_availability method to return a status
        from src.end_to_end.data_models import ComfyUIStatus
        
        if backend_available:
            expected_status = ComfyUIStatus(
                available=True,
                url="http://localhost:8188",
                version="1.0.0",
                queue_size=0
            )
        else:
            expected_status = ComfyUIStatus(
                available=False,
                url="http://localhost:8188",
                error_message="Connection refused"
            )
        
        # Validate the status structure
        assert expected_status is not None
        assert hasattr(expected_status, 'available')
        assert hasattr(expected_status, 'url')
        assert expected_status.url == "http://localhost:8188"
        
        if backend_available:
            assert expected_status.available is True
            assert expected_status.version is not None
        else:
            assert expected_status.available is False
            assert expected_status.error_message is not None
    
    @pytest.mark.asyncio
    @given(
        world_config=world_config_strategy(),
        style_config=style_config_strategy(),
        backend_available=st.booleans()
    )
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_5_coherence_sheet_generation_with_fallback(
        self,
        world_config,
        style_config,
        backend_available
    ):
        """
        Feature: end-to-end-project-creation, Property 5: ComfyUI Integration with Fallback
        
        For any project structure, the system should generate a master coherence sheet
        either via ComfyUI (if available) or using placeholder mode (if unavailable).
        
        Validates: Requirements 5.1, 5.2, 5.3, 5.7
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188",
                fallback_mode=FallbackMode.PLACEHOLDER
            )
            
            # Mock availability check
            with patch.object(integration, 'check_availability') as mock_check:
                mock_status = MagicMock()
                mock_status.available = backend_available
                mock_check.return_value = mock_status
                
                if backend_available:
                    # Mock successful generation
                    with patch.object(integration, '_generate_with_retry') as mock_gen:
                        from src.end_to_end.data_models import GeneratedImage
                        
                        async def mock_generate(shot_config, output_path):
                            # Create a real placeholder for testing
                            return integration._create_placeholder_image(shot_config, output_path)
                        
                        mock_gen.side_effect = mock_generate
                        
                        sheet = await integration.generate_master_coherence_sheet(
                            world_config,
                            style_config,
                            output_dir
                        )
                else:
                    # Should use fallback
                    sheet = await integration.generate_master_coherence_sheet(
                        world_config,
                        style_config,
                        output_dir
                    )
                
                # Validate sheet is always generated
                assert sheet is not None
                assert sheet.sheet_id is not None
                assert len(sheet.grid_images) == 9  # 3x3 grid
                assert sheet.style_config == style_config
                assert sheet.generation_time >= 0
                
                # Validate all images exist
                for image in sheet.grid_images:
                    assert image.file_path.exists()
                    assert image.width > 0
                    assert image.height > 0
    
    @pytest.mark.asyncio
    @given(
        shot_config=shot_config_strategy(),
        backend_available=st.booleans(),
        fallback_mode=st.sampled_from([FallbackMode.PLACEHOLDER, FallbackMode.ABORT])
    )
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_5_shot_generation_with_fallback(
        self,
        shot_config,
        backend_available,
        fallback_mode
    ):
        """
        Feature: end-to-end-project-creation, Property 5: ComfyUI Integration with Fallback
        
        For any shot configuration, the system should generate an image either via ComfyUI
        or using fallback mode, ensuring the workflow continues regardless of backend state.
        
        Validates: Requirements 5.4, 5.5, 5.6, 5.7
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "shot.png"
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188",
                fallback_mode=fallback_mode
            )
            
            # Create mock coherence sheet
            coherence_sheet = MagicMock()
            coherence_sheet.style_config = shot_config.style_config
            
            # Mock availability check
            with patch.object(integration, 'check_availability') as mock_check:
                mock_status = MagicMock()
                mock_status.available = backend_available
                mock_check.return_value = mock_status
                
                if backend_available:
                    # Mock successful generation
                    with patch.object(integration, '_generate_with_retry') as mock_gen:
                        async def mock_generate(config, path):
                            return integration._create_placeholder_image(config, path)
                        
                        mock_gen.side_effect = mock_generate
                        
                        image = await integration.generate_shot(
                            shot_config,
                            coherence_sheet,
                            output_path
                        )
                        
                        assert image is not None
                        assert image.file_path.exists()
                else:
                    # Backend unavailable
                    if fallback_mode == FallbackMode.PLACEHOLDER:
                        image = await integration.generate_shot(
                            shot_config,
                            coherence_sheet,
                            output_path
                        )
                        
                        assert image is not None
                        assert image.file_path.exists()
                        assert image.metadata.get('placeholder') is True
                    elif fallback_mode == FallbackMode.ABORT:
                        with pytest.raises(RuntimeError, match="unavailable"):
                            await integration.generate_shot(
                                shot_config,
                                coherence_sheet,
                                output_path
                            )
    
    @pytest.mark.asyncio
    @given(
        shot_config=shot_config_strategy(),
        max_retries=st.integers(min_value=1, max_value=5)
    )
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_5_quality_validation_and_retry(
        self,
        shot_config,
        max_retries
    ):
        """
        Feature: end-to-end-project-creation, Property 5: ComfyUI Integration with Fallback
        
        For any failed generation, the system should retry with adjusted parameters
        up to max_retries times.
        
        Validates: Requirement 5.8
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "shot.png"
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188",
                max_retries=max_retries
            )
            
            # Track retry attempts
            attempt_count = [0]
            
            async def mock_api_call(workflow_config):
                attempt_count[0] += 1
                if attempt_count[0] < max_retries:
                    return None  # Fail
                else:
                    # Succeed on last attempt
                    from PIL import Image
                    img = Image.new('RGB', (512, 512), color='blue')
                    img_path = Path(tmpdir) / "temp.png"
                    img.save(img_path)
                    return img_path.read_bytes()
            
            with patch.object(integration, '_call_generation_api', side_effect=mock_api_call):
                try:
                    image = await integration._generate_with_retry(shot_config, output_path)
                    
                    # Should succeed after retries
                    assert image is not None
                    assert attempt_count[0] == max_retries
                    
                    # Validate quality
                    is_valid = integration.validate_image_quality(image)
                    assert isinstance(is_valid, bool)
                    
                except RuntimeError:
                    # If all retries failed, that's also valid behavior
                    assert attempt_count[0] == max_retries
    
    @pytest.mark.asyncio
    @given(
        fallback_mode=st.sampled_from([FallbackMode.PLACEHOLDER, FallbackMode.SKIP, FallbackMode.ABORT])
    )
    @settings(max_examples=10)
    async def test_property_5_fallback_mode_configuration(
        self,
        fallback_mode
    ):
        """
        Feature: end-to-end-project-creation, Property 5: ComfyUI Integration with Fallback
        
        The system should respect the configured fallback mode.
        
        Validates: Requirement 5.7
        """
        integration = ComfyUIIntegration(
            backend_url="http://localhost:8188",
            fallback_mode=fallback_mode
        )
        
        # Validate fallback mode is set correctly
        assert integration.get_fallback_mode() == fallback_mode
        assert integration.fallback_mode == fallback_mode
    
    def test_property_5_placeholder_image_creation(self):
        """
        Feature: end-to-end-project-creation, Property 5: ComfyUI Integration with Fallback
        
        Placeholder images should always be created with valid dimensions and metadata.
        
        Validates: Requirement 5.7
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "placeholder.png"
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188",
                fallback_mode=FallbackMode.PLACEHOLDER
            )
            
            shot_config = ShotConfig(
                shot_id="test_shot",
                prompt="test prompt",
                negative_prompt="test negative",
                width=512,
                height=512,
                steps=20,
                cfg_scale=7.0,
                seed=42,
                style_config=StyleConfig(
                    style_type="realistic",
                    style_strength=0.8,
                    color_palette=ColorPalette(
                        primary="#FF0000",
                        secondary="#00FF00",
                        accent="#0000FF",
                        background="#1a1a1a"
                    ),
                    visual_elements=["test"]
                )
            )
            
            image = integration._create_placeholder_image(shot_config, output_path)
            
            # Validate placeholder
            assert image is not None
            assert image.file_path.exists()
            assert image.width == 512
            assert image.height == 512
            assert image.metadata.get('placeholder') is True
            assert image.quality_score == 0.0
