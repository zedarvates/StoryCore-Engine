"""
Property-based tests for ComfyUI Health Monitor.
Tests universal properties that should hold for all health monitoring scenarios.
"""

import pytest
import asyncio
import aiohttp
from unittest.mock import AsyncMock, patch, MagicMock
from hypothesis import given, strategies as st, assume, settings
from hypothesis import HealthCheck
import time
from datetime import datetime

from src.comfyui_config import ComfyUIConfig
from src.health_monitor import HealthMonitor
from src.comfyui_models import HealthStatus, HealthState, SystemStats


# Hypothesis strategies for generating test data
@st.composite
def mock_system_stats_response(draw):
    """Generate mock system stats response."""
    return {
        "system": {
            "device_name": draw(st.text(min_size=1, max_size=20)),
            "vram_total": draw(st.integers(min_value=0, max_value=32 * 1024**3)),  # Up to 32GB
            "vram_free": draw(st.integers(min_value=0, max_value=32 * 1024**3))
        },
        "exec_info": {
            "queue_remaining": draw(st.integers(min_value=0, max_value=100)),
            "queue_running": draw(st.lists(st.text(min_size=1, max_size=10), max_size=5))
        }
    }


@st.composite
def health_check_scenario(draw):
    """Generate health check test scenario."""
    scenario_type = draw(st.sampled_from([
        "success", "http_error", "connection_error", "timeout", "invalid_response"
    ]))
    
    if scenario_type == "success":
        return {
            "type": "success",
            "status_code": 200,
            "response_data": draw(mock_system_stats_response()),
            "delay_ms": draw(st.floats(min_value=10, max_value=1000))
        }
    elif scenario_type == "http_error":
        return {
            "type": "http_error", 
            "status_code": draw(st.sampled_from([404, 500, 502, 503])),
            "delay_ms": draw(st.floats(min_value=10, max_value=1000))
        }
    elif scenario_type == "connection_error":
        return {
            "type": "connection_error",
            "error": draw(st.sampled_from([
                "ClientConnectorError",
                "ClientTimeout", 
                "ConnectionRefusedError"
            ]))
        }
    elif scenario_type == "timeout":
        return {
            "type": "timeout",
            "delay_ms": draw(st.floats(min_value=6000, max_value=10000))  # Longer than 5s timeout
        }
    else:  # invalid_response
        return {
            "type": "invalid_response",
            "status_code": 200,
            "response_data": draw(st.dictionaries(
                keys=st.text(min_size=1, max_size=10),
                values=st.one_of(st.text(), st.integers(), st.booleans()),
                min_size=0,
                max_size=5
            )),
            "delay_ms": draw(st.floats(min_value=10, max_value=1000))
        }


class TestHealthMonitorProperties:
    """Property-based tests for ComfyUI Health Monitor."""
    
    @given(health_check_scenario())
    @settings(max_examples=25, suppress_health_check=[HealthCheck.too_slow])
    def test_property_4_health_check_reliability(self, scenario):
        """
        Property 4: Health Check Reliability
        For any network condition, health checks should return consistent 
        and accurate status information without hanging or crashing.
        
        **Validates: Requirements 2.1, 2.2**
        **Feature: comfyui-integration, Property 4: Health Check Reliability**
        """
        config = ComfyUIConfig.default()
        monitor = HealthMonitor(config)
        
        async def run_test():
            # Mock the entire aiohttp.ClientSession context manager
            with patch('src.health_monitor.aiohttp.ClientSession') as mock_session_class:
                mock_session = AsyncMock()
                mock_response = AsyncMock()
                
                # Set up the session context manager
                mock_session_class.return_value.__aenter__.return_value = mock_session
                mock_session_class.return_value.__aexit__.return_value = None
                
                # Set up the get request context manager
                mock_session.get.return_value.__aenter__.return_value = mock_response
                mock_session.get.return_value.__aexit__.return_value = None
                
                # Configure mock based on scenario
                if scenario["type"] == "success":
                    mock_response.status = scenario["status_code"]
                    mock_response.json = AsyncMock(return_value=scenario["response_data"])
                    
                elif scenario["type"] == "http_error":
                    mock_response.status = scenario["status_code"]
                    mock_response.reason = "Test Error"
                    mock_response.json = AsyncMock(return_value={})
                    
                elif scenario["type"] == "connection_error":
                    # Create proper exception instance
                    if scenario["error"] == "ClientConnectorError":
                        error = aiohttp.ClientConnectorError(
                            connection_key=None, 
                            os_error=OSError("Test connection error")
                        )
                    elif scenario["error"] == "ClientTimeout":
                        error = aiohttp.ClientTimeout()
                    else:  # ConnectionRefusedError
                        error = ConnectionRefusedError("Test connection error")
                    mock_session.get.side_effect = error
                    
                elif scenario["type"] == "timeout":
                    # For timeout, we'll simulate by making the request take too long
                    async def slow_get(*args, **kwargs):
                        await asyncio.sleep(scenario["delay_ms"] / 1000)
                        return mock_response
                    mock_session.get = slow_get
                    
                elif scenario["type"] == "invalid_response":
                    mock_response.status = scenario["status_code"]
                    mock_response.json = AsyncMock(return_value=scenario["response_data"])
                
                # Perform health check
                start_time = time.time()
                health_status = await monitor.check_health()
                end_time = time.time()
                
                # Verify health check completed within reasonable time (max 10 seconds)
                assert (end_time - start_time) < 10.0, "Health check should not hang indefinitely"
                
                # Verify health status is properly formed
                assert isinstance(health_status, HealthStatus)
                assert isinstance(health_status.is_healthy, bool)
                assert isinstance(health_status.state, HealthState)
                assert isinstance(health_status.response_time_ms, (int, float))
                assert health_status.response_time_ms >= 0
                assert isinstance(health_status.consecutive_failures, int)
                assert health_status.consecutive_failures >= 0
                
                # Verify health status consistency
                if scenario["type"] == "success":
                    assert health_status.is_healthy == True
                    assert health_status.state == HealthState.HEALTHY
                    assert health_status.error_message is None
                    assert health_status.system_stats is not None
                else:
                    assert health_status.is_healthy == False
                    assert health_status.state in [HealthState.UNHEALTHY, HealthState.DEGRADED, HealthState.UNKNOWN]
                    if scenario["type"] != "timeout":  # Timeout might not have error message
                        assert health_status.error_message is not None
        
        # Run the async test
        asyncio.run(run_test())
    
    @given(st.integers(min_value=0, max_value=10))
    @settings(max_examples=10)
    def test_property_5_failure_detection_timing(self, consecutive_failures):
        """
        Property 5: Failure Detection Timing
        For any number of consecutive failures, the Monitor should detect 
        failures within the configured timeout and track failure counts accurately.
        
        **Validates: Requirements 2.3**
        **Feature: comfyui-integration, Property 5: Failure Detection Timing**
        """
        config = ComfyUIConfig.default()
        config.health_check_interval = 0.1  # Fast checks for testing
        monitor = HealthMonitor(config)
        
        # Simulate consecutive failures
        monitor._consecutive_failures = consecutive_failures
        
        async def run_test():
            with patch('aiohttp.ClientSession') as mock_session:
                # Configure mock to always fail
                mock_get = AsyncMock()
                mock_session.return_value.__aenter__.return_value.get = mock_get
                mock_get.side_effect = aiohttp.ClientConnectorError("Connection failed")
                
                # Perform health check
                start_time = time.time()
                health_status = await monitor.check_health()
                end_time = time.time()
                
                # Verify failure detection timing (should be within 5 seconds)
                assert (end_time - start_time) < 5.0, "Failure detection should be fast"
                
                # Verify failure count incremented
                assert health_status.consecutive_failures == consecutive_failures + 1
                assert monitor._consecutive_failures == consecutive_failures + 1
                
                # Verify failure state
                assert health_status.is_healthy == False
                assert health_status.state == HealthState.UNHEALTHY
                assert health_status.error_message is not None
        
        asyncio.run(run_test())
    
    @given(st.integers(min_value=1, max_value=5))
    @settings(max_examples=10)
    def test_property_6_reconnection_backoff(self, failure_count):
        """
        Property 6: Reconnection Backoff
        For any failure count, the Monitor should calculate appropriate 
        backoff delays using exponential backoff strategy.
        
        **Validates: Requirements 2.4**
        **Feature: comfyui-integration, Property 6: Reconnection Backoff**
        """
        config = ComfyUIConfig.default()
        monitor = HealthMonitor(config)
        
        # Set failure count
        monitor._consecutive_failures = failure_count
        
        # Calculate backoff delay
        delay = monitor.calculate_backoff_delay()
        
        # Verify backoff properties
        assert isinstance(delay, (int, float))
        assert delay >= 0
        
        # Verify exponential growth (with some tolerance for floating point)
        expected_delay = monitor._base_backoff_seconds * (monitor._backoff_multiplier ** (failure_count - 1))
        expected_delay = min(expected_delay, monitor._max_backoff_seconds)
        
        assert abs(delay - expected_delay) < 0.001, f"Expected {expected_delay}, got {delay}"
        
        # Verify backoff is capped at maximum
        assert delay <= monitor._max_backoff_seconds
        
        # Verify backoff increases with failure count (for reasonable failure counts)
        if failure_count > 1:
            monitor._consecutive_failures = failure_count - 1
            previous_delay = monitor.calculate_backoff_delay()
            monitor._consecutive_failures = failure_count  # Reset for current test
            
            # Should increase or stay at max
            assert delay >= previous_delay
    
    @given(st.floats(min_value=1.0, max_value=10.0))
    @settings(max_examples=10)
    def test_property_service_readiness_timeout(self, timeout_seconds):
        """
        Property: Service readiness detection should respect timeout limits.
        For any timeout value, wait_for_service_ready should not exceed the specified timeout.
        """
        config = ComfyUIConfig.default()
        config.health_check_interval = 0.1  # Fast checks
        monitor = HealthMonitor(config)
        
        async def run_test():
            with patch('aiohttp.ClientSession') as mock_session:
                # Configure mock to always fail (service never ready)
                mock_get = AsyncMock()
                mock_session.return_value.__aenter__.return_value.get = mock_get
                mock_get.side_effect = aiohttp.ClientConnectorError("Service not ready")
                
                # Wait for service with timeout
                start_time = time.time()
                is_ready = await monitor.wait_for_service_ready(timeout_seconds)
                end_time = time.time()
                
                # Verify timeout respected (with small tolerance)
                elapsed = end_time - start_time
                assert elapsed <= timeout_seconds + 0.5, f"Should timeout within {timeout_seconds}s, took {elapsed}s"
                
                # Service should not be ready
                assert is_ready == False
        
        asyncio.run(run_test())
    
    @given(mock_system_stats_response())
    @settings(max_examples=15)
    def test_property_system_stats_parsing(self, stats_data):
        """
        Property: System stats parsing should handle any valid stats format.
        For any system stats data, parsing should produce valid SystemStats objects.
        """
        config = ComfyUIConfig.default()
        monitor = HealthMonitor(config)
        
        # Parse system stats
        system_stats = monitor._parse_system_stats(stats_data)
        
        # Verify SystemStats object is valid
        assert isinstance(system_stats, SystemStats)
        assert isinstance(system_stats.device_name, str)
        assert isinstance(system_stats.vram_total, int)
        assert isinstance(system_stats.vram_free, int)
        assert isinstance(system_stats.queue_remaining, int)
        assert isinstance(system_stats.queue_running, list)
        
        # Verify VRAM calculations
        assert system_stats.vram_total >= 0
        assert system_stats.vram_free >= 0
        assert system_stats.vram_used >= 0
        assert system_stats.vram_usage_percent >= 0.0
        assert system_stats.vram_usage_percent <= 100.0
        
        # Verify queue information
        assert system_stats.queue_remaining >= 0
        
        # If original data had valid values, they should be preserved
        if "system" in stats_data:
            system_info = stats_data["system"]
            if "device_name" in system_info:
                assert system_stats.device_name == system_info["device_name"]
            if "vram_total" in system_info:
                assert system_stats.vram_total == system_info["vram_total"]
            if "vram_free" in system_info:
                assert system_stats.vram_free == system_info["vram_free"]
    
    def test_property_health_summary_consistency(self):
        """
        Property: Health summary should be consistent with internal state.
        Health summary should accurately reflect the current health status.
        """
        config = ComfyUIConfig.default()
        monitor = HealthMonitor(config)
        
        # Test with no health checks performed
        summary = monitor.get_health_summary()
        assert summary["status"] == "unknown"
        assert "message" in summary
        
        # Test with mock health status
        mock_health_status = HealthStatus(
            is_healthy=True,
            state=HealthState.HEALTHY,
            response_time_ms=150.0,
            consecutive_failures=0
        )
        monitor._last_health_status = mock_health_status
        
        summary = monitor.get_health_summary()
        assert summary["status"] == "healthy"
        assert summary["is_healthy"] == True
        assert summary["response_time_ms"] == 150.0
        assert summary["consecutive_failures"] == 0
        assert "last_check" in summary
    
    def test_property_metrics_collection(self):
        """
        Property: Performance metrics should be collected consistently.
        All health check operations should generate performance metrics.
        """
        config = ComfyUIConfig.default()
        monitor = HealthMonitor(config)
        
        # Initially no metrics
        assert len(monitor.get_performance_metrics()) == 0
        
        async def run_test():
            with patch('aiohttp.ClientSession') as mock_session:
                mock_response = AsyncMock()
                mock_get = AsyncMock()
                mock_session.return_value.__aenter__.return_value.get = mock_get
                mock_get.return_value.__aenter__.return_value = mock_response
                mock_response.status = 200
                mock_response.json.return_value = {
                    "system": {"device_name": "Test", "vram_total": 1000, "vram_free": 500},
                    "exec_info": {"queue_remaining": 0, "queue_running": []}
                }
                
                # Perform health check
                await monitor.check_health()
                
                # Verify metrics collected
                metrics = monitor.get_performance_metrics()
                assert len(metrics) == 1
                
                metric = metrics[0]
                assert metric.operation_type == "health_check"
                assert metric.start_time is not None
                assert metric.end_time is not None
                assert metric.duration_seconds is not None
                assert metric.duration_seconds > 0
                assert isinstance(metric.success, bool)
        
        asyncio.run(run_test())