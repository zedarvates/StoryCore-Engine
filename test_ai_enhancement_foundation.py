#!/usr/bin/env python3
"""
Test suite for AI Enhancement Engine foundation and core interfaces.

This test validates the basic functionality of the AI Enhancement Engine,
including initialization, configuration validation, and core data structures.
"""

import pytest
import asyncio
import json
import tempfile
from pathlib import Path
from datetime import datetime

# Import AI Enhancement components
from src.ai_enhancement_engine import (
    AIEnhancementEngine,
    AIConfig,
    ModelConfig,
    GPUConfig,
    CacheConfig,
    PerformanceTargets,
    EnhancementConfig,
    EnhancementType,
    QualityLevel,
    PerformanceMode,
    JobPriority,
    VideoFrame,
    EnhancedFrame,
    EnhancementMetadata,
    ModelInfo,
    ModelType,
    GPUResourceStatus,
    EnhancementInfo,
    create_ai_enhancement_engine
)
from src.circuit_breaker import CircuitBreakerConfig


class TestAIEnhancementFoundation:
    """Test suite for AI Enhancement Engine foundation."""
    
    def setup_method(self):
        """Set up test environment."""
        self.config = AIConfig()
        self.engine = AIEnhancementEngine(self.config)
    
    def test_ai_config_initialization(self):
        """Test AI configuration initialization with default values."""
        config = AIConfig()
        
        # Validate default configuration values
        assert isinstance(config.model_config, ModelConfig)
        assert isinstance(config.gpu_config, GPUConfig)
        assert isinstance(config.cache_config, CacheConfig)
        assert isinstance(config.circuit_breaker_config, CircuitBreakerConfig)
        assert isinstance(config.performance_targets, PerformanceTargets)
        
        # Validate default settings
        assert config.enable_analytics is True
        assert config.enable_preview_integration is True
        assert config.enable_batch_integration is True
        
        # Validate performance targets
        assert config.performance_targets.max_processing_time_ms > 0
        assert 0.0 <= config.performance_targets.target_quality_score <= 1.0
        assert config.performance_targets.max_memory_usage_mb > 0
        assert 0.0 <= config.performance_targets.target_cache_hit_rate <= 1.0
        assert 0.0 <= config.performance_targets.max_gpu_utilization <= 1.0
    
    def test_enhancement_config_creation(self):
        """Test enhancement configuration creation."""
        config = EnhancementConfig(
            enhancement_type=EnhancementType.STYLE_TRANSFER,
            parameters={"style_strength": 0.8},
            quality_level=QualityLevel.HIGH,
            performance_mode=PerformanceMode.QUALITY,
            priority=JobPriority.HIGH
        )
        
        assert config.enhancement_type == EnhancementType.STYLE_TRANSFER
        assert config.parameters["style_strength"] == 0.8
        assert config.quality_level == QualityLevel.HIGH
        assert config.performance_mode == PerformanceMode.QUALITY
        assert config.priority == JobPriority.HIGH
        assert config.timeout_seconds > 0
        assert config.enable_caching is True
    
    def test_video_frame_creation(self):
        """Test video frame data structure."""
        frame = VideoFrame(
            frame_id="test_frame_001",
            width=1920,
            height=1080,
            format="RGB24",
            data=b"mock_frame_data",
            timestamp=123.456,
            metadata={"source": "test"}
        )
        
        assert frame.frame_id == "test_frame_001"
        assert frame.width == 1920
        assert frame.height == 1080
        assert frame.format == "RGB24"
        assert frame.data == b"mock_frame_data"
        assert frame.timestamp == 123.456
        assert frame.metadata["source"] == "test"
    
    def test_model_info_serialization(self):
        """Test model info serialization to dictionary."""
        model_info = ModelInfo(
            model_id="test_model_v1",
            model_type=ModelType.STYLE_TRANSFER,
            version="1.0.0",
            size_mb=256.5,
            gpu_memory_required=1024,
            supported_operations=["style_transfer", "color_enhancement"],
            performance_characteristics={"speed": 0.8, "quality": 0.9},
            file_path="/models/test_model.pth"
        )
        
        model_dict = model_info.to_dict()
        
        assert model_dict["model_id"] == "test_model_v1"
        assert model_dict["model_type"] == "style_transfer"
        assert model_dict["version"] == "1.0.0"
        assert model_dict["size_mb"] == 256.5
        assert model_dict["gpu_memory_required"] == 1024
        assert "style_transfer" in model_dict["supported_operations"]
        assert model_dict["performance_characteristics"]["speed"] == 0.8
        assert model_dict["file_path"] == "/models/test_model.pth"
    
    def test_gpu_resource_status_serialization(self):
        """Test GPU resource status serialization."""
        status = GPUResourceStatus(
            total_memory=8192,
            available_memory=4096,
            utilization_percent=75.5,
            temperature=65.0,
            active_jobs=3,
            queue_depth=2,
            device_name="NVIDIA RTX 4080"
        )
        
        status_dict = status.to_dict()
        
        assert status_dict["total_memory"] == 8192
        assert status_dict["available_memory"] == 4096
        assert status_dict["utilization_percent"] == 75.5
        assert status_dict["temperature"] == 65.0
        assert status_dict["active_jobs"] == 3
        assert status_dict["queue_depth"] == 2
        assert status_dict["device_name"] == "NVIDIA RTX 4080"
    
    def test_enhancement_info_serialization(self):
        """Test enhancement info serialization."""
        enhancement_info = EnhancementInfo(
            enhancement_type=EnhancementType.SUPER_RESOLUTION,
            display_name="AI Super Resolution",
            description="Upscale with AI",
            supported_quality_levels=[QualityLevel.STANDARD, QualityLevel.HIGH],
            required_models=["super_res_v2"],
            estimated_processing_time={
                QualityLevel.STANDARD: 500.0,
                QualityLevel.HIGH: 1500.0
            },
            supported_parameters={"upscale_factor": {"type": "int", "options": [2, 4]}}
        )
        
        info_dict = enhancement_info.to_dict()
        
        assert info_dict["enhancement_type"] == "super_resolution"
        assert info_dict["display_name"] == "AI Super Resolution"
        assert "standard" in info_dict["supported_quality_levels"]
        assert "high" in info_dict["supported_quality_levels"]
        assert "super_res_v2" in info_dict["required_models"]
        assert info_dict["estimated_processing_time"]["standard"] == 500.0
    
    @pytest.mark.asyncio
    async def test_ai_enhancement_engine_initialization(self):
        """Test AI Enhancement Engine initialization."""
        engine = AIEnhancementEngine(self.config)
        
        # Test initial state
        assert not engine.is_initialized
        assert engine.config == self.config
        assert engine.circuit_breaker is not None
        assert engine.performance_metrics["total_enhancements"] == 0
        
        # Test initialization
        success = await engine.initialize()
        assert success is True
        assert engine.is_initialized is True
        
        # Test available enhancements
        enhancements = engine.get_available_enhancements()
        assert len(enhancements) >= 3  # Should have at least style transfer, super resolution, interpolation
        
        enhancement_types = [e.enhancement_type for e in enhancements]
        assert EnhancementType.STYLE_TRANSFER in enhancement_types
        assert EnhancementType.SUPER_RESOLUTION in enhancement_types
        assert EnhancementType.CONTENT_AWARE_INTERPOLATION in enhancement_types
    
    @pytest.mark.asyncio
    async def test_configuration_validation(self):
        """Test configuration validation."""
        # Test valid configuration
        valid_config = AIConfig()
        engine = AIEnhancementEngine(valid_config)
        success = await engine.initialize()
        assert success is True
        
        # Test invalid configuration - negative processing time
        invalid_config = AIConfig()
        invalid_config.performance_targets.max_processing_time_ms = -100
        engine = AIEnhancementEngine(invalid_config)
        success = await engine.initialize()
        assert success is False
        
        # Test invalid configuration - invalid quality score
        invalid_config2 = AIConfig()
        invalid_config2.performance_targets.target_quality_score = 1.5
        engine2 = AIEnhancementEngine(invalid_config2)
        success2 = await engine2.initialize()
        assert success2 is False
    
    @pytest.mark.asyncio
    async def test_frame_enhancement_simulation(self):
        """Test frame enhancement simulation."""
        await self.engine.initialize()
        
        # Create test frame
        frame = VideoFrame(
            frame_id="test_001",
            width=1920,
            height=1080,
            format="RGB24",
            data=b"test_frame_data",
            timestamp=0.0
        )
        
        # Test enhancement
        enhanced_frame = await self.engine.enhance_frame(
            frame,
            EnhancementType.STYLE_TRANSFER,
            {"style_strength": 0.7, "quality_level": QualityLevel.STANDARD}
        )
        
        assert enhanced_frame is not None
        assert enhanced_frame.original_frame == frame
        assert enhanced_frame.enhancement_metadata.enhancement_type == EnhancementType.STYLE_TRANSFER
        assert enhanced_frame.quality_score > 0
        assert enhanced_frame.confidence_score > 0
        assert enhanced_frame.processing_time > 0
        
        # Verify performance metrics updated
        metrics = self.engine.get_performance_metrics()
        assert metrics["total_enhancements"] == 1
        assert metrics["successful_enhancements"] == 1
        assert metrics["success_rate"] == 1.0
    
    @pytest.mark.asyncio
    async def test_sequence_enhancement(self):
        """Test sequence enhancement."""
        await self.engine.initialize()
        
        # Create test frames
        frames = []
        for i in range(3):
            frame = VideoFrame(
                frame_id=f"test_{i:03d}",
                width=1920,
                height=1080,
                format="RGB24",
                data=f"test_frame_data_{i}".encode(),
                timestamp=i * 0.033
            )
            frames.append(frame)
        
        # Create enhancement config
        config = EnhancementConfig(
            enhancement_type=EnhancementType.SUPER_RESOLUTION,
            parameters={"upscale_factor": 2},
            quality_level=QualityLevel.STANDARD
        )
        
        # Test sequence enhancement
        enhanced_frames = await self.engine.enhance_sequence(frames, config)
        
        assert len(enhanced_frames) == 3
        for i, enhanced_frame in enumerate(enhanced_frames):
            assert enhanced_frame.original_frame.frame_id == f"test_{i:03d}"
            assert enhanced_frame.enhancement_metadata.enhancement_type == EnhancementType.SUPER_RESOLUTION
        
        # Verify performance metrics
        metrics = self.engine.get_performance_metrics()
        assert metrics["total_enhancements"] == 3
        assert metrics["successful_enhancements"] == 3
    
    def test_performance_metrics_tracking(self):
        """Test performance metrics tracking."""
        metrics = self.engine.get_performance_metrics()
        
        # Test initial metrics
        assert metrics["total_enhancements"] == 0
        assert metrics["successful_enhancements"] == 0
        assert metrics["failed_enhancements"] == 0
        assert metrics["success_rate"] == 0.0
        assert metrics["average_processing_time"] == 0.0
        assert metrics["cache_hit_rate"] == 0.0
        
        # Simulate some metrics
        self.engine.performance_metrics["total_enhancements"] = 10
        self.engine.performance_metrics["successful_enhancements"] = 8
        self.engine.performance_metrics["failed_enhancements"] = 2
        self.engine.performance_metrics["total_processing_time"] = 5000.0
        self.engine.performance_metrics["cache_hits"] = 3
        self.engine.performance_metrics["cache_misses"] = 7
        
        updated_metrics = self.engine.get_performance_metrics()
        assert updated_metrics["success_rate"] == 0.8
        assert updated_metrics["average_processing_time"] == 500.0
        assert updated_metrics["cache_hit_rate"] == 0.3
    
    def test_system_status_reporting(self):
        """Test system status reporting."""
        status = self.engine.get_system_status()
        
        assert "initialized" in status
        assert "circuit_breaker_state" in status
        assert "available_enhancements" in status
        assert "performance_metrics" in status
        assert "config" in status
        
        # Test configuration in status
        config_status = status["config"]
        assert "max_processing_time_ms" in config_status
        assert "target_quality_score" in config_status
        assert "gpu_enabled" in config_status
        assert "cache_enabled" in config_status
    
    def test_enhanced_frame_serialization(self):
        """Test enhanced frame serialization."""
        # Create test frame and metadata
        frame = VideoFrame(
            frame_id="test_001",
            width=1920,
            height=1080,
            format="RGB24",
            data=b"test_data",
            timestamp=0.0
        )
        
        metadata = EnhancementMetadata(
            enhancement_type=EnhancementType.STYLE_TRANSFER,
            model_id="test_model",
            model_version="1.0",
            parameters={"strength": 0.8},
            processing_time_ms=500.0,
            quality_score=0.9,
            confidence_score=0.85,
            gpu_used=True,
            cache_hit=False
        )
        
        enhanced_frame = EnhancedFrame(
            original_frame=frame,
            enhanced_data=b"enhanced_data",
            enhancement_metadata=metadata,
            processing_time=500.0,
            quality_score=0.9,
            confidence_score=0.85
        )
        
        # Test serialization
        frame_dict = enhanced_frame.to_dict()
        
        assert frame_dict["frame_id"] == "test_001"
        assert frame_dict["width"] == 1920
        assert frame_dict["height"] == 1080
        assert frame_dict["enhancement_type"] == "style_transfer"
        assert frame_dict["model_id"] == "test_model"
        assert frame_dict["processing_time"] == 500.0
        assert frame_dict["quality_score"] == 0.9
        assert frame_dict["confidence_score"] == 0.85
        assert frame_dict["gpu_used"] is True
        assert frame_dict["cache_hit"] is False
        assert "created_at" in frame_dict
    
    def test_factory_function(self):
        """Test AI Enhancement Engine factory function."""
        # Test creation without config file
        engine = create_ai_enhancement_engine()
        assert isinstance(engine, AIEnhancementEngine)
        assert isinstance(engine.config, AIConfig)
        
        # Test creation with non-existent config file
        engine2 = create_ai_enhancement_engine("non_existent_config.json")
        assert isinstance(engine2, AIEnhancementEngine)
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_integration(self):
        """Test circuit breaker integration with AI operations."""
        await self.engine.initialize()
        
        # Test that circuit breaker is properly integrated
        assert self.engine.circuit_breaker is not None
        
        # Create test frame
        frame = VideoFrame(
            frame_id="test_cb",
            width=1920,
            height=1080,
            format="RGB24",
            data=b"test_data",
            timestamp=0.0
        )
        
        # Test normal operation (should work)
        enhanced_frame = await self.engine.enhance_frame(
            frame,
            EnhancementType.STYLE_TRANSFER,
            {"style_strength": 0.5}
        )
        
        assert enhanced_frame is not None
        
        # Verify circuit breaker state is accessible
        status = self.engine.get_system_status()
        assert "circuit_breaker_state" in status
    
    @pytest.mark.asyncio
    async def test_shutdown_cleanup(self):
        """Test proper shutdown and cleanup."""
        await self.engine.initialize()
        assert self.engine.is_initialized is True
        
        # Test shutdown
        await self.engine.shutdown()
        assert self.engine.is_initialized is False


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])