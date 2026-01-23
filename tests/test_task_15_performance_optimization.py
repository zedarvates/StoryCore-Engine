"""
Test Task 15: Performance Optimization and Production Readiness

This test validates the performance optimization and production deployment
configuration modules.

Author: StoryCore-Engine Team
Date: 2026-01-14
"""

import pytest
import time
import tempfile
import shutil
from pathlib import Path

from src.performance_optimizer import (
    PerformanceOptimizer,
    OptimizationConfig,
    OptimizationStrategy,
    PerformanceMetrics,
    PerformanceLevel,
    AutomaticPerformanceMonitor
)

from src.production_config import (
    ProductionConfigManager,
    ProductionConfig,
    DeploymentEnvironment,
    ModelDeploymentManager,
    ModelDeploymentConfig,
    ProductionMonitor,
    MonitoringConfig,
    AlertSeverity
)


class TestPerformanceOptimizer:
    """Test performance optimization functionality"""
    
    def test_optimizer_initialization(self):
        """Test optimizer initialization with different strategies"""
        # Test default initialization
        optimizer = PerformanceOptimizer()
        assert optimizer.config.strategy == OptimizationStrategy.BALANCED
        assert optimizer.current_batch_size == optimizer.config.min_batch_size
        assert optimizer.current_quality_level == 1.0
        
        # Test custom configuration
        config = OptimizationConfig(
            strategy=OptimizationStrategy.SPEED,
            target_fps=60.0,
            max_batch_size=32
        )
        optimizer = PerformanceOptimizer(config)
        assert optimizer.config.strategy == OptimizationStrategy.SPEED
        assert optimizer.config.target_fps == 60.0
        assert optimizer.config.max_batch_size == 32
    
    def test_batch_size_optimization(self):
        """Test batch size optimization"""
        optimizer = PerformanceOptimizer()
        
        # Test with different strategies
        strategies = [
            OptimizationStrategy.SPEED,
            OptimizationStrategy.QUALITY,
            OptimizationStrategy.BALANCED,
            OptimizationStrategy.ADAPTIVE
        ]
        
        for strategy in strategies:
            optimizer.config.strategy = strategy
            batch_size = optimizer.optimize_batch_size(100, complexity=0.5)
            
            assert batch_size >= optimizer.config.min_batch_size
            assert batch_size <= optimizer.config.max_batch_size
            assert batch_size <= 100
    
    def test_quality_level_adjustment(self):
        """Test dynamic quality level adjustment"""
        optimizer = PerformanceOptimizer()
        
        # Test quality adjustment based on performance
        # Poor performance should reduce quality
        quality = optimizer.adjust_quality_level(
            current_performance=10.0,
            target_performance=30.0
        )
        assert 0.0 <= quality <= 1.0
        
        # Good performance should increase quality
        quality = optimizer.adjust_quality_level(
            current_performance=40.0,
            target_performance=30.0
        )
        assert 0.0 <= quality <= 1.0
    
    def test_metrics_recording(self):
        """Test performance metrics recording"""
        optimizer = PerformanceOptimizer()
        
        # Record some metrics
        for i in range(10):
            metrics = PerformanceMetrics(
                processing_time=0.1 + i * 0.01,
                throughput=25.0 + i,
                gpu_utilization=0.7 + i * 0.01,
                memory_usage=1000.0 + i * 100,
                batch_size=4,
                quality_score=0.85 + i * 0.01
            )
            optimizer.record_metrics(metrics)
        
        assert len(optimizer.metrics_history) == 10
    
    def test_performance_level_assessment(self):
        """Test performance level assessment"""
        optimizer = PerformanceOptimizer()
        
        # Record excellent performance
        for _ in range(10):
            metrics = PerformanceMetrics(
                processing_time=0.03,
                throughput=30.0,  # Meets target
                gpu_utilization=0.8,
                memory_usage=2000.0,
                batch_size=8,
                quality_score=0.9
            )
            optimizer.record_metrics(metrics)
        
        level = optimizer.get_performance_level()
        assert level in [PerformanceLevel.EXCELLENT, PerformanceLevel.GOOD]
    
    def test_optimization_recommendations(self):
        """Test optimization recommendations generation"""
        optimizer = PerformanceOptimizer()
        
        # Record metrics with issues
        for _ in range(20):
            metrics = PerformanceMetrics(
                processing_time=0.5,
                throughput=10.0,  # Below target
                gpu_utilization=0.3,  # Underutilized
                memory_usage=4000.0,  # High memory
                batch_size=2,
                quality_score=0.6  # Below threshold
            )
            optimizer.record_metrics(metrics)
        
        recommendations = optimizer.get_optimization_recommendations()
        assert len(recommendations) > 0
        assert isinstance(recommendations[0], str)
    
    def test_statistics_collection(self):
        """Test statistics collection"""
        optimizer = PerformanceOptimizer()
        
        # Record some metrics
        for i in range(20):
            metrics = PerformanceMetrics(
                processing_time=0.1 + i * 0.01,
                throughput=25.0 + i * 0.5,
                gpu_utilization=0.7 + i * 0.01,
                memory_usage=1000.0 + i * 50,
                batch_size=4,
                quality_score=0.85
            )
            optimizer.record_metrics(metrics)
        
        stats = optimizer.get_statistics()
        assert stats["status"] == "ok"
        assert "performance_level" in stats
        assert "metrics" in stats
        assert "recommendations" in stats
        assert stats["total_samples"] == 20
    
    def test_batch_creation(self):
        """Test optimized batch creation"""
        optimizer = PerformanceOptimizer()
        
        # Create batches from items
        items = list(range(100))
        batches = optimizer.create_batches(items)
        
        assert len(batches) > 0
        
        # Verify all items are included
        total_items = sum(len(batch) for batch in batches)
        assert total_items == len(items)
    
    def test_optimizer_reset(self):
        """Test optimizer reset"""
        optimizer = PerformanceOptimizer()
        
        # Record some metrics
        for _ in range(10):
            metrics = PerformanceMetrics(
                processing_time=0.1,
                throughput=25.0,
                gpu_utilization=0.7,
                memory_usage=1000.0,
                batch_size=4,
                quality_score=0.85
            )
            optimizer.record_metrics(metrics)
        
        # Reset
        optimizer.reset()
        
        assert len(optimizer.metrics_history) == 0
        assert optimizer.current_batch_size == optimizer.config.min_batch_size
        assert optimizer.current_quality_level == 1.0


class TestAutomaticPerformanceMonitor:
    """Test automatic performance monitoring"""
    
    def test_monitor_initialization(self):
        """Test monitor initialization"""
        optimizer = PerformanceOptimizer()
        monitor = AutomaticPerformanceMonitor(optimizer, check_interval=1.0)
        
        assert monitor.optimizer == optimizer
        assert monitor.check_interval == 1.0
        assert not monitor.running
    
    def test_monitor_start_stop(self):
        """Test monitor start and stop"""
        optimizer = PerformanceOptimizer()
        monitor = AutomaticPerformanceMonitor(optimizer, check_interval=0.5)
        
        # Start monitor
        monitor.start()
        assert monitor.running
        assert monitor.thread is not None
        
        # Let it run briefly
        time.sleep(1.0)
        
        # Stop monitor
        monitor.stop()
        assert not monitor.running


class TestProductionConfigManager:
    """Test production configuration management"""
    
    def test_config_manager_initialization(self):
        """Test config manager initialization"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ProductionConfigManager(tmpdir)
            assert manager.config_dir.exists()
    
    def test_load_default_config(self):
        """Test loading default configuration"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ProductionConfigManager(tmpdir)
            config = manager.load_config(DeploymentEnvironment.DEVELOPMENT)
            
            assert config.environment == DeploymentEnvironment.DEVELOPMENT
            assert config.config_version == "1.0"
            assert isinstance(config.monitoring, MonitoringConfig)
    
    def test_save_and_load_config(self):
        """Test saving and loading configuration"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ProductionConfigManager(tmpdir)
            
            # Create and save config
            config = ProductionConfig(
                environment=DeploymentEnvironment.STAGING,
                max_concurrent_jobs=8,
                enable_gpu=True
            )
            manager.current_config = config
            manager.save_config()
            
            # Load config
            loaded_config = manager.load_config()
            assert loaded_config.environment == DeploymentEnvironment.STAGING
            assert loaded_config.max_concurrent_jobs == 8
            assert loaded_config.enable_gpu is True
    
    def test_update_config(self):
        """Test configuration updates"""
        with tempfile.TemporaryDirectory() as tmpdir:
            manager = ProductionConfigManager(tmpdir)
            manager.load_config()
            
            # Update config
            updated_config = manager.update_config({
                "max_concurrent_jobs": 16,
                "job_timeout_seconds": 600.0
            })
            
            assert updated_config.max_concurrent_jobs == 16
            assert updated_config.job_timeout_seconds == 600.0


class TestModelDeploymentManager:
    """Test model deployment management"""
    
    def test_deployment_manager_initialization(self):
        """Test deployment manager initialization"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = ProductionConfig(
                environment=DeploymentEnvironment.PRODUCTION,
                model_registry_path=str(Path(tmpdir) / "registry.json")
            )
            manager = ModelDeploymentManager(config)
            assert len(manager.deployed_models) == 0
    
    def test_deploy_model(self):
        """Test model deployment"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = ProductionConfig(
                environment=DeploymentEnvironment.PRODUCTION,
                model_registry_path=str(Path(tmpdir) / "registry.json")
            )
            manager = ModelDeploymentManager(config)
            
            # Deploy a model
            deployment = manager.deploy_model(
                model_name="style_transfer",
                model_version="1.0.0",
                model_path="/models/style_transfer_v1.pth",
                checksum="abc123",
                metadata={"size_mb": 150}
            )
            
            assert deployment.model_name == "style_transfer"
            assert deployment.model_version == "1.0.0"
            assert deployment.enabled is True
            assert len(manager.deployed_models) == 1
    
    def test_update_model(self):
        """Test model update"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = ProductionConfig(
                environment=DeploymentEnvironment.PRODUCTION,
                model_registry_path=str(Path(tmpdir) / "registry.json")
            )
            manager = ModelDeploymentManager(config)
            
            # Deploy and update model
            manager.deploy_model(
                model_name="super_resolution",
                model_version="2.0.0",
                model_path="/models/sr_v2.pth",
                checksum="def456"
            )
            
            updated = manager.update_model(
                model_name="super_resolution",
                model_version="2.0.0",
                updates={"enabled": False}
            )
            
            assert updated is not None
            assert updated.enabled is False
    
    def test_enable_disable_model(self):
        """Test enabling and disabling models"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = ProductionConfig(
                environment=DeploymentEnvironment.PRODUCTION,
                model_registry_path=str(Path(tmpdir) / "registry.json")
            )
            manager = ModelDeploymentManager(config)
            
            # Deploy model
            manager.deploy_model(
                model_name="interpolation",
                model_version="1.5.0",
                model_path="/models/interp_v1.5.pth",
                checksum="ghi789"
            )
            
            # Disable model
            success = manager.disable_model("interpolation", "1.5.0")
            assert success is True
            
            model = manager.get_model("interpolation", "1.5.0")
            assert model.enabled is False
            
            # Enable model
            success = manager.enable_model("interpolation", "1.5.0")
            assert success is True
            
            model = manager.get_model("interpolation", "1.5.0")
            assert model.enabled is True
    
    def test_get_deployed_models(self):
        """Test getting deployed models"""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = ProductionConfig(
                environment=DeploymentEnvironment.PRODUCTION,
                model_registry_path=str(Path(tmpdir) / "registry.json")
            )
            manager = ModelDeploymentManager(config)
            
            # Deploy multiple models
            manager.deploy_model("model1", "1.0", "/path1", "check1")
            manager.deploy_model("model2", "1.0", "/path2", "check2")
            manager.deploy_model("model3", "1.0", "/path3", "check3")
            
            # Disable one model
            manager.disable_model("model2", "1.0")
            
            # Get all models
            all_models = manager.get_deployed_models()
            assert len(all_models) == 3
            
            # Get enabled models only
            enabled_models = manager.get_deployed_models(enabled_only=True)
            assert len(enabled_models) == 2


class TestProductionMonitor:
    """Test production monitoring"""
    
    def test_monitor_initialization(self):
        """Test monitor initialization"""
        config = MonitoringConfig()
        monitor = ProductionMonitor(config)
        assert monitor.config == config
        assert len(monitor.metrics) == 0
    
    def test_record_metric(self):
        """Test metric recording"""
        config = MonitoringConfig(enable_metrics=True)
        monitor = ProductionMonitor(config)
        
        # Record metrics
        monitor.record_metric("latency", 2.5)
        monitor.record_metric("latency", 3.0)
        monitor.record_metric("error_rate", 0.02)
        
        assert "latency" in monitor.metrics
        assert "error_rate" in monitor.metrics
        assert len(monitor.metrics["latency"]) == 2
    
    def test_metrics_summary(self):
        """Test metrics summary generation"""
        config = MonitoringConfig(enable_metrics=True)
        monitor = ProductionMonitor(config)
        
        # Record multiple metrics
        for i in range(20):
            monitor.record_metric("throughput", 25.0 + i * 0.5)
            monitor.record_metric("memory", 1000.0 + i * 50)
        
        summary = monitor.get_metrics_summary()
        
        assert "throughput" in summary
        assert "memory" in summary
        assert "mean" in summary["throughput"]
        assert "median" in summary["throughput"]
        assert "min" in summary["throughput"]
        assert "max" in summary["throughput"]
    
    def test_alert_generation(self):
        """Test alert generation on threshold violation"""
        config = MonitoringConfig(
            enable_alerts=True,
            alert_thresholds={"error_rate": 0.05}
        )
        monitor = ProductionMonitor(config)
        
        # Record metric below threshold (no alert)
        monitor.record_metric("error_rate", 0.03)
        
        # Record metric above threshold (should generate alert)
        monitor.record_metric("error_rate", 0.08)
        
        # Alert should be recorded in last_alert_time
        assert "error_rate" in monitor.last_alert_time


def test_integration_performance_and_production():
    """Test integration between performance optimizer and production config"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create production config
        config_manager = ProductionConfigManager(tmpdir)
        prod_config = config_manager.load_config(DeploymentEnvironment.PRODUCTION)
        
        # Create performance optimizer
        opt_config = OptimizationConfig(
            strategy=OptimizationStrategy.ADAPTIVE,
            target_fps=prod_config.max_concurrent_jobs * 5.0
        )
        optimizer = PerformanceOptimizer(opt_config)
        
        # Create production monitor
        monitor = ProductionMonitor(prod_config.monitoring)
        
        # Simulate processing with monitoring
        for i in range(10):
            # Optimize batch size
            batch_size = optimizer.optimize_batch_size(100, complexity=0.5)
            
            # Simulate processing
            processing_time = 0.1 + i * 0.01
            throughput = 1.0 / processing_time
            
            # Record performance metrics
            perf_metrics = PerformanceMetrics(
                processing_time=processing_time,
                throughput=throughput,
                gpu_utilization=0.75,
                memory_usage=2000.0,
                batch_size=batch_size,
                quality_score=0.85
            )
            optimizer.record_metrics(perf_metrics)
            
            # Record production metrics
            monitor.record_metric("latency", processing_time)
            monitor.record_metric("throughput", throughput)
        
        # Verify integration
        perf_stats = optimizer.get_statistics()
        assert perf_stats["status"] == "ok"
        
        prod_summary = monitor.get_metrics_summary()
        assert "latency" in prod_summary
        assert "throughput" in prod_summary


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
