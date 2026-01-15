#!/usr/bin/env python3
"""
Test suite for Model Manager - AI model lifecycle and resource management.

This test validates model loading, caching, GPU memory management,
and resource optimization functionality.
"""

import pytest
import asyncio
import tempfile
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

# Import Model Manager components
from src.model_manager import (
    ModelManager,
    ModelRegistry,
    GPUMemoryManager,
    ModelLoadResult,
    ModelCacheEntry
)
from src.ai_enhancement_engine import (
    ModelConfig,
    ModelInfo,
    ModelType,
    GPUResourceStatus
)


class TestModelRegistry:
    """Test suite for Model Registry."""
    
    def setup_method(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.registry = ModelRegistry(self.temp_dir)
    
    def test_registry_initialization(self):
        """Test model registry initialization."""
        assert self.registry.registry_path.exists()
        assert len(self.registry.models) >= 4  # Should have default models
        
        # Check default models are present
        model_ids = list(self.registry.models.keys())
        assert "style_transfer_v1" in model_ids
        assert "super_resolution_v2" in model_ids
        assert "interpolation_v1" in model_ids
        assert "quality_assessment_v1" in model_ids
    
    def test_get_model_info(self):
        """Test getting model information."""
        model_info = self.registry.get_model_info("style_transfer_v1")
        assert model_info is not None
        assert model_info.model_id == "style_transfer_v1"
        assert model_info.model_type == ModelType.STYLE_TRANSFER
        assert model_info.version == "1.0.0"
        assert model_info.size_mb > 0
        assert model_info.gpu_memory_required > 0
        assert len(model_info.supported_operations) > 0
        
        # Test non-existent model
        assert self.registry.get_model_info("non_existent") is None
    
    def test_list_models(self):
        """Test listing models with optional filtering."""
        # List all models
        all_models = self.registry.list_models()
        assert len(all_models) >= 4
        
        # List by type
        style_models = self.registry.list_models(ModelType.STYLE_TRANSFER)
        assert len(style_models) >= 1
        assert all(m.model_type == ModelType.STYLE_TRANSFER for m in style_models)
        
        super_res_models = self.registry.list_models(ModelType.SUPER_RESOLUTION)
        assert len(super_res_models) >= 1
        assert all(m.model_type == ModelType.SUPER_RESOLUTION for m in super_res_models)
    
    def test_register_unregister_model(self):
        """Test registering and unregistering models."""
        # Create test model
        test_model = ModelInfo(
            model_id="test_model_v1",
            model_type=ModelType.NOISE_REDUCTION,
            version="1.0.0",
            size_mb=100.0,
            gpu_memory_required=256,
            supported_operations=["noise_reduction"],
            performance_characteristics={"speed": 0.8}
        )
        
        # Register model
        initial_count = len(self.registry.models)
        self.registry.register_model(test_model)
        assert len(self.registry.models) == initial_count + 1
        assert "test_model_v1" in self.registry.models
        
        # Verify model info
        retrieved_model = self.registry.get_model_info("test_model_v1")
        assert retrieved_model.model_id == test_model.model_id
        assert retrieved_model.model_type == test_model.model_type
        
        # Unregister model
        success = self.registry.unregister_model("test_model_v1")
        assert success is True
        assert len(self.registry.models) == initial_count
        assert "test_model_v1" not in self.registry.models
        
        # Try to unregister non-existent model
        success = self.registry.unregister_model("non_existent")
        assert success is False
    
    def test_registry_persistence(self):
        """Test registry persistence to file."""
        # Create new registry in same directory
        registry2 = ModelRegistry(self.temp_dir)
        
        # Should load existing models
        assert len(registry2.models) == len(self.registry.models)
        
        # Add a model to first registry
        test_model = ModelInfo(
            model_id="persistence_test",
            model_type=ModelType.COLOR_ENHANCEMENT,
            version="1.0.0",
            size_mb=50.0,
            gpu_memory_required=128,
            supported_operations=["color_enhancement"],
            performance_characteristics={"speed": 0.9}
        )
        
        self.registry.register_model(test_model)
        
        # Create third registry - should load the new model
        registry3 = ModelRegistry(self.temp_dir)
        assert "persistence_test" in registry3.models
        retrieved_model = registry3.get_model_info("persistence_test")
        assert retrieved_model.model_id == "persistence_test"


class TestGPUMemoryManager:
    """Test suite for GPU Memory Manager."""
    
    def setup_method(self):
        """Set up test environment."""
        self.gpu_manager = GPUMemoryManager()
    
    def test_gpu_status_reporting(self):
        """Test GPU status reporting."""
        status = self.gpu_manager.get_gpu_status()
        assert isinstance(status, GPUResourceStatus)
        assert status.total_memory >= 0
        assert status.available_memory >= 0
        assert 0 <= status.utilization_percent <= 100
        assert status.temperature >= 0
        assert status.active_jobs >= 0
        assert status.queue_depth >= 0
        assert isinstance(status.device_name, str)
    
    def test_memory_allocation_deallocation(self):
        """Test memory allocation and deallocation."""
        if not self.gpu_manager.gpu_available:
            pytest.skip("GPU not available for testing")
        
        # Test allocation
        allocation_id = "test_allocation_1"
        memory_mb = 512.0
        
        # Check if allocation is possible
        can_allocate = self.gpu_manager.can_allocate(memory_mb)
        
        if can_allocate:
            # Allocate memory
            success = self.gpu_manager.allocate_memory(allocation_id, memory_mb)
            assert success is True
            
            # Check status reflects allocation
            status = self.gpu_manager.get_gpu_status()
            assert allocation_id in self.gpu_manager.memory_allocations
            assert self.gpu_manager.memory_allocations[allocation_id] == memory_mb
            
            # Deallocate memory
            self.gpu_manager.deallocate_memory(allocation_id)
            assert allocation_id not in self.gpu_manager.memory_allocations
    
    def test_optimal_device_selection(self):
        """Test optimal device selection."""
        # Test with small memory requirement
        device = self.gpu_manager.get_optimal_device(100.0)
        assert device in ["cuda", "cpu"]
        
        # Test with large memory requirement (should fallback to CPU)
        device = self.gpu_manager.get_optimal_device(99999.0)
        assert device == "cpu"
    
    def test_memory_allocation_limits(self):
        """Test memory allocation limits and failures."""
        if not self.gpu_manager.gpu_available:
            pytest.skip("GPU not available for testing")
        
        # Try to allocate more memory than available
        large_allocation = 99999.0
        can_allocate = self.gpu_manager.can_allocate(large_allocation)
        assert can_allocate is False
        
        success = self.gpu_manager.allocate_memory("large_test", large_allocation)
        assert success is False


class TestModelManager:
    """Test suite for Model Manager."""
    
    def setup_method(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.config = ModelConfig(
            model_registry_path=self.temp_dir,
            model_cache_size=3,
            gpu_memory_limit_mb=4096,
            cpu_fallback_enabled=True,
            model_download_enabled=True
        )
        self.model_manager = ModelManager(self.config)
    
    @pytest.mark.asyncio
    async def test_model_manager_initialization(self):
        """Test model manager initialization."""
        assert self.model_manager.config == self.config
        assert self.model_manager.model_registry is not None
        assert self.model_manager.gpu_memory_manager is not None
        assert len(self.model_manager.model_cache) == 0
        assert self.model_manager.load_stats["total_loads"] == 0
    
    @pytest.mark.asyncio
    async def test_model_loading_from_cache(self):
        """Test model loading and caching."""
        model_id = "style_transfer_v1"
        
        # First load - should be cache miss
        result1 = await self.model_manager.load_model(model_id)
        assert result1.success is True
        assert result1.model is not None
        assert result1.device in ["cuda", "cpu"]
        assert result1.memory_used_mb > 0
        assert result1.load_time_ms > 0
        
        # Verify model is cached
        cached_models = self.model_manager.get_cached_models()
        assert model_id in cached_models
        
        # Second load - should be cache hit
        result2 = await self.model_manager.load_model(model_id)
        assert result2.success is True
        assert result2.model is not None
        assert result2.load_time_ms < result1.load_time_ms  # Should be faster from cache
        
        # Verify statistics
        stats = self.model_manager.load_stats
        assert stats["total_loads"] == 2
        assert stats["successful_loads"] == 2
        assert stats["cache_hits"] == 1
        assert stats["cache_misses"] == 1
    
    @pytest.mark.asyncio
    async def test_model_loading_with_device_selection(self):
        """Test model loading with specific device selection."""
        model_id = "super_resolution_v2"
        
        # Test auto device selection
        result_auto = await self.model_manager.load_model(model_id, device="auto")
        assert result_auto.success is True
        assert result_auto.device in ["cuda", "cpu"]
        
        # Clear cache
        await self.model_manager.unload_model(model_id)
        
        # Test CPU device selection
        result_cpu = await self.model_manager.load_model(model_id, device="cpu")
        assert result_cpu.success is True
        assert result_cpu.device == "cpu"
    
    @pytest.mark.asyncio
    async def test_model_unloading(self):
        """Test model unloading."""
        model_id = "interpolation_v1"
        
        # Load model
        result = await self.model_manager.load_model(model_id)
        assert result.success is True
        assert model_id in self.model_manager.get_cached_models()
        
        # Unload model
        success = await self.model_manager.unload_model(model_id)
        assert success is True
        assert model_id not in self.model_manager.get_cached_models()
        
        # Try to unload non-existent model
        success = await self.model_manager.unload_model("non_existent")
        assert success is False
    
    @pytest.mark.asyncio
    async def test_cache_eviction(self):
        """Test LRU cache eviction when cache is full."""
        # Load models up to cache limit
        model_ids = ["style_transfer_v1", "super_resolution_v2", "interpolation_v1"]
        
        for model_id in model_ids:
            result = await self.model_manager.load_model(model_id)
            assert result.success is True
        
        # Cache should be full
        assert len(self.model_manager.get_cached_models()) == 3
        
        # Load another model - should evict LRU
        result = await self.model_manager.load_model("quality_assessment_v1")
        assert result.success is True
        
        # Cache should still have 3 models, but first one should be evicted
        cached_models = self.model_manager.get_cached_models()
        assert len(cached_models) == 3
        assert "style_transfer_v1" not in cached_models  # Should be evicted (LRU)
        assert "quality_assessment_v1" in cached_models
    
    @pytest.mark.asyncio
    async def test_model_loading_failure(self):
        """Test model loading failure scenarios."""
        # Test loading non-existent model
        result = await self.model_manager.load_model("non_existent_model")
        assert result.success is False
        assert result.error_message is not None
        assert "not found in registry" in result.error_message
        
        # Verify failure statistics
        stats = self.model_manager.load_stats
        assert stats["failed_loads"] >= 1
    
    def test_model_info_retrieval(self):
        """Test model information retrieval."""
        # Test existing model
        model_info = self.model_manager.get_model_info("style_transfer_v1")
        assert model_info is not None
        assert model_info.model_id == "style_transfer_v1"
        
        # Test non-existent model
        model_info = self.model_manager.get_model_info("non_existent")
        assert model_info is None
    
    def test_available_models_listing(self):
        """Test listing available models."""
        # List all models
        all_models = self.model_manager.list_available_models()
        assert len(all_models) >= 4
        
        # List by type
        style_models = self.model_manager.list_available_models(ModelType.STYLE_TRANSFER)
        assert len(style_models) >= 1
        assert all(m.model_type == ModelType.STYLE_TRANSFER for m in style_models)
    
    @pytest.mark.asyncio
    async def test_cache_status_reporting(self):
        """Test cache status and statistics reporting."""
        # Load some models
        await self.model_manager.load_model("style_transfer_v1")
        await self.model_manager.load_model("super_resolution_v2")
        
        # Get cache status
        cache_status = self.model_manager.get_cache_status()
        
        assert cache_status["cached_models"] == 2
        assert cache_status["total_memory_mb"] > 0
        assert cache_status["max_cache_size"] == 3
        assert len(cache_status["cache_entries"]) == 2
        assert "load_statistics" in cache_status
        
        # Verify cache entries have required fields
        for entry in cache_status["cache_entries"]:
            assert "model_id" in entry
            assert "device" in entry
            assert "memory_mb" in entry
            assert "last_accessed" in entry
            assert "access_count" in entry
            assert "load_time_ms" in entry
    
    @pytest.mark.asyncio
    async def test_optimization_analysis(self):
        """Test model loading optimization analysis."""
        # Load some models to generate statistics
        await self.model_manager.load_model("style_transfer_v1")
        await self.model_manager.load_model("style_transfer_v1")  # Cache hit
        await self.model_manager.load_model("super_resolution_v2")
        
        # Get optimization report
        optimization = self.model_manager.optimize_model_loading()
        
        assert "cache_hit_rate" in optimization
        assert "gpu_utilization_rate" in optimization
        assert "average_load_time_ms" in optimization
        assert "recommendations" in optimization
        assert "gpu_status" in optimization
        
        # Verify metrics are reasonable
        assert 0 <= optimization["cache_hit_rate"] <= 1
        assert 0 <= optimization["gpu_utilization_rate"] <= 1
        assert optimization["average_load_time_ms"] >= 0
        assert isinstance(optimization["recommendations"], list)
    
    @pytest.mark.asyncio
    async def test_model_manager_shutdown(self):
        """Test model manager shutdown and cleanup."""
        # Load some models
        await self.model_manager.load_model("style_transfer_v1")
        await self.model_manager.load_model("super_resolution_v2")
        
        # Verify models are cached
        assert len(self.model_manager.get_cached_models()) == 2
        
        # Shutdown
        await self.model_manager.shutdown()
        
        # Verify all models are unloaded
        assert len(self.model_manager.get_cached_models()) == 0


class TestModelLoadResult:
    """Test suite for ModelLoadResult data structure."""
    
    def test_successful_load_result(self):
        """Test successful model load result."""
        mock_model = {"model_id": "test", "type": "style_transfer"}
        result = ModelLoadResult(
            success=True,
            model=mock_model,
            device="cuda",
            memory_used_mb=256.0,
            load_time_ms=500.0
        )
        
        assert result.success is True
        assert result.model == mock_model
        assert result.device == "cuda"
        assert result.memory_used_mb == 256.0
        assert result.load_time_ms == 500.0
        assert result.error_message is None
    
    def test_failed_load_result(self):
        """Test failed model load result."""
        result = ModelLoadResult(
            success=False,
            error_message="Model not found"
        )
        
        assert result.success is False
        assert result.model is None
        assert result.error_message == "Model not found"
        assert result.device == "cpu"  # Default
        assert result.memory_used_mb == 0.0  # Default
        assert result.load_time_ms == 0.0  # Default


class TestModelCacheEntry:
    """Test suite for ModelCacheEntry data structure."""
    
    def test_cache_entry_creation(self):
        """Test cache entry creation and fields."""
        mock_model = {"model_id": "test"}
        model_info = ModelInfo(
            model_id="test_model",
            model_type=ModelType.STYLE_TRANSFER,
            version="1.0.0",
            size_mb=128.0,
            gpu_memory_required=512,
            supported_operations=["style_transfer"],
            performance_characteristics={"speed": 0.8}
        )
        
        entry = ModelCacheEntry(
            model=mock_model,
            model_info=model_info,
            device="cuda",
            memory_used_mb=128.0,
            last_accessed=1234567890.0,
            access_count=5,
            load_time_ms=300.0
        )
        
        assert entry.model == mock_model
        assert entry.model_info == model_info
        assert entry.device == "cuda"
        assert entry.memory_used_mb == 128.0
        assert entry.last_accessed == 1234567890.0
        assert entry.access_count == 5
        assert entry.load_time_ms == 300.0


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])