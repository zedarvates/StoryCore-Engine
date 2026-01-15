"""
ComfyUI Performance Monitor
Comprehensive performance monitoring, metrics collection, and optimization analysis.
"""

import asyncio
import logging
import time
import psutil
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Tuple
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import json

from .comfyui_config import ComfyUIConfig
from .comfyui_models import (
    PerformanceMetrics, ComfyUIWorkflow, ExecutionResult, SystemStats
)


class MetricType(Enum):
    """Types of performance metrics."""
    LATENCY = "latency"
    THROUGHPUT = "throughput"
    RESOURCE_USAGE = "resource_usage"
    ERROR_RATE = "error_rate"
    QUEUE_DEPTH = "queue_depth"
    WORKFLOW_COMPLEXITY = "workflow_complexity"


class AlertSeverity(Enum):
    """Performance alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class PerformanceThreshold:
    """Performance threshold configuration."""
    metric_name: str
    warning_threshold: float
    critical_threshold: float
    unit: str = ""
    description: str = ""


@dataclass
class PerformanceAlert:
    """Performance alert information."""
    alert_id: str
    timestamp: datetime
    severity: AlertSeverity
    metric_name: str
    current_value: float
    threshold_value: float
    message: str
    suggestions: List[str] = field(default_factory=list)


@dataclass
class WorkflowComplexityAnalysis:
    """Workflow complexity analysis results."""
    workflow_id: str
    node_count: int
    connection_count: int
    estimated_memory_mb: float
    estimated_processing_time_seconds: float
    complexity_score: float
    bottleneck_nodes: List[str] = field(default_factory=list)
    optimization_suggestions: List[str] = field(default_factory=list)


@dataclass
class ResourceUsageSnapshot:
    """System resource usage snapshot."""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_available_mb: float
    disk_usage_percent: float
    gpu_memory_used_mb: float = 0.0
    gpu_memory_total_mb: float = 0.0
    gpu_utilization_percent: float = 0.0


class PerformanceMonitor:
    """
    Comprehensive performance monitoring system for ComfyUI integration.
    
    Provides metrics collection, workflow complexity analysis, resource management,
    performance alerts, and optimization recommendations.
    """
    
    def __init__(self, config: ComfyUIConfig):
        """
        Initialize Performance Monitor.
        
        Args:
            config: ComfyUI configuration for monitoring settings.
        """
        self.config = config
        self.logger = self._setup_logging()
        
        # Metrics storage
        self._metrics_history: List[PerformanceMetrics] = []
        self._resource_snapshots: List[ResourceUsageSnapshot] = []
        self._workflow_analyses: Dict[str, WorkflowComplexityAnalysis] = {}
        
        # Performance tracking
        self._active_operations: Dict[str, float] = {}  # operation_id -> start_time
        self._operation_counts: Dict[str, int] = {}
        self._error_counts: Dict[str, int] = {}
        
        # Alert system
        self._performance_alerts: List[PerformanceAlert] = []
        self._alert_callbacks: List[Callable[[PerformanceAlert], None]] = []
        
        # Monitoring configuration
        self._monitoring_active = False
        self._monitoring_interval = 5.0  # seconds
        self._monitoring_task: Optional[asyncio.Task] = None
        
        # Performance thresholds
        self._thresholds = self._setup_default_thresholds()
        
        # Resource monitoring
        self._resource_monitor_thread: Optional[threading.Thread] = None
        self._resource_monitor_stop_event = threading.Event()
        
        self.logger.info("Performance Monitor initialized")
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging for the performance monitor."""
        logger = logging.getLogger("comfyui_performance_monitor")
        logger.setLevel(getattr(logging, self.config.log_level))
        
        # Create console handler if not already exists
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _setup_default_thresholds(self) -> Dict[str, PerformanceThreshold]:
        """Set up default performance thresholds."""
        return {
            "service_start_time": PerformanceThreshold(
                metric_name="service_start_time",
                warning_threshold=30.0,
                critical_threshold=60.0,
                unit="seconds",
                description="ComfyUI service startup time"
            ),
            "workflow_execution_time": PerformanceThreshold(
                metric_name="workflow_execution_time",
                warning_threshold=120.0,
                critical_threshold=300.0,
                unit="seconds",
                description="Workflow execution time"
            ),
            "health_check_response_time": PerformanceThreshold(
                metric_name="health_check_response_time",
                warning_threshold=5000.0,
                critical_threshold=10000.0,
                unit="milliseconds",
                description="Health check response time"
            ),
            "memory_usage": PerformanceThreshold(
                metric_name="memory_usage",
                warning_threshold=80.0,
                critical_threshold=95.0,
                unit="percent",
                description="System memory usage"
            ),
            "cpu_usage": PerformanceThreshold(
                metric_name="cpu_usage",
                warning_threshold=85.0,
                critical_threshold=95.0,
                unit="percent",
                description="CPU usage"
            ),
            "error_rate": PerformanceThreshold(
                metric_name="error_rate",
                warning_threshold=5.0,
                critical_threshold=15.0,
                unit="percent",
                description="Error rate"
            ),
            "queue_depth": PerformanceThreshold(
                metric_name="queue_depth",
                warning_threshold=10.0,
                critical_threshold=25.0,
                unit="items",
                description="Workflow queue depth"
            )
        }
    
    def start_monitoring(self) -> None:
        """Start performance monitoring."""
        if self._monitoring_active:
            self.logger.warning("Performance monitoring is already active")
            return
        
        self._monitoring_active = True
        
        # Start resource monitoring thread
        self._resource_monitor_stop_event.clear()
        self._resource_monitor_thread = threading.Thread(
            target=self._resource_monitor_loop,
            daemon=True
        )
        self._resource_monitor_thread.start()
        
        self.logger.info("Performance monitoring started")
    
    def stop_monitoring(self) -> None:
        """Stop performance monitoring."""
        if not self._monitoring_active:
            return
        
        self._monitoring_active = False
        
        # Stop resource monitoring thread
        if self._resource_monitor_thread:
            self._resource_monitor_stop_event.set()
            self._resource_monitor_thread.join(timeout=5.0)
            self._resource_monitor_thread = None
        
        # Cancel async monitoring task
        if self._monitoring_task and not self._monitoring_task.done():
            self._monitoring_task.cancel()
        
        self.logger.info("Performance monitoring stopped")
    
    def _resource_monitor_loop(self) -> None:
        """Resource monitoring loop running in separate thread."""
        while not self._resource_monitor_stop_event.is_set():
            try:
                snapshot = self._collect_resource_snapshot()
                self._resource_snapshots.append(snapshot)
                
                # Limit snapshot history
                if len(self._resource_snapshots) > 1000:
                    self._resource_snapshots = self._resource_snapshots[-1000:]
                
                # Check for performance alerts
                self._check_resource_thresholds(snapshot)
                
            except Exception as e:
                self.logger.error(f"Error in resource monitoring: {e}")
            
            # Wait for next interval
            self._resource_monitor_stop_event.wait(self._monitoring_interval)
    
    def _collect_resource_snapshot(self) -> ResourceUsageSnapshot:
        """Collect current system resource usage."""
        try:
            # CPU and memory
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # GPU information (if available)
            gpu_memory_used = 0.0
            gpu_memory_total = 0.0
            gpu_utilization = 0.0
            
            try:
                import GPUtil
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu = gpus[0]  # Use first GPU
                    gpu_memory_used = gpu.memoryUsed
                    gpu_memory_total = gpu.memoryTotal
                    gpu_utilization = gpu.load * 100
            except ImportError:
                pass  # GPU monitoring not available
            except Exception as e:
                self.logger.debug(f"GPU monitoring error: {e}")
            
            return ResourceUsageSnapshot(
                timestamp=datetime.utcnow(),
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                memory_used_mb=memory.used / (1024 * 1024),
                memory_available_mb=memory.available / (1024 * 1024),
                disk_usage_percent=disk.percent,
                gpu_memory_used_mb=gpu_memory_used,
                gpu_memory_total_mb=gpu_memory_total,
                gpu_utilization_percent=gpu_utilization
            )
            
        except Exception as e:
            self.logger.error(f"Failed to collect resource snapshot: {e}")
            return ResourceUsageSnapshot(
                timestamp=datetime.utcnow(),
                cpu_percent=0.0,
                memory_percent=0.0,
                memory_used_mb=0.0,
                memory_available_mb=0.0,
                disk_usage_percent=0.0
            )
    
    def record_operation_start(self, operation_name: str, operation_id: str) -> None:
        """Record the start of a performance-monitored operation."""
        self._active_operations[operation_id] = time.time()
        self._operation_counts[operation_name] = self._operation_counts.get(operation_name, 0) + 1
        
        self.logger.debug(f"Started monitoring operation: {operation_name} ({operation_id})")
    
    def record_operation_end(
        self, 
        operation_name: str, 
        operation_id: str, 
        success: bool = True,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[PerformanceMetrics]:
        """
        Record the end of a performance-monitored operation.
        
        Args:
            operation_name: Name of the operation.
            operation_id: Unique identifier for this operation instance.
            success: Whether the operation succeeded.
            metadata: Additional metadata about the operation.
            
        Returns:
            PerformanceMetrics object if operation was being tracked.
        """
        if operation_id not in self._active_operations:
            self.logger.warning(f"Operation {operation_id} not found in active operations")
            return None
        
        start_time = self._active_operations.pop(operation_id)
        duration = time.time() - start_time
        
        # Create performance metrics
        metrics = PerformanceMetrics(
            operation_type=operation_name,
            start_time=datetime.fromtimestamp(start_time),
            duration_seconds=duration,
            success=success,
            metadata=metadata or {}
        )
        
        # Store metrics
        self._metrics_history.append(metrics)
        
        # Limit metrics history
        if len(self._metrics_history) > 10000:
            self._metrics_history = self._metrics_history[-10000:]
        
        # Record errors
        if not success:
            self._error_counts[operation_name] = self._error_counts.get(operation_name, 0) + 1
        
        # Check performance thresholds
        self._check_operation_thresholds(operation_name, duration, success)
        
        self.logger.debug(f"Completed monitoring operation: {operation_name} ({duration:.3f}s)")
        
        return metrics
    
    def analyze_workflow_complexity(self, workflow: ComfyUIWorkflow) -> WorkflowComplexityAnalysis:
        """
        Analyze workflow complexity and provide optimization recommendations.
        
        Args:
            workflow: ComfyUI workflow to analyze.
            
        Returns:
            WorkflowComplexityAnalysis with complexity metrics and suggestions.
        """
        try:
            workflow_dict = workflow.to_comfyui_format()
            nodes = workflow_dict  # to_comfyui_format returns nodes directly
            
            # Basic complexity metrics
            node_count = len(nodes)
            connection_count = sum(
                len(node.get("inputs", {})) for node in nodes.values()
            )
            
            # Estimate memory usage based on node types
            estimated_memory = self._estimate_workflow_memory(nodes)
            
            # Estimate processing time based on node complexity
            estimated_time = self._estimate_workflow_processing_time(nodes)
            
            # Calculate complexity score (0-100)
            complexity_score = min(100, (
                (node_count * 2) +
                (connection_count * 1.5) +
                (estimated_memory / 100) +
                (estimated_time / 10)
            ))
            
            # Identify bottleneck nodes
            bottleneck_nodes = self._identify_bottleneck_nodes(nodes)
            
            # Generate optimization suggestions
            optimization_suggestions = self._generate_optimization_suggestions(
                nodes, node_count, connection_count, estimated_memory, estimated_time
            )
            
            analysis = WorkflowComplexityAnalysis(
                workflow_id=workflow.metadata.workflow_id,
                node_count=node_count,
                connection_count=connection_count,
                estimated_memory_mb=estimated_memory,
                estimated_processing_time_seconds=estimated_time,
                complexity_score=complexity_score,
                bottleneck_nodes=bottleneck_nodes,
                optimization_suggestions=optimization_suggestions
            )
            
            # Store analysis
            self._workflow_analyses[workflow.metadata.workflow_id] = analysis
            
            self.logger.info(f"Analyzed workflow {workflow.metadata.workflow_id}: "
                           f"complexity={complexity_score:.1f}, nodes={node_count}, "
                           f"estimated_time={estimated_time:.1f}s")
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Failed to analyze workflow complexity: {e}")
            
            # Return basic analysis on error
            return WorkflowComplexityAnalysis(
                workflow_id=workflow.metadata.workflow_id,
                node_count=0,
                connection_count=0,
                estimated_memory_mb=0.0,
                estimated_processing_time_seconds=0.0,
                complexity_score=0.0,
                optimization_suggestions=["Error analyzing workflow complexity"]
            )
    
    def _estimate_workflow_memory(self, nodes: Dict[str, Any]) -> float:
        """Estimate memory usage for workflow nodes."""
        memory_estimates = {
            "CheckpointLoaderSimple": 4000,  # ~4GB for model
            "VAELoader": 500,  # ~500MB for VAE
            "CLIPTextEncode": 100,  # ~100MB for text encoding
            "KSampler": 2000,  # ~2GB for sampling
            "VAEDecode": 200,  # ~200MB for decoding
            "ControlNetLoader": 1000,  # ~1GB for ControlNet
            "IPAdapterLoader": 800,  # ~800MB for IP-Adapter
            "ImageScale": 50,  # ~50MB for image processing
            "SaveImage": 10,  # ~10MB for saving
        }
        
        total_memory = 0.0
        for node in nodes.values():
            node_type = node.get("class_type", "Unknown")
            memory = memory_estimates.get(node_type, 100)  # Default 100MB
            total_memory += memory
        
        return total_memory
    
    def _estimate_workflow_processing_time(self, nodes: Dict[str, Any]) -> float:
        """Estimate processing time for workflow nodes."""
        time_estimates = {
            "CheckpointLoaderSimple": 5.0,  # Model loading
            "VAELoader": 2.0,  # VAE loading
            "CLIPTextEncode": 1.0,  # Text encoding
            "KSampler": 30.0,  # Main sampling (varies greatly)
            "VAEDecode": 3.0,  # Image decoding
            "ControlNetLoader": 3.0,  # ControlNet loading
            "IPAdapterLoader": 2.0,  # IP-Adapter loading
            "ImageScale": 0.5,  # Image processing
            "SaveImage": 0.2,  # Saving
        }
        
        total_time = 0.0
        for node in nodes.values():
            node_type = node.get("class_type", "Unknown")
            time = time_estimates.get(node_type, 1.0)  # Default 1 second
            total_time += time
        
        return total_time
    
    def _identify_bottleneck_nodes(self, nodes: Dict[str, Any]) -> List[str]:
        """Identify potential bottleneck nodes in the workflow."""
        bottleneck_types = {
            "KSampler": "High computational cost for sampling",
            "CheckpointLoaderSimple": "Large model loading overhead",
            "ControlNetLoader": "ControlNet processing overhead",
            "VAEDecode": "Image decoding can be memory intensive"
        }
        
        bottlenecks = []
        for node_id, node in nodes.items():
            node_type = node.get("class_type", "")
            if node_type in bottleneck_types:
                bottlenecks.append(f"{node_id} ({node_type}): {bottleneck_types[node_type]}")
        
        return bottlenecks
    
    def _generate_optimization_suggestions(
        self, 
        nodes: Dict[str, Any], 
        node_count: int, 
        connection_count: int,
        estimated_memory: float, 
        estimated_time: float
    ) -> List[str]:
        """Generate workflow optimization suggestions."""
        suggestions = []
        
        # Node count suggestions
        if node_count > 20:
            suggestions.append("Consider simplifying workflow - high node count may impact performance")
        
        # Memory suggestions
        if estimated_memory > 8000:  # > 8GB
            suggestions.append("High memory usage detected - consider using smaller models or batch processing")
        
        # Processing time suggestions
        if estimated_time > 120:  # > 2 minutes
            suggestions.append("Long processing time estimated - consider optimizing sampling parameters")
        
        # Node-specific suggestions
        sampler_count = sum(1 for node in nodes.values() if node.get("class_type") == "KSampler")
        if sampler_count > 2:
            suggestions.append("Multiple samplers detected - consider consolidating sampling operations")
        
        controlnet_count = sum(1 for node in nodes.values() if "ControlNet" in node.get("class_type", ""))
        if controlnet_count > 3:
            suggestions.append("Multiple ControlNets may cause memory pressure - consider selective usage")
        
        # Connection complexity
        if connection_count > node_count * 2:
            suggestions.append("High connection complexity - consider simplifying node relationships")
        
        # General suggestions
        suggestions.extend([
            "Use appropriate image resolutions for your use case",
            "Consider caching loaded models for repeated workflows",
            "Monitor GPU memory usage during execution",
            "Use batch processing for multiple similar generations"
        ])
        
        return suggestions
    
    def _check_operation_thresholds(self, operation_name: str, duration: float, success: bool) -> None:
        """Check if operation performance exceeds thresholds."""
        # Map operation names to threshold keys
        threshold_mapping = {
            "service_start": "service_start_time",
            "workflow_execution": "workflow_execution_time",
            "health_check": "health_check_response_time"
        }
        
        threshold_key = threshold_mapping.get(operation_name)
        if not threshold_key or threshold_key not in self._thresholds:
            return
        
        threshold = self._thresholds[threshold_key]
        
        # Convert duration to appropriate units
        if threshold.unit == "milliseconds":
            value = duration * 1000
        else:
            value = duration
        
        # Check thresholds
        if value >= threshold.critical_threshold:
            self._create_alert(
                AlertSeverity.CRITICAL,
                threshold.metric_name,
                value,
                threshold.critical_threshold,
                f"Critical performance threshold exceeded for {operation_name}",
                [
                    f"Operation took {value:.2f} {threshold.unit}, exceeding critical threshold of {threshold.critical_threshold} {threshold.unit}",
                    "Consider investigating system resources and optimization opportunities",
                    "Check for resource contention or configuration issues"
                ]
            )
        elif value >= threshold.warning_threshold:
            self._create_alert(
                AlertSeverity.WARNING,
                threshold.metric_name,
                value,
                threshold.warning_threshold,
                f"Performance warning for {operation_name}",
                [
                    f"Operation took {value:.2f} {threshold.unit}, exceeding warning threshold of {threshold.warning_threshold} {threshold.unit}",
                    "Monitor performance trends and consider optimization"
                ]
            )
    
    def _check_resource_thresholds(self, snapshot: ResourceUsageSnapshot) -> None:
        """Check if resource usage exceeds thresholds."""
        # Check memory usage
        if "memory_usage" in self._thresholds:
            threshold = self._thresholds["memory_usage"]
            if snapshot.memory_percent >= threshold.critical_threshold:
                self._create_alert(
                    AlertSeverity.CRITICAL,
                    "memory_usage",
                    snapshot.memory_percent,
                    threshold.critical_threshold,
                    "Critical memory usage detected",
                    [
                        f"Memory usage at {snapshot.memory_percent:.1f}%, exceeding critical threshold",
                        "Consider freeing memory or reducing workflow complexity",
                        "Monitor for memory leaks or excessive resource usage"
                    ]
                )
            elif snapshot.memory_percent >= threshold.warning_threshold:
                self._create_alert(
                    AlertSeverity.WARNING,
                    "memory_usage",
                    snapshot.memory_percent,
                    threshold.warning_threshold,
                    "High memory usage detected",
                    [
                        f"Memory usage at {snapshot.memory_percent:.1f}%, approaching limits",
                        "Monitor memory usage trends"
                    ]
                )
        
        # Check CPU usage
        if "cpu_usage" in self._thresholds:
            threshold = self._thresholds["cpu_usage"]
            if snapshot.cpu_percent >= threshold.critical_threshold:
                self._create_alert(
                    AlertSeverity.CRITICAL,
                    "cpu_usage",
                    snapshot.cpu_percent,
                    threshold.critical_threshold,
                    "Critical CPU usage detected",
                    [
                        f"CPU usage at {snapshot.cpu_percent:.1f}%, system may be overloaded",
                        "Consider reducing concurrent operations or optimizing workflows"
                    ]
                )
            elif snapshot.cpu_percent >= threshold.warning_threshold:
                self._create_alert(
                    AlertSeverity.WARNING,
                    "cpu_usage",
                    snapshot.cpu_percent,
                    threshold.warning_threshold,
                    "High CPU usage detected",
                    [
                        f"CPU usage at {snapshot.cpu_percent:.1f}%, monitor for sustained high usage"
                    ]
                )
    
    def _create_alert(
        self, 
        severity: AlertSeverity, 
        metric_name: str, 
        current_value: float,
        threshold_value: float, 
        message: str, 
        suggestions: List[str]
    ) -> None:
        """Create and process a performance alert."""
        alert = PerformanceAlert(
            alert_id=f"{metric_name}_{int(time.time())}",
            timestamp=datetime.utcnow(),
            severity=severity,
            metric_name=metric_name,
            current_value=current_value,
            threshold_value=threshold_value,
            message=message,
            suggestions=suggestions
        )
        
        # Store alert
        self._performance_alerts.append(alert)
        
        # Limit alert history
        if len(self._performance_alerts) > 1000:
            self._performance_alerts = self._performance_alerts[-1000:]
        
        # Log alert
        log_level = logging.CRITICAL if severity == AlertSeverity.CRITICAL else logging.WARNING
        self.logger.log(log_level, f"Performance Alert: {message}")
        
        # Notify callbacks
        for callback in self._alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                self.logger.error(f"Error in alert callback: {e}")
    
    def add_alert_callback(self, callback: Callable[[PerformanceAlert], None]) -> None:
        """Add callback to be notified of performance alerts."""
        self._alert_callbacks.append(callback)
        self.logger.debug("Performance alert callback added")
    
    def remove_alert_callback(self, callback: Callable[[PerformanceAlert], None]) -> None:
        """Remove performance alert callback."""
        if callback in self._alert_callbacks:
            self._alert_callbacks.remove(callback)
            self.logger.debug("Performance alert callback removed")
    
    def get_performance_summary(self, time_window_hours: float = 24.0) -> Dict[str, Any]:
        """
        Get comprehensive performance summary.
        
        Args:
            time_window_hours: Time window for metrics analysis.
            
        Returns:
            Dictionary with performance summary information.
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=time_window_hours)
        
        # Filter recent metrics
        recent_metrics = [
            m for m in self._metrics_history 
            if m.start_time >= cutoff_time
        ]
        
        # Filter recent snapshots
        recent_snapshots = [
            s for s in self._resource_snapshots
            if s.timestamp >= cutoff_time
        ]
        
        # Filter recent alerts
        recent_alerts = [
            a for a in self._performance_alerts
            if a.timestamp >= cutoff_time
        ]
        
        # Calculate operation statistics
        operation_stats = {}
        for metric in recent_metrics:
            op_name = metric.operation_type
            if op_name not in operation_stats:
                operation_stats[op_name] = {
                    "count": 0,
                    "total_duration": 0.0,
                    "success_count": 0,
                    "error_count": 0,
                    "min_duration": float('inf'),
                    "max_duration": 0.0
                }
            
            stats = operation_stats[op_name]
            stats["count"] += 1
            stats["total_duration"] += metric.duration_seconds
            
            if metric.success:
                stats["success_count"] += 1
            else:
                stats["error_count"] += 1
            
            stats["min_duration"] = min(stats["min_duration"], metric.duration_seconds)
            stats["max_duration"] = max(stats["max_duration"], metric.duration_seconds)
        
        # Calculate averages and rates
        for stats in operation_stats.values():
            if stats["count"] > 0:
                stats["avg_duration"] = stats["total_duration"] / stats["count"]
                stats["success_rate"] = (stats["success_count"] / stats["count"]) * 100
                stats["error_rate"] = (stats["error_count"] / stats["count"]) * 100
            else:
                stats["avg_duration"] = 0.0
                stats["success_rate"] = 0.0
                stats["error_rate"] = 0.0
            
            # Handle infinite min_duration
            if stats["min_duration"] == float('inf'):
                stats["min_duration"] = 0.0
        
        # Calculate resource statistics
        resource_stats = {}
        if recent_snapshots:
            resource_stats = {
                "avg_cpu_percent": sum(s.cpu_percent for s in recent_snapshots) / len(recent_snapshots),
                "max_cpu_percent": max(s.cpu_percent for s in recent_snapshots),
                "avg_memory_percent": sum(s.memory_percent for s in recent_snapshots) / len(recent_snapshots),
                "max_memory_percent": max(s.memory_percent for s in recent_snapshots),
                "avg_memory_used_mb": sum(s.memory_used_mb for s in recent_snapshots) / len(recent_snapshots),
                "max_memory_used_mb": max(s.memory_used_mb for s in recent_snapshots),
                "avg_gpu_utilization": sum(s.gpu_utilization_percent for s in recent_snapshots) / len(recent_snapshots),
                "max_gpu_utilization": max(s.gpu_utilization_percent for s in recent_snapshots),
                "avg_gpu_memory_used": sum(s.gpu_memory_used_mb for s in recent_snapshots) / len(recent_snapshots),
                "max_gpu_memory_used": max(s.gpu_memory_used_mb for s in recent_snapshots)
            }
        
        # Alert statistics
        alert_stats = {
            "total_alerts": len(recent_alerts),
            "critical_alerts": len([a for a in recent_alerts if a.severity == AlertSeverity.CRITICAL]),
            "warning_alerts": len([a for a in recent_alerts if a.severity == AlertSeverity.WARNING]),
            "info_alerts": len([a for a in recent_alerts if a.severity == AlertSeverity.INFO])
        }
        
        return {
            "time_window_hours": time_window_hours,
            "summary_timestamp": datetime.utcnow().isoformat(),
            "operation_statistics": operation_stats,
            "resource_statistics": resource_stats,
            "alert_statistics": alert_stats,
            "workflow_analyses": len(self._workflow_analyses),
            "monitoring_active": self._monitoring_active,
            "recent_alerts": [
                {
                    "timestamp": a.timestamp.isoformat(),
                    "severity": a.severity.value,
                    "metric": a.metric_name,
                    "message": a.message
                }
                for a in recent_alerts[-10:]  # Last 10 alerts
            ]
        }
    
    def get_workflow_recommendations(self, workflow_id: str) -> Dict[str, Any]:
        """
        Get optimization recommendations for a specific workflow.
        
        Args:
            workflow_id: ID of the workflow to get recommendations for.
            
        Returns:
            Dictionary with workflow-specific recommendations.
        """
        if workflow_id not in self._workflow_analyses:
            return {
                "workflow_id": workflow_id,
                "error": "Workflow analysis not found",
                "recommendations": ["Analyze workflow first to get recommendations"]
            }
        
        analysis = self._workflow_analyses[workflow_id]
        
        # Get execution history for this workflow
        workflow_metrics = [
            m for m in self._metrics_history
            if m.metadata.get("workflow_id") == workflow_id
        ]
        
        # Calculate performance statistics
        performance_stats = {}
        if workflow_metrics:
            durations = [m.duration_seconds for m in workflow_metrics]
            success_count = sum(1 for m in workflow_metrics if m.success)
            
            performance_stats = {
                "execution_count": len(workflow_metrics),
                "success_rate": (success_count / len(workflow_metrics)) * 100,
                "avg_execution_time": sum(durations) / len(durations),
                "min_execution_time": min(durations),
                "max_execution_time": max(durations)
            }
        
        # Generate specific recommendations based on analysis and performance
        recommendations = analysis.optimization_suggestions.copy()
        
        if performance_stats:
            if performance_stats["avg_execution_time"] > 120:  # > 2 minutes
                recommendations.append("Consider reducing sampling steps or image resolution for faster execution")
            
            if performance_stats["success_rate"] < 90:
                recommendations.append("Low success rate detected - check for resource constraints or model compatibility")
        
        return {
            "workflow_id": workflow_id,
            "complexity_analysis": {
                "node_count": analysis.node_count,
                "connection_count": analysis.connection_count,
                "complexity_score": analysis.complexity_score,
                "estimated_memory_mb": analysis.estimated_memory_mb,
                "estimated_processing_time": analysis.estimated_processing_time_seconds,
                "bottleneck_nodes": analysis.bottleneck_nodes
            },
            "performance_statistics": performance_stats,
            "recommendations": recommendations,
            "priority_actions": self._get_priority_actions(analysis, performance_stats)
        }
    
    def _get_priority_actions(
        self, 
        analysis: WorkflowComplexityAnalysis, 
        performance_stats: Dict[str, Any]
    ) -> List[str]:
        """Get priority actions based on analysis and performance."""
        actions = []
        
        # High complexity
        if analysis.complexity_score > 70:
            actions.append("HIGH: Simplify workflow to reduce complexity score")
        
        # High memory usage
        if analysis.estimated_memory_mb > 8000:
            actions.append("HIGH: Reduce memory usage - consider smaller models")
        
        # Performance issues
        if performance_stats and performance_stats.get("avg_execution_time", 0) > 180:
            actions.append("MEDIUM: Optimize for faster execution times")
        
        # Reliability issues
        if performance_stats and performance_stats.get("success_rate", 100) < 85:
            actions.append("HIGH: Investigate and fix reliability issues")
        
        # Bottlenecks
        if analysis.bottleneck_nodes:
            actions.append("MEDIUM: Address identified bottleneck nodes")
        
        if not actions:
            actions.append("LOW: Workflow appears well-optimized")
        
        return actions
    
    def export_metrics(self, filepath: Path, time_window_hours: float = 24.0) -> bool:
        """
        Export performance metrics to JSON file.
        
        Args:
            filepath: Path to export file.
            time_window_hours: Time window for metrics export.
            
        Returns:
            True if export successful, False otherwise.
        """
        try:
            summary = self.get_performance_summary(time_window_hours)
            
            # Add detailed metrics
            cutoff_time = datetime.utcnow() - timedelta(hours=time_window_hours)
            recent_metrics = [
                {
                    "operation_type": m.operation_type,
                    "start_time": m.start_time.isoformat(),
                    "duration_seconds": m.duration_seconds,
                    "success": m.success,
                    "metadata": m.metadata
                }
                for m in self._metrics_history
                if m.start_time >= cutoff_time
            ]
            
            recent_snapshots = [
                {
                    "timestamp": s.timestamp.isoformat(),
                    "cpu_percent": s.cpu_percent,
                    "memory_percent": s.memory_percent,
                    "memory_used_mb": s.memory_used_mb,
                    "gpu_utilization_percent": s.gpu_utilization_percent,
                    "gpu_memory_used_mb": s.gpu_memory_used_mb
                }
                for s in self._resource_snapshots
                if s.timestamp >= cutoff_time
            ]
            
            export_data = {
                "export_timestamp": datetime.utcnow().isoformat(),
                "time_window_hours": time_window_hours,
                "summary": summary,
                "detailed_metrics": recent_metrics,
                "resource_snapshots": recent_snapshots,
                "workflow_analyses": {
                    wid: {
                        "node_count": analysis.node_count,
                        "connection_count": analysis.connection_count,
                        "complexity_score": analysis.complexity_score,
                        "estimated_memory_mb": analysis.estimated_memory_mb,
                        "estimated_processing_time": analysis.estimated_processing_time_seconds,
                        "optimization_suggestions": analysis.optimization_suggestions
                    }
                    for wid, analysis in self._workflow_analyses.items()
                }
            }
            
            with open(filepath, 'w') as f:
                json.dump(export_data, f, indent=2)
            
            self.logger.info(f"Performance metrics exported to {filepath}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to export metrics: {e}")
            return False
    
    def clear_metrics(self, older_than_hours: Optional[float] = None) -> None:
        """
        Clear performance metrics and snapshots.
        
        Args:
            older_than_hours: If specified, only clear metrics older than this many hours.
        """
        if older_than_hours is None:
            # Clear all
            self._metrics_history.clear()
            self._resource_snapshots.clear()
            self._performance_alerts.clear()
            self.logger.info("All performance metrics cleared")
        else:
            # Clear old metrics
            cutoff_time = datetime.utcnow() - timedelta(hours=older_than_hours)
            
            initial_metrics = len(self._metrics_history)
            initial_snapshots = len(self._resource_snapshots)
            initial_alerts = len(self._performance_alerts)
            
            self._metrics_history = [
                m for m in self._metrics_history if m.start_time >= cutoff_time
            ]
            self._resource_snapshots = [
                s for s in self._resource_snapshots if s.timestamp >= cutoff_time
            ]
            self._performance_alerts = [
                a for a in self._performance_alerts if a.timestamp >= cutoff_time
            ]
            
            cleared_metrics = initial_metrics - len(self._metrics_history)
            cleared_snapshots = initial_snapshots - len(self._resource_snapshots)
            cleared_alerts = initial_alerts - len(self._performance_alerts)
            
            self.logger.info(f"Cleared {cleared_metrics} metrics, {cleared_snapshots} snapshots, "
                           f"{cleared_alerts} alerts older than {older_than_hours} hours")
    
    def get_current_resource_usage(self) -> Optional[ResourceUsageSnapshot]:
        """Get current system resource usage."""
        if self._resource_snapshots:
            return self._resource_snapshots[-1]
        return self._collect_resource_snapshot()
    
    def __del__(self):
        """Cleanup on object destruction."""
        if self._monitoring_active:
            self.logger.warning("Performance Monitor being destroyed with active monitoring")
            try:
                self.stop_monitoring()
            except Exception as e:
                self.logger.error(f"Error during cleanup: {e}")