"""
Comprehensive tests for Enhanced Image Engine

Tests all aspects of the enhanced image engine including workflow routing,
advanced integrations, batch processing, and quality validation.

Author: StoryCore-Engine Team
Date: January 12, 2026
Version: 1.0.0
"""

import asyncio
import json
import pytest
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

try:
    from enhanced_image_engine import (
        EnhancedImageEngine,
        EnhancedImageConfig,
        ImageGenerationRequest,
        ImageGenerationResult,
        ImageGenerationMode,
        WorkflowStrategy,
        ImageStyle,
        create_enhanced_image_engine
    )
except ImportError as e:
    print(f"Import error: {e}")
    # Create mock classes for testing
    class EnhancedImageEngine:
        pass
    class EnhancedImageConfig:
        pass

# Mock PIL Image for testing
class MockImage:
    def __init__(self, size=(1024, 1024), mode='RGB'):
        self.size = size
        self.mode = mode
    
    def copy(self):
        return MockImage(self.size, self.mode)
    
    def save(self, path):
        pass
    
    @staticmethod
    def new(mode, size, color=None):
        return MockImage(size, mode)


class TestEnhancedImageConfig:
    """Test Enhanced Image Engine configuration"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = EnhancedImageConfig()
        
        assert config.default_mode == ImageGenerationMode.AUTO
        assert config.default_strategy == WorkflowStrategy.BALANCED
        assert config.default_style == ImageStyle.REALISTIC
        assert config.quality_threshold == 0.8
        assert config.enable_quality_validation is True
        assert config.auto_enhance is True
        assert config.max_concurrent_generations == 3
        assert config.enable_batch_processing is True
        assert config.batch_size == 4
        assert config.enable_fallback_workflows is True
        assert config.output_format == "PNG"
    
    def test_custom_config(self):
        """Test custom configuration values"""
        config = EnhancedImageConfig(
            default_mode=ImageGenerationMode.ANIME,
            default_strategy=WorkflowStrategy.QUALITY_FIRST,
            quality_threshold=0.9,
            max_concurrent_generations=5,
            batch_size=8
        )
        
        assert config.default_mode == ImageGenerationMode.ANIME
        assert config.default_strategy == WorkflowStrategy.QUALITY_FIRST
        assert config.quality_threshold == 0.9
        assert config.max_concurrent_generations == 5
        assert config.batch_size == 8


class TestImageEnums:
    """Test image-related enums"""
    
    def test_image_generation_mode_enum(self):
        """Test ImageGenerationMode enum values"""
        assert ImageGenerationMode.STANDARD.value == "standard"
        assert ImageGenerationMode.ANIME.value == "anime"
        assert ImageGenerationMode.PROFESSIONAL_EDIT.value == "professional_edit"
        assert ImageGenerationMode.LAYERED_COMPOSITION.value == "layered_composition"
        assert ImageGenerationMode.LIGHTNING_FAST.value == "lightning_fast"
        assert ImageGenerationMode.HYBRID.value == "hybrid"
        assert ImageGenerationMode.AUTO.value == "auto"
    
    def test_workflow_strategy_enum(self):
        """Test WorkflowStrategy enum values"""
        assert WorkflowStrategy.QUALITY_FIRST.value == "quality_first"
        assert WorkflowStrategy.SPEED_FIRST.value == "speed_first"
        assert WorkflowStrategy.BALANCED.value == "balanced"
        assert WorkflowStrategy.STYLE_AWARE.value == "style_aware"
        assert WorkflowStrategy.CONTENT_AWARE.value == "content_aware"
    
    def test_image_style_enum(self):
        """Test ImageStyle enum values"""
        assert ImageStyle.REALISTIC.value == "realistic"
        assert ImageStyle.ANIME.value == "anime"
        assert ImageStyle.ARTISTIC.value == "artistic"
        assert ImageStyle.PROFESSIONAL.value == "professional"
        assert ImageStyle.CINEMATIC.value == "cinematic"
        assert ImageStyle.PORTRAIT.value == "portrait"
        assert ImageStyle.LANDSCAPE.value == "landscape"
        assert ImageStyle.ABSTRACT.value == "abstract"


class TestImageGenerationRequest:
    """Test ImageGenerationRequest dataclass"""
    
    def test_default_request(self):
        """Test default request values"""
        request = ImageGenerationRequest(prompt="test prompt")
        
        assert request.prompt == "test prompt"
        assert request.style is None
        assert request.mode is None
        assert request.strategy is None
        assert request.width == 1024
        assert request.height == 1024
        assert request.quality == "high"
        assert request.seed is None
        assert request.reference_images is None
        assert request.character_data is None
        assert request.lighting_type is None
        assert request.editing_instructions is None
        assert request.layer_definitions is None
        assert isinstance(request.metadata, dict)
    
    def test_custom_request(self):
        """Test custom request values"""
        mock_images = [MockImage(), MockImage()]
        character_data = {'name': 'test', 'style': 'modern'}
        layer_defs = [{'type': 'background', 'prompt': 'test'}]
        
        request = ImageGenerationRequest(
            prompt="custom prompt",
            style=ImageStyle.ANIME,
            mode=ImageGenerationMode.PROFESSIONAL_EDIT,
            strategy=WorkflowStrategy.QUALITY_FIRST,
            width=1536,
            height=1536,
            quality="ultra",
            seed=12345,
            reference_images=mock_images,
            character_data=character_data,
            editing_instructions="enhance colors",
            layer_definitions=layer_defs,
            metadata={'custom': 'data'}
        )
        
        assert request.prompt == "custom prompt"
        assert request.style == ImageStyle.ANIME
        assert request.mode == ImageGenerationMode.PROFESSIONAL_EDIT
        assert request.strategy == WorkflowStrategy.QUALITY_FIRST
        assert request.width == 1536
        assert request.height == 1536
        assert request.quality == "ultra"
        assert request.seed == 12345
        assert request.reference_images == mock_images
        assert request.character_data == character_data
        assert request.editing_instructions == "enhance colors"
        assert request.layer_definitions == layer_defs
        assert request.metadata['custom'] == 'data'


class TestImageGenerationResult:
    """Test ImageGenerationResult dataclass"""
    
    def test_successful_result(self):
        """Test successful generation result"""
        mock_image = MockImage()
        mock_layers = [MockImage(), MockImage()]
        
        result = ImageGenerationResult(
            success=True,
            image=mock_image,
            layers=mock_layers,
            workflow_used="test_workflow",
            mode_used=ImageGenerationMode.ANIME,
            processing_time=1.5,
            quality_score=0.9,
            metadata={'test': 'data'}
        )
        
        assert result.success is True
        assert result.image == mock_image
        assert result.layers == mock_layers
        assert result.workflow_used == "test_workflow"
        assert result.mode_used == ImageGenerationMode.ANIME
        assert result.processing_time == 1.5
        assert result.quality_score == 0.9
        assert result.metadata['test'] == 'data'
        assert result.error_message is None
    
    def test_failed_result(self):
        """Test failed generation result"""
        result = ImageGenerationResult(
            success=False,
            processing_time=0.5,
            error_message="Generation failed"
        )
        
        assert result.success is False
        assert result.image is None
        assert result.layers is None
        assert result.processing_time == 0.5
        assert result.error_message == "Generation failed"
    
    def test_result_to_dict(self):
        """Test result serialization to dictionary"""
        mock_image = MockImage()
        layers = [MockImage(), MockImage()]
        
        result = ImageGenerationResult(
            success=True,
            image=mock_image,
            layers=layers,
            workflow_used="test_workflow",
            mode_used=ImageGenerationMode.LAYERED_COMPOSITION,
            processing_time=2.0,
            quality_score=0.85,
            metadata={'test': 'metadata'}
        )
        
        result_dict = result.to_dict()
        
        assert result_dict['success'] is True
        assert result_dict['workflow_used'] == "test_workflow"
        assert result_dict['mode_used'] == 'layered_composition'
        assert result_dict['processing_time'] == 2.0
        assert result_dict['quality_score'] == 0.85
        assert result_dict['metadata'] == {'test': 'metadata'}
        assert result_dict['has_image'] is True
        assert result_dict['layer_count'] == 2
        assert result_dict['error_message'] is None

class TestEnhancedImageEngine:
    """Test main Enhanced Image Engine class"""
    
    @pytest.fixture
    def engine(self):
        """Create engine instance for testing"""
        config = EnhancedImageConfig(
            default_mode=ImageGenerationMode.AUTO,
            default_strategy=WorkflowStrategy.BALANCED,
            enable_batch_processing=True,
            max_concurrent_generations=2
        )
        return EnhancedImageEngine(config)
    
    def test_engine_initialization(self, engine):
        """Test engine initialization"""
        assert engine.config.default_mode == ImageGenerationMode.AUTO
        assert engine.config.default_strategy == WorkflowStrategy.BALANCED
        assert engine.config.enable_batch_processing is True
        
        # Check workflow mapping
        assert ImageGenerationMode.ANIME in engine.workflow_map
        assert ImageGenerationMode.PROFESSIONAL_EDIT in engine.workflow_map
        assert ImageGenerationMode.LAYERED_COMPOSITION in engine.workflow_map
        
        # Check style patterns
        assert ImageStyle.ANIME in engine.style_patterns
        assert ImageStyle.REALISTIC in engine.style_patterns
        
        # Check performance stats initialization
        assert engine.performance_stats['total_generations'] == 0
        assert engine.performance_stats['successful_generations'] == 0
    
    def test_style_detection(self, engine):
        """Test style detection from prompts"""
        # Test anime detection
        anime_style = engine._detect_style("beautiful anime character with blue hair")
        assert anime_style == ImageStyle.ANIME
        
        # Test realistic detection
        realistic_style = engine._detect_style("professional photo portrait of a person")
        assert realistic_style == ImageStyle.REALISTIC
        
        # Test artistic detection
        artistic_style = engine._detect_style("abstract art painting with geometric patterns")
        assert artistic_style == ImageStyle.ARTISTIC
        
        # Test landscape detection
        landscape_style = engine._detect_style("beautiful mountain landscape scenery")
        assert landscape_style == ImageStyle.LANDSCAPE
        
        # Test default fallback
        default_style = engine._detect_style("random text without style keywords")
        assert default_style == engine.config.default_style
    
    def test_generation_mode_determination(self, engine):
        """Test generation mode determination"""
        # Test explicit mode
        request = ImageGenerationRequest(prompt="test", mode=ImageGenerationMode.ANIME)
        mode = engine._determine_generation_mode(request)
        assert mode == ImageGenerationMode.ANIME
        
        # Test anime auto-detection
        request = ImageGenerationRequest(prompt="anime character with magical powers")
        mode = engine._determine_generation_mode(request)
        assert mode == ImageGenerationMode.ANIME
        
        # Test professional edit detection
        request = ImageGenerationRequest(
            prompt="enhance this photo",
            reference_images=[MockImage()],
            editing_instructions="improve lighting"
        )
        mode = engine._determine_generation_mode(request)
        assert mode == ImageGenerationMode.PROFESSIONAL_EDIT
        
        # Test layered composition detection
        request = ImageGenerationRequest(
            prompt="create composition",
            layer_definitions=[{'type': 'background', 'prompt': 'test'}]
        )
        mode = engine._determine_generation_mode(request)
        assert mode == ImageGenerationMode.LAYERED_COMPOSITION
        
        # Test speed strategy detection
        request = ImageGenerationRequest(
            prompt="quick generation",
            strategy=WorkflowStrategy.SPEED_FIRST
        )
        mode = engine._determine_generation_mode(request)
        assert mode == ImageGenerationMode.LIGHTNING_FAST
    
    @pytest.mark.asyncio
    async def test_anime_generation(self, engine):
        """Test anime image generation"""
        request = ImageGenerationRequest(
            prompt="beautiful anime character",
            character_data={'style': 'modern', 'gender': 'female'}
        )
        
        result = await engine._generate_anime_image(request)
        
        assert result.success is True
        assert result.workflow_used == "newbie_anime"
        assert result.image is not None
        assert result.quality_score > 0.7
        assert 'character_data' in result.metadata
    
    @pytest.mark.asyncio
    async def test_professional_edit_multi_modal(self, engine):
        """Test professional editing with multi-modal"""
        base_image = MockImage()
        reference_images = [MockImage(), MockImage()]
        
        request = ImageGenerationRequest(
            prompt="enhance photo quality",
            reference_images=[base_image] + reference_images,
            editing_instructions="professional enhancement"
        )
        
        result = await engine._generate_professional_edit(request)
        
        assert result.success is True
        assert result.workflow_used == "qwen_professional_edit"
        assert result.image is not None
        assert result.quality_score > 0.7
    
    @pytest.mark.asyncio
    async def test_professional_edit_relighting(self, engine):
        """Test professional editing with relighting"""
        from qwen_image_suite_integration import LightingType
        
        request = ImageGenerationRequest(
            prompt="relight this image",
            reference_images=[MockImage()],
            lighting_type=LightingType.STUDIO
        )
        
        result = await engine._generate_professional_edit(request)
        
        assert result.success is True
        assert result.workflow_used == "qwen_professional_edit"
        assert result.image is not None
    
    @pytest.mark.asyncio
    async def test_layered_composition(self, engine):
        """Test layered composition generation"""
        layer_definitions = [
            {'type': 'background', 'prompt': 'mountain landscape', 'z_index': 0},
            {'type': 'character', 'prompt': 'heroic figure', 'z_index': 1},
            {'type': 'effect', 'prompt': 'magical effects', 'z_index': 2}
        ]
        
        request = ImageGenerationRequest(
            prompt="fantasy composition",
            layer_definitions=layer_definitions,
            width=1536,
            height=1536
        )
        
        result = await engine._generate_layered_composition(request)
        
        assert result.success is True
        assert result.workflow_used == "qwen_layered_composition"
        assert result.image is not None
        assert result.layers is not None
        assert len(result.layers) == 3
        assert result.metadata['layer_count'] == 3
    
    @pytest.mark.asyncio
    async def test_lightning_fast_generation(self, engine):
        """Test lightning fast generation"""
        # Test anime lightning
        anime_request = ImageGenerationRequest(prompt="anime character quick generation")
        anime_result = await engine._generate_lightning_fast(anime_request)
        
        assert anime_result.success is True
        assert "lightning" in anime_result.workflow_used
        assert anime_result.processing_time < 1.0
        
        # Test with reference image
        ref_request = ImageGenerationRequest(
            prompt="quick enhancement",
            reference_images=[MockImage()]
        )
        ref_result = await engine._generate_lightning_fast(ref_request)
        
        assert ref_result.success is True
        assert "lightning" in ref_result.workflow_used
    
    @pytest.mark.asyncio
    async def test_standard_generation(self, engine):
        """Test standard generation"""
        request = ImageGenerationRequest(
            prompt="realistic portrait",
            width=1280,
            height=720
        )
        
        result = await engine._generate_standard(request)
        
        assert result.success is True
        assert result.workflow_used == "standard_comfyui"
        assert result.image is not None
        assert result.metadata['resolution'] == "1280x720"
        
        # Test fast mode
        fast_result = await engine._generate_standard(request, fast_mode=True)
        assert fast_result.success is True
        assert fast_result.metadata['fast_mode'] is True
        assert fast_result.quality_score < result.quality_score  # Lower quality for speed
    
    @pytest.mark.asyncio
    async def test_auto_generation(self, engine):
        """Test automatic workflow selection"""
        # Test anime auto-selection
        anime_request = ImageGenerationRequest(prompt="cute anime girl with cat ears")
        anime_result = await engine._generate_auto(anime_request)
        
        assert anime_result.success is True
        assert anime_result.mode_used == ImageGenerationMode.ANIME
        
        # Test professional edit auto-selection
        edit_request = ImageGenerationRequest(
            prompt="enhance this photo",
            reference_images=[MockImage(), MockImage()]
        )
        edit_result = await engine._generate_auto(edit_request)
        
        assert edit_result.success is True
        assert edit_result.mode_used == ImageGenerationMode.PROFESSIONAL_EDIT
    
    @pytest.mark.asyncio
    async def test_hybrid_generation(self, engine):
        """Test hybrid multi-stage generation"""
        request = ImageGenerationRequest(
            prompt="high quality anime portrait",
            strategy=WorkflowStrategy.QUALITY_FIRST
        )
        
        result = await engine._generate_hybrid(request)
        
        assert result.success is True
        assert result.workflow_used == "hybrid_multi_stage"
        assert 'hybrid_stages' in result.metadata
        assert result.metadata['hybrid_stages'] >= 1
    
    @pytest.mark.asyncio
    async def test_full_generation_workflow(self, engine):
        """Test complete generation workflow"""
        request = ImageGenerationRequest(
            prompt="beautiful landscape with anime character",
            strategy=WorkflowStrategy.BALANCED,
            width=1024,
            height=1024,
            seed=12345
        )
        
        result = await engine.generate_image(request)
        
        assert result.success is True
        assert result.image is not None
        assert result.processing_time > 0
        assert result.quality_score > 0
        assert result.mode_used is not None
        assert 'seed' in result.metadata or result.metadata.get('seed') == 12345
    
    @pytest.mark.asyncio
    async def test_batch_generation(self, engine):
        """Test batch image generation"""
        requests = [
            ImageGenerationRequest(prompt="anime character 1"),
            ImageGenerationRequest(prompt="realistic portrait 1"),
            ImageGenerationRequest(prompt="landscape scene 1"),
            ImageGenerationRequest(prompt="abstract art 1")
        ]
        
        results = await engine.generate_batch(requests)
        
        assert len(results) == 4
        assert all(isinstance(result, ImageGenerationResult) for result in results)
        
        successful_results = [r for r in results if r.success]
        assert len(successful_results) >= 3  # Allow for some failures in mock mode
    
    @pytest.mark.asyncio
    async def test_batch_generation_disabled(self, engine):
        """Test batch generation when disabled"""
        engine.config.enable_batch_processing = False
        
        requests = [
            ImageGenerationRequest(prompt="test 1"),
            ImageGenerationRequest(prompt="test 2")
        ]
        
        results = await engine.generate_batch(requests)
        
        assert len(results) == 2
        assert all(isinstance(result, ImageGenerationResult) for result in results)
    
    def test_performance_stats_update(self, engine):
        """Test performance statistics update"""
        initial_stats = engine.performance_stats.copy()
        
        # Update with successful operation
        engine._update_performance_stats(
            ImageGenerationMode.ANIME, 1.5, 0.9, True
        )
        
        assert engine.performance_stats['total_generations'] == initial_stats['total_generations'] + 1
        assert engine.performance_stats['successful_generations'] == initial_stats['successful_generations'] + 1
        assert engine.performance_stats['mode_usage']['anime'] == initial_stats['mode_usage']['anime'] + 1
        assert 0.9 in engine.performance_stats['quality_scores']
        
        # Update with failed operation
        engine._update_performance_stats(
            ImageGenerationMode.STANDARD, 0.5, 0.0, False
        )
        
        assert engine.performance_stats['total_generations'] == initial_stats['total_generations'] + 2
        assert engine.performance_stats['successful_generations'] == initial_stats['successful_generations'] + 1
    
    def test_performance_report(self, engine):
        """Test performance report generation"""
        # Add some mock performance data
        engine._update_performance_stats(ImageGenerationMode.ANIME, 1.0, 0.95, True)
        engine._update_performance_stats(ImageGenerationMode.PROFESSIONAL_EDIT, 1.5, 0.85, True)
        engine._update_performance_stats(ImageGenerationMode.STANDARD, 0.8, 0.75, True)
        engine._update_performance_stats(ImageGenerationMode.LIGHTNING_FAST, 0.3, 0.65, False)
        
        report = engine.get_performance_report()
        
        assert 'total_generations' in report
        assert 'successful_generations' in report
        assert 'success_rate' in report
        assert 'average_processing_time' in report
        assert 'average_quality_score' in report
        assert 'mode_usage' in report
        assert 'quality_distribution' in report
        assert 'supported_modes' in report
        assert 'supported_styles' in report
        assert 'configuration' in report
        
        # Check quality distribution
        quality_dist = report['quality_distribution']
        assert 'excellent' in quality_dist
        assert 'good' in quality_dist
        assert 'acceptable' in quality_dist
        assert 'poor' in quality_dist
        
        # Check mode usage
        assert report['mode_usage']['anime'] >= 1
        assert report['mode_usage']['professional_edit'] >= 1
    
    def test_export_generation_session(self, engine):
        """Test generation session export"""
        # Create mock results
        results = [
            ImageGenerationResult(
                success=True,
                workflow_used="test_workflow_1",
                mode_used=ImageGenerationMode.ANIME,
                processing_time=1.0,
                quality_score=0.9
            ),
            ImageGenerationResult(
                success=True,
                workflow_used="test_workflow_2",
                mode_used=ImageGenerationMode.PROFESSIONAL_EDIT,
                processing_time=1.5,
                quality_score=0.85
            )
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            output_path = Path(f.name)
        
        try:
            success = engine.export_generation_session(results, output_path)
            assert success is True
            
            # Verify exported data
            with open(output_path, 'r') as f:
                session_data = json.load(f)
            
            assert 'session_info' in session_data
            assert 'results' in session_data
            assert 'performance_report' in session_data
            assert session_data['session_info']['total_generations'] == 2
            assert session_data['session_info']['successful_generations'] == 2
            assert len(session_data['results']) == 2
            
        finally:
            # Clean up
            if output_path.exists():
                output_path.unlink()


class TestFactoryFunction:
    """Test factory function"""
    
    def test_create_enhanced_image_engine_default(self):
        """Test factory function with default config"""
        engine = create_enhanced_image_engine()
        
        assert isinstance(engine, EnhancedImageEngine)
        assert engine.config.default_mode == ImageGenerationMode.AUTO
        assert engine.config.default_strategy == WorkflowStrategy.BALANCED
    
    def test_create_enhanced_image_engine_custom_config(self):
        """Test factory function with custom config"""
        config = EnhancedImageConfig(
            default_mode=ImageGenerationMode.ANIME,
            default_strategy=WorkflowStrategy.QUALITY_FIRST,
            max_concurrent_generations=5
        )
        
        engine = create_enhanced_image_engine(config, "http://localhost:8188")
        
        assert isinstance(engine, EnhancedImageEngine)
        assert engine.config.default_mode == ImageGenerationMode.ANIME
        assert engine.config.default_strategy == WorkflowStrategy.QUALITY_FIRST
        assert engine.config.max_concurrent_generations == 5


if __name__ == "__main__":
    # Run basic tests
    print("Running Enhanced Image Engine tests...")
    
    # Test configuration
    config = EnhancedImageConfig()
    print(f"✓ Default config created: {config.default_mode}")
    
    # Test enums
    assert ImageGenerationMode.ANIME.value == "anime"
    assert WorkflowStrategy.BALANCED.value == "balanced"
    assert ImageStyle.REALISTIC.value == "realistic"
    print("✓ Enums working correctly")
    
    # Test data classes
    request = ImageGenerationRequest(prompt="test prompt")
    assert request.width == 1024
    print("✓ ImageGenerationRequest working")
    
    result = ImageGenerationResult(success=True, quality_score=0.85)
    result_dict = result.to_dict()
    assert result_dict['success'] is True
    print("✓ ImageGenerationResult working")
    
    # Test factory function
    engine = create_enhanced_image_engine()
    assert isinstance(engine, EnhancedImageEngine)
    print("✓ Factory function working")
    
    print("\nAll basic tests passed! ✅")
    print("Run with pytest for comprehensive testing.")