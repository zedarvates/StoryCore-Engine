"""
Test GPU Memory Monitoring and Optimization Features

Tests the enhanced GPU memory monitoring, trend analysis, alerting,
and automatic optimization features added to the ModelManager.
"""

import asyncio
import pytest
import time
from unittest.mock import Mock, patch
from src.model_manager import ModelManager, GPUMemoryManager
from src.ai_enhancement_engine import ModelConfig, ModelType


class TestGPUMemoryMonitoring:
    """Test GPU memory monitoring and optimization features."""
    
    @pytest.fixture
    def gpu_manager(self):
        """Create GPU memory manager for testing."""
        return GPUMemoryManager()
    
    @pytest.fixture
    def model_config(self):
        """Create model configuration for testing."""
        return ModelConfig(
            model_registry_path="test_models",
            model_cache_size=5,
            cpu_fallback_enabled=True,
            model_download_enabled=True,
            gpu_memory_threshold=0.8
        )
    
    @pytest.fixture
    async def model_manager(self, model_config):
        """Create model manager for testing."""
        manager = ModelManager(model_config)
        yield manager
        await manager.shutdown()
    
    def test_gpu_status_monitoring(self, gpu_manager):
        """Test GPU status monitoring and history recording."""
        # Enable monitoring
        gpu_manager.enable_monitoring()
        
        # Get initial status
        status1 = gpu_manager.get_gpu_status()
        assert status1.total_memory > 0
        assert len(gpu_manager.memory_history) == 1
        
        # Simulate memory allocation
        gpu_manager.allocate_memory("test_model", 1000)
        
        # Get status after allocation
        status2 = gpu_manager.get_gpu_status()
        assert status2.utilization_percent > status1.utilization_percent
        assert len(gpu_manager.memory_history) == 2
        
        # Check history contains correct data
        latest_history = gpu_manager.memory_history[-1]
        assert latest_history["utilization_percent"] == status2.utilization_percent
        assert latest_history["temperature"] == status2.temperature
    
    def test_alert_generation(self, gpu_manager):
        """Test alert generation for high memory usage and temperature."""
        # Set low thresholds for testing
        gpu_manager.set_alert_thresholds(
            memory_usage=50.0,
            temperature=70.0
        )
        
        # Allocate memory to trigger alert
        gpu_manager.allocate_memory("high_usage_model", 4500)  # ~55% of 8GB
        
        # Get status to trigger alert check
        status = gpu_manager.get_gpu_status()
        
        # Check alerts were generated
        alerts = gpu_manager.get_active_alerts()
        assert len(alerts) > 0
        
        # Check for memory usage alert
        memory_alerts = [a for a in alerts if a["type"] == "high_memory_usage"]
        assert len(memory_alerts) > 0
        assert memory_alerts[0]["severity"] == "warning"
    
    def test_memory_trends_analysis(self, gpu_manager):
        """Test memory usage trend analysis."""
        # Generate some history data
        for i in range(10):
            gpu_manager.allocate_memory(f"model_{i}", 200 + i * 100)
            gpu_manager.get_gpu_status()  # Trigger history recording
            time.sleep(0.01)  # Small delay to create time differences
        
        # Get trends
        trends = gpu_manager.get_memory_trends(duration_minutes=1)
        
        assert "utilization" in trends
        assert "temperature" in trends
        assert trends["data_points"] > 0
        assert "trend" in trends["utilization"]
        assert trends["utilization"]["trend"] in ["increasing", "decreasing", "stable"]
    
    def test_memory_prediction(self, gpu_manager):
        """Test memory exhaustion prediction."""
        # Create increasing memory usage pattern
        for i in range(5):
            gpu_manager.allocate_memory(f"growing_model_{i}", 500 + i * 300)
            gpu_manager.get_gpu_status()
            time.sleep(0.01)
        
        # Get prediction
        prediction = gpu_manager.predict_memory_exhaustion()
        
        if prediction.get("prediction") == "increasing":
            assert "minutes_to_95_percent" in prediction
            assert "rate_per_minute" in prediction
            assert prediction["rate_per_minute"] > 0
        else:
            # If not increasing, should be stable
            assert prediction["prediction"] in ["stable", "decreasing"]
    
    def test_force_memory_cleanup(self, gpu_manager):
        """Test forced memory cleanup and optimization."""
        # Allocate some memory
        gpu_manager.allocate_memory("cleanup_test_1", 1000)
        gpu_manager.allocate_memory("cleanup_test_2", 1500)
        
        status_before = gpu_manager.get_gpu_status()
        
        # Force cleanup
        cleanup_result = gpu_manager.force_memory_cleanup()
        
        assert cleanup_result["success"] is True
        assert "actions_taken" in cleanup_result
        
        status_after = gpu_manager.get_gpu_status()
        
        # Memory usage should be optimized (reduced)
        assert status_after.utilization_percent <= status_before.utilization_percent
    
    def test_optimization_history_tracking(self, gpu_manager):
        """Test optimization history tracking."""
        # Perform some optimizations
        gpu_manager.allocate_memory("opt_test", 2000)
        
        # Force cleanup to create history
        cleanup_result = gpu_manager.force_memory_cleanup()
        assert cleanup_result["success"] is True
        
        # Check optimization history
        history = gpu_manager.get_optimization_history()
        assert len(history) > 0
        
        latest_optimization = history[-1]
        assert "timestamp" in latest_optimization
        assert "utilization_before" in latest_optimization
        assert "utilization_after" in latest_optimization
        assert "actions_taken" in latest_optimization
    
    @pytest.mark.asyncio
    async def test_model_manager_gpu_monitoring_integration(self, model_manager):
        """Test ModelManager integration with GPU monitoring."""
        # Get monitoring report
        report = model_manager.get_gpu_monitoring_report()
        
        assert "gpu_status" in report
        assert "memory_trends" in report
        assert "active_alerts" in report
        assert "monitoring_enabled" in report
        
        # Test configuration
        config_result = model_manager.configure_gpu_monitoring(
            monitoring_enabled=True,
            alert_thresholds={"memory_usage": 75.0}
        )
        
        assert config_result["success"] is True
        assert config_result["configuration_updated"]["monitoring_enabled"] is True
    
    @pytest.mark.asyncio
    async def test_memory_pressure_handling(self, model_manager):
        """Test memory pressure handling at different levels."""
        # Test low pressure
        result_low = await model_manager.handle_memory_pressure("low")
        assert result_low["pressure_level"] == "low"
        
        # Test medium pressure
        result_medium = await model_manager.handle_memory_pressure("medium")
        assert result_medium["pressure_level"] == "medium"
        
        # Test high pressure
        result_high = await model_manager.handle_memory_pressure("high")
        assert result_high["pressure_level"] == "high"
        assert "actions_taken" in result_high
        
        # Test critical pressure
        result_critical = await model_manager.handle_memory_pressure("critical")
        assert result_critical["pressure_level"] == "critical"
        assert len(result_critical["actions_taken"]) > 0
    
    @pytest.mark.asyncio
    async def test_enhanced_gpu_optimization(self, model_manager):
        """Test enhanced GPU memory optimization with trends and predictions."""
        # Load some models to create memory usage
        await model_manager.load_model("style_transfer_v1")
        await model_manager.load_model("super_resolution_v2")
        
        # Perform optimization
        optimization_result = await model_manager.optimize_gpu_memory()
        
        assert "gpu_optimization" in optimization_result
        assert "memory_trends" in optimization_result
        assert "memory_prediction" in optimization_result
        assert "active_alerts" in optimization_result
        assert "actions_taken" in optimization_result
        assert "final_gpu_status" in optimization_result
    
    def test_alert_management(self, gpu_manager):
        """Test alert management functionality."""
        # Set thresholds and trigger alerts
        gpu_manager.set_alert_thresholds(memory_usage=30.0)
        gpu_manager.allocate_memory("alert_test", 3000)
        gpu_manager.get_gpu_status()  # Trigger alert check
        
        # Check alerts exist
        alerts = gpu_manager.get_active_alerts()
        assert len(alerts) > 0
        
        # Clear alerts
        gpu_manager.clear_alerts()
        alerts_after_clear = gpu_manager.get_active_alerts()
        assert len(alerts_after_clear) == 0
    
    def test_monitoring_enable_disable(self, gpu_manager):
        """Test enabling and disabling monitoring."""
        # Disable monitoring
        gpu_manager.disable_monitoring()
        assert gpu_manager.monitoring_enabled is False
        
        # Get status (should not record history when disabled)
        initial_history_length = len(gpu_manager.memory_history)
        gpu_manager.get_gpu_status()
        assert len(gpu_manager.memory_history) == initial_history_length
        
        # Enable monitoring
        gpu_manager.enable_monitoring()
        assert gpu_manager.monitoring_enabled is True
        
        # Get status (should record history when enabled)
        gpu_manager.get_gpu_status()
        assert len(gpu_manager.memory_history) > initial_history_length
    
    def test_performance_metrics_with_monitoring(self, model_manager):
        """Test performance metrics include monitoring data."""
        metrics = model_manager.get_performance_metrics()
        
        # Check GPU metrics include monitoring data
        gpu_metrics = metrics["gpu_metrics"]
        assert "active_alerts" in gpu_metrics
        assert "memory_trend" in gpu_metrics
        assert "monitoring_enabled" in gpu_metrics
        
        # Check alerts section
        assert "alerts" in metrics
        assert "active_count" in metrics["alerts"]
        assert "critical_alerts" in metrics["alerts"]
        assert "warning_alerts" in metrics["alerts"]


def run_gpu_monitoring_tests():
    """Run all GPU memory monitoring tests."""
    print("Running GPU Memory Monitoring Tests...")
    
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])


if __name__ == "__main__":
    run_gpu_monitoring_tests()