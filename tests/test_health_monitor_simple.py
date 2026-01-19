"""
Simple test for Health Monitor to verify basic functionality.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
import aiohttp

from src.comfyui_config import ComfyUIConfig
from src.health_monitor import HealthMonitor
from src.comfyui_models import HealthStatus, HealthState


class TestHealthMonitorSimple:
    """Simple tests for Health Monitor functionality."""
    
    def test_health_monitor_initialization(self):
        """Test that HealthMonitor initializes correctly."""
        config = ComfyUIConfig.default()
        monitor = HealthMonitor(config)
        
        assert monitor.config == config
        assert monitor._consecutive_failures == 0
        assert monitor._last_health_status is None
    
    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """Test successful health check."""
        config = ComfyUIConfig.default()
        monitor = HealthMonitor(config)
        
        # Mock successful response
        mock_response_data = {
            "system": {
                "device_name": "Test Device",
                "vram_total": 8000000000,
                "vram_free": 4000000000
            },
            "exec_info": {
                "queue_remaining": 0,
                "queue_running": []
            }
        }
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            # Create mock objects
            mock_session = AsyncMock()
            mock_response = AsyncMock()
            
            # Configure the session context manager
            mock_session_class.return_value.__aenter__.return_value = mock_session
            mock_session_class.return_value.__aexit__.return_value = None
            
            # Configure the get request to return a proper async context manager
            mock_get_context = AsyncMock()
            mock_get_context.__aenter__.return_value = mock_response
            mock_get_context.__aexit__.return_value = None
            mock_session.get.return_value = mock_get_context
            
            # Configure response
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_response_data)
            
            # Perform health check
            health_status = await monitor.check_health()
            
            # Verify results
            assert isinstance(health_status, HealthStatus)
            assert health_status.is_healthy == True
            assert health_status.state == HealthState.HEALTHY
            assert health_status.consecutive_failures == 0
            assert health_status.system_stats is not None
            assert health_status.system_stats.device_name == "Test Device"
    
    @pytest.mark.asyncio
    async def test_health_check_connection_error(self):
        """Test health check with connection error."""
        config = ComfyUIConfig.default()
        monitor = HealthMonitor(config)
        
        with patch('aiohttp.ClientSession') as mock_session_class:
            # Create mock objects
            mock_session = AsyncMock()
            
            # Configure the session context manager
            mock_session_class.return_value.__aenter__.return_value = mock_session
            mock_session_class.return_value.__aexit__.return_value = None
            
            # Configure connection error
            error = aiohttp.ClientConnectorError(
                connection_key=None,
                os_error=OSError("Connection refused")
            )
            mock_session.get.side_effect = error
            
            # Perform health check
            health_status = await monitor.check_health()
            
            # Verify results
            assert isinstance(health_status, HealthStatus)
            assert health_status.is_healthy == False
            assert health_status.state == HealthState.UNHEALTHY
            assert health_status.consecutive_failures == 1
            assert health_status.error_message is not None
            assert "Connection error" in health_status.error_message
    
    def test_backoff_calculation(self):
        """Test exponential backoff calculation."""
        config = ComfyUIConfig.default()
        monitor = HealthMonitor(config)
        
        # Test no failures
        monitor._consecutive_failures = 0
        assert monitor.calculate_backoff_delay() == 0.0
        
        # Test increasing failures
        monitor._consecutive_failures = 1
        delay1 = monitor.calculate_backoff_delay()
        assert delay1 == 1.0  # base delay
        
        monitor._consecutive_failures = 2
        delay2 = monitor.calculate_backoff_delay()
        assert delay2 == 2.0  # base * multiplier^1
        
        monitor._consecutive_failures = 3
        delay3 = monitor.calculate_backoff_delay()
        assert delay3 == 4.0  # base * multiplier^2
        
        # Test maximum cap
        monitor._consecutive_failures = 10
        delay_max = monitor.calculate_backoff_delay()
        assert delay_max == monitor._max_backoff_seconds
    
    def test_health_summary(self):
        """Test health summary generation."""
        config = ComfyUIConfig.default()
        monitor = HealthMonitor(config)
        
        # Test with no health checks
        summary = monitor.get_health_summary()
        assert summary["status"] == "unknown"
        assert "message" in summary
        
        # Test with mock health status
        from src.comfyui_models import SystemStats
        mock_health_status = HealthStatus(
            is_healthy=True,
            state=HealthState.HEALTHY,
            response_time_ms=150.0,
            consecutive_failures=0,
            system_stats=SystemStats(
                device_name="Test Device",
                vram_total=8000000000,
                vram_free=4000000000
            )
        )
        monitor._last_health_status = mock_health_status
        
        summary = monitor.get_health_summary()
        assert summary["status"] == "healthy"
        assert summary["is_healthy"] == True
        assert summary["response_time_ms"] == 150.0
        assert summary["consecutive_failures"] == 0
        assert "system_stats" in summary
        assert summary["system_stats"]["device_name"] == "Test Device"