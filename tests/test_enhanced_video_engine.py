#!/usr/bin/env python3
"""
Comprehensive tests for Enhanced Video Engine

Tests cover:
- Advanced workflow integration
- Intelligent workflow selection
- Fallback mechanisms
- Quality validation
- Performance monitoring
- Backward compatibility
- Error handling
"""

import asyncio
import pytest
import numpy as np
from PIL import Image
from pathlib import Path
from unittest.mock import Mock, AsyncMock, patch

from src.enhanced_video_engine import (
    EnhancedVideoEngine,
    AdvancedVideoConfig,
    AdvancedVideoResult,
    AdvancedVideoMode,
    WorkflowSelectionStrategy,
    create_enhanced_video_engine
)
from src.advanced_workflow_base import WorkflowType, WorkflowCapability
from src.video_engine import VideoEngine, VideoGenerationResult
from src.video_config import VideoConfig


class TestEnhancedVideoEngine:
    """Test suite for EnhancedVideoEngine class"""
    
    @pytest.fixture
    def mock_workflow_manager(self):
        """Create mock workflow manager"""
        manager = Mock()
        manager.initialize = AsyncMock(return_value=True)
        manager.get_available_workflows = Mock(return_value={
            'video/hunyuan_video': {
                'capabilities': [WorkflowCapability.TEXT_TO_VIDEO, WorkflowCapability.IMAGE_TO_VIDEO],
                'supported_resolutions': ['832x480', '1024x576'],
                'memory_requirements': {'minimum_vram': 16.0}
            },
            'video/wan_video': {
                'capabilities': [WorkflowCapability.TEXT_TO_VIDEO, WorkflowCapability.ALPHA_VIDEO],
                'supported_resolutions': ['832x480', '640x640'],
                'memory_requirements': {'minimum_vram': 14.0}
            }
        })
        manager.get_workflows_by_capability = Mock(return_value=['video/hunyuan_video', 'video/wan_video'])
        manager.get_workflow = Mock()
        manager.execute_workflow = AsyncMock()
        manager.health_check = AsyncMock(return_value={'status': 'healthy'})
        
        return manager
    
    @pytest.fixture
    def mock_legacy_engine(self):
        """Create mock legacy video engine"""
        engine = Mock(spec=VideoEngine)
        engine.initialize = AsyncMock(return_value=True)
        engine.generate_video = AsyncMock()
        engine.health_check = AsyncMock(return_value={'status': 'healthy'})
        
        return engine
    
    @pytest.fixture
    def enhanced_engine(self, mock_workflow_manager, mock_legacy_engine):
        """Create EnhancedVideoEngine instance"""
        return EnhancedVideoEngine(
            workflow_manager=mock_workflow_manager,
            legacy_engine=mock_legacy_engine,
            config={'test': 'config'}
        )
    
    @pytest.fixture
    def sample_config(self):
        """Create sample video configuration"""
        return AdvancedVideoConfig(
            prompt="A beautiful landscape with flowing water and mountains",
            width=832,
            height=480,
            num_frames=33,
            fps=16,
            mode=AdvancedVideoMode.AUTO,
            selection_strategy=WorkflowSelectionStrategy.BALANCED,
            enable_quality_validation=True,
            min_quality_score=0.8
        )
    
    def test_engine_initialization(self, enhanced_engine):
        """Test engine initialization"""
        assert enhanced_engine.workflow_manager is not None
        assert enhanced_engine.legacy_engine is not None
        assert enhanced_engine.config is not None
        assert enhanced_engine.registered_workflows == {}
        assert enhanced_engine.generation_stats['total_generations'] == 0
    
    @pytest.mark.asyncio
    async def test_initialize(self, enhanced_engine, mock_workflow_manager):
        """Test engine initialization process"""
        result = await enhanced_engine.initialize()
        
        assert result is True
        mock_workflow_manager.initialize.assert_called_once()
        assert len(enhanced_engine.registered_workflows) == 2
        assert 'video/hunyuan_video' in enhanced_engine.registered_workflows
        assert 'video/wan_video' in enhanced_engine.registered_workflows
    
    @pytest.mark.asyncio
    async def test_config_validation_valid(self, enhanced_engine, sample_config):
        """Test configuration validation with valid config"""
        result = await enhanced_engine._validate_config(sample_config)
        
        assert result['valid'] is True
    
    @pytest.mark.asyncio
    async def test_config_validation_invalid_dimensions(self, enhanced_engine):
        """Test configuration validation with invalid dimensions"""
        config = AdvancedVideoConfig(
            prompt="Test prompt",
            width=32,  # Too small
            height=4000,  # Too large
            num_frames=33
        )
        
        result = await enhanced_engine._validate_config(config)
        
        assert result['valid'] is False
        assert 'Width must be between' in result['error']
    
    @pytest.mark.asyncio
    async def test_config_validation_empty_prompt(self, enhanced_engine):
        """Test configuration validation with empty prompt"""
        config = AdvancedVideoConfig(
            prompt="",  # Empty prompt
            width=832,
            height=480,
            num_frames=33
        )
        
        result = await enhanced_engine._validate_config(config)
        
        assert result['valid'] is False
        assert 'Prompt cannot be empty' in result['error']
    
    @pytest.mark.asyncio
    async def test_config_validation_inpainting_missing_images(self, enhanced_engine):
        """Test configuration validation for inpainting without images"""
        config = AdvancedVideoConfig(
            prompt="Test prompt",
            mode=AdvancedVideoMode.WAN_INPAINTING,
            width=832,
            height=480,
            num_frames=33
        )
        
        result = await enhanced_engine._validate_config(config)
        
        assert result['valid'] is False
        assert 'Start and end images required' in result['error']
    
    @pytest.mark.asyncio
    async def test_specific_workflow_selection_hunyuan(self, enhanced_engine):
        """Test specific workflow selection for HunyuanVideo"""
        await enhanced_engine.initialize()
        
        config = AdvancedVideoConfig(
            prompt="Test prompt",
            mode=AdvancedVideoMode.HUNYUAN_T2V,
            width=832,
            height=480,
            num_frames=33
        )
        
        result = await enhanced_engine._select_workflow(config)
        
        assert result['use_advanced'] is True
        assert result['workflow_id'] == 'video/hunyuan_video'
        assert 'Specific mode: hunyuan_t2v' in result['reason']
    
    @pytest.mark.asyncio
    async def test_specific_workflow_selection_wan(self, enhanced_engine):
        """Test specific workflow selection for Wan Video"""
        await enhanced_engine.initialize()
        
        config = AdvancedVideoConfig(
            prompt="Test prompt",
            mode=AdvancedVideoMode.WAN_ALPHA_T2V,
            width=832,
            height=480,
            num_frames=33,
            enable_alpha_channel=True
        )
        
        result = await enhanced_engine._select_workflow(config)
        
        assert result['use_advanced'] is True
        assert result['workflow_id'] == 'video/wan_video'
        assert 'Specific mode: wan_alpha_t2v' in result['reason']
    
    @pytest.mark.asyncio
    async def test_specific_workflow_selection_legacy(self, enhanced_engine):
        """Test specific workflow selection for legacy mode"""
        config = AdvancedVideoConfig(
            prompt="Test prompt",
            mode=AdvancedVideoMode.LEGACY,
            width=832,
            height=480,
            num_frames=33
        )
        
        result = await enhanced_engine._select_workflow(config)
        
        assert result['use_advanced'] is False
        assert result['workflow_id'] is None
        assert 'Legacy mode requested' in result['reason']
    
    @pytest.mark.asyncio
    async def test_capability_based_selection(self, enhanced_engine, mock_workflow_manager):
        """Test capability-based workflow selection"""
        await enhanced_engine.initialize()
        
        # Mock capability-based selection
        mock_workflow_manager.get_workflows_by_capability.return_value = ['video/wan_video']
        
        config = AdvancedVideoConfig(
            prompt="Test prompt with transparency",
            mode=AdvancedVideoMode.AUTO,
            selection_strategy=WorkflowSelectionStrategy.CAPABILITY_BASED,
            enable_alpha_channel=True,
            width=832,
            height=480,
            num_frames=33
        )
        
        result = await enhanced_engine._select_workflow(config)
        
        assert result['use_advanced'] is True
        assert result['workflow_id'] == 'video/wan_video'
        assert 'Capability-based selection' in result['reason']
    
    @pytest.mark.asyncio
    async def test_performance_based_selection(self, enhanced_engine, mock_workflow_manager):
        """Test performance-based workflow selection"""
        await enhanced_engine.initialize()
        
        # Mock workflow with performance stats
        mock_workflow = Mock()
        mock_workflow.get_performance_stats.return_value = {
            'average_generation_time': 45.0,
            'average_memory_usage': 12.0,
            'success_rate': 0.95
        }
        mock_workflow_manager.get_workflow.return_value = mock_workflow
        
        config = AdvancedVideoConfig(
            prompt="Test prompt",
            mode=AdvancedVideoMode.AUTO,
            selection_strategy=WorkflowSelectionStrategy.PERFORMANCE_BASED,
            width=832,
            height=480,
            num_frames=33
        )
        
        result = await enhanced_engine._select_workflow(config)
        
        assert result['use_advanced'] is True
        assert 'Performance-based selection' in result['reason']
    
    @pytest.mark.asyncio
    async def test_workflow_config_creation_hunyuan(self, enhanced_engine):
        """Test workflow configuration creation for HunyuanVideo"""
        config = AdvancedVideoConfig(
            prompt="Test prompt",
            width=832,
            height=480,
            num_frames=33,
            fps=16,
            guidance_scale=7.5,
            num_inference_steps=25,
            seed=12345,
            input_image=Image.new('RGB', (832, 480), color='red'),
            enable_super_resolution=True,
            target_resolution=(1664, 960)
        )
        
        workflow_config = await enhanced_engine._create_workflow_config(config, 'video/hunyuan_video')
        
        assert workflow_config['prompt'] == "Test prompt"
        assert workflow_config['width'] == 832
        assert workflow_config['height'] == 480
        assert workflow_config['num_frames'] == 33
        assert workflow_config['fps'] == 16
        assert workflow_config['guidance_scale'] == 7.5
        assert workflow_config['num_inference_steps'] == 25
        assert workflow_config['seed'] == 12345
        assert workflow_config['hunyuan_mode'] == 'i2v'
        assert workflow_config['enable_super_resolution'] is True
        assert workflow_config['target_resolution'] == (1664, 960)
        assert 'input_image' in workflow_config
    
    @pytest.mark.asyncio
    async def test_workflow_config_creation_wan(self, enhanced_engine):
        """Test workflow configuration creation for Wan Video"""
        start_image = Image.new('RGB', (832, 480), color='red')
        end_image = Image.new('RGB', (832, 480), color='blue')
        
        config = AdvancedVideoConfig(
            prompt="Transform red to blue",
            width=832,
            height=480,
            num_frames=81,
            fps=16,
            enable_alpha_channel=True,
            transparency_threshold=0.6,
            start_image=start_image,
            end_image=end_image,
            enable_multi_stage=True
        )
        
        workflow_config = await enhanced_engine._create_workflow_config(config, 'video/wan_video')
        
        assert workflow_config['prompt'] == "Transform red to blue"
        assert workflow_config['enable_alpha_channel'] is True
        assert workflow_config['transparency_threshold'] == 0.6
        assert workflow_config['start_image'] == start_image
        assert workflow_config['end_image'] == end_image
        assert workflow_config['processing_stage'] == 'combined'
        assert 'wan_workflow_type' in workflow_config
    
    @pytest.mark.asyncio
    async def test_advanced_workflow_execution_success(self, enhanced_engine, mock_workflow_manager):
        """Test successful advanced workflow execution"""
        await enhanced_engine.initialize()
        
        # Mock successful workflow execution
        mock_result = Mock()
        mock_result.success = True
        mock_result.video_path = Path('output/test_video.mp4')
        mock_result.frames = [np.random.randint(0, 255, (480, 832, 3), dtype=np.uint8) for _ in range(33)]
        mock_result.width = 832
        mock_result.height = 480
        mock_result.num_frames = 33
        mock_result.fps = 16
        mock_result.duration_seconds = 2.0625
        mock_result.memory_used = 12.8
        mock_result.quality_metrics = {'overall_quality': 0.89}
        mock_result.metadata = {'workflow_type': 'hunyuan_t2v'}
        
        mock_workflow_manager.execute_workflow.return_value = mock_result
        
        config = AdvancedVideoConfig(
            prompt="Test prompt",
            width=832,
            height=480,
            num_frames=33
        )
        
        result = await enhanced_engine._execute_advanced_workflow(
            config, 'video/hunyuan_video', {'prompt': 'Test prompt'}
        )
        
        assert isinstance(result, AdvancedVideoResult)
        assert result.success is True
        assert result.workflow_used == 'video/hunyuan_video'
        assert result.workflow_type == 'advanced'
        assert result.width == 832
        assert result.height == 480
        assert result.num_frames == 33
        assert len(result.frames) == 33
    
    @pytest.mark.asyncio
    async def test_legacy_workflow_execution(self, enhanced_engine, mock_legacy_engine):
        """Test legacy workflow execution"""
        # Mock successful legacy execution
        mock_result = VideoGenerationResult(
            success=True,
            output_path='output/legacy_video.mp4',
            generation_time=45.2,
            quality_score=0.85
        )
        mock_legacy_engine.generate_video.return_value = mock_result
        
        config = AdvancedVideoConfig(
            prompt="Test prompt",
            width=832,
            height=480,
            num_frames=33,
            fps=16
        )
        
        result = await enhanced_engine._execute_legacy_workflow(config)
        
        assert isinstance(result, AdvancedVideoResult)
        assert result.success is True
        assert result.workflow_used == 'legacy'
        assert result.workflow_type == 'legacy'
        assert result.quality_score == 0.85
        assert result.metadata['legacy_engine'] is True
    
    @pytest.mark.asyncio
    async def test_quality_validation(self, enhanced_engine):
        """Test video quality validation"""
        result = AdvancedVideoResult(
            success=True,
            width=832,
            height=480,
            num_frames=33,
            has_alpha_channel=True,
            workflow_used='video/wan_video'
        )
        
        config = AdvancedVideoConfig(
            prompt="Test prompt",
            enable_alpha_channel=True
        )
        
        quality_result = await enhanced_engine._validate_quality(result, config)
        
        assert 'metrics' in quality_result
        assert 'overall_score' in quality_result
        assert quality_result['overall_score'] > 0.0
        assert 'alpha_quality' in quality_result['metrics']  # Alpha-specific metric


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])