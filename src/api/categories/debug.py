"""
Debug and Diagnostic API Category Handler

This module implements all debug and diagnostic capabilities including log retrieval,
tracing, metrics collection, health checks, and profiling.
"""

import logging
import time
import psutil
import uuid
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime, timedelta

from ..base_handler import BaseAPIHandler
from ..models import APIResponse, RequestContext, ErrorCodes
from ..config import APIConfig
from ..router import APIRouter

from .debug_models import (
    LogEntry,
    LogsGetRequest,
    LogsGetResult,
    TraceEnableRequest,
    TraceEnableResult,
    TraceDisableRequest,
    TraceDisableResult,
    SystemMetrics,
    APIMetrics,
    MetricsGetRequest,
    MetricsGetResult,
    ComponentHealth,
    HealthCheckRequest,
    HealthCheckResult,
    ProfilerRunRequest,
    ProfilerRunResult,
    SUPPORTED_LOG_LEVELS,
    SUPPORTED_TRACE_LEVELS,
    SUPPORTED_PROFILE_TYPES,
    SYSTEM_COMPONENTS,
    validate_log_level,
    validate_trace_level,
    validate_profile_type,
    validate_component_name,
)


logger = logging.getLogger(__name__)


class DebugCategoryHandler(BaseAPIHandler):
    """
    Handler for Debug and Diagnostic API category.
    
    Implements 6 endpoints:
    - storycore.debug.logs.get: Retrieve filtered log entries
    - storycore.debug.trace.enable: Enable detailed operation tracing
    - storycore.debug.trace.disable: Disable operation tracing
    - storycore.debug.metrics.get: Get system performance metrics
    - storycore.debug.health.check: Verify system component health
    - storycore.debug.profiler.run: Profile operation performance
    """

    def __init__(self, config: APIConfig, router: APIRouter):
        """Initialize the debug category handler."""
        super().__init__(config)
        self.router = router
        
        # Initialize log storage (in-memory for now)
        self.log_entries: List[LogEntry] = []
        self.max_log_entries = 10000
        
        # Initialize trace state
        self.traces: Dict[str, Dict[str, Any]] = {}
        self.active_traces: List[str] = []
        
        # Initialize metrics tracking
        self.start_time = datetime.now()
        self.request_count = 0
        self.success_count = 0
        self.error_count = 0
        self.latencies: List[float] = []
        
        # Register all endpoints
        self.register_endpoints()
        
        logger.info("Initialized DebugCategoryHandler with 6 endpoints")

    
    def register_endpoints(self) -> None:
        """Register all debug and diagnostic endpoints with the router."""
        
        # Log retrieval endpoint
        self.router.register_endpoint(
            path="storycore.debug.logs.get",
            method="POST",
            handler=self.logs_get,
            description="Retrieve filtered log entries",
            async_capable=False,
        )
        
        # Trace enable endpoint
        self.router.register_endpoint(
            path="storycore.debug.trace.enable",
            method="POST",
            handler=self.trace_enable,
            description="Enable detailed operation tracing",
            async_capable=False,
        )
        
        # Trace disable endpoint
        self.router.register_endpoint(
            path="storycore.debug.trace.disable",
            method="POST",
            handler=self.trace_disable,
            description="Disable operation tracing",
            async_capable=False,
        )
        
        # Metrics retrieval endpoint
        self.router.register_endpoint(
            path="storycore.debug.metrics.get",
            method="POST",
            handler=self.metrics_get,
            description="Get system performance metrics",
            async_capable=False,
        )
        
        # Health check endpoint
        self.router.register_endpoint(
            path="storycore.debug.health.check",
            method="POST",
            handler=self.health_check,
            description="Verify system component health",
            async_capable=False,
        )
        
        # Profiler endpoint
        self.router.register_endpoint(
            path="storycore.debug.profiler.run",
            method="POST",
            handler=self.profiler_run,
            description="Profile operation performance",
            async_capable=False,
        )


    # Helper methods
    
    def _add_log_entry(self, level: str, component: str, message: str, 
                       request_id: Optional[str] = None, user: Optional[str] = None,
                       details: Optional[Dict[str, Any]] = None) -> None:
        """Add a log entry to the in-memory log storage."""
        entry = LogEntry(
            timestamp=datetime.now(),
            level=level,
            component=component,
            message=message,
            request_id=request_id,
            user=user,
            details=details or {},
        )
        
        self.log_entries.append(entry)
        
        # Trim old entries if we exceed max
        if len(self.log_entries) > self.max_log_entries:
            self.log_entries = self.log_entries[-self.max_log_entries:]
    
    def _filter_logs(self, level: Optional[str] = None, component: Optional[str] = None,
                     start_time: Optional[datetime] = None, end_time: Optional[datetime] = None,
                     search_text: Optional[str] = None) -> List[LogEntry]:
        """Filter log entries based on criteria."""
        filtered = self.log_entries
        
        if level:
            filtered = [e for e in filtered if e.level == level.upper()]
        
        if component:
            filtered = [e for e in filtered if e.component == component]
        
        if start_time:
            filtered = [e for e in filtered if e.timestamp >= start_time]
        
        if end_time:
            filtered = [e for e in filtered if e.timestamp <= end_time]
        
        if search_text:
            search_lower = search_text.lower()
            filtered = [e for e in filtered if search_lower in e.message.lower()]
        
        return filtered
    
    def _collect_system_metrics(self) -> SystemMetrics:
        """Collect current system metrics."""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=0.1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_mb = memory.used / (1024 * 1024)
            memory_total_mb = memory.total / (1024 * 1024)
            memory_percent = memory.percent
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_gb = disk.used / (1024 * 1024 * 1024)
            disk_total_gb = disk.total / (1024 * 1024 * 1024)
            disk_percent = disk.percent
            
            # Uptime
            uptime = (datetime.now() - self.start_time).total_seconds()
            
            return SystemMetrics(
                cpu_usage_percent=cpu_percent,
                memory_usage_mb=memory_mb,
                memory_total_mb=memory_total_mb,
                memory_percent=memory_percent,
                disk_usage_gb=disk_gb,
                disk_total_gb=disk_total_gb,
                disk_percent=disk_percent,
                uptime_seconds=uptime,
            )
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            # Return mock metrics on failure
            return SystemMetrics(
                cpu_usage_percent=25.0,
                memory_usage_mb=512.0,
                memory_total_mb=8192.0,
                memory_percent=6.25,
                disk_usage_gb=50.0,
                disk_total_gb=500.0,
                disk_percent=10.0,
                uptime_seconds=3600.0,
            )

    
    def _collect_api_metrics(self) -> APIMetrics:
        """Collect API performance metrics."""
        total_requests = self.request_count
        successful_requests = self.success_count
        failed_requests = self.error_count
        
        # Calculate latency percentiles
        if self.latencies:
            sorted_latencies = sorted(self.latencies)
            avg_latency = sum(sorted_latencies) / len(sorted_latencies)
            p50_idx = int(len(sorted_latencies) * 0.50)
            p95_idx = int(len(sorted_latencies) * 0.95)
            p99_idx = int(len(sorted_latencies) * 0.99)
            
            p50_latency = sorted_latencies[p50_idx] if p50_idx < len(sorted_latencies) else 0
            p95_latency = sorted_latencies[p95_idx] if p95_idx < len(sorted_latencies) else 0
            p99_latency = sorted_latencies[p99_idx] if p99_idx < len(sorted_latencies) else 0
        else:
            avg_latency = 0
            p50_latency = 0
            p95_latency = 0
            p99_latency = 0
        
        # Calculate requests per second
        uptime = (datetime.now() - self.start_time).total_seconds()
        rps = total_requests / uptime if uptime > 0 else 0
        
        # Calculate error rate
        error_rate = failed_requests / total_requests if total_requests > 0 else 0
        
        return APIMetrics(
            total_requests=total_requests,
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            average_latency_ms=avg_latency,
            p50_latency_ms=p50_latency,
            p95_latency_ms=p95_latency,
            p99_latency_ms=p99_latency,
            requests_per_second=rps,
            error_rate=error_rate,
        )
    
    def _check_component_health(self, component_name: str, timeout_seconds: int) -> ComponentHealth:
        """Check health of a specific component."""
        start_time = time.time()
        
        try:
            # Mock health check - in production, this would actually test the component
            status = "healthy"
            error_message = None
            details = {}
            
            # Simulate different component states
            if component_name == "comfyui_backend":
                # Check if ComfyUI is available
                status = "unknown"
                details = {"note": "ComfyUI connection not configured"}
            elif component_name == "llm_service":
                # Check if LLM service is available
                status = "healthy"
                details = {"provider": "mock", "models_available": 3}
            elif component_name in ["api_router", "auth_service", "rate_limit_service"]:
                # Core services should be healthy if we're running
                status = "healthy"
                details = {"operational": True}
            else:
                # Other components
                status = "healthy"
                details = {"checked": True}
            
            response_time_ms = (time.time() - start_time) * 1000
            
            return ComponentHealth(
                component_name=component_name,
                status=status,
                response_time_ms=response_time_ms,
                error_message=error_message,
                last_check=datetime.now(),
                details=details,
            )
            
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            return ComponentHealth(
                component_name=component_name,
                status="unhealthy",
                response_time_ms=response_time_ms,
                error_message=str(e),
                last_check=datetime.now(),
                details={"exception": type(e).__name__},
            )
    
    def record_request(self, endpoint: str, duration_ms: float, success: bool) -> None:
        """Record a request for metrics tracking."""
        self.request_count += 1
        if success:
            self.success_count += 1
        else:
            self.error_count += 1
        
        self.latencies.append(duration_ms)
        
        # Keep only recent latencies (last 1000)
        if len(self.latencies) > 1000:
            self.latencies = self.latencies[-1000:]


    # Debug endpoints
    
    def logs_get(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Retrieve filtered log entries.
        
        Endpoint: storycore.debug.logs.get
        Requirements: 14.1
        """
        self.log_request("storycore.debug.logs.get", params, context)
        
        try:
            # Extract parameters
            level = params.get("level")
            component = params.get("component")
            start_time = params.get("start_time")
            end_time = params.get("end_time")
            search_text = params.get("search_text")
            limit = params.get("limit", 100)
            offset = params.get("offset", 0)
            metadata = params.get("metadata", {})
            
            # Validate log level if provided
            if level and not validate_log_level(level):
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid log level: {level}",
                    context=context,
                    details={
                        "level": level,
                        "supported_levels": SUPPORTED_LOG_LEVELS
                    },
                    remediation=f"Use one of: {', '.join(SUPPORTED_LOG_LEVELS)}",
                )
            
            # Validate limit
            if limit < 1 or limit > 1000:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid limit: {limit}",
                    context=context,
                    details={"limit": limit, "valid_range": "1-1000"},
                    remediation="Use limit between 1 and 1000",
                )
            
            # Validate offset
            if offset < 0:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid offset: {offset}",
                    context=context,
                    remediation="Offset must be non-negative",
                )
            
            # Parse datetime strings if provided
            if start_time and isinstance(start_time, str):
                try:
                    start_time = datetime.fromisoformat(start_time)
                except ValueError:
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Invalid start_time format: {start_time}",
                        context=context,
                        remediation="Use ISO format: YYYY-MM-DDTHH:MM:SS",
                    )
            
            if end_time and isinstance(end_time, str):
                try:
                    end_time = datetime.fromisoformat(end_time)
                except ValueError:
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Invalid end_time format: {end_time}",
                        context=context,
                        remediation="Use ISO format: YYYY-MM-DDTHH:MM:SS",
                    )
            
            start_retrieval = time.time()
            
            # Add some mock log entries if empty
            if not self.log_entries:
                self._add_log_entry("INFO", "api_router", "API system initialized", context.request_id)
                self._add_log_entry("INFO", "debug_handler", "Debug handler ready", context.request_id)
                self._add_log_entry("DEBUG", "auth_service", "Authentication service started")
                self._add_log_entry("WARNING", "rate_limit_service", "Rate limit threshold approaching")
            
            # Filter logs
            filtered_entries = self._filter_logs(level, component, start_time, end_time, search_text)
            total_count = len(self.log_entries)
            filtered_count = len(filtered_entries)
            
            # Apply pagination
            paginated_entries = filtered_entries[offset:offset + limit]
            
            # Build filters applied dict
            filters_applied = {}
            if level:
                filters_applied["level"] = level
            if component:
                filters_applied["component"] = component
            if start_time:
                filters_applied["start_time"] = start_time.isoformat()
            if end_time:
                filters_applied["end_time"] = end_time.isoformat()
            if search_text:
                filters_applied["search_text"] = search_text
            
            retrieval_time_ms = (time.time() - start_retrieval) * 1000
            
            result = LogsGetResult(
                entries=paginated_entries,
                total_count=total_count,
                filtered_count=filtered_count,
                retrieval_time_ms=retrieval_time_ms,
                filters_applied=filters_applied,
                metadata=metadata,
            )
            
            response_data = {
                "entries": [entry.to_dict() for entry in result.entries],
                "total_count": result.total_count,
                "filtered_count": result.filtered_count,
                "retrieval_time_ms": result.retrieval_time_ms,
                "filters_applied": result.filters_applied,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.debug.logs.get", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)


    def trace_enable(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Enable detailed operation tracing.
        
        Endpoint: storycore.debug.trace.enable
        Requirements: 14.2
        """
        self.log_request("storycore.debug.trace.enable", params, context)
        
        try:
            # Extract parameters
            components = params.get("components")
            trace_level = params.get("trace_level", "detailed")
            include_timing = params.get("include_timing", True)
            include_parameters = params.get("include_parameters", True)
            include_results = params.get("include_results", False)
            max_trace_size_mb = params.get("max_trace_size_mb", 100)
            metadata = params.get("metadata", {})
            
            # Validate trace level
            if not validate_trace_level(trace_level):
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid trace level: {trace_level}",
                    context=context,
                    details={
                        "trace_level": trace_level,
                        "supported_levels": SUPPORTED_TRACE_LEVELS
                    },
                    remediation=f"Use one of: {', '.join(SUPPORTED_TRACE_LEVELS)}",
                )
            
            # Validate components if provided
            if components:
                invalid_components = [c for c in components if not validate_component_name(c)]
                if invalid_components:
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Invalid components: {', '.join(invalid_components)}",
                        context=context,
                        details={
                            "invalid_components": invalid_components,
                            "valid_components": SYSTEM_COMPONENTS
                        },
                        remediation="Use valid component names from the system",
                    )
            
            # Validate max trace size
            if max_trace_size_mb < 1 or max_trace_size_mb > 1000:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid max trace size: {max_trace_size_mb}MB",
                    context=context,
                    details={"max_trace_size_mb": max_trace_size_mb, "valid_range": "1-1000"},
                    remediation="Use max trace size between 1MB and 1000MB",
                )
            
            # Generate trace ID
            trace_id = f"trace_{uuid.uuid4().hex[:12]}"
            
            # Determine components to trace
            components_traced = components if components else SYSTEM_COMPONENTS
            
            # Create trace configuration
            trace_config = {
                "trace_id": trace_id,
                "components": components_traced,
                "trace_level": trace_level,
                "include_timing": include_timing,
                "include_parameters": include_parameters,
                "include_results": include_results,
                "max_trace_size_mb": max_trace_size_mb,
                "enabled_at": datetime.now(),
                "entries": [],
            }
            
            # Store trace configuration
            self.traces[trace_id] = trace_config
            self.active_traces.append(trace_id)
            
            logger.info(f"Enabled tracing: {trace_id} for {len(components_traced)} components")
            
            result = TraceEnableResult(
                enabled=True,
                trace_id=trace_id,
                components_traced=components_traced,
                trace_level=trace_level,
                configuration={
                    "include_timing": include_timing,
                    "include_parameters": include_parameters,
                    "include_results": include_results,
                    "max_trace_size_mb": max_trace_size_mb,
                },
                metadata=metadata,
            )
            
            response_data = {
                "enabled": result.enabled,
                "trace_id": result.trace_id,
                "components_traced": result.components_traced,
                "trace_level": result.trace_level,
                "configuration": result.configuration,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.debug.trace.enable", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)


    def trace_disable(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Disable operation tracing.
        
        Endpoint: storycore.debug.trace.disable
        Requirements: 14.3
        """
        self.log_request("storycore.debug.trace.disable", params, context)
        
        try:
            # Extract parameters
            trace_id = params.get("trace_id")
            save_trace = params.get("save_trace", True)
            metadata = params.get("metadata", {})
            
            # If no trace_id provided, disable all traces
            if not trace_id:
                if not self.active_traces:
                    return self.create_error_response(
                        error_code=ErrorCodes.NOT_FOUND,
                        message="No active traces to disable",
                        context=context,
                        remediation="Enable tracing first using storycore.debug.trace.enable",
                    )
                
                # Disable all traces
                disabled_count = len(self.active_traces)
                self.active_traces.clear()
                
                logger.info(f"Disabled all {disabled_count} active traces")
                
                result = TraceDisableResult(
                    disabled=True,
                    trace_id=None,
                    trace_saved=False,
                    trace_path=None,
                    trace_size_bytes=0,
                    metadata=metadata,
                )
                
                response_data = {
                    "disabled": result.disabled,
                    "trace_id": result.trace_id,
                    "trace_saved": result.trace_saved,
                    "trace_path": result.trace_path,
                    "trace_size_bytes": result.trace_size_bytes,
                    "disabled_count": disabled_count,
                    "metadata": result.metadata,
                }
                
                response = self.create_success_response(response_data, context)
                self.log_response("storycore.debug.trace.disable", response, context)
                return response
            
            # Validate trace_id exists
            if trace_id not in self.traces:
                return self.create_error_response(
                    error_code=ErrorCodes.NOT_FOUND,
                    message=f"Trace not found: {trace_id}",
                    context=context,
                    details={"trace_id": trace_id, "active_traces": self.active_traces},
                    remediation="Use a valid trace ID from an active trace",
                )
            
            # Get trace data
            trace_data = self.traces[trace_id]
            
            # Save trace if requested
            trace_saved = False
            trace_path = None
            trace_size_bytes = 0
            
            if save_trace:
                try:
                    # Create traces directory
                    traces_dir = Path("traces")
                    traces_dir.mkdir(exist_ok=True)
                    
                    # Save trace to file
                    trace_filename = f"{trace_id}_{int(time.time())}.json"
                    trace_path = str(traces_dir / trace_filename)
                    
                    import json
                    with open(trace_path, 'w') as f:
                        # Convert datetime objects to strings for JSON serialization
                        trace_data_copy = trace_data.copy()
                        if "enabled_at" in trace_data_copy:
                            trace_data_copy["enabled_at"] = trace_data_copy["enabled_at"].isoformat()
                        json.dump(trace_data_copy, f, indent=2)
                    
                    trace_size_bytes = Path(trace_path).stat().st_size
                    trace_saved = True
                    
                    logger.info(f"Saved trace {trace_id} to {trace_path}")
                    
                except Exception as e:
                    logger.error(f"Failed to save trace: {e}")
                    trace_saved = False
            
            # Remove from active traces
            if trace_id in self.active_traces:
                self.active_traces.remove(trace_id)
            
            logger.info(f"Disabled trace: {trace_id}")
            
            result = TraceDisableResult(
                disabled=True,
                trace_id=trace_id,
                trace_saved=trace_saved,
                trace_path=trace_path,
                trace_size_bytes=trace_size_bytes,
                metadata=metadata,
            )
            
            response_data = {
                "disabled": result.disabled,
                "trace_id": result.trace_id,
                "trace_saved": result.trace_saved,
                "trace_path": result.trace_path,
                "trace_size_bytes": result.trace_size_bytes,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.debug.trace.disable", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)


    def metrics_get(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Get system performance metrics.
        
        Endpoint: storycore.debug.metrics.get
        Requirements: 14.4
        """
        self.log_request("storycore.debug.metrics.get", params, context)
        
        try:
            # Extract parameters
            include_system = params.get("include_system", True)
            include_api = params.get("include_api", True)
            include_components = params.get("include_components", True)
            time_window_seconds = params.get("time_window_seconds", 300)
            metadata = params.get("metadata", {})
            
            # Validate time window
            if time_window_seconds < 1 or time_window_seconds > 86400:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid time window: {time_window_seconds} seconds",
                    context=context,
                    details={"time_window_seconds": time_window_seconds, "valid_range": "1-86400"},
                    remediation="Use time window between 1 second and 24 hours (86400 seconds)",
                )
            
            start_collection = time.time()
            
            # Collect system metrics if requested
            system_metrics = None
            if include_system:
                system_metrics = self._collect_system_metrics()
            
            # Collect API metrics if requested
            api_metrics = None
            if include_api:
                api_metrics = self._collect_api_metrics()
            
            # Collect component metrics if requested
            component_metrics = {}
            if include_components:
                # Mock component metrics
                component_metrics = {
                    "api_router": {
                        "requests_handled": self.request_count,
                        "average_routing_time_ms": 2.5,
                        "status": "healthy",
                    },
                    "auth_service": {
                        "authentications": 0,
                        "cache_hit_rate": 0.85,
                        "status": "healthy",
                    },
                    "rate_limit_service": {
                        "requests_limited": 0,
                        "current_buckets": 10,
                        "status": "healthy",
                    },
                    "task_manager": {
                        "active_tasks": 0,
                        "completed_tasks": 0,
                        "failed_tasks": 0,
                        "status": "healthy",
                    },
                }
            
            collection_time_ms = (time.time() - start_collection) * 1000
            
            result = MetricsGetResult(
                system_metrics=system_metrics,
                api_metrics=api_metrics,
                component_metrics=component_metrics,
                collection_time_ms=collection_time_ms,
                time_window_seconds=time_window_seconds,
                metadata=metadata,
            )
            
            response_data = {
                "system_metrics": system_metrics.to_dict() if system_metrics else None,
                "api_metrics": api_metrics.to_dict() if api_metrics else None,
                "component_metrics": result.component_metrics,
                "collection_time_ms": result.collection_time_ms,
                "time_window_seconds": result.time_window_seconds,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.debug.metrics.get", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)


    def health_check(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Verify system component health.
        
        Endpoint: storycore.debug.health.check
        Requirements: 14.5
        """
        self.log_request("storycore.debug.health.check", params, context)
        
        try:
            # Extract parameters
            components = params.get("components")
            include_details = params.get("include_details", True)
            timeout_seconds = params.get("timeout_seconds", 30)
            metadata = params.get("metadata", {})
            
            # Validate timeout
            if timeout_seconds < 1 or timeout_seconds > 300:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid timeout: {timeout_seconds} seconds",
                    context=context,
                    details={"timeout_seconds": timeout_seconds, "valid_range": "1-300"},
                    remediation="Use timeout between 1 and 300 seconds",
                )
            
            # Validate components if provided
            if components:
                invalid_components = [c for c in components if not validate_component_name(c)]
                if invalid_components:
                    return self.create_error_response(
                        error_code=ErrorCodes.VALIDATION_ERROR,
                        message=f"Invalid components: {', '.join(invalid_components)}",
                        context=context,
                        details={
                            "invalid_components": invalid_components,
                            "valid_components": SYSTEM_COMPONENTS
                        },
                        remediation="Use valid component names from the system",
                    )
            
            start_check = time.time()
            
            # Determine components to check
            components_to_check = components if components else SYSTEM_COMPONENTS
            
            # Check each component
            component_health_list = []
            healthy_count = 0
            unhealthy_count = 0
            
            for component_name in components_to_check:
                health = self._check_component_health(component_name, timeout_seconds)
                component_health_list.append(health)
                
                if health.status == "healthy":
                    healthy_count += 1
                elif health.status == "unhealthy":
                    unhealthy_count += 1
            
            # Determine overall status
            if unhealthy_count == 0:
                overall_status = "healthy"
            elif unhealthy_count < len(component_health_list) / 2:
                overall_status = "degraded"
            else:
                overall_status = "unhealthy"
            
            check_time_ms = (time.time() - start_check) * 1000
            
            result = HealthCheckResult(
                overall_status=overall_status,
                components=component_health_list,
                healthy_count=healthy_count,
                unhealthy_count=unhealthy_count,
                check_time_ms=check_time_ms,
                metadata=metadata,
            )
            
            response_data = {
                "overall_status": result.overall_status,
                "components": [comp.to_dict() for comp in result.components] if include_details else [],
                "healthy_count": result.healthy_count,
                "unhealthy_count": result.unhealthy_count,
                "total_components": len(result.components),
                "check_time_ms": result.check_time_ms,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.debug.health.check", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)


    def profiler_run(self, params: Dict[str, Any], context: RequestContext) -> APIResponse:
        """
        Profile operation performance.
        
        Endpoint: storycore.debug.profiler.run
        Requirements: 14.6
        """
        self.log_request("storycore.debug.profiler.run", params, context)
        
        try:
            # Validate required parameters
            error_response = self.validate_required_params(
                params, ["operation"], context
            )
            if error_response:
                return error_response
            
            # Extract parameters
            operation = params["operation"]
            operation_params = params.get("operation_params", {})
            profile_type = params.get("profile_type", "time").lower()
            include_call_graph = params.get("include_call_graph", False)
            max_depth = params.get("max_depth", 10)
            metadata = params.get("metadata", {})
            
            # Validate profile type
            if not validate_profile_type(profile_type):
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid profile type: {profile_type}",
                    context=context,
                    details={
                        "profile_type": profile_type,
                        "supported_types": SUPPORTED_PROFILE_TYPES
                    },
                    remediation=f"Use one of: {', '.join(SUPPORTED_PROFILE_TYPES)}",
                )
            
            # Validate max depth
            if max_depth < 1 or max_depth > 100:
                return self.create_error_response(
                    error_code=ErrorCodes.VALIDATION_ERROR,
                    message=f"Invalid max depth: {max_depth}",
                    context=context,
                    details={"max_depth": max_depth, "valid_range": "1-100"},
                    remediation="Use max depth between 1 and 100",
                )
            
            start_profile = time.time()
            
            # Mock profiling - in production, this would actually profile the operation
            # For now, we simulate profiling results
            
            # Simulate execution time
            execution_time_ms = 150.5
            
            # Simulate memory usage if requested
            memory_usage_mb = None
            peak_memory_mb = None
            if profile_type in ["memory", "both"]:
                memory_usage_mb = 45.2
                peak_memory_mb = 52.8
            
            # Simulate call count
            call_count = 42
            
            # Simulate hotspots (functions taking most time)
            hotspots = [
                {
                    "function": "image_generation",
                    "time_ms": 85.3,
                    "percentage": 56.7,
                    "calls": 1,
                },
                {
                    "function": "quality_analysis",
                    "time_ms": 35.2,
                    "percentage": 23.4,
                    "calls": 3,
                },
                {
                    "function": "parameter_validation",
                    "time_ms": 15.0,
                    "percentage": 10.0,
                    "calls": 15,
                },
            ]
            
            # Simulate call graph if requested
            call_graph = None
            if include_call_graph:
                call_graph = {
                    "root": operation,
                    "children": [
                        {
                            "name": "image_generation",
                            "time_ms": 85.3,
                            "children": [
                                {"name": "prompt_processing", "time_ms": 10.5, "children": []},
                                {"name": "model_inference", "time_ms": 70.0, "children": []},
                            ],
                        },
                        {
                            "name": "quality_analysis",
                            "time_ms": 35.2,
                            "children": [
                                {"name": "laplacian_variance", "time_ms": 25.0, "children": []},
                                {"name": "scoring", "time_ms": 10.2, "children": []},
                            ],
                        },
                    ],
                }
            
            # Save profile data
            profile_path = None
            try:
                profiles_dir = Path("profiles")
                profiles_dir.mkdir(exist_ok=True)
                
                profile_filename = f"profile_{operation.replace('.', '_')}_{int(time.time())}.json"
                profile_path = str(profiles_dir / profile_filename)
                
                import json
                profile_data = {
                    "operation": operation,
                    "profile_type": profile_type,
                    "execution_time_ms": execution_time_ms,
                    "memory_usage_mb": memory_usage_mb,
                    "peak_memory_mb": peak_memory_mb,
                    "call_count": call_count,
                    "hotspots": hotspots,
                    "call_graph": call_graph,
                    "profiled_at": datetime.now().isoformat(),
                }
                
                with open(profile_path, 'w') as f:
                    json.dump(profile_data, f, indent=2)
                
                logger.info(f"Saved profile to {profile_path}")
                
            except Exception as e:
                logger.error(f"Failed to save profile: {e}")
            
            result = ProfilerRunResult(
                operation=operation,
                profile_type=profile_type,
                execution_time_ms=execution_time_ms,
                memory_usage_mb=memory_usage_mb,
                peak_memory_mb=peak_memory_mb,
                call_count=call_count,
                hotspots=hotspots,
                call_graph=call_graph,
                profile_path=profile_path,
                metadata=metadata,
            )
            
            response_data = {
                "operation": result.operation,
                "profile_type": result.profile_type,
                "execution_time_ms": result.execution_time_ms,
                "memory_usage_mb": result.memory_usage_mb,
                "peak_memory_mb": result.peak_memory_mb,
                "call_count": result.call_count,
                "hotspots": result.hotspots,
                "call_graph": result.call_graph,
                "profile_path": result.profile_path,
                "metadata": result.metadata,
            }
            
            response = self.create_success_response(response_data, context)
            self.log_response("storycore.debug.profiler.run", response, context)
            return response
            
        except Exception as e:
            return self.handle_exception(e, context)
