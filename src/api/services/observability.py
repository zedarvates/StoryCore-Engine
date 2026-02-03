"""
Observability Service

This module provides logging, tracing, and metrics functionality for the API system.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime
import logging
import uuid
import json
import threading


logger = logging.getLogger(__name__)


@dataclass
class TraceContext:
    """Context for distributed tracing."""
    
    trace_id: str
    span_id: str
    parent_span_id: Optional[str] = None
    start_time: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def create_child_span(self) -> "TraceContext":
        """Create a child span for nested operations."""
        return TraceContext(
            trace_id=self.trace_id,
            span_id=str(uuid.uuid4()),
            parent_span_id=self.span_id,
            metadata=self.metadata.copy(),
        )
    
    def get_duration_ms(self) -> float:
        """Get duration of this span in milliseconds."""
        duration = datetime.now() - self.start_time
        return duration.total_seconds() * 1000


@dataclass
class APICallLog:
    """Log entry for an API call."""
    
    request_id: str
    timestamp: datetime
    endpoint: str
    method: str
    user_id: Optional[str]
    params: Dict[str, Any]
    status: str
    duration_ms: float
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/export."""
        return {
            "request_id": self.request_id,
            "timestamp": self.timestamp.isoformat(),
            "endpoint": self.endpoint,
            "method": self.method,
            "user_id": self.user_id,
            "params": self.params,
            "status": self.status,
            "duration_ms": self.duration_ms,
            "error_code": self.error_code,
            "error_message": self.error_message,
        }


@dataclass
class Metric:
    """A recorded metric."""
    
    name: str
    value: float
    timestamp: datetime
    tags: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/export."""
        return {
            "name": self.name,
            "value": self.value,
            "timestamp": self.timestamp.isoformat(),
            "tags": self.tags,
        }


class ObservabilityService:
    """
    Service for logging, tracing, and metrics collection.
    
    Provides:
    - Structured logging with request context
    - Request/response logging with sanitization
    - Request ID generation and tracking
    - Metrics recording
    - Distributed tracing support
    """
    
    def __init__(
        self,
        log_level: str = "INFO",
        sanitize_params: bool = True,
        max_log_entries: int = 10000,
        max_metrics: int = 10000,
    ):
        """
        Initialize observability service.
        
        Args:
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR)
            sanitize_params: Whether to sanitize sensitive parameters
            max_log_entries: Maximum number of log entries to keep in memory
            max_metrics: Maximum number of metrics to keep in memory
        """
        self.log_level = log_level
        self.sanitize_params = sanitize_params
        self.max_log_entries = max_log_entries
        self.max_metrics = max_metrics
        
        # In-memory storage
        self.api_call_logs: List[APICallLog] = []
        self.metrics: List[Metric] = []
        self.active_traces: Dict[str, TraceContext] = {}
        
        # Thread safety
        self.lock = threading.Lock()
        
        # Configure logger
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(getattr(logging, log_level.upper()))
    
    def generate_request_id(self) -> str:
        """
        Generate a unique request ID.
        
        Returns:
            Unique request identifier
        """
        return f"req_{uuid.uuid4().hex[:16]}"
    
    def log_request(
        self,
        request_id: str,
        endpoint: str,
        method: str,
        params: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> None:
        """
        Log an API request.
        
        Args:
            request_id: Request identifier
            endpoint: Endpoint path
            method: HTTP method
            params: Request parameters
            user_id: User identifier
        """
        # Sanitize params if configured
        logged_params = params
        if self.sanitize_params:
            logged_params = self._sanitize_params(params)
        
        self.logger.info(
            f"API Request: {method} {endpoint}",
            extra={
                "request_id": request_id,
                "endpoint": endpoint,
                "method": method,
                "user_id": user_id,
                "params": logged_params,
            }
        )
    
    def log_response(
        self,
        request_id: str,
        endpoint: str,
        method: str,
        user_id: Optional[str],
        params: Dict[str, Any],
        status: str,
        duration_ms: float,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Log an API response.
        
        Args:
            request_id: Request identifier
            endpoint: Endpoint path
            method: HTTP method
            user_id: User identifier
            params: Request parameters
            status: Response status (success, error, pending)
            duration_ms: Request duration in milliseconds
            error_code: Error code if status is error
            error_message: Error message if status is error
        """
        # Sanitize params if configured
        logged_params = params
        if self.sanitize_params:
            logged_params = self._sanitize_params(params)
        
        # Create log entry
        log_entry = APICallLog(
            request_id=request_id,
            timestamp=datetime.now(),
            endpoint=endpoint,
            method=method,
            user_id=user_id,
            params=logged_params,
            status=status,
            duration_ms=duration_ms,
            error_code=error_code,
            error_message=error_message,
        )
        
        # Store log entry
        with self.lock:
            self.api_call_logs.append(log_entry)
            
            # Trim if exceeds max
            if len(self.api_call_logs) > self.max_log_entries:
                self.api_call_logs = self.api_call_logs[-self.max_log_entries:]
        
        # Log to standard logger
        log_level = logging.INFO if status == "success" else logging.ERROR
        self.logger.log(
            log_level,
            f"API Response: {method} {endpoint} - {status} ({duration_ms:.2f}ms)",
            extra={
                "request_id": request_id,
                "endpoint": endpoint,
                "method": method,
                "user_id": user_id,
                "status": status,
                "duration_ms": duration_ms,
                "error_code": error_code,
            }
        )
    
    def start_trace(
        self,
        operation: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TraceContext:
        """
        Start a distributed trace.
        
        Args:
            operation: Operation name
            metadata: Additional metadata
            
        Returns:
            Trace context
        """
        trace_id = str(uuid.uuid4())
        span_id = str(uuid.uuid4())
        
        trace_context = TraceContext(
            trace_id=trace_id,
            span_id=span_id,
            metadata=metadata or {},
        )
        
        with self.lock:
            self.active_traces[trace_id] = trace_context
        
        self.logger.debug(
            f"Started trace: {operation}",
            extra={
                "trace_id": trace_id,
                "span_id": span_id,
                "operation": operation,
            }
        )
        
        return trace_context
    
    def end_trace(self, trace_context: TraceContext) -> None:
        """
        End a distributed trace.
        
        Args:
            trace_context: Trace context to end
        """
        duration_ms = trace_context.get_duration_ms()
        
        with self.lock:
            if trace_context.trace_id in self.active_traces:
                del self.active_traces[trace_context.trace_id]
        
        self.logger.debug(
            f"Ended trace: {trace_context.trace_id} ({duration_ms:.2f}ms)",
            extra={
                "trace_id": trace_context.trace_id,
                "span_id": trace_context.span_id,
                "duration_ms": duration_ms,
            }
        )
    
    def record_metric(
        self,
        metric_name: str,
        value: float,
        tags: Optional[Dict[str, str]] = None,
    ) -> None:
        """
        Record a performance metric.
        
        Args:
            metric_name: Name of the metric
            value: Metric value
            tags: Optional tags for filtering/grouping
        """
        metric = Metric(
            name=metric_name,
            value=value,
            timestamp=datetime.now(),
            tags=tags or {},
        )
        
        with self.lock:
            self.metrics.append(metric)
            
            # Trim if exceeds max
            if len(self.metrics) > self.max_metrics:
                self.metrics = self.metrics[-self.max_metrics:]
        
        self.logger.debug(
            f"Recorded metric: {metric_name}={value}",
            extra={
                "metric_name": metric_name,
                "value": value,
                "tags": tags,
            }
        )
    
    def get_logs(
        self,
        limit: Optional[int] = None,
        endpoint: Optional[str] = None,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[APICallLog]:
        """
        Get API call logs with optional filtering.
        
        Args:
            limit: Maximum number of logs to return
            endpoint: Filter by endpoint
            user_id: Filter by user
            status: Filter by status
            
        Returns:
            List of log entries
        """
        with self.lock:
            logs = self.api_call_logs.copy()
        
        # Apply filters
        if endpoint:
            logs = [log for log in logs if log.endpoint == endpoint]
        
        if user_id:
            logs = [log for log in logs if log.user_id == user_id]
        
        if status:
            logs = [log for log in logs if log.status == status]
        
        # Apply limit
        if limit:
            logs = logs[-limit:]
        
        return logs
    
    def get_metrics(
        self,
        metric_name: Optional[str] = None,
        tags: Optional[Dict[str, str]] = None,
        limit: Optional[int] = None,
    ) -> List[Metric]:
        """
        Get recorded metrics with optional filtering.
        
        Args:
            metric_name: Filter by metric name
            tags: Filter by tags
            limit: Maximum number of metrics to return
            
        Returns:
            List of metrics
        """
        with self.lock:
            metrics = self.metrics.copy()
        
        # Apply filters
        if metric_name:
            metrics = [m for m in metrics if m.name == metric_name]
        
        if tags:
            metrics = [
                m for m in metrics
                if all(m.tags.get(k) == v for k, v in tags.items())
            ]
        
        # Apply limit
        if limit:
            metrics = metrics[-limit:]
        
        return metrics
    
    def export_logs(self, filepath: str) -> None:
        """
        Export logs to a JSON file.
        
        Args:
            filepath: Path to export file
        """
        with self.lock:
            logs = [log.to_dict() for log in self.api_call_logs]
        
        with open(filepath, 'w') as f:
            json.dump(logs, f, indent=2)
        
        self.logger.info(f"Exported {len(logs)} log entries to {filepath}")
    
    def export_metrics(self, filepath: str) -> None:
        """
        Export metrics to a JSON file.
        
        Args:
            filepath: Path to export file
        """
        with self.lock:
            metrics = [metric.to_dict() for metric in self.metrics]
        
        with open(filepath, 'w') as f:
            json.dump(metrics, f, indent=2)
        
        self.logger.info(f"Exported {len(metrics)} metrics to {filepath}")
    
    def clear_logs(self) -> int:
        """
        Clear all stored logs.
        
        Returns:
            Number of logs cleared
        """
        with self.lock:
            count = len(self.api_call_logs)
            self.api_call_logs.clear()
        
        self.logger.info(f"Cleared {count} log entries")
        return count
    
    def clear_metrics(self) -> int:
        """
        Clear all stored metrics.
        
        Returns:
            Number of metrics cleared
        """
        with self.lock:
            count = len(self.metrics)
            self.metrics.clear()
        
        self.logger.info(f"Cleared {count} metrics")
        return count
    
    def _sanitize_params(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize sensitive parameters for logging.
        
        Args:
            params: Original parameters
            
        Returns:
            Sanitized parameters
        """
        sensitive_keys = {
            "password", "token", "api_key", "secret", "credential",
            "auth", "authorization", "private_key", "access_token",
            "refresh_token", "session_id", "cookie",
        }
        
        sanitized = {}
        for key, value in params.items():
            if any(sensitive in key.lower() for sensitive in sensitive_keys):
                sanitized[key] = "***REDACTED***"
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_params(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    self._sanitize_params(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                sanitized[key] = value
        
        return sanitized
