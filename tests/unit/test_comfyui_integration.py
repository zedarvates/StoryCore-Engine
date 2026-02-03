"""
Unit tests for ComfyUI Integration.

Tests availability checking, workflow execution, fallback mode, and error handling.
"""

import pytest
import asyncio
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from PIL import Image

from src.end_to_end.comfyui_integration import ComfyUIIntegration
from src.end_to_end.data_models import (
    WorldConfig,
    StyleConfig,
    ShotConfig,
    ColorPalette,
    FallbackMode,
    Location
)


@pytest.fixture
def sample_world_config():
    """Create sample world config for testing"""
    return WorldConfig(
        world_id="test_world",
        name="Test World",
        genre="cyberpunk",
        setting="futuristic city",
        time_period="2077",
        visual_style=["neon", "dark", "rainy"],
        color_palette=ColorPalette(
            primary="#FF00FF",
            secondary="#00FFFF",
            accent="#FFFF00",
            background="#1a1a1a"
        ),
        lighting_style="neon",
        atmosphere="dystopian",
        key_locations=[]
    )


@pytest.fixture
def sample_style_config():
    """Create sample style config for testing"""
    return StyleConfig(
        style_type="cinematic",
        style_strength=0.8,
        color_palette=ColorPalette(
            primary="#FF0000",
            secondary="#00FF00",
            accent="#0000FF",
            background="#1a1a1a"
        ),
        visual_elements=["dramatic lighting", "wide angle"]
    )


@pytest.fixture
def sample_shot_config(sample_style_config):
    """Create sample shot config for testing"""
    return ShotConfig(
        shot_id="shot_001",
        prompt="cyberpunk city street, neon lights, rain",
        negative_prompt="low quality, blurry",
        width=1920,
        height=1080,
        steps=25,
        cfg_scale=7.5,
        seed=42,
        style_config=sample_style_config
    )


class TestComfyUIIntegrationAvailability:
    """Test availability checking"""
    
    @pytest.mark.asyncio
    async def test_check_availability_success(self):
        """Test successful availability check"""
        integration = ComfyUIIntegration(
            backend_url="http://localhost:8188",
            timeout=5
        )
        
        # Mock successful response
        mock_session = MagicMock()
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            'version': '1.0.0',
            'queue_remaining': 2
        })
        
        mock_session.get.return_value.__aenter__ = AsyncMock(return_value=mock_response)
        mock_session.get.return_value.__aexit__ = AsyncMock(return_value=None)
        
        integration._session = mock_session
        
        status = await integration.check_availability()
        
        assert status.available is True
        assert status.url == "http://localhost:8188"
        assert status.version == '1.0.0'
        assert status.queue_size == 2
        assert status.error_message is None
    
    @pytest.mark.asyncio
    async def test_check_availability_connection_error(self):
        """Test availability check with connection error"""
        integration = ComfyUIIntegration(
            backend_url="http://localhost:8188",
            timeout=5
        )
        
        # Mock connection error
        mock_session = MagicMock()
        mock_session.get.side_effect = Exception("Connection refused")
        
        integration._session = mock_session
        
        status = await integration.check_availability()
        
        assert status.available is False
        assert status.url == "http://localhost:8188"
        assert status.error_message is not None
        assert "Connection refused" in status.error_message
    
    @pytest.mark.asyncio
    async def test_check_availability_http_error(self):
        """Test availability check with HTTP error"""
        integration = ComfyUIIntegration(
            backend_url="http://localhost:8188",
            timeout=5
        )
        
        # Mock HTTP error
        mock_session = MagicMock()
        mock_response = AsyncMock()
        mock_response.status = 500
        
        mock_session.get.return_value.__aenter__ = AsyncMock(return_value=mock_response)
        mock_session.get.return_value.__aexit__ = AsyncMock(return_value=None)
        
        integration._session = mock_session
        
        status = await integration.check_availability()
        
        assert status.available is False
        assert "HTTP 500" in status.error_message


class TestComfyUIIntegrationWorkflow:
    """Test workflow configuration and execution"""
    
    def test_create_workflow_config(self, sample_shot_config):
        """Test workflow configuration creation"""
        integration = ComfyUIIntegration(
            backend_url="http://localhost:8188"
        )
        
        config = integration._create_workflow_config(sample_shot_config)
        
        assert config is not None
        assert 'prompt' in config
        assert config['prompt']['positive'] == sample_shot_config.prompt
        assert config['prompt']['negative'] == sample_shot_config.negative_prompt
        assert config['size']['width'] == 1920
        assert config['size']['height'] == 1080
        assert config['sampling']['steps'] == 25
        assert config['sampling']['cfg_scale'] == 7.5
        assert config['sampling']['seed'] == 42
    
    def test_create_coherence_prompt(self, sample_world_config, sample_style_config):
        """Test coherence prompt creation"""
        integration = ComfyUIIntegration(
            backend_url="http://localhost:8188"
        )
        
        prompt = integration._create_coherence_prompt(
            sample_world_config,
            sample_style_config,
            0
        )
        
        assert prompt is not None
        assert "cyberpunk" in prompt.lower()
        assert "futuristic city" in prompt.lower()
        assert len(prompt) > 0


class TestComfyUIIntegrationFallback:
    """Test fallback mode"""
    
    def test_create_placeholder_image(self, sample_shot_config):
        """Test placeholder image creation"""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "placeholder.png"
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188",
                fallback_mode=FallbackMode.PLACEHOLDER
            )
            
            image = integration._create_placeholder_image(sample_shot_config, output_path)
            
            assert image is not None
            assert image.file_path.exists()
            assert image.width == 1920
            assert image.height == 1080
            assert image.metadata.get('placeholder') is True
            assert image.quality_score == 0.0
            
            # Verify image is valid and close it
            img = Image.open(output_path)
            assert img.size == (1920, 1080)
            img.close()  # Close to release file handle
    
    @pytest.mark.asyncio
    async def test_generate_shot_with_placeholder_fallback(self, sample_shot_config):
        """Test shot generation with placeholder fallback"""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "shot.png"
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188",
                fallback_mode=FallbackMode.PLACEHOLDER
            )
            
            # Mock unavailable backend
            with patch.object(integration, 'check_availability') as mock_check:
                mock_status = MagicMock()
                mock_status.available = False
                mock_check.return_value = mock_status
                
                coherence_sheet = MagicMock()
                coherence_sheet.style_config = sample_shot_config.style_config
                
                image = await integration.generate_shot(
                    sample_shot_config,
                    coherence_sheet,
                    output_path
                )
                
                assert image is not None
                assert image.file_path.exists()
                assert image.metadata.get('placeholder') is True
    
    @pytest.mark.asyncio
    async def test_generate_shot_with_abort_fallback(self, sample_shot_config):
        """Test shot generation with abort fallback"""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "shot.png"
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188",
                fallback_mode=FallbackMode.ABORT
            )
            
            # Mock unavailable backend
            with patch.object(integration, 'check_availability') as mock_check:
                mock_status = MagicMock()
                mock_status.available = False
                mock_check.return_value = mock_status
                
                coherence_sheet = MagicMock()
                coherence_sheet.style_config = sample_shot_config.style_config
                
                with pytest.raises(RuntimeError, match="unavailable"):
                    await integration.generate_shot(
                        sample_shot_config,
                        coherence_sheet,
                        output_path
                    )
    
    def test_get_fallback_mode(self):
        """Test fallback mode getter"""
        integration = ComfyUIIntegration(
            backend_url="http://localhost:8188",
            fallback_mode=FallbackMode.PLACEHOLDER
        )
        
        assert integration.get_fallback_mode() == FallbackMode.PLACEHOLDER


class TestComfyUIIntegrationQuality:
    """Test quality validation"""
    
    def test_validate_image_quality_valid(self):
        """Test quality validation with valid image"""
        with tempfile.TemporaryDirectory() as tmpdir:
            image_path = Path(tmpdir) / "test.png"
            
            # Create valid test image
            img = Image.new('RGB', (1920, 1080), color='blue')
            img.save(image_path)
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188"
            )
            
            from src.end_to_end.data_models import GeneratedImage
            
            generated_image = GeneratedImage(
                image_id="test_001",
                shot_id="shot_001",
                file_path=image_path,
                width=1920,
                height=1080,
                generation_time=1.5,
                quality_score=0.8
            )
            
            is_valid = integration.validate_image_quality(generated_image)
            
            assert is_valid is True
    
    def test_validate_image_quality_placeholder(self):
        """Test quality validation with placeholder"""
        with tempfile.TemporaryDirectory() as tmpdir:
            image_path = Path(tmpdir) / "placeholder.png"
            
            # Create placeholder
            img = Image.new('RGB', (512, 512), color='gray')
            img.save(image_path)
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188"
            )
            
            from src.end_to_end.data_models import GeneratedImage
            
            generated_image = GeneratedImage(
                image_id="placeholder_001",
                shot_id="shot_001",
                file_path=image_path,
                width=512,
                height=512,
                generation_time=0.1,
                quality_score=0.0,
                metadata={'placeholder': True}
            )
            
            is_valid = integration.validate_image_quality(generated_image)
            
            assert is_valid is False
    
    def test_validate_image_quality_too_small(self):
        """Test quality validation with too small image"""
        with tempfile.TemporaryDirectory() as tmpdir:
            image_path = Path(tmpdir) / "small.png"
            
            # Create small image
            img = Image.new('RGB', (256, 256), color='red')
            img.save(image_path)
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188"
            )
            
            from src.end_to_end.data_models import GeneratedImage
            
            generated_image = GeneratedImage(
                image_id="small_001",
                shot_id="shot_001",
                file_path=image_path,
                width=256,
                height=256,
                generation_time=1.0
            )
            
            is_valid = integration.validate_image_quality(generated_image)
            
            assert is_valid is False
    
    def test_validate_image_quality_blank(self):
        """Test quality validation with blank image"""
        with tempfile.TemporaryDirectory() as tmpdir:
            image_path = Path(tmpdir) / "blank.png"
            
            # Create blank image (all same color)
            img = Image.new('RGB', (1920, 1080), color=(128, 128, 128))
            img.save(image_path)
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188"
            )
            
            from src.end_to_end.data_models import GeneratedImage
            
            generated_image = GeneratedImage(
                image_id="blank_001",
                shot_id="shot_001",
                file_path=image_path,
                width=1920,
                height=1080,
                generation_time=1.0
            )
            
            is_valid = integration.validate_image_quality(generated_image)
            
            assert is_valid is False


class TestComfyUIIntegrationRetry:
    """Test retry logic"""
    
    @pytest.mark.asyncio
    async def test_generate_with_retry_success_first_attempt(self, sample_shot_config):
        """Test successful generation on first attempt"""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "shot.png"
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188",
                max_retries=3
            )
            
            # Create test image data
            test_img = Image.new('RGB', (1920, 1080), color='green')
            test_img_path = Path(tmpdir) / "temp.png"
            test_img.save(test_img_path)
            test_img_data = test_img_path.read_bytes()
            
            # Mock successful API call
            with patch.object(integration, '_call_generation_api') as mock_api:
                mock_api.return_value = test_img_data
                
                image = await integration._generate_with_retry(sample_shot_config, output_path)
                
                assert image is not None
                assert image.file_path.exists()
                assert mock_api.call_count == 1
    
    @pytest.mark.asyncio
    async def test_generate_with_retry_success_after_retries(self, sample_shot_config):
        """Test successful generation after retries"""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "shot.png"
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188",
                max_retries=3
            )
            
            # Create test image data
            test_img = Image.new('RGB', (1920, 1080), color='yellow')
            test_img_path = Path(tmpdir) / "temp.png"
            test_img.save(test_img_path)
            test_img_data = test_img_path.read_bytes()
            
            # Mock API call that fails twice then succeeds
            call_count = [0]
            
            async def mock_api_call(config):
                call_count[0] += 1
                if call_count[0] < 3:
                    return None
                return test_img_data
            
            with patch.object(integration, '_call_generation_api', side_effect=mock_api_call):
                image = await integration._generate_with_retry(sample_shot_config, output_path)
                
                assert image is not None
                assert image.file_path.exists()
                assert call_count[0] == 3
    
    @pytest.mark.asyncio
    async def test_generate_with_retry_all_fail(self, sample_shot_config):
        """Test generation failure after all retries"""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = Path(tmpdir) / "shot.png"
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188",
                max_retries=3
            )
            
            # Mock API call that always fails
            with patch.object(integration, '_call_generation_api') as mock_api:
                mock_api.return_value = None
                
                with pytest.raises(RuntimeError, match="Generation failed"):
                    await integration._generate_with_retry(sample_shot_config, output_path)
                
                assert mock_api.call_count == 3


class TestComfyUIIntegrationCoherenceSheet:
    """Test master coherence sheet generation"""
    
    @pytest.mark.asyncio
    async def test_generate_coherence_sheet_with_backend(
        self,
        sample_world_config,
        sample_style_config
    ):
        """Test coherence sheet generation with available backend"""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188",
                fallback_mode=FallbackMode.PLACEHOLDER
            )
            
            # Mock available backend
            with patch.object(integration, 'check_availability') as mock_check:
                mock_status = MagicMock()
                mock_status.available = True
                mock_check.return_value = mock_status
                
                # Mock generation
                with patch.object(integration, '_generate_with_retry') as mock_gen:
                    async def mock_generate(shot_config, output_path):
                        return integration._create_placeholder_image(shot_config, output_path)
                    
                    mock_gen.side_effect = mock_generate
                    
                    sheet = await integration.generate_master_coherence_sheet(
                        sample_world_config,
                        sample_style_config,
                        output_dir
                    )
                    
                    assert sheet is not None
                    assert len(sheet.grid_images) == 9
                    assert sheet.style_config == sample_style_config
                    assert mock_gen.call_count == 9
    
    @pytest.mark.asyncio
    async def test_generate_coherence_sheet_with_fallback(
        self,
        sample_world_config,
        sample_style_config
    ):
        """Test coherence sheet generation with fallback"""
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir)
            
            integration = ComfyUIIntegration(
                backend_url="http://localhost:8188",
                fallback_mode=FallbackMode.PLACEHOLDER
            )
            
            # Mock unavailable backend
            with patch.object(integration, 'check_availability') as mock_check:
                mock_status = MagicMock()
                mock_status.available = False
                mock_check.return_value = mock_status
                
                sheet = await integration.generate_master_coherence_sheet(
                    sample_world_config,
                    sample_style_config,
                    output_dir
                )
                
                assert sheet is not None
                assert len(sheet.grid_images) == 9
                
                # All should be placeholders
                for image in sheet.grid_images:
                    assert image.metadata.get('placeholder') is True
