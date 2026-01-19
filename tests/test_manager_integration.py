"""
Integration tests for ComfyUI Manager and Health Monitor.
"""

import pytest
from unittest.mock import patch, MagicMock
import tempfile
from pathlib import Path

from src.comfyui_config import ComfyUIConfig
from src.comfyui_manager import ComfyUIManager
from src.health_monitor import HealthMonitor


class TestManagerIntegration:
    """Integration tests for ComfyUI Manager components."""
    
    def test_manager_initialization(self):
        """Test that ComfyUI Manager initializes correctly."""
        # Create a temporary directory for testing
        with tempfile.TemporaryDirectory() as temp_dir:
            config = ComfyUIConfig.default()
            config.installation_path = Path(temp_dir)
            
            manager = ComfyUIManager(config)
            
            assert manager.config == config
            assert manager.process is None
            assert manager._service_status.is_running == False
            assert manager.health_monitor is None
    
    def test_health_monitor_integration(self):
        """Test that Health Monitor integrates correctly with Manager."""
        with tempfile.TemporaryDirectory() as temp_dir:
            config = ComfyUIConfig.default()
            config.installation_path = Path(temp_dir)
            
            manager = ComfyUIManager(config)
            health_monitor = HealthMonitor(config)
            
            # Integrate health monitor
            manager.set_health_monitor(health_monitor)
            
            assert manager.health_monitor == health_monitor
    
    def test_service_status_with_health_monitor(self):
        """Test service status reporting with health monitor."""
        with tempfile.TemporaryDirectory() as temp_dir:
            config = ComfyUIConfig.default()
            config.installation_path = Path(temp_dir)
            
            manager = ComfyUIManager(config)
            health_monitor = HealthMonitor(config)
            manager.set_health_monitor(health_monitor)
            
            # Get service status (synchronous - no real-time health check)
            status = manager.get_service_status()
            
            # Should have health monitor attached but no health status yet
            assert manager.health_monitor == health_monitor
            assert status.last_health_check is not None
            # Health status will be None until async check is performed
    
    @pytest.mark.asyncio
    async def test_async_service_status_with_health_monitor(self):
        """Test async service status reporting with health monitor."""
        with tempfile.TemporaryDirectory() as temp_dir:
            config = ComfyUIConfig.default()
            config.installation_path = Path(temp_dir)
            
            manager = ComfyUIManager(config)
            health_monitor = HealthMonitor(config)
            manager.set_health_monitor(health_monitor)
            
            # Mock health check
            with patch.object(health_monitor, 'check_health') as mock_check:
                from src.comfyui_models import HealthStatus, HealthState
                mock_health_status = HealthStatus(
                    is_healthy=True,
                    state=HealthState.HEALTHY,
                    response_time_ms=100.0,
                    consecutive_failures=0
                )
                mock_check.return_value = mock_health_status
                
                # Get service status asynchronously
                status = await manager.get_service_status_async()
                
                assert status.health_status == mock_health_status
                assert status.last_health_check is not None
    
    def test_manager_without_health_monitor(self):
        """Test that Manager works without health monitor."""
        with tempfile.TemporaryDirectory() as temp_dir:
            config = ComfyUIConfig.default()
            config.installation_path = Path(temp_dir)
            
            manager = ComfyUIManager(config)
            
            # Get service status without health monitor
            status = manager.get_service_status()
            
            assert status.health_status is None
            assert status.last_health_check is None
    
    def test_configuration_validation(self):
        """Test configuration validation in manager."""
        # Test with invalid configuration
        config = ComfyUIConfig.default()
        config.installation_path = Path("/nonexistent/path")
        config.server_port = -1  # Invalid port
        
        manager = ComfyUIManager(config)
        
        # Start service should fail with invalid config
        result = manager.start_service()
        
        assert result.success == False
        assert "Configuration validation failed" in result.error_message
    
    def test_performance_metrics_collection(self):
        """Test that performance metrics are collected."""
        with tempfile.TemporaryDirectory() as temp_dir:
            config = ComfyUIConfig.default()
            config.installation_path = Path(temp_dir)
            
            manager = ComfyUIManager(config)
            health_monitor = HealthMonitor(config)
            
            # Initially no metrics
            assert len(manager.get_performance_metrics()) == 0
            assert len(health_monitor.get_performance_metrics()) == 0
            
            # After operations, metrics should be collected
            # (This will fail due to invalid path, but should still create metrics)
            manager.start_service()
            
            # Should have metrics from the start attempt
            assert len(manager.get_performance_metrics()) > 0
            
            # Clear metrics
            manager.clear_metrics()
            assert len(manager.get_performance_metrics()) == 0