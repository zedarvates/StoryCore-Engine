#!/usr/bin/env python3
"""
Test suite for GPU optimization and monitoring features.

This test validates GPU memory optimization, monitoring, and fallback mechanisms.
"""

import pytest
import asyncio
import tempfile
from unittest.mock import patch, MagicMock

from src.model_manager import ModelManager, GPUMemoryManager
from src.ai_enhancement_engine import ModelConfig, ModelType


class TestGPUOptimization:
    """Test suite for GPU optimization features."""
    
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
    
    def test_gpu_memory_usage_report(self):
        """Test GPU memory usage reporting."""
        gpu_manager = self.model_manager.gpu_memory_manager
        
        # Get initial report
        report = gpu_manager.get_memory_usage_report()
        
        # Verify report structure
        assert "gpu_available" in report
        assert "total_memory_mb" in report
        assert "available_memory_mb" in report
        assert "allocated_memory_mb" in report
        assert "utilization_percent" in report
        assert "active_allocations" in report
        assert "largest_allocation_mb" in report
        assert "allocations" in report
        assert "temperature" in report
        assert "device_name" in report
        
        # Verify initial state
        assert report["allocated_memory_mb"] == 0
        assert report["active_allocations"] == 0
        assert report["utilization_percent"] == 0
    
    def test_gpu_optimization_scoring(self):
        """Test GPU optimization score calculation."""
        gpu_manager = self.model_manager.gpu_memory_manager
        
        # Test with different utilization levels
        test_reports = [
            {"gpu_available": True, "utilization_percent": 30, "active_allocations": 2, "temperature": 60},
            {"gpu_available": True, "utilization_percent": 75, "active_allocations": 3, "temperature": 70},
            {"gpu_available": True, "utilization_percent": 95, "active_allocations": 8, "temperature": 85},
            {"gpu_available": False, "utilization_percent": 0, "active_allocations": 0, "temperature": 0}
        ]
        
        scores = []
        for report in test_reports:
            score = gpu_manager._calculate_optimization_score(report)
            scores.append(score)
            assert 0 <= score <= 1
        
        # GPU unavailable should have lowest score
        assert scores[3] == 0.0
        
        # Optimal utilization should have higher score than extreme values
        assert scores[1] > scores[0]  # 75% better than 30%
        assert scores[1] > scores[2]  # 75% better than 95%
    
    @pytest.mark.asyncio
    async def test_gpu_memory_optimization(self):
        """Test GPU memory optimization with model unloading."""
        # Load multiple models to fill cache
        model_ids = ["style_transfer_v1", "super_resolution_v2", "interpolation_v1"]
        
        for model_id in model_ids:
            result = await self.model_manager.load_model(model_id)
            assert result.success is True
        
        # Verify models are cached
        assert len(self.model_manager.get_cached_models()) == 3
        
        # Run GPU optimization
        optimization_result = await self.model_manager.optimize_gpu_memory()
        
        # Verify optimization report structure
        assert "gpu_optimization" in optimization_result
        assert "actions_taken" in optimization_result
        assert "final_gpu_status" in optimization_result
        assert "cache_status" in optimization_result
        
        # Verify GPU optimization contains expected fields
        gpu_opt = optimization_result["gpu_optimization"]
        assert "current_status" in gpu_opt
        assert "recommendations" in gpu_opt
        assert "actions_taken" in gpu_opt
        assert "optimization_score" in gpu_opt
    
    @pytest.mark.asyncio
    async def test_cpu_fallback_mechanism(self):
        """Test CPU fallback when GPU memory is insufficient."""
        # Mock GPU memory manager to simulate insufficient memory
        with patch.object(self.model_manager.gpu_memory_manager, 'can_allocate', return_value=False):
            with patch.object(self.model_manager.gpu_memory_manager, 'allocate_memory', return_value=False):
                
                # Load model with GPU request - should fallback to CPU
                result = await self.model_manager.load_model("style_transfer_v1", device="cuda")
                
                assert result.success is True
                assert result.device == "cpu"  # Should fallback to CPU
                assert "fallback_used" in result.model
                assert result.model["fallback_used"] is True
    
    @pytest.mark.asyncio
    async def test_performance_metrics_collection(self):
        """Test comprehensive performance metrics collection."""
        # Load some models to generate metrics
        await self.model_manager.load_model("style_transfer_v1")
        await self.model_manager.load_model("style_transfer_v1")  # Cache hit
        await self.model_manager.load_model("super_resolution_v2")
        
        # Get performance metrics
        metrics = self.model_manager.get_performance_metrics()
        
        # Verify metrics structure
        assert "timestamp" in metrics
        assert "cache_metrics" in metrics
        assert "gpu_metrics" in metrics
        assert "performance_metrics" in metrics
        assert "load_statistics" in metrics
        
        # Verify cache metrics
        cache_metrics = metrics["cache_metrics"]
        assert "hit_rate" in cache_metrics
        assert "cached_models" in cache_metrics
        assert "total_cache_memory_mb" in cache_metrics
        assert "cache_utilization" in cache_metrics
        
        # Verify GPU metrics
        gpu_metrics = metrics["gpu_metrics"]
        assert "available" in gpu_metrics
        assert "utilization_percent" in gpu_metrics
        assert "memory_usage_mb" in gpu_metrics
        assert "temperature" in gpu_metrics
        assert "optimization_score" in gpu_metrics
        
        # Verify performance metrics
        perf_metrics = metrics["performance_metrics"]
        assert "success_rate" in perf_metrics
        assert "average_load_time_ms" in perf_metrics
        assert "total_loads" in perf_metrics
        assert "gpu_load_ratio" in perf_metrics
        
        # Verify reasonable values
        assert 0 <= cache_metrics["hit_rate"] <= 1
        assert cache_metrics["cached_models"] >= 0
        assert 0 <= perf_metrics["success_rate"] <= 1
        assert perf_metrics["average_load_time_ms"] >= 0
    
    @pytest.mark.asyncio
    async def test_model_loading_optimization(self):
        """Test model loading optimization analysis."""
        # Load models with different patterns
        await self.model_manager.load_model("style_transfer_v1")
        await self.model_manager.load_model("style_transfer_v1")  # Cache hit
        await self.model_manager.load_model("super_resolution_v2")
        
        # Get optimization analysis
        optimization = self.model_manager.optimize_model_loading()
        
        # Verify optimization report
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
    
    def test_gpu_memory_allocation_tracking(self):
        """Test GPU memory allocation and tracking."""
        gpu_manager = self.model_manager.gpu_memory_manager
        
        if not gpu_manager.gpu_available:
            pytest.skip("GPU not available for testing")
        
        # Test memory allocation
        allocation_id = "test_allocation"
        memory_mb = 256.0
        
        # Get initial status
        initial_report = gpu_manager.get_memory_usage_report()
        initial_allocated = initial_report["allocated_memory_mb"]
        
        # Allocate memory
        success = gpu_manager.allocate_memory(allocation_id, memory_mb)
        
        if success:
            # Verify allocation is tracked
            updated_report = gpu_manager.get_memory_usage_report()
            assert updated_report["allocated_memory_mb"] == initial_allocated + memory_mb
            assert updated_report["active_allocations"] == initial_report["active_allocations"] + 1
            assert allocation_id in updated_report["allocations"]
            
            # Deallocate memory
            gpu_manager.deallocate_memory(allocation_id)
            
            # Verify deallocation
            final_report = gpu_manager.get_memory_usage_report()
            assert final_report["allocated_memory_mb"] == initial_allocated
            assert allocation_id not in final_report["allocations"]
    
    @pytest.mark.asyncio
    async def test_device_placement_optimization(self):
        """Test intelligent device placement optimization."""
        # Load models on different devices
        result_gpu = await self.model_manager.load_model("style_transfer_v1", device="cuda")
        result_cpu = await self.model_manager.load_model("super_resolution_v2", device="cpu")
        
        # Both should succeed (with potential fallback)
        assert result_gpu.success is True
        assert result_cpu.success is True
        assert result_cpu.device == "cpu"
        
        # Run optimization which includes device placement analysis
        optimization_result = await self.model_manager.optimize_gpu_memory()
        
        # Verify optimization completed without errors
        assert "gpu_optimization" in optimization_result
        assert "final_gpu_status" in optimization_result
    
    @pytest.mark.asyncio
    async def test_model_download_with_progress(self):
        """Test model download with progress tracking."""
        # Create a model that needs to be downloaded
        from src.ai_enhancement_engine import ModelInfo
        
        download_model = ModelInfo(
            model_id="download_test_model",
            model_type=ModelType.STYLE_TRANSFER,
            version="1.0.0",
            size_mb=100.0,
            gpu_memory_required=256,
            supported_operations=["style_transfer"],
            performance_characteristics={"speed": 0.8},
            file_path=f"{self.temp_dir}/models/download_test.pth",
            download_url="https://example.com/download_test.pth",
            checksum="sha256:test123"
        )
        
        # Register the model
        self.model_manager.model_registry.register_model(download_model)
        
        # Load the model (should trigger download)
        result = await self.model_manager.load_model("download_test_model")
        
        # Verify download and loading succeeded
        assert result.success is True
        assert result.model is not None
        
        # Verify file was created
        from pathlib import Path
        model_path = Path(download_model.file_path)
        assert model_path.exists()
        
        # Verify file content
        with open(model_path, 'r') as f:
            content = f.read()
            assert "download_test_model" in content
            assert "1.0.0" in content


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])