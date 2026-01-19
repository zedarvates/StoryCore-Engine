"""
Test suite for Advanced Performance Optimizer

Comprehensive tests for performance optimization, model management,
resource monitoring, and batch processing functionality.

Author: StoryCore-Engine Team
Date: January 12, 2026
Version: 1.0.0
"""

import pytest
import asyncio
import json
import tempfile
import time
from pathlib import Path
from collections import deque
from unittest.mock import Mock, patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from advanced_performance_optimizer import (
    AdvancedPerformanceOptimizer,
    PerformanceConfig,
    OptimizationStrategy,
    ResourceType,
    ModelState,
    ResourceMetrics,
    ModelInfo,
    WorkflowProfile,
    BatchJob,
    ModelManager,
    ResourceMonitor,
    BatchProcessor,
    create_advanced_performance_optimizer
)


class TestPerformanceConfig:
    """Test PerformanceConfig dataclass"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = PerformanceConfig()
        
        assert config.max_models_in_memory == 3
        assert config.model_cache_size_mb == 8192
        assert config.memory_threshold_percent == 85.0
        assert config.max_batch_size == 8
        assert config.enable_profiling is True
        assert config.default_strategy == OptimizationStrategy.BALANCED
    
    def test_custom_config(self):
        """Test custom configuration values"""
        config = PerformanceConfig(
            max_models_in_memory=5,
            memory_threshold_percent=90.0,
            max_batch_size=16,
            enable_profiling=False
        )
        
        assert config.max_models_in_memory == 5
        assert config.memory_threshold_percent == 90.0
        assert config.max_batch_size == 16
        assert config.enable_profiling is False


class TestEnums:
    """Test performance-related enums"""
    
    def test_optimization_strategy_enum(self):
        """Test OptimizationStrategy enum values"""
        strategies = [strategy.value for strategy in OptimizationStrategy]
        
        expected_strategies = [
            'speed_first', 'memory_first', 'balanced', 'quality_first', 'adaptive'
        ]
        
        for expected in expected_strategies:
            assert expected in strategies
    
    def test_resource_type_enum(self):
        """Test ResourceType enum values"""
        types = [rtype.value for rtype in ResourceType]
        expected_types = ['cpu', 'memory', 'gpu', 'disk', 'network']
        
        for expected in expected_types:
            assert expected in types
    
    def test_model_state_enum(self):
        """Test ModelState enum values"""
        states = [state.value for state in ModelState]
        expected_states = ['unloaded', 'loading', 'loaded', 'unloading', 'shared', 'cached']
        
        for expected in expected_states:
            assert expected in states


class TestDataClasses:
    """Test performance-related data classes"""
    
    def test_resource_metrics(self):
        """Test ResourceMetrics dataclass"""
        metrics = ResourceMetrics(
            cpu_percent=45.5,
            memory_percent=67.2,
            gpu_percent=23.8,
            memory_available=8192,
            gpu_memory_used=2048,
            gpu_memory_free=6144
        )
        
        assert metrics.cpu_percent == 45.5
        assert metrics.memory_percent == 67.2
        assert metrics.gpu_percent == 23.8
        assert metrics.memory_available == 8192
        assert metrics.gpu_memory_used == 2048
        assert metrics.gpu_memory_free == 6144
        assert metrics.timestamp > 0
    
    def test_model_info(self):
        """Test ModelInfo dataclass"""
        model = ModelInfo(
            model_id="test_model_001",
            model_type="diffusion",
            size_mb=2048,
            state=ModelState.LOADED,
            usage_count=5
        )
        
        assert model.model_id == "test_model_001"
        assert model.model_type == "diffusion"
        assert model.size_mb == 2048
        assert model.state == ModelState.LOADED
        assert model.usage_count == 5
        assert model.shared_count == 0
        assert model.last_used > 0
    
    def test_workflow_profile(self):
        """Test WorkflowProfile dataclass"""
        profile = WorkflowProfile(
            workflow_id="test_workflow",
            execution_count=10,
            total_time=25.5,
            average_time=2.55
        )
        
        assert profile.workflow_id == "test_workflow"
        assert profile.execution_count == 10
        assert profile.total_time == 25.5
        assert profile.average_time == 2.55
        assert profile.memory_peak == 0
        assert profile.gpu_peak == 0
    
    def test_batch_job(self):
        """Test BatchJob dataclass"""
        items = [{'id': 1}, {'id': 2}, {'id': 3}]
        job = BatchJob(
            job_id="batch_001",
            workflow_type="image_generation",
            items=items,
            priority=7
        )
        
        assert job.job_id == "batch_001"
        assert job.workflow_type == "image_generation"
        assert len(job.items) == 3
        assert job.priority == 7
        assert job.status == "pending"
        assert job.created_at > 0


class TestModelManager:
    """Test ModelManager class"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return PerformanceConfig(
            max_models_in_memory=2,
            model_cache_size_mb=4096,
            model_unload_timeout=60
        )
    
    @pytest.fixture
    def model_manager(self, config):
        """Create ModelManager instance for testing"""
        return ModelManager(config)
    
    def test_model_manager_initialization(self, model_manager):
        """Test model manager initialization"""
        assert model_manager.config is not None
        assert model_manager.logger is not None
        assert isinstance(model_manager.models, dict)
        assert isinstance(model_manager.model_cache, dict)
        assert len(model_manager.models) == 0
    
    @pytest.mark.asyncio
    async def test_load_model(self, model_manager):
        """Test model loading"""
        model = await model_manager.load_model("test_model", "diffusion", 1024)
        
        assert model is not None
        assert "test_model" in model_manager.models
        assert "test_model" in model_manager.model_cache
        
        model_info = model_manager.models["test_model"]
        assert model_info.model_id == "test_model"
        assert model_info.model_type == "diffusion"
        assert model_info.size_mb == 1024
        assert model_info.state == ModelState.LOADED
        assert model_info.usage_count == 1
    
    @pytest.mark.asyncio
    async def test_load_existing_model(self, model_manager):
        """Test loading already loaded model"""
        # Load model first time
        model1 = await model_manager.load_model("test_model", "diffusion", 1024)
        
        # Load same model again
        model2 = await model_manager.load_model("test_model", "diffusion", 1024)
        
        assert model1 == model2
        assert model_manager.models["test_model"].usage_count == 2
    
    @pytest.mark.asyncio
    async def test_unload_model(self, model_manager):
        """Test model unloading"""
        # Load model
        await model_manager.load_model("test_model", "diffusion", 1024)
        
        # Unload model
        await model_manager.unload_model("test_model")
        
        model_info = model_manager.models["test_model"]
        assert model_info.state == ModelState.UNLOADED
        assert "test_model" not in model_manager.model_cache
    
    @pytest.mark.asyncio
    async def test_memory_management(self, model_manager):
        """Test memory management and LRU eviction"""
        # Load models up to cache limit
        await model_manager.load_model("model_1", "diffusion", 2048)
        await model_manager.load_model("model_2", "diffusion", 2048)
        
        # This should trigger eviction of least recently used model
        await model_manager.load_model("model_3", "diffusion", 2048)
        
        # Check that models are managed properly
        stats = model_manager.get_model_stats()
        assert stats['total_models'] == 3
        assert stats['memory_usage_mb'] <= model_manager.config.model_cache_size_mb
    
    def test_model_stats(self, model_manager):
        """Test model statistics"""
        stats = model_manager.get_model_stats()
        
        assert isinstance(stats, dict)
        assert 'total_models' in stats
        assert 'loaded_models' in stats
        assert 'memory_usage_mb' in stats
        assert 'cache_hit_rate' in stats
        assert 'average_load_time' in stats
        
        assert stats['total_models'] >= 0
        assert stats['loaded_models'] >= 0
        assert stats['memory_usage_mb'] >= 0


class TestResourceMonitor:
    """Test ResourceMonitor class"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return PerformanceConfig(
            metrics_collection_interval=1,
            performance_history_size=100
        )
    
    @pytest.fixture
    def resource_monitor(self, config):
        """Create ResourceMonitor instance for testing"""
        monitor = ResourceMonitor(config)
        # Give it a moment to start monitoring
        time.sleep(0.1)
        return monitor
    
    def test_resource_monitor_initialization(self, resource_monitor):
        """Test resource monitor initialization"""
        assert resource_monitor.config is not None
        assert resource_monitor.logger is not None
        assert isinstance(resource_monitor.metrics_history, deque)
        assert isinstance(resource_monitor.current_metrics, ResourceMetrics)
        assert resource_monitor.monitoring_active is True
    
    def test_get_current_metrics(self, resource_monitor):
        """Test getting current metrics"""
        metrics = resource_monitor.get_current_metrics()
        
        assert isinstance(metrics, ResourceMetrics)
        assert 0 <= metrics.cpu_percent <= 100
        assert 0 <= metrics.memory_percent <= 100
        assert 0 <= metrics.gpu_percent <= 100
        assert metrics.memory_available >= 0
        assert metrics.gpu_memory_used >= 0
        assert metrics.gpu_memory_free >= 0
    
    def test_resource_availability_check(self, resource_monitor):
        """Test resource availability checking"""
        # Test CPU availability
        cpu_available = resource_monitor.is_resource_available(ResourceType.CPU, 0.8)
        assert isinstance(cpu_available, bool)
        
        # Test memory availability
        memory_available = resource_monitor.is_resource_available(ResourceType.MEMORY, 0.8)
        assert isinstance(memory_available, bool)
        
        # Test GPU availability
        gpu_available = resource_monitor.is_resource_available(ResourceType.GPU, 0.8)
        assert isinstance(gpu_available, bool)
    
    def test_metrics_history(self, resource_monitor):
        """Test metrics history functionality"""
        # Wait for some metrics to be collected
        time.sleep(2)
        
        history = resource_monitor.get_metrics_history(1)  # Last 1 minute
        assert isinstance(history, list)
        assert len(history) >= 0
        
        if history:
            for metric in history:
                assert isinstance(metric, ResourceMetrics)
    
    def test_resource_stats(self, resource_monitor):
        """Test resource statistics"""
        # Wait for some metrics to be collected
        time.sleep(1)
        
        stats = resource_monitor.get_resource_stats()
        
        if stats:  # Only test if we have stats
            assert isinstance(stats, dict)
            assert 'current' in stats
            assert 'averages' in stats
            assert 'peaks' in stats
            
            current = stats['current']
            assert 'cpu_percent' in current
            assert 'memory_percent' in current
            assert 'gpu_percent' in current


class TestBatchProcessor:
    """Test BatchProcessor class"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return PerformanceConfig(
            max_batch_size=4,
            batch_timeout=10
        )
    
    @pytest.fixture
    def batch_processor(self, config):
        """Create BatchProcessor instance for testing"""
        return BatchProcessor(config)
    
    def test_batch_processor_initialization(self, batch_processor):
        """Test batch processor initialization"""
        assert batch_processor.config is not None
        assert batch_processor.logger is not None
        assert isinstance(batch_processor.job_queue, deque)
        assert isinstance(batch_processor.active_jobs, dict)
        assert isinstance(batch_processor.completed_jobs, dict)
        assert batch_processor.processing_active is True
    
    def test_submit_batch_job(self, batch_processor):
        """Test batch job submission"""
        items = [{'id': i, 'data': f'test_{i}'} for i in range(5)]
        job_id = batch_processor.submit_batch_job("image_generation", items, priority=7)
        
        assert isinstance(job_id, str)
        assert job_id.startswith("batch_")
        assert len(batch_processor.job_queue) == 1
        
        # Check job in queue
        job = batch_processor.job_queue[0]
        assert job.job_id == job_id
        assert job.workflow_type == "image_generation"
        assert len(job.items) == 5
        assert job.priority == 7
    
    def test_job_priority_ordering(self, batch_processor):
        """Test job priority ordering in queue"""
        # Submit jobs with different priorities
        job_id_low = batch_processor.submit_batch_job("type_a", [{'id': 1}], priority=3)
        job_id_high = batch_processor.submit_batch_job("type_b", [{'id': 2}], priority=8)
        job_id_medium = batch_processor.submit_batch_job("type_c", [{'id': 3}], priority=5)
        
        # Check queue ordering (highest priority first)
        assert len(batch_processor.job_queue) == 3
        assert batch_processor.job_queue[0].job_id == job_id_high  # Priority 8
        assert batch_processor.job_queue[1].job_id == job_id_medium  # Priority 5
        assert batch_processor.job_queue[2].job_id == job_id_low  # Priority 3
    
    def test_get_job_status_nonexistent(self, batch_processor):
        """Test getting status of non-existent job"""
        status = batch_processor.get_job_status("nonexistent_job")
        assert status is None
    
    def test_batch_stats(self, batch_processor):
        """Test batch processing statistics"""
        stats = batch_processor.get_batch_stats()
        
        assert isinstance(stats, dict)
        assert 'queued_jobs' in stats
        assert 'active_jobs' in stats
        assert 'completed_jobs' in stats
        assert 'total_processed_items' in stats
        assert 'average_processing_time' in stats
        
        assert stats['queued_jobs'] >= 0
        assert stats['active_jobs'] >= 0
        assert stats['completed_jobs'] >= 0
        assert stats['total_processed_items'] >= 0
        assert stats['average_processing_time'] >= 0.0


class TestAdvancedPerformanceOptimizer:
    """Test AdvancedPerformanceOptimizer class"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return PerformanceConfig(
            max_models_in_memory=2,
            max_batch_size=4,
            enable_profiling=True,
            default_strategy=OptimizationStrategy.BALANCED
        )
    
    @pytest.fixture
    def optimizer(self, config):
        """Create optimizer instance for testing"""
        return AdvancedPerformanceOptimizer(config)
    
    def test_optimizer_initialization(self, optimizer):
        """Test optimizer initialization"""
        assert optimizer.config is not None
        assert optimizer.logger is not None
        assert optimizer.model_manager is not None
        assert optimizer.resource_monitor is not None
        assert optimizer.batch_processor is not None
        assert isinstance(optimizer.workflow_profiles, dict)
        assert optimizer.current_strategy == OptimizationStrategy.BALANCED
        assert optimizer.optimization_active is True
    
    @pytest.mark.asyncio
    async def test_optimize_workflow_execution(self, optimizer):
        """Test workflow execution optimization"""
        parameters = {
            'quality_level': 3,
            'steps': 20,
            'resolution': (1024, 1024)
        }
        
        result = await optimizer.optimize_workflow_execution(
            workflow_id="test_workflow_001",
            workflow_type="image_generation",
            parameters=parameters
        )
        
        assert isinstance(result, dict)
        assert result['success'] is True
        assert 'result' in result
        assert 'execution_time' in result
        assert 'optimizations_applied' in result
        assert 'resource_usage' in result
        assert result['execution_time'] > 0
    
    @pytest.mark.asyncio
    async def test_workflow_profiling(self, optimizer):
        """Test workflow performance profiling"""
        # Execute workflow multiple times
        for i in range(3):
            await optimizer.optimize_workflow_execution(
                workflow_id="profile_test",
                workflow_type="image_generation",
                parameters={'quality_level': 3}
            )
        
        # Check profile was created and updated
        assert "profile_test" in optimizer.workflow_profiles
        profile = optimizer.workflow_profiles["profile_test"]
        
        assert profile.execution_count == 3
        assert profile.total_time > 0
        assert profile.average_time > 0
        assert profile.last_execution > 0
    
    def test_optimization_strategy_setting(self, optimizer):
        """Test setting optimization strategy"""
        # Test all strategies
        for strategy in OptimizationStrategy:
            optimizer.set_optimization_strategy(strategy)
            assert optimizer.current_strategy == strategy
    
    @pytest.mark.asyncio
    async def test_parameter_optimization_strategies(self, optimizer):
        """Test different parameter optimization strategies"""
        base_params = {
            'quality_level': 3,
            'steps': 20,
            'resolution': (1024, 1024),
            'batch_size': 4
        }
        
        results = {}
        
        # Test each strategy
        for strategy in OptimizationStrategy:
            optimizer.set_optimization_strategy(strategy)
            result = await optimizer.optimize_workflow_execution(
                workflow_id=f"test_{strategy.value}",
                workflow_type="image_generation",
                parameters=base_params.copy()
            )
            results[strategy.value] = result
        
        # Verify all strategies produced results
        for strategy_name, result in results.items():
            assert result['success'] is True
            assert len(result['optimizations_applied']) > 0
    
    @pytest.mark.asyncio
    async def test_batch_processing_optimization(self, optimizer):
        """Test batch processing optimization"""
        items = [{'item_id': i, 'data': f'test_data_{i}'} for i in range(6)]
        
        job_id = await optimizer.optimize_batch_processing(
            workflow_type="image_generation",
            items=items,
            priority=7
        )
        
        assert isinstance(job_id, str)
        assert job_id.startswith("batch_")
        
        # Check job was submitted to batch processor
        status = optimizer.batch_processor.get_job_status(job_id)
        assert status is not None
        assert status['workflow_type'] == "image_generation"
        assert status['total_items'] == 6
    
    def test_optimization_statistics(self, optimizer):
        """Test optimization statistics"""
        stats = optimizer.get_optimization_stats()
        
        assert isinstance(stats, dict)
        assert 'model_management' in stats
        assert 'resource_monitoring' in stats
        assert 'batch_processing' in stats
        assert 'workflow_profiles' in stats
        assert 'current_strategy' in stats
        assert 'total_executions' in stats
        
        assert isinstance(stats['model_management'], dict)
        assert isinstance(stats['workflow_profiles'], dict)
        assert stats['current_strategy'] in [s.value for s in OptimizationStrategy]
        assert stats['total_executions'] >= 0
    
    def test_performance_report_export(self, optimizer):
        """Test performance report export"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = Path(f.name)
        
        try:
            success = optimizer.export_performance_report(temp_path)
            
            assert success is True
            assert temp_path.exists()
            
            # Verify exported content
            with open(temp_path, 'r') as f:
                report_data = json.load(f)
            
            assert 'export_info' in report_data
            assert 'optimization_stats' in report_data
            assert 'recent_executions' in report_data
            assert 'workflow_profiles' in report_data
            
            export_info = report_data['export_info']
            assert 'timestamp' in export_info
            assert 'optimizer_config' in export_info
            
        finally:
            if temp_path.exists():
                temp_path.unlink()


class TestFactoryFunction:
    """Test factory function"""
    
    def test_create_advanced_performance_optimizer_default(self):
        """Test factory function with default config"""
        optimizer = create_advanced_performance_optimizer()
        
        assert isinstance(optimizer, AdvancedPerformanceOptimizer)
        assert optimizer.config is not None
        assert isinstance(optimizer.config, PerformanceConfig)
    
    def test_create_advanced_performance_optimizer_custom_config(self):
        """Test factory function with custom config"""
        config = PerformanceConfig(
            max_models_in_memory=5,
            max_batch_size=16,
            default_strategy=OptimizationStrategy.SPEED_FIRST
        )
        optimizer = create_advanced_performance_optimizer(config)
        
        assert isinstance(optimizer, AdvancedPerformanceOptimizer)
        assert optimizer.config.max_models_in_memory == 5
        assert optimizer.config.max_batch_size == 16
        assert optimizer.config.default_strategy == OptimizationStrategy.SPEED_FIRST


class TestIntegrationScenarios:
    """Test realistic integration scenarios"""
    
    @pytest.mark.asyncio
    async def test_high_load_optimization_scenario(self):
        """Test optimization under high system load"""
        config = PerformanceConfig(
            max_models_in_memory=2,
            memory_threshold_percent=70.0,
            default_strategy=OptimizationStrategy.ADAPTIVE
        )
        optimizer = create_advanced_performance_optimizer(config)
        
        # Simulate high-load scenario
        parameters = {
            'quality_level': 5,
            'steps': 50,
            'resolution': (2048, 2048),
            'batch_size': 8
        }
        
        result = await optimizer.optimize_workflow_execution(
            workflow_id="high_load_test",
            workflow_type="image_generation",
            parameters=parameters
        )
        
        assert result['success'] is True
        assert len(result['optimizations_applied']) > 0
        
        # Check that optimizations were applied to reduce load
        optimized_params = result['result']['parameters']
        assert '_optimizations' in optimized_params
    
    @pytest.mark.asyncio
    async def test_batch_processing_workflow(self):
        """Test complete batch processing workflow"""
        config = PerformanceConfig(
            max_batch_size=3,
            enable_batch_optimization=True
        )
        optimizer = create_advanced_performance_optimizer(config)
        
        # Create batch items
        items = [
            {'prompt': f'Generate image {i}', 'quality': 3}
            for i in range(8)
        ]
        
        # Submit batch job
        job_id = await optimizer.optimize_batch_processing(
            workflow_type="image_generation",
            items=items,
            priority=8
        )
        
        # Wait for processing to start
        await asyncio.sleep(1)
        
        # Check job status
        status = optimizer.batch_processor.get_job_status(job_id)
        assert status is not None
        assert status['total_items'] == 8
        assert status['status'] in ['pending', 'processing', 'completed']
    
    @pytest.mark.asyncio
    async def test_model_sharing_scenario(self):
        """Test model sharing between workflows"""
        config = PerformanceConfig(
            max_models_in_memory=2,
            enable_model_sharing=True
        )
        optimizer = create_advanced_performance_optimizer(config)
        
        # Load same model for multiple workflows
        model1 = await optimizer.model_manager.load_model("shared_model", "diffusion", 1024)
        model2 = await optimizer.model_manager.load_model("shared_model", "diffusion", 1024)
        
        # Verify model sharing
        assert model1 == model2
        assert optimizer.model_manager.models["shared_model"].usage_count == 2
        
        # Check model stats
        stats = optimizer.model_manager.get_model_stats()
        assert stats['cache_hit_rate'] > 0.0
    
    @pytest.mark.asyncio
    async def test_adaptive_optimization_scenario(self):
        """Test adaptive optimization based on system state"""
        config = PerformanceConfig(
            default_strategy=OptimizationStrategy.ADAPTIVE,
            adaptive_threshold=0.7
        )
        optimizer = create_advanced_performance_optimizer(config)
        
        # Execute multiple workflows to build history
        base_params = {'quality_level': 3, 'steps': 20}
        
        for i in range(5):
            result = await optimizer.optimize_workflow_execution(
                workflow_id="adaptive_test",
                workflow_type="image_generation",
                parameters=base_params.copy()
            )
            assert result['success'] is True
        
        # Check that profile was built
        profile = optimizer.workflow_profiles["adaptive_test"]
        assert profile.execution_count == 5
        assert profile.average_time > 0
        
        # Test that adaptive strategy uses historical data
        result = await optimizer.optimize_workflow_execution(
            workflow_id="adaptive_test",
            workflow_type="image_generation",
            parameters=base_params.copy()
        )
        
        assert result['success'] is True
        assert 'adaptive' in result['optimizations_applied']


if __name__ == "__main__":
    pytest.main([__file__, "-v"])