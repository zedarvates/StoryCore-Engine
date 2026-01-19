"""
Comprehensive tests for Qwen Image Suite Integration

Tests all aspects of the Qwen image editing and generation system including
relighting, multi-modal editing, layered generation, and performance validation.

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
    from qwen_image_suite_integration import (
        QwenImageSuiteIntegration,
        QwenImageConfig,
        EditingMode,
        LightingType,
        LayerType,
        EditingQuality,
        LightingCondition,
        LayerDefinition,
        EditingResult,
        create_qwen_image_integration
    )
except ImportError as e:
    print(f"Import error: {e}")
    # Create mock classes for testing
    class QwenImageSuiteIntegration:
        pass
    class QwenImageConfig:
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


class TestQwenImageConfig:
    """Test Qwen Image configuration"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = QwenImageConfig()
        
        assert config.model_precision == "fp16"
        assert config.enable_quantization is True
        assert config.max_memory_usage_gb == 16.0
        assert config.default_quality == EditingQuality.STANDARD
        assert config.default_steps == 20
        assert config.guidance_scale == 7.5
        assert config.enable_lightning_lora is True
        assert config.lightning_steps == 4
        assert config.multi_image_max_count == 5
        assert config.max_layers == 8
        assert config.quality_threshold == 0.8
        assert config.batch_size == 1
        assert config.output_format == "PNG"
    
    def test_custom_config(self):
        """Test custom configuration values"""
        config = QwenImageConfig(
            model_precision="fp8",
            max_memory_usage_gb=24.0,
            default_quality=EditingQuality.HIGH,
            lightning_steps=8,
            max_layers=12
        )
        
        assert config.model_precision == "fp8"
        assert config.max_memory_usage_gb == 24.0
        assert config.default_quality == EditingQuality.HIGH
        assert config.lightning_steps == 8
        assert config.max_layers == 12


class TestEditingEnums:
    """Test editing-related enums"""
    
    def test_editing_mode_enum(self):
        """Test EditingMode enum values"""
        assert EditingMode.RELIGHT.value == "relight"
        assert EditingMode.MULTI_MODAL_2509.value == "multi_modal_2509"
        assert EditingMode.MULTI_MODAL_2511.value == "multi_modal_2511"
        assert EditingMode.LAYERED_GENERATION.value == "layered_generation"
        assert EditingMode.MATERIAL_TRANSFER.value == "material_transfer"
        assert EditingMode.LIGHTNING_FAST.value == "lightning_fast"
    
    def test_lighting_type_enum(self):
        """Test LightingType enum values"""
        assert LightingType.NATURAL.value == "natural"
        assert LightingType.STUDIO.value == "studio"
        assert LightingType.DRAMATIC.value == "dramatic"
        assert LightingType.GOLDEN_HOUR.value == "golden_hour"
        assert LightingType.BLUE_HOUR.value == "blue_hour"
        assert LightingType.NEON.value == "neon"
    
    def test_layer_type_enum(self):
        """Test LayerType enum values"""
        assert LayerType.BACKGROUND.value == "background"
        assert LayerType.FOREGROUND.value == "foreground"
        assert LayerType.CHARACTER.value == "character"
        assert LayerType.OBJECT.value == "object"
        assert LayerType.EFFECT.value == "effect"
        assert LayerType.LIGHTING.value == "lighting"
    
    def test_editing_quality_enum(self):
        """Test EditingQuality enum values"""
        assert EditingQuality.DRAFT.value == "draft"
        assert EditingQuality.STANDARD.value == "standard"
        assert EditingQuality.HIGH.value == "high"
        assert EditingQuality.ULTRA.value == "ultra"


class TestLightingCondition:
    """Test LightingCondition dataclass"""
    
    def test_default_lighting_condition(self):
        """Test default lighting condition"""
        condition = LightingCondition(LightingType.NATURAL)
        
        assert condition.lighting_type == LightingType.NATURAL
        assert condition.intensity == 1.0
        assert condition.color_temperature == 5500
        assert condition.direction == (0.0, 1.0, 0.5)
        assert condition.softness == 0.5
        assert condition.shadows is True
        assert condition.highlights is True
        assert condition.ambient_strength == 0.3
    
    def test_custom_lighting_condition(self):
        """Test custom lighting condition"""
        condition = LightingCondition(
            lighting_type=LightingType.DRAMATIC,
            intensity=1.5,
            color_temperature=4000,
            direction=(0.8, 0.5, 0.3),
            softness=0.2,
            ambient_strength=0.1
        )
        
        assert condition.lighting_type == LightingType.DRAMATIC
        assert condition.intensity == 1.5
        assert condition.color_temperature == 4000
        assert condition.direction == (0.8, 0.5, 0.3)
        assert condition.softness == 0.2
        assert condition.ambient_strength == 0.1


class TestLayerDefinition:
    """Test LayerDefinition dataclass"""
    
    def test_default_layer_definition(self):
        """Test default layer definition"""
        layer = LayerDefinition(LayerType.CHARACTER, "A beautiful character")
        
        assert layer.layer_type == LayerType.CHARACTER
        assert layer.prompt == "A beautiful character"
        assert layer.weight == 1.0
        assert layer.blend_mode == "normal"
        assert layer.opacity == 1.0
        assert layer.mask_prompt is None
        assert layer.z_index == 0
    
    def test_custom_layer_definition(self):
        """Test custom layer definition"""
        layer = LayerDefinition(
            layer_type=LayerType.EFFECT,
            prompt="Magical particles",
            weight=0.8,
            blend_mode="multiply",
            opacity=0.7,
            mask_prompt="particle areas",
            z_index=5
        )
        
        assert layer.layer_type == LayerType.EFFECT
        assert layer.prompt == "Magical particles"
        assert layer.weight == 0.8
        assert layer.blend_mode == "multiply"
        assert layer.opacity == 0.7
        assert layer.mask_prompt == "particle areas"
        assert layer.z_index == 5


class TestEditingResult:
    """Test EditingResult dataclass"""
    
    def test_successful_result(self):
        """Test successful editing result"""
        mock_image = MockImage()
        result = EditingResult(
            success=True,
            image=mock_image,
            quality_score=0.85,
            processing_time=1.5,
            editing_mode=EditingMode.RELIGHT
        )
        
        assert result.success is True
        assert result.image == mock_image
        assert result.quality_score == 0.85
        assert result.processing_time == 1.5
        assert result.editing_mode == EditingMode.RELIGHT
        assert result.error_message is None
    
    def test_failed_result(self):
        """Test failed editing result"""
        result = EditingResult(
            success=False,
            processing_time=0.5,
            editing_mode=EditingMode.MULTI_MODAL_2511,
            error_message="Processing failed"
        )
        
        assert result.success is False
        assert result.image is None
        assert result.processing_time == 0.5
        assert result.editing_mode == EditingMode.MULTI_MODAL_2511
        assert result.error_message == "Processing failed"
    
    def test_result_to_dict(self):
        """Test result serialization to dictionary"""
        mock_image = MockImage()
        layers = [MockImage(), MockImage()]
        
        result = EditingResult(
            success=True,
            image=mock_image,
            layers=layers,
            metadata={'test': 'data'},
            quality_score=0.9,
            processing_time=2.0,
            editing_mode=EditingMode.LAYERED_GENERATION
        )
        
        result_dict = result.to_dict()
        
        assert result_dict['success'] is True
        assert result_dict['metadata'] == {'test': 'data'}
        assert result_dict['quality_score'] == 0.9
        assert result_dict['processing_time'] == 2.0
        assert result_dict['editing_mode'] == 'layered_generation'
        assert result_dict['has_image'] is True
        assert result_dict['layer_count'] == 2
        assert result_dict['error_message'] is None


class TestQwenImageSuiteIntegration:
    """Test main Qwen Image Suite Integration class"""
    
    @pytest.fixture
    def integration(self):
        """Create integration instance for testing"""
        config = QwenImageConfig(
            default_quality=EditingQuality.STANDARD,
            enable_lightning_lora=True,
            max_layers=6
        )
        return QwenImageSuiteIntegration(config)
    
    @pytest.fixture
    def mock_image(self):
        """Create mock image for testing"""
        return MockImage((1024, 1024))
    
    def test_integration_initialization(self, integration):
        """Test integration initialization"""
        assert integration.config.default_quality == EditingQuality.STANDARD
        assert integration.config.enable_lightning_lora is True
        assert integration.config.max_layers == 6
        
        # Check model registry
        assert 'edit_2509' in integration.models
        assert 'edit_2511' in integration.models
        assert 'layered' in integration.models
        assert 'text_encoder' in integration.models
        
        # Check LoRA registry
        assert 'relight' in integration.loras
        assert 'lightning_2509' in integration.loras
        assert 'lightning_2511' in integration.loras
        
        # Check lighting presets
        assert LightingType.NATURAL in integration.lighting_presets
        assert LightingType.GOLDEN_HOUR in integration.lighting_presets
        assert LightingType.DRAMATIC in integration.lighting_presets
    
    def test_lighting_presets(self, integration):
        """Test lighting preset creation"""
        natural_preset = integration.lighting_presets[LightingType.NATURAL]
        assert natural_preset.lighting_type == LightingType.NATURAL
        assert natural_preset.intensity == 1.0
        assert natural_preset.color_temperature == 5500
        
        dramatic_preset = integration.lighting_presets[LightingType.DRAMATIC]
        assert dramatic_preset.lighting_type == LightingType.DRAMATIC
        assert dramatic_preset.intensity == 1.5
        assert dramatic_preset.color_temperature == 4000
    
    def test_steps_for_quality(self, integration):
        """Test step calculation for quality levels"""
        assert integration._get_steps_for_quality(EditingQuality.DRAFT) == 8
        assert integration._get_steps_for_quality(EditingQuality.STANDARD) == 16
        assert integration._get_steps_for_quality(EditingQuality.HIGH) == 24
        assert integration._get_steps_for_quality(EditingQuality.ULTRA) == 32
    
    @pytest.mark.asyncio
    async def test_relight_image_with_preset(self, integration, mock_image):
        """Test image relighting with lighting preset"""
        result = await integration.relight_image(
            mock_image,
            LightingType.GOLDEN_HOUR,
            EditingQuality.HIGH
        )
        
        assert result.success is True
        assert result.image is not None
        assert result.editing_mode == EditingMode.RELIGHT
        assert result.quality_score > 0.8
        assert result.processing_time > 0
        assert 'lighting_condition' in result.metadata
        assert 'quality_level' in result.metadata
    
    @pytest.mark.asyncio
    async def test_relight_image_with_custom_condition(self, integration, mock_image):
        """Test image relighting with custom lighting condition"""
        custom_condition = LightingCondition(
            lighting_type=LightingType.STUDIO,
            intensity=1.3,
            color_temperature=4800,
            softness=0.9
        )
        
        result = await integration.relight_image(
            mock_image,
            custom_condition,
            EditingQuality.STANDARD
        )
        
        assert result.success is True
        assert result.editing_mode == EditingMode.RELIGHT
        assert result.metadata['lighting_condition']['intensity'] == 1.3
        assert result.metadata['lighting_condition']['color_temperature'] == 4800
    
    @pytest.mark.asyncio
    async def test_relight_image_with_string_type(self, integration, mock_image):
        """Test image relighting with string lighting type"""
        result = await integration.relight_image(
            mock_image,
            "natural",
            EditingQuality.DRAFT
        )
        
        assert result.success is True
        assert result.editing_mode == EditingMode.RELIGHT
        assert result.metadata['quality_level'] == 'draft'
    
    @pytest.mark.asyncio
    async def test_multi_modal_editing_2509(self, integration, mock_image):
        """Test multi-modal editing with 2509 mode"""
        reference_images = [MockImage((512, 512)) for _ in range(3)]
        
        result = await integration.edit_image_multi_modal(
            mock_image,
            reference_images,
            "Add vibrant colors and enhance details",
            mode="2509",
            quality=EditingQuality.HIGH
        )
        
        assert result.success is True
        assert result.editing_mode == EditingMode.MULTI_MODAL_2509
        assert result.metadata['edit_prompt'] == "Add vibrant colors and enhance details"
        assert result.metadata['editing_mode'] == "2509"
        assert result.metadata['reference_image_count'] == 3
    
    @pytest.mark.asyncio
    async def test_multi_modal_editing_2511(self, integration, mock_image):
        """Test multi-modal editing with 2511 mode"""
        reference_images = [MockImage((1024, 1024)) for _ in range(2)]
        
        result = await integration.edit_image_multi_modal(
            mock_image,
            reference_images,
            "Professional photo enhancement",
            mode="2511"
        )
        
        assert result.success is True
        assert result.editing_mode == EditingMode.MULTI_MODAL_2511
        assert result.metadata['editing_mode'] == "2511"
        assert result.metadata['reference_image_count'] == 2
    
    @pytest.mark.asyncio
    async def test_multi_modal_editing_too_many_references(self, integration, mock_image):
        """Test multi-modal editing with too many reference images"""
        # Create more reference images than allowed
        reference_images = [MockImage() for _ in range(10)]
        
        result = await integration.edit_image_multi_modal(
            mock_image,
            reference_images,
            "Test prompt"
        )
        
        assert result.success is False
        assert "Too many reference images" in result.error_message
    
    @pytest.mark.asyncio
    async def test_layered_generation(self, integration):
        """Test layered image generation"""
        layer_definitions = [
            LayerDefinition(LayerType.BACKGROUND, "Beautiful landscape", z_index=0),
            LayerDefinition(LayerType.CHARACTER, "Elegant character", z_index=1),
            LayerDefinition(LayerType.EFFECT, "Magical particles", z_index=2, opacity=0.8)
        ]
        
        result = await integration.generate_layered_image(
            layer_definitions,
            canvas_size=(1536, 1536),
            quality=EditingQuality.HIGH
        )
        
        assert result.success is True
        assert result.editing_mode == EditingMode.LAYERED_GENERATION
        assert result.image is not None
        assert result.layers is not None
        assert len(result.layers) == 3
        assert result.metadata['canvas_size'] == (1536, 1536)
        assert len(result.metadata['layer_definitions']) == 3
    
    @pytest.mark.asyncio
    async def test_layered_generation_too_many_layers(self, integration):
        """Test layered generation with too many layers"""
        # Create more layers than allowed
        layer_definitions = [
            LayerDefinition(LayerType.BACKGROUND, f"Layer {i}")
            for i in range(15)
        ]
        
        result = await integration.generate_layered_image(layer_definitions)
        
        assert result.success is False
        assert "Too many layers" in result.error_message
    
    @pytest.mark.asyncio
    async def test_material_transfer(self, integration, mock_image):
        """Test material transfer between images"""
        source_image = MockImage((1024, 1024))
        target_image = MockImage((1024, 1024))
        
        result = await integration.transfer_material(
            source_image,
            target_image,
            "Metallic surface with reflections",
            quality=EditingQuality.STANDARD
        )
        
        assert result.success is True
        assert result.editing_mode == EditingMode.MATERIAL_TRANSFER
        assert result.metadata['material_prompt'] == "Metallic surface with reflections"
        assert result.quality_score > 0.7
    
    @pytest.mark.asyncio
    async def test_lightning_edit_2509(self, integration, mock_image):
        """Test lightning editing with 2509 mode"""
        result = await integration.lightning_edit(
            mock_image,
            "Quick style enhancement",
            mode="2509"
        )
        
        assert result.success is True
        assert result.editing_mode == EditingMode.LIGHTNING_FAST
        assert result.metadata['lightning_mode'] == "2509"
        assert result.processing_time < 1.0  # Should be fast
    
    @pytest.mark.asyncio
    async def test_lightning_edit_2511(self, integration, mock_image):
        """Test lightning editing with 2511 mode"""
        result = await integration.lightning_edit(
            mock_image,
            "Rapid color correction",
            mode="2511",
            lora_strength=0.8
        )
        
        assert result.success is True
        assert result.editing_mode == EditingMode.LIGHTNING_FAST
        assert result.metadata['lightning_mode'] == "2511"
        assert result.metadata['processing_params']['lora_strength'] == 0.8
    
    def test_performance_stats_update(self, integration):
        """Test performance statistics update"""
        initial_stats = integration.performance_stats.copy()
        
        # Update with successful operation
        integration._update_performance_stats(1.5, 0.85, True)
        
        assert integration.performance_stats['total_edits'] == initial_stats['total_edits'] + 1
        assert integration.performance_stats['successful_edits'] == initial_stats['successful_edits'] + 1
        assert 0.85 in integration.performance_stats['quality_scores']
        
        # Update with failed operation
        integration._update_performance_stats(0.5, 0.0, False)
        
        assert integration.performance_stats['total_edits'] == initial_stats['total_edits'] + 2
        assert integration.performance_stats['successful_edits'] == initial_stats['successful_edits'] + 1
    
    def test_performance_report(self, integration):
        """Test performance report generation"""
        # Add some mock performance data
        integration._update_performance_stats(1.0, 0.9, True)
        integration._update_performance_stats(1.5, 0.8, True)
        integration._update_performance_stats(0.5, 0.0, False)
        
        report = integration.get_performance_report()
        
        assert 'total_edits' in report
        assert 'successful_edits' in report
        assert 'success_rate' in report
        assert 'average_processing_time' in report
        assert 'average_quality_score' in report
        assert 'quality_distribution' in report
        assert 'supported_modes' in report
        assert 'configuration' in report
        
        # Check quality distribution
        quality_dist = report['quality_distribution']
        assert 'excellent' in quality_dist
        assert 'good' in quality_dist
        assert 'acceptable' in quality_dist
        assert 'poor' in quality_dist
    
    def test_export_editing_session(self, integration):
        """Test editing session export"""
        # Create mock results
        results = [
            EditingResult(
                success=True,
                quality_score=0.85,
                processing_time=1.0,
                editing_mode=EditingMode.RELIGHT
            ),
            EditingResult(
                success=True,
                quality_score=0.90,
                processing_time=1.5,
                editing_mode=EditingMode.MULTI_MODAL_2511
            )
        ]
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            output_path = Path(f.name)
        
        try:
            success = integration.export_editing_session(results, output_path)
            assert success is True
            
            # Verify exported data
            with open(output_path, 'r') as f:
                session_data = json.load(f)
            
            assert 'session_info' in session_data
            assert 'results' in session_data
            assert 'performance_report' in session_data
            assert session_data['session_info']['total_operations'] == 2
            assert session_data['session_info']['successful_operations'] == 2
            assert len(session_data['results']) == 2
            
        finally:
            # Clean up
            if output_path.exists():
                output_path.unlink()


class TestFactoryFunction:
    """Test factory function"""
    
    def test_create_qwen_integration_default(self):
        """Test factory function with default config"""
        integration = create_qwen_image_integration()
        
        assert isinstance(integration, QwenImageSuiteIntegration)
        assert integration.config.default_quality == EditingQuality.STANDARD
        assert integration.config.enable_lightning_lora is True
    
    def test_create_qwen_integration_custom_config(self):
        """Test factory function with custom config"""
        config = QwenImageConfig(
            default_quality=EditingQuality.HIGH,
            max_layers=10,
            lightning_steps=8
        )
        
        integration = create_qwen_image_integration(config)
        
        assert isinstance(integration, QwenImageSuiteIntegration)
        assert integration.config.default_quality == EditingQuality.HIGH
        assert integration.config.max_layers == 10
        assert integration.config.lightning_steps == 8


class TestIntegrationScenarios:
    """Test realistic integration scenarios"""
    
    @pytest.fixture
    def integration(self):
        """Create integration for scenario testing"""
        config = QwenImageConfig(
            default_quality=EditingQuality.STANDARD,
            enable_lightning_lora=True,
            quality_threshold=0.8
        )
        return QwenImageSuiteIntegration(config)
    
    @pytest.mark.asyncio
    async def test_photo_editing_workflow(self, integration):
        """Test complete photo editing workflow"""
        # Start with base image
        base_image = MockImage((1024, 1024))
        
        # Step 1: Relight the image
        relight_result = await integration.relight_image(
            base_image,
            LightingType.STUDIO,
            EditingQuality.HIGH
        )
        assert relight_result.success is True
        
        # Step 2: Multi-modal enhancement
        reference_images = [MockImage((512, 512)) for _ in range(2)]
        enhance_result = await integration.edit_image_multi_modal(
            relight_result.image,
            reference_images,
            "Professional portrait enhancement",
            mode="2511"
        )
        assert enhance_result.success is True
        
        # Step 3: Quick final touch with lightning
        final_result = await integration.lightning_edit(
            enhance_result.image,
            "Final color grading"
        )
        assert final_result.success is True
        
        # Verify workflow completed successfully
        assert all([
            relight_result.success,
            enhance_result.success,
            final_result.success
        ])
    
    @pytest.mark.asyncio
    async def test_composite_creation_workflow(self, integration):
        """Test composite image creation workflow"""
        # Create layered composition
        layer_definitions = [
            LayerDefinition(LayerType.BACKGROUND, "Dramatic sky", z_index=0),
            LayerDefinition(LayerType.FOREGROUND, "Mountain landscape", z_index=1),
            LayerDefinition(LayerType.CHARACTER, "Heroic figure", z_index=2),
            LayerDefinition(LayerType.EFFECT, "Atmospheric haze", z_index=3, opacity=0.6)
        ]
        
        layered_result = await integration.generate_layered_image(
            layer_definitions,
            canvas_size=(2048, 1536),
            quality=EditingQuality.HIGH
        )
        
        assert layered_result.success is True
        assert len(layered_result.layers) == 4
        assert layered_result.metadata['canvas_size'] == (2048, 1536)
        
        # Apply final lighting adjustment
        final_result = await integration.relight_image(
            layered_result.image,
            LightingType.GOLDEN_HOUR,
            EditingQuality.STANDARD
        )
        
        assert final_result.success is True
        assert final_result.quality_score > 0.8
    
    @pytest.mark.asyncio
    async def test_material_design_workflow(self, integration):
        """Test material design workflow"""
        source_material = MockImage((1024, 1024))
        target_objects = [MockImage((1024, 1024)) for _ in range(3)]
        
        results = []
        
        # Apply material to multiple objects
        for i, target in enumerate(target_objects):
            result = await integration.transfer_material(
                source_material,
                target,
                f"Metallic surface variation {i+1}",
                quality=EditingQuality.STANDARD
            )
            results.append(result)
        
        # Verify all transfers succeeded
        assert all(result.success for result in results)
        assert all(result.quality_score > 0.7 for result in results)
        
        # Generate performance report
        report = integration.get_performance_report()
        assert report['total_edits'] >= 3
        assert report['success_rate'] > 0.8


if __name__ == "__main__":
    # Run basic tests
    print("Running Qwen Image Suite Integration tests...")
    
    # Test configuration
    config = QwenImageConfig()
    print(f"✓ Default config created: {config.default_quality}")
    
    # Test enums
    assert EditingMode.RELIGHT.value == "relight"
    assert LightingType.NATURAL.value == "natural"
    print("✓ Enums working correctly")
    
    # Test data classes
    condition = LightingCondition(LightingType.DRAMATIC)
    assert condition.intensity == 1.0
    print("✓ LightingCondition working")
    
    layer = LayerDefinition(LayerType.CHARACTER, "Test character")
    assert layer.weight == 1.0
    print("✓ LayerDefinition working")
    
    # Test result
    result = EditingResult(success=True, quality_score=0.85)
    result_dict = result.to_dict()
    assert result_dict['success'] is True
    print("✓ EditingResult working")
    
    # Test factory function
    integration = create_qwen_image_integration()
    assert isinstance(integration, QwenImageSuiteIntegration)
    print("✓ Factory function working")
    
    print("\nAll basic tests passed! ✅")
    print("Run with pytest for comprehensive testing.")