"""
Integration tests for Debug and Diagnostic API endpoints.

Tests all 6 debug endpoints:
- storycore.debug.logs.get
- storycore.debug.trace.enable
- storycore.debug.trace.disable
- storycore.debug.metrics.get
- storycore.debug.health.check
- storycore.debug.profiler.run
"""

import pytest
from datetime import datetime, timedelta
from pathlib import Path

from src.api.config import APIConfig
from src.api.router import APIRouter
from src.api.models import RequestContext
from src.api.categories.debug import DebugCategoryHandler


@pytest.fixture
def api_config():
    """Create API configuration for testing."""
    return APIConfig(
        version="1.0.0",
        log_api_calls=True,
        log_sanitize_params=True,
    )


@pytest.fixture
def api_router(api_config):
    """Create API router for testing."""
    return APIRouter(api_config)


@pytest.fixture
def debug_handler(api_config, api_router):
    """Create debug handler for testing."""
    return DebugCategoryHandler(api_config, api_router)


@pytest.fixture
def request_context():
    """Create request context for testing."""
    return RequestContext()


class TestLogsGetEndpoint:
    """Tests for storycore.debug.logs.get endpoint."""
    
    def test_logs_get_basic(self, debug_handler, request_context):
        """Test basic log retrieval."""
        params = {}
        
        response = debug_handler.logs_get(params, request_context)
        
        assert response.status == "success"
        assert "entries" in response.data
        assert "total_count" in response.data
        assert "filtered_count" in response.data
        assert "retrieval_time_ms" in response.data
        assert isinstance(response.data["entries"], list)
    
    def test_logs_get_with_level_filter(self, debug_handler, request_context):
        """Test log retrieval with level filter."""
        params = {"level": "INFO"}
        
        response = debug_handler.logs_get(params, request_context)
        
        assert response.status == "success"
        assert "filters_applied" in response.data
        assert response.data["filters_applied"].get("level") == "INFO"
    
    def test_logs_get_with_component_filter(self, debug_handler, request_context):
        """Test log retrieval with component filter."""
        params = {"component": "api_router"}
        
        response = debug_handler.logs_get(params, request_context)
        
        assert response.status == "success"
        assert "filters_applied" in response.data
        assert response.data["filters_applied"].get("component") == "api_router"
    
    def test_logs_get_with_time_range(self, debug_handler, request_context):
        """Test log retrieval with time range filter."""
        now = datetime.now()
        start_time = (now - timedelta(hours=1)).isoformat()
        end_time = now.isoformat()
        
        params = {
            "start_time": start_time,
            "end_time": end_time,
        }
        
        response = debug_handler.logs_get(params, request_context)
        
        assert response.status == "success"
        assert "filters_applied" in response.data
    
    def test_logs_get_with_search_text(self, debug_handler, request_context):
        """Test log retrieval with search text."""
        params = {"search_text": "initialized"}
        
        response = debug_handler.logs_get(params, request_context)
        
        assert response.status == "success"
        assert "filters_applied" in response.data
        assert response.data["filters_applied"].get("search_text") == "initialized"
    
    def test_logs_get_with_pagination(self, debug_handler, request_context):
        """Test log retrieval with pagination."""
        params = {
            "limit": 10,
            "offset": 0,
        }
        
        response = debug_handler.logs_get(params, request_context)
        
        assert response.status == "success"
        assert len(response.data["entries"]) <= 10
    
    def test_logs_get_invalid_level(self, debug_handler, request_context):
        """Test log retrieval with invalid level."""
        params = {"level": "INVALID"}
        
        response = debug_handler.logs_get(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_logs_get_invalid_limit(self, debug_handler, request_context):
        """Test log retrieval with invalid limit."""
        params = {"limit": 2000}
        
        response = debug_handler.logs_get(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_logs_get_invalid_time_format(self, debug_handler, request_context):
        """Test log retrieval with invalid time format."""
        params = {"start_time": "invalid-date"}
        
        response = debug_handler.logs_get(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"


class TestTraceEnableEndpoint:
    """Tests for storycore.debug.trace.enable endpoint."""
    
    def test_trace_enable_basic(self, debug_handler, request_context):
        """Test basic trace enable."""
        params = {}
        
        response = debug_handler.trace_enable(params, request_context)
        
        assert response.status == "success"
        assert "enabled" in response.data
        assert response.data["enabled"] is True
        assert "trace_id" in response.data
        assert "components_traced" in response.data
        assert "trace_level" in response.data
    
    def test_trace_enable_with_components(self, debug_handler, request_context):
        """Test trace enable with specific components."""
        params = {
            "components": ["api_router", "auth_service"],
        }
        
        response = debug_handler.trace_enable(params, request_context)
        
        assert response.status == "success"
        assert len(response.data["components_traced"]) == 2
        assert "api_router" in response.data["components_traced"]
        assert "auth_service" in response.data["components_traced"]
    
    def test_trace_enable_with_trace_level(self, debug_handler, request_context):
        """Test trace enable with specific trace level."""
        params = {"trace_level": "verbose"}
        
        response = debug_handler.trace_enable(params, request_context)
        
        assert response.status == "success"
        assert response.data["trace_level"] == "verbose"
    
    def test_trace_enable_with_configuration(self, debug_handler, request_context):
        """Test trace enable with custom configuration."""
        params = {
            "trace_level": "detailed",
            "include_timing": True,
            "include_parameters": True,
            "include_results": False,
            "max_trace_size_mb": 50,
        }
        
        response = debug_handler.trace_enable(params, request_context)
        
        assert response.status == "success"
        assert "configuration" in response.data
        config = response.data["configuration"]
        assert config["include_timing"] is True
        assert config["include_parameters"] is True
        assert config["include_results"] is False
        assert config["max_trace_size_mb"] == 50
    
    def test_trace_enable_invalid_level(self, debug_handler, request_context):
        """Test trace enable with invalid trace level."""
        params = {"trace_level": "invalid"}
        
        response = debug_handler.trace_enable(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_trace_enable_invalid_component(self, debug_handler, request_context):
        """Test trace enable with invalid component."""
        params = {"components": ["invalid_component"]}
        
        response = debug_handler.trace_enable(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_trace_enable_invalid_max_size(self, debug_handler, request_context):
        """Test trace enable with invalid max size."""
        params = {"max_trace_size_mb": 2000}
        
        response = debug_handler.trace_enable(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"


class TestTraceDisableEndpoint:
    """Tests for storycore.debug.trace.disable endpoint."""
    
    def test_trace_disable_specific(self, debug_handler, request_context):
        """Test disabling a specific trace."""
        # First enable a trace
        enable_response = debug_handler.trace_enable({}, request_context)
        trace_id = enable_response.data["trace_id"]
        
        # Now disable it
        params = {"trace_id": trace_id}
        
        response = debug_handler.trace_disable(params, request_context)
        
        assert response.status == "success"
        assert response.data["disabled"] is True
        assert response.data["trace_id"] == trace_id
    
    def test_trace_disable_with_save(self, debug_handler, request_context):
        """Test disabling trace with save."""
        # Enable a trace
        enable_response = debug_handler.trace_enable({}, request_context)
        trace_id = enable_response.data["trace_id"]
        
        # Disable with save
        params = {
            "trace_id": trace_id,
            "save_trace": True,
        }
        
        response = debug_handler.trace_disable(params, request_context)
        
        assert response.status == "success"
        assert response.data["trace_saved"] is True
        assert response.data["trace_path"] is not None
    
    def test_trace_disable_all(self, debug_handler, request_context):
        """Test disabling all traces."""
        # Enable multiple traces
        debug_handler.trace_enable({}, request_context)
        debug_handler.trace_enable({}, request_context)
        
        # Disable all
        params = {}
        
        response = debug_handler.trace_disable(params, request_context)
        
        assert response.status == "success"
        assert response.data["disabled"] is True
        assert "disabled_count" in response.data
    
    def test_trace_disable_nonexistent(self, debug_handler, request_context):
        """Test disabling nonexistent trace."""
        params = {"trace_id": "nonexistent_trace"}
        
        response = debug_handler.trace_disable(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"
    
    def test_trace_disable_no_active_traces(self, debug_handler, request_context):
        """Test disabling when no traces are active."""
        # Create fresh handler with no traces
        from src.api.config import APIConfig
        from src.api.router import APIRouter
        config = APIConfig(version="1.0.0")
        router = APIRouter(config)
        handler = DebugCategoryHandler(config, router)
        
        params = {}
        
        response = handler.trace_disable(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"


class TestMetricsGetEndpoint:
    """Tests for storycore.debug.metrics.get endpoint."""
    
    def test_metrics_get_all(self, debug_handler, request_context):
        """Test getting all metrics."""
        params = {
            "include_system": True,
            "include_api": True,
            "include_components": True,
        }
        
        response = debug_handler.metrics_get(params, request_context)
        
        assert response.status == "success"
        assert "system_metrics" in response.data
        assert "api_metrics" in response.data
        assert "component_metrics" in response.data
        assert "collection_time_ms" in response.data
    
    def test_metrics_get_system_only(self, debug_handler, request_context):
        """Test getting system metrics only."""
        params = {
            "include_system": True,
            "include_api": False,
            "include_components": False,
        }
        
        response = debug_handler.metrics_get(params, request_context)
        
        assert response.status == "success"
        assert response.data["system_metrics"] is not None
        assert response.data["api_metrics"] is None
        assert len(response.data["component_metrics"]) == 0
    
    def test_metrics_get_api_only(self, debug_handler, request_context):
        """Test getting API metrics only."""
        params = {
            "include_system": False,
            "include_api": True,
            "include_components": False,
        }
        
        response = debug_handler.metrics_get(params, request_context)
        
        assert response.status == "success"
        assert response.data["system_metrics"] is None
        assert response.data["api_metrics"] is not None
    
    def test_metrics_get_with_time_window(self, debug_handler, request_context):
        """Test getting metrics with time window."""
        params = {"time_window_seconds": 600}
        
        response = debug_handler.metrics_get(params, request_context)
        
        assert response.status == "success"
        assert response.data["time_window_seconds"] == 600
    
    def test_metrics_get_system_metrics_structure(self, debug_handler, request_context):
        """Test system metrics structure."""
        params = {"include_system": True}
        
        response = debug_handler.metrics_get(params, request_context)
        
        assert response.status == "success"
        system_metrics = response.data["system_metrics"]
        assert "cpu_usage_percent" in system_metrics
        assert "memory_usage_mb" in system_metrics
        assert "memory_total_mb" in system_metrics
        assert "disk_usage_gb" in system_metrics
        assert "uptime_seconds" in system_metrics
    
    def test_metrics_get_api_metrics_structure(self, debug_handler, request_context):
        """Test API metrics structure."""
        params = {"include_api": True}
        
        response = debug_handler.metrics_get(params, request_context)
        
        assert response.status == "success"
        api_metrics = response.data["api_metrics"]
        assert "total_requests" in api_metrics
        assert "successful_requests" in api_metrics
        assert "failed_requests" in api_metrics
        assert "average_latency_ms" in api_metrics
        assert "requests_per_second" in api_metrics
    
    def test_metrics_get_invalid_time_window(self, debug_handler, request_context):
        """Test metrics get with invalid time window."""
        params = {"time_window_seconds": 100000}
        
        response = debug_handler.metrics_get(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"


class TestHealthCheckEndpoint:
    """Tests for storycore.debug.health.check endpoint."""
    
    def test_health_check_all_components(self, debug_handler, request_context):
        """Test health check for all components."""
        params = {}
        
        response = debug_handler.health_check(params, request_context)
        
        assert response.status == "success"
        assert "overall_status" in response.data
        assert "components" in response.data
        assert "healthy_count" in response.data
        assert "unhealthy_count" in response.data
        assert "check_time_ms" in response.data
    
    def test_health_check_specific_components(self, debug_handler, request_context):
        """Test health check for specific components."""
        params = {
            "components": ["api_router", "auth_service"],
        }
        
        response = debug_handler.health_check(params, request_context)
        
        assert response.status == "success"
        assert len(response.data["components"]) == 2
    
    def test_health_check_with_details(self, debug_handler, request_context):
        """Test health check with details."""
        params = {"include_details": True}
        
        response = debug_handler.health_check(params, request_context)
        
        assert response.status == "success"
        assert len(response.data["components"]) > 0
        
        # Check component structure
        component = response.data["components"][0]
        assert "component_name" in component
        assert "status" in component
        assert "response_time_ms" in component
    
    def test_health_check_without_details(self, debug_handler, request_context):
        """Test health check without details."""
        params = {"include_details": False}
        
        response = debug_handler.health_check(params, request_context)
        
        assert response.status == "success"
        assert len(response.data["components"]) == 0
        assert "healthy_count" in response.data
    
    def test_health_check_with_timeout(self, debug_handler, request_context):
        """Test health check with custom timeout."""
        params = {"timeout_seconds": 60}
        
        response = debug_handler.health_check(params, request_context)
        
        assert response.status == "success"
    
    def test_health_check_invalid_component(self, debug_handler, request_context):
        """Test health check with invalid component."""
        params = {"components": ["invalid_component"]}
        
        response = debug_handler.health_check(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_health_check_invalid_timeout(self, debug_handler, request_context):
        """Test health check with invalid timeout."""
        params = {"timeout_seconds": 500}
        
        response = debug_handler.health_check(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"


class TestProfilerRunEndpoint:
    """Tests for storycore.debug.profiler.run endpoint."""
    
    def test_profiler_run_basic(self, debug_handler, request_context):
        """Test basic profiler run."""
        params = {"operation": "storycore.image.generate"}
        
        response = debug_handler.profiler_run(params, request_context)
        
        assert response.status == "success"
        assert "operation" in response.data
        assert "profile_type" in response.data
        assert "execution_time_ms" in response.data
        assert "hotspots" in response.data
    
    def test_profiler_run_time_profile(self, debug_handler, request_context):
        """Test profiler with time profiling."""
        params = {
            "operation": "storycore.narration.generate",
            "profile_type": "time",
        }
        
        response = debug_handler.profiler_run(params, request_context)
        
        assert response.status == "success"
        assert response.data["profile_type"] == "time"
        assert response.data["execution_time_ms"] > 0
    
    def test_profiler_run_memory_profile(self, debug_handler, request_context):
        """Test profiler with memory profiling."""
        params = {
            "operation": "storycore.image.generate",
            "profile_type": "memory",
        }
        
        response = debug_handler.profiler_run(params, request_context)
        
        assert response.status == "success"
        assert response.data["profile_type"] == "memory"
        assert response.data["memory_usage_mb"] is not None
        assert response.data["peak_memory_mb"] is not None
    
    def test_profiler_run_both_profile(self, debug_handler, request_context):
        """Test profiler with both time and memory profiling."""
        params = {
            "operation": "storycore.pipeline.execute",
            "profile_type": "both",
        }
        
        response = debug_handler.profiler_run(params, request_context)
        
        assert response.status == "success"
        assert response.data["profile_type"] == "both"
        assert response.data["execution_time_ms"] > 0
        assert response.data["memory_usage_mb"] is not None
    
    def test_profiler_run_with_call_graph(self, debug_handler, request_context):
        """Test profiler with call graph."""
        params = {
            "operation": "storycore.image.generate",
            "include_call_graph": True,
        }
        
        response = debug_handler.profiler_run(params, request_context)
        
        assert response.status == "success"
        assert response.data["call_graph"] is not None
        assert "root" in response.data["call_graph"]
        assert "children" in response.data["call_graph"]
    
    def test_profiler_run_with_operation_params(self, debug_handler, request_context):
        """Test profiler with operation parameters."""
        params = {
            "operation": "storycore.image.generate",
            "operation_params": {
                "prompt": "test prompt",
                "width": 512,
                "height": 512,
            },
        }
        
        response = debug_handler.profiler_run(params, request_context)
        
        assert response.status == "success"
    
    def test_profiler_run_saves_profile(self, debug_handler, request_context):
        """Test that profiler saves profile data."""
        params = {"operation": "storycore.test.operation"}
        
        response = debug_handler.profiler_run(params, request_context)
        
        assert response.status == "success"
        assert response.data["profile_path"] is not None
    
    def test_profiler_run_missing_operation(self, debug_handler, request_context):
        """Test profiler without operation parameter."""
        params = {}
        
        response = debug_handler.profiler_run(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_profiler_run_invalid_profile_type(self, debug_handler, request_context):
        """Test profiler with invalid profile type."""
        params = {
            "operation": "storycore.test.operation",
            "profile_type": "invalid",
        }
        
        response = debug_handler.profiler_run(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_profiler_run_invalid_max_depth(self, debug_handler, request_context):
        """Test profiler with invalid max depth."""
        params = {
            "operation": "storycore.test.operation",
            "max_depth": 200,
        }
        
        response = debug_handler.profiler_run(params, request_context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"


class TestDebugEndpointIntegration:
    """Integration tests across multiple debug endpoints."""
    
    def test_trace_enable_disable_cycle(self, debug_handler, request_context):
        """Test complete trace enable/disable cycle."""
        # Enable trace
        enable_response = debug_handler.trace_enable({}, request_context)
        assert enable_response.status == "success"
        trace_id = enable_response.data["trace_id"]
        
        # Disable trace
        disable_response = debug_handler.trace_disable(
            {"trace_id": trace_id, "save_trace": True},
            request_context
        )
        assert disable_response.status == "success"
        assert disable_response.data["trace_saved"] is True
    
    def test_metrics_after_operations(self, debug_handler, request_context):
        """Test that metrics reflect operations."""
        # Record some operations
        debug_handler.record_request("test.endpoint", 50.0, True)
        debug_handler.record_request("test.endpoint", 75.0, True)
        debug_handler.record_request("test.endpoint", 100.0, False)
        
        # Get metrics
        response = debug_handler.metrics_get({"include_api": True}, request_context)
        
        assert response.status == "success"
        api_metrics = response.data["api_metrics"]
        assert api_metrics["total_requests"] >= 3
        assert api_metrics["failed_requests"] >= 1
    
    def test_health_check_all_components_healthy(self, debug_handler, request_context):
        """Test that health check shows healthy system."""
        response = debug_handler.health_check({}, request_context)
        
        assert response.status == "success"
        # Most components should be healthy in test environment
        assert response.data["healthy_count"] > 0
    
    def test_logs_capture_debug_operations(self, debug_handler, request_context):
        """Test that logs capture debug operations."""
        # Perform some operations
        debug_handler.trace_enable({}, request_context)
        debug_handler.metrics_get({}, request_context)
        
        # Check logs
        response = debug_handler.logs_get({}, request_context)
        
        assert response.status == "success"
        assert response.data["total_count"] > 0
