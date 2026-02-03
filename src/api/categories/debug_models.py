"""
Debug and Diagnostic API Data Models

This module defines data models for debug and diagnostic operations including
log retrieval, tracing, metrics, health checks, and profiling.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum


class LogLevel(str, Enum):
    """Log level enumeration."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class ComponentStatus(str, Enum):
    """Component health status."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class LogEntry:
    """A single log entry."""
    timestamp: datetime
    level: str
    component: str
    message: str
    request_id: Optional[str] = None
    user: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "level": self.level,
            "component": self.component,
            "message": self.message,
            "request_id": self.request_id,
            "user": self.user,
            "details": self.details,
        }


@dataclass
class LogsGetRequest:
    """Request for retrieving log entries."""
    level: Optional[str] = None  # Filter by log level
    component: Optional[str] = None  # Filter by component
    start_time: Optional[datetime] = None  # Filter by time range
    end_time: Optional[datetime] = None
    search_text: Optional[str] = None  # Search in messages
    limit: int = 100  # Maximum number of entries to return
    offset: int = 0  # Pagination offset
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LogsGetResult:
    """Result of log retrieval."""
    entries: List[LogEntry]
    total_count: int
    filtered_count: int
    retrieval_time_ms: float
    filters_applied: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TraceEnableRequest:
    """Request to enable operation tracing."""
    components: Optional[List[str]] = None  # Specific components to trace (None = all)
    trace_level: str = "detailed"  # "basic", "detailed", "verbose"
    include_timing: bool = True
    include_parameters: bool = True
    include_results: bool = False  # Can be large
    max_trace_size_mb: int = 100
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TraceEnableResult:
    """Result of enabling tracing."""
    enabled: bool
    trace_id: str
    components_traced: List[str]
    trace_level: str
    configuration: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TraceDisableRequest:
    """Request to disable operation tracing."""
    trace_id: Optional[str] = None  # Specific trace to disable (None = all)
    save_trace: bool = True  # Save trace data before disabling
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TraceDisableResult:
    """Result of disabling tracing."""
    disabled: bool
    trace_saved: bool
    trace_id: Optional[str] = None
    trace_path: Optional[str] = None
    trace_size_bytes: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SystemMetrics:
    """System performance metrics."""
    cpu_usage_percent: float
    memory_usage_mb: float
    memory_total_mb: float
    memory_percent: float
    disk_usage_gb: float
    disk_total_gb: float
    disk_percent: float
    uptime_seconds: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "cpu_usage_percent": self.cpu_usage_percent,
            "memory_usage_mb": self.memory_usage_mb,
            "memory_total_mb": self.memory_total_mb,
            "memory_percent": self.memory_percent,
            "disk_usage_gb": self.disk_usage_gb,
            "disk_total_gb": self.disk_total_gb,
            "disk_percent": self.disk_percent,
            "uptime_seconds": self.uptime_seconds,
        }


@dataclass
class APIMetrics:
    """API performance metrics."""
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_latency_ms: float
    p50_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    requests_per_second: float
    error_rate: float
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "average_latency_ms": self.average_latency_ms,
            "p50_latency_ms": self.p50_latency_ms,
            "p95_latency_ms": self.p95_latency_ms,
            "p99_latency_ms": self.p99_latency_ms,
            "requests_per_second": self.requests_per_second,
            "error_rate": self.error_rate,
        }


@dataclass
class MetricsGetRequest:
    """Request for system metrics."""
    include_system: bool = True
    include_api: bool = True
    include_components: bool = True
    time_window_seconds: int = 300  # Last 5 minutes by default
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MetricsGetResult:
    """Result of metrics retrieval."""
    system_metrics: Optional[SystemMetrics] = None
    api_metrics: Optional[APIMetrics] = None
    component_metrics: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    collection_time_ms: float = 0.0
    time_window_seconds: int = 300
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ComponentHealth:
    """Health status of a system component."""
    component_name: str
    status: str  # "healthy", "degraded", "unhealthy", "unknown"
    response_time_ms: Optional[float] = None
    error_message: Optional[str] = None
    last_check: Optional[datetime] = None
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "component_name": self.component_name,
            "status": self.status,
            "response_time_ms": self.response_time_ms,
            "error_message": self.error_message,
            "last_check": self.last_check.isoformat() if self.last_check else None,
            "details": self.details,
        }


@dataclass
class HealthCheckRequest:
    """Request for health check."""
    components: Optional[List[str]] = None  # Specific components to check (None = all)
    include_details: bool = True
    timeout_seconds: int = 30
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class HealthCheckResult:
    """Result of health check."""
    overall_status: str  # "healthy", "degraded", "unhealthy"
    components: List[ComponentHealth]
    healthy_count: int
    unhealthy_count: int
    check_time_ms: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProfilerRunRequest:
    """Request to run profiler on an operation."""
    operation: str  # Operation to profile (e.g., "storycore.image.generate")
    operation_params: Dict[str, Any] = field(default_factory=dict)
    profile_type: str = "time"  # "time", "memory", "both"
    include_call_graph: bool = False
    max_depth: int = 10
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProfilerRunResult:
    """Result of profiler run."""
    operation: str
    profile_type: str
    execution_time_ms: float
    memory_usage_mb: Optional[float] = None
    peak_memory_mb: Optional[float] = None
    call_count: int = 0
    hotspots: List[Dict[str, Any]] = field(default_factory=list)
    call_graph: Optional[Dict[str, Any]] = None
    profile_path: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


# Supported log levels
SUPPORTED_LOG_LEVELS = [level.value for level in LogLevel]

# Supported trace levels
SUPPORTED_TRACE_LEVELS = ["basic", "detailed", "verbose"]

# Supported profile types
SUPPORTED_PROFILE_TYPES = ["time", "memory", "both"]

# System components to monitor
SYSTEM_COMPONENTS = [
    "api_router",
    "auth_service",
    "rate_limit_service",
    "cache_service",
    "task_manager",
    "narration_handler",
    "pipeline_handler",
    "memory_handler",
    "qa_handler",
    "prompt_handler",
    "image_handler",
    "audio_handler",
    "storyboard_handler",
    "video_handler",
    "knowledge_handler",
    "multilingual_handler",
    "export_handler",
    "debug_handler",
    "security_handler",
    "comfyui_backend",
    "llm_service",
    "storage_system",
]


def validate_log_level(level: str) -> bool:
    """Validate if log level is supported."""
    return level.upper() in SUPPORTED_LOG_LEVELS


def validate_trace_level(level: str) -> bool:
    """Validate if trace level is supported."""
    return level.lower() in SUPPORTED_TRACE_LEVELS


def validate_profile_type(profile_type: str) -> bool:
    """Validate if profile type is supported."""
    return profile_type.lower() in SUPPORTED_PROFILE_TYPES


def validate_component_name(component: str) -> bool:
    """Validate if component name is recognized."""
    return component in SYSTEM_COMPONENTS
